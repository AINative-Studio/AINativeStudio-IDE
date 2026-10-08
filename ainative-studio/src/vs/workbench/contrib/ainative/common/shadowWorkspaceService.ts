/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Shadow Workspace Service
 *
 * Core primitive for the "shadow workspace" feature (see docs/planning/SHADOW_WORKSPACE_DESIGN.md
 * at the repo root for the full design, tracked in GitHub issue #159). Owns creation and lifecycle
 * of a per-chat-thread temporary directory that mirrors the real workspace, so an agent's file
 * tools (wired in toolsService.ts, gated by a thread's shadowModeEnabled flag) can read/write there
 * instead of the user's real files, before any change is promoted via chatThreadService.ts's
 * getPendingShadowDiffs/promoteShadowDiffs/discardShadowDiffs.
 *
 * What this service does NOT do (see design doc §5/§6 for what's still open):
 * - No URI scheme/file-system-provider for the shadow tree (design doc §3.1's "nice-to-have, not a
 *   requirement" phase-3 item) - shadow files live under file:// at a real temp path, so every
 *   disk-based tool (tsserver, eslint, etc.) keeps working unmodified without this service having
 *   to know anything about them.
 * - No lint/eslint/pytest subprocess invocation - only IShadowTypeCheckService's `tsc` integration
 *   exists today (phase 2 bullet 1), which calls into this service's diffShadowAgainstReal/
 *   ensureNodeModulesLinked rather than duplicating that logic.
 */

import { tmpdir } from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { generateUuid } from '../../../../base/common/uuid.js';

export const IShadowWorkspaceService = createDecorator<IShadowWorkspaceService>('shadowWorkspaceService');

/**
 * A single thread's shadow workspace: a real directory on disk under the OS temp dir, plus
 * bookkeeping for which real files have been mirrored into it so far.
 */
export interface ShadowWorkspace {
	readonly threadId: string;
	/** Root directory for this thread's shadow copy, e.g. <tmpdir>/ainative-shadow/<threadId>/ */
	readonly rootUri: URI;
	/** Real-file fsPaths that have been synced into the shadow so far, for targeted diffing later. */
	readonly syncedFsPaths: ReadonlySet<string>;
}

/**
 * Content-level comparison of one file between a thread's shadow tree and the real workspace, as
 * produced by diffShadowAgainstReal. Deliberately just before/after text, not a line-level diff -
 * presenting that nicely is the chat UI's job (design doc §6 phase 1: "reusing editCodeService's
 * existing per-file diff machinery"), not this service's.
 */
export interface FileDiff {
	readonly realUri: URI;
	readonly shadowUri: URI;
	/** 'added': shadow has the file, real doesn't (yet). 'deleted': real has it, shadow doesn't -
	 * only possible if a caller deletes a file from the shadow tree directly, since this service
	 * itself never deletes synced files. 'modified': both exist with different content.
	 * 'unchanged': both exist with identical content. */
	readonly kind: 'added' | 'deleted' | 'modified' | 'unchanged';
	readonly realContent: string | undefined;
	readonly shadowContent: string | undefined;
	/**
	 * Design doc §4 "Real file changes underneath a shadow copy": true when the REAL file's content
	 * at diff time no longer matches the baseline content captured at sync time (the moment
	 * syncFileIntoShadow last copied it into the shadow tree) - i.e. something other than this
	 * service touched the real file in the meantime (the user editing it directly, a git checkout,
	 * another tool, etc). This is independent of `kind`, which only compares the CURRENT real vs.
	 * shadow content and has no memory of what the real file looked like when the shadow copy was
	 * taken - a file can be `kind: 'modified'` with no conflict at all (the totally expected case:
	 * only the shadow copy changed since sync), or `kind: 'modified'` WITH a conflict (both the real
	 * file and the shadow copy changed independently since sync - promoting would silently discard
	 * whatever changed the real file). Always false for a file whose baseline could not be
	 * determined (e.g. direct shadow-tree manipulation bypassing syncFileIntoShadow, as some of this
	 * file's own tests do) - conflict detection requires a recorded baseline to compare against.
	 */
	readonly conflict: boolean;
}

export interface IShadowWorkspaceService {
	readonly _serviceBrand: undefined;

	/**
	 * Allocates (or returns the existing) shadow workspace for a chat thread. Idempotent per threadId.
	 */
	createShadowForThread(threadId: string): Promise<ShadowWorkspace>;

	/**
	 * Returns the shadow workspace for a thread if one has already been created, without creating it.
	 */
	getShadowForThread(threadId: string): ShadowWorkspace | undefined;

	/**
	 * Lazily copies a real file's current content into the thread's shadow tree, preserving its
	 * path relative to the given workspace root, and returns the shadow file's URI. Creates the
	 * shadow workspace for the thread first if it doesn't exist yet. If the file was already synced
	 * for this thread, this is a no-op that just returns the existing shadow URI (callers that want
	 * to re-sync latest real content should pass `force: true`).
	 */
	syncFileIntoShadow(threadId: string, workspaceRootUri: URI, realFileUri: URI, opts?: { force?: boolean }): Promise<URI>;

	/**
	 * Maps a real file URI to where it would live in a thread's shadow tree (pure path math, does
	 * not require the shadow workspace to exist yet, and does not check the file was actually synced).
	 */
	shadowUriFor(threadId: string, workspaceRootUri: URI, realFileUri: URI): URI;

	/**
	 * Deletes a thread's shadow directory from disk and forgets its bookkeeping. Safe to call for a
	 * thread with no shadow workspace (no-op).
	 */
	disposeShadow(threadId: string): Promise<void>;

	/**
	 * Diffs the shadow tree against the real workspace for every file that has been synced into
	 * this thread's shadow so far (via syncFileIntoShadow), in sync order. Returns an empty array
	 * for a thread with no shadow workspace. Does not touch any file that was never synced - this
	 * is a targeted diff of known-touched files, not a full recursive tree walk.
	 */
	diffShadowAgainstReal(threadId: string): Promise<FileDiff[]>;

	/**
	 * Design doc §3.3/§6 phase 2 bullet 2: symlinks the nearest real `node_modules` directory above
	 * `workspaceRootUri` into the thread's mirrored shadow copy of that workspace folder, so
	 * subprocess tooling run against the shadow tree (e.g. ShadowTypeCheckService's `tsc`) can
	 * resolve bare-specifier imports of real third-party packages instead of only the project's own
	 * source files. Idempotent and cheap to call repeatedly: a no-op if the shadow `node_modules`
	 * entry already exists (as a symlink or otherwise) or if no real `node_modules` can be found
	 * walking up from the workspace root. Never copies `node_modules` - only ever symlinks - so this
	 * is unaffected by dependency tree size. Creates the thread's shadow workspace (and the mirrored
	 * workspace-folder subdirectory) first if neither exists yet.
	 */
	ensureNodeModulesLinked(threadId: string, workspaceRootUri: URI): Promise<void>;

	/**
	 * Design doc §4/§6 phase 2 bullet 4: deletes every directory directly under
	 * `<tmpdir>/ainative-shadow/` that is both (a) not a shadow this SERVICE INSTANCE currently
	 * knows about (i.e. not in `_shadowOfThreadId` - a live thread from this same running process,
	 * never touched) and (b) older than `maxAgeMs` (default 24h, per the design doc's own "older
	 * than, say, 24h" framing in §3.1/§4). Intended to be called once, early, on IDE startup -
	 * before this process has created any shadow of its own, EVERY entry under the root is
	 * necessarily left over from some previous process execution that crashed or was force-quit
	 * before disposeShadow ran (disposeShadow always removes its own directory on normal
	 * thread-deletion/discard/promotion, so a directory surviving to the next startup, by
	 * construction, never went through that path) - condition (a) is a defensive no-op for that
	 * common case, and only matters for a hypothetical caller that runs the sweep after already
	 * creating some shadows of its own in the same process (e.g. a test). The age check in (b) is
	 * the real safety net against a multi-window scenario: a second, concurrently-running window's
	 * shadow directories are almost always far younger than the age threshold, and age (not PID or
	 * any other liveness signal) is the same crash-safety mechanism the design doc already settled
	 * on for this. Best-effort: a directory that fails to delete (e.g. a transient file lock) is
	 * skipped, not retried or thrown, since a failed sweep of one leftover directory must never
	 * block startup or the sweep of every other leftover directory. Returns the fsPaths actually
	 * removed, for logging/telemetry - never throws.
	 */
	sweepOrphanedShadows(opts?: { maxAgeMs?: number }): Promise<string[]>;
}

const SHADOW_ROOT_FOLDER_NAME = 'ainative-shadow';
// Design doc §3.1/§4's own "older than, say, 24h" framing for the startup orphan sweep.
const DEFAULT_ORPHAN_SWEEP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export class ShadowWorkspaceService extends Disposable implements IShadowWorkspaceService {
	_serviceBrand: undefined;

	// threadId -> mutable shadow workspace state. syncedFiles is keyed by real fsPath, in insertion
	// (sync) order, and also stores each file's workspaceRootUri so diffShadowAgainstReal can
	// re-derive the shadow URI for every synced file without the caller passing it again.
	// baselineRealContent is the real file's content exactly as last read by syncFileIntoShadow
	// (undefined if the real file didn't exist at sync time) - the reference point conflict
	// detection (design doc §4) compares the CURRENT real content against, to tell "only the shadow
	// copy changed since sync" (expected) apart from "the real file ALSO changed since sync"
	// (a conflict). Updated whenever syncFileIntoShadow actually re-reads the real file (first sync,
	// or a forced re-sync) - a forced re-sync is this service's own supported way of deliberately
	// accepting the latest real content as the new baseline, consistent with FileDiff.conflict being
	// about *unexpected* drift, not merely "the real file is not what the shadow started from".
	private readonly _shadowOfThreadId = new Map<string, {
		rootUri: URI;
		syncedFiles: Map<string, { workspaceRootUri: URI; realUri: URI; baselineRealContent: string | undefined }>;
	}>();

	constructor(
		@IFileService private readonly _fileService: IFileService,
	) {
		super();
	}

	async createShadowForThread(threadId: string): Promise<ShadowWorkspace> {
		const existing = this._shadowOfThreadId.get(threadId);
		if (existing) {
			return this._toShadowWorkspace(threadId, existing);
		}

		const rootUri = URI.file(path.join(tmpdir(), SHADOW_ROOT_FOLDER_NAME, this._sanitizeForPath(threadId) + '-' + generateUuid().slice(0, 8)));
		await this._fileService.createFolder(rootUri);

		const state = { rootUri, syncedFiles: new Map<string, { workspaceRootUri: URI; realUri: URI; baselineRealContent: string | undefined }>() };
		this._shadowOfThreadId.set(threadId, state);
		return this._toShadowWorkspace(threadId, state);
	}

	getShadowForThread(threadId: string): ShadowWorkspace | undefined {
		const state = this._shadowOfThreadId.get(threadId);
		return state ? this._toShadowWorkspace(threadId, state) : undefined;
	}

	shadowUriFor(threadId: string, workspaceRootUri: URI, realFileUri: URI): URI {
		const state = this._shadowOfThreadId.get(threadId);
		const rootUri = state?.rootUri ?? this._plannedRootUri(threadId);
		return this._mapToShadow(rootUri, workspaceRootUri, realFileUri);
	}

	async syncFileIntoShadow(threadId: string, workspaceRootUri: URI, realFileUri: URI, opts?: { force?: boolean }): Promise<URI> {
		let state = this._shadowOfThreadId.get(threadId);
		if (!state) {
			await this.createShadowForThread(threadId);
			state = this._shadowOfThreadId.get(threadId)!;
		}

		const shadowUri = this._mapToShadow(state.rootUri, workspaceRootUri, realFileUri);
		const alreadySynced = state.syncedFiles.has(realFileUri.fsPath);

		if (!alreadySynced || opts?.force) {
			const exists = await this._fileService.exists(realFileUri);
			let baselineRealContent: string | undefined;
			if (exists) {
				const content = await this._fileService.readFile(realFileUri);
				baselineRealContent = content.value.toString();
				await this._fileService.writeFile(shadowUri, content.value);
			}
			// If the real file doesn't exist yet (e.g. the agent is about to create it), there's
			// nothing to copy - the shadow file simply won't exist until something writes to it, and
			// baselineRealContent stays undefined (matching "nothing existed at sync time" for
			// conflict detection: a real file later appearing at that path is itself the conflict).
			// Map.set on an existing key updates the value but keeps its original insertion
			// position, which is what we want: re-syncing (even with force) shouldn't reorder a
			// file that was already touched earlier in the thread.
			state.syncedFiles.set(realFileUri.fsPath, { workspaceRootUri, realUri: realFileUri, baselineRealContent });
		}

		return shadowUri;
	}

	async diffShadowAgainstReal(threadId: string): Promise<FileDiff[]> {
		const state = this._shadowOfThreadId.get(threadId);
		if (!state) return [];

		const diffs: FileDiff[] = [];
		for (const { workspaceRootUri, realUri, baselineRealContent } of state.syncedFiles.values()) {
			const shadowUri = this._mapToShadow(state.rootUri, workspaceRootUri, realUri);

			const [realContent, shadowContent] = await Promise.all([
				this._readFileIfExists(realUri),
				this._readFileIfExists(shadowUri),
			]);

			let kind: FileDiff['kind'];
			if (realContent === undefined && shadowContent !== undefined) {
				kind = 'added';
			} else if (realContent !== undefined && shadowContent === undefined) {
				kind = 'deleted';
			} else if (realContent === shadowContent) {
				kind = 'unchanged';
			} else {
				kind = 'modified';
			}

			// design doc §4: a conflict is the REAL file's current content no longer matching what
			// was captured at sync time, independent of `kind` - see FileDiff.conflict's doc comment.
			const conflict = realContent !== baselineRealContent;

			diffs.push({ realUri, shadowUri, kind, realContent, shadowContent, conflict });
		}

		return diffs;
	}

	async ensureNodeModulesLinked(threadId: string, workspaceRootUri: URI): Promise<void> {
		let state = this._shadowOfThreadId.get(threadId);
		if (!state) {
			await this.createShadowForThread(threadId);
			state = this._shadowOfThreadId.get(threadId)!;
		}

		const realNodeModulesFsPath = this._findNearestNodeModules(workspaceRootUri.fsPath);
		if (!realNodeModulesFsPath) {
			// No installed dependencies anywhere above the workspace root - nothing to link. Not an
			// error: a brand-new project, or one that's never had `npm install` run, legitimately has
			// no node_modules yet, same as ShadowTypeCheckService's own "no toolchain" case.
			return;
		}

		const shadowWorkspaceRootUri = this._mapToShadow(state.rootUri, workspaceRootUri, workspaceRootUri);
		const shadowNodeModulesFsPath = path.join(shadowWorkspaceRootUri.fsPath, 'node_modules');

		// mkdir -p the shadow workspace-folder directory itself first - it may not exist yet if no
		// file has been synced into this workspace folder for this thread so far (symlinking can be
		// requested independently of/before any file sync, e.g. up front when shadow mode turns on).
		await this._fileService.createFolder(shadowWorkspaceRootUri);

		if (this._existsOnDisk(shadowNodeModulesFsPath)) {
			// Idempotent: already linked (or something else already occupies that path - deliberately
			// not clobbering a real directory a caller might have put there on purpose). Covers the
			// repeat-call case (e.g. re-invoked on every type-check run) without re-symlinking each time.
			return;
		}

		try {
			// Symlink, never copy - this is the whole point of the design doc's "pnpm-style" approach:
			// avoiding the cost of duplicating potentially gigabytes of dependencies on every shadow
			// workspace. 'dir' is the correct symlink type on Windows for a directory target; ignored
			// on POSIX platforms where fs.symlink has no notion of typed links.
			fs.symlinkSync(realNodeModulesFsPath, shadowNodeModulesFsPath, 'dir');
		} catch (e) {
			// Best-effort: a failed symlink (e.g. a permissions issue, or a platform without symlink
			// support enabled - notably unprivileged Windows accounts) should degrade to "third-party
			// imports don't resolve" (surfaced as valid TS2307 diagnostics by the type-checker, per
			// shadowTypeCheckService.ts's own module doc), not crash shadow-mode entirely.
		}
	}

	/**
	 * Walks up from `startDirFsPath` looking for the nearest `node_modules` directory, the same
	 * direction Node's own module resolution walks. Unlike _findNearestTsconfig (which looks for one
	 * specific file), this looks for a directory, and deliberately only needs to find the *first*
	 * one - module resolution for the workspace root's own project always starts there, regardless of
	 * whether a monorepo root further up also has its own node_modules (pnpm/npm/yarn workspaces all
	 * hoist in a way where the nearest node_modules is always the one to check first).
	 */
	private _findNearestNodeModules(startDirFsPath: string): string | undefined {
		let dir = startDirFsPath;
		for (; ;) {
			const candidate = path.join(dir, 'node_modules');
			if (this._existsOnDisk(candidate)) {
				return candidate;
			}
			const parent = path.dirname(dir);
			if (parent === dir) return undefined;
			dir = parent;
		}
	}

	/** Real `fs.existsSync`, not IFileService.exists - deliberately synchronous and symlink-aware
	 * (existsSync follows symlinks, matching what a resolver/compiler actually sees on disk), used
	 * only for the two node_modules-symlink checks above where IFileService's own async stat call
	 * would be no more correct and strictly slower for a hot, repeatedly-called path. */
	private _existsOnDisk(fsPath: string): boolean {
		try {
			return fs.existsSync(fsPath);
		} catch {
			return false;
		}
	}

	private async _readFileIfExists(uri: URI): Promise<string | undefined> {
		try {
			const content = await this._fileService.readFile(uri);
			return content.value.toString();
		} catch {
			// Covers both "never existed" and "existed then got deleted" - diffShadowAgainstReal
			// treats both the same way (file absent at diff time), matching FileDiff.kind's design.
			return undefined;
		}
	}

	async disposeShadow(threadId: string): Promise<void> {
		const state = this._shadowOfThreadId.get(threadId);
		if (!state) return;

		this._shadowOfThreadId.delete(threadId);
		try {
			await this._fileService.del(state.rootUri, { recursive: true, useTrash: false });
		} catch {
			// best-effort cleanup; an orphaned temp dir is not a correctness problem, just disk
			// space, and the startup sweep (sweepOrphanedShadows, design doc §4/§6 phase 2 bullet 4)
			// is the backstop for this.
		}
	}

	async sweepOrphanedShadows(opts?: { maxAgeMs?: number }): Promise<string[]> {
		const maxAgeMs = opts?.maxAgeMs ?? DEFAULT_ORPHAN_SWEEP_MAX_AGE_MS;
		const shadowRootUri = URI.file(path.join(tmpdir(), SHADOW_ROOT_FOLDER_NAME));

		let entries: Awaited<ReturnType<IFileService['resolve']>>['children'];
		try {
			const stat = await this._fileService.resolve(shadowRootUri);
			entries = stat.children;
		} catch {
			// The ainative-shadow root itself doesn't exist yet (e.g. first-ever run of this IDE on
			// this machine, or a tmpdir that's just been cleared) - nothing to sweep, not an error.
			return [];
		}
		if (!entries) return [];

		// fsPaths of every shadow this SERVICE INSTANCE currently owns - see this method's own
		// interface doc comment for why this matters only for an unusual caller (e.g. a test) that
		// sweeps after already creating shadows in the same process; the overwhelmingly common
		// startup-time caller has an empty _shadowOfThreadId at sweep time by construction.
		const liveRootFsPaths = new Set(Array.from(this._shadowOfThreadId.values(), s => s.rootUri.fsPath));

		const now = Date.now();
		const removed: string[] = [];
		for (const entry of entries) {
			if (!entry.isDirectory) continue; // the root should only ever contain directories, but
			// skip anything else defensively rather than trying to recursively-delete a stray file
			// the same way as a shadow dir.
			if (liveRootFsPaths.has(entry.resource.fsPath)) continue;

			let ageMs: number;
			try {
				ageMs = now - fs.statSync(entry.resource.fsPath).mtimeMs;
			} catch {
				continue; // disappeared between listing and stat-ing (e.g. raced with another sweep/process) - leave it, nothing to clean up
			}
			if (ageMs < maxAgeMs) continue; // young enough to plausibly belong to another, still-running window - leave it alone

			try {
				await this._fileService.del(entry.resource, { recursive: true, useTrash: false });
				removed.push(entry.resource.fsPath);
			} catch {
				// best-effort, per this method's own interface doc comment - one directory failing to
				// delete (e.g. a transient file lock) must never block sweeping the rest.
			}
		}

		return removed;
	}

	override dispose(): void {
		// Note: deliberately not deleting shadow directories here - dispose() of the service happens
		// on window/workbench shutdown, and we want shadow content to survive an IDE restart so a
		// crash mid-edit doesn't silently lose agent work-in-progress. Cleanup of orphaned shadow
		// dirs on startup is a phase-2 concern (design doc §4/§6), not this service's dispose path.
		super.dispose();
	}

	private _toShadowWorkspace(threadId: string, state: { rootUri: URI; syncedFiles: Map<string, { workspaceRootUri: URI; realUri: URI; baselineRealContent: string | undefined }> }): ShadowWorkspace {
		return { threadId, rootUri: state.rootUri, syncedFsPaths: new Set(state.syncedFiles.keys()) };
	}

	private _plannedRootUri(threadId: string): URI {
		// Used only by shadowUriFor() when called before createShadowForThread() - the returned URI
		// won't exist on disk yet, but the path mapping is still useful for callers that just want
		// to know "where would this file go".
		return URI.file(path.join(tmpdir(), SHADOW_ROOT_FOLDER_NAME, this._sanitizeForPath(threadId)));
	}

	private _mapToShadow(shadowRootUri: URI, workspaceRootUri: URI, realFileUri: URI): URI {
		const relative = path.relative(workspaceRootUri.fsPath, realFileUri.fsPath);
		if (relative.startsWith('..')) {
			throw new Error(`ShadowWorkspaceService: file ${realFileUri.fsPath} is not inside workspace root ${workspaceRootUri.fsPath}`);
		}
		return URI.file(path.join(shadowRootUri.fsPath, path.basename(workspaceRootUri.fsPath), relative));
	}

	private _sanitizeForPath(threadId: string): string {
		return threadId.replace(/[^a-zA-Z0-9_-]/g, '_');
	}
}

registerSingleton(IShadowWorkspaceService, ShadowWorkspaceService, InstantiationType.Delayed);

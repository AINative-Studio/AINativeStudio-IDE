/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Shadow Workspace Service
 *
 * Phase 0 primitive for the "shadow workspace" feature (see /SHADOW_WORKSPACE_DESIGN.md at the
 * repo root for the full design). This service owns creation and lifecycle of a per-chat-thread
 * temporary directory that mirrors the real workspace, so an agent can eventually read/write files
 * there instead of the user's real files, before any change is promoted.
 *
 * Deliberately out of scope for this pass (see design doc §6/§7):
 * - No wiring into toolsService.ts's edit_file/rewrite_file/create_file_or_folder/delete_file_or_folder.
 * - No UI surface (no chat-panel status, no diff promotion view).
 * - No type-checking/lint invocation against the shadow tree.
 * - No URI scheme/file-system-provider for the shadow tree; shadow files live under file:// at a
 *   real temp path, so every existing disk-based tool (tsserver, eslint, etc.) keeps working
 *   unmodified if/when phase 1 wires this up.
 *
 * This service is registered as a singleton but is not invoked from anywhere yet - adding it here
 * now is intentionally inert so phase 1 has a tested foundation instead of starting from nothing.
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
}

const SHADOW_ROOT_FOLDER_NAME = 'ainative-shadow';

export class ShadowWorkspaceService extends Disposable implements IShadowWorkspaceService {
	_serviceBrand: undefined;

	// threadId -> mutable shadow workspace state. syncedFiles is keyed by real fsPath, in insertion
	// (sync) order, and also stores each file's workspaceRootUri so diffShadowAgainstReal can
	// re-derive the shadow URI for every synced file without the caller passing it again.
	private readonly _shadowOfThreadId = new Map<string, {
		rootUri: URI;
		syncedFiles: Map<string, { workspaceRootUri: URI; realUri: URI }>;
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

		const state = { rootUri, syncedFiles: new Map<string, { workspaceRootUri: URI; realUri: URI }>() };
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
			if (exists) {
				const content = await this._fileService.readFile(realFileUri);
				await this._fileService.writeFile(shadowUri, content.value);
			}
			// If the real file doesn't exist yet (e.g. the agent is about to create it), there's
			// nothing to copy - the shadow file simply won't exist until something writes to it.
			// Map.set on an existing key updates the value but keeps its original insertion
			// position, which is what we want: re-syncing (even with force) shouldn't reorder a
			// file that was already touched earlier in the thread.
			state.syncedFiles.set(realFileUri.fsPath, { workspaceRootUri, realUri: realFileUri });
		}

		return shadowUri;
	}

	async diffShadowAgainstReal(threadId: string): Promise<FileDiff[]> {
		const state = this._shadowOfThreadId.get(threadId);
		if (!state) return [];

		const diffs: FileDiff[] = [];
		for (const { workspaceRootUri, realUri } of state.syncedFiles.values()) {
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

			diffs.push({ realUri, shadowUri, kind, realContent, shadowContent });
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
			// space, and a future startup sweep (design doc §6, phase 2) is the backstop for this.
		}
	}

	override dispose(): void {
		// Note: deliberately not deleting shadow directories here - dispose() of the service happens
		// on window/workbench shutdown, and we want shadow content to survive an IDE restart so a
		// crash mid-edit doesn't silently lose agent work-in-progress. Cleanup of orphaned shadow
		// dirs on startup is a phase-2 concern (design doc §4/§6), not this service's dispose path.
		super.dispose();
	}

	private _toShadowWorkspace(threadId: string, state: { rootUri: URI; syncedFiles: Map<string, { workspaceRootUri: URI; realUri: URI }> }): ShadowWorkspace {
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

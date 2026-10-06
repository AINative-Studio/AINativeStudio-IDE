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
}

const SHADOW_ROOT_FOLDER_NAME = 'ainative-shadow';

export class ShadowWorkspaceService extends Disposable implements IShadowWorkspaceService {
	_serviceBrand: undefined;

	// threadId -> mutable shadow workspace state
	private readonly _shadowOfThreadId = new Map<string, { rootUri: URI; syncedFsPaths: Set<string> }>();

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

		const state = { rootUri, syncedFsPaths: new Set<string>() };
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
		const alreadySynced = state.syncedFsPaths.has(realFileUri.fsPath);

		if (!alreadySynced || opts?.force) {
			const exists = await this._fileService.exists(realFileUri);
			if (exists) {
				const content = await this._fileService.readFile(realFileUri);
				await this._fileService.writeFile(shadowUri, content.value);
			}
			// If the real file doesn't exist yet (e.g. the agent is about to create it), there's
			// nothing to copy - the shadow file simply won't exist until something writes to it.
			state.syncedFsPaths.add(realFileUri.fsPath);
		}

		return shadowUri;
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

	private _toShadowWorkspace(threadId: string, state: { rootUri: URI; syncedFsPaths: Set<string> }): ShadowWorkspace {
		return { threadId, rootUri: state.rootUri, syncedFsPaths: state.syncedFsPaths };
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

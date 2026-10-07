/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Delayer } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ICodeContextIndexService } from './codeContextIndexService.js';
import { IAINativeCloudAuthService } from '../common/ainativeCloudAuthTypes.js';

const PER_FILE_REINDEX_DEBOUNCE_MS = 2000;

/**
 * Wires #160's CodeContextIndexService into real IDE lifecycle events: runs an initial
 * workspace-wide index pass once the user is signed in (not before - indexing calls the
 * authenticated embeddings API, so there is nothing useful to do while signed out), then
 * debounces per-file re-indexing on every subsequent save.
 *
 * Registered at WorkbenchPhase.Eventually: this is background work with no UI waiting on it,
 * so it must never compete with anything on the startup-critical path.
 */
class CodeContextIndexContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.ainative.codeContextIndex';
	_serviceBrand: undefined;

	private readonly _delayerByFile = new Map<string, Delayer<void>>();
	private _projectId: string | undefined;
	private _hasRunInitialIndex = false;

	constructor(
		@ICodeContextIndexService private readonly codeContextIndexService: ICodeContextIndexService,
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
		@IFileService private readonly fileService: IFileService,
	) {
		super();

		this._register(this.authService.onDidChangeAuthState(() => this._tryRunInitialIndex()));
		this._tryRunInitialIndex(); // in case already signed in when this contribution activates

		this._register(this.fileService.onDidFilesChange(e => {
			if (!this._projectId) return; // not indexed yet - nothing to keep in sync
			for (const changed of [...e.rawAdded, ...e.rawUpdated, ...e.rawDeleted]) {
				this._scheduleReindex(changed);
			}
		}));
	}

	private async _tryRunInitialIndex(): Promise<void> {
		if (this._hasRunInitialIndex) return;
		const token = await this.authService.getAccessToken();
		if (!token) return;

		this._hasRunInitialIndex = true; // set before awaiting - a concurrent auth event must not start a second pass
		try {
			const result = await this.codeContextIndexService.indexWorkspace();
			this._projectId = result?.projectId;
		} catch (e) {
			this._hasRunInitialIndex = false; // allow retry on the next sign-in/auth-state change
			console.error('[CodeContextIndex] Initial workspace index failed:', e);
		}
	}

	private _scheduleReindex(uriString: string | { toString(): string }): void {
		const key = uriString.toString();
		let delayer = this._delayerByFile.get(key);
		if (!delayer) {
			delayer = new Delayer<void>(PER_FILE_REINDEX_DEBOUNCE_MS);
			this._delayerByFile.set(key, delayer);
			this._register(delayer);
		}
		delayer.trigger(async () => {
			if (!this._projectId) return;
			try {
				await this.codeContextIndexService.reindexFile(this._projectId, URI.parse(key));
			} catch (e) {
				console.error(`[CodeContextIndex] Failed to reindex ${key}:`, e);
			}
		});
	}
}

registerWorkbenchContribution2(CodeContextIndexContribution.ID, CodeContextIndexContribution, WorkbenchPhase.Eventually);

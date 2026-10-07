/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { URI } from '../../../../base/common/uri.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ICodeContextEngineService } from '../common/codeContextEngineService.js';
import { IAINativeSCMService } from '../common/ainativeSCMTypes.js';
import { IAINativeCloudAuthService } from '../common/ainativeCloudAuthTypes.js';
import { computeRepoHash } from '../common/codeContextProjectHash.js';
import { chunkFileContent } from '../common/codeContextChunking.js';
import { diffChunkIds } from '../common/codeContextIndexDiff.js';

/**
 * Orchestrates #160's codebase-wide semantic retrieval: provisions a ZeroDB project per
 * workspace, runs an initial full-workspace embed pass once signed in, and exposes a manual
 * per-file re-index for incremental updates.
 *
 * Deliberately NOT included in this first version, to keep it small and correct rather than
 * rushed:
 *   - No automatic file-watcher-driven re-embed on save. `reindexFile()` below does the real
 *     work (diff old vs. new chunk ids, delete the stale ones, embed the new ones) and is
 *     fully wired - it is just not yet called automatically from IFileService.onDidFilesChange.
 *     Wiring that trigger is a small, separate follow-up once this manual path is exercised for
 *     real and the actual embedding latency/rate limits are observed.
 *   - No persistence of per-file chunk-id state across IDE restarts (kept in memory only) - a
 *     restart currently means the next initial index pass re-embeds everything, which is
 *     correct (every embed/chunk call is an idempotent upsert) just not minimal. Persisting a
 *     chunk-id manifest is the natural next step once this is proven out.
 *   - No UI (status in the index, progress, a manual "re-index now" button) - this is the
 *     service layer other work can build on.
 */
export interface ICodeContextIndexService {
	readonly _serviceBrand: undefined;

	/**
	 * Ensures a ZeroDB project exists for the current workspace's first folder and runs an
	 * initial embed pass over every file search finds (respecting files.exclude/.gitignore via
	 * the real search service, same as VS Code's own file search). No-ops if there is no
	 * workspace folder open, or the user isn't signed in. Safe to call more than once - project
	 * provisioning is idempotent server-side, and re-embedding an already-embedded chunk id is a
	 * correct no-op upsert.
	 */
	indexWorkspace(): Promise<{ projectId: string; filesIndexed: number } | undefined>;

	/** Re-indexes one file: diffs its previous chunk ids against its current content's chunk ids, deletes stale vectors, embeds new ones. */
	reindexFile(projectId: string, fileUri: URI): Promise<void>;

	/** The project id from the most recent indexWorkspace() call, or undefined if indexing hasn't run (yet, or at all) this session. */
	getCurrentProjectId(): string | undefined;
}

export const ICodeContextIndexService = createDecorator<ICodeContextIndexService>('codeContextIndexService');

class CodeContextIndexService extends Disposable implements ICodeContextIndexService {
	readonly _serviceBrand: undefined;

	// In-memory only for now (see class doc) - resets on restart.
	private readonly _chunkIdsByFile = new Map<string, string[]>(); // key: fileUri.toString()
	private _currentProjectId: string | undefined;

	constructor(
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IFileService private readonly fileService: IFileService,
		@ISearchService private readonly searchService: ISearchService,
		@ICodeContextEngineService private readonly codeContextEngineService: ICodeContextEngineService,
		@IAINativeSCMService private readonly scmService: IAINativeSCMService,
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
	) {
		super();
	}

	async indexWorkspace(): Promise<{ projectId: string; filesIndexed: number } | undefined> {
		const folder = this.workspaceContextService.getWorkspace().folders[0];
		if (!folder) return undefined;

		const isAuthenticated = await this.authService.getAccessToken();
		if (!isAuthenticated) return undefined;

		const remoteUrl = await this.scmService.gitRemoteUrl(folder.uri.fsPath);
		// A repo with no "origin" remote (brand new, never pushed) has no stable identity to
		// hash - fall back to the folder name so indexing still works locally, at the cost of
		// colliding with any other never-pushed repo of the same name (acceptable: this is a
		// fallback for an edge case, not the common path).
		const repoHash = await computeRepoHash(remoteUrl || `local:${folder.name}`);
		const project = await this.codeContextEngineService.ensureProject(repoHash, folder.name);
		this._currentProjectId = project.id;

		const queryBuilder = this.instantiationService.createInstance(QueryBuilder);
		const query = queryBuilder.file([folder.uri]);
		const searchResult = await this.searchService.fileSearch(query, CancellationToken.None);

		let filesIndexed = 0;
		for (const match of searchResult.results) {
			try {
				await this._embedFile(project.id, match.resource);
				filesIndexed++;
			} catch {
				// one unreadable/binary/oversized file shouldn't abort indexing the rest of the workspace
				continue;
			}
		}

		return { projectId: project.id, filesIndexed };
	}

	async reindexFile(projectId: string, fileUri: URI): Promise<void> {
		const exists = await this.fileService.exists(fileUri);
		if (!exists) {
			// file was deleted - delete all its previously-indexed chunks, nothing to embed
			const previousChunkIds = this._chunkIdsByFile.get(fileUri.toString()) ?? [];
			await Promise.all(previousChunkIds.map(id => this.codeContextEngineService.deleteVector(projectId, id)));
			this._chunkIdsByFile.delete(fileUri.toString());
			return;
		}
		await this._embedFile(projectId, fileUri);
	}

	private async _embedFile(projectId: string, fileUri: URI): Promise<void> {
		const content = (await this.fileService.readFile(fileUri)).value.toString();
		const chunks = chunkFileContent(fileUri.toString(), content);
		const currentChunkIds = chunks.map(c => c.chunkId);

		const previousChunkIds = this._chunkIdsByFile.get(fileUri.toString()) ?? [];
		const { chunkIdsToDelete } = diffChunkIds(previousChunkIds, currentChunkIds);

		await Promise.all(chunkIdsToDelete.map(id => this.codeContextEngineService.deleteVector(projectId, id)));
		if (currentChunkIds.length > 0) {
			await this.codeContextEngineService.embedFile(projectId, fileUri.toString());
		}

		this._chunkIdsByFile.set(fileUri.toString(), currentChunkIds);
	}

	getCurrentProjectId(): string | undefined {
		return this._currentProjectId;
	}
}

registerSingleton(ICodeContextIndexService, CodeContextIndexService, InstantiationType.Delayed);

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getAINativeConfig } from './ainativeConfig.js';
import { IAINativeCloudAuthService } from './ainativeCloudAuthTypes.js';

/**
 * Client for ZeroDB's "Code Context Engine" (#160 - codebase-wide semantic retrieval).
 *
 * Confirmed live and real against the full api.ainative.studio OpenAPI spec (fetched and
 * parsed directly - a summarized read of the 6.6MB spec had missed this subsystem entirely on
 * a first pass). Every endpoint here is JWT Bearer-authenticated and project_id-scoped:
 *   - POST /api/v1/zerodb/projects/ensure                        -> project provisioning
 *   - POST /api/v1/public/code-context-engine/embed/chunk        -> embed one chunk
 *   - POST /api/v1/public/code-context-engine/embed/file         -> embed all chunks in a file
 *   - POST /api/v1/public/{project_id}/embeddings/search         -> semantic search
 *   - DELETE /api/v1/public/zerodb/{project_id}/database/vectors/{vector_id} -> incremental delete
 *
 * This service only wraps the HTTP contract. It does not decide chunking strategy, does not
 * run on a file-watcher, and is not wired into contextGatheringService.ts yet - those are
 * separate, larger pieces of #160 left for follow-up work once this contract layer is settled
 * and real network behavior (auth errors, rate limits, actual embedding latency) is observed.
 */

export interface EnsureProjectResult {
	readonly id: string;
	readonly name: string;
	readonly repoHash: string;
	readonly tier: string;
	readonly created: boolean;
}

export interface EmbedChunkResult {
	readonly chunkId: string;
}

export interface EmbedFileResult {
	readonly filePath: string;
	readonly chunksEmbedded: number;
}

export interface SemanticSearchOptions {
	readonly limit?: number; // 1-100, default 10 (server-side)
	readonly threshold?: number; // 0.0-1.0, default 0.3 (server-side)
	readonly namespace?: string; // default 'default' (server-side)
	readonly filterMetadata?: Record<string, unknown>;
	readonly model?: string; // auto-detected from namespace's stored vector dimension if omitted
}

export interface SemanticSearchResultItem {
	readonly id: string;
	readonly document: string;
	readonly similarity: number;
	readonly metadata?: Record<string, unknown>;
}

export interface SemanticSearchResult {
	readonly results: readonly SemanticSearchResultItem[];
	readonly query: string;
	readonly totalResults: number;
	readonly model: string;
	readonly projectId: string;
	readonly processingTimeMs: number;
}

export class CodeContextEngineError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
		this.name = 'CodeContextEngineError';
	}
}

export interface ICodeContextEngineService {
	readonly _serviceBrand: undefined;

	/** Idempotently provision (or retrieve) the ZeroDB project backing this workspace. */
	ensureProject(repoHash: string, repoName: string): Promise<EnsureProjectResult>;

	/** Embed and store a single chunk's vector representation. */
	embedChunk(projectId: string, chunkId: string): Promise<EmbedChunkResult>;

	/** Embed and store vectors for every chunk in a file. */
	embedFile(projectId: string, filePath: string): Promise<EmbedFileResult>;

	/** Semantic search within a project's embedded chunks. */
	search(projectId: string, query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult>;

	/** Delete one vector by id (e.g. to invalidate a chunk whose source file changed). */
	deleteVector(projectId: string, vectorId: string, namespace?: string): Promise<void>;
}

export const ICodeContextEngineService = createDecorator<ICodeContextEngineService>('codeContextEngineService');

class CodeContextEngineService extends Disposable implements ICodeContextEngineService {
	readonly _serviceBrand: undefined;

	private readonly apiBaseUrl = getAINativeConfig().apiBaseUrl;

	constructor(
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
	) {
		super();
	}

	private async _getAuthHeaders(): Promise<Record<string, string>> {
		const token = await this.authService.getAccessToken();
		if (!token) {
			throw new CodeContextEngineError(401, 'Not authenticated. Please sign in to AINative Cloud to use semantic search.');
		}
		return {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		};
	}

	private async _request<T>(path: string, init: RequestInit): Promise<T> {
		const headers = await this._getAuthHeaders();
		let response: Response;
		try {
			response = await fetch(`${this.apiBaseUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
		} catch (e) {
			throw new CodeContextEngineError(0, `Network error calling ${path}: ${e}`);
		}
		if (!response.ok) {
			let message = `Request to ${path} failed with status ${response.status}`;
			try {
				const body = await response.json();
				message = body?.error?.message ?? body?.message ?? message;
			} catch {
				// response body wasn't JSON - keep the generic message
			}
			throw new CodeContextEngineError(response.status, message);
		}
		if (response.status === 204) return undefined as T;
		return response.json() as Promise<T>;
	}

	async ensureProject(repoHash: string, repoName: string): Promise<EnsureProjectResult> {
		const body = await this._request<{ ok: boolean; project: { id: string; name: string; repo_hash: string; tier: string; created: boolean } }>(
			'/api/v1/zerodb/projects/ensure',
			{ method: 'POST', body: JSON.stringify({ repo_hash: repoHash, repo_name: repoName }) },
		);
		const p = body.project;
		return { id: p.id, name: p.name, repoHash: p.repo_hash, tier: p.tier, created: p.created };
	}

	async embedChunk(projectId: string, chunkId: string): Promise<EmbedChunkResult> {
		await this._request<unknown>(
			`/api/v1/public/code-context-engine/embed/chunk?project_id=${encodeURIComponent(projectId)}`,
			{ method: 'POST', body: JSON.stringify({ chunk_id: chunkId }) },
		);
		return { chunkId };
	}

	async embedFile(projectId: string, filePath: string): Promise<EmbedFileResult> {
		const body = await this._request<{ chunks_embedded?: number } | undefined>(
			`/api/v1/public/code-context-engine/embed/file?project_id=${encodeURIComponent(projectId)}`,
			{ method: 'POST', body: JSON.stringify({ file_path: filePath }) },
		);
		return { filePath, chunksEmbedded: body?.chunks_embedded ?? 0 };
	}

	async search(projectId: string, query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult> {
		const body = await this._request<{
			results: { id: string; document: string; similarity: number; metadata?: Record<string, unknown> }[];
			query: string;
			total_results: number;
			model: string;
			project_id: string;
			processing_time_ms: number;
		}>(
			`/api/v1/public/${encodeURIComponent(projectId)}/embeddings/search`,
			{
				method: 'POST',
				body: JSON.stringify({
					query,
					limit: options?.limit,
					threshold: options?.threshold,
					namespace: options?.namespace,
					filter_metadata: options?.filterMetadata,
					model: options?.model,
				}),
			},
		);
		return {
			results: body.results.map(r => ({ id: r.id, document: r.document, similarity: r.similarity, metadata: r.metadata })),
			query: body.query,
			totalResults: body.total_results,
			model: body.model,
			projectId: body.project_id,
			processingTimeMs: body.processing_time_ms,
		};
	}

	async deleteVector(projectId: string, vectorId: string, namespace?: string): Promise<void> {
		const qs = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
		await this._request<unknown>(
			`/api/v1/public/zerodb/${encodeURIComponent(projectId)}/database/vectors/${encodeURIComponent(vectorId)}${qs}`,
			{ method: 'DELETE' },
		);
	}
}

registerSingleton(ICodeContextEngineService, CodeContextEngineService, InstantiationType.Delayed);

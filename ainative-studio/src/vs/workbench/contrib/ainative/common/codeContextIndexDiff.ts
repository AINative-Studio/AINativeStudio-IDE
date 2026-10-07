/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Pure diffing logic for #160's incremental re-index step: given the previous chunk ids a file
 * was indexed under and the chunk ids its current content now produces, decide which old
 * vectors must be deleted (ones that no longer exist in the new chunking) and which chunks must
 * be (re-)embedded (every current chunk - the backend's embed/chunk endpoint is a plain upsert,
 * so re-embedding an unchanged chunk id is a correct no-op, not something to skip for
 * correctness - but skipping it is still worth doing for cost/latency, so this is split out as
 * its own decision below).
 *
 * Kept free of CodeContextEngineService/file-service dependencies so the actual "what to do"
 * decision is unit-testable without a network or filesystem.
 */
export interface IndexDiffResult {
	/** Chunk ids present in the old index but not the new chunking - must be deleted. */
	readonly chunkIdsToDelete: readonly string[];
	/** Chunk ids in the new chunking that need embedding (i.e. weren't already indexed under this exact id). */
	readonly chunkIdsToEmbed: readonly string[];
}

export const diffChunkIds = (previousChunkIds: readonly string[], currentChunkIds: readonly string[]): IndexDiffResult => {
	const previousSet = new Set(previousChunkIds);
	const currentSet = new Set(currentChunkIds);

	const chunkIdsToDelete = previousChunkIds.filter(id => !currentSet.has(id));
	const chunkIdsToEmbed = currentChunkIds.filter(id => !previousSet.has(id));

	return { chunkIdsToDelete, chunkIdsToEmbed };
}

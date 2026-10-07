/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Chunking strategy for #160 (codebase-wide semantic retrieval). The backend's
 * `embed/chunk` contract (see codeContextEngineService.ts) takes an opaque `chunk_id` - chunk
 * *boundaries* are entirely the client's choice, the backend has no opinion on them.
 *
 * This starts with a deliberately simple strategy: fixed-size, line-aligned windows with
 * overlap, not AST-aware chunking. Reasons, not an oversight:
 *   - AST-aware chunking needs a real parser per language this IDE supports, which is a much
 *     bigger scope decision (which languages first, which parser - tree-sitter is already a
 *     build/ dependency for grammars, but not wired into this contrib tree for parsing yet).
 *   - The default embedding model (BAAI/bge-small-en-v1.5, confirmed via the search endpoint's
 *     own docstring) is a short-context sentence-embedding model, not a long-context code model -
 *     very large AST nodes (a big function) would need re-splitting anyway, so naive windowing
 *     doesn't give up much quality for the first version.
 *   - Line-aligned windows keep chunk_id generation (file path + start line) stable and human-
 *     debuggable, and make the incremental re-embed story simple: a changed file's old chunk
 *     ids can be derived the same way before re-chunking, without persisting a chunk manifest.
 *
 * Revisit with language-aware chunking once real retrieval-quality data exists to justify the
 * added complexity - premature AST integration here would be optimizing before measuring.
 */

export interface CodeChunk {
	/** Stable id: `${filePath}#L${startLine}-${endLine}` (1-indexed, inclusive). */
	readonly chunkId: string;
	readonly filePath: string;
	readonly startLine: number; // 1-indexed, inclusive
	readonly endLine: number; // 1-indexed, inclusive
	readonly text: string;
}

const CHARS_PER_TOKEN = 4; // same heuristic as convertToLLMMessageService.ts's trim budget

export interface ChunkingOptions {
	/** Target chunk size in tokens (approximate, via CHARS_PER_TOKEN). Default: 256. */
	readonly targetTokens?: number;
	/** Number of lines of overlap between consecutive chunks, for context continuity. Default: 3. */
	readonly overlapLines?: number;
}

export const makeChunkId = (filePath: string, startLine: number, endLine: number): string =>
	`${filePath}#L${startLine}-${endLine}`;

/**
 * Splits one file's content into line-aligned, overlapping chunks sized to roughly
 * `targetTokens`. Pure function - no file I/O - so chunking logic itself is testable
 * independent of how the IDE reads file content (model service vs. file service).
 */
export const chunkFileContent = (filePath: string, content: string, options?: ChunkingOptions): CodeChunk[] => {
	const targetTokens = options?.targetTokens ?? 256;
	const overlapLines = Math.max(0, options?.overlapLines ?? 3);
	const targetChars = targetTokens * CHARS_PER_TOKEN;

	if (content.trim().length === 0) return [];

	const lines = content.split('\n');
	const chunks: CodeChunk[] = [];

	let startIdx = 0; // 0-indexed into `lines`
	while (startIdx < lines.length) {
		let endIdx = startIdx; // inclusive, 0-indexed
		let charCount = lines[startIdx].length;
		while (endIdx + 1 < lines.length && charCount < targetChars) {
			endIdx++;
			charCount += lines[endIdx].length + 1; // +1 for the newline joining it back
		}

		const text = lines.slice(startIdx, endIdx + 1).join('\n');
		const startLine = startIdx + 1;
		const endLine = endIdx + 1;
		if (text.trim().length > 0) {
			chunks.push({ chunkId: makeChunkId(filePath, startLine, endLine), filePath, startLine, endLine, text });
		}

		if (endIdx + 1 >= lines.length) break; // reached end of file
		startIdx = Math.max(endIdx + 1 - overlapLines, startIdx + 1); // always advance at least one line
	}

	return chunks;
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { chunkFileContent, makeChunkId } from '../../common/codeContextChunking.js';

suite('makeChunkId (#160 chunking) Tests', () => {
	test('formats as filePath#Lstart-end', () => {
		assert.strictEqual(makeChunkId('src/a.ts', 1, 10), 'src/a.ts#L1-10');
	});
});

suite('chunkFileContent (#160 chunking) Tests', () => {

	test('returns no chunks for empty content', () => {
		assert.deepStrictEqual(chunkFileContent('a.ts', ''), []);
	});

	test('returns no chunks for whitespace-only content', () => {
		assert.deepStrictEqual(chunkFileContent('a.ts', '   \n\n  \n'), []);
	});

	test('a short file produces exactly one chunk covering the whole file', () => {
		const content = 'line1\nline2\nline3';
		const chunks = chunkFileContent('a.ts', content);
		assert.strictEqual(chunks.length, 1);
		assert.strictEqual(chunks[0].startLine, 1);
		assert.strictEqual(chunks[0].endLine, 3);
		assert.strictEqual(chunks[0].text, content);
		assert.strictEqual(chunks[0].filePath, 'a.ts');
		assert.strictEqual(chunks[0].chunkId, 'a.ts#L1-3');
	});

	test('a long file is split into multiple chunks', () => {
		// 500 lines of ~10 chars each, well over the default 256-token (~1024 char) target
		const lines = Array.from({ length: 500 }, (_, i) => `const x${i} = 1;`);
		const chunks = chunkFileContent('big.ts', lines.join('\n'));
		assert.ok(chunks.length > 1);
	});

	test('chunks cover every line of the file with no gaps', () => {
		const lines = Array.from({ length: 500 }, (_, i) => `const x${i} = 1;`);
		const chunks = chunkFileContent('big.ts', lines.join('\n'), { overlapLines: 2 });
		// first chunk starts at line 1
		assert.strictEqual(chunks[0].startLine, 1);
		// last chunk ends at the last line
		assert.strictEqual(chunks[chunks.length - 1].endLine, 500);
		// every consecutive pair overlaps or is contiguous (next start <= prev end + 1)
		for (let i = 1; i < chunks.length; i++) {
			assert.ok(chunks[i].startLine <= chunks[i - 1].endLine + 1, `gap between chunk ${i - 1} and ${i}`);
		}
	});

	test('consecutive chunks overlap by the requested number of lines', () => {
		const lines = Array.from({ length: 500 }, (_, i) => `const x${i} = 1;`);
		const chunks = chunkFileContent('big.ts', lines.join('\n'), { overlapLines: 3 });
		assert.ok(chunks.length > 1);
		for (let i = 1; i < chunks.length; i++) {
			const overlap = chunks[i - 1].endLine - chunks[i].startLine + 1;
			assert.strictEqual(overlap, 3);
		}
	});

	test('always advances by at least one line even with overlapLines >= chunk size (no infinite loop)', () => {
		const lines = Array.from({ length: 20 }, (_, i) => `x${i}`);
		// huge overlap relative to a tiny file/target - must still terminate
		const chunks = chunkFileContent('tiny.ts', lines.join('\n'), { targetTokens: 1, overlapLines: 1000 });
		assert.ok(chunks.length > 0);
		assert.strictEqual(chunks[chunks.length - 1].endLine, 20);
	});

	test('negative overlapLines is clamped to zero rather than throwing', () => {
		const content = 'a\nb\nc';
		assert.doesNotThrow(() => chunkFileContent('a.ts', content, { overlapLines: -5 }));
	});

	test('each chunk id is unique within a file', () => {
		const lines = Array.from({ length: 500 }, (_, i) => `const x${i} = 1;`);
		const chunks = chunkFileContent('big.ts', lines.join('\n'));
		const ids = chunks.map(c => c.chunkId);
		assert.strictEqual(ids.length, new Set(ids).size);
	});
});

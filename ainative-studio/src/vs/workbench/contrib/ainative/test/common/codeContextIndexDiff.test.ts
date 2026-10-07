/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { diffChunkIds } from '../../common/codeContextIndexDiff.js';

suite('diffChunkIds (#160 incremental re-index) Tests', () => {

	test('first-time indexing: no deletes, embed everything', () => {
		const result = diffChunkIds([], ['a.ts#L1-10', 'a.ts#L8-20']);
		assert.deepStrictEqual(result.chunkIdsToDelete, []);
		assert.deepStrictEqual(result.chunkIdsToEmbed, ['a.ts#L1-10', 'a.ts#L8-20']);
	});

	test('file deleted entirely: delete all old chunks, embed nothing', () => {
		const result = diffChunkIds(['a.ts#L1-10', 'a.ts#L8-20'], []);
		assert.deepStrictEqual(result.chunkIdsToDelete, ['a.ts#L1-10', 'a.ts#L8-20']);
		assert.deepStrictEqual(result.chunkIdsToEmbed, []);
	});

	test('identical chunking (e.g. a whitespace-only save elsewhere): no deletes, no embeds', () => {
		const ids = ['a.ts#L1-10', 'a.ts#L8-20'];
		const result = diffChunkIds(ids, [...ids]);
		assert.deepStrictEqual(result.chunkIdsToDelete, []);
		assert.deepStrictEqual(result.chunkIdsToEmbed, []);
	});

	test('a line inserted near the top shifts every later chunk id - all old ids deleted, all new ids embedded', () => {
		// chunk ids are derived from line ranges, so inserting lines changes every chunk after
		// the insertion point even though most of the content is unchanged - this is the actual
		// behavior of line-based chunk ids, not a bug, and the diff must handle it correctly.
		const previous = ['a.ts#L1-10', 'a.ts#L11-20'];
		const current = ['a.ts#L1-11', 'a.ts#L12-21']; // everything shifted by one line
		const result = diffChunkIds(previous, current);
		assert.deepStrictEqual(result.chunkIdsToDelete, previous);
		assert.deepStrictEqual(result.chunkIdsToEmbed, current);
	});

	test('a chunk added at the end only embeds the new one, deletes nothing', () => {
		const previous = ['a.ts#L1-10'];
		const current = ['a.ts#L1-10', 'a.ts#L11-15'];
		const result = diffChunkIds(previous, current);
		assert.deepStrictEqual(result.chunkIdsToDelete, []);
		assert.deepStrictEqual(result.chunkIdsToEmbed, ['a.ts#L11-15']);
	});

	test('a chunk removed from the end only deletes the removed one, embeds nothing', () => {
		const previous = ['a.ts#L1-10', 'a.ts#L11-15'];
		const current = ['a.ts#L1-10'];
		const result = diffChunkIds(previous, current);
		assert.deepStrictEqual(result.chunkIdsToDelete, ['a.ts#L11-15']);
		assert.deepStrictEqual(result.chunkIdsToEmbed, []);
	});

	test('both empty: no-op', () => {
		const result = diffChunkIds([], []);
		assert.deepStrictEqual(result.chunkIdsToDelete, []);
		assert.deepStrictEqual(result.chunkIdsToEmbed, []);
	});

	test('duplicate ids in input do not produce duplicate output (defensive, should not happen given real chunk ids are unique)', () => {
		const result = diffChunkIds(['a.ts#L1-10', 'a.ts#L1-10'], ['a.ts#L1-10']);
		assert.deepStrictEqual(result.chunkIdsToDelete, []);
		assert.deepStrictEqual(result.chunkIdsToEmbed, []);
	});
});

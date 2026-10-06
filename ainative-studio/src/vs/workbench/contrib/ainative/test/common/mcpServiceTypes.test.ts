/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { isMCPToolDisabled } from '../../common/mcpServiceTypes.js';

suite('isMCPToolDisabled Tests', () => {

	test('returns false when disabledToolNames is undefined (never-configured server)', () => {
		assert.strictEqual(isMCPToolDisabled(undefined, 'read_file'), false);
	});

	test('returns false when disabledToolNames is an empty array', () => {
		assert.strictEqual(isMCPToolDisabled([], 'read_file'), false);
	});

	test('returns false for a tool not present in disabledToolNames', () => {
		assert.strictEqual(isMCPToolDisabled(['write_file'], 'read_file'), false);
	});

	test('returns true for a tool present in disabledToolNames', () => {
		assert.strictEqual(isMCPToolDisabled(['read_file'], 'read_file'), true);
	});

	test('returns true for one of several disabled tools', () => {
		assert.strictEqual(isMCPToolDisabled(['write_file', 'read_file', 'delete_file'], 'read_file'), true);
	});

	test('is exact-match, not a substring/prefix match', () => {
		assert.strictEqual(isMCPToolDisabled(['read_file'], 'read_file_v2'), false);
		assert.strictEqual(isMCPToolDisabled(['read_file_v2'], 'read_file'), false);
	});
});

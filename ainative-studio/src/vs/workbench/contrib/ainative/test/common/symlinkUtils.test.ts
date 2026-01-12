/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { getSymlinkSetupInstructions } from '../../node/skills/symlinkUtils.js';

suite('SymlinkUtils', () => {

	suite('getSymlinkSetupInstructions', () => {

		test('should generate setup instructions with correct path', () => {
			const claudePath = '/Users/test/project/.claude';
			const instructions = getSymlinkSetupInstructions(claudePath);

			assert.ok(instructions.includes('not symlinked'));
			assert.ok(instructions.includes('git clone'));
			assert.ok(instructions.includes('ln -s'));
			assert.ok(instructions.includes(claudePath));
			assert.ok(instructions.includes('/skill sync'));
		});

		test('should include all required steps', () => {
			const instructions = getSymlinkSetupInstructions('.claude');

			assert.ok(instructions.includes('1.'));
			assert.ok(instructions.includes('2.'));
			assert.ok(instructions.includes('3.'));
			assert.ok(instructions.includes('rm -rf'));
			assert.ok(instructions.includes('core repository'));
		});

		test('should show warning emoji', () => {
			const instructions = getSymlinkSetupInstructions('.claude');
			assert.ok(instructions.includes('⚠️'));
		});
	});
});

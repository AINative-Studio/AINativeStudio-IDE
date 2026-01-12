/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { formatGitPullOutput } from '../../node/skills/cli/gitOperations.js';
import { GitOperationResult } from '../../node/skills/cli/gitOperations.js';

suite('GitOperations', () => {

	suite('formatGitPullOutput', () => {

		test('should format failed pull', () => {
			const result: GitOperationResult = {
				success: false,
				stdout: '',
				stderr: '',
				errorMessage: 'Network error'
			};

			const output = formatGitPullOutput(result);
			assert.ok(output.includes('✗'));
			assert.ok(output.includes('Network error'));
		});

		test('should format already up to date', () => {
			const result: GitOperationResult = {
				success: true,
				stdout: 'Already up to date.',
				stderr: ''
			};

			const output = formatGitPullOutput(result);
			assert.ok(output.includes('✓'));
			assert.ok(output.includes('already up to date'));
		});

		test('should format fast-forward update', () => {
			const result: GitOperationResult = {
				success: true,
				stdout: 'Fast-forward\n 1 file changed, 10 insertions(+)',
				stderr: ''
			};

			const output = formatGitPullOutput(result);
			assert.ok(output.includes('✓'));
			assert.ok(output.includes('fast-forward'));
		});

		test('should format merge update', () => {
			const result: GitOperationResult = {
				success: true,
				stdout: 'Merge made by the \'recursive\' strategy.',
				stderr: ''
			};

			const output = formatGitPullOutput(result);
			assert.ok(output.includes('✓'));
			assert.ok(output.includes('merge'));
		});

		test('should handle generic success', () => {
			const result: GitOperationResult = {
				success: true,
				stdout: 'Updated',
				stderr: ''
			};

			const output = formatGitPullOutput(result);
			assert.ok(output.includes('✓'));
			assert.ok(output.includes('updated successfully'));
		});

		test('should handle error without message', () => {
			const result: GitOperationResult = {
				success: false,
				stdout: '',
				stderr: ''
			};

			const output = formatGitPullOutput(result);
			assert.ok(output.includes('✗'));
			assert.ok(output.includes('failed'));
		});
	});
});

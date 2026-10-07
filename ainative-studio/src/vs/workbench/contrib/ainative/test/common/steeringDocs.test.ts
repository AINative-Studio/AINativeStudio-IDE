/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { formatSteeringFileSections } from '../../common/steeringDocs.js';

suite('formatSteeringFileSections (#161 steering docs) Tests', () => {

	test('returns empty string for no files', () => {
		assert.strictEqual(formatSteeringFileSections([]), '');
	});

	test('formats a single file as a "### name" section', () => {
		const result = formatSteeringFileSections([{ name: 'conventions.md', content: 'Use tabs, not spaces.' }]);
		assert.strictEqual(result, '### conventions.md\nUse tabs, not spaces.');
	});

	test('sorts files alphabetically by name', () => {
		const result = formatSteeringFileSections([
			{ name: 'zebra.md', content: 'z content' },
			{ name: 'alpha.md', content: 'a content' },
		]);
		const alphaIndex = result.indexOf('alpha.md');
		const zebraIndex = result.indexOf('zebra.md');
		assert.ok(alphaIndex >= 0 && zebraIndex >= 0);
		assert.ok(alphaIndex < zebraIndex);
	});

	test('skips files with blank/whitespace-only content', () => {
		const result = formatSteeringFileSections([
			{ name: 'real.md', content: 'has real content' },
			{ name: 'blank.md', content: '   \n\n  ' },
		]);
		assert.ok(result.includes('real.md'));
		assert.ok(!result.includes('blank.md'));
	});

	test('skips blank files entirely, including when every file is blank', () => {
		assert.strictEqual(formatSteeringFileSections([{ name: 'blank.md', content: '' }]), '');
	});

	test('trims leading/trailing whitespace from each file content', () => {
		const result = formatSteeringFileSections([{ name: 'a.md', content: '\n\n  hello  \n\n' }]);
		assert.strictEqual(result, '### a.md\nhello');
	});

	test('joins multiple files with a blank line between sections', () => {
		const result = formatSteeringFileSections([
			{ name: 'a.md', content: 'A' },
			{ name: 'b.md', content: 'B' },
		]);
		assert.strictEqual(result, '### a.md\nA\n\n### b.md\nB');
	});
});

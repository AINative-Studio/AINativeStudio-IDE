/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { matchBootstrapProviderName } from '../../common/cloudBootstrapProviderMapping.js';

suite('matchBootstrapProviderName (#184) Tests', () => {

	test('matches an exact lowercase provider name', () => {
		assert.strictEqual(matchBootstrapProviderName('anthropic'), 'anthropic');
	});

	test('matches "openai" (lowercase) to the "openAI" provider key', () => {
		assert.strictEqual(matchBootstrapProviderName('openai'), 'openAI');
	});

	test('matches "OpenAI" (mixed case) to the "openAI" provider key', () => {
		assert.strictEqual(matchBootstrapProviderName('OpenAI'), 'openAI');
	});

	test('matches "open-ai" (hyphenated) to the "openAI" provider key', () => {
		assert.strictEqual(matchBootstrapProviderName('open-ai'), 'openAI');
	});

	test('matches "open_ai" (underscored) to the "openAI" provider key', () => {
		assert.strictEqual(matchBootstrapProviderName('open_ai'), 'openAI');
	});

	test('matches "xai" to the "xAI" provider key', () => {
		assert.strictEqual(matchBootstrapProviderName('xai'), 'xAI');
	});

	test('matches "x-ai" to the "xAI" provider key', () => {
		assert.strictEqual(matchBootstrapProviderName('x-ai'), 'xAI');
	});

	test('matches "digital-ocean" to the "digitalOcean" provider key', () => {
		assert.strictEqual(matchBootstrapProviderName('digital-ocean'), 'digitalOcean');
	});

	test('returns undefined for a provider name with no match', () => {
		assert.strictEqual(matchBootstrapProviderName('some-unknown-vendor'), undefined);
	});

	test('returns undefined for an empty string', () => {
		assert.strictEqual(matchBootstrapProviderName(''), undefined);
	});
});

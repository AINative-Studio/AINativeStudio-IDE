/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { normalizeGitRemoteUrl, computeRepoHash } from '../../common/codeContextProjectHash.js';

suite('normalizeGitRemoteUrl (#160 code context engine) Tests', () => {

	test('lowercases the url', () => {
		assert.strictEqual(normalizeGitRemoteUrl('HTTPS://GitHub.com/Foo/Bar.git'), 'https://github.com/foo/bar');
	});

	test('strips a trailing .git suffix', () => {
		assert.strictEqual(normalizeGitRemoteUrl('https://github.com/foo/bar.git'), 'https://github.com/foo/bar');
	});

	test('strips a trailing slash', () => {
		assert.strictEqual(normalizeGitRemoteUrl('https://github.com/foo/bar/'), 'https://github.com/foo/bar');
	});

	test('converts an SSH (scp-style) remote to the same form as HTTPS', () => {
		const ssh = normalizeGitRemoteUrl('git@github.com:foo/bar.git');
		const https = normalizeGitRemoteUrl('https://github.com/foo/bar.git');
		assert.strictEqual(ssh, https);
	});

	test('trims surrounding whitespace', () => {
		assert.strictEqual(normalizeGitRemoteUrl('  https://github.com/foo/bar  '), 'https://github.com/foo/bar');
	});
});

suite('computeRepoHash (#160 code context engine) Tests', () => {

	test('produces a 16-character lowercase hex string', async () => {
		const hash = await computeRepoHash('https://github.com/foo/bar.git');
		assert.strictEqual(hash.length, 16);
		assert.ok(/^[0-9a-f]{16}$/.test(hash));
	});

	test('is deterministic for the same remote', async () => {
		const a = await computeRepoHash('https://github.com/foo/bar.git');
		const b = await computeRepoHash('https://github.com/foo/bar.git');
		assert.strictEqual(a, b);
	});

	test('produces the same hash for equivalent SSH and HTTPS forms of the same remote', async () => {
		const ssh = await computeRepoHash('git@github.com:foo/bar.git');
		const https = await computeRepoHash('https://github.com/foo/bar');
		assert.strictEqual(ssh, https);
	});

	test('produces different hashes for different remotes', async () => {
		const a = await computeRepoHash('https://github.com/foo/bar.git');
		const b = await computeRepoHash('https://github.com/foo/other-repo.git');
		assert.notStrictEqual(a, b);
	});
});

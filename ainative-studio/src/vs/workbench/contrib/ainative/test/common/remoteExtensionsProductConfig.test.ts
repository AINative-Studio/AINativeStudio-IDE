/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// #165: the bundled open-remote-ssh/open-remote-wsl extensions (extensions/open-remote-ssh,
// extensions/open-remote-wsl) declare `enabledApiProposals: ['resolvers', 'contribViewsRemote']`
// in their own package.json. In a packaged (isBuilt) run, ExtensionsProposedApi
// (src/vs/workbench/services/extensions/common/extensionsProposedApi.ts) only honors proposed
// API usage for a non-builtin extension if product.json's `extensionEnabledApiProposals` map
// explicitly lists that extension id with those proposal names - otherwise it silently zeroes
// out `enabledApiProposals`, which breaks the remote-authority resolver registration
// (`vscode.RemoteAuthorityResolver`) these extensions rely on to ever activate for
// ssh-remote/wsl authorities. This only doesn't bite in a dev-mode (`npm run watch` /
// `./scripts/code.sh`) run, where `!isBuilt` allows proposed API unconditionally - a real
// packaged release would silently break Remote-SSH/WSL without this entry.
suite('product.json remote extension proposed API declarations (#165)', () => {

	const productJsonPath = path.join(__dirname, '../../../../../../../product.json');

	function loadProductJson(): any {
		const raw = fs.readFileSync(productJsonPath, 'utf8');
		return JSON.parse(raw);
	}

	test('product.json exists and parses as JSON', () => {
		assert.ok(fs.existsSync(productJsonPath), `product.json not found at ${productJsonPath}`);
		assert.doesNotThrow(() => loadProductJson());
	});

	test('declares resolvers + contribViewsRemote for ainative-studio.open-remote-ssh', () => {
		const product = loadProductJson();
		const proposals = product.extensionEnabledApiProposals?.['ainative-studio.open-remote-ssh'];
		assert.ok(Array.isArray(proposals), 'expected extensionEnabledApiProposals["ainative-studio.open-remote-ssh"] to be an array');
		assert.ok(proposals.includes('resolvers'), 'missing "resolvers" proposal');
		assert.ok(proposals.includes('contribViewsRemote'), 'missing "contribViewsRemote" proposal');
	});

	test('declares resolvers + contribViewsRemote for ainative-studio.open-remote-wsl', () => {
		const product = loadProductJson();
		const proposals = product.extensionEnabledApiProposals?.['ainative-studio.open-remote-wsl'];
		assert.ok(Array.isArray(proposals), 'expected extensionEnabledApiProposals["ainative-studio.open-remote-wsl"] to be an array');
		assert.ok(proposals.includes('resolvers'), 'missing "resolvers" proposal');
		assert.ok(proposals.includes('contribViewsRemote'), 'missing "contribViewsRemote" proposal');
	});

	test('bundled extensions\' own package.json proposals stay a subset of what product.json grants', () => {
		const product = loadProductJson();
		const extensionIds: Array<[string, string]> = [
			['ainative-studio.open-remote-ssh', '../../../../../../../extensions/open-remote-ssh/package.json'],
			['ainative-studio.open-remote-wsl', '../../../../../../../extensions/open-remote-wsl/package.json'],
		];

		for (const [id, relPackagePath] of extensionIds) {
			const pkgPath = path.join(__dirname, relPackagePath);
			const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
			const declaredByExtension: string[] = pkg.enabledApiProposals ?? [];
			const grantedByProduct: string[] = product.extensionEnabledApiProposals?.[id] ?? [];

			for (const proposal of declaredByExtension) {
				assert.ok(
					grantedByProduct.includes(proposal),
					`product.json grants fewer proposals than ${id}'s package.json wants (missing "${proposal}") - ` +
					`this extension would be silently broken in a packaged build (see extensionsProposedApi.ts)`
				);
			}
		}
	});
});

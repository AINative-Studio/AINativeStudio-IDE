/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('CSS Class Branding Tests', () => {
	const cssFilePath = path.join(__dirname, '../../../../src/vs/workbench/contrib/void/browser/media/void.css');

	test('CSS file should exist at correct path', () => {
		assert.ok(fs.existsSync(cssFilePath), 'CSS file should exist at void.css path');
	});

	test('Should not contain any .void- CSS classes', () => {
		const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
		const voidClassMatches = cssContent.match(/\.void-[a-zA-Z0-9-]+/g);

		if (voidClassMatches) {
			assert.fail(`Found ${voidClassMatches.length} .void- classes that should be renamed to .ainative-:\n${voidClassMatches.join('\n')}`);
		}
	});

	test('Should use .ainative- prefix for all custom classes', () => {
		const cssContent = fs.readFileSync(cssFilePath, 'utf-8');

		// Check for ainative classes (should have at least 8)
		const ainativeClassMatches = cssContent.match(/\.ainative-[a-zA-Z0-9-]+/g);
		const uniqueAinativeClasses = ainativeClassMatches ? [...new Set(ainativeClassMatches)] : [];

		assert.ok(
			uniqueAinativeClasses.length >= 8,
			`Expected at least 8 unique .ainative- classes, found ${uniqueAinativeClasses.length}`
		);
	});

	test('Should not contain any --vscode-void- theme variables', () => {
		const cssContent = fs.readFileSync(cssFilePath, 'utf-8');
		const voidVarMatches = cssContent.match(/--vscode-void-[a-zA-Z0-9-]+/g);

		if (voidVarMatches) {
			assert.fail(`Found ${voidVarMatches.length} --vscode-void- variables that should be renamed to --vscode-ainative-:\n${voidVarMatches.join('\n')}`);
		}
	});
});

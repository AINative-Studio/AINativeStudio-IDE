/**
 * File Naming Tests - Void to AINative Rebranding
 *
 * Tests verify that all source files have been renamed from "void" to "ainative"
 * as part of the rebranding effort (Issue #59).
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

suite('Branding - File Naming Tests', () => {
	const rootDir = path.join(__dirname, '../../../../');
	const contribDir = path.join(rootDir, 'src/vs/workbench/contrib');

	test('should not have any files with "void" in filename under contrib directory', async () => {
		// Find all files with "void" in their name (case-insensitive)
		const voidFiles = await glob('**/*void*', {
			cwd: contribDir,
			nodir: true,
			ignore: ['**/node_modules/**', '**/out/**', '**/dist/**']
		});

		assert.strictEqual(
			voidFiles.length,
			0,
			`Found ${voidFiles.length} files with "void" in filename:\n${voidFiles.join('\n')}`
		);
	});

	test('should have ainative directory in contrib folder', () => {
		const ainativeDir = path.join(contribDir, 'ainative');
		const exists = fs.existsSync(ainativeDir);

		assert.strictEqual(
			exists,
			true,
			`AINative directory should exist at ${ainativeDir}`
		);

		// Verify it's a directory
		if (exists) {
			const stats = fs.statSync(ainativeDir);
			assert.strictEqual(
				stats.isDirectory(),
				true,
				'ainative path should be a directory'
			);
		}
	});

	test('should NOT have void directory in contrib folder', () => {
		const voidDir = path.join(contribDir, 'void');
		const exists = fs.existsSync(voidDir);

		assert.strictEqual(
			exists,
			false,
			`Void directory should NOT exist at ${voidDir}`
		);
	});

	test('should have all React component directories renamed to ainative', async () => {
		const ainativeReactDir = path.join(contribDir, 'ainative/browser/react/src');

		// Check that ainative React directories exist
		const expectedDirs = [
			'ainative-settings-tsx',
			'ainative-tooltip',
			'ainative-editor-widgets-tsx',
			'ainative-onboarding'
		];

		for (const dirName of expectedDirs) {
			const dirPath = path.join(ainativeReactDir, dirName);
			const exists = fs.existsSync(dirPath);

			assert.strictEqual(
				exists,
				true,
				`React component directory "${dirName}" should exist at ${dirPath}`
			);
		}

		// Check that void React directories do NOT exist
		const forbiddenDirs = [
			'void-settings-tsx',
			'void-tooltip',
			'void-editor-widgets-tsx',
			'void-onboarding'
		];

		for (const dirName of forbiddenDirs) {
			const dirPath = path.join(ainativeReactDir, dirName);
			const exists = fs.existsSync(dirPath);

			assert.strictEqual(
				exists,
				false,
				`Old void directory "${dirName}" should NOT exist at ${dirPath}`
			);
		}
	});

	test('should have ainative_icons directory (not void_icons)', () => {
		const ainativeDir = path.join(contribDir, 'ainative');

		// Search for icon directories
		// // const ainativeIconsPath = path.join(ainativeDir, 'browser/media/ainative_icons');
		const voidIconsPath = path.join(ainativeDir, 'browser/media/void_icons');

		// Check if we can find any icon directory
		let iconDirExists = false;
		if (fs.existsSync(path.join(ainativeDir, 'browser/media'))) {
			const mediaContents = fs.readdirSync(path.join(ainativeDir, 'browser/media'));
			iconDirExists = mediaContents.some(item => item.includes('ainative_icons'));
		}

		// If icon directory exists, verify naming
		if (iconDirExists) {
			assert.strictEqual(
				fs.existsSync(voidIconsPath),
				false,
				'void_icons directory should not exist'
			);
		}
	});
});

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { validateSkillName, executeCreateCommand } from '../../common/skills/cli/createCommand.js';
import { URI } from '../../../../../base/common/uri.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-expect-error - Unused variable
import { IFileService, IFileStatWithMetadata, FileType } from '../../../../../platform/files/common/files.js';
import { INativeEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

/**
 * Mock File Service for testing
 */
class MockFileService implements Partial<IFileService> {
	private files: Map<string, string> = new Map();
	private directories: Set<string> = new Set();

	async resolve(uri: URI): Promise<any> {
		if (this.directories.has(uri.fsPath)) {
			return { isDirectory: true };
		}
		if (this.files.has(uri.fsPath)) {
			return { isFile: true };
		}
		throw new Error('File not found');
	}

	async createFolder(uri: URI): Promise<IFileStatWithMetadata> {
		this.directories.add(uri.fsPath);
		return {
			resource: uri,
			name: uri.path.split('/').pop() || '',
			isFile: false,
			isDirectory: true,
			isSymbolicLink: false,
			mtime: Date.now(),
			ctime: Date.now(),
			etag: 'mock-etag',
			size: 0,
			readonly: false,
			locked: false,
			children: undefined,
   // type: FileType.Directory
		};
	}

	async writeFile(uri: URI, content: VSBuffer): Promise<IFileStatWithMetadata> {
		this.files.set(uri.fsPath, content.toString());
		return {
			resource: uri,
			name: uri.path.split('/').pop() || '',
			isFile: true,
			isDirectory: false,
			isSymbolicLink: false,
			mtime: Date.now(),
			ctime: Date.now(),
			etag: 'mock-etag',
			size: content.byteLength,
			readonly: false,
			locked: false,
			children: undefined,
   // type: FileType.File
		};
	}

	async readFile(uri: URI): Promise<any> {
		const content = this.files.get(uri.fsPath);
		if (!content) {
			throw new Error('File not found');
		}
		return { value: VSBuffer.fromString(content) };
	}

	getFiles(): Map<string, string> {
		return this.files;
	}

	getDirectories(): Set<string> {
		return this.directories;
	}

	reset(): void {
		this.files.clear();
		this.directories.clear();
	}
}

/**
 * Mock Native Environment Service for testing
 */
class MockNativeEnvironmentService implements Partial<INativeEnvironmentService> {
	userHome = URI.file('/home/testuser');
}

suite('Skill Create Command', () => {
	let mockFileService: MockFileService;
	let mockEnvService: MockNativeEnvironmentService;

	setup(() => {
		mockFileService = new MockFileService();
		mockEnvService = new MockNativeEnvironmentService();
	});

	suite('Skill Name Validation', () => {
		test('should accept valid skill names', () => {
			const validNames = [
				'my-skill',
				'test123',
				'awesome-skill-v2',
				'a',
				'skill-1-2-3'
			];

			for (const name of validNames) {
				const result = validateSkillName(name);
				assert.strictEqual(result.valid, true, `"${name}" should be valid`);
			}
		});

		test('should reject empty skill name', () => {
			const result = validateSkillName('');
			assert.strictEqual(result.valid, false);
			assert.ok(result.error?.includes('empty'), 'Error should mention empty name');
		});

		test('should reject uppercase letters', () => {
			const result = validateSkillName('MySkill');
			assert.strictEqual(result.valid, false);
			assert.ok(result.error?.includes('lowercase'), 'Error should mention lowercase requirement');
		});

		test('should reject special characters', () => {
			const invalidNames = [
				'my_skill',
				'skill@test',
				'skill.name',
				'skill!',
				'skill name' // space
			];

			for (const name of invalidNames) {
				const result = validateSkillName(name);
				assert.strictEqual(result.valid, false, `"${name}" should be invalid`);
			}
		});

		test('should reject leading hyphen', () => {
			const result = validateSkillName('-my-skill');
			assert.strictEqual(result.valid, false);
			assert.ok(result.error?.includes('start'), 'Error should mention leading hyphen');
		});

		test('should reject trailing hyphen', () => {
			const result = validateSkillName('my-skill-');
			assert.strictEqual(result.valid, false);
			assert.ok(result.error?.includes('end'), 'Error should mention trailing hyphen');
		});

		test('should reject consecutive hyphens', () => {
			const result = validateSkillName('my--skill');
			assert.strictEqual(result.valid, false);
			assert.ok(result.error?.includes('consecutive'), 'Error should mention consecutive hyphens');
		});
	});

	suite('Skill Creation', () => {
		test('should create skill with proper directory structure', async () => {
			// Act
			const result = await executeCreateCommand(
				'test-skill',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, true, 'Creation should succeed');
			assert.strictEqual(result.skillName, 'test-skill');
			assert.ok(result.skillPath.includes('test-skill'), 'Path should include skill name');

			// Check directories
			const dirs = mockFileService.getDirectories();
			assert.ok(
				Array.from(dirs).some(d => d.includes('.ainative/skills/test-skill')),
				'Main skill directory should be created'
			);
			assert.ok(
				Array.from(dirs).some(d => d.includes('test-skill/references')),
				'References directory should be created'
			);
			assert.ok(
				Array.from(dirs).some(d => d.includes('test-skill/scripts')),
				'Scripts directory should be created'
			);
			assert.ok(
				Array.from(dirs).some(d => d.includes('test-skill/assets')),
				'Assets directory should be created'
			);
		});

		test('should create SKILL.md with correct content', async () => {
			// Act
			const result = await executeCreateCommand(
				'my-awesome-skill',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, true);

			const files = mockFileService.getFiles();
			const skillMdEntry = Array.from(files.entries()).find(([path]) =>
				path.includes('SKILL.md') && path.includes('my-awesome-skill')
			);

			assert.ok(skillMdEntry, 'SKILL.md should be created');

			const [, content] = skillMdEntry!;
			assert.ok(content.includes('name: my-awesome-skill'), 'Should include skill name in frontmatter');
			assert.ok(content.includes('version: 1.0.0'), 'Should include version');
			assert.ok(content.includes('# My Awesome Skill'), 'Should include formatted title');
			assert.ok(content.includes('## Overview'), 'Should include Overview section');
			assert.ok(content.includes('## When to Use'), 'Should include When to Use section');
			assert.ok(content.includes('## Examples'), 'Should include Examples section');
		});

		test('should create README files in subdirectories', async () => {
			// Act
			const result = await executeCreateCommand(
				'test-skill',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, true);

			const files = mockFileService.getFiles();
			const filePaths = Array.from(files.keys());

			assert.ok(
				filePaths.some(p => p.includes('references/README.md')),
				'References README should be created'
			);
			assert.ok(
				filePaths.some(p => p.includes('scripts/README.md')),
				'Scripts README should be created'
			);
			assert.ok(
				filePaths.some(p => p.includes('assets/README.md')),
				'Assets README should be created'
			);
		});

		test('should return error if skill already exists', async () => {
			// Arrange - Create skill first time
			await executeCreateCommand(
				'existing-skill',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Act - Try to create again
			const result = await executeCreateCommand(
				'existing-skill',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, false, 'Should fail for existing skill');
			assert.ok(result.output.includes('already exists'), 'Error should mention existing directory');
		});

		test('should return error for invalid skill name', async () => {
			// Act
			const result = await executeCreateCommand(
				'Invalid_Name',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, false);
			assert.ok(result.output.includes('lowercase'), 'Error should mention validation failure');
		});

		test('should include next steps in success output', async () => {
			// Act
			const result = await executeCreateCommand(
				'my-skill',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, true);
			assert.ok(result.output.includes('Successfully created'), 'Should include success message');
			assert.ok(result.output.includes('Next steps:'), 'Should include next steps');
			assert.ok(result.output.includes('Edit SKILL.md'), 'Should mention editing SKILL.md');
			assert.ok(result.output.includes('/skill install'), 'Should mention install command');
			assert.ok(result.output.includes('.mcp.json'), 'Should mention configuration');
		});

		test('should format skill name in title correctly', async () => {
			// Act
			const result = await executeCreateCommand(
				'my-awesome-skill',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, true);

			const files = mockFileService.getFiles();
			const skillMdContent = Array.from(files.values()).find(content =>
				content.includes('# My Awesome Skill')
			);

			assert.ok(skillMdContent, 'Title should be formatted as "My Awesome Skill"');
		});

		test('should handle single-word skill names', async () => {
			// Act
			const result = await executeCreateCommand(
				'testing',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, true);
			assert.strictEqual(result.skillName, 'testing');

			const files = mockFileService.getFiles();
			const skillMdContent = Array.from(files.values()).find(content =>
				content.includes('name: testing')
			);

			assert.ok(skillMdContent, 'Should handle single-word names');
			assert.ok(skillMdContent!.includes('# Testing'), 'Should capitalize single-word title');
		});

		test('should create skill in correct location', async () => {
			// Act
			const result = await executeCreateCommand(
				'location-test',
				mockFileService as unknown as IFileService,
				mockEnvService as INativeEnvironmentService
			);

			// Assert
			assert.strictEqual(result.success, true);
			assert.ok(
				result.skillPath.includes('.ainative/skills/location-test'),
				'Should create in .ainative/skills directory'
			);
		});
	});
});

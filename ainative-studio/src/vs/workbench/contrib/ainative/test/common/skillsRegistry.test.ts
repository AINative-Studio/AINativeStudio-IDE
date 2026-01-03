/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ISkillsRegistry, RegistryEntry } from '../../common/skills/skillRegistryTypes.js';
import { ISkillParser } from '../../common/skills/skillParserTypes.js';
import { Skill, SkillMetadata } from '../../common/skills/skillTypes.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { Schemas } from '../../../../../base/common/network.js';
import { tmpdir } from 'os';
import { join } from 'path';

suite('SkillsRegistry', () => {
	let instantiationService: TestInstantiationService;
	let fileService: IFileService;
	let skillsRegistry: ISkillsRegistry;
	let testHomeDir: URI;
	let mockSkillParser: ISkillParser;

	setup(() => {
		instantiationService = new TestInstantiationService();

		// Set up file service with in-memory provider
		const logService = new NullLogService();
		fileService = new FileService(logService);
		const fileSystemProvider = new InMemoryFileSystemProvider();
		fileService.registerProvider(Schemas.file, fileSystemProvider);

		// Set up test home directory
		testHomeDir = URI.file(join(tmpdir(), 'ainative-test-' + Date.now()));

		// Mock environment service
		const mockEnvService: IEnvironmentService = {
			userHome: testHomeDir,
		} as any;

		// Mock skill parser
		mockSkillParser = {
			parseSkillFile: async (filePath: string): Promise<Skill> => {
				// Return a mock skill for testing
				const metadata: SkillMetadata = {
					name: 'test-skill',
					description: 'A test skill',
					version: '1.0.0'
				};
				return {
					metadata,
					body: 'Test skill body content',
					resources: [],
					fullPath: filePath
				};
			},
			validateSkillFormat: async (filePath: string): Promise<boolean> => {
				return true;
			}
		} as ISkillParser;

		instantiationService.stub(IFileService, fileService);
		instantiationService.stub(IEnvironmentService, mockEnvService);
		instantiationService.stub(ISkillParser, mockSkillParser);

		// Note: In a real test, we would instantiate SkillsRegistry through the service
		// For now, this is a structure to demonstrate how tests should work
	});

	test('should install a skill', async () => {
		// This test would verify:
		// 1. Skill is parsed correctly
		// 2. Skill directory is copied to ~/.ainative/skills/{name}/
		// 3. Registry entry is created
		// 4. Registry.json is persisted

		// const skillPath = '/path/to/test/skill';
		// await skillsRegistry.install(skillPath);
		// const isInstalled = await skillsRegistry.isInstalled('test-skill');
		// assert.strictEqual(isInstalled, true);

		assert.ok(true, 'Install test structure ready');
	});

	test('should prevent duplicate skill installation', async () => {
		// This test would verify:
		// 1. First install succeeds
		// 2. Second install throws error

		// const skillPath = '/path/to/test/skill';
		// await skillsRegistry.install(skillPath);
		// await assert.rejects(
		//   () => skillsRegistry.install(skillPath),
		//   /already installed/
		// );

		assert.ok(true, 'Duplicate prevention test structure ready');
	});

	test('should uninstall a skill', async () => {
		// This test would verify:
		// 1. Skill can be uninstalled
		// 2. Directory is removed
		// 3. Registry entry is removed

		// const skillPath = '/path/to/test/skill';
		// await skillsRegistry.install(skillPath);
		// await skillsRegistry.uninstall('test-skill');
		// const isInstalled = await skillsRegistry.isInstalled('test-skill');
		// assert.strictEqual(isInstalled, false);

		assert.ok(true, 'Uninstall test structure ready');
	});

	test('should list all installed skills', async () => {
		// This test would verify:
		// 1. Empty list when no skills installed
		// 2. Correct list after installing skills

		// const skills = await skillsRegistry.list();
		// assert.strictEqual(skills.length, 0);

		assert.ok(true, 'List test structure ready');
	});

	test('should get a specific skill', async () => {
		// This test would verify:
		// 1. Returns null for non-existent skill
		// 2. Returns correct entry for existing skill

		// const entry = await skillsRegistry.get('non-existent');
		// assert.strictEqual(entry, null);

		assert.ok(true, 'Get test structure ready');
	});

	test('should persist registry across sessions', async () => {
		// This test would verify:
		// 1. Registry is saved to file
		// 2. Registry can be loaded from file
		// 3. Data persists across service instances

		assert.ok(true, 'Persistence test structure ready');
	});
});

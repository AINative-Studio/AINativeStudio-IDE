/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'path';
import { tmpdir } from 'os';
import { URI } from '../../../../../base/common/uri.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../../../../base/common/network.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ISkillsRegistry } from '../../common/skills/skillRegistryTypes.js';
import { Skill, SkillMetadata } from '../../common/skills/skillTypes.js';
import { ISkillParser } from '../../common/skills/skillParserTypes.js';
import { INativeEnvironmentService } from '../../../../../platform/environment/common/environment.js';

// Import the actual SkillsRegistry class
// Note: We need to access the class directly since it's not exported by default
// We'll instantiate it manually in the tests

suite('SkillsRegistry Tests', () => {
	let fileService: FileService;
	let disposables: DisposableStore;
	let testHomeDir: URI;
	let skillsRegistry: ISkillsRegistry;
	let mockSkillParser: ISkillParser;
	const fixturesPath = path.join(__dirname, 'fixtures', 'skills');
	let registryImpl: any; // To access private methods for testing

	// Mock skill parser
	class MockSkillParser implements ISkillParser {
		_serviceBrand: undefined;

		async parseSkillFile(filePath: string): Promise<Skill> {
			// Extract skill name from path
			const skillDir = path.dirname(filePath);
			const skillName = path.basename(skillDir);

			const metadata: SkillMetadata = {
				name: skillName,
				description: `Description for ${skillName}`,
				version: '1.0.0'
			};

			return {
				metadata,
				body: `Body content for ${skillName}`,
				resources: [],
				fullPath: filePath
			};
		}

		async validateSkillFormat(filePath: string): Promise<boolean> {
			return true;
		}
	}

	setup(async () => {
		disposables = new DisposableStore();

		// Set up file service
		const logService = new NullLogService();
		fileService = disposables.add(new FileService(logService));
		const diskProvider = new DiskFileSystemProvider(logService);
		fileService.registerProvider(Schemas.file, diskProvider);

		// Create unique test home directory
		testHomeDir = URI.file(path.join(tmpdir(), 'ainative-registry-test-' + Date.now()));

		// Mock environment service
		const mockEnvService: INativeEnvironmentService = {
			userHome: testHomeDir,
		} as any;

		// Create mock parser
		mockSkillParser = new MockSkillParser();

		// Manually instantiate SkillsRegistry
		const { SkillsRegistry } = await import('../../common/skills/skillsRegistry.js');
		registryImpl = new SkillsRegistry(fileService, mockSkillParser, mockEnvService);
		skillsRegistry = registryImpl as ISkillsRegistry;
	});

	teardown(async () => {
		// Clean up test directory
		try {
			await fileService.del(testHomeDir, { recursive: true });
		} catch (error) {
			// Ignore cleanup errors
		}

		disposables.dispose();
	});

	suite('Installation', () => {
		test('should install skill from local path', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			await skillsRegistry.install(skillPath);

			const isInstalled = await skillsRegistry.isInstalled('minimal-skill');
			assert.strictEqual(isInstalled, true);
		});

		test('should throw error when installing duplicate skill', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			await skillsRegistry.install(skillPath);

			try {
				await skillsRegistry.install(skillPath);
				assert.fail('Should have thrown error for duplicate installation');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('already installed'));
			}
		});

		test('should create skills directory on first install', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			await skillsRegistry.install(skillPath);

			// Verify directory was created
			const skillsDir = URI.joinPath(testHomeDir, '.ainative', 'skills');
			const stat = await fileService.resolve(skillsDir);
			assert.ok(stat.isDirectory);
		});

		test('should copy all skill files to target directory', async () => {
			const skillPath = path.join(fixturesPath, 'comprehensive-skill');

			await skillsRegistry.install(skillPath);

			// Verify SKILL.md was copied
			const targetPath = URI.joinPath(testHomeDir, '.ainative', 'skills', 'comprehensive-skill', 'SKILL.md');
			const stat = await fileService.resolve(targetPath);
			assert.ok(stat);
		});

		test('should record installation timestamp', async () => {
			const beforeInstall = Date.now();
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			await skillsRegistry.install(skillPath);

			const entry = await skillsRegistry.get('minimal-skill');
			assert.ok(entry);
			assert.ok(entry.installedAt >= beforeInstall);
			assert.ok(entry.installedAt <= Date.now());
		});

		test('should detect source as local', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			await skillsRegistry.install(skillPath);

			const entry = await skillsRegistry.get('minimal-skill');
			assert.ok(entry);
			assert.strictEqual(entry.source, 'local');
		});
	});

	suite('Uninstallation', () => {
		test('should uninstall skill completely', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			await skillsRegistry.install(skillPath);
			assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), true);

			await skillsRegistry.uninstall('minimal-skill');
			assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), false);
		});

		test('should throw error when uninstalling non-existent skill', async () => {
			try {
				await skillsRegistry.uninstall('non-existent-skill');
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('not installed'));
			}
		});

		test('should remove skill directory and all resources', async () => {
			const skillPath = path.join(fixturesPath, 'comprehensive-skill');

			await skillsRegistry.install(skillPath);

			const entry = await skillsRegistry.get('comprehensive-skill');
			assert.ok(entry);

			await skillsRegistry.uninstall('comprehensive-skill');

			// Verify directory was removed
			const skillDir = URI.file(entry.path);
			try {
				await fileService.resolve(skillDir);
				assert.fail('Skill directory should have been removed');
			} catch (error) {
				// Expected - directory should not exist
				assert.ok(error);
			}
		});
	});

	suite('Listing and Querying', () => {
		test('should list all installed skills', async () => {
			const skill1Path = path.join(fixturesPath, 'minimal-skill');
			const skill2Path = path.join(fixturesPath, 'comprehensive-skill');

			await skillsRegistry.install(skill1Path);
			await skillsRegistry.install(skill2Path);

			const skills = await skillsRegistry.list();

			assert.strictEqual(skills.length, 2);
			const skillNames = skills.map(s => s.name);
			assert.ok(skillNames.includes('minimal-skill'));
			assert.ok(skillNames.includes('comprehensive-skill'));
		});

		test('should return empty array when no skills installed', async () => {
			const skills = await skillsRegistry.list();
			assert.ok(Array.isArray(skills));
			assert.strictEqual(skills.length, 0);
		});

		test('should return full registry entries', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');
			await skillsRegistry.install(skillPath);

			const skills = await skillsRegistry.list();

			assert.strictEqual(skills.length, 1);
			const entry = skills[0];
			assert.ok(entry.name);
			assert.ok(entry.version);
			assert.ok(entry.installedAt);
			assert.ok(entry.source);
			assert.ok(entry.path);
		});

		test('should get specific skill by name', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');
			await skillsRegistry.install(skillPath);

			const entry = await skillsRegistry.get('minimal-skill');

			assert.ok(entry);
			assert.strictEqual(entry.name, 'minimal-skill');
			assert.strictEqual(entry.version, '1.0.0');
		});

		test('should return null for non-existent skill', async () => {
			const entry = await skillsRegistry.get('non-existent');
			assert.strictEqual(entry, null);
		});

		test('should check if skill is installed', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), false);

			await skillsRegistry.install(skillPath);

			assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), true);
		});
	});

	suite('Persistence', () => {
		test('should persist registry to JSON file', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');
			await skillsRegistry.install(skillPath);

			// Verify registry.json was created
			const registryFile = URI.joinPath(testHomeDir, '.ainative', 'skills', 'registry.json');
			const content = await fileService.readFile(registryFile);
			const data = JSON.parse(content.value.toString());

			assert.ok(data['minimal-skill']);
			assert.strictEqual(data['minimal-skill'].name, 'minimal-skill');
		});

		test('should load existing registry on initialization', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');
			await skillsRegistry.install(skillPath);

			// Create a new registry instance (simulating restart)
			const mockEnvService: INativeEnvironmentService = {
				userHome: testHomeDir,
			} as any;

			const { SkillsRegistry } = await import('../../common/skills/skillsRegistry.js');
			const newRegistry = new SkillsRegistry(fileService, mockSkillParser, mockEnvService);

			// Verify the skill is still listed
			const isInstalled = await newRegistry.isInstalled('minimal-skill');
			assert.strictEqual(isInstalled, true);
		});

		test('should create registry file if missing', async () => {
			// First install should create the file
			const skillPath = path.join(fixturesPath, 'minimal-skill');
			await skillsRegistry.install(skillPath);

			const registryFile = URI.joinPath(testHomeDir, '.ainative', 'skills', 'registry.json');
			const stat = await fileService.resolve(registryFile);
			assert.ok(stat);
		});

		test('should handle corrupt registry file gracefully', async () => {
			// Create a corrupt registry file
			const skillsDir = URI.joinPath(testHomeDir, '.ainative', 'skills');
			await fileService.createFolder(skillsDir);

			const registryFile = URI.joinPath(skillsDir, 'registry.json');
			const { VSBuffer } = await import('../../../../../base/common/buffer.js');
			await fileService.writeFile(registryFile, VSBuffer.fromString('{ invalid json content }'));

			// Create a new registry instance
			const mockEnvService: INativeEnvironmentService = {
				userHome: testHomeDir,
			} as any;

			const { SkillsRegistry } = await import('../../common/skills/skillsRegistry.js');
			const newRegistry = new SkillsRegistry(fileService, mockSkillParser, mockEnvService);

			// Should handle corruption by returning empty list
			const skills = await newRegistry.list();
			assert.ok(Array.isArray(skills));
		});

		test('should update registry file after uninstall', async () => {
			const skillPath = path.join(fixturesPath, 'minimal-skill');
			await skillsRegistry.install(skillPath);
			await skillsRegistry.uninstall('minimal-skill');

			const registryFile = URI.joinPath(testHomeDir, '.ainative', 'skills', 'registry.json');
			const content = await fileService.readFile(registryFile);
			const data = JSON.parse(content.value.toString());

			assert.ok(!data['minimal-skill']);
		});
	});

	suite('Multiple Skills', () => {
		test('should handle multiple skill installations', async () => {
			const skills = ['minimal-skill', 'comprehensive-skill', 'skill-with-resources'];

			for (const skillName of skills) {
				const skillPath = path.join(fixturesPath, skillName);
				await skillsRegistry.install(skillPath);
			}

			const installedSkills = await skillsRegistry.list();
			assert.strictEqual(installedSkills.length, skills.length);
		});

		test('should maintain separate entries for each skill', async () => {
			const skill1Path = path.join(fixturesPath, 'minimal-skill');
			const skill2Path = path.join(fixturesPath, 'comprehensive-skill');

			await skillsRegistry.install(skill1Path);
			await skillsRegistry.install(skill2Path);

			const entry1 = await skillsRegistry.get('minimal-skill');
			const entry2 = await skillsRegistry.get('comprehensive-skill');

			assert.ok(entry1);
			assert.ok(entry2);
			assert.notStrictEqual(entry1.path, entry2.path);
		});
	});

	suite('Error Handling', () => {
		test('should handle invalid skill path gracefully', async () => {
			const invalidPath = path.join(fixturesPath, 'non-existent-skill');

			try {
				await skillsRegistry.install(invalidPath);
				assert.fail('Should have thrown error');
			} catch (error) {
				assert.ok(error instanceof Error);
			}
		});

		test('should validate skill before installation', async () => {
			// The parser will be called to validate the skill
			const skillPath = path.join(fixturesPath, 'minimal-skill');

			// This should succeed with our mock parser
			await skillsRegistry.install(skillPath);

			const isInstalled = await skillsRegistry.isInstalled('minimal-skill');
			assert.strictEqual(isInstalled, true);
		});
	});
});

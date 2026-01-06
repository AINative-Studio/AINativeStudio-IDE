/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { INativeEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ISkillsRegistry } from '../../common/skills/skillRegistryTypes.js';
import { ISkillParser } from '../../common/skills/skillParserTypes.js';
import { SkillInstallService } from '../../common/skills/cli/installCommand.js';
import { ISkillInstallService } from '../../common/skills/cli/cliTypes.js';

suite('SkillInstallCommand', () => {
	let instantiationService: TestInstantiationService;
	let installService: ISkillInstallService;

	setup(() => {
		instantiationService = new TestInstantiationService();

		// Mock services
		const mockFileService = {
			resolve: async (uri: URI) => ({ isFile: true, isDirectory: true }),
			copy: async () => { },
			createFolder: async () => { },
			readFile: async () => ({ value: { toString: () => '---\nname: test-skill\ndescription: Test\n---\nTest content' } }),
			del: async () => { }
		} as any;

		const mockRegistry = {
			isInstalled: async () => false,
			install: async () => { },
			uninstall: async () => { }
		} as any;

		const mockParser = {
			parseSkillFile: async () => ({
				metadata: {
					name: 'test-skill',
					description: 'Test skill',
					version: '1.0.0'
				},
				body: 'Test content',
				resources: [],
				fullPath: '/test/path'
			}),
			validateSkillFormat: async () => true
		} as any;

		const mockRequestService = {} as any;

		const mockProgressService = {
			withProgress: async (options: any, task: any) => {
				const progress = { report: () => { } };
				const token = { isCancellationRequested: false };
				return task(progress, token);
			}
		} as any;

		const mockEnvService = {
			userHome: URI.file('/home/user')
		} as any;

		instantiationService.stub(IFileService, mockFileService);
		instantiationService.stub(ISkillsRegistry, mockRegistry);
		instantiationService.stub(ISkillParser, mockParser);
		instantiationService.stub(IRequestService, mockRequestService);
		instantiationService.stub(IProgressService, mockProgressService);
		instantiationService.stub(INativeEnvironmentService, mockEnvService);

		installService = instantiationService.createInstance(SkillInstallService);
	});

	suite('detectSourceType', () => {
		test('should detect URL source', () => {
			assert.strictEqual(installService.detectSourceType('https://example.com/skill.zip'), 'url');
			assert.strictEqual(installService.detectSourceType('http://example.com/skill.tar.gz'), 'url');
		});

		test('should detect GitHub source', () => {
			assert.strictEqual(installService.detectSourceType('owner/repo'), 'github');
			assert.strictEqual(installService.detectSourceType('github:owner/repo'), 'github');
			assert.strictEqual(installService.detectSourceType('anthropics/skills'), 'github');
		});

		test('should detect NPM source', () => {
			assert.strictEqual(installService.detectSourceType('@ainative/skill'), 'npm');
			assert.strictEqual(installService.detectSourceType('skill-package'), 'npm');
			assert.strictEqual(installService.detectSourceType('my-skill-pkg'), 'npm');
		});

		test('should detect local path source', () => {
			assert.strictEqual(installService.detectSourceType('./skills/my-skill'), 'local');
			assert.strictEqual(installService.detectSourceType('/absolute/path/to/skill'), 'local');
			assert.strictEqual(installService.detectSourceType('../relative/path'), 'local');
		});

		test('should default to local for ambiguous paths', () => {
			assert.strictEqual(installService.detectSourceType('skill-with.dot'), 'local');
			assert.strictEqual(installService.detectSourceType('path/with/multiple/slashes'), 'local');
		});
	});

	suite('install from local path', () => {
		test('should install skill from valid local path', async () => {
			const result = await installService.install({
				source: '/test/path/to/skill'
			});

			assert.strictEqual(result.skillName, 'test-skill');
			assert.strictEqual(result.version, '1.0.0');
			assert.strictEqual(result.sourceType, 'local');
		});

		test('should reject if skill already installed without force flag', async () => {
			const mockRegistry = instantiationService.stub(ISkillsRegistry, {} as any);
			mockRegistry.isInstalled = async () => true;

			await assert.rejects(
				async () => installService.install({ source: '/test/path' }),
				/already installed/
			);
		});

		test('should reinstall if force flag is set', async () => {
			const mockRegistry = instantiationService.stub(ISkillsRegistry, {} as any);
			mockRegistry.isInstalled = async () => true;
			mockRegistry.uninstall = async () => { };

			const result = await installService.install({
				source: '/test/path',
				force: true
			});

			assert.strictEqual(result.skillName, 'test-skill');
		});

		test('should reject invalid skill format', async () => {
			const mockParser = instantiationService.stub(ISkillParser, {});
			mockParser.validateSkillFormat = async () => false;

			await assert.rejects(
				async () => installService.install({ source: '/test/path' }),
				/Invalid skill format/
			);
		});

		test('should skip validation if skipValidation flag is set', async () => {
			const mockParser = instantiationService.stub(ISkillParser, {});
			let validateCalled = false;
			mockParser.validateSkillFormat = async () => {
				validateCalled = true;
				return true;
			};

			await installService.install({
				source: '/test/path',
				skipValidation: true
			});

			assert.strictEqual(validateCalled, false);
		});
	});

	suite('install from NPM', () => {
		test('should detect NPM package format', () => {
			assert.strictEqual(installService.detectSourceType('@ainative/skill'), 'npm');
			assert.strictEqual(installService.detectSourceType('skill-name'), 'npm');
		});

		test('should reject NPM install with not implemented error', async () => {
			await assert.rejects(
				async () => installService.install({ source: '@ainative/test-skill' }),
				/not yet implemented/
			);
		});
	});

	suite('install from GitHub', () => {
		test('should detect GitHub repo format', () => {
			assert.strictEqual(installService.detectSourceType('owner/repo'), 'github');
			assert.strictEqual(installService.detectSourceType('github:owner/repo'), 'github');
		});

		test('should reject GitHub install with not implemented error', async () => {
			await assert.rejects(
				async () => installService.install({ source: 'owner/repo' }),
				/not yet implemented/
			);
		});
	});

	suite('install from URL', () => {
		test('should detect URL format', () => {
			assert.strictEqual(installService.detectSourceType('https://example.com/skill.zip'), 'url');
			assert.strictEqual(installService.detectSourceType('http://example.com/skill.tar.gz'), 'url');
		});

		test('should reject URL install with not implemented error', async () => {
			await assert.rejects(
				async () => installService.install({ source: 'https://example.com/skill.zip' }),
				/not yet implemented/
			);
		});

		test('should reject unsupported URL formats', async () => {
			await assert.rejects(
				async () => installService.install({ source: 'https://example.com/skill.rar' }),
				/Unsupported URL format/
			);
		});
	});

	suite('error handling', () => {
		test('should handle file service errors gracefully', async () => {
			const mockFileService = instantiationService.stub(IFileService, {} as any);
			mockFileService.resolve = async () => {
				throw new Error('File not found');
			};

			await assert.rejects(
				async () => installService.install({ source: '/invalid/path' }),
				/Failed to access path/
			);
		});

		test('should clean up temp directory on failure', async () => {
			const mockFileService = instantiationService.stub(IFileService, {} as any);
			let deleteCalled = false;
			mockFileService.del = async () => {
				deleteCalled = true;
			};
			mockFileService.copy = async () => {
				throw new Error('Copy failed');
			};

			try {
				await installService.install({ source: '/test/path' });
			} catch (error) {
				// Expected to fail
			}

			assert.strictEqual(deleteCalled, true);
		});

		test('should handle parser errors', async () => {
			const mockParser = instantiationService.stub(ISkillParser, {});
			mockParser.parseSkillFile = async () => {
				throw new Error('Parse error');
			};

			await assert.rejects(
				async () => installService.install({ source: '/test/path' }),
				/Parse error/
			);
		});
	});
});

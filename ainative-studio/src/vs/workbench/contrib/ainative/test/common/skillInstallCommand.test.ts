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
	// Hoisted to suite scope (not local to setup()) so individual tests can mutate the exact
	// mock objects already injected into `installService`, rather than calling
	// instantiationService.stub(...) again mid-test: that creates a brand-new, never-injected
	// object - SkillInstallService's constructor already captured a reference to *these*
	// objects when createInstance() ran in setup(), and DI only happens once at construction.
	// Mutating a freshly re-stubbed object has no effect on the already-constructed service.
	let mockRegistry: any;
	let mockParser: any;
	let mockFileService: any;

	setup(() => {
		instantiationService = new TestInstantiationService();

		// Mock services
		mockFileService = {
			resolve: async (uri: URI) => ({ isFile: true, isDirectory: true }),
			copy: async () => { },
			createFolder: async () => { },
			readFile: async () => ({ value: { toString: () => '---\nname: test-skill\ndescription: Test\n---\nTest content' } }),
			del: async () => { }
		} as any;

		mockRegistry = {
			isInstalled: async () => false,
			install: async () => { },
			uninstall: async () => { }
		} as any;

		mockParser = {
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

		const mockRequestService = {
			// installCommand.ts's downloadNpmToTemp/downloadGithubToTemp/downloadUrlToTemp all
			// genuinely call requestService.request() for a real download - these are not
			// "not yet implemented" stubs (confirmed by reading the implementation directly;
			// this test file's "not yet implemented" expectations predate that real
			// implementation and were never updated). Reject by default so NPM/GitHub/URL
			// install tests exercise a real (if simulated) network failure path instead of
			// crashing on a missing mock method.
			request: async () => { throw new Error('Mock network request failed (no real network access in this test)'); }
		} as any;

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
			// Mutate the exact mock object already injected in setup() (hoisted to suite scope)
			// rather than calling instantiationService.stub(...) again here - re-stubbing after
			// createInstance() has already run creates a disconnected object that
			// installService never sees.
			mockRegistry.isInstalled = async () => true;

			await assert.rejects(
				async () => installService.install({ source: '/test/path' }),
				/already installed/
			);
		});

		test('should reinstall if force flag is set', async () => {
			mockRegistry.isInstalled = async () => true;
			mockRegistry.uninstall = async () => { };

			const result = await installService.install({
				source: '/test/path',
				force: true
			});

			assert.strictEqual(result.skillName, 'test-skill');
		});

		test('should reject invalid skill format', async () => {
			mockParser.validateSkillFormat = async () => false;

			await assert.rejects(
				async () => installService.install({ source: '/test/path' }),
				/Invalid skill format/
			);
		});

		test('should skip validation if skipValidation flag is set', async () => {
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

		test('should reject NPM install on network failure', async () => {
			// downloadNpmToTemp genuinely implements a real NPM registry fetch (confirmed by
			// reading installCommand.ts directly) - this was never a "not yet implemented"
			// stub, that was this test's own stale assumption. The mock requestService rejects
			// by default, so this exercises the real wrap-and-rethrow error path instead.
			await assert.rejects(
				async () => installService.install({ source: '@ainative/test-skill' }),
				/Failed to download NPM package/
			);
		});
	});

	suite('install from GitHub', () => {
		test('should detect GitHub repo format', () => {
			assert.strictEqual(installService.detectSourceType('owner/repo'), 'github');
			assert.strictEqual(installService.detectSourceType('github:owner/repo'), 'github');
		});

		test('should reject GitHub install on network failure', async () => {
			// downloadGithubToTemp genuinely implements a real GitHub archive fetch, trying
			// main then master before giving up - never a "not yet implemented" stub.
			await assert.rejects(
				async () => installService.install({ source: 'owner/repo' }),
				/Failed to download GitHub repository/
			);
		});
	});

	suite('install from URL', () => {
		test('should detect URL format', () => {
			assert.strictEqual(installService.detectSourceType('https://example.com/skill.zip'), 'url');
			assert.strictEqual(installService.detectSourceType('http://example.com/skill.tar.gz'), 'url');
		});

		test('should reject URL install on network failure', async () => {
			// downloadUrlToTemp -> downloadAndExtractZip genuinely calls requestService.request()
			// directly (no try/catch wrapper around it, unlike the NPM/GitHub download paths),
			// so the mock's rejection message propagates up unwrapped - never a "not yet
			// implemented" stub.
			await assert.rejects(
				async () => installService.install({ source: 'https://example.com/skill.zip' }),
				/Mock network request failed/
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
			mockFileService.resolve = async () => {
				throw new Error('File not found');
			};

			await assert.rejects(
				async () => installService.install({ source: '/invalid/path' }),
				/Failed to access path/
			);
		});

		test('should clean up temp directory on failure', async () => {
			// install() calls fileService.copy() twice: once in copyLocalToTemp() (source ->
			// temp dir, BEFORE the try/finally that does cleanup even starts) and once later
			// copying temp -> the final install location (INSIDE that try/finally). Failing
			// every copy() call unconditionally fails the first one too, so the try/finally
			// block - and its cleanup - is never even entered, which is not what this test
			// means to exercise ("cleanup still runs when the real installation step fails").
			// Let the first (source -> temp) copy succeed, and only fail the second.
			let deleteCalled = false;
			let copyCallCount = 0;
			mockFileService.del = async () => {
				deleteCalled = true;
			};
			mockFileService.copy = async () => {
				copyCallCount++;
				if (copyCallCount > 1) {
					throw new Error('Copy failed');
				}
			};

			try {
				await installService.install({ source: '/test/path' });
			} catch (error) {
				// Expected to fail
			}

			assert.strictEqual(deleteCalled, true);
		});

		test('should handle parser errors', async () => {
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

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
suite('SkillInstallCommand', () => {
    let instantiationService;
    let installService;
    setup(() => {
        instantiationService = new TestInstantiationService();
        // Mock services
        const mockFileService = {
            resolve: async (uri) => ({ isFile: true, isDirectory: true }),
            copy: async () => { },
            createFolder: async () => { },
            readFile: async () => ({ value: { toString: () => '---\nname: test-skill\ndescription: Test\n---\nTest content' } }),
            del: async () => { }
        };
        const mockRegistry = {
            isInstalled: async () => false,
            install: async () => { },
            uninstall: async () => { }
        };
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
        };
        const mockRequestService = {};
        const mockProgressService = {
            withProgress: async (options, task) => {
                const progress = { report: () => { } };
                const token = { isCancellationRequested: false };
                return task(progress, token);
            }
        };
        const mockEnvService = {
            userHome: URI.file('/home/user')
        };
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
            const mockRegistry = instantiationService.stub(ISkillsRegistry, {});
            mockRegistry.isInstalled = async () => true;
            await assert.rejects(async () => installService.install({ source: '/test/path' }), /already installed/);
        });
        test('should reinstall if force flag is set', async () => {
            const mockRegistry = instantiationService.stub(ISkillsRegistry, {});
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
            await assert.rejects(async () => installService.install({ source: '/test/path' }), /Invalid skill format/);
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
            await assert.rejects(async () => installService.install({ source: '@ainative/test-skill' }), /not yet implemented/);
        });
    });
    suite('install from GitHub', () => {
        test('should detect GitHub repo format', () => {
            assert.strictEqual(installService.detectSourceType('owner/repo'), 'github');
            assert.strictEqual(installService.detectSourceType('github:owner/repo'), 'github');
        });
        test('should reject GitHub install with not implemented error', async () => {
            await assert.rejects(async () => installService.install({ source: 'owner/repo' }), /not yet implemented/);
        });
    });
    suite('install from URL', () => {
        test('should detect URL format', () => {
            assert.strictEqual(installService.detectSourceType('https://example.com/skill.zip'), 'url');
            assert.strictEqual(installService.detectSourceType('http://example.com/skill.tar.gz'), 'url');
        });
        test('should reject URL install with not implemented error', async () => {
            await assert.rejects(async () => installService.install({ source: 'https://example.com/skill.zip' }), /not yet implemented/);
        });
        test('should reject unsupported URL formats', async () => {
            await assert.rejects(async () => installService.install({ source: 'https://example.com/skill.rar' }), /Unsupported URL format/);
        });
    });
    suite('error handling', () => {
        test('should handle file service errors gracefully', async () => {
            const mockFileService = instantiationService.stub(IFileService, {});
            mockFileService.resolve = async () => {
                throw new Error('File not found');
            };
            await assert.rejects(async () => installService.install({ source: '/invalid/path' }), /Failed to access path/);
        });
        test('should clean up temp directory on failure', async () => {
            const mockFileService = instantiationService.stub(IFileService, {});
            let deleteCalled = false;
            mockFileService.del = async () => {
                deleteCalled = true;
            };
            mockFileService.copy = async () => {
                throw new Error('Copy failed');
            };
            try {
                await installService.install({ source: '/test/path' });
            }
            catch (error) {
                // Expected to fail
            }
            assert.strictEqual(deleteCalled, true);
        });
        test('should handle parser errors', async () => {
            const mockParser = instantiationService.stub(ISkillParser, {});
            mockParser.parseSkillFile = async () => {
                throw new Error('Parse error');
            };
            await assert.rejects(async () => installService.install({ source: '/test/path' }), /Parse error/);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxJbnN0YWxsQ29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9za2lsbEluc3RhbGxDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUdoRixLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxjQUFvQyxDQUFDO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFFdEQsZ0JBQWdCO1FBQ2hCLE1BQU0sZUFBZSxHQUFHO1lBQ3ZCLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBUSxFQUFF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
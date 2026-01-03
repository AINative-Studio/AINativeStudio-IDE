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
import { SkillConfigService } from '../../common/skills/skillConfigService.js';
import { Workspace } from '../../../../../platform/workspace/common/workspace.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
suite('SkillConfigService Tests', () => {
    let service;
    let fileService;
    let disposables;
    let testWorkspaceDir;
    let mockWorkspaceService;
    setup(async () => {
        disposables = new DisposableStore();
        // Set up file service
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const diskProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskProvider);
        // Create test workspace directory
        testWorkspaceDir = URI.file(path.join(tmpdir(), 'ainative-config-test-' + Date.now()));
        await fileService.createFolder(testWorkspaceDir);
        // Mock workspace service
        const workspace = new Workspace('test-workspace', [{ uri: testWorkspaceDir, name: 'test', index: 0 }]);
        mockWorkspaceService = {
            getWorkspace: () => workspace,
            getWorkspaceFolder: (uri) => workspace.folders[0]
        };
        service = new SkillConfigService(fileService, mockWorkspaceService);
    });
    teardown(async () => {
        // Clean up test directory
        try {
            await fileService.del(testWorkspaceDir, { recursive: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
        disposables.dispose();
    });
    suite('Config Management', () => {
        test('should read skills config from .mcp.json', async () => {
            const mcpConfig = {
                skills: {
                    enabled: ['git-workflow', 'mandatory-tdd'],
                    autoLoad: true
                }
            };
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            await fileService.writeFile(mcpConfigPath, VSBuffer.fromString(JSON.stringify(mcpConfig, null, 2)));
            const config = await service.readSkillsConfig();
            assert.ok(config);
            assert.ok(Array.isArray(config.enabled));
            assert.strictEqual(config.enabled.length, 2);
            assert.ok(config.enabled.includes('git-workflow'));
            assert.ok(config.enabled.includes('mandatory-tdd'));
            assert.strictEqual(config.autoLoad, true);
        });
        test('should return null when .mcp.json does not exist', async () => {
            const config = await service.readSkillsConfig();
            assert.strictEqual(config, null);
        });
        test('should return null when .mcp.json has no skills section', async () => {
            const mcpConfig = {
                mcpServers: {
                    memory: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-memory']
                    }
                }
            };
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            await fileService.writeFile(mcpConfigPath, VSBuffer.fromString(JSON.stringify(mcpConfig, null, 2)));
            const config = await service.readSkillsConfig();
            assert.strictEqual(config, null);
        });
        test('should write skills config to .mcp.json', async () => {
            const skillsConfig = {
                enabled: ['git-workflow', 'mandatory-tdd'],
                autoLoad: true,
                metadata: {
                    projectType: 'backend',
                    framework: 'fastapi',
                    languages: ['python']
                }
            };
            await service.writeSkillsConfig(skillsConfig, false);
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            const content = await fileService.readFile(mcpConfigPath);
            const mcpConfig = JSON.parse(content.value.toString());
            assert.ok(mcpConfig.skills);
            assert.strictEqual(mcpConfig.skills.enabled.length, 2);
            assert.ok(mcpConfig.skills.metadata);
            assert.strictEqual(mcpConfig.skills.metadata.projectType, 'backend');
        });
        test('should merge with existing config when merge=true', async () => {
            const existingConfig = {
                mcpServers: {
                    memory: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-memory']
                    }
                },
                skills: {
                    enabled: ['git-workflow']
                }
            };
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            await fileService.writeFile(mcpConfigPath, VSBuffer.fromString(JSON.stringify(existingConfig, null, 2)));
            const newSkillsConfig = {
                enabled: ['git-workflow', 'mandatory-tdd'],
                autoLoad: true
            };
            await service.writeSkillsConfig(newSkillsConfig, true);
            const content = await fileService.readFile(mcpConfigPath);
            const mcpConfig = JSON.parse(content.value.toString());
            assert.ok(mcpConfig.mcpServers, 'Should preserve mcpServers');
            assert.ok(mcpConfig.skills);
            assert.strictEqual(mcpConfig.skills.enabled.length, 2);
            assert.strictEqual(mcpConfig.skills.autoLoad, true);
        });
        test('should create .mcp.json if it does not exist', async () => {
            const skillsConfig = {
                enabled: ['git-workflow']
            };
            await service.writeSkillsConfig(skillsConfig, false);
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            const stat = await fileService.resolve(mcpConfigPath);
            assert.ok(stat);
        });
    });
    suite('Project Detection', () => {
        test('should detect Node.js project from package.json', async () => {
            const packageJson = {
                name: 'test-project',
                dependencies: {
                    react: '^18.0.0'
                }
            };
            const packageJsonPath = URI.joinPath(testWorkspaceDir, 'package.json');
            await fileService.writeFile(packageJsonPath, VSBuffer.fromString(JSON.stringify(packageJson, null, 2)));
            const result = await service.detectProjectType();
            assert.ok(result.metadata.languages.includes('javascript'));
            assert.ok(result.metadata.languages.includes('typescript'));
            assert.strictEqual(result.metadata.framework, 'react');
            assert.strictEqual(result.metadata.projectType, 'frontend');
            assert.ok(result.confidence > 0.5);
            assert.ok(result.detectedFiles.includes('package.json'));
        });
        test('should detect React project', async () => {
            const packageJson = {
                dependencies: {
                    react: '^18.0.0',
                    'react-dom': '^18.0.0'
                }
            };
            const packageJsonPath = URI.joinPath(testWorkspaceDir, 'package.json');
            await fileService.writeFile(packageJsonPath, VSBuffer.fromString(JSON.stringify(packageJson, null, 2)));
            const result = await service.detectProjectType();
            assert.strictEqual(result.metadata.framework, 'react');
            assert.strictEqual(result.metadata.projectType, 'frontend');
            assert.ok(result.metadata.technologies?.includes('react'));
        });
        test('should detect Python project from requirements.txt', async () => {
            const requirements = 'fastapi==0.104.0\nuvicorn==0.24.0\npydantic==2.5.0';
            const requirementsPath = URI.joinPath(testWorkspaceDir, 'requirements.txt');
            await fileService.writeFile(requirementsPath, VSBuffer.fromString(requirements));
            const result = await service.detectProjectType();
            assert.ok(result.metadata.languages.includes('python'));
            assert.strictEqual(result.metadata.framework, 'fastapi');
            assert.strictEqual(result.metadata.projectType, 'backend');
            assert.ok(result.confidence > 0.5);
        });
        test('should detect FastAPI project', async () => {
            const requirements = 'fastapi==0.104.0\nuvicorn==0.24.0';
            const requirementsPath = URI.joinPath(testWorkspaceDir, 'requirements.txt');
            await fileService.writeFile(requirementsPath, VSBuffer.fromString(requirements));
            const result = await service.detectProjectType();
            assert.strictEqual(result.metadata.framework, 'fastapi');
            assert.ok(result.metadata.technologies?.includes('fastapi'));
        });
        test('should detect Rust project from Cargo.toml', async () => {
            const cargoToml = '[package]\nname = "test-project"\nversion = "0.1.0"';
            const cargoPath = URI.joinPath(testWorkspaceDir, 'Cargo.toml');
            await fileService.writeFile(cargoPath, VSBuffer.fromString(cargoToml));
            const result = await service.detectProjectType();
            assert.ok(result.metadata.languages.includes('rust'));
            assert.strictEqual(result.metadata.projectType, 'backend');
        });
        test('should detect Java project from pom.xml', async () => {
            const pomXml = '<?xml version="1.0"?><project></project>';
            const pomPath = URI.joinPath(testWorkspaceDir, 'pom.xml');
            await fileService.writeFile(pomPath, VSBuffer.fromString(pomXml));
            const result = await service.detectProjectType();
            assert.ok(result.metadata.languages.includes('java'));
            assert.strictEqual(result.metadata.projectType, 'backend');
        });
        test('should calculate confidence score based on detected files', async () => {
            const packageJson = {
                dependencies: {
                    react: '^18.0.0',
                    typescript: '^5.0.0'
                }
            };
            const packageJsonPath = URI.joinPath(testWorkspaceDir, 'package.json');
            await fileService.writeFile(packageJsonPath, VSBuffer.fromString(JSON.stringify(packageJson, null, 2)));
            const result = await service.detectProjectType();
            // Should have confidence from package.json (0.3) + react detection (0.4) + typescript (0.1) = 0.8
            assert.ok(result.confidence >= 0.7);
            assert.ok(result.confidence <= 1.0);
        });
    });
    suite('Skill Recommendations', () => {
        test('should recommend React skills for React projects', async () => {
            const metadata = {
                projectType: 'frontend',
                framework: 'react',
                languages: ['javascript', 'typescript'],
                technologies: ['react']
            };
            const recommendations = await service.recommendSkills(metadata);
            assert.ok(Array.isArray(recommendations));
            assert.ok(recommendations.length > 0);
            const skillIds = recommendations.map(r => r.skillId);
            assert.ok(skillIds.includes('@ainative/react-expert'));
            assert.ok(skillIds.includes('git-workflow'));
            assert.ok(skillIds.includes('mandatory-tdd'));
        });
        test('should recommend Python skills for FastAPI backend', async () => {
            const metadata = {
                projectType: 'backend',
                framework: 'fastapi',
                languages: ['python'],
                technologies: ['fastapi']
            };
            const recommendations = await service.recommendSkills(metadata);
            const skillIds = recommendations.map(r => r.skillId);
            assert.ok(skillIds.includes('@ainative/python-expert'));
            assert.ok(skillIds.includes('@ainative/fastapi-expert'));
            assert.ok(skillIds.includes('git-workflow'));
        });
        test('should always include git-workflow in recommendations', async () => {
            const metadata = {
                projectType: 'unknown',
                languages: []
            };
            const recommendations = await service.recommendSkills(metadata);
            const skillIds = recommendations.map(r => r.skillId);
            assert.ok(skillIds.includes('git-workflow'));
        });
        test('should sort recommendations by priority', async () => {
            const metadata = {
                projectType: 'backend',
                framework: 'fastapi',
                languages: ['python']
            };
            const recommendations = await service.recommendSkills(metadata);
            // Verify recommendations are sorted by priority (ascending)
            for (let i = 1; i < recommendations.length; i++) {
                assert.ok(recommendations[i].priority >= recommendations[i - 1].priority);
            }
        });
    });
    suite('Configuration Validation', () => {
        test('should validate valid configuration', () => {
            const config = {
                enabled: ['git-workflow', 'mandatory-tdd'],
                autoLoad: true,
                metadata: {
                    projectType: 'backend',
                    framework: 'fastapi',
                    languages: ['python']
                }
            };
            const errors = service.validateConfig(config);
            assert.strictEqual(errors.length, 0);
        });
        test('should reject empty enabled array', () => {
            const config = {
                enabled: []
            };
            const errors = service.validateConfig(config);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('empty')));
        });
        test('should reject missing enabled field', () => {
            const config = {};
            const errors = service.validateConfig(config);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('array')));
        });
        test('should reject invalid projectType', () => {
            const config = {
                enabled: ['git-workflow'],
                metadata: {
                    projectType: 'invalid',
                    languages: []
                }
            };
            const errors = service.validateConfig(config);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('Invalid projectType')));
        });
        test('should validate autoLoad is boolean', () => {
            const config = {
                enabled: ['git-workflow'],
                autoLoad: 'yes'
            };
            const errors = service.validateConfig(config);
            assert.ok(errors.length > 0);
            assert.ok(errors.some(e => e.includes('boolean')));
        });
        test('should validate skill identifiers are strings', () => {
            const config = {
                enabled: ['git-workflow', 123, '']
            };
            const errors = service.validateConfig(config);
            assert.ok(errors.length > 0);
        });
    });
    suite('Helper Methods', () => {
        test('should get enabled skills from config', async () => {
            const mcpConfig = {
                skills: {
                    enabled: ['git-workflow', 'mandatory-tdd']
                }
            };
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            await fileService.writeFile(mcpConfigPath, VSBuffer.fromString(JSON.stringify(mcpConfig, null, 2)));
            const enabledSkills = await service.getEnabledSkills();
            assert.ok(Array.isArray(enabledSkills));
            assert.strictEqual(enabledSkills.length, 2);
            assert.ok(enabledSkills.includes('git-workflow'));
        });
        test('should return empty array when no config exists', async () => {
            const enabledSkills = await service.getEnabledSkills();
            assert.ok(Array.isArray(enabledSkills));
            assert.strictEqual(enabledSkills.length, 0);
        });
        test('should check if .mcp.json exists', async () => {
            assert.strictEqual(await service.hasMCPConfig(), false);
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            await fileService.writeFile(mcpConfigPath, VSBuffer.fromString('{}'));
            assert.strictEqual(await service.hasMCPConfig(), true);
        });
        test('should initialize .mcp.json with default config', async () => {
            await service.initializeMCPConfig(false);
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            const content = await fileService.readFile(mcpConfigPath);
            const mcpConfig = JSON.parse(content.value.toString());
            assert.ok(mcpConfig.mcpServers);
            assert.ok(mcpConfig.mcpServers.memory);
        });
        test('should initialize .mcp.json with skills recommendations', async () => {
            // Create a package.json to trigger detection
            const packageJson = {
                dependencies: {
                    react: '^18.0.0'
                }
            };
            const packageJsonPath = URI.joinPath(testWorkspaceDir, 'package.json');
            await fileService.writeFile(packageJsonPath, VSBuffer.fromString(JSON.stringify(packageJson, null, 2)));
            await service.initializeMCPConfig(true);
            const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
            const content = await fileService.readFile(mcpConfigPath);
            const mcpConfig = JSON.parse(content.value.toString());
            assert.ok(mcpConfig.skills);
            assert.ok(mcpConfig.skills.enabled);
            assert.ok(mcpConfig.skills.metadata);
            assert.strictEqual(mcpConfig.skills.metadata.framework, 'react');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDb25maWdTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3NraWxsQ29uZmlnU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUcvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFDdEMsSUFBSSxPQUEyQixDQUFDO0lBQ2hDLElBQUksV0FBd0IsQ0FBQztJQUM3QixJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxnQkFBcUIsQ0FBQztJQUMxQixJQUFJLG9CQUE4QyxD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
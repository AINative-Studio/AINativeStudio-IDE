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
import { SkillsConfig, ProjectMetadata } from '../../common/skills/skillConfigTypes.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Workspace } from '../../../../../platform/workspace/common/workspace.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

suite('SkillConfigService Tests', () => {
	let service: SkillConfigService;
	let fileService: FileService;
	let disposables: DisposableStore;
	let testWorkspaceDir: URI;
	let mockWorkspaceService: IWorkspaceContextService;

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
		const { WorkspaceFolder } = await import('../../../../../platform/workspace/common/workspace.js');
		const workspace = new Workspace(
			'test-workspace',
			[new WorkspaceFolder({ uri: testWorkspaceDir, name: 'test', index: 0 }, undefined)],
			false,
			null,
			() => false
		);

		mockWorkspaceService = {
			getWorkspace: () => workspace,
			getWorkspaceFolder: (uri: URI) => workspace.folders[0]
		} as any;

		service = new SkillConfigService(fileService, mockWorkspaceService);
	});

	teardown(async () => {
		// Clean up test directory
		try {
			await fileService.del(testWorkspaceDir, { recursive: true });
		} catch (error) {
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
			const skillsConfig: SkillsConfig = {
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

			const newSkillsConfig: SkillsConfig = {
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
			const skillsConfig: SkillsConfig = {
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

			assert.ok(result.metadata.languages?.includes('javascript'));
			assert.ok(result.metadata.languages?.includes('typescript'));
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

			assert.ok(result.metadata.languages?.includes('python'));
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

			assert.ok(result.metadata.languages?.includes('rust'));
			assert.strictEqual(result.metadata.projectType, 'backend');
		});

		test('should detect Java project from pom.xml', async () => {
			const pomXml = '<?xml version="1.0"?><project></project>';

			const pomPath = URI.joinPath(testWorkspaceDir, 'pom.xml');
			await fileService.writeFile(pomPath, VSBuffer.fromString(pomXml));

			const result = await service.detectProjectType();

			assert.ok(result.metadata.languages?.includes('java'));
			assert.strictEqual(result.metadata.projectType, 'backend');
		});

		test('should detect Go project from go.mod', async () => {
			const goMod = 'module example.com/myapp\n\ngo 1.21';

			const goModPath = URI.joinPath(testWorkspaceDir, 'go.mod');
			await fileService.writeFile(goModPath, VSBuffer.fromString(goMod));

			const result = await service.detectProjectType();

			assert.ok(result.metadata.languages?.includes('go'));
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
			const metadata: ProjectMetadata = {
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
			const metadata: ProjectMetadata = {
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
			const metadata: ProjectMetadata = {
				projectType: 'unknown',
				languages: []
			};

			const recommendations = await service.recommendSkills(metadata);

			const skillIds = recommendations.map(r => r.skillId);
			assert.ok(skillIds.includes('git-workflow'));
		});

		test('should sort recommendations by priority', async () => {
			const metadata: ProjectMetadata = {
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
			const config: SkillsConfig = {
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
			const config: SkillsConfig = {
				enabled: []
			};

			const errors = service.validateConfig(config);
			assert.ok(errors.length > 0);
			assert.ok(errors.some(e => e.includes('empty')));
		});

		test('should reject missing enabled field', () => {
			const config = {} as SkillsConfig;

			const errors = service.validateConfig(config);
			assert.ok(errors.length > 0);
			assert.ok(errors.some(e => e.includes('array')));
		});

		test('should reject invalid projectType', () => {
			const config: SkillsConfig = {
				enabled: ['git-workflow'],
				metadata: {
					projectType: 'invalid' as any,
					languages: []
				}
			};

			const errors = service.validateConfig(config);
			assert.ok(errors.length > 0);
			assert.ok(errors.some(e => e.includes('Invalid projectType')));
		});

		test('should validate autoLoad is boolean', () => {
			const config: SkillsConfig = {
				enabled: ['git-workflow'],
				autoLoad: 'yes' as any
			};

			const errors = service.validateConfig(config);
			assert.ok(errors.length > 0);
			assert.ok(errors.some(e => e.includes('boolean')));
		});

		test('should validate skill identifiers are strings', () => {
			const config: SkillsConfig = {
				enabled: ['git-workflow', 123 as any, '']
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

	suite('Config Merging', () => {
		test('should merge global and project-specific configs', async () => {
			// Create a base config
			const baseConfig: SkillsConfig = {
				enabled: ['git-workflow']
			};

			await service.writeSkillsConfig(baseConfig, false);

			// Now merge with additional skills
			const additionalConfig: SkillsConfig = {
				enabled: ['git-workflow', 'mandatory-tdd'],
				autoLoad: true
			};

			await service.writeSkillsConfig(additionalConfig, true);

			const finalConfig = await service.readSkillsConfig();
			assert.ok(finalConfig);
			assert.strictEqual(finalConfig.enabled.length, 2);
			assert.strictEqual(finalConfig.autoLoad, true);
		});

		test('should preserve existing mcpServers when merging', async () => {
			const existingConfig = {
				mcpServers: {
					memory: {
						command: 'npx',
						args: ['-y', '@modelcontextprotocol/server-memory']
					}
				}
			};

			const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
			await fileService.writeFile(mcpConfigPath, VSBuffer.fromString(JSON.stringify(existingConfig, null, 2)));

			const skillsConfig: SkillsConfig = {
				enabled: ['git-workflow']
			};

			await service.writeSkillsConfig(skillsConfig, true);

			const content = await fileService.readFile(mcpConfigPath);
			const mcpConfig = JSON.parse(content.value.toString());

			assert.ok(mcpConfig.mcpServers, 'Should preserve mcpServers');
			assert.ok(mcpConfig.mcpServers.memory, 'Should preserve memory server');
			assert.ok(mcpConfig.skills, 'Should add skills config');
		});
	});

	suite('Error Scenarios', () => {
		test('should handle malformed .mcp.json gracefully', async () => {
			const mcpConfigPath = URI.joinPath(testWorkspaceDir, '.mcp.json');
			await fileService.writeFile(mcpConfigPath, VSBuffer.fromString('{ invalid json }'));

			const config = await service.readSkillsConfig();
			assert.strictEqual(config, null, 'Should return null for malformed JSON');
		});

		test('should handle missing workspace gracefully', async () => {
			// Create a service without workspace
			const noWorkspaceService = {
				getWorkspace: () => ({ folders: [] }),
				getWorkspaceFolder: () => undefined
			} as any;

			const serviceWithoutWorkspace = new SkillConfigService(fileService, noWorkspaceService);

			const config = await serviceWithoutWorkspace.readSkillsConfig();
			assert.strictEqual(config, null, 'Should return null when no workspace');
		});
	});
});

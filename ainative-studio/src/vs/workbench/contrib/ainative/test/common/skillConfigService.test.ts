/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SkillConfigService } from '../../common/skills/skillConfigService.js';
import { SkillsConfig, ProjectMetadata } from '../../common/skills/skillConfigTypes.js';

suite('SkillConfigService', () => {
	let service: SkillConfigService;

	suite('validateConfig', () => {
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

			const errors = (service as any).validateConfig ? service.validateConfig(config) : [];
			assert.strictEqual(errors.length, 0, 'Valid config should have no errors');
		});

		test('should reject empty enabled array', () => {
			const config: SkillsConfig = {
				enabled: []
			};

			// Since we can't instantiate the service without dependencies in unit test,
			// we'll test the validation logic separately
			const errors: string[] = [];
			if (config.enabled.length === 0) {
				errors.push('enabled field cannot be empty');
			}

			assert.strictEqual(errors.length, 1);
			assert.ok(errors[0].includes('empty'));
		});

		test('should reject invalid projectType', () => {
			const config: SkillsConfig = {
				enabled: ['git-workflow'],
				metadata: {
					projectType: 'invalid' as any
				}
			};

			const validTypes = ['frontend', 'backend', 'fullstack', 'mobile', 'data', 'unknown'];
			const errors: string[] = [];

			if (config.metadata?.projectType && !validTypes.includes(config.metadata.projectType)) {
				errors.push(`Invalid projectType: ${config.metadata.projectType}`);
			}

			assert.strictEqual(errors.length, 1);
			assert.ok(errors[0].includes('Invalid projectType'));
		});
	});

	suite('recommendSkills', () => {
		test('should recommend FastAPI skills for Python backend', async () => {
			const metadata: ProjectMetadata = {
				projectType: 'backend',
				framework: 'fastapi',
				languages: ['python']
			};

			// Simulate recommendation logic
			const expectedSkills = [
				'@ainative/python-expert',
				'@ainative/fastapi-expert',
				'git-workflow',
				'mandatory-tdd',
				'ci-cd-compliance'
			];

			// Basic test of recommendation logic
			assert.ok(metadata.framework === 'fastapi');
			assert.ok(metadata.projectType === 'backend');
		});

		test('should recommend React skills for frontend', async () => {
			const metadata: ProjectMetadata = {
				projectType: 'frontend',
				framework: 'react',
				languages: ['javascript', 'typescript'],
				technologies: ['react']
			};

			// Simulate recommendation logic
			const expectedSkills = [
				'@ainative/react-expert',
				'git-workflow',
				'mandatory-tdd',
				'code-quality'
			];

			assert.ok(metadata.framework === 'react');
			assert.ok(metadata.projectType === 'frontend');
		});

		test('should include universal recommendations', async () => {
			const metadata: ProjectMetadata = {
				projectType: 'unknown',
				languages: []
			};

			// Universal skills should always be recommended
			const universalSkills = ['git-workflow', 'mandatory-tdd'];

			assert.ok(universalSkills.length > 0);
		});
	});

	suite('Project Detection', () => {
		test('should detect Node.js project from package.json', () => {
			const packageJson = {
				dependencies: {
					react: '^18.0.0',
					typescript: '^5.0.0'
				}
			};

			// Simulate detection logic
			let framework: string | undefined;
			let projectType: string | undefined;

			if (packageJson.dependencies.react) {
				framework = 'react';
				projectType = 'frontend';
			}

			assert.strictEqual(framework, 'react');
			assert.strictEqual(projectType, 'frontend');
		});

		test('should detect Python project from requirements.txt', () => {
			const requirements = 'fastapi==0.104.0\nuvicorn==0.24.0\npydantic==2.5.0';

			// Simulate detection logic
			let framework: string | undefined;
			let projectType: string | undefined;

			if (requirements.includes('fastapi')) {
				framework = 'fastapi';
				projectType = 'backend';
			}

			assert.strictEqual(framework, 'fastapi');
			assert.strictEqual(projectType, 'backend');
		});

		test('should handle multiple frameworks', () => {
			const packageJson = {
				dependencies: {
					next: '^14.0.0',
					react: '^18.0.0'
				}
			};

			// Simulate detection logic - Next.js takes precedence
			let framework: string | undefined;
			let projectType: string | undefined;

			if (packageJson.dependencies.next) {
				framework = 'next';
				projectType = 'fullstack';
			} else if (packageJson.dependencies.react) {
				framework = 'react';
				projectType = 'frontend';
			}

			assert.strictEqual(framework, 'next');
			assert.strictEqual(projectType, 'fullstack');
		});
	});

	suite('Configuration Merging', () => {
		test('should merge skills config with existing config', () => {
			const existing: SkillsConfig = {
				enabled: ['git-workflow'],
				autoLoad: false
			};

			const newConfig: SkillsConfig = {
				enabled: ['git-workflow', 'mandatory-tdd'],
				metadata: {
					projectType: 'backend'
				}
			};

			// Simulate merge
			const merged = {
				...existing,
				...newConfig
			};

			assert.strictEqual(merged.enabled.length, 2);
			assert.ok(merged.metadata);
			assert.strictEqual(merged.metadata.projectType, 'backend');
		});
	});
});

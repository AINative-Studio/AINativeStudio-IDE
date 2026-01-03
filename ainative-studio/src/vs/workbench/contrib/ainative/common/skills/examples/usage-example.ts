/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ISkillConfigService } from '../skillConfigServiceTypes.js';
import { SkillsConfig } from '../skillConfigTypes.js';

/**
 * Example demonstrating how to use the SkillConfigService
 */
export class SkillConfigUsageExample {

	constructor(
		@ISkillConfigService private readonly skillConfigService: ISkillConfigService
	) { }

	/**
	 * Example 1: Initialize skills configuration for a new project
	 */
	async initializeNewProject(): Promise<void> {
		console.log('=== Initializing New Project ===');

		// Check if .mcp.json already exists
		const hasConfig = await this.skillConfigService.hasMCPConfig();
		console.log('Has existing config:', hasConfig);

		if (!hasConfig) {
			// Initialize with auto-detected skills
			await this.skillConfigService.initializeMCPConfig(true);
			console.log('Created .mcp.json with auto-detected skills');
		}

		// Get enabled skills
		const enabled = await this.skillConfigService.getEnabledSkills();
		console.log('Enabled skills:', enabled);
	}

	/**
	 * Example 2: Detect project type and get recommendations
	 */
	async detectAndRecommend(): Promise<void> {
		console.log('\n=== Project Detection ===');

		// Detect project type
		const detection = await this.skillConfigService.detectProjectType();

		console.log('Project Type:', detection.metadata.projectType);
		console.log('Framework:', detection.metadata.framework);
		console.log('Languages:', detection.metadata.languages);
		console.log('Technologies:', detection.metadata.technologies);
		console.log('Confidence:', (detection.confidence * 100).toFixed(0) + '%');
		console.log('Detected Files:', detection.detectedFiles);

		// Get skill recommendations
		const recommendations = await this.skillConfigService.recommendSkills(detection.metadata);

		console.log('\n=== Skill Recommendations ===');
		recommendations.forEach((rec, index) => {
			console.log(`${index + 1}. ${rec.skillId}`);
			console.log(`   Reason: ${rec.reason}`);
			console.log(`   Priority: ${rec.priority}`);
		});
	}

	/**
	 * Example 3: Read and update skills configuration
	 */
	async updateConfiguration(): Promise<void> {
		console.log('\n=== Updating Configuration ===');

		// Read current config
		const currentConfig = await this.skillConfigService.readSkillsConfig();
		console.log('Current enabled skills:', currentConfig?.enabled);

		// Add a new skill
		const updatedConfig: SkillsConfig = {
			enabled: [
				...(currentConfig?.enabled || []),
				'code-quality' // Add new skill
			],
			autoLoad: true
		};

		// Validate before writing
		const errors = this.skillConfigService.validateConfig(updatedConfig);
		if (errors.length > 0) {
			console.error('Validation errors:', errors);
			return;
		}

		// Write merged config
		await this.skillConfigService.writeSkillsConfig(updatedConfig, true);
		console.log('Updated configuration successfully');

		// Verify update
		const newConfig = await this.skillConfigService.readSkillsConfig();
		console.log('New enabled skills:', newConfig?.enabled);
	}

	/**
	 * Example 4: Handle FastAPI Python backend project
	 */
	async handleFastAPIProject(): Promise<void> {
		console.log('\n=== FastAPI Project Configuration ===');

		const config: SkillsConfig = {
			enabled: [
				'@ainative/python-expert',
				'@ainative/fastapi-expert',
				'git-workflow',
				'mandatory-tdd',
				'ci-cd-compliance',
				'database-schema-sync'
			],
			projectSpecific: [
				'./local-skills/backend-patterns',
				'./local-skills/api-design'
			],
			autoLoad: true,
			metadata: {
				projectType: 'backend',
				framework: 'fastapi',
				languages: ['python'],
				technologies: ['fastapi', 'postgresql', 'redis']
			}
		};

		await this.skillConfigService.writeSkillsConfig(config, false);
		console.log('FastAPI project configuration saved');
	}

	/**
	 * Example 5: Handle React frontend project
	 */
	async handleReactProject(): Promise<void> {
		console.log('\n=== React Project Configuration ===');

		const config: SkillsConfig = {
			enabled: [
				'@ainative/react-expert',
				'git-workflow',
				'mandatory-tdd',
				'code-quality'
			],
			autoLoad: true,
			metadata: {
				projectType: 'frontend',
				framework: 'react',
				languages: ['javascript', 'typescript'],
				technologies: ['react', 'typescript']
			}
		};

		await this.skillConfigService.writeSkillsConfig(config, false);
		console.log('React project configuration saved');
	}

	/**
	 * Example 6: Validate configuration before saving
	 */
	async validateBeforeSaving(): Promise<void> {
		console.log('\n=== Configuration Validation ===');

		// Valid configuration
		const validConfig: SkillsConfig = {
			enabled: ['git-workflow', 'mandatory-tdd'],
			autoLoad: true
		};

		const validErrors = this.skillConfigService.validateConfig(validConfig);
		console.log('Valid config errors:', validErrors.length === 0 ? 'None' : validErrors);

		// Invalid configuration - empty enabled array
		const invalidConfig1: SkillsConfig = {
			enabled: []
		};

		const errors1 = this.skillConfigService.validateConfig(invalidConfig1);
		console.log('Invalid config 1 errors:', errors1);

		// Invalid configuration - wrong project type
		const invalidConfig2: SkillsConfig = {
			enabled: ['git-workflow'],
			metadata: {
				projectType: 'invalid-type' as any
			}
		};

		const errors2 = this.skillConfigService.validateConfig(invalidConfig2);
		console.log('Invalid config 2 errors:', errors2);
	}

	/**
	 * Run all examples
	 */
	async runAllExamples(): Promise<void> {
		try {
			await this.initializeNewProject();
			await this.detectAndRecommend();
			await this.updateConfiguration();
			await this.validateBeforeSaving();
			// Uncomment to test specific frameworks:
			// await this.handleFastAPIProject();
			// await this.handleReactProject();
		} catch (error) {
			console.error('Error running examples:', error);
		}
	}
}

/**
 * Example output for a FastAPI backend project:
 *
 * === Project Detection ===
 * Project Type: backend
 * Framework: fastapi
 * Languages: [ 'python' ]
 * Technologies: [ 'fastapi' ]
 * Confidence: 70%
 * Detected Files: [ 'requirements.txt', 'pyproject.toml' ]
 *
 * === Skill Recommendations ===
 * 1. @ainative/python-expert
 *    Reason: Python backend detected
 *    Priority: 1
 * 2. @ainative/fastapi-expert
 *    Reason: FastAPI framework detected
 *    Priority: 1
 * 3. git-workflow
 *    Reason: Essential for version control
 *    Priority: 2
 * 4. mandatory-tdd
 *    Reason: Testing best practices
 *    Priority: 3
 * 5. ci-cd-compliance
 *    Reason: Backend deployment standards
 *    Priority: 4
 */

/**
 * Example output for a React frontend project:
 *
 * === Project Detection ===
 * Project Type: frontend
 * Framework: react
 * Languages: [ 'javascript', 'typescript' ]
 * Technologies: [ 'react', 'typescript' ]
 * Confidence: 80%
 * Detected Files: [ 'package.json' ]
 *
 * === Skill Recommendations ===
 * 1. @ainative/react-expert
 *    Reason: React framework detected
 *    Priority: 1
 * 2. git-workflow
 *    Reason: Essential for version control
 *    Priority: 2
 * 3. mandatory-tdd
 *    Reason: Testing best practices
 *    Priority: 3
 * 4. code-quality
 *    Reason: Code quality standards
 *    Priority: 4
 */

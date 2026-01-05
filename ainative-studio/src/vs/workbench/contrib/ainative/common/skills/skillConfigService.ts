/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../../base/common/uri.js';
import { ISkillConfigService } from './skillConfigServiceTypes.js';
import { SkillsConfig, ProjectMetadata, MCPConfig, ProjectDetectionResult, SkillRecommendation } from './skillConfigTypes.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

/**
 * Service implementation for managing skills configuration in .mcp.json
 */
export class SkillConfigService implements ISkillConfigService {
	declare readonly _serviceBrand: undefined;

	private static readonly MCP_CONFIG_FILE = '.mcp.json';

	// Skill recommendation mappings
	private static readonly SKILL_RECOMMENDATIONS: Record<string, SkillRecommendation[]> = {
		'react': [
			{ skillId: '@ainative/react-expert', reason: 'React framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 },
			{ skillId: 'code-quality', reason: 'Code quality standards', priority: 4 }
		],
		'next': [
			{ skillId: '@ainative/nextjs-expert', reason: 'Next.js framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		],
		'vue': [
			{ skillId: '@ainative/vue-expert', reason: 'Vue.js framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		],
		'angular': [
			{ skillId: '@ainative/angular-expert', reason: 'Angular framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		],
		'fastapi': [
			{ skillId: '@ainative/python-expert', reason: 'Python backend detected', priority: 1 },
			{ skillId: '@ainative/fastapi-expert', reason: 'FastAPI framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 },
			{ skillId: 'ci-cd-compliance', reason: 'Backend deployment standards', priority: 4 }
		],
		'django': [
			{ skillId: '@ainative/python-expert', reason: 'Python backend detected', priority: 1 },
			{ skillId: '@ainative/django-expert', reason: 'Django framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		],
		'flask': [
			{ skillId: '@ainative/python-expert', reason: 'Python backend detected', priority: 1 },
			{ skillId: '@ainative/flask-expert', reason: 'Flask framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		],
		'express': [
			{ skillId: '@ainative/nodejs-expert', reason: 'Node.js backend detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		],
		'nestjs': [
			{ skillId: '@ainative/nestjs-expert', reason: 'NestJS framework detected', priority: 1 },
			{ skillId: 'git-workflow', reason: 'Essential for version control', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		]
	};

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService
	) { }

	async readSkillsConfig(): Promise<SkillsConfig | null> {
		try {
			const mcpConfig = await this.readMCPConfig();
			return mcpConfig?.skills || null;
		} catch (error) {
			console.error('Error reading skills config:', error);
			return null;
		}
	}

	async writeSkillsConfig(config: SkillsConfig, merge: boolean = true): Promise<void> {
		try {
			// Validate configuration first
			const errors = this.validateConfig(config);
			if (errors.length > 0) {
				throw new Error(`Invalid skills configuration: ${errors.join(', ')}`);
			}

			let mcpConfig: MCPConfig;

			if (merge) {
				// Merge with existing config
				const existing = await this.readMCPConfig();
				mcpConfig = existing || {};
				mcpConfig.skills = {
					...mcpConfig.skills,
					...config
				};
			} else {
				// Replace skills section
				const existing = await this.readMCPConfig();
				mcpConfig = existing || {};
				mcpConfig.skills = config;
			}

			await this.writeMCPConfig(mcpConfig);
		} catch (error) {
			console.error('Error writing skills config:', error);
			throw error;
		}
	}

	async detectProjectType(): Promise<ProjectDetectionResult> {
		const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return {
				metadata: { projectType: 'unknown', languages: [], technologies: [] },
				confidence: 0,
				detectedFiles: []
			};
		}

		const detectedFiles: string[] = [];
		const languages: string[] = [];
		const technologies: string[] = [];
		let framework: string | undefined;
		let projectType: ProjectMetadata['projectType'] = 'unknown';
		let confidence = 0;

		// Check for Node.js project
		const packageJsonUri = URI.joinPath(workspaceFolder.uri, 'package.json');
		if (await this.fileExists(packageJsonUri)) {
			detectedFiles.push('package.json');
			languages.push('javascript', 'typescript');
			confidence += 0.3;

			try {
				const content = await this.fileService.readFile(packageJsonUri);
				const packageJson = JSON.parse(content.value.toString());
				const allDeps = {
					...packageJson.dependencies,
					...packageJson.devDependencies
				};

				// Detect framework
				if (allDeps['react']) {
					framework = 'react';
					projectType = 'frontend';
					technologies.push('react');
					confidence += 0.4;
				} else if (allDeps['next']) {
					framework = 'next';
					projectType = 'fullstack';
					technologies.push('nextjs');
					confidence += 0.4;
				} else if (allDeps['vue']) {
					framework = 'vue';
					projectType = 'frontend';
					technologies.push('vue');
					confidence += 0.4;
				} else if (allDeps['@angular/core']) {
					framework = 'angular';
					projectType = 'frontend';
					technologies.push('angular');
					confidence += 0.4;
				} else if (allDeps['express']) {
					framework = 'express';
					projectType = 'backend';
					technologies.push('express');
					confidence += 0.4;
				} else if (allDeps['@nestjs/core']) {
					framework = 'nestjs';
					projectType = 'backend';
					technologies.push('nestjs');
					confidence += 0.4;
				}

				// Check for TypeScript
				if (allDeps['typescript']) {
					technologies.push('typescript');
					confidence += 0.1;
				}
			} catch (error) {
				console.error('Error parsing package.json:', error);
			}
		}

		// Check for Python project
		const requirementsUri = URI.joinPath(workspaceFolder.uri, 'requirements.txt');
		if (await this.fileExists(requirementsUri)) {
			detectedFiles.push('requirements.txt');
			languages.push('python');
			confidence += 0.3;

			try {
				const content = await this.fileService.readFile(requirementsUri);
				const requirements = content.value.toString();

				if (requirements.includes('fastapi')) {
					framework = 'fastapi';
					projectType = 'backend';
					technologies.push('fastapi');
					confidence += 0.4;
				} else if (requirements.includes('django')) {
					framework = 'django';
					projectType = 'backend';
					technologies.push('django');
					confidence += 0.4;
				} else if (requirements.includes('flask')) {
					framework = 'flask';
					projectType = 'backend';
					technologies.push('flask');
					confidence += 0.4;
				}
			} catch (error) {
				console.error('Error reading requirements.txt:', error);
			}
		}

		// Check for Python pyproject.toml
		const pyprojectUri = URI.joinPath(workspaceFolder.uri, 'pyproject.toml');
		if (await this.fileExists(pyprojectUri)) {
			detectedFiles.push('pyproject.toml');
			if (!languages.includes('python')) {
				languages.push('python');
			}
			confidence += 0.2;
		}

		// Check for Rust project
		const cargoUri = URI.joinPath(workspaceFolder.uri, 'Cargo.toml');
		if (await this.fileExists(cargoUri)) {
			detectedFiles.push('Cargo.toml');
			languages.push('rust');
			projectType = 'backend';
			confidence += 0.3;
		}

		// Check for Java project
		const pomUri = URI.joinPath(workspaceFolder.uri, 'pom.xml');
		if (await this.fileExists(pomUri)) {
			detectedFiles.push('pom.xml');
			languages.push('java');
			projectType = 'backend';
			confidence += 0.3;
		}

		// Check for Go project
		const goModUri = URI.joinPath(workspaceFolder.uri, 'go.mod');
		if (await this.fileExists(goModUri)) {
			detectedFiles.push('go.mod');
			languages.push('go');
			projectType = 'backend';
			confidence += 0.3;
		}

		// Ensure confidence is capped at 1.0
		confidence = Math.min(confidence, 1.0);

		return {
			metadata: {
				projectType,
				framework,
				languages,
				technologies
			},
			confidence,
			detectedFiles
		};
	}

	async recommendSkills(projectMetadata: ProjectMetadata): Promise<SkillRecommendation[]> {
		const recommendations: SkillRecommendation[] = [];
		const addedSkills = new Set<string>();

		// Add framework-specific recommendations
		if (projectMetadata.framework && SkillConfigService.SKILL_RECOMMENDATIONS[projectMetadata.framework]) {
			const frameworkRecs = SkillConfigService.SKILL_RECOMMENDATIONS[projectMetadata.framework];
			frameworkRecs.forEach(rec => {
				if (!addedSkills.has(rec.skillId)) {
					recommendations.push(rec);
					addedSkills.add(rec.skillId);
				}
			});
		}

		// Add project-type-specific recommendations
		if (projectMetadata.projectType && projectMetadata.projectType !== 'unknown') {
			const typeRecs: SkillRecommendation[] = [];

			switch (projectMetadata.projectType) {
				case 'backend':
					typeRecs.push(
						{ skillId: 'ci-cd-compliance', reason: 'Backend deployment best practices', priority: 3 },
						{ skillId: 'database-schema-sync', reason: 'Database management', priority: 4 }
					);
					break;
				case 'frontend':
					typeRecs.push(
						{ skillId: 'code-quality', reason: 'UI/UX code standards', priority: 3 }
					);
					break;
				case 'fullstack':
					typeRecs.push(
						{ skillId: 'ci-cd-compliance', reason: 'Full-stack deployment', priority: 3 },
						{ skillId: 'code-quality', reason: 'Code quality standards', priority: 4 }
					);
					break;
			}

			typeRecs.forEach(rec => {
				if (!addedSkills.has(rec.skillId)) {
					recommendations.push(rec);
					addedSkills.add(rec.skillId);
				}
			});
		}

		// Add universal recommendations if not already added
		const universalRecs: SkillRecommendation[] = [
			{ skillId: 'git-workflow', reason: 'Essential version control practices', priority: 2 },
			{ skillId: 'mandatory-tdd', reason: 'Testing best practices', priority: 3 }
		];

		universalRecs.forEach(rec => {
			if (!addedSkills.has(rec.skillId)) {
				recommendations.push(rec);
				addedSkills.add(rec.skillId);
			}
		});

		// Sort by priority
		return recommendations.sort((a, b) => a.priority - b.priority);
	}

	async getEnabledSkills(): Promise<string[]> {
		const config = await this.readSkillsConfig();
		return config?.enabled || [];
	}

	async hasMCPConfig(): Promise<boolean> {
		const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return false;
		}

		const mcpConfigUri = URI.joinPath(workspaceFolder.uri, SkillConfigService.MCP_CONFIG_FILE);
		return this.fileExists(mcpConfigUri);
	}

	async initializeMCPConfig(includeSkills: boolean = true): Promise<void> {
		const mcpConfig: MCPConfig = {
			mcpServers: {
				memory: {
					command: 'npx',
					args: ['-y', '@modelcontextprotocol/server-memory']
				}
			}
		};

		if (includeSkills) {
			const detectionResult = await this.detectProjectType();
			const recommendations = await this.recommendSkills(detectionResult.metadata);

			mcpConfig.skills = {
				enabled: recommendations.slice(0, 5).map(r => r.skillId), // Enable top 5 recommendations
				autoLoad: true,
				metadata: detectionResult.metadata
			};
		}

		await this.writeMCPConfig(mcpConfig);
	}

	validateConfig(config: SkillsConfig): string[] {
		const errors: string[] = [];

		if (!config.enabled || !Array.isArray(config.enabled)) {
			errors.push('enabled field must be an array');
		} else if (config.enabled.length === 0) {
			errors.push('enabled field cannot be empty');
		} else {
			// Validate skill identifiers
			config.enabled.forEach(skillId => {
				if (typeof skillId !== 'string' || skillId.trim().length === 0) {
					errors.push(`Invalid skill identifier: ${skillId}`);
				}
			});
		}

		if (config.projectSpecific !== undefined) {
			if (!Array.isArray(config.projectSpecific)) {
				errors.push('projectSpecific field must be an array');
			} else {
				config.projectSpecific.forEach(path => {
					if (typeof path !== 'string' || path.trim().length === 0) {
						errors.push(`Invalid project-specific skill path: ${path}`);
					}
				});
			}
		}

		if (config.autoLoad !== undefined && typeof config.autoLoad !== 'boolean') {
			errors.push('autoLoad field must be a boolean');
		}

		if (config.metadata !== undefined) {
			if (config.metadata.projectType !== undefined) {
				const validTypes = ['frontend', 'backend', 'fullstack', 'mobile', 'data', 'unknown'];
				if (!validTypes.includes(config.metadata.projectType)) {
					errors.push(`Invalid projectType: ${config.metadata.projectType}`);
				}
			}

			if (config.metadata.languages !== undefined && !Array.isArray(config.metadata.languages)) {
				errors.push('metadata.languages must be an array');
			}

			if (config.metadata.technologies !== undefined && !Array.isArray(config.metadata.technologies)) {
				errors.push('metadata.technologies must be an array');
			}
		}

		return errors;
	}

	// Private helper methods

	private async readMCPConfig(): Promise<MCPConfig | null> {
		const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			return null;
		}

		const mcpConfigUri = URI.joinPath(workspaceFolder.uri, SkillConfigService.MCP_CONFIG_FILE);

		if (!await this.fileExists(mcpConfigUri)) {
			return null;
		}

		try {
			const content = await this.fileService.readFile(mcpConfigUri);
			return JSON.parse(content.value.toString());
		} catch (error) {
			console.error('Error reading .mcp.json:', error);
			return null;
		}
	}

	private async writeMCPConfig(config: MCPConfig): Promise<void> {
		const workspaceFolder = this.workspaceService.getWorkspace().folders[0];
		if (!workspaceFolder) {
			throw new Error('No workspace folder found');
		}

		const mcpConfigUri = URI.joinPath(workspaceFolder.uri, SkillConfigService.MCP_CONFIG_FILE);
		const content = JSON.stringify(config, null, 2);

		await this.fileService.writeFile(mcpConfigUri, VSBuffer.fromString(content));
	}

	private async fileExists(uri: URI): Promise<boolean> {
		try {
			await this.fileService.stat(uri);
			return true;
		} catch {
			return false;
		}
	}
}

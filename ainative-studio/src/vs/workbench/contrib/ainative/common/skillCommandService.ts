/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { ISkillsManagerService } from './skillsManagerService.js';
import { ISkillMarketplaceService } from './skillMarketplaceService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { URI } from '../../../../base/common/uri.js';
import { Skill } from './skillTypes.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import * as path from '../../../../base/common/path.js';
import * as os from 'os';

export const ISkillCommandService = createDecorator<ISkillCommandService>('skillCommandService');

/**
 * Result of a skill command execution
 */
export interface SkillCommandResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

/**
 * Options for listing skills
 */
export interface ListSkillsOptions {
	enabled?: boolean;
	disabled?: boolean;
	category?: string;
	tag?: string;
}

/**
 * Options for searching skills
 */
export interface SearchSkillsOptions {
	query: string;
	category?: string;
	tag?: string;
	source?: 'official' | 'community' | 'anthropic' | 'all';
	sort?: 'relevance' | 'downloads' | 'stars' | 'updated' | 'name';
	limit?: number;
}

/**
 * Options for installing skills
 */
export interface InstallSkillOptions {
	source: string;
	force?: boolean;
}

/**
 * Service interface for handling skill CLI commands
 */
export interface ISkillCommandService {
	readonly _serviceBrand: undefined;

	listSkills(options?: ListSkillsOptions): Promise<SkillCommandResult>;
	installSkill(options: InstallSkillOptions): Promise<SkillCommandResult>;
	removeSkill(skillName: string, force?: boolean): Promise<SkillCommandResult>;
	createSkill(skillName: string, options?: any): Promise<SkillCommandResult>;
	getSkillInfo(skillName: string): Promise<SkillCommandResult>;
	updateSkill(skillName: string, options?: any): Promise<SkillCommandResult>;
	searchSkills(options: SearchSkillsOptions): Promise<SkillCommandResult>;
	enableSkill(skillName: string): Promise<SkillCommandResult>;
	disableSkill(skillName: string): Promise<SkillCommandResult>;
	syncSkills(options?: any): Promise<SkillCommandResult>;
}

/**
 * Implementation of the Skill Command Service
 */
export class SkillCommandService extends Disposable implements ISkillCommandService {
	declare readonly _serviceBrand: undefined;

	private readonly skillsDirectory: URI;

	constructor(
		@ISkillsManagerService private readonly skillsManager: ISkillsManagerService,
		@ISkillMarketplaceService private readonly marketplace: ISkillMarketplaceService,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		const homeDir = os.homedir();
		const skillsPath = path.join(homeDir, '.ainative', 'skills');
		this.skillsDirectory = URI.file(skillsPath);

		this.logService.info('[SkillCommandService] Initialized with directory:', skillsPath);
	}

	async listSkills(options: ListSkillsOptions = {}): Promise<SkillCommandResult> {
		try {
			const allSkills = this.skillsManager.getAllSkills();
			const preferences = this.skillsManager.getPreferences();

			let filteredSkills = allSkills;

			if (options.enabled !== undefined) {
				filteredSkills = filteredSkills.filter(skill =>
					!preferences.disabledSkills?.includes(skill.name)
				);
			}

			if (options.disabled !== undefined) {
				filteredSkills = filteredSkills.filter(skill =>
					preferences.disabledSkills?.includes(skill.name)
				);
			}

			if (options.category) {
				filteredSkills = filteredSkills.filter(skill =>
					skill.category === options.category
				);
			}

			if (options.tag) {
				filteredSkills = filteredSkills.filter(skill =>
					skill.tags?.includes(options.tag)
				);
			}

			const enabledCount = allSkills.filter(s => !preferences.disabledSkills?.includes(s.name)).length;
			const disabledCount = allSkills.length - enabledCount;

			const output = this.formatSkillList(filteredSkills, preferences);

			return {
				success: true,
				message: `Total: ${filteredSkills.length} skills (${enabledCount} enabled, ${disabledCount} disabled)`,
				data: {
					skills: filteredSkills,
					total: filteredSkills.length,
					enabled: enabledCount,
					disabled: disabledCount,
					formatted: output
				}
			};
		} catch (error) {
			this.logService.error('[SkillCommandService] Error listing skills:', error);
			return {
				success: false,
				message: 'Failed to list skills',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async installSkill(options: InstallSkillOptions): Promise<SkillCommandResult> {
		try {
			const { source, force } = options;
			const sourceType = this.detectSourceType(source);

			this.logService.info('[SkillCommandService] Installing skill from:', source, 'type:', sourceType);

			const skillName = this.extractSkillName(source, sourceType);
			if (this.skillsManager.hasSkill(skillName) && !force) {
				return {
					success: false,
					message: `Skill '${skillName}' is already installed. Use --force to reinstall.`,
					error: 'ALREADY_INSTALLED'
				};
			}

			let skillUri: URI;

			switch (sourceType) {
				case 'local':
					skillUri = URI.file(source);
					break;

				case 'npm':
				case 'github':
				case 'url':
					return {
						success: false,
						message: `${sourceType.toUpperCase()} installation not yet implemented`,
						error: 'NOT_IMPLEMENTED'
					};

				case 'marketplace':
					const searchResults = await this.marketplace.searchSkills(source);
					if (!searchResults || searchResults.length === 0) {
						return {
							success: false,
							message: `Skill '${source}' not found in marketplace`,
							error: 'NOT_FOUND'
						};
					}
					skillUri = searchResults[0].source;
					break;

				default:
					return {
						success: false,
						message: `Unknown source type: ${sourceType}`,
						error: 'INVALID_SOURCE'
					};
			}

			await this.skillsManager.loadSkillFromFile(skillUri);
			this.skillsManager.markSkillAsInstalled(skillName);

			return {
				success: true,
				message: `Successfully installed skill '${skillName}'`,
				data: { skillName, source: skillUri.toString() }
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error installing skill:', error);
			return {
				success: false,
				message: 'Failed to install skill',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async removeSkill(skillName: string, force: boolean = false): Promise<SkillCommandResult> {
		try {
			if (!this.skillsManager.hasSkill(skillName)) {
				return {
					success: false,
					message: `Skill '${skillName}' is not installed`,
					error: 'NOT_FOUND'
				};
			}

			const skill = this.skillsManager.getSkillByName(skillName);
			this.skillsManager.removeSkill(skillName);

			return {
				success: true,
				message: `Successfully removed skill '${skillName}'`,
				data: { skillName, skill }
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error removing skill:', error);
			return {
				success: false,
				message: 'Failed to remove skill',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async createSkill(skillName: string, options: any = {}): Promise<SkillCommandResult> {
		try {
			if (!this.isValidSkillName(skillName)) {
				return {
					success: false,
					message: 'Invalid skill name. Use lowercase letters, numbers, and hyphens only.',
					error: 'INVALID_NAME'
				};
			}

			const skillPath = path.join(this.skillsDirectory.fsPath, skillName);
			const skillUri = URI.file(skillPath);

			const exists = await this.fileService.exists(skillUri);
			if (exists) {
				return {
					success: false,
					message: `Skill directory already exists: ${skillPath}`,
					error: 'ALREADY_EXISTS'
				};
			}

			await this.fileService.createFolder(skillUri);
			await this.fileService.createFolder(URI.file(path.join(skillPath, 'references')));
			await this.fileService.createFolder(URI.file(path.join(skillPath, 'scripts')));
			await this.fileService.createFolder(URI.file(path.join(skillPath, 'assets')));
			await this.fileService.createFolder(URI.file(path.join(skillPath, 'examples')));

			const template = this.generateSkillTemplate(skillName, options);
			const skillMdUri = URI.file(path.join(skillPath, 'SKILL.md'));
			await this.fileService.writeFile(skillMdUri, VSBuffer.fromString(template));

			const readme = this.generateReadmeTemplate(skillName);
			const readmeUri = URI.file(path.join(skillPath, 'README.md'));
			await this.fileService.writeFile(readmeUri, VSBuffer.fromString(readme));

			return {
				success: true,
				message: `Successfully created skill '${skillName}' at ${skillPath}`,
				data: { skillName, path: skillPath, skillMdUri: skillMdUri.toString() }
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error creating skill:', error);
			return {
				success: false,
				message: 'Failed to create skill',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async getSkillInfo(skillName: string): Promise<SkillCommandResult> {
		try {
			const skill = this.skillsManager.getSkillByName(skillName);

			if (!skill) {
				const marketplaceResults = await this.marketplace.searchSkills(skillName);
				if (marketplaceResults && marketplaceResults.length > 0) {
					const marketplaceSkill = marketplaceResults[0];
					return {
						success: true,
						message: `Skill '${skillName}' available in marketplace (not installed)`,
						data: {
							skill: marketplaceSkill,
							installed: false,
							formatted: this.formatSkillInfo(marketplaceSkill, false)
						}
					};
				}

				return {
					success: false,
					message: `Skill '${skillName}' not found`,
					error: 'NOT_FOUND'
				};
			}

			const preferences = this.skillsManager.getPreferences();
			const isEnabled = !preferences.disabledSkills?.includes(skillName);

			return {
				success: true,
				message: `Skill information for '${skillName}'`,
				data: {
					skill,
					installed: true,
					enabled: isEnabled,
					formatted: this.formatSkillInfo(skill, true, isEnabled)
				}
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error getting skill info:', error);
			return {
				success: false,
				message: 'Failed to get skill information',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async updateSkill(skillName: string, options: any = {}): Promise<SkillCommandResult> {
		try {
			if (!this.skillsManager.hasSkill(skillName)) {
				return {
					success: false,
					message: `Skill '${skillName}' is not installed`,
					error: 'NOT_FOUND'
				};
			}

			return {
				success: false,
				message: 'Update functionality not yet implemented',
				error: 'NOT_IMPLEMENTED'
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error updating skill:', error);
			return {
				success: false,
				message: 'Failed to update skill',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async searchSkills(options: SearchSkillsOptions): Promise<SkillCommandResult> {
		try {
			const results = await this.marketplace.searchSkills(options.query, {
				category: options.category,
				tags: options.tag ? [options.tag] : undefined,
				limit: options.limit
			});

			if (!results || results.length === 0) {
				return {
					success: true,
					message: `No skills found for query: ${options.query}`,
					data: { results: [], count: 0 }
				};
			}

			if (options.sort) {
				this.sortSearchResults(results, options.sort);
			}

			const formatted = this.formatSearchResults(results);

			return {
				success: true,
				message: `Found ${results.length} skills`,
				data: { results, count: results.length, formatted }
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error searching skills:', error);
			return {
				success: false,
				message: 'Failed to search skills',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async enableSkill(skillName: string): Promise<SkillCommandResult> {
		try {
			if (!this.skillsManager.hasSkill(skillName)) {
				return {
					success: false,
					message: `Skill '${skillName}' is not installed`,
					error: 'NOT_FOUND'
				};
			}

			const preferences = this.skillsManager.getPreferences();
			if (!preferences.disabledSkills?.includes(skillName)) {
				return {
					success: true,
					message: `Skill '${skillName}' is already enabled`,
					data: { skillName, alreadyEnabled: true }
				};
			}

			this.skillsManager.enableSkill(skillName);

			return {
				success: true,
				message: `Successfully enabled skill '${skillName}'`,
				data: { skillName }
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error enabling skill:', error);
			return {
				success: false,
				message: 'Failed to enable skill',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async disableSkill(skillName: string): Promise<SkillCommandResult> {
		try {
			if (!this.skillsManager.hasSkill(skillName)) {
				return {
					success: false,
					message: `Skill '${skillName}' is not installed`,
					error: 'NOT_FOUND'
				};
			}

			const preferences = this.skillsManager.getPreferences();
			if (preferences.disabledSkills?.includes(skillName)) {
				return {
					success: true,
					message: `Skill '${skillName}' is already disabled`,
					data: { skillName, alreadyDisabled: true }
				};
			}

			this.skillsManager.disableSkill(skillName);

			return {
				success: true,
				message: `Successfully disabled skill '${skillName}'`,
				data: { skillName }
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error disabling skill:', error);
			return {
				success: false,
				message: 'Failed to disable skill',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async syncSkills(options: any = {}): Promise<SkillCommandResult> {
		try {
			return {
				success: false,
				message: 'Sync functionality not yet implemented',
				error: 'NOT_IMPLEMENTED'
			};

		} catch (error) {
			this.logService.error('[SkillCommandService] Error syncing skills:', error);
			return {
				success: false,
				message: 'Failed to sync skills',
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	// Helper methods
	private detectSourceType(source: string): 'local' | 'npm' | 'github' | 'url' | 'marketplace' {
		if (source.startsWith('./') || source.startsWith('/') || source.startsWith('~')) {
			return 'local';
		}
		if (source.startsWith('@') || source.includes('/') && !source.includes('://')) {
			return source.startsWith('@') ? 'npm' : 'github';
		}
		if (source.startsWith('http://') || source.startsWith('https://')) {
			return 'url';
		}
		return 'marketplace';
	}

	private extractSkillName(source: string, sourceType: string): string {
		switch (sourceType) {
			case 'local': return path.basename(source);
			case 'npm': return source.split('/').pop() || source;
			case 'github': return source.split('/').pop() || source;
			case 'url':
				const urlPath = new URL(source).pathname;
				return path.basename(urlPath, '.zip');
			default: return source;
		}
	}

	private isValidSkillName(name: string): boolean {
		return /^[a-z0-9-]+$/.test(name);
	}

	private generateSkillTemplate(skillName: string, options: any): string {
		const now = new Date().toISOString();
		return `---
name: ${skillName}
version: 1.0.0
description: Description of ${skillName}
author: ${options.author || 'Your Name'}
category: ${options.category || 'general'}
tags: [${options.tags?.join(', ') || ''}]
created: ${now}
updated: ${now}
---

# ${this.titleCase(skillName)}

## Purpose

[Describe what problem this skill solves]

## When to Use

Use this skill when:
- [Scenario 1]
- [Scenario 2]

## Instructions

[Main skill instructions]

## Examples

[Usage examples]
`;
	}

	private generateReadmeTemplate(skillName: string): string {
		return `# ${this.titleCase(skillName)}

See [SKILL.md](./SKILL.md) for details.
`;
	}

	private formatSkillList(skills: Skill[], preferences: any): string {
		const lines: string[] = ['Installed Skills:\n'];

		for (const skill of skills) {
			const isEnabled = !preferences.disabledSkills?.includes(skill.name);
			const status = isEnabled ? '✅' : '❌';
			const disabled = isEnabled ? '' : ' [DISABLED]';

			lines.push(`${status} ${skill.name} (v${skill.version})${disabled}`);
			lines.push(`   ${skill.description}`);
			lines.push('');
		}

		return lines.join('\n');
	}

	private formatSkillInfo(skill: Skill, installed: boolean, enabled: boolean = true): string {
		const lines: string[] = [];
		lines.push(`${skill.name} (v${skill.version}) ${installed ? (enabled ? '✅' : '❌') : '⬇️'}`);
		lines.push(`Description: ${skill.description}`);
		lines.push(`Category: ${skill.category}`);
		lines.push(`Tags: ${skill.tags?.join(', ') || 'none'}`);
		return lines.join('\n');
	}

	private formatSearchResults(results: any[]): string {
		const lines: string[] = [`Found ${results.length} skills:\n`];

		for (let i = 0; i < results.length; i++) {
			const skill = results[i];
			lines.push(`${i + 1}. ${skill.name} (v${skill.version})`);
			lines.push(`   ${skill.description}`);
			lines.push('');
		}

		return lines.join('\n');
	}

	private sortSearchResults(results: any[], sortBy: string): void {
		switch (sortBy) {
			case 'name':
				results.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case 'downloads':
				results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
				break;
			case 'stars':
				results.sort((a, b) => (b.stars || 0) - (a.stars || 0));
				break;
			case 'updated':
				results.sort((a, b) => {
					const dateA = new Date(a.updated || 0).getTime();
					const dateB = new Date(b.updated || 0).getTime();
					return dateB - dateA;
				});
				break;
		}
	}

	private titleCase(str: string): string {
		return str.split('-').map(word =>
			word.charAt(0).toUpperCase() + word.slice(1)
		).join(' ');
	}
}

registerSingleton(ISkillCommandService, SkillCommandService, InstantiationType.Delayed);

/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISkillsManagerService } from './skillsManagerService.js';
import { ISkillMarketplaceService } from './skillMarketplaceService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import * as path from '../../../../base/common/path.js';
import * as os from 'os';
export const ISkillCommandService = createDecorator('skillCommandService');
/**
 * Implementation of the Skill Command Service
 */
let SkillCommandService = class SkillCommandService extends Disposable {
    constructor(skillsManager, marketplace, fileService, logService) {
        super();
        this.skillsManager = skillsManager;
        this.marketplace = marketplace;
        this.fileService = fileService;
        this.logService = logService;
        const homeDir = os.homedir();
        const skillsPath = path.join(homeDir, '.ainative', 'skills');
        this.skillsDirectory = URI.file(skillsPath);
        this.logService.info('[SkillCommandService] Initialized with directory:', skillsPath);
    }
    async listSkills(options = {}) {
        try {
            const allSkills = this.skillsManager.getAllSkills();
            const preferences = this.skillsManager.getPreferences();
            let filteredSkills = allSkills;
            if (options.enabled !== undefined) {
                filteredSkills = filteredSkills.filter(skill => !preferences.disabledSkills?.includes(skill.name));
            }
            if (options.disabled !== undefined) {
                filteredSkills = filteredSkills.filter(skill => preferences.disabledSkills?.includes(skill.name));
            }
            if (options.category) {
                filteredSkills = filteredSkills.filter(skill => skill.category === options.category);
            }
            if (options.tag) {
                filteredSkills = filteredSkills.filter(skill => skill.tags?.includes(options.tag));
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error listing skills:', error);
            return {
                success: false,
                message: 'Failed to list skills',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async installSkill(options) {
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
            let skillUri;
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error installing skill:', error);
            return {
                success: false,
                message: 'Failed to install skill',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async removeSkill(skillName, force = false) {
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error removing skill:', error);
            return {
                success: false,
                message: 'Failed to remove skill',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async createSkill(skillName, options = {}) {
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error creating skill:', error);
            return {
                success: false,
                message: 'Failed to create skill',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async getSkillInfo(skillName) {
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error getting skill info:', error);
            return {
                success: false,
                message: 'Failed to get skill information',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async updateSkill(skillName, options = {}) {
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error updating skill:', error);
            return {
                success: false,
                message: 'Failed to update skill',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async searchSkills(options) {
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error searching skills:', error);
            return {
                success: false,
                message: 'Failed to search skills',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async enableSkill(skillName) {
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error enabling skill:', error);
            return {
                success: false,
                message: 'Failed to enable skill',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async disableSkill(skillName) {
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
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error disabling skill:', error);
            return {
                success: false,
                message: 'Failed to disable skill',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async syncSkills(options = {}) {
        try {
            return {
                success: false,
                message: 'Sync functionality not yet implemented',
                error: 'NOT_IMPLEMENTED'
            };
        }
        catch (error) {
            this.logService.error('[SkillCommandService] Error syncing skills:', error);
            return {
                success: false,
                message: 'Failed to sync skills',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    // Helper methods
    detectSourceType(source) {
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
    extractSkillName(source, sourceType) {
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
    isValidSkillName(name) {
        return /^[a-z0-9-]+$/.test(name);
    }
    generateSkillTemplate(skillName, options) {
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
    generateReadmeTemplate(skillName) {
        return `# ${this.titleCase(skillName)}

See [SKILL.md](./SKILL.md) for details.
`;
    }
    formatSkillList(skills, preferences) {
        const lines = ['Installed Skills:\n'];
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
    formatSkillInfo(skill, installed, enabled = true) {
        const lines = [];
        lines.push(`${skill.name} (v${skill.version}) ${installed ? (enabled ? '✅' : '❌') : '⬇️'}`);
        lines.push(`Description: ${skill.description}`);
        lines.push(`Category: ${skill.category}`);
        lines.push(`Tags: ${skill.tags?.join(', ') || 'none'}`);
        return lines.join('\n');
    }
    formatSearchResults(results) {
        const lines = [`Found ${results.length} skills:\n`];
        for (let i = 0; i < results.length; i++) {
            const skill = results[i];
            lines.push(`${i + 1}. ${skill.name} (v${skill.version})`);
            lines.push(`   ${skill.description}`);
            lines.push('');
        }
        return lines.join('\n');
    }
    sortSearchResults(results, sortBy) {
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
    titleCase(str) {
        return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
};
SkillCommandService = __decorate([
    __param(0, ISkillsManagerService),
    __param(1, ISkillMarketplaceService),
    __param(2, IFileService),
    __param(3, ILogService)
], SkillCommandService);
export { SkillCommandService };
registerSingleton(ISkillCommandService, SkillCommandService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDb21tYW5kU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxsQ29tbWFuZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFFekIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBNERqRzs7R0FFRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUtsRCxZQUN5QyxhQUFvQyxFQUNqQyxXQUFxQyxFQUNqRCxXQUF5QixFQUMxQixVQUF1QjtRQUVyRCxLQUFLLEVB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
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
                filteredSkills = filteredSkills.filter(skill => !preferences.disabledSkills?.includes(skill.name || ''));
            }
            if (options.disabled !== undefined) {
                filteredSkills = filteredSkills.filter(skill => preferences.disabledSkills?.includes(skill.name || ''));
            }
            if (options.category) {
                filteredSkills = filteredSkills.filter(skill => skill.category === options.category);
            }
            if (options.tag) {
                filteredSkills = filteredSkills.filter(skill => skill.tags?.includes(options.tag || ''));
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
                    const searchResults = await this.marketplace.searchSkills({ query: source });
                    const results = searchResults.results;
                    if (!results || results.length === 0) {
                        return {
                            success: false,
                            message: `Skill '${source}' not found in marketplace`,
                            error: 'NOT_FOUND'
                        };
                    }
                    // Note: SkillSearchResult uses downloadUrl, not source
                    skillUri = URI.parse(results[0].downloadUrl || results[0].name);
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
                const marketplaceResults = await this.marketplace.searchSkills({ query: skillName });
                const marketplaceSkillsArray = marketplaceResults.results;
                if (marketplaceSkillsArray && marketplaceSkillsArray.length > 0) {
                    const marketplaceSkill = marketplaceSkillsArray[0];
                    return {
                        success: true,
                        message: `Skill '${skillName}' available in marketplace (not installed)`,
                        data: {
                            skill: marketplaceSkill,
                            installed: false,
                            // Note: formatSkillInfo expects Skill type, SkillSearchResult is different
                            formatted: `${marketplaceSkill.name} (${marketplaceSkill.version})\n${marketplaceSkill.description}`
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
            const results = await this.marketplace.searchSkills({ query: options.query,
                category: options.category,
                tags: options.tag ? [options.tag] : undefined,
                limit: options.limit
            });
            const skillsArray = results.results;
            if (!skillsArray || skillsArray.length === 0) {
                return {
                    success: true,
                    message: `No skills found for query: ${options.query}`,
                    data: { results: [], count: 0 }
                };
            }
            if (options.sort) {
                this.sortSearchResults(skillsArray, options.sort);
            }
            const formatted = this.formatSearchResults(skillsArray);
            return {
                success: true,
                message: `Found ${skillsArray.length} skills`,
                data: { results: skillsArray, count: skillsArray.length, formatted }
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
            const isEnabled = !preferences.disabledSkills?.includes(skill.name || '');
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
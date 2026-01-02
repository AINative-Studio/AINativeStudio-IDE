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
                    const results = searchResults.results;
                    if (!results || results.length === 0) {
                        return {
                            success: false,
                            message: `Skill '${source}' not found in marketplace`,
                            error: 'NOT_FOUND'
                        };
                    }
                    skillUri = results[0].source;
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
                const marketplaceSkillsArray = marketplaceResults.results;
                if (marketplaceSkillsArray && marketplaceSkillsArray.length > 0) {
                    const marketplaceSkill = marketplaceSkillsArray[0];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDb21tYW5kU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxsQ29tbWFuZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFFekIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBNERqRzs7R0FFRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUtsRCxZQUN5QyxhQUFvQyxFQUNqQyxXQUFxQyxFQUNqRCxXQUF5QixFQUMxQixVQUF1QjtRQUVyRCxLQUFLLEVBQUUsQ0FBQztRQUxnQyxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFDakMsZ0JBQVcsR0FBWCxXQUFXLENBQTBCO1FBQ2pELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQzFCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJckQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsbURBQW1ELEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBNkIsRUFBRTtRQUMvQyxJQUFJLENBQUM7WUFDSixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3BELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFeEQsSUFBSSxjQUFjLEdBQUcsU0FBUyxDQUFDO1lBRS9CLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDbkMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FDOUMsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQ2pELENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNwQyxjQUFjLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUM5QyxXQUFXLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQ2hELENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3RCLGNBQWMsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQzlDLEtBQUssQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FDbkMsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDakIsY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FDOUMsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUNqQyxDQUFDO1lBQ0gsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNqRyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztZQUV0RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUVqRSxPQUFPO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxVQUFVLGNBQWMsQ0FBQyxNQUFNLFlBQVksWUFBWSxhQUFhLGFBQWEsWUFBWTtnQkFDdEcsSUFBSSxFQUFFO29CQUNMLE1BQU0sRUFBRSxjQUFjO29CQUN0QixLQUFLLEVBQUUsY0FBYyxDQUFDLE1BQU07b0JBQzVCLE9BQU8sRUFBRSxZQUFZO29CQUNyQixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsU0FBUyxFQUFFLE1BQU07aUJBQ2pCO2FBQ0QsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVFLE9BQU87Z0JBQ04sT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDN0QsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUE0QjtRQUM5QyxJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLE9BQU8sQ0FBQztZQUNsQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFakQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsOENBQThDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUVsRyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzVELElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDdEQsT0FBTztvQkFDTixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsVUFBVSxTQUFTLG1EQUFtRDtvQkFDL0UsS0FBSyxFQUFFLG1CQUFtQjtpQkFDMUIsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLFFBQWEsQ0FBQztZQUVsQixRQUFRLFVBQVUsRUFBRSxDQUFDO2dCQUNwQixLQUFLLE9BQU87b0JBQ1gsUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzVCLE1BQU07Z0JBRVAsS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxRQUFRLENBQUM7Z0JBQ2QsS0FBSyxLQUFLO29CQUNULE9BQU87d0JBQ04sT0FBTyxFQUFFLEtBQUs7d0JBQ2QsT0FBTyxFQUFFLEdBQUcsVUFBVSxDQUFDLFdBQVcsRUFBRSxtQ0FBbUM7d0JBQ3ZFLEtBQUssRUFBRSxpQkFBaUI7cUJBQ3hCLENBQUM7Z0JBRUgsS0FBSyxhQUFhO29CQUNqQixNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNsRSxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO29CQUN0QyxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ3RDLE9BQU87NEJBQ04sT0FBTyxFQUFFLEtBQUs7NEJBQ2QsT0FBTyxFQUFFLFVBQVUsTUFBTSw0QkFBNEI7NEJBQ3JELEtBQUssRUFBRSxXQUFXO3lCQUNsQixDQUFDO29CQUNILENBQUM7b0JBQ0QsUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7b0JBQzdCLE1BQU07Z0JBRVA7b0JBQ0MsT0FBTzt3QkFDTixPQUFPLEVBQUUsS0FBSzt3QkFDZCxPQUFPLEVBQUUsd0JBQXdCLFVBQVUsRUFBRTt3QkFDN0MsS0FBSyxFQUFFLGdCQUFnQjtxQkFDdkIsQ0FBQztZQUNKLENBQUM7WUFFRCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVuRCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxpQ0FBaUMsU0FBUyxHQUFHO2dCQUN0RCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRTthQUNoRCxDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsK0NBQStDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUUsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUseUJBQXlCO2dCQUNsQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzthQUM3RCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQWlCLEVBQUUsUUFBaUIsS0FBSztRQUMxRCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsT0FBTztvQkFDTixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsVUFBVSxTQUFTLG9CQUFvQjtvQkFDaEQsS0FBSyxFQUFFLFdBQVc7aUJBQ2xCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFMUMsT0FBTztnQkFDTixPQUFPLEVBQUUsSUFBSTtnQkFDYixPQUFPLEVBQUUsK0JBQStCLFNBQVMsR0FBRztnQkFDcEQsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRTthQUMxQixDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUUsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUsd0JBQXdCO2dCQUNqQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzthQUM3RCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQWlCLEVBQUUsVUFBZSxFQUFFO1FBQ3JELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsT0FBTztvQkFDTixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsdUVBQXVFO29CQUNoRixLQUFLLEVBQUUsY0FBYztpQkFDckIsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFckMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE9BQU87b0JBQ04sT0FBTyxFQUFFLEtBQUs7b0JBQ2QsT0FBTyxFQUFFLG1DQUFtQyxTQUFTLEVBQUU7b0JBQ3ZELEtBQUssRUFBRSxnQkFBZ0I7aUJBQ3ZCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0UsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RSxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWhGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDaEUsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzlELE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUU1RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzlELE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUV6RSxPQUFPO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSwrQkFBK0IsU0FBUyxRQUFRLFNBQVMsRUFBRTtnQkFDcEUsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRTthQUN2RSxDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUUsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUsd0JBQXdCO2dCQUNqQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzthQUM3RCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQWlCO1FBQ25DLElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixNQUFNLGtCQUFrQixHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzFFLE1BQU0sc0JBQXNCLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDO2dCQUMxRCxJQUFJLHNCQUFzQixJQUFJLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDakUsTUFBTSxnQkFBZ0IsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkQsT0FBTzt3QkFDTixPQUFPLEVBQUUsSUFBSTt3QkFDYixPQUFPLEVBQUUsVUFBVSxTQUFTLDRDQUE0Qzt3QkFDeEUsSUFBSSxFQUFFOzRCQUNMLEtBQUssRUFBRSxnQkFBZ0I7NEJBQ3ZCLFNBQVMsRUFBRSxLQUFLOzRCQUNoQixTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUM7eUJBQ3hEO3FCQUNELENBQUM7Z0JBQ0gsQ0FBQztnQkFFRCxPQUFPO29CQUNOLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxVQUFVLFNBQVMsYUFBYTtvQkFDekMsS0FBSyxFQUFFLFdBQVc7aUJBQ2xCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN4RCxNQUFNLFNBQVMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRW5FLE9BQU87Z0JBQ04sT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLDBCQUEwQixTQUFTLEdBQUc7Z0JBQy9DLElBQUksRUFBRTtvQkFDTCxLQUFLO29CQUNMLFNBQVMsRUFBRSxJQUFJO29CQUNmLE9BQU8sRUFBRSxTQUFTO29CQUNsQixTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQztpQkFDdkQ7YUFDRCxDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaURBQWlELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEYsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzthQUM3RCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQWlCLEVBQUUsVUFBZSxFQUFFO1FBQ3JELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxPQUFPO29CQUNOLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxVQUFVLFNBQVMsb0JBQW9CO29CQUNoRCxLQUFLLEVBQUUsV0FBVztpQkFDbEIsQ0FBQztZQUNILENBQUM7WUFFRCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSwwQ0FBMEM7Z0JBQ25ELEtBQUssRUFBRSxpQkFBaUI7YUFDeEIsQ0FBQztRQUVILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVFLE9BQU87Z0JBQ04sT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLHdCQUF3QjtnQkFDakMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDN0QsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUE0QjtRQUM5QyxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7Z0JBQ2xFLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtnQkFDMUIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUM3QyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7YUFDcEIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUVwQyxJQUFJLENBQUMsV0FBVyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLE9BQU87b0JBQ04sT0FBTyxFQUFFLElBQUk7b0JBQ2IsT0FBTyxFQUFFLDhCQUE4QixPQUFPLENBQUMsS0FBSyxFQUFFO29CQUN0RCxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7aUJBQy9CLENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25ELENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFeEQsT0FBTztnQkFDTixPQUFPLEVBQUUsSUFBSTtnQkFDYixPQUFPLEVBQUUsU0FBUyxXQUFXLENBQUMsTUFBTSxTQUFTO2dCQUM3QyxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRTthQUNwRSxDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsK0NBQStDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUUsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUseUJBQXlCO2dCQUNsQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzthQUM3RCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQWlCO1FBQ2xDLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxPQUFPO29CQUNOLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxVQUFVLFNBQVMsb0JBQW9CO29CQUNoRCxLQUFLLEVBQUUsV0FBVztpQkFDbEIsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3hELElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxPQUFPO29CQUNOLE9BQU8sRUFBRSxJQUFJO29CQUNiLE9BQU8sRUFBRSxVQUFVLFNBQVMsc0JBQXNCO29CQUNsRCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRTtpQkFDekMsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUUxQyxPQUFPO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSwrQkFBK0IsU0FBUyxHQUFHO2dCQUNwRCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUU7YUFDbkIsQ0FBQztRQUVILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVFLE9BQU87Z0JBQ04sT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLHdCQUF3QjtnQkFDakMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDN0QsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxTQUFpQjtRQUNuQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsT0FBTztvQkFDTixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsVUFBVSxTQUFTLG9CQUFvQjtvQkFDaEQsS0FBSyxFQUFFLFdBQVc7aUJBQ2xCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN4RCxJQUFJLFdBQVcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELE9BQU87b0JBQ04sT0FBTyxFQUFFLElBQUk7b0JBQ2IsT0FBTyxFQUFFLFVBQVUsU0FBUyx1QkFBdUI7b0JBQ25ELElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFO2lCQUMxQyxDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRTNDLE9BQU87Z0JBQ04sT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLGdDQUFnQyxTQUFTLEdBQUc7Z0JBQ3JELElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRTthQUNuQixDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsOENBQThDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0UsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUseUJBQXlCO2dCQUNsQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzthQUM3RCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQWUsRUFBRTtRQUNqQyxJQUFJLENBQUM7WUFDSixPQUFPO2dCQUNOLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSx3Q0FBd0M7Z0JBQ2pELEtBQUssRUFBRSxpQkFBaUI7YUFDeEIsQ0FBQztRQUVILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVFLE9BQU87Z0JBQ04sT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7YUFDN0QsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsaUJBQWlCO0lBQ1QsZ0JBQWdCLENBQUMsTUFBYztRQUN0QyxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakYsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9FLE9BQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDbEQsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDbkUsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE1BQWMsRUFBRSxVQUFrQjtRQUMxRCxRQUFRLFVBQVUsRUFBRSxDQUFDO1lBQ3BCLEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNDLEtBQUssS0FBSyxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQztZQUNyRCxLQUFLLFFBQVEsQ0FBQyxDQUFDLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUM7WUFDeEQsS0FBSyxLQUFLO2dCQUNULE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDekMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN2QyxPQUFPLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQztRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLElBQVk7UUFDcEMsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxTQUFpQixFQUFFLE9BQVk7UUFDNUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQyxPQUFPO1FBQ0QsU0FBUzs7OEJBRWEsU0FBUztVQUM3QixPQUFPLENBQUMsTUFBTSxJQUFJLFdBQVc7WUFDM0IsT0FBTyxDQUFDLFFBQVEsSUFBSSxTQUFTO1NBQ2hDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7V0FDNUIsR0FBRztXQUNILEdBQUc7OztJQUdWLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBbUI1QixDQUFDO0lBQ0QsQ0FBQztJQUVPLHNCQUFzQixDQUFDLFNBQWlCO1FBQy9DLE9BQU8sS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQzs7O0NBR3RDLENBQUM7SUFDRCxDQUFDO0lBRU8sZUFBZSxDQUFDLE1BQWUsRUFBRSxXQUFnQjtRQUN4RCxNQUFNLEtBQUssR0FBYSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFaEQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixNQUFNLFNBQVMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwRSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7WUFFaEQsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxNQUFNLEtBQUssQ0FBQyxPQUFPLElBQUksUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNyRSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDdEMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFTyxlQUFlLENBQUMsS0FBWSxFQUFFLFNBQWtCLEVBQUUsVUFBbUIsSUFBSTtRQUNoRixNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7UUFDM0IsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLE1BQU0sS0FBSyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVGLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMxQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN4RCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE9BQWM7UUFDekMsTUFBTSxLQUFLLEdBQWEsQ0FBQyxTQUFTLE9BQU8sQ0FBQyxNQUFNLFlBQVksQ0FBQyxDQUFDO1FBRTlELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLE1BQU0sS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDMUQsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEIsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRU8saUJBQWlCLENBQUMsT0FBYyxFQUFFLE1BQWM7UUFDdkQsUUFBUSxNQUFNLEVBQUUsQ0FBQztZQUNoQixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNO1lBQ1AsS0FBSyxXQUFXO2dCQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hFLE1BQU07WUFDUCxLQUFLLE9BQU87Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEQsTUFBTTtZQUNQLEtBQUssU0FBUztnQkFDYixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUNyQixNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqRCxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqRCxPQUFPLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ3RCLENBQUMsQ0FBQyxDQUFDO2dCQUNILE1BQU07UUFDUixDQUFDO0lBQ0YsQ0FBQztJQUVPLFNBQVMsQ0FBQyxHQUFXO1FBQzVCLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUM1QyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNiLENBQUM7Q0FDRCxDQUFBO0FBL2pCWSxtQkFBbUI7SUFNN0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7R0FURCxtQkFBbUIsQ0ErakIvQjs7QUFFRCxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsb0NBQTRCLENBQUMifQ==
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
import { Emitter } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SkillRegistry } from './skillRegistry.js';
import { parseSkillFile } from './skillParser.js';
import { SKILLS_PREFERENCES_KEY } from './storageKeys.js';
export const ISkillsManagerService = createDecorator('skillsManagerService');
/**
 * Skills Manager Service implementation
 */
let SkillsManagerService = class SkillsManagerService extends Disposable {
    constructor(storageService, fileService) {
        super();
        this.storageService = storageService;
        this.fileService = fileService;
        this._onDidChangeSkills = this._register(new Emitter());
        this.onDidChangeSkills = this._onDidChangeSkills.event;
        this.registry = new SkillRegistry();
        this.preferences = this.loadPreferences();
    }
    /**
     * Load preferences from storage
     */
    loadPreferences() {
        const stored = this.storageService.get(SKILLS_PREFERENCES_KEY, 0 /* StorageScope.PROFILE */);
        if (stored) {
            try {
                return JSON.parse(stored);
            }
            catch (error) {
                // Invalid JSON, return defaults
            }
        }
        return {
            installedSkills: [],
            usageStats: {},
            disabledSkills: [],
            lastUpdated: Date.now()
        };
    }
    /**
     * Save preferences to storage
     */
    savePreferences() {
        this.preferences.lastUpdated = Date.now();
        this.storageService.store(SKILLS_PREFERENCES_KEY, JSON.stringify(this.preferences), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    /**
     * Load a skill from a file
     */
    async loadSkillFromFile(uri) {
        try {
            // Check if file exists
            const exists = await this.fileService.exists(uri);
            if (!exists) {
                return;
            }
            // Read file content
            const fileContent = await this.fileService.readFile(uri);
            const content = fileContent.value.toString();
            // Get file stats for lastModified
            const stat = await this.fileService.stat(uri);
            const lastModified = stat.mtime;
            // Parse skill
            const parseResult = parseSkillFile(content, uri.toString(), lastModified);
            if (parseResult.success && parseResult.skill) {
                // Register skill
                this.registry.registerSkill(parseResult.skill);
                this._onDidChangeSkills.fire();
            }
        }
        catch (error) {
            // Silently fail - malformed or inaccessible skills won't crash the service
            console.error(`Failed to load skill from ${uri.toString()}:`, error);
        }
    }
    /**
     * Get skill by name
     */
    getSkillByName(name) {
        return this.registry.getSkillByName(name);
    }
    /**
     * Get skills by tag
     */
    getSkillsByTag(tag) {
        return this.registry.getSkillsByTag(tag);
    }
    /**
     * Get skills with dependencies resolved
     */
    getSkillsWithDependencies(skillName) {
        return this.registry.getSkillsWithDependencies(skillName);
    }
    /**
     * Get all skills
     */
    getAllSkills() {
        return this.registry.getAllSkills();
    }
    /**
     * Check if skill exists
     */
    hasSkill(name) {
        return this.registry.hasSkill(name);
    }
    /**
     * Get skill count
     */
    getSkillCount() {
        return this.registry.getSkillCount();
    }
    /**
     * Remove a skill
     */
    removeSkill(name) {
        this.registry.unregisterSkill(name);
        // Remove from installed list
        const index = this.preferences.installedSkills.indexOf(name);
        if (index !== -1) {
            this.preferences.installedSkills.splice(index, 1);
            this.savePreferences();
        }
        this._onDidChangeSkills.fire();
    }
    /**
     * Get user preferences
     */
    getPreferences() {
        return { ...this.preferences };
    }
    /**
     * Mark skill as installed
     */
    markSkillAsInstalled(name) {
        if (!this.preferences.installedSkills.includes(name)) {
            this.preferences.installedSkills.push(name);
            this.savePreferences();
        }
    }
    /**
     * Increment skill usage count
     */
    incrementSkillUsage(name) {
        if (!this.preferences.usageStats[name]) {
            this.preferences.usageStats[name] = 0;
        }
        this.preferences.usageStats[name]++;
        this.savePreferences();
    }
    /**
     * Disable a skill
     */
    disableSkill(name) {
        if (!this.preferences.disabledSkills.includes(name)) {
            this.preferences.disabledSkills.push(name);
            this.savePreferences();
        }
    }
    /**
     * Enable a skill
     */
    enableSkill(name) {
        const index = this.preferences.disabledSkills.indexOf(name);
        if (index !== -1) {
            this.preferences.disabledSkills.splice(index, 1);
            this.savePreferences();
        }
    }
};
SkillsManagerService = __decorate([
    __param(0, IStorageService),
    __param(1, IFileService)
], SkillsManagerService);
export { SkillsManagerService };
// Register the service
registerSingleton(ISkillsManagerService, SkillsManagerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzTWFuYWdlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHNNYW5hZ2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUxRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUM7QUErRXBHOztHQUVHO0FBQ0ksSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBU25ELFlBQ2tCLGNBQWdELEVBQ25ELFdBQTBDO1FBRXhELEtBQUssRUFBRSxDQUFDO1FBSDBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVJ4Qyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxD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
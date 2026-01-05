/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { URI } from '../../../../../base/common/uri.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { INativeEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ISkillsRegistry } from './skillRegistryTypes.js';
import { ISkillParser } from './skillParserTypes.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { basename } from '../../../../../base/common/path.js';
/**
 * Skills Registry Service Implementation
 * Manages installation, uninstallation, and listing of skills
 * Persists registry to ~/.ainative/skills/registry.json
 */
let SkillsRegistry = class SkillsRegistry extends Disposable {
    constructor(fileService, skillParser, envService) {
        super();
        this.fileService = fileService;
        this.skillParser = skillParser;
        this.envService = envService;
        this.registryCache = null;
        // Set up paths: ~/.ainative/skills/
        const ainativeDir = joinPath(this.envService.userHome, '.ainative');
        this.skillsDir = joinPath(ainativeDir, 'skills');
        this.registryFile = joinPath(this.skillsDir, 'registry.json');
    }
    /**
     * Install a skill from a local path
     */
    async install(skillPath) {
        // 1. Parse skill to get metadata
        const skillUri = URI.file(skillPath);
        const skillFileUri = joinPath(skillUri, 'SKILL.md');
        const skill = await this.skillParser.parseSkillFile(skillFileUri.fsPath);
        // 2. Load registry and check for duplicates
        const registry = await this.loadRegistry();
        if (registry.has(skill.metadata.name)) {
            throw new Error(`Skill '${skill.metadata.name}' is already installed. Uninstall it first to reinstall.`);
        }
        // 3. Copy skill to ~/.ainative/skills/{skill-name}/
        const targetDir = joinPath(this.skillsDir, skill.metadata.name);
        // Ensure skills directory exists
        await this.ensureDirectoryExists(this.skillsDir);
        // Copy the entire skill directory
        await this.fileService.copy(skillUri, targetDir, true);
        // 4. Add entry to registry
        const entry = {
            name: skill.metadata.name,
            version: skill.metadata.version || '1.0.0',
            installedAt: Date.now(),
            source: 'local',
            path: targetDir.fsPath
        };
        registry.set(skill.metadata.name, entry);
        // 5. Persist registry
        await this.saveRegistry(registry);
        // Update cache
        this.registryCache = registry;
    }
    /**
     * Uninstall a skill by name
     */
    async uninstall(skillName) {
        // 1. Load registry and check if installed
        const registry = await this.loadRegistry();
        const entry = registry.get(skillName);
        if (!entry) {
            throw new Error(`Skill '${skillName}' is not installed.`);
        }
        // 2. Remove skill directory
        const skillDir = URI.file(entry.path);
        await this.fileService.del(skillDir, { recursive: true });
        // 3. Remove from registry
        registry.delete(skillName);
        // 4. Persist registry
        await this.saveRegistry(registry);
        // Update cache
        this.registryCache = registry;
    }
    /**
     * List all installed skills
     */
    async list() {
        const registry = await this.loadRegistry();
        return Array.from(registry.values());
    }
    /**
     * Get a specific skill by name
     */
    async get(skillName) {
        const registry = await this.loadRegistry();
        return registry.get(skillName) || null;
    }
    /**
     * Check if a skill is installed
     */
    async isInstalled(skillName) {
        const registry = await this.loadRegistry();
        return registry.has(skillName);
    }
    /**
     * Refresh skills from a source directory (e.g., .claude/skills/)
     * Scans the directory for skills and updates the registry
     */
    async refresh(skillsSourceDir) {
        const sourceUri = URI.file(skillsSourceDir);
        // Load current registry
        const currentRegistry = await this.loadRegistry();
        const currentSkills = new Map(currentRegistry);
        // Scan source directory for skills
        const newRegistry = new Map();
        const updated = [];
        const newSkills = [];
        const unchanged = [];
        try {
            // Read source directory
            const dirStat = await this.fileService.resolve(sourceUri);
            if (!dirStat || !dirStat.children) {
                throw new Error(`Skills source directory not found: ${skillsSourceDir}`);
            }
            // Process each subdirectory as a potential skill
            for (const child of dirStat.children) {
                if (!child.isDirectory) {
                    continue;
                }
                const skillName = basename(child.resource.fsPath);
                const skillFileUri = joinPath(child.resource, 'SKILL.md');
                try {
                    // Try to parse skill file
                    const skill = await this.skillParser.parseSkillFile(skillFileUri.fsPath);
                    const version = skill.metadata.version || '1.0.0';
                    // Check if skill existed before
                    const existingEntry = currentSkills.get(skillName);
                    if (existingEntry) {
                        // Skill exists - check if version changed
                        if (existingEntry.version !== version) {
                            updated.push({
                                name: skillName,
                                oldVersion: existingEntry.version,
                                newVersion: version
                            });
                        }
                        else {
                            unchanged.push(skillName);
                        }
                        currentSkills.delete(skillName);
                    }
                    else {
                        // New skill
                        newSkills.push({
                            name: skillName,
                            oldVersion: null,
                            newVersion: version
                        });
                    }
                    // Add to new registry
                    newRegistry.set(skillName, {
                        name: skillName,
                        version,
                        installedAt: existingEntry?.installedAt || Date.now(),
                        source: 'local',
                        path: child.resource.fsPath
                    });
                }
                catch (error) {
                    // Skip invalid skills
                    console.warn(`Failed to parse skill ${skillName}:`, error);
                }
            }
            // Remaining skills in currentSkills were removed
            const removed = Array.from(currentSkills.values()).map(entry => ({
                name: entry.name,
                oldVersion: entry.version,
                newVersion: null
            }));
            // Save updated registry
            await this.saveRegistry(newRegistry);
            this.registryCache = newRegistry;
            return {
                updated,
                new: newSkills,
                removed,
                unchanged,
                total: newRegistry.size
            };
        }
        catch (error) {
            throw new Error(`Failed to refresh skills: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Clear the registry cache to force reload
     */
    clearCache() {
        this.registryCache = null;
    }
    /**
     * Load registry from file or create if doesn't exist
     */
    async loadRegistry() {
        // Return cache if available
        if (this.registryCache) {
            return new Map(this.registryCache);
        }
        try {
            // Check if registry file exists
            const stat = await this.fileService.resolve(this.registryFile);
            if (!stat) {
                return new Map();
            }
            // Read registry file
            const content = await this.fileService.readFile(this.registryFile);
            const registryData = JSON.parse(content.value.toString());
            // Convert to Map
            const registry = new Map();
            for (const [name, entry] of Object.entries(registryData)) {
                registry.set(name, entry);
            }
            // Cache the registry
            this.registryCache = registry;
            return new Map(registry);
        }
        catch (error) {
            // If file doesn't exist or is invalid, return empty registry
            return new Map();
        }
    }
    /**
     * Save registry to file
     */
    async saveRegistry(registry) {
        // Ensure skills directory exists
        await this.ensureDirectoryExists(this.skillsDir);
        // Convert Map to plain object
        const registryData = {};
        for (const [name, entry] of registry.entries()) {
            registryData[name] = entry;
        }
        // Write to file
        const content = JSON.stringify(registryData, null, 2);
        await this.fileService.writeFile(this.registryFile, VSBuffer.fromString(content));
    }
    /**
     * Ensure a directory exists, create if it doesn't
     */
    async ensureDirectoryExists(uri) {
        try {
            const stat = await this.fileService.resolve(uri);
            if (!stat) {
                await this.fileService.createFolder(uri);
            }
        }
        catch (error) {
            // Directory doesn't exist, create it
            await this.fileService.createFolder(uri);
        }
    }
};
SkillsRegistry = __decorate([
    __param(0, IFileService),
    __param(1, ISkillParser),
    __param(2, INativeEnvironmentService)
], SkillsRegistry);
// Export the class for testing
export { SkillsRegistry };
// Register the service with dependency injection
registerSingleton(ISkillsRegistry, SkillsRegistry, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvc2tpbGxzUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0sNERBQTRELENBQUM7QUFDbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQWdFLE1BQU0seUJBQXlCLENBQUM7QUFDeEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTlEOzs7O0dBSUc7QUFDSCxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTtJQU90QyxZQUNlLFdBQTBDLEVBQzFDLFdBQTBDLEVBQzdCLFVBQXNEO1FBRWpGLEtBQUssRUFBRSxDQUFDO1FBSnVCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ1osZUFBVSxHQUFWLFVBQVUsQ0FBMkI7UUFMMUUsa0JBQWEsR0FBc0MsSUFBSSxD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
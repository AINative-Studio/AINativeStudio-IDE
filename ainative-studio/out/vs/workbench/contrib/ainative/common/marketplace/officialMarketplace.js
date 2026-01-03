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
var OfficialMarketplace_1;
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ISkillsRegistry } from '../skills/skillRegistryTypes.js';
import { IOfficialMarketplace } from './officialMarketplaceTypes.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
const execAsync = promisify(exec);
/**
 * Official Marketplace Service Implementation
 * Fetches and installs skills from NPM registry under @ainative/skill-* namespace
 */
let OfficialMarketplace = class OfficialMarketplace extends Disposable {
    static { OfficialMarketplace_1 = this; }
    static { this.NPM_REGISTRY_URL = 'https://registry.npmjs.org/-/v1/search'; }
    static { this.PACKAGE_PREFIX = '@ainative/skill-'; }
    static { this.CACHE_TTL = 24 * 60 * 60 * 1000; } // 24 hours in milliseconds
    static { this.MAX_PACKAGES = 250; }
    constructor(fileService, registry, _envService) {
        super();
        this.fileService = fileService;
        this.registry = registry;
        const homeDir = os.homedir();
        this.cacheDir = path.join(homeDir, '.ainative', 'cache', 'marketplace');
        this.skillsDir = path.join(homeDir, '.ainative', 'skills');
    }
    /**
     * Fetch all @ainative/skill-* packages from NPM registry
     */
    async fetchSkills(forceRefresh = false) {
        try {
            // Clear cache if force refresh
            if (forceRefresh) {
                await this.clearCache();
            }
            // Try to load from cache first
            const cached = await this.loadCache();
            if (cached) {
                return cached;
            }
            // Fetch from NPM registry
            const packages = await this.getNpmPackages();
            const skills = packages.map(pkg => this.transformNpmPackage(pkg));
            // Cache the results
            await this.saveCache(skills);
            return skills;
        }
        catch (error) {
            // On network error, try to return stale cache
            const staleCache = await this.loadCache(true);
            if (staleCache) {
                console.warn('Using stale cache due to network error:', error);
                return staleCache;
            }
            throw new Error(`Failed to fetch skills from NPM registry: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get detailed information about a specific skill
     */
    async getSkillDetails(skillName) {
        const allSkills = await this.fetchSkills();
        const fullPackageName = this.getFullPackageName(skillName);
        return allSkills.find(skill => skill.name === fullPackageName) || null;
    }
    /**
     * Check if cache is valid
     */
    async isCacheValid() {
        const status = await this.getCacheStatus();
        return status.valid;
    }
    /**
     * Install a skill from the NPM registry
     */
    async install(skillName, version) {
        const packageName = this.getFullPackageName(skillName);
        const versionSpec = version || 'latest';
        const fullPackage = `${packageName}@${versionSpec}`;
        try {
            // Step 1: Check if already installed
            const isInstalled = await this.registry.isInstalled(skillName);
            if (isInstalled) {
                throw new Error(`Skill "${skillName}" is already installed. Use update() to upgrade.`);
            }
            // Step 2: Install globally using npm
            console.log(`Installing ${fullPackage} globally...`);
            await execAsync(`npm install -g ${fullPackage}`, { timeout: 60000 });
            // Step 3: Find the installed package in global node_modules
            const globalNodeModules = await this.getGlobalNodeModules();
            const installedPackagePath = path.join(globalNodeModules, packageName);
            // Step 4: Copy to local skills directory
            const targetPath = path.join(this.skillsDir, skillName);
            await this.copyDirectory(installedPackagePath, targetPath);
            // Step 5: Register with SkillsRegistry
            await this.registry.install(targetPath);
            console.log(`Successfully installed skill "${skillName}" from NPM`);
        }
        catch (error) {
            throw new Error(`Failed to install skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Update an installed skill to the latest version
     */
    async update(skillName) {
        try {
            // Step 1: Check if installed
            const isInstalled = await this.registry.isInstalled(skillName);
            if (!isInstalled) {
                throw new Error(`Skill "${skillName}" is not installed`);
            }
            // Step 2: Uninstall current version
            await this.registry.uninstall(skillName);
            // Step 3: Install latest version
            await this.install(skillName, 'latest');
            console.log(`Successfully updated skill "${skillName}"`);
        }
        catch (error) {
            throw new Error(`Failed to update skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Search for skills by query
     */
    async search(query) {
        const allSkills = await this.fetchSkills();
        const lowerQuery = query.toLowerCase();
        return allSkills.filter(skill => {
            return (skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                skill.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)));
        });
    }
    /**
     * Clear the cache and force refresh
     */
    async clearCache() {
        const cacheFile = path.join(this.cacheDir, 'official.json');
        const cacheUri = URI.file(cacheFile);
        try {
            await this.fileService.del(cacheUri);
            console.log('Cache cleared successfully');
        }
        catch (error) {
            // Ignore if cache doesn't exist
            if (error instanceof Error && !error.message.includes('ENOENT')) {
                throw error;
            }
        }
    }
    /**
     * Get cache status
     */
    async getCacheStatus() {
        const cacheFile = path.join(this.cacheDir, 'official.json');
        const cacheUri = URI.file(cacheFile);
        try {
            const fileContent = await this.fileService.readFile(cacheUri);
            const cacheData = JSON.parse(fileContent.value.toString());
            const age = Date.now() - cacheData.timestamp;
            const valid = age < cacheData.ttl;
            return {
                valid,
                age,
                lastUpdate: new Date(cacheData.timestamp)
            };
        }
        catch (error) {
            return {
                valid: false,
                age: 0,
                lastUpdate: null
            };
        }
    }
    /**
     * Fetch packages from NPM registry API
     */
    async getNpmPackages() {
        const searchUrl = `${OfficialMarketplace_1.NPM_REGISTRY_URL}?text=${OfficialMarketplace_1.PACKAGE_PREFIX}&size=${OfficialMarketplace_1.MAX_PACKAGES}`;
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`NPM registry returned status ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        // Filter to only include @ainative/skill-* packages
        return data.objects.filter(obj => obj.package.name.startsWith(OfficialMarketplace_1.PACKAGE_PREFIX));
    }
    /**
     * Transform NPM package to MarketplaceSkill
     */
    transformNpmPackage(pkgObj) {
        const pkg = pkgObj.package;
        const score = pkgObj.score;
        // Determine source based on author
        let source = 'community';
        if (pkg.author?.name?.toLowerCase().includes('ainative')) {
            source = 'official';
        }
        else if (pkg.author?.name?.toLowerCase().includes('anthropic')) {
            source = 'anthropic';
        }
        return {
            name: pkg.name,
            description: pkg.description || 'No description available',
            version: pkg.version,
            source,
            author: pkg.author?.name || pkg.publisher?.username || 'Unknown',
            keywords: pkg.keywords || [],
            rating: score.detail.quality * 5, // Convert 0-1 to 0-5 scale
            downloads: undefined, // NPM search API doesn't provide this
            updatedAt: new Date(pkg.date),
            installCommand: `npm install -g ${pkg.name}@${pkg.version}`,
            homepage: pkg.links.homepage,
            repository: pkg.links.repository
        };
    }
    /**
     * Get the full NPM package name from short skill name
     */
    getFullPackageName(skillName) {
        if (skillName.startsWith('@ainative/skill-')) {
            return skillName;
        }
        return `${OfficialMarketplace_1.PACKAGE_PREFIX}${skillName}`;
    }
    /**
     * Get global node_modules directory
     */
    async getGlobalNodeModules() {
        try {
            const { stdout } = await execAsync('npm root -g');
            return stdout.trim();
        }
        catch (error) {
            // Fallback to common locations
            const platform = os.platform();
            if (platform === 'win32') {
                return path.join(process.env.APPDATA || '', 'npm', 'node_modules');
            }
            else {
                // Unix-like systems
                const homeDir = os.homedir();
                // Try common NVM path first
                const nvmPath = path.join(homeDir, '.nvm', 'versions', 'node');
                return path.join(nvmPath, 'lib', 'node_modules');
            }
        }
    }
    /**
     * Copy directory recursively using file service
     */
    async copyDirectory(source, target) {
        const sourceUri = URI.file(source);
        const targetUri = URI.file(target);
        try {
            // Ensure target directory exists
            await this.fileService.createFolder(targetUri);
            // Read source directory
            const entries = await this.fileService.resolve(sourceUri);
            if (!entries.children) {
                throw new Error('Source is not a directory');
            }
            // Copy each entry
            for (const entry of entries.children) {
                const targetPath = path.join(target, entry.name);
                const targetEntryUri = URI.file(targetPath);
                if (entry.isDirectory) {
                    // Recursively copy subdirectory
                    await this.copyDirectory(entry.resource.fsPath, targetPath);
                }
                else {
                    // Copy file
                    const content = await this.fileService.readFile(entry.resource);
                    await this.fileService.writeFile(targetEntryUri, content.value);
                }
            }
        }
        catch (error) {
            throw new Error(`Failed to copy directory from ${source} to ${target}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Load skills from cache
     */
    async loadCache(allowStale = false) {
        const cacheFile = path.join(this.cacheDir, 'official.json');
        const cacheUri = URI.file(cacheFile);
        try {
            const fileContent = await this.fileService.readFile(cacheUri);
            const cacheData = JSON.parse(fileContent.value.toString());
            const age = Date.now() - cacheData.timestamp;
            if (allowStale || age < cacheData.ttl) {
                // Parse dates from JSON strings
                return cacheData.skills.map(skill => ({
                    ...skill,
                    updatedAt: new Date(skill.updatedAt)
                }));
            }
            return null;
        }
        catch (error) {
            // Cache doesn't exist or is invalid
            return null;
        }
    }
    /**
     * Save skills to cache
     */
    async saveCache(skills) {
        const cacheFile = path.join(this.cacheDir, 'official.json');
        const cacheUri = URI.file(cacheFile);
        const cacheDir = URI.file(this.cacheDir);
        try {
            // Ensure cache directory exists
            await this.fileService.createFolder(cacheDir);
            const cacheData = {
                skills,
                timestamp: Date.now(),
                ttl: OfficialMarketplace_1.CACHE_TTL
            };
            const content = JSON.stringify(cacheData, null, 2);
            await this.fileService.writeFile(cacheUri, VSBuffer.fromString(content));
        }
        catch (error) {
            console.warn('Failed to save cache:', error);
            // Non-fatal - continue even if caching fails
        }
    }
};
OfficialMarketplace = OfficialMarketplace_1 = __decorate([
    __param(0, IFileService),
    __param(1, ISkillsRegistry),
    __param(2, IEnvironmentService)
], OfficialMarketplace);
// Register the service
registerSingleton(IOfficialMarketplace, OfficialMarketplace, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmaWNpYWxNYXJrZXRwbGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL21hcmtldHBsYWNlL29mZmljaWFsTWFya2V0cGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDakMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBUXJFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLDREQUE0RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFbEM7OztHQUdHO0FBQ0gsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVOzthQUduQixxQkFBZ0IsR0FBRyx3Q0FBd0MsQUFBM0MsQ0FBNEM7YUFDNUQsbUJBQWMsR0FBRyxrQkFBa0IsQUFBckIsQ0FBc0I7YUFDcEMsY0FBUyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQUFBdEIsQ0FBdUIsR0FBQywyQkFBMkI7YUFDNUQsaUJBQVksR0FBRyxHQUFHLEFBQU4sQ0FBTztJQUszQyxZQUNnQyxXQUF5QixFQUN0QixRQUF5QixFQUN0QyxXQUFnQztRQUVyRCxLQUFLLEVBQUUsQ0FBQztRQUp1QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN0QixhQUFRLEdBQVIsUUFBUSxDQUFpQjtRQUkzRCxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFHLEtBQUs7UUFDckMsSUFBSSxDQUFDO1lBQ0osK0JBQStCO1lBQy9CLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3pCLENBQUM7WUFFRCwrQkFBK0I7WUFDL0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7WUFFRCwwQkFBMEI7WUFDMUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDN0MsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWxFLG9CQUFvQjtZQUNwQixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0IsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQiw4Q0FBOEM7WUFDOUMsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQy9ELE9BQU8sVUFBVSxDQUFDO1lBQ25CLENBQUM7WUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hILENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZUFBZSxDQUFDLFNBQWlCO1FBQ3RDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUzRCxPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUN4RSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsWUFBWTtRQUNqQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMzQyxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLE9BQWdCO1FBQ2hELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2RCxNQUFNLFdBQVcsR0FBRyxPQUFPLElBQUksUUFBUSxDQUFDO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLEdBQUcsV0FBVyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBRXBELElBQUksQ0FBQztZQUNKLHFDQUFxQztZQUNyQyxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9ELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsVUFBVSxTQUFTLGtEQUFrRCxDQUFDLENBQUM7WUFDeEYsQ0FBQztZQUVELHFDQUFxQztZQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsV0FBVyxjQUFjLENBQUMsQ0FBQztZQUNyRCxNQUFNLFNBQVMsQ0FBQyxrQkFBa0IsV0FBVyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUVyRSw0REFBNEQ7WUFDNUQsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUV2RSx5Q0FBeUM7WUFDekMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUUzRCx1Q0FBdUM7WUFDdkMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUV4QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxTQUFTLFlBQVksQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLFNBQVMsTUFBTSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RILENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQWlCO1FBQzdCLElBQUksQ0FBQztZQUNKLDZCQUE2QjtZQUM3QixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLFNBQVMsb0JBQW9CLENBQUMsQ0FBQztZQUMxRCxDQUFDO1lBRUQsb0NBQW9DO1lBQ3BDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFekMsaUNBQWlDO1lBQ2pDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFFeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixTQUFTLE1BQU0sS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNySCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFhO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV2QyxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDL0IsT0FBTyxDQUNOLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFDN0MsS0FBSyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO2dCQUNwRCxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FDaEUsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVU7UUFDZixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDNUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVyQyxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixnQ0FBZ0M7WUFDaEMsSUFBSSxLQUFLLFlBQVksS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDakUsTUFBTSxLQUFLLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjO1FBQ25CLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM1RCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXJDLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUQsTUFBTSxTQUFTLEdBQXlCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBRWpGLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQzdDLE1BQU0sS0FBSyxHQUFHLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDO1lBRWxDLE9BQU87Z0JBQ04sS0FBSztnQkFDTCxHQUFHO2dCQUNILFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO2FBQ3pDLENBQUM7UUFDSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNOLEtBQUssRUFBRSxLQUFLO2dCQUNaLEdBQUcsRUFBRSxDQUFDO2dCQUNOLFVBQVUsRUFBRSxJQUFJO2FBQ2hCLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLGNBQWM7UUFDM0IsTUFBTSxTQUFTLEdBQUcsR0FBRyxxQkFBbUIsQ0FBQyxnQkFBZ0IsU0FBUyxxQkFBbUIsQ0FBQyxjQUFjLFNBQVMscUJBQW1CLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFaEosTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxRQUFRLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQzVGLENBQUM7UUFFRCxNQUFNLElBQUksR0FBc0IsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFdEQsb0RBQW9EO1FBQ3BELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FDaEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFtQixDQUFDLGNBQWMsQ0FBQyxDQUMvRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssbUJBQW1CLENBQUMsTUFBd0I7UUFDbkQsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUMzQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBRTNCLG1DQUFtQztRQUNuQyxJQUFJLE1BQU0sR0FBc0IsV0FBVyxDQUFDO1FBQzVDLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDMUQsTUFBTSxHQUFHLFVBQVUsQ0FBQztRQUNyQixDQUFDO2FBQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxNQUFNLEdBQUcsV0FBVyxDQUFDO1FBQ3RCLENBQUM7UUFFRCxPQUFPO1lBQ04sSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXLElBQUksMEJBQTBCO1lBQzFELE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTztZQUNwQixNQUFNO1lBQ04sTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxJQUFJLFNBQVM7WUFDaEUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLElBQUksRUFBRTtZQUM1QixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLDJCQUEyQjtZQUM3RCxTQUFTLEVBQUUsU0FBUyxFQUFFLHNDQUFzQztZQUM1RCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUM3QixjQUFjLEVBQUUsa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRTtZQUMzRCxRQUFRLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRO1lBQzVCLFVBQVUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVU7U0FDaEMsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGtCQUFrQixDQUFDLFNBQWlCO1FBQzNDLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7WUFDOUMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sR0FBRyxxQkFBbUIsQ0FBQyxjQUFjLEdBQUcsU0FBUyxFQUFFLENBQUM7SUFDNUQsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLG9CQUFvQjtRQUNqQyxJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDbEQsT0FBTyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsK0JBQStCO1lBQy9CLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMvQixJQUFJLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDcEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG9CQUFvQjtnQkFDcEIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM3Qiw0QkFBNEI7Z0JBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9ELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFjLEVBQUUsTUFBYztRQUN6RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkMsSUFBSSxDQUFDO1lBQ0osaUNBQWlDO1lBQ2pDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFL0Msd0JBQXdCO1lBQ3hCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQzlDLENBQUM7WUFFRCxrQkFBa0I7WUFDbEIsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakQsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFNUMsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ3ZCLGdDQUFnQztvQkFDaEMsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsWUFBWTtvQkFDWixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDaEUsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNqRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLE1BQU0sT0FBTyxNQUFNLEtBQUssS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwSSxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsS0FBSztRQUN6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDNUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVyQyxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlELE1BQU0sU0FBUyxHQUF5QixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUVqRixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQztZQUU3QyxJQUFJLFVBQVUsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUN2QyxnQ0FBZ0M7Z0JBQ2hDLE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxHQUFHLEtBQUs7b0JBQ1IsU0FBUyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7aUJBQ3BDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsb0NBQW9DO1lBQ3BDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBMEI7UUFDakQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzVELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDO1lBQ0osZ0NBQWdDO1lBQ2hDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFOUMsTUFBTSxTQUFTLEdBQXlCO2dCQUN2QyxNQUFNO2dCQUNOLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNyQixHQUFHLEVBQUUscUJBQW1CLENBQUMsU0FBUzthQUNsQyxDQUFDO1lBRUYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzdDLDZDQUE2QztRQUM5QyxDQUFDO0lBQ0YsQ0FBQzs7QUE5V0ksbUJBQW1CO0lBWXRCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0dBZGhCLG1CQUFtQixDQStXeEI7QUFFRCx1QkFBdUI7QUFDdkIsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLG9DQUE0QixDQUFDIn0=
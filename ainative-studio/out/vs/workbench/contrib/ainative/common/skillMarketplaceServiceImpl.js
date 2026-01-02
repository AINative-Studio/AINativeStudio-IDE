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
import { IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { URI } from '../../../../base/common/uri.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import * as semver from 'semver';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ISkillMarketplaceService } from './skillMarketplaceService.js';
/**
 * Storage keys for marketplace data
 */
var StorageKeys;
(function (StorageKeys) {
    StorageKeys["InstalledSkills"] = "skillMarketplace.installedSkills";
    StorageKeys["CacheData"] = "skillMarketplace.cache";
    StorageKeys["RegistryConfigs"] = "skillMarketplace.registryConfigs";
})(StorageKeys || (StorageKeys = {}));
/**
 * Default registry configurations
 */
const DEFAULT_REGISTRIES = [
    {
        type: 'official',
        url: 'https://registry.ainative.studio/v1/skills',
        displayName: 'AINative Official',
        enabled: true,
        cacheTTL: 3600, // 1 hour
    },
    {
        type: 'anthropic',
        url: 'https://registry.anthropic.com/skills',
        displayName: 'Anthropic Skills',
        enabled: true,
        cacheTTL: 3600,
    },
    {
        type: 'community',
        url: 'https://community.ainative.studio/skills',
        displayName: 'Community Skills',
        enabled: true,
        cacheTTL: 1800, // 30 minutes
    },
];
/**
 * Skills installation directory
 */
const SKILLS_DIRECTORY = '.ainative/skills';
/**
 * Implementation of the Skills Marketplace Service
 */
let SkillMarketplaceService = class SkillMarketplaceService extends Disposable {
    constructor(fileService, storageService, requestService, logService) {
        super();
        this.fileService = fileService;
        this.storageService = storageService;
        this.requestService = requestService;
        this.logService = logService;
        // Registries configuration
        this.registries = new Map();
        // Cache for registry data
        this.cache = new Map();
        // Installed skills tracking
        this.installedSkills = new Map();
        // Events
        this._onInstallProgress = this._register(new Emitter());
        this.onInstallProgress = this._onInstallProgress.event;
        this._onSkillInstalled = this._register(new Emitter());
        this.onSkillInstalled = this._onSkillInstalled.event;
        this._onSkillUninstalled = this._register(new Emitter());
        this.onSkillUninstalled = this._onSkillUninstalled.event;
        this._onSkillUpdated = this._register(new Emitter());
        this.onSkillUpdated = this._onSkillUpdated.event;
        this._onUpdatesAvailable = this._register(new Emitter());
        this.onUpdatesAvailable = this._onUpdatesAvailable.event;
        this.initialize();
    }
    /**
     * Initialize the service
     */
    async initialize() {
        // Load registry configs
        this.loadRegistries();
        // Load installed skills
        this.loadInstalledSkills();
        // Load cache
        this.loadCache();
        this.logService.info('[SkillMarketplace] Service initialized');
    }
    // ========================================
    // Registry Management
    // ========================================
    getRegistries() {
        return Array.from(this.registries.values());
    }
    getRegistry(registry) {
        return this.registries.get(registry);
    }
    async updateRegistry(registry, config) {
        const current = this.registries.get(registry);
        if (!current) {
            throw new Error(`Registry ${registry} not found`);
        }
        const updated = { ...current, ...config };
        this.registries.set(registry, updated);
        this.saveRegistries();
        this.logService.info(`[SkillMarketplace] Updated registry ${registry}`);
    }
    async testRegistry(registry) {
        const config = this.registries.get(registry);
        if (!config) {
            return { connected: false, error: 'Registry not found' };
        }
        const startTime = Date.now();
        try {
            const response = await this.requestService.request({
                url: `${config.url}/health`,
                type: 'GET',
            }, CancellationToken.None);
            if (response.res.statusCode === 200) {
                return {
                    connected: true,
                    latency: Date.now() - startTime,
                };
            }
            else {
                return {
                    connected: false,
                    error: `HTTP ${response.res.statusCode}`,
                };
            }
        }
        catch (error) {
            return {
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    // ========================================
    // Skill Discovery
    // ========================================
    async searchSkills(filters = {}) {
        const { query = '', registry, tags = [], author, minRating, sortBy = 'downloads', sortOrder = 'desc', offset = 0, limit = 20, } = filters;
        // Determine which registries to search
        const registriesToSearch = registry
            ? [registry]
            : Array.from(this.registries.keys()).filter(r => this.registries.get(r)?.enabled);
        // Search all registries and combine results
        const allResults = [];
        for (const reg of registriesToSearch) {
            try {
                const results = await this.searchRegistry(reg, {
                    query,
                    tags,
                    author,
                    minRating,
                });
                allResults.push(...results);
            }
            catch (error) {
                this.logService.error(`[SkillMarketplace] Error searching registry ${reg}:`, error);
            }
        }
        // Apply filtering
        let filtered = allResults;
        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(skill => skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery)));
        }
        if (tags.length > 0) {
            filtered = filtered.filter(skill => tags.some(tag => skill.tags.includes(tag)));
        }
        if (author) {
            filtered = filtered.filter(skill => skill.author === author);
        }
        if (minRating !== undefined) {
            filtered = filtered.filter(skill => skill.metadata.rating >= minRating);
        }
        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'downloads':
                    comparison = a.metadata.downloads - b.metadata.downloads;
                    break;
                case 'rating':
                    comparison = a.metadata.rating - b.metadata.rating;
                    break;
                case 'updated':
                    comparison = new Date(a.metadata.updated).getTime() - new Date(b.metadata.updated).getTime();
                    break;
                case 'created':
                    comparison = new Date(a.metadata.created).getTime() - new Date(b.metadata.created).getTime();
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        // Apply pagination
        const total = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);
        return {
            results: paginated,
            total,
            offset,
            limit,
            hasMore: offset + limit < total,
        };
    }
    async getSkillDetails(name, registry) {
        const registriesToSearch = registry
            ? [registry]
            : Array.from(this.registries.keys()).filter(r => this.registries.get(r)?.enabled);
        for (const reg of registriesToSearch) {
            try {
                const cacheKey = `skill:${reg}:${name}`;
                const cached = this.getCached(cacheKey);
                if (cached) {
                    return cached;
                }
                const config = this.registries.get(reg);
                if (!config) {
                    continue;
                }
                const response = await this.requestService.request({
                    url: `${config.url}/packages/${name}`,
                    type: 'GET',
                }, CancellationToken.None);
                if (response.res.statusCode === 200) {
                    const buffer = await this.readResponse(response);
                    const skillPackage = JSON.parse(buffer.toString());
                    // Cache the result
                    this.setCached(cacheKey, skillPackage, config.cacheTTL);
                    return skillPackage;
                }
            }
            catch (error) {
                this.logService.error(`[SkillMarketplace] Error fetching skill ${name} from ${reg}:`, error);
            }
        }
        return undefined;
    }
    async getSkillVersions(name, registry) {
        const registriesToSearch = registry
            ? [registry]
            : Array.from(this.registries.keys()).filter(r => this.registries.get(r)?.enabled);
        for (const reg of registriesToSearch) {
            try {
                const config = this.registries.get(reg);
                if (!config) {
                    continue;
                }
                const response = await this.requestService.request({
                    url: `${config.url}/packages/${name}/versions`,
                    type: 'GET',
                }, CancellationToken.None);
                if (response.res.statusCode === 200) {
                    const buffer = await this.readResponse(response);
                    const versions = JSON.parse(buffer.toString());
                    return versions.sort((a, b) => semver.rcompare(a, b)); // Sort by semver, newest first
                }
            }
            catch (error) {
                this.logService.error(`[SkillMarketplace] Error fetching versions for ${name} from ${reg}:`, error);
            }
        }
        return [];
    }
    async browseByTag(tag, registry) {
        return this.searchSkills({ tags: [tag], registry });
    }
    async getTags(registry) {
        const registriesToSearch = registry
            ? [registry]
            : Array.from(this.registries.keys()).filter(r => this.registries.get(r)?.enabled);
        const tagCounts = new Map();
        for (const reg of registriesToSearch) {
            try {
                const config = this.registries.get(reg);
                if (!config) {
                    continue;
                }
                const response = await this.requestService.request({
                    url: `${config.url}/tags`,
                    type: 'GET',
                }, CancellationToken.None);
                if (response.res.statusCode === 200) {
                    const buffer = await this.readResponse(response);
                    const tags = JSON.parse(buffer.toString());
                    for (const { tag: t, count } of tags) {
                        tagCounts.set(t, (tagCounts.get(t) || 0) + count);
                    }
                }
            }
            catch (error) {
                this.logService.error(`[SkillMarketplace] Error fetching tags from ${reg}:`, error);
            }
        }
        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }
    // ========================================
    // Installation & Management
    // ========================================
    async installSkill(name, registry, options = {}) {
        this.logService.info(`[SkillMarketplace] Installing skill ${name}...`);
        // Check if already installed
        const existing = this.installedSkills.get(name);
        if (existing && !options.force) {
            throw new Error(`Skill ${name} is already installed. Use force option to reinstall.`);
        }
        // Get skill details
        this._emitProgress(name, 'downloading', 0, 'Fetching skill information...');
        const skillPackage = await this.getSkillDetails(name, registry);
        if (!skillPackage) {
            throw new Error(`Skill ${name} not found`);
        }
        // Use specified version or latest
        const targetVersion = options.version || skillPackage.version;
        // Validate package
        this._emitProgress(name, 'verifying', 20, 'Validating skill package...');
        const validation = await this.validateSkillPackage(skillPackage);
        if (!validation.valid) {
            throw new Error(`Invalid skill package: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        // Resolve dependencies
        if (!options.skipDependencies && skillPackage.dependencies && skillPackage.dependencies.length > 0) {
            this._emitProgress(name, 'downloading', 30, 'Resolving dependencies...');
            const resolution = await this.resolveDependencies(name, targetVersion, skillPackage.registry);
            // Install dependencies first
            for (const dep of resolution.installOrder) {
                if (dep.name === name) {
                    continue; // Skip self
                }
                const depInstalled = this.installedSkills.get(dep.name);
                if (!depInstalled) {
                    await this.installSkill(dep.name, dep.registry, { skipDependencies: true });
                }
            }
        }
        // Download skill files
        this._emitProgress(name, 'downloading', 60, 'Downloading skill files...');
        const skillPath = await this.downloadSkillFiles(skillPackage);
        // Install
        this._emitProgress(name, 'installing', 90, 'Installing skill...');
        const installed = {
            package: skillPackage,
            path: skillPath,
            installedAt: new Date().toISOString(),
            pinned: false,
        };
        this.installedSkills.set(name, installed);
        this.saveInstalledSkills();
        this._emitProgress(name, 'complete', 100, 'Installation complete');
        this._onSkillInstalled.fire(installed);
        this.logService.info(`[SkillMarketplace] Successfully installed ${name}`);
        return installed;
    }
    async uninstallSkill(name, removeData = false) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            return false;
        }
        try {
            // Remove skill files
            const skillUri = URI.file(installed.path);
            await this.fileService.del(skillUri, { recursive: true });
            // Remove from tracking
            this.installedSkills.delete(name);
            this.saveInstalledSkills();
            this._onSkillUninstalled.fire(name);
            this.logService.info(`[SkillMarketplace] Uninstalled ${name}`);
            return true;
        }
        catch (error) {
            this.logService.error(`[SkillMarketplace] Error uninstalling ${name}:`, error);
            return false;
        }
    }
    async updateSkill(name, version) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            throw new Error(`Skill ${name} is not installed`);
        }
        const targetVersion = version || (await this.getSkillVersions(name, installed.package.registry))[0];
        if (semver.eq(installed.package.version, targetVersion)) {
            return installed; // Already at target version
        }
        // Uninstall and reinstall
        await this.uninstallSkill(name);
        const updated = await this.installSkill(name, installed.package.registry, { version: targetVersion });
        this._onSkillUpdated.fire(updated);
        return updated;
    }
    async getInstalledSkills() {
        return Array.from(this.installedSkills.values());
    }
    async getInstalledSkill(name) {
        return this.installedSkills.get(name);
    }
    async pinSkill(name, pinned) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            throw new Error(`Skill ${name} is not installed`);
        }
        installed.pinned = pinned;
        this.installedSkills.set(name, installed);
        this.saveInstalledSkills();
    }
    // ========================================
    // Updates & Version Management
    // ========================================
    async checkUpdates(includePrerelease = false) {
        const updates = [];
        for (const [name, installed] of this.installedSkills) {
            if (installed.pinned) {
                continue;
            }
            const update = await this.checkSkillUpdate(name, includePrerelease);
            if (update) {
                updates.push(update);
            }
        }
        if (updates.length > 0) {
            this._onUpdatesAvailable.fire(updates);
        }
        return updates;
    }
    async checkSkillUpdate(name, includePrerelease = false) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            return undefined;
        }
        const versions = await this.getSkillVersions(name, installed.package.registry);
        const latest = versions.find(v => includePrerelease || !semver.prerelease(v));
        if (!latest || semver.lte(latest, installed.package.version)) {
            return undefined;
        }
        const currentMajor = semver.major(installed.package.version);
        const latestMajor = semver.major(latest);
        const currentMinor = semver.minor(installed.package.version);
        const latestMinor = semver.minor(latest);
        return {
            name,
            currentVersion: installed.package.version,
            latestVersion: latest,
            isBreaking: latestMajor > currentMajor,
            isFeature: latestMajor === currentMajor && latestMinor > currentMinor,
            isPatch: latestMajor === currentMajor && latestMinor === currentMinor,
        };
    }
    async updateAllSkills(skipBreaking = false) {
        const updates = await this.checkUpdates();
        const updated = [];
        for (const update of updates) {
            if (skipBreaking && update.isBreaking) {
                continue;
            }
            try {
                const result = await this.updateSkill(update.name, update.latestVersion);
                updated.push(result);
            }
            catch (error) {
                this.logService.error(`[SkillMarketplace] Error updating ${update.name}:`, error);
            }
        }
        return updated;
    }
    async rollbackSkill(name, version) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            throw new Error(`Skill ${name} is not installed`);
        }
        const versions = await this.getSkillVersions(name, installed.package.registry);
        if (!versions.includes(version)) {
            throw new Error(`Version ${version} not found for skill ${name}`);
        }
        return this.updateSkill(name, version);
    }
    // ========================================
    // Dependency Management
    // ========================================
    async resolveDependencies(name, version, registry) {
        const tree = [];
        const installOrder = [];
        const warnings = [];
        const visited = new Set();
        const resolve = async (skillName, skillVersion, skillRegistry, depth, optional) => {
            const key = `${skillName}@${skillVersion}`;
            if (visited.has(key)) {
                warnings.push(`Circular dependency detected: ${key}`);
                return {
                    name: skillName,
                    version: skillVersion,
                    registry: skillRegistry || 'community',
                    dependencies: [],
                    optional,
                    depth,
                };
            }
            visited.add(key);
            const skillPackage = await this.getSkillDetails(skillName, skillRegistry);
            if (!skillPackage) {
                if (!optional) {
                    throw new Error(`Dependency ${skillName} not found`);
                }
                warnings.push(`Optional dependency ${skillName} not found`);
                return {
                    name: skillName,
                    version: skillVersion,
                    registry: skillRegistry || 'community',
                    dependencies: [],
                    optional,
                    depth,
                };
            }
            const node = {
                name: skillName,
                version: skillPackage.version,
                registry: skillPackage.registry,
                dependencies: [],
                optional,
                depth,
            };
            installOrder.push({
                name: skillName,
                version: skillPackage.version,
                registry: skillPackage.registry,
            });
            if (skillPackage.dependencies) {
                for (const dep of skillPackage.dependencies) {
                    const childNode = await resolve(dep.name, dep.version || '*', dep.registry || skillPackage.registry, depth + 1, dep.optional || false);
                    node.dependencies.push(childNode);
                }
            }
            return node;
        };
        const rootNode = await resolve(name, version, registry, 0, false);
        tree.push(rootNode);
        return {
            tree,
            installOrder,
            warnings,
        };
    }
    async validateDependencies(name) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            return { valid: false, missing: [name], incompatible: [] };
        }
        const missing = [];
        const incompatible = [];
        if (installed.package.dependencies) {
            for (const dep of installed.package.dependencies) {
                const depInstalled = this.installedSkills.get(dep.name);
                if (!depInstalled) {
                    if (!dep.optional) {
                        missing.push(dep.name);
                    }
                    continue;
                }
                if (dep.version && !semver.satisfies(depInstalled.package.version, dep.version)) {
                    incompatible.push(`${dep.name} (requires ${dep.version}, installed ${depInstalled.package.version})`);
                }
            }
        }
        return {
            valid: missing.length === 0 && incompatible.length === 0,
            missing,
            incompatible,
        };
    }
    async getDependencyTree(name) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            return undefined;
        }
        return this.resolveDependencies(name, installed.package.version, installed.package.registry);
    }
    // ========================================
    // Validation & Integrity
    // ========================================
    async validateSkillPackage(skillPackage) {
        const errors = [];
        const warnings = [];
        // Validate name
        if (!skillPackage.name || !/^[a-z0-9-]+$/.test(skillPackage.name)) {
            errors.push({
                field: 'name',
                message: 'Name must be lowercase alphanumeric with hyphens',
                rule: 'format',
            });
        }
        // Validate version
        if (!skillPackage.version || !semver.valid(skillPackage.version)) {
            errors.push({
                field: 'version',
                message: 'Invalid semantic version',
                rule: 'semver',
            });
        }
        // Validate required fields
        if (!skillPackage.description) {
            errors.push({ field: 'description', message: 'Description is required', rule: 'required' });
        }
        if (!skillPackage.author) {
            errors.push({ field: 'author', message: 'Author is required', rule: 'required' });
        }
        // Validate files
        if (!skillPackage.files || !skillPackage.files['skill.md']) {
            errors.push({ field: 'files', message: 'skill.md file is required', rule: 'required' });
        }
        // Warnings
        if (!skillPackage.license) {
            warnings.push({ field: 'license', message: 'License not specified', rule: 'recommended' });
        }
        if (!skillPackage.repository) {
            warnings.push({ field: 'repository', message: 'Repository not specified', rule: 'recommended' });
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    async verifySkillIntegrity(name) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            return false;
        }
        // TODO: Implement file hash verification
        // For now, just check that the skill directory exists
        try {
            const skillUri = URI.file(installed.path);
            const stat = await this.fileService.stat(skillUri);
            return stat.isDirectory;
        }
        catch {
            return false;
        }
    }
    async repairSkill(name) {
        const installed = this.installedSkills.get(name);
        if (!installed) {
            return false;
        }
        try {
            // Reinstall the skill
            await this.installSkill(name, installed.package.registry, {
                force: true,
                version: installed.package.version,
            });
            return true;
        }
        catch (error) {
            this.logService.error(`[SkillMarketplace] Error repairing ${name}:`, error);
            return false;
        }
    }
    // ========================================
    // Publishing (Community Registry)
    // ========================================
    async publishSkill(skillPackage, options) {
        // Validate package
        const validation = await this.validateSkillPackage(skillPackage);
        if (!validation.valid) {
            throw new Error(`Invalid skill package: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        if (options.dryRun) {
            this.logService.info('[SkillMarketplace] Dry run - package is valid');
            return skillPackage;
        }
        const config = this.registries.get('community');
        if (!config) {
            throw new Error('Community registry not configured');
        }
        // TODO: Implement actual publishing to registry
        // This would involve creating a tarball and uploading to the registry
        throw new Error('Publishing not yet implemented');
    }
    async unpublishSkill(name, version, authToken) {
        const config = this.registries.get('community');
        if (!config) {
            throw new Error('Community registry not configured');
        }
        // TODO: Implement unpublishing
        throw new Error('Unpublishing not yet implemented');
    }
    // ========================================
    // Cache Management
    // ========================================
    async clearCache() {
        this.cache.clear();
        this.saveCache();
        this.logService.info('[SkillMarketplace] Cache cleared');
    }
    async clearRegistryCache(registry) {
        const keysToDelete = [];
        for (const [key] of this.cache) {
            if (key.includes(`:${registry}:`)) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            this.cache.delete(key);
        }
        this.saveCache();
        this.logService.info(`[SkillMarketplace] Cleared cache for registry ${registry}`);
    }
    async refreshCache() {
        await this.clearCache();
        // Trigger background refresh for popular skills
        this.logService.info('[SkillMarketplace] Cache refreshed');
    }
    async getCacheStats() {
        let totalSize = 0;
        let lastRefresh = new Date(0).toISOString();
        for (const [, entry] of this.cache) {
            const entrySize = JSON.stringify(entry.data).length;
            totalSize += entrySize;
            const entryDate = new Date(entry.timestamp).toISOString();
            if (entryDate > lastRefresh) {
                lastRefresh = entryDate;
            }
        }
        return {
            size: totalSize,
            entries: this.cache.size,
            hitRate: 0, // TODO: Track cache hits/misses
            lastRefresh,
        };
    }
    // ========================================
    // Private Helper Methods
    // ========================================
    async searchRegistry(registry, filters) {
        const cacheKey = `search:${registry}:${JSON.stringify(filters)}`;
        const cached = this.getCached(cacheKey);
        if (cached) {
            return cached;
        }
        const config = this.registries.get(registry);
        if (!config || !config.enabled) {
            return [];
        }
        try {
            const queryParams = new URLSearchParams();
            if (filters.query) {
                queryParams.set('q', filters.query);
            }
            if (filters.tags && filters.tags.length > 0) {
                queryParams.set('tags', filters.tags.join(','));
            }
            if (filters.author) {
                queryParams.set('author', filters.author);
            }
            if (filters.minRating !== undefined) {
                queryParams.set('minRating', filters.minRating.toString());
            }
            const url = `${config.url}/search?${queryParams.toString()}`;
            const response = await this.requestService.request({
                url,
                type: 'GET',
            }, CancellationToken.None);
            if (response.res.statusCode === 200) {
                const buffer = await this.readResponse(response);
                const results = JSON.parse(buffer.toString());
                // Cache the results
                this.setCached(cacheKey, results, config.cacheTTL);
                return results;
            }
        }
        catch (error) {
            this.logService.error(`[SkillMarketplace] Error searching registry ${registry}:`, error);
        }
        return [];
    }
    async downloadSkillFiles(skillPackage) {
        const skillDir = `${SKILLS_DIRECTORY}/${skillPackage.name}`;
        // TODO: Implement actual file downloading
        // For now, just create the directory structure
        return skillDir;
    }
    getCached(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        const now = Date.now();
        const age = (now - entry.timestamp) / 1000; // age in seconds
        if (age > entry.ttl) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.data;
    }
    setCached(key, data, ttl) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
        this.saveCache();
    }
    _emitProgress(skillName, step, progress, message) {
        this._onInstallProgress.fire({
            skillName,
            step,
            progress,
            message,
        });
    }
    async readResponse(response) {
        const chunks = [];
        for await (const chunk of response.stream) {
            chunks.push(chunk);
        }
        return VSBuffer.concat(chunks.map(c => VSBuffer.wrap(c)));
    }
    // ========================================
    // Persistence
    // ========================================
    loadRegistries() {
        const stored = this.storageService.get("skillMarketplace.registryConfigs" /* StorageKeys.RegistryConfigs */, -1 /* StorageScope.APPLICATION */);
        if (stored) {
            try {
                const configs = JSON.parse(stored);
                for (const config of configs) {
                    this.registries.set(config.type, config);
                }
                return;
            }
            catch (error) {
                this.logService.error('[SkillMarketplace] Error loading registry configs:', error);
            }
        }
        // Load defaults
        for (const config of DEFAULT_REGISTRIES) {
            this.registries.set(config.type, config);
        }
        this.saveRegistries();
    }
    saveRegistries() {
        const configs = Array.from(this.registries.values());
        this.storageService.store("skillMarketplace.registryConfigs" /* StorageKeys.RegistryConfigs */, JSON.stringify(configs), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    loadInstalledSkills() {
        const stored = this.storageService.get("skillMarketplace.installedSkills" /* StorageKeys.InstalledSkills */, -1 /* StorageScope.APPLICATION */);
        if (stored) {
            try {
                const skills = JSON.parse(stored);
                this.installedSkills = new Map(skills);
            }
            catch (error) {
                this.logService.error('[SkillMarketplace] Error loading installed skills:', error);
            }
        }
    }
    saveInstalledSkills() {
        const skills = Array.from(this.installedSkills.entries());
        this.storageService.store("skillMarketplace.installedSkills" /* StorageKeys.InstalledSkills */, JSON.stringify(skills), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    loadCache() {
        const stored = this.storageService.get("skillMarketplace.cache" /* StorageKeys.CacheData */, -1 /* StorageScope.APPLICATION */);
        if (stored) {
            try {
                const cacheData = JSON.parse(stored);
                this.cache = new Map(cacheData);
            }
            catch (error) {
                this.logService.error('[SkillMarketplace] Error loading cache:', error);
            }
        }
    }
    saveCache() {
        const cacheData = Array.from(this.cache.entries());
        this.storageService.store("skillMarketplace.cache" /* StorageKeys.CacheData */, JSON.stringify(cacheData), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
};
SkillMarketplaceService = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IRequestService),
    __param(3, ILogService)
], SkillMarketplaceService);
export { SkillMarketplaceService };
// Register the service
registerSingleton(ISkillMarketplaceService, SkillMarketplaceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxNYXJrZXRwbGFjZVNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxNYXJrZXRwbGFjZVNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQW9CeEU7O0dBRUc7QUFDSCxJQUFXLFdBSVY7QUFKRCxXQUFXLFdBQVc7SUFDckIsbUVBQW9ELENBQUE7SUFDcEQsbURBQW9DLENBQUE7SUFDcEMsbUVBQW9ELENBQUE7QUFDckQsQ0FBQyxFQUpVLFdBQVcsS0FB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
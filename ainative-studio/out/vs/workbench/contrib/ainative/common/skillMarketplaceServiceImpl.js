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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxNYXJrZXRwbGFjZVNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxNYXJrZXRwbGFjZVNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFvQixNQUFNLGtDQUFrQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFvQnhFOztHQUVHO0FBQ0gsSUFBVyxXQUlWO0FBSkQsV0FBVyxXQUFXO0lBQ3JCLG1FQUFvRCxDQUFBO0lBQ3BELG1EQUFvQyxDQUFBO0lBQ3BDLG1FQUFvRCxDQUFBO0FBQ3JELENBQUMsRUFKVSxXQUFXLEtB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
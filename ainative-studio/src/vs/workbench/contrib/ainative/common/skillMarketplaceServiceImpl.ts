/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event as __Event } from '../../../../base/common/event.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { URI } from '../../../../base/common/uri.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import * as semver from 'semver';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ISkillMarketplaceService } from './skillMarketplaceService.js';
import {
	SkillPackage,
	SkillRegistry,
	SkillSearchFilters,
	SkillSearchResponse,
	SkillInstallOptions,
	SkillUpdateInfo,
	InstalledSkill,
	DependencyResolution,
	RegistryConfig,
	SkillValidationResult,
	InstallationProgress,
	SkillPublishOptions,
	CacheEntry,
	DependencyNode,
	SkillSearchResult,
	SkillValidationError,
} from './skillMarketplaceTypes.js';

/**
 * Storage keys for marketplace data
 */
const enum StorageKeys {
	InstalledSkills = 'skillMarketplace.installedSkills',
	CacheData = 'skillMarketplace.cache',
	RegistryConfigs = 'skillMarketplace.registryConfigs',
}

/**
 * Default registry configurations
 */
const DEFAULT_REGISTRIES: RegistryConfig[] = [
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
export class SkillMarketplaceService extends Disposable implements ISkillMarketplaceService {
	_serviceBrand: undefined;

	// Registries configuration
	private registries: Map<SkillRegistry, RegistryConfig> = new Map();

	// Cache for registry data
	private cache: Map<string, CacheEntry<any>> = new Map();

	// Installed skills tracking
	private installedSkills: Map<string, InstalledSkill> = new Map();

	// Events
	private readonly _onInstallProgress = this._register(new Emitter<InstallationProgress>());
	readonly onInstallProgress = this._onInstallProgress.event;

	private readonly _onSkillInstalled = this._register(new Emitter<InstalledSkill>());
	readonly onSkillInstalled = this._onSkillInstalled.event;

	private readonly _onSkillUninstalled = this._register(new Emitter<string>());
	readonly onSkillUninstalled = this._onSkillUninstalled.event;

	private readonly _onSkillUpdated = this._register(new Emitter<InstalledSkill>());
	readonly onSkillUpdated = this._onSkillUpdated.event;

	private readonly _onUpdatesAvailable = this._register(new Emitter<SkillUpdateInfo[]>());
	readonly onUpdatesAvailable = this._onUpdatesAvailable.event;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IStorageService private readonly storageService: IStorageService,
		@IRequestService private readonly requestService: IRequestService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.initialize();
	}

	/**
	 * Initialize the service
	 */
	private async initialize(): Promise<void> {
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

	getRegistries(): RegistryConfig[] {
		return Array.from(this.registries.values());
	}

	getRegistry(registry: SkillRegistry): RegistryConfig | undefined {
		return this.registries.get(registry);
	}

	async updateRegistry(registry: SkillRegistry, config: Partial<RegistryConfig>): Promise<void> {
		const current = this.registries.get(registry);
		if (!current) {
			throw new Error(`Registry ${registry} not found`);
		}

		const updated = { ...current, ...config };
		this.registries.set(registry, updated);
		this.saveRegistries();

		this.logService.info(`[SkillMarketplace] Updated registry ${registry}`);
	}

	async testRegistry(registry: SkillRegistry): Promise<{ connected: boolean; latency?: number; error?: string }> {
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
			} else {
				return {
					connected: false,
					error: `HTTP ${response.res.statusCode}`,
				};
			}
		} catch (error) {
			return {
				connected: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	// ========================================
	// Skill Discovery
	// ========================================

	async searchSkills(filters: SkillSearchFilters = {}): Promise<SkillSearchResponse> {
		const {
			query = '',
			registry,
			tags = [],
			author,
			minRating,
			sortBy = 'downloads',
			sortOrder = 'desc',
			offset = 0,
			limit = 20,
		} = filters;

		// Determine which registries to search
		const registriesToSearch = registry
			? [registry]
			: Array.from(this.registries.keys()).filter(r => this.registries.get(r)?.enabled);

		// Search all registries and combine results
		const allResults: SkillSearchResult[] = [];

		for (const reg of registriesToSearch) {
			try {
				const results = await this.searchRegistry(reg, {
					query,
					tags,
					author,
					minRating,
				});
				allResults.push(...results);
			} catch (error) {
				this.logService.error(`[SkillMarketplace] Error searching registry ${reg}:`, error);
			}
		}

		// Apply filtering
		let filtered = allResults;

		if (query) {
			const lowerQuery = query.toLowerCase();
			filtered = filtered.filter(skill =>
				skill.name.toLowerCase().includes(lowerQuery) ||
				skill.description.toLowerCase().includes(lowerQuery) ||
				skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
			);
		}

		if (tags.length > 0) {
			filtered = filtered.filter(skill =>
				tags.some(tag => skill.tags.includes(tag))
			);
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

	async getSkillDetails(name: string, registry?: SkillRegistry): Promise<SkillPackage | undefined> {
		const registriesToSearch = registry
			? [registry]
			: Array.from(this.registries.keys()).filter(r => this.registries.get(r)?.enabled);

		for (const reg of registriesToSearch) {
			try {
				const cacheKey = `skill:${reg}:${name}`;
				const cached = this.getCached<SkillPackage>(cacheKey);
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
					const skillPackage: SkillPackage = JSON.parse(buffer.toString());

					// Cache the result
					this.setCached(cacheKey, skillPackage, config.cacheTTL);

					return skillPackage;
				}
			} catch (error) {
				this.logService.error(`[SkillMarketplace] Error fetching skill ${name} from ${reg}:`, error);
			}
		}

		return undefined;
	}

	async getSkillVersions(name: string, registry?: SkillRegistry): Promise<string[]> {
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
					const versions: string[] = JSON.parse(buffer.toString());
					return versions.sort((a, b) => semver.rcompare(a, b)); // Sort by semver, newest first
				}
			} catch (error) {
				this.logService.error(`[SkillMarketplace] Error fetching versions for ${name} from ${reg}:`, error);
			}
		}

		return [];
	}

	async browseByTag(tag: string, registry?: SkillRegistry): Promise<SkillSearchResponse> {
		return this.searchSkills({ tags: [tag], registry });
	}

	async getTags(registry?: SkillRegistry): Promise<Array<{ tag: string; count: number }>> {
		const registriesToSearch = registry
			? [registry]
			: Array.from(this.registries.keys()).filter(r => this.registries.get(r)?.enabled);

		const tagCounts = new Map<string, number>();

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
					const tags: Array<{ tag: string; count: number }> = JSON.parse(buffer.toString());

					for (const { tag: t, count } of tags) {
						tagCounts.set(t, (tagCounts.get(t) || 0) + count);
					}
				}
			} catch (error) {
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

	async installSkill(name: string, registry?: SkillRegistry, options: SkillInstallOptions = {}): Promise<InstalledSkill> {
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

		const installed: InstalledSkill = {
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

	async uninstallSkill(name: string, removeData = false): Promise<boolean> {
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
		} catch (error) {
			this.logService.error(`[SkillMarketplace] Error uninstalling ${name}:`, error);
			return false;
		}
	}

	async updateSkill(name: string, version?: string): Promise<InstalledSkill> {
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

	async getInstalledSkills(): Promise<InstalledSkill[]> {
		return Array.from(this.installedSkills.values());
	}

	async getInstalledSkill(name: string): Promise<InstalledSkill | undefined> {
		return this.installedSkills.get(name);
	}

	async pinSkill(name: string, pinned: boolean): Promise<void> {
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

	async checkUpdates(includePrerelease = false): Promise<SkillUpdateInfo[]> {
		const updates: SkillUpdateInfo[] = [];

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

	async checkSkillUpdate(name: string, includePrerelease = false): Promise<SkillUpdateInfo | undefined> {
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

	async updateAllSkills(skipBreaking = false): Promise<InstalledSkill[]> {
		const updates = await this.checkUpdates();
		const updated: InstalledSkill[] = [];

		for (const update of updates) {
			if (skipBreaking && update.isBreaking) {
				continue;
			}

			try {
				const result = await this.updateSkill(update.name, update.latestVersion);
				updated.push(result);
			} catch (error) {
				this.logService.error(`[SkillMarketplace] Error updating ${update.name}:`, error);
			}
		}

		return updated;
	}

	async rollbackSkill(name: string, version: string): Promise<InstalledSkill> {
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

	async resolveDependencies(name: string, version: string, registry?: SkillRegistry): Promise<DependencyResolution> {
		const tree: DependencyNode[] = [];
		const installOrder: Array<{ name: string; version: string; registry: SkillRegistry }> = [];
		const warnings: string[] = [];
		const visited = new Set<string>();

		const resolve = async (skillName: string, skillVersion: string, skillRegistry: SkillRegistry | undefined, depth: number, optional: boolean): Promise<DependencyNode> => {
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

			const node: DependencyNode = {
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
					const childNode = await resolve(
						dep.name,
						dep.version || '*',
						dep.registry || skillPackage.registry,
						depth + 1,
						dep.optional || false
					);
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

	async validateDependencies(name: string): Promise<{ valid: boolean; missing: string[]; incompatible: string[] }> {
		const installed = this.installedSkills.get(name);
		if (!installed) {
			return { valid: false, missing: [name], incompatible: [] };
		}

		const missing: string[] = [];
		const incompatible: string[] = [];

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

	async getDependencyTree(name: string): Promise<DependencyResolution | undefined> {
		const installed = this.installedSkills.get(name);
		if (!installed) {
			return undefined;
		}

		return this.resolveDependencies(name, installed.package.version, installed.package.registry);
	}

	// ========================================
	// Validation & Integrity
	// ========================================

	async validateSkillPackage(skillPackage: SkillPackage): Promise<SkillValidationResult> {
		const errors: SkillValidationError[] = [];
		const warnings: SkillValidationError[] = [];

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

	async verifySkillIntegrity(name: string): Promise<boolean> {
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
		} catch {
			return false;
		}
	}

	async repairSkill(name: string): Promise<boolean> {
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
		} catch (error) {
			this.logService.error(`[SkillMarketplace] Error repairing ${name}:`, error);
			return false;
		}
	}

	// ========================================
	// Publishing (Community Registry)
	// ========================================

	async publishSkill(skillPackage: SkillPackage, options: SkillPublishOptions): Promise<SkillPackage> {
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

	async unpublishSkill(name: string, version: string | undefined, authToken: string): Promise<boolean> {
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

	async clearCache(): Promise<void> {
		this.cache.clear();
		this.saveCache();
		this.logService.info('[SkillMarketplace] Cache cleared');
	}

	async clearRegistryCache(registry: SkillRegistry): Promise<void> {
		const keysToDelete: string[] = [];
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

	async refreshCache(): Promise<void> {
		await this.clearCache();
		// Trigger background refresh for popular skills
		this.logService.info('[SkillMarketplace] Cache refreshed');
	}

	async getCacheStats(): Promise<{ size: number; entries: number; hitRate: number; lastRefresh: string }> {
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

	private async searchRegistry(registry: SkillRegistry, filters: {
		query?: string;
		tags?: string[];
		author?: string;
		minRating?: number;
	}): Promise<SkillSearchResult[]> {
		const cacheKey = `search:${registry}:${JSON.stringify(filters)}`;
		const cached = this.getCached<SkillSearchResult[]>(cacheKey);
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
				const results: SkillSearchResult[] = JSON.parse(buffer.toString());

				// Cache the results
				this.setCached(cacheKey, results, config.cacheTTL);

				return results;
			}
		} catch (error) {
			this.logService.error(`[SkillMarketplace] Error searching registry ${registry}:`, error);
		}

		return [];
	}

	private async downloadSkillFiles(skillPackage: SkillPackage): Promise<string> {
		const skillDir = `${SKILLS_DIRECTORY}/${skillPackage.name}`;

		// TODO: Implement actual file downloading
		// For now, just create the directory structure

		return skillDir;
	}

	private getCached<T>(key: string): T | undefined {
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

		return entry.data as T;
	}

	private setCached<T>(key: string, data: T, ttl: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
		this.saveCache();
	}

	private _emitProgress(skillName: string, step: InstallationProgress['step'], progress: number, message: string): void {
		this._onInstallProgress.fire({
			skillName,
			step,
			progress,
			message,
		});
	}

	private async readResponse(response: any): Promise<VSBuffer> {
		const chunks: Uint8Array[] = [];
		for await (const chunk of response.stream) {
			chunks.push(chunk);
		}
		return VSBuffer.concat(chunks.map(c => VSBuffer.wrap(c)));
	}

	// ========================================
	// Persistence
	// ========================================

	private loadRegistries(): void {
		const stored = this.storageService.get(StorageKeys.RegistryConfigs, StorageScope.APPLICATION);
		if (stored) {
			try {
				const configs: RegistryConfig[] = JSON.parse(stored);
				for (const config of configs) {
					this.registries.set(config.type, config);
				}
				return;
			} catch (error) {
				this.logService.error('[SkillMarketplace] Error loading registry configs:', error);
			}
		}

		// Load defaults
		for (const config of DEFAULT_REGISTRIES) {
			this.registries.set(config.type, config);
		}
		this.saveRegistries();
	}

	private saveRegistries(): void {
		const configs = Array.from(this.registries.values());
		this.storageService.store(
			StorageKeys.RegistryConfigs,
			JSON.stringify(configs),
			StorageScope.APPLICATION,
			StorageTarget.USER
		);
	}

	private loadInstalledSkills(): void {
		const stored = this.storageService.get(StorageKeys.InstalledSkills, StorageScope.APPLICATION);
		if (stored) {
			try {
				const skills: Array<[string, InstalledSkill]> = JSON.parse(stored);
				this.installedSkills = new Map(skills);
			} catch (error) {
				this.logService.error('[SkillMarketplace] Error loading installed skills:', error);
			}
		}
	}

	private saveInstalledSkills(): void {
		const skills = Array.from(this.installedSkills.entries());
		this.storageService.store(
			StorageKeys.InstalledSkills,
			JSON.stringify(skills),
			StorageScope.APPLICATION,
			StorageTarget.USER
		);
	}

	private loadCache(): void {
		const stored = this.storageService.get(StorageKeys.CacheData, StorageScope.APPLICATION);
		if (stored) {
			try {
				const cacheData: Array<[string, CacheEntry<any>]> = JSON.parse(stored);
				this.cache = new Map(cacheData);
			} catch (error) {
				this.logService.error('[SkillMarketplace] Error loading cache:', error);
			}
		}
	}

	private saveCache(): void {
		const cacheData = Array.from(this.cache.entries());
		this.storageService.store(
			StorageKeys.CacheData,
			JSON.stringify(cacheData),
			StorageScope.APPLICATION,
			StorageTarget.USER
		);
	}
}

// Register the service
registerSingleton(ISkillMarketplaceService, SkillMarketplaceService, InstantiationType.Delayed);

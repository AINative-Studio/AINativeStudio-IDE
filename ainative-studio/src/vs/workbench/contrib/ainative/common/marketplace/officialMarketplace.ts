/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ISkillsRegistry } from '../skills/skillRegistryTypes.js';
import { IOfficialMarketplace } from './officialMarketplaceTypes.js';
import {
	MarketplaceSkill,
	MarketplaceSource,
	NpmSearchResponse,
	NpmPackageObject,
	MarketplaceCacheData
} from './marketplaceTypes.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';

const execAsync = promisify(exec);

/**
 * Official Marketplace Service Implementation
 * Fetches and installs skills from NPM registry under @ainative/skill-* namespace
 */
class OfficialMarketplace extends Disposable implements IOfficialMarketplace {
	declare readonly _serviceBrand: undefined;

	private static readonly NPM_REGISTRY_URL = 'https://registry.npmjs.org/-/v1/search';
	private static readonly PACKAGE_PREFIX = '@ainative/skill-';
	private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
	private static readonly MAX_PACKAGES = 250;

	private readonly cacheDir: string;
	private readonly skillsDir: string;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ISkillsRegistry private readonly registry: ISkillsRegistry,
		@IEnvironmentService _envService: IEnvironmentService
	) {
		super();
		const homeDir = os.homedir();
		this.cacheDir = path.join(homeDir, '.ainative', 'cache', 'marketplace');
		this.skillsDir = path.join(homeDir, '.ainative', 'skills');
	}

	/**
	 * Fetch all @ainative/skill-* packages from NPM registry
	 */
	async fetchSkills(forceRefresh = false): Promise<MarketplaceSkill[]> {
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
		} catch (error) {
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
	async getSkillDetails(skillName: string): Promise<MarketplaceSkill | null> {
		const allSkills = await this.fetchSkills();
		const fullPackageName = this.getFullPackageName(skillName);

		return allSkills.find(skill => skill.name === fullPackageName) || null;
	}

	/**
	 * Check if cache is valid
	 */
	async isCacheValid(): Promise<boolean> {
		const status = await this.getCacheStatus();
		return status.valid;
	}

	/**
	 * Install a skill from the NPM registry
	 */
	async install(skillName: string, version?: string): Promise<void> {
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
		} catch (error) {
			throw new Error(`Failed to install skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Update an installed skill to the latest version
	 */
	async update(skillName: string): Promise<void> {
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
		} catch (error) {
			throw new Error(`Failed to update skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Search for skills by query
	 */
	async search(query: string): Promise<MarketplaceSkill[]> {
		const allSkills = await this.fetchSkills();
		const lowerQuery = query.toLowerCase();

		return allSkills.filter(skill => {
			return (
				skill.name.toLowerCase().includes(lowerQuery) ||
				skill.description.toLowerCase().includes(lowerQuery) ||
				skill.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))
			);
		});
	}

	/**
	 * Clear the cache and force refresh
	 */
	async clearCache(): Promise<void> {
		const cacheFile = path.join(this.cacheDir, 'official.json');
		const cacheUri = URI.file(cacheFile);

		try {
			await this.fileService.del(cacheUri);
			console.log('Cache cleared successfully');
		} catch (error) {
			// Ignore if cache doesn't exist
			if (error instanceof Error && !error.message.includes('ENOENT')) {
				throw error;
			}
		}
	}

	/**
	 * Get cache status
	 */
	async getCacheStatus(): Promise<{ valid: boolean; age: number; lastUpdate: Date | null }> {
		const cacheFile = path.join(this.cacheDir, 'official.json');
		const cacheUri = URI.file(cacheFile);

		try {
			const fileContent = await this.fileService.readFile(cacheUri);
			const cacheData: MarketplaceCacheData = JSON.parse(fileContent.value.toString());

			const age = Date.now() - cacheData.timestamp;
			const valid = age < cacheData.ttl;

			return {
				valid,
				age,
				lastUpdate: new Date(cacheData.timestamp)
			};
		} catch (error) {
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
	private async getNpmPackages(): Promise<NpmPackageObject[]> {
		const searchUrl = `${OfficialMarketplace.NPM_REGISTRY_URL}?text=${OfficialMarketplace.PACKAGE_PREFIX}&size=${OfficialMarketplace.MAX_PACKAGES}`;

		const response = await fetch(searchUrl);
		if (!response.ok) {
			throw new Error(`NPM registry returned status ${response.status}: ${response.statusText}`);
		}

		const data: NpmSearchResponse = await response.json();

		// Filter to only include @ainative/skill-* packages
		return data.objects.filter(obj =>
			obj.package.name.startsWith(OfficialMarketplace.PACKAGE_PREFIX)
		);
	}

	/**
	 * Transform NPM package to MarketplaceSkill
	 */
	private transformNpmPackage(pkgObj: NpmPackageObject): MarketplaceSkill {
		const pkg = pkgObj.package;
		const score = pkgObj.score;

		// Determine source based on author
		let source: MarketplaceSource = 'community';
		if (pkg.author?.name?.toLowerCase().includes('ainative')) {
			source = 'official';
		} else if (pkg.author?.name?.toLowerCase().includes('anthropic')) {
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
	private getFullPackageName(skillName: string): string {
		if (skillName.startsWith('@ainative/skill-')) {
			return skillName;
		}
		return `${OfficialMarketplace.PACKAGE_PREFIX}${skillName}`;
	}

	/**
	 * Get global node_modules directory
	 */
	private async getGlobalNodeModules(): Promise<string> {
		try {
			const { stdout } = await execAsync('npm root -g');
			return stdout.trim();
		} catch (error) {
			// Fallback to common locations
			const platform = os.platform();
			if (platform === 'win32') {
				return path.join(process.env.APPDATA || '', 'npm', 'node_modules');
			} else {
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
	private async copyDirectory(source: string, target: string): Promise<void> {
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
				} else {
					// Copy file
					const content = await this.fileService.readFile(entry.resource);
					await this.fileService.writeFile(targetEntryUri, content.value);
				}
			}
		} catch (error) {
			throw new Error(`Failed to copy directory from ${source} to ${target}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Load skills from cache
	 */
	private async loadCache(allowStale = false): Promise<MarketplaceSkill[] | null> {
		const cacheFile = path.join(this.cacheDir, 'official.json');
		const cacheUri = URI.file(cacheFile);

		try {
			const fileContent = await this.fileService.readFile(cacheUri);
			const cacheData: MarketplaceCacheData = JSON.parse(fileContent.value.toString());

			const age = Date.now() - cacheData.timestamp;

			if (allowStale || age < cacheData.ttl) {
				// Parse dates from JSON strings
				return cacheData.skills.map(skill => ({
					...skill,
					updatedAt: new Date(skill.updatedAt)
				}));
			}

			return null;
		} catch (error) {
			// Cache doesn't exist or is invalid
			return null;
		}
	}

	/**
	 * Save skills to cache
	 */
	private async saveCache(skills: MarketplaceSkill[]): Promise<void> {
		const cacheFile = path.join(this.cacheDir, 'official.json');
		const cacheUri = URI.file(cacheFile);
		const cacheDir = URI.file(this.cacheDir);

		try {
			// Ensure cache directory exists
			await this.fileService.createFolder(cacheDir);

			const cacheData: MarketplaceCacheData = {
				skills,
				timestamp: Date.now(),
				ttl: OfficialMarketplace.CACHE_TTL
			};

			const content = JSON.stringify(cacheData, null, 2);
			await this.fileService.writeFile(cacheUri, VSBuffer.fromString(content));
		} catch (error) {
			console.warn('Failed to save cache:', error);
			// Non-fatal - continue even if caching fails
		}
	}
}

// Register the service
registerSingleton(IOfficialMarketplace, OfficialMarketplace, InstantiationType.Delayed);

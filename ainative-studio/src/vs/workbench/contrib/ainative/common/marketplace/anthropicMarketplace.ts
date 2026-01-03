/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Octokit } from '@octokit/rest';
import { URI } from '../../../../../base/common/uri.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { IAnthropicMarketplace, GitHubDirectoryItem, GitHubFileContent } from './anthropicMarketplaceTypes.js';
import { MarketplaceSkill, MarketplaceCacheData, MarketplaceError } from './marketplaceTypes.js';
import { ISkillsRegistry } from '../skills/skillRegistryTypes.js';
import { ISkillParser } from '../skills/skillParserTypes.js';
import { SkillMetadata } from '../skills/skillTypes.js';

/**
 * Anthropic Marketplace Service Implementation
 * Fetches and installs skills from anthropics/skills GitHub repository
 */
class AnthropicMarketplace extends Disposable implements IAnthropicMarketplace {
	declare readonly _serviceBrand: undefined;

	private readonly octokit: Octokit;
	private readonly cacheDir: URI;
	private readonly cacheFile: URI;
	private readonly CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
	private readonly GITHUB_OWNER = 'anthropics';
	private readonly GITHUB_REPO = 'skills';
	private readonly SKILLS_PATH = 'skills';

	private cachedSkills: MarketplaceSkill[] | null = null;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IEnvironmentService private readonly envService: IEnvironmentService,
		@ISkillsRegistry private readonly registry: ISkillsRegistry,
		@ISkillParser private readonly parser: ISkillParser
	) {
		super();

		// Initialize Octokit with optional GitHub token for higher rate limits
		this.octokit = new Octokit({
			auth: process.env.GITHUB_TOKEN,
			userAgent: 'AINative-Studio-IDE'
		});

		// Set up cache paths: ~/.ainative/cache/marketplace/
		const ainativeDir = joinPath(this.envService.userHome, '.ainative');
		this.cacheDir = joinPath(ainativeDir, 'cache', 'marketplace');
		this.cacheFile = joinPath(this.cacheDir, 'anthropic.json');
	}

	/**
	 * Fetch all available skills from the Anthropic GitHub repository
	 */
	async fetchSkills(forceRefresh: boolean = false): Promise<MarketplaceSkill[]> {
		// Check cache first unless force refresh
		if (!forceRefresh && this.cachedSkills) {
			return this.cachedSkills;
		}

		// Try to load from file cache
		if (!forceRefresh) {
			const cached = await this.loadCache();
			if (cached) {
				this.cachedSkills = cached;
				return cached;
			}
		}

		try {
			// Fetch skill directories from GitHub
			const directories = await this.getSkillDirectories();

			// Fetch metadata for each skill in parallel
			const skillPromises = directories.map(dir => this.fetchSkillMetadata(dir));
			const skills = await Promise.all(skillPromises);

			// Filter out any failed fetches (null values)
			const validSkills = skills.filter((skill): skill is MarketplaceSkill => skill !== null);

			// Save to cache
			await this.saveCache(validSkills);
			this.cachedSkills = validSkills;

			return validSkills;
		} catch (error) {
			// On error, try to return cached data if available
			const cached = await this.loadCache();
			if (cached) {
				console.warn('GitHub API error, using cached data:', error);
				this.cachedSkills = cached;
				return cached;
			}

			// No cache available, throw error
			if (this.isRateLimitError(error)) {
				throw new MarketplaceError(
					'GitHub API rate limit exceeded. Please try again later or set GITHUB_TOKEN environment variable.',
					'RATE_LIMIT'
				);
			}

			throw new MarketplaceError(
				`Failed to fetch skills from GitHub: ${error instanceof Error ? error.message : String(error)}`,
				'NETWORK_ERROR'
			);
		}
	}

	/**
	 * Get the list of skill directories from the GitHub repository
	 */
	async getSkillDirectories(): Promise<string[]> {
		try {
			const { data } = await this.octokit.rest.repos.getContent({
				owner: this.GITHUB_OWNER,
				repo: this.GITHUB_REPO,
				path: this.SKILLS_PATH
			});

			if (!Array.isArray(data)) {
				throw new Error('Expected directory listing, got file');
			}

			return (data as GitHubDirectoryItem[])
				.filter(item => item.type === 'dir')
				.map(item => item.name);
		} catch (error) {
			throw new MarketplaceError(
				`Failed to fetch skill directories: ${error instanceof Error ? error.message : String(error)}`,
				'NETWORK_ERROR'
			);
		}
	}

	/**
	 * Fetch SKILL.md metadata for a specific skill
	 */
	async fetchSkillMetadata(skillName: string): Promise<MarketplaceSkill | null> {
		try {
			// Fetch SKILL.md file content
			const skillPath = `${this.SKILLS_PATH}/${skillName}/SKILL.md`;
			const { data } = await this.octokit.rest.repos.getContent({
				owner: this.GITHUB_OWNER,
				repo: this.GITHUB_REPO,
				path: skillPath
			});

			if (Array.isArray(data) || data.type !== 'file') {
				console.warn(`SKILL.md not found for ${skillName}`);
				return null;
			}

			const fileContent = data as GitHubFileContent;

			// Decode base64 content
			const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

			// Parse frontmatter to extract metadata
			const metadata = this.parseFrontmatter(content);

			// Create marketplace skill object
			const marketplaceSkill: MarketplaceSkill = {
				name: metadata.name || skillName,
				description: metadata.description || '',
				version: metadata.version || '1.0.0',
				source: 'anthropic',
				author: metadata.author || 'Anthropic',
				keywords: metadata.tags || [],
				downloads: undefined,
				updatedAt: new Date(),
				installCommand: `ainative skill install ${skillName}`,
				homepage: `https://github.com/${this.GITHUB_OWNER}/${this.GITHUB_REPO}/tree/main/${this.SKILLS_PATH}/${skillName}`,
				repository: `https://github.com/${this.GITHUB_OWNER}/${this.GITHUB_REPO}`
			};

			return marketplaceSkill;
		} catch (error) {
			console.error(`Failed to fetch metadata for skill ${skillName}:`, error);
			return null;
		}
	}

	/**
	 * Install a skill from the Anthropic marketplace
	 */
	async install(skillName: string, version?: string): Promise<void> {
		try {
			const isInstalled = await this.registry.isInstalled(skillName);
			if (isInstalled) {
				throw new MarketplaceError(
					`Skill '${skillName}' is already installed. Uninstall it first to reinstall.`,
					'INSTALL_ERROR'
				);
			}

			const skillDetails = await this.getSkillDetails(skillName);
			if (!skillDetails) {
				throw new MarketplaceError(
					`Skill '${skillName}' not found in Anthropic marketplace.`,
					'NOT_FOUND'
				);
			}

			const skillsDir = joinPath(this.envService.userHome, '.ainative', 'skills');
			const targetPath = joinPath(skillsDir, skillName);

			await this.downloadSkill(skillName, targetPath.fsPath);
			await this.registry.install(targetPath.fsPath);

		} catch (error) {
			if (error instanceof MarketplaceError) {
				throw error;
			}
			throw new MarketplaceError(
				`Failed to install skill: ${error instanceof Error ? error.message : String(error)}`,
				'INSTALL_ERROR'
			);
		}
	}

	/**
	 * Download a skill from GitHub
	 */
	async downloadSkill(skillName: string, targetPath: string): Promise<void> {
		try {
			const skillPath = `${this.SKILLS_PATH}/${skillName}`;
			const { data } = await this.octokit.rest.repos.getContent({
				owner: this.GITHUB_OWNER,
				repo: this.GITHUB_REPO,
				path: skillPath
			});

			if (!Array.isArray(data)) {
				throw new Error('Expected directory listing');
			}

			const targetUri = URI.file(targetPath);
			await this.ensureDirectoryExists(targetUri);

			for (const item of data as GitHubDirectoryItem[]) {
				if (item.type === 'file' && item.download_url) {
					const response = await fetch(item.download_url);
					if (!response.ok) {
						throw new Error(`Failed to download ${item.name}: ${response.statusText}`);
					}
					const content = await response.text();
					const fileUri = joinPath(targetUri, item.name);
					await this.fileService.writeFile(fileUri, VSBuffer.fromString(content));
				} else if (item.type === 'dir') {
					const subDirPath = joinPath(targetUri, item.name).fsPath;
					await this.downloadDirectory(item.path, subDirPath);
				}
			}
		} catch (error) {
			throw new MarketplaceError(
				`Failed to download skill: ${error instanceof Error ? error.message : String(error)}`,
				'NETWORK_ERROR'
			);
		}
	}

	private async downloadDirectory(githubPath: string, targetPath: string): Promise<void> {
		const { data } = await this.octokit.rest.repos.getContent({
			owner: this.GITHUB_OWNER,
			repo: this.GITHUB_REPO,
			path: githubPath
		});

		if (!Array.isArray(data)) {
			return;
		}

		const targetUri = URI.file(targetPath);
		await this.ensureDirectoryExists(targetUri);

		for (const item of data as GitHubDirectoryItem[]) {
			if (item.type === 'file' && item.download_url) {
				const response = await fetch(item.download_url);
				if (!response.ok) {
					continue;
				}
				const content = await response.text();
				const fileUri = joinPath(targetUri, item.name);
				await this.fileService.writeFile(fileUri, VSBuffer.fromString(content));
			} else if (item.type === 'dir') {
				const subDirPath = joinPath(targetUri, item.name).fsPath;
				await this.downloadDirectory(item.path, subDirPath);
			}
		}
	}

	async search(query: string): Promise<MarketplaceSkill[]> {
		const allSkills = await this.fetchSkills();
		const lowerQuery = query.toLowerCase();

		return allSkills.filter(skill =>
			skill.name.toLowerCase().includes(lowerQuery) ||
			skill.description.toLowerCase().includes(lowerQuery) ||
			skill.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
		);
	}

	async getSkillDetails(skillName: string): Promise<MarketplaceSkill | null> {
		const allSkills = await this.fetchSkills();
		return allSkills.find(skill => skill.name === skillName) || null;
	}

	async isCacheValid(): Promise<boolean> {
		try {
			const cacheData = await this.loadCacheData();
			if (!cacheData) {
				return false;
			}

			const now = Date.now();
			return (now - cacheData.timestamp) < cacheData.ttl;
		} catch {
			return false;
		}
	}

	async clearCache(): Promise<void> {
		try {
			await this.fileService.del(this.cacheFile);
			this.cachedSkills = null;
		} catch {
			// Ignore errors if cache file doesn't exist
		}
	}

	private parseFrontmatter(content: string): Partial<SkillMetadata> {
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return {};
		}

		const frontmatterText = match[1];
		const metadata: Partial<SkillMetadata> = {};

		const lines = frontmatterText.split('\n');
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) {
				continue;
			}

			const colonIndex = trimmed.indexOf(':');
			if (colonIndex === -1) {
				continue;
			}

			const key = trimmed.substring(0, colonIndex).trim();
			let value = trimmed.substring(colonIndex + 1).trim();

			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.substring(1, value.length - 1);
			}

			if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
				const arrayContent = value.substring(1, value.length - 1);
				metadata.tags = arrayContent.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
			} else {
				switch (key) {
					case 'name':
						metadata.name = value;
						break;
					case 'description':
						metadata.description = value;
						break;
					case 'version':
						metadata.version = value;
						break;
					case 'author':
						metadata.author = value;
						break;
					case 'license':
						metadata.license = value;
						break;
				}
			}
		}

		return metadata;
	}

	private async loadCache(): Promise<MarketplaceSkill[] | null> {
		const cacheData = await this.loadCacheData();
		if (!cacheData) {
			return null;
		}

		const now = Date.now();
		if (now - cacheData.timestamp > cacheData.ttl) {
			return null;
		}

		return cacheData.skills;
	}

	private async loadCacheData(): Promise<MarketplaceCacheData | null> {
		try {
			const fileContent = await this.fileService.readFile(this.cacheFile);
			const json = fileContent.value.toString();
			return JSON.parse(json) as MarketplaceCacheData;
		} catch {
			return null;
		}
	}

	private async saveCache(skills: MarketplaceSkill[]): Promise<void> {
		try {
			await this.ensureDirectoryExists(this.cacheDir);

			const cacheData: MarketplaceCacheData = {
				skills,
				timestamp: Date.now(),
				ttl: this.CACHE_TTL
			};

			const json = JSON.stringify(cacheData, null, 2);
			await this.fileService.writeFile(this.cacheFile, VSBuffer.fromString(json));
		} catch (error) {
			console.warn('Failed to save marketplace cache:', error);
		}
	}

	private async ensureDirectoryExists(uri: URI): Promise<void> {
		try {
			await this.fileService.createFolder(uri);
		} catch (error) {
			// Directory might already exist, ignore error
		}
	}

	private isRateLimitError(error: unknown): boolean {
		if (error && typeof error === 'object' && 'status' in error) {
			return (error as any).status === 403 || (error as any).status === 429;
		}
		return false;
	}
}

registerSingleton(IAnthropicMarketplace, AnthropicMarketplace, InstantiationType.Delayed);

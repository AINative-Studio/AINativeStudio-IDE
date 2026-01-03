/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ISkillsRegistry } from '../skills/skillRegistryTypes.js';
import { ISkillParser } from '../skills/skillParserTypes.js';
import {
	ICommunityMarketplace,
	CommunitySkillApiResponse,
	CommunitySkillData,
	RateSkillRequest,
	SubmitSkillResponse,
	CommunityMarketplaceError
} from './communityMarketplaceTypes.js';
import {
	MarketplaceSkill,
	MarketplaceCacheData,
	MarketplaceError
} from './marketplaceTypes.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';

const execAsync = promisify(exec);

/**
 * Community Marketplace Service Implementation
 * Fetches and installs community-submitted skills from AINative API
 */
class CommunityMarketplace extends Disposable implements ICommunityMarketplace {
	declare readonly _serviceBrand: undefined;

	private static readonly API_BASE_URL = 'https://api.ainative.studio/v1/skills/marketplace';
	private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
	private static readonly CACHE_FILENAME = 'community.json';
	private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
	private static readonly MAX_RETRIES = 3;
	private static readonly RETRY_DELAY = 1000; // 1 second

	private readonly cacheDir: string;
	private readonly skillsDir: string;
	private authToken: string | null = null;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ISkillsRegistry private readonly registry: ISkillsRegistry,
		@ISkillParser private readonly parser: ISkillParser,
		@IEnvironmentService _envService: IEnvironmentService
	) {
		super();
		const homeDir = os.homedir();
		this.cacheDir = path.join(homeDir, '.ainative', 'cache', 'marketplace');
		this.skillsDir = path.join(homeDir, '.ainative', 'skills');
	}

	/**
	 * Fetch all community skills from AINative API
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

			// Fetch from API
			const apiResponse = await this.fetchFromAPI<CommunitySkillApiResponse>('');
			const skills = apiResponse.skills
				.filter(skill => skill.status === 'approved') // Only show approved skills
				.map(skill => this.transformApiSkill(skill));

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
			throw new MarketplaceError(
				`Failed to fetch community skills: ${error instanceof Error ? error.message : String(error)}`,
				'NETWORK_ERROR'
			);
		}
	}

	/**
	 * Get detailed information about a specific skill
	 */
	async getSkillDetails(skillName: string): Promise<MarketplaceSkill | null> {
		try {
			// Try API first for latest data
			const apiResponse = await this.fetchFromAPI<CommunitySkillData>(`/${skillName}`);
			return this.transformApiSkill(apiResponse);
		} catch (error) {
			// Fallback to cache
			const allSkills = await this.fetchSkills();
			return allSkills.find(skill => skill.name === skillName) || null;
		}
	}

	/**
	 * Install a community skill from AINative API
	 */
	async install(skillName: string, version?: string): Promise<void> {
		try {
			// Step 1: Check if already installed
			const isInstalled = await this.registry.isInstalled(skillName);
			if (isInstalled) {
				throw new MarketplaceError(
					`Skill "${skillName}" is already installed. Uninstall it first to reinstall.`,
					'INSTALL_ERROR'
				);
			}

			// Step 2: Get skill details from API
			const skillDetails = await this.getSkillDetails(skillName);
			if (!skillDetails) {
				throw new MarketplaceError(`Skill "${skillName}" not found in community marketplace`, 'NOT_FOUND');
			}

			// Step 3: Download skill zip file from CDN
			console.log(`Downloading skill "${skillName}" from ${skillDetails.repository}...`);
			const tempZipPath = path.join(os.tmpdir(), `${skillName}-${Date.now()}.zip`);
			await this.downloadFile(skillDetails.repository || '', tempZipPath);

			// Step 4: Extract to skills directory
			const targetPath = path.join(this.skillsDir, skillName);
			await this.extractZip(tempZipPath, targetPath);

			// Step 5: Clean up temp file
			try {
				await this.fileService.del(URI.file(tempZipPath));
			} catch (cleanupError) {
				console.warn('Failed to clean up temp file:', cleanupError);
			}

			// Step 6: Register with SkillsRegistry
			await this.registry.install(targetPath);

			// Step 7: Increment download count (fire and forget)
			this.incrementDownloadCount(skillName).catch(err =>
				console.warn('Failed to increment download count:', err)
			);

			console.log(`Successfully installed community skill "${skillName}"`);
		} catch (error) {
			throw new MarketplaceError(
				`Failed to install skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`,
				'INSTALL_ERROR'
			);
		}
	}

	/**
	 * Search for skills by query
	 */
	async search(query: string): Promise<MarketplaceSkill[]> {
		try {
			// Try API search first
			const apiResponse = await this.fetchFromAPI<CommunitySkillApiResponse>(`/search?q=${encodeURIComponent(query)}`);
			return apiResponse.skills
				.filter(skill => skill.status === 'approved')
				.map(skill => this.transformApiSkill(skill));
		} catch (error) {
			// Fallback to local search on cached data
			const allSkills = await this.fetchSkills();
			const lowerQuery = query.toLowerCase();

			return allSkills.filter(skill =>
				skill.name.toLowerCase().includes(lowerQuery) ||
				skill.description.toLowerCase().includes(lowerQuery) ||
				skill.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)) ||
				skill.author.toLowerCase().includes(lowerQuery)
			);
		}
	}

	/**
	 * Submit a skill for community review
	 */
	async submit(skillPath: string): Promise<SubmitSkillResponse> {
		// Step 1: Check authentication
		if (!this.authToken) {
			throw new CommunityMarketplaceError(
				'Authentication required to submit skills. Please sign in to AINative.',
				'AUTH_REQUIRED'
			);
		}

		try {
			// Step 2: Parse and validate skill
			const skillFileUri = URI.file(path.join(skillPath, 'SKILL.md'));

			const skill = await this.parser.parseSkillFile(skillFileUri.fsPath);

			// Step 3: Validate skill format
			const isValid = await this.parser.validateSkillFormat(skillFileUri.fsPath);
			if (!isValid) {
				throw new CommunityMarketplaceError(
					'Invalid skill format. Please ensure SKILL.md follows the specification.',
					'VALIDATION_ERROR'
				);
			}

			// Step 4: Package skill files into zip
			const tempZipPath = path.join(os.tmpdir(), `${skill.metadata.name}-${Date.now()}.zip`);
			await this.createZipArchive(skillPath, tempZipPath);

			// Step 5: Read zip file
			const zipContent = await this.fileService.readFile(URI.file(tempZipPath));

			// Step 6: Upload to API
			const formData = new FormData();
			formData.append('name', skill.metadata.name);
			formData.append('description', skill.metadata.description || 'No description provided');
			formData.append('version', skill.metadata.version || '1.0.0');
			formData.append('category', (skill.metadata.tags && skill.metadata.tags[0]) || 'general');
			formData.append('keywords', JSON.stringify(skill.metadata.tags || []));
			formData.append('file', new Blob([zipContent.value.buffer]), `${skill.metadata.name}.zip`);

			const response = await this.fetchFromAPI<SubmitSkillResponse>('', {
				method: 'POST',
				body: formData,
				headers: {
					'Authorization': `Bearer ${this.authToken}`
				}
			});

			// Step 7: Clean up temp file
			try {
				await this.fileService.del(URI.file(tempZipPath));
			} catch (cleanupError) {
				console.warn('Failed to clean up temp file:', cleanupError);
			}

			return response;
		} catch (error) {
			if (error instanceof CommunityMarketplaceError) {
				throw error;
			}
			throw new CommunityMarketplaceError(
				`Failed to submit skill: ${error instanceof Error ? error.message : String(error)}`,
				'SUBMISSION_FAILED'
			);
		}
	}

	/**
	 * Rate a community skill
	 */
	async rate(skillId: string, rating: number): Promise<void> {
		// Validate rating
		if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
			throw new CommunityMarketplaceError('Rating must be an integer between 1 and 5', 'VALIDATION_ERROR');
		}

		// Check authentication
		if (!this.authToken) {
			throw new CommunityMarketplaceError(
				'Authentication required to rate skills. Please sign in to AINative.',
				'AUTH_REQUIRED'
			);
		}

		try {
			const requestData: RateSkillRequest = { rating };

			await this.fetchFromAPI(`/${skillId}/rate`, {
				method: 'POST',
				body: JSON.stringify(requestData),
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.authToken}`
				}
			});

			// Invalidate cache to get fresh ratings
			await this.clearCache();
		} catch (error) {
			throw new CommunityMarketplaceError(
				`Failed to rate skill: ${error instanceof Error ? error.message : String(error)}`,
				'NETWORK_ERROR'
			);
		}
	}

	/**
	 * Check if cache is valid
	 */
	async isCacheValid(): Promise<boolean> {
		const cacheFile = path.join(this.cacheDir, CommunityMarketplace.CACHE_FILENAME);
		const cacheUri = URI.file(cacheFile);

		try {
			const fileContent = await this.fileService.readFile(cacheUri);
			const cacheData: MarketplaceCacheData = JSON.parse(fileContent.value.toString());

			const age = Date.now() - cacheData.timestamp;
			return age < cacheData.ttl;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Clear the cache
	 */
	async clearCache(): Promise<void> {
		const cacheFile = path.join(this.cacheDir, CommunityMarketplace.CACHE_FILENAME);
		const cacheUri = URI.file(cacheFile);

		try {
			await this.fileService.del(cacheUri);
		} catch (error) {
			// Ignore if cache doesn't exist
			if (error instanceof Error && !error.message.includes('ENOENT')) {
				throw error;
			}
		}
	}

	/**
	 * Check if user is authenticated
	 */
	async isAuthenticated(): Promise<boolean> {
		return this.authToken !== null;
	}

	/**
	 * Set authentication token
	 */
	setAuthToken(token: string): void {
		this.authToken = token;
	}

	/**
	 * Fetch data from AINative API with retry logic
	 */
	private async fetchFromAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${CommunityMarketplace.API_BASE_URL}${endpoint}`;
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < CommunityMarketplace.MAX_RETRIES; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), CommunityMarketplace.REQUEST_TIMEOUT);

				const response = await fetch(url, {
					...options,
					signal: controller.signal,
					headers: {
						'Content-Type': 'application/json',
						...options.headers
					}
				});

				clearTimeout(timeoutId);

				// Handle rate limiting
				if (response.status === 429) {
					const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
					throw new MarketplaceError(
						`Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
						'RATE_LIMIT'
					);
				}

				// Handle authentication errors
				if (response.status === 401 || response.status === 403) {
					throw new CommunityMarketplaceError(
						'Authentication failed. Please sign in again.',
						'AUTH_REQUIRED'
					);
				}

				// Handle not found
				if (response.status === 404) {
					throw new MarketplaceError('Resource not found', 'NOT_FOUND');
				}

				if (!response.ok) {
					throw new Error(`API request failed: ${response.status} ${response.statusText}`);
				}

				return await response.json();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Don't retry on auth errors or validation errors
				if (error instanceof CommunityMarketplaceError || error instanceof MarketplaceError) {
					throw error;
				}

				// Wait before retrying (exponential backoff)
				if (attempt < CommunityMarketplace.MAX_RETRIES - 1) {
					await this.sleep(CommunityMarketplace.RETRY_DELAY * Math.pow(2, attempt));
				}
			}
		}

		throw lastError || new Error('API request failed after retries');
	}

	/**
	 * Transform API skill data to MarketplaceSkill format
	 */
	private transformApiSkill(apiSkill: CommunitySkillData): MarketplaceSkill {
		return {
			name: apiSkill.name,
			description: apiSkill.description,
			version: apiSkill.version,
			source: 'community',
			author: apiSkill.author,
			keywords: apiSkill.keywords,
			rating: apiSkill.rating_avg,
			downloads: apiSkill.download_count,
			updatedAt: new Date(apiSkill.updated_at),
			installCommand: `ainative skill install ${apiSkill.name}`,
			homepage: undefined,
			repository: apiSkill.skill_file_url // Use CDN URL as repository for download
		};
	}

	/**
	 * Load skills from cache
	 */
	private async loadCache(allowStale = false): Promise<MarketplaceSkill[] | null> {
		const cacheFile = path.join(this.cacheDir, CommunityMarketplace.CACHE_FILENAME);
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
			return null;
		}
	}

	/**
	 * Save skills to cache
	 */
	private async saveCache(skills: MarketplaceSkill[]): Promise<void> {
		const cacheFile = path.join(this.cacheDir, CommunityMarketplace.CACHE_FILENAME);
		const cacheUri = URI.file(cacheFile);
		const cacheDir = URI.file(this.cacheDir);

		try {
			// Ensure cache directory exists
			await this.fileService.createFolder(cacheDir);

			const cacheData: MarketplaceCacheData = {
				skills,
				timestamp: Date.now(),
				ttl: CommunityMarketplace.CACHE_TTL
			};

			const content = JSON.stringify(cacheData, null, 2);
			await this.fileService.writeFile(cacheUri, VSBuffer.fromString(content));
		} catch (error) {
			console.warn('Failed to save cache:', error);
			// Non-fatal - continue even if caching fails
		}
	}

	/**
	 * Download file from URL
	 */
	private async downloadFile(url: string, targetPath: string): Promise<void> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = VSBuffer.wrap(new Uint8Array(arrayBuffer));

		await this.fileService.writeFile(URI.file(targetPath), buffer);
	}

	/**
	 * Extract zip file to target directory
	 */
	private async extractZip(zipPath: string, targetPath: string): Promise<void> {
		// Ensure target directory exists
		await this.fileService.createFolder(URI.file(targetPath));

		try {
			// Use unzip command (cross-platform fallback needed)
			await execAsync(`unzip -o "${zipPath}" -d "${targetPath}"`, { timeout: 60000 });
		} catch (error) {
			throw new Error(`Failed to extract zip file: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Create zip archive of skill directory
	 */
	private async createZipArchive(sourcePath: string, targetZipPath: string): Promise<void> {
		try {
			// Use system zip command (cross-platform)
			const cwd = path.dirname(sourcePath);
			const dirName = path.basename(sourcePath);

			// Create zip archive
			await execAsync(`cd "${cwd}" && zip -r "${targetZipPath}" "${dirName}"`, { timeout: 60000 });
		} catch (error) {
			throw new Error(`Failed to create zip archive: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Increment download count (fire and forget)
	 */
	private async incrementDownloadCount(skillName: string): Promise<void> {
		try {
			await this.fetchFromAPI(`/${skillName}/download`, {
				method: 'POST'
			});
		} catch (error) {
			// Silently fail - this is not critical
			console.debug('Failed to increment download count:', error);
		}
	}

	/**
	 * Sleep utility for retry delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

// Register the service
registerSingleton(ICommunityMarketplace, CommunityMarketplace, InstantiationType.Delayed);

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
var CommunityMarketplace_1;
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ISkillsRegistry } from '../skills/skillRegistryTypes.js';
import { ISkillParser } from '../skills/skillParserTypes.js';
import { ICommunityMarketplace, CommunityMarketplaceError } from './communityMarketplaceTypes.js';
import { MarketplaceError } from './marketplaceTypes.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
const execAsync = promisify(exec);
/**
 * Community Marketplace Service Implementation
 * Fetches and installs community-submitted skills from AINative API
 */
let CommunityMarketplace = class CommunityMarketplace extends Disposable {
    static { CommunityMarketplace_1 = this; }
    static { this.API_BASE_URL = 'https://api.ainative.studio/v1/skills/marketplace'; }
    static { this.CACHE_TTL = 60 * 60 * 1000; } // 1 hour in milliseconds
    static { this.CACHE_FILENAME = 'community.json'; }
    static { this.REQUEST_TIMEOUT = 30000; } // 30 seconds
    static { this.MAX_RETRIES = 3; }
    static { this.RETRY_DELAY = 1000; } // 1 second
    constructor(fileService, registry, parser, _envService) {
        super();
        this.fileService = fileService;
        this.registry = registry;
        this.parser = parser;
        this.authToken = null;
        const homeDir = os.homedir();
        this.cacheDir = path.join(homeDir, '.ainative', 'cache', 'marketplace');
        this.skillsDir = path.join(homeDir, '.ainative', 'skills');
    }
    /**
     * Fetch all community skills from AINative API
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
            // Fetch from API
            const apiResponse = await this.fetchFromAPI('');
            const skills = apiResponse.skills
                .filter(skill => skill.status === 'approved') // Only show approved skills
                .map(skill => this.transformApiSkill(skill));
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
            throw new MarketplaceError(`Failed to fetch community skills: ${error instanceof Error ? error.message : String(error)}`, 'NETWORK_ERROR');
        }
    }
    /**
     * Get detailed information about a specific skill
     */
    async getSkillDetails(skillName) {
        try {
            // Try API first for latest data
            const apiResponse = await this.fetchFromAPI(`/${skillName}`);
            return this.transformApiSkill(apiResponse);
        }
        catch (error) {
            // Fallback to cache
            const allSkills = await this.fetchSkills();
            return allSkills.find(skill => skill.name === skillName) || null;
        }
    }
    /**
     * Install a community skill from AINative API
     */
    async install(skillName, version) {
        try {
            // Step 1: Check if already installed
            const isInstalled = await this.registry.isInstalled(skillName);
            if (isInstalled) {
                throw new MarketplaceError(`Skill "${skillName}" is already installed. Uninstall it first to reinstall.`, 'INSTALL_ERROR');
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
            }
            catch (cleanupError) {
                console.warn('Failed to clean up temp file:', cleanupError);
            }
            // Step 6: Register with SkillsRegistry
            await this.registry.install(targetPath);
            // Step 7: Increment download count (fire and forget)
            this.incrementDownloadCount(skillName).catch(err => console.warn('Failed to increment download count:', err));
            console.log(`Successfully installed community skill "${skillName}"`);
        }
        catch (error) {
            throw new MarketplaceError(`Failed to install skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`, 'INSTALL_ERROR');
        }
    }
    /**
     * Search for skills by query
     */
    async search(query) {
        try {
            // Try API search first
            const apiResponse = await this.fetchFromAPI(`/search?q=${encodeURIComponent(query)}`);
            return apiResponse.skills
                .filter(skill => skill.status === 'approved')
                .map(skill => this.transformApiSkill(skill));
        }
        catch (error) {
            // Fallback to local search on cached data
            const allSkills = await this.fetchSkills();
            const lowerQuery = query.toLowerCase();
            return allSkills.filter(skill => skill.name.toLowerCase().includes(lowerQuery) ||
                skill.description.toLowerCase().includes(lowerQuery) ||
                skill.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)) ||
                skill.author.toLowerCase().includes(lowerQuery));
        }
    }
    /**
     * Submit a skill for community review
     */
    async submit(skillPath) {
        // Step 1: Check authentication
        if (!this.authToken) {
            throw new CommunityMarketplaceError('Authentication required to submit skills. Please sign in to AINative.', 'AUTH_REQUIRED');
        }
        try {
            // Step 2: Parse and validate skill
            const skillFileUri = URI.file(path.join(skillPath, 'SKILL.md'));
            const skill = await this.parser.parseSkillFile(skillFileUri.fsPath);
            // Step 3: Validate skill format
            const isValid = await this.parser.validateSkillFormat(skillFileUri.fsPath);
            if (!isValid) {
                throw new CommunityMarketplaceError('Invalid skill format. Please ensure SKILL.md follows the specification.', 'VALIDATION_ERROR');
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
            const response = await this.fetchFromAPI('', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            // Step 7: Clean up temp file
            try {
                await this.fileService.del(URI.file(tempZipPath));
            }
            catch (cleanupError) {
                console.warn('Failed to clean up temp file:', cleanupError);
            }
            return response;
        }
        catch (error) {
            if (error instanceof CommunityMarketplaceError) {
                throw error;
            }
            throw new CommunityMarketplaceError(`Failed to submit skill: ${error instanceof Error ? error.message : String(error)}`, 'SUBMISSION_FAILED');
        }
    }
    /**
     * Rate a community skill
     */
    async rate(skillId, rating) {
        // Validate rating
        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            throw new CommunityMarketplaceError('Rating must be an integer between 1 and 5', 'VALIDATION_ERROR');
        }
        // Check authentication
        if (!this.authToken) {
            throw new CommunityMarketplaceError('Authentication required to rate skills. Please sign in to AINative.', 'AUTH_REQUIRED');
        }
        try {
            const requestData = { rating };
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
        }
        catch (error) {
            throw new CommunityMarketplaceError(`Failed to rate skill: ${error instanceof Error ? error.message : String(error)}`, 'NETWORK_ERROR');
        }
    }
    /**
     * Check if cache is valid
     */
    async isCacheValid() {
        const cacheFile = path.join(this.cacheDir, CommunityMarketplace_1.CACHE_FILENAME);
        const cacheUri = URI.file(cacheFile);
        try {
            const fileContent = await this.fileService.readFile(cacheUri);
            const cacheData = JSON.parse(fileContent.value.toString());
            const age = Date.now() - cacheData.timestamp;
            return age < cacheData.ttl;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Clear the cache
     */
    async clearCache() {
        const cacheFile = path.join(this.cacheDir, CommunityMarketplace_1.CACHE_FILENAME);
        const cacheUri = URI.file(cacheFile);
        try {
            await this.fileService.del(cacheUri);
        }
        catch (error) {
            // Ignore if cache doesn't exist
            if (error instanceof Error && !error.message.includes('ENOENT')) {
                throw error;
            }
        }
    }
    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        return this.authToken !== null;
    }
    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
    }
    /**
     * Fetch data from AINative API with retry logic
     */
    async fetchFromAPI(endpoint, options = {}) {
        const url = `${CommunityMarketplace_1.API_BASE_URL}${endpoint}`;
        let lastError = null;
        for (let attempt = 0; attempt < CommunityMarketplace_1.MAX_RETRIES; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CommunityMarketplace_1.REQUEST_TIMEOUT);
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
                    throw new MarketplaceError(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`, 'RATE_LIMIT');
                }
                // Handle authentication errors
                if (response.status === 401 || response.status === 403) {
                    throw new CommunityMarketplaceError('Authentication failed. Please sign in again.', 'AUTH_REQUIRED');
                }
                // Handle not found
                if (response.status === 404) {
                    throw new MarketplaceError('Resource not found', 'NOT_FOUND');
                }
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }
                return await response.json();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Don't retry on auth errors or validation errors
                if (error instanceof CommunityMarketplaceError || error instanceof MarketplaceError) {
                    throw error;
                }
                // Wait before retrying (exponential backoff)
                if (attempt < CommunityMarketplace_1.MAX_RETRIES - 1) {
                    await this.sleep(CommunityMarketplace_1.RETRY_DELAY * Math.pow(2, attempt));
                }
            }
        }
        throw lastError || new Error('API request failed after retries');
    }
    /**
     * Transform API skill data to MarketplaceSkill format
     */
    transformApiSkill(apiSkill) {
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
    async loadCache(allowStale = false) {
        const cacheFile = path.join(this.cacheDir, CommunityMarketplace_1.CACHE_FILENAME);
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
            return null;
        }
    }
    /**
     * Save skills to cache
     */
    async saveCache(skills) {
        const cacheFile = path.join(this.cacheDir, CommunityMarketplace_1.CACHE_FILENAME);
        const cacheUri = URI.file(cacheFile);
        const cacheDir = URI.file(this.cacheDir);
        try {
            // Ensure cache directory exists
            await this.fileService.createFolder(cacheDir);
            const cacheData = {
                skills,
                timestamp: Date.now(),
                ttl: CommunityMarketplace_1.CACHE_TTL
            };
            const content = JSON.stringify(cacheData, null, 2);
            await this.fileService.writeFile(cacheUri, VSBuffer.fromString(content));
        }
        catch (error) {
            console.warn('Failed to save cache:', error);
            // Non-fatal - continue even if caching fails
        }
    }
    /**
     * Download file from URL
     */
    async downloadFile(url, targetPath) {
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
    async extractZip(zipPath, targetPath) {
        // Ensure target directory exists
        await this.fileService.createFolder(URI.file(targetPath));
        try {
            // Use unzip command (cross-platform fallback needed)
            await execAsync(`unzip -o "${zipPath}" -d "${targetPath}"`, { timeout: 60000 });
        }
        catch (error) {
            throw new Error(`Failed to extract zip file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Create zip archive of skill directory
     */
    async createZipArchive(sourcePath, targetZipPath) {
        try {
            // Use system zip command (cross-platform)
            const cwd = path.dirname(sourcePath);
            const dirName = path.basename(sourcePath);
            // Create zip archive
            await execAsync(`cd "${cwd}" && zip -r "${targetZipPath}" "${dirName}"`, { timeout: 60000 });
        }
        catch (error) {
            throw new Error(`Failed to create zip archive: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Increment download count (fire and forget)
     */
    async incrementDownloadCount(skillName) {
        try {
            await this.fetchFromAPI(`/${skillName}/download`, {
                method: 'POST'
            });
        }
        catch (error) {
            // Silently fail - this is not critical
            console.debug('Failed to increment download count:', error);
        }
    }
    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
CommunityMarketplace = CommunityMarketplace_1 = __decorate([
    __param(0, IFileService),
    __param(1, ISkillsRegistry),
    __param(2, ISkillParser),
    __param(3, IEnvironmentService)
], CommunityMarketplace);
// Register the service
registerSingleton(ICommunityMarketplace, CommunityMarketplace, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbXVuaXR5TWFya2V0cGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9tYXJrZXRwbGFjZS9jb21tdW5pdHlNYXJrZXRwbGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNqQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdELE9BQU8sRUFDTixxQkFBcUIsRUFLckIseUJBQXlCLEVBQ3pCLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTyxFQUdOLGdCQUFnQixFQUNoQixNQUFNLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLDREQUE0RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMs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
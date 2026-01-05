/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { MarketplaceSkill, MarketplaceSource } from '../../marketplace/marketplaceTypes.js';
import { IOfficialMarketplace } from '../../marketplace/officialMarketplaceTypes.js';
import { IAnthropicMarketplace } from '../../marketplace/anthropicMarketplaceTypes.js';
import { ICommunityMarketplace } from '../../marketplace/communityMarketplaceTypes.js';
import { ISkillSearchService } from '../../marketplace/searchServiceTypes.js';
import { MarketplaceFormatter } from './marketplaceFormatter.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';

/**
 * Options for marketplace browse command
 */
export interface MarketplaceBrowseOptions {
	/** Search term to filter skills */
	searchTerm?: string;
	/** Category to filter by */
	category?: string;
	/** Provider to filter by (official, anthropic, community) */
	provider?: MarketplaceSource;
	/** Force refresh cache */
	forceRefresh?: boolean;
	/** Show cache status */
	showCacheStatus?: boolean;
}

/**
 * Result of marketplace browse operation
 */
export interface MarketplaceBrowseResult {
	/** Filtered skills */
	skills: MarketplaceSkill[];
	/** Formatted output string */
	output: string;
	/** Total number of skills before filtering */
	totalSkills: number;
	/** Whether data came from cache */
	fromCache: boolean;
}

/**
 * Marketplace browse command implementation
 * Fetches and displays skills from all marketplace sources
 */
export class MarketplaceCommand {

	constructor(
		private readonly officialMarketplace: IOfficialMarketplace,
		private readonly anthropicMarketplace: IAnthropicMarketplace,
		private readonly communityMarketplace: ICommunityMarketplace,
		private readonly searchService: ISkillSearchService,
		private readonly logService: ILogService
	) { }

	/**
	 * Execute marketplace browse command
	 */
	async browse(options: MarketplaceBrowseOptions = {}): Promise<MarketplaceBrowseResult> {
		this.logService.info('[MarketplaceCommand] Starting browse command', options);

		// Show cache status if requested
		if (options.showCacheStatus) {
			return this.showCacheStatus();
		}

		try {
			// Fetch skills from all sources
			const allSkills = await this.fetchAllSkills(options.forceRefresh ?? false);

			// Apply filters
			const filteredSkills = this.applyFilters(allSkills, options);

			// Sort by source and name
			const sortedSkills = this.sortSkills(filteredSkills);

			// Format output
			const output = MarketplaceFormatter.formatBrowseResults(
				sortedSkills,
				options.searchTerm,
				{
					category: options.category,
					provider: options.provider
				}
			);

			return {
				skills: sortedSkills,
				output,
				totalSkills: allSkills.length,
				fromCache: !options.forceRefresh
			};

		} catch (error) {
			this.logService.error('[MarketplaceCommand] Browse failed', error);
			throw error;
		}
	}

	/**
	 * Fetch skills from all marketplace sources
	 */
	private async fetchAllSkills(forceRefresh: boolean): Promise<MarketplaceSkill[]> {
		const allSkills: MarketplaceSkill[] = [];
		const errors: Array<{ source: MarketplaceSource; error: Error }> = [];

		// Fetch from official marketplace
		try {
			this.logService.info('[MarketplaceCommand] Fetching official skills');
			const officialSkills = await this.officialMarketplace.fetchSkills(forceRefresh);
			allSkills.push(...officialSkills);
			this.logService.info(`[MarketplaceCommand] Fetched ${officialSkills.length} official skills`);
		} catch (error) {
			this.logService.warn('[MarketplaceCommand] Failed to fetch official skills', error);
			errors.push({ source: 'official', error: error as Error });
		}

		// Fetch from Anthropic marketplace
		try {
			this.logService.info('[MarketplaceCommand] Fetching Anthropic skills');
			const anthropicSkills = await this.anthropicMarketplace.fetchSkills(forceRefresh);
			allSkills.push(...anthropicSkills);
			this.logService.info(`[MarketplaceCommand] Fetched ${anthropicSkills.length} Anthropic skills`);
		} catch (error) {
			this.logService.warn('[MarketplaceCommand] Failed to fetch Anthropic skills', error);
			errors.push({ source: 'anthropic', error: error as Error });
		}

		// Fetch from community marketplace
		try {
			this.logService.info('[MarketplaceCommand] Fetching community skills');
			const communitySkills = await this.communityMarketplace.fetchSkills(forceRefresh);
			allSkills.push(...communitySkills);
			this.logService.info(`[MarketplaceCommand] Fetched ${communitySkills.length} community skills`);
		} catch (error) {
			this.logService.warn('[MarketplaceCommand] Failed to fetch community skills', error);
			errors.push({ source: 'community', error: error as Error });
		}

		// If all sources failed, throw error
		if (errors.length === 3) {
			this.logService.error('[MarketplaceCommand] All marketplace sources failed');
			throw new Error('Failed to fetch skills from all marketplace sources. Please check your network connection and try again.');
		}

		// Log partial failures
		if (errors.length > 0) {
			this.logService.warn(`[MarketplaceCommand] ${errors.length} marketplace source(s) failed`, errors);
		}

		return allSkills;
	}

	/**
	 * Apply filters to skills list
	 */
	private applyFilters(skills: MarketplaceSkill[], options: MarketplaceBrowseOptions): MarketplaceSkill[] {
		let filtered = skills;

		// Filter by provider
		if (options.provider) {
			filtered = filtered.filter(skill => skill.source === options.provider);
			this.logService.info(`[MarketplaceCommand] Filtered by provider: ${options.provider}, ${filtered.length} results`);
		}

		// Filter by category
		if (options.category) {
			const categoryLower = options.category.toLowerCase();
			filtered = filtered.filter(skill =>
				skill.keywords?.some(keyword => keyword.toLowerCase().includes(categoryLower)) ||
				skill.description.toLowerCase().includes(categoryLower) ||
				skill.name.toLowerCase().includes(categoryLower)
			);
			this.logService.info(`[MarketplaceCommand] Filtered by category: ${options.category}, ${filtered.length} results`);
		}

		// Filter by search term
		if (options.searchTerm) {
			const searchLower = options.searchTerm.toLowerCase();
			filtered = filtered.filter(skill =>
				skill.name.toLowerCase().includes(searchLower) ||
				skill.description.toLowerCase().includes(searchLower) ||
				skill.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower))
			);
			this.logService.info(`[MarketplaceCommand] Filtered by search term: ${options.searchTerm}, ${filtered.length} results`);
		}

		return filtered;
	}

	/**
	 * Sort skills by source and name
	 */
	private sortSkills(skills: MarketplaceSkill[]): MarketplaceSkill[] {
		const sourceOrder: Record<MarketplaceSource, number> = {
			official: 1,
			anthropic: 2,
			community: 3
		};

		return skills.sort((a, b) => {
			// First sort by source
			const sourceCompare = sourceOrder[a.source] - sourceOrder[b.source];
			if (sourceCompare !== 0) {
				return sourceCompare;
			}

			// Then sort by name
			return a.name.localeCompare(b.name);
		});
	}

	/**
	 * Show cache status for all marketplaces
	 */
	private async showCacheStatus(): Promise<MarketplaceBrowseResult> {
		this.logService.info('[MarketplaceCommand] Fetching cache status');

		const [official, anthropic, community] = await Promise.all([
			this.officialMarketplace.getCacheStatus(),
			this.anthropicMarketplace.getCacheStatus(),
			this.communityMarketplace.isCacheValid().then(valid => ({ valid, age: 0, lastUpdate: null }))
		]);

		const output = MarketplaceFormatter.formatCacheStatus({
			official,
			anthropic,
			community
		});

		return {
			skills: [],
			output,
			totalSkills: 0,
			fromCache: true
		};
	}

	/**
	 * Search marketplace using unified search service
	 */
	async search(query: string, filters?: {
		category?: string;
		provider?: MarketplaceSource;
	}): Promise<MarketplaceBrowseResult> {
		this.logService.info('[MarketplaceCommand] Searching marketplace', { query, filters });

		try {
			// Use search service for more advanced search
			const results = await this.searchService.search(query, {
				source: filters?.provider || 'all',
				category: filters?.category
			});

			// Convert search results to marketplace skills
			const skills: MarketplaceSkill[] = results.map(result => ({
				name: result.name,
				description: result.description,
				version: result.version,
				source: result.source,
				author: result.author,
				keywords: result.keywords,
				rating: result.rating,
				downloads: result.downloads,
				updatedAt: result.updatedAt,
				installCommand: result.installCommand,
				homepage: result.homepage,
				repository: result.repository
			}));

			const output = MarketplaceFormatter.formatBrowseResults(skills, query, filters);

			return {
				skills,
				output,
				totalSkills: results.length,
				fromCache: false
			};

		} catch (error) {
			this.logService.error('[MarketplaceCommand] Search failed', error);
			throw error;
		}
	}

	/**
	 * Clear marketplace caches
	 */
	async clearCache(): Promise<void> {
		this.logService.info('[MarketplaceCommand] Clearing marketplace caches');

		await Promise.all([
			this.officialMarketplace.clearCache(),
			this.anthropicMarketplace.clearCache(),
			this.communityMarketplace.clearCache()
		]);

		this.logService.info('[MarketplaceCommand] All caches cleared');
	}
}

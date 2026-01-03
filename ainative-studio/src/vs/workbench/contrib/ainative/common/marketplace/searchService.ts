/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import Fuse from 'fuse.js';
import { ISkillSearchService } from './searchServiceTypes.js';
import { SearchFilters, SearchResult, SearchStats } from './searchTypes.js';
import { MarketplaceSkill, MarketplaceSource } from './marketplaceTypes.js';
import { IOfficialMarketplace } from './officialMarketplaceTypes.js';
import { IAnthropicMarketplace } from './anthropicMarketplaceTypes.js';
import { ICommunityMarketplace } from './communityMarketplaceTypes.js';
import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';

/**
 * Unified search service implementation
 * Provides search across all marketplace sources with fuzzy matching, filtering, and sorting
 */
class SkillSearchService implements ISkillSearchService {
	declare readonly _serviceBrand: undefined;

	private lastSearchStats: SearchStats | null = null;

	constructor(
		@IOfficialMarketplace private readonly officialMarketplace: IOfficialMarketplace,
		@IAnthropicMarketplace private readonly anthropicMarketplace: IAnthropicMarketplace,
		@ICommunityMarketplace private readonly communityMarketplace: ICommunityMarketplace
	) {}

	/**
	 * Search across all marketplaces with filters and sorting
	 */
	async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
		const startTime = Date.now();

		// Determine which sources to search
		const sources = this.determineSources(filters?.source);

		// Fetch skills from all selected sources in parallel
		const allSkills = await this.fetchFromSources(sources);

		// Apply filters (category, minRating)
		const filtered = this.applyFilters(allSkills, filters);

		// Perform fuzzy search
		const results = this.fuzzySearch(query, filtered);

		// Sort results
		const sorted = this.sortResults(results, filters?.sortBy || 'relevance');

		// Store search statistics
		const executionTime = Date.now() - startTime;
		this.lastSearchStats = {
			totalSkills: allSkills.length,
			resultCount: sorted.length,
			executionTime,
			sourcesSearched: sources
		};

		return sorted;
	}

	/**
	 * Search only the official marketplace
	 */
	async searchOfficial(query: string): Promise<MarketplaceSkill[]> {
		return this.officialMarketplace.search(query);
	}

	/**
	 * Search only the Anthropic marketplace
	 */
	async searchAnthropic(query: string): Promise<MarketplaceSkill[]> {
		return this.anthropicMarketplace.search(query);
	}

	/**
	 * Search only the community marketplace
	 */
	async searchCommunity(query: string): Promise<MarketplaceSkill[]> {
		return this.communityMarketplace.search(query);
	}

	/**
	 * Get search statistics from the last search operation
	 */
	getLastSearchStats(): SearchStats | null {
		return this.lastSearchStats;
	}

	/**
	 * Determine which sources to search based on filter
	 */
	private determineSources(sourceFilter?: MarketplaceSource | 'all'): MarketplaceSource[] {
		if (!sourceFilter || sourceFilter === 'all') {
			return ['official', 'anthropic', 'community'];
		}
		return [sourceFilter as MarketplaceSource];
	}

	/**
	 * Fetch skills from selected sources in parallel
	 */
	private async fetchFromSources(sources: MarketplaceSource[]): Promise<MarketplaceSkill[]> {
		const promises: Promise<MarketplaceSkill[]>[] = [];

		if (sources.includes('official')) {
			promises.push(
				this.officialMarketplace.fetchSkills().catch(err => {
					console.error('Failed to fetch official marketplace skills:', err);
					return [];
				})
			);
		}

		if (sources.includes('anthropic')) {
			promises.push(
				this.anthropicMarketplace.fetchSkills().catch(err => {
					console.error('Failed to fetch Anthropic marketplace skills:', err);
					return [];
				})
			);
		}

		if (sources.includes('community')) {
			promises.push(
				this.communityMarketplace.fetchSkills().catch(err => {
					console.error('Failed to fetch community marketplace skills:', err);
					return [];
				})
			);
		}

		const results = await Promise.all(promises);
		return results.flat();
	}

	/**
	 * Apply category and rating filters
	 */
	private applyFilters(skills: MarketplaceSkill[], filters?: SearchFilters): MarketplaceSkill[] {
		if (!filters) {
			return skills;
		}

		return skills.filter(skill => {
			// Filter by category (keyword match)
			if (filters.category && skill.keywords) {
				const categoryMatch = skill.keywords.some(
					keyword => keyword.toLowerCase().includes(filters.category!.toLowerCase())
				);
				if (!categoryMatch) {
					return false;
				}
			}

			// Filter by minimum rating
			if (filters.minRating !== undefined && skill.rating !== undefined) {
				if (skill.rating < filters.minRating) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Perform fuzzy search using Fuse.js
	 */
	private fuzzySearch(query: string, skills: MarketplaceSkill[]): SearchResult[] {
		// If query is empty, return all skills with default relevance
		if (!query || query.trim().length === 0) {
			return skills.map(skill => ({
				...skill,
				relevanceScore: 1.0,
				matchedFields: []
			}));
		}

		// Configure Fuse.js for fuzzy matching
		const fuse = new Fuse(skills, {
			keys: [
				{ name: 'name', weight: 0.4 },
				{ name: 'description', weight: 0.3 },
				{ name: 'keywords', weight: 0.2 },
				{ name: 'author', weight: 0.1 }
			],
			threshold: 0.3, // 0 = perfect match, 1 = match anything
			includeScore: true,
			includeMatches: true,
			ignoreLocation: true, // Search entire string, not just beginning
			useExtendedSearch: false
		});

		const results = fuse.search(query);

		return results.map(result => {
			// Convert Fuse score (lower is better) to relevance score (higher is better)
			const relevanceScore = 1 - (result.score || 0);

			// Extract matched field names
			const matchedFields = result.matches?.map(m => String(m.key)) || [];

			return {
				...result.item,
				relevanceScore,
				matchedFields
			};
		});
	}

	/**
	 * Sort results based on sort criteria
	 */
	private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
		const sorted = [...results];

		switch (sortBy) {
			case 'popularity':
				// Sort by download count (descending)
				sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
				break;

			case 'rating':
				// Sort by rating (descending), then by rating count
				sorted.sort((a, b) => {
					const ratingDiff = (b.rating || 0) - (a.rating || 0);
					if (ratingDiff !== 0) {
						return ratingDiff;
					}
					// If ratings are equal, prefer skills with more ratings
					return (b.downloads || 0) - (a.downloads || 0);
				});
				break;

			case 'date':
				// Sort by updated date (newest first)
				sorted.sort((a, b) => {
					const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
					const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
					return dateB.getTime() - dateA.getTime();
				});
				break;

			case 'relevance':
			default:
				// Sort by relevance score (descending)
				sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
				break;
		}

		return sorted;
	}
}

// Register the service
registerSingleton(ISkillSearchService, SkillSearchService, InstantiationType.Delayed);

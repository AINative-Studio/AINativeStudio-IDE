/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * EXAMPLE: Using the Unified Search Service
 *
 * This file demonstrates how to use the SkillSearchService to search across
 * official, Anthropic, and community marketplaces with filtering and sorting.
 */

import { ISkillSearchService } from './searchServiceTypes.js';
import { SearchFilters } from './searchTypes.js';

/**
 * Example 1: Search all marketplaces
 */
async function searchAllMarketplaces(searchService: ISkillSearchService) {
	console.log('=== Example 1: Search All Marketplaces ===');

	const results = await searchService.search('database');

	console.log(`Found ${results.length} results:`);
	results.slice(0, 5).forEach(result => {
		console.log(`- ${result.name} (${result.source})`);
		console.log(`  Relevance: ${result.relevanceScore.toFixed(2)}`);
		console.log(`  Matched fields: ${result.matchedFields.join(', ')}`);
		console.log(`  Description: ${result.description.substring(0, 80)}...`);
	});

	const stats = searchService.getLastSearchStats();
	console.log(`\nSearch stats: ${stats?.resultCount} results in ${stats?.executionTime}ms`);
}

/**
 * Example 2: Search with filters
 */
async function searchWithFilters(searchService: ISkillSearchService) {
	console.log('\n=== Example 2: Search with Filters ===');

	const filters: SearchFilters = {
		source: 'official',
		minRating: 4.0,
		category: 'database',
		sortBy: 'popularity'
	};

	const results = await searchService.search('api', filters);

	console.log(`Found ${results.length} official skills with rating >= 4.0:`);
	results.slice(0, 5).forEach(result => {
		console.log(`- ${result.name}`);
		console.log(`  Rating: ${result.rating || 'N/A'} | Downloads: ${result.downloads || 'N/A'}`);
		console.log(`  Keywords: ${result.keywords.join(', ')}`);
	});
}

/**
 * Example 3: Sort by different criteria
 */
async function searchWithDifferentSorts(searchService: ISkillSearchService) {
	console.log('\n=== Example 3: Different Sort Options ===');

	// Sort by relevance (default)
	const byRelevance = await searchService.search('workflow', { sortBy: 'relevance' });
	console.log('\nTop 3 by Relevance:');
	byRelevance.slice(0, 3).forEach(r => console.log(`- ${r.name} (score: ${r.relevanceScore.toFixed(2)})`));

	// Sort by popularity
	const byPopularity = await searchService.search('workflow', { sortBy: 'popularity' });
	console.log('\nTop 3 by Popularity:');
	byPopularity.slice(0, 3).forEach(r => console.log(`- ${r.name} (${r.downloads || 0} downloads)`));

	// Sort by rating
	const byRating = await searchService.search('workflow', { sortBy: 'rating' });
	console.log('\nTop 3 by Rating:');
	byRating.slice(0, 3).forEach(r => console.log(`- ${r.name} (${r.rating || 'N/A'} stars)`));

	// Sort by date
	const byDate = await searchService.search('workflow', { sortBy: 'date' });
	console.log('\nTop 3 by Date (newest):');
	byDate.slice(0, 3).forEach(r => console.log(`- ${r.name} (updated: ${r.updatedAt})`));
}

/**
 * Example 4: Search specific marketplaces
 */
async function searchSpecificMarketplaces(searchService: ISkillSearchService) {
	console.log('\n=== Example 4: Search Specific Marketplaces ===');

	// Search only official
	const officialResults = await searchService.searchOfficial('zerodb');
	console.log(`\nOfficial marketplace: ${officialResults.length} results`);

	// Search only Anthropic
	const anthropicResults = await searchService.searchAnthropic('mcp');
	console.log(`Anthropic marketplace: ${anthropicResults.length} results`);

	// Search only community
	const communityResults = await searchService.searchCommunity('custom');
	console.log(`Community marketplace: ${communityResults.length} results`);
}

/**
 * Example 5: Empty query (returns all skills)
 */
async function getAllSkills(searchService: ISkillSearchService) {
	console.log('\n=== Example 5: Get All Skills ===');

	const allSkills = await searchService.search('');

	console.log(`Total skills across all marketplaces: ${allSkills.length}`);

	const stats = searchService.getLastSearchStats();
	if (stats) {
		console.log(`Sources searched: ${stats.sourcesSearched.join(', ')}`);
		console.log(`Execution time: ${stats.executionTime}ms`);
	}
}

/**
 * Example 6: Complex filter combinations
 */
async function complexFilterExample(searchService: ISkillSearchService) {
	console.log('\n=== Example 6: Complex Filters ===');

	// Find highly-rated community skills about AI
	const filters: SearchFilters = {
		source: 'community',
		minRating: 4.5,
		category: 'ai',
		sortBy: 'popularity'
	};

	const results = await searchService.search('assistant', filters);

	console.log(`Found ${results.length} community AI skills with rating >= 4.5:`);
	results.forEach(result => {
		console.log(`\n- ${result.name}`);
		console.log(`  Author: ${result.author}`);
		console.log(`  Rating: ${result.rating} stars`);
		console.log(`  Downloads: ${result.downloads}`);
		console.log(`  Description: ${result.description}`);
		console.log(`  Matched fields: ${result.matchedFields.join(', ')}`);
	});
}

/**
 * Example usage in a service/component
 */
export class MarketplaceBrowserExample {
	constructor(
		@ISkillSearchService private readonly searchService: ISkillSearchService
	) {}

	async performSearch(query: string, filters?: SearchFilters) {
		try {
			const results = await this.searchService.search(query, filters);
			const stats = this.searchService.getLastSearchStats();

			return {
				results,
				stats,
				success: true
			};
		} catch (error) {
			console.error('Search failed:', error);
			return {
				results: [],
				stats: null,
				success: false,
				error
			};
		}
	}

	async quickSearch(query: string) {
		// Quick search with sensible defaults
		return this.searchService.search(query, {
			source: 'all',
			sortBy: 'relevance',
			minRating: 3.0
		});
	}
}

/**
 * Expected output structure:
 *
 * SearchResult {
 *   // From MarketplaceSkill:
 *   name: '@ainative/skill-zerodb-workflows',
 *   description: 'Workflows for ZeroDB operations',
 *   version: '1.2.0',
 *   source: 'official',
 *   author: 'AINative Team',
 *   keywords: ['database', 'workflow', 'zerodb'],
 *   rating: 4.5,
 *   downloads: 1234,
 *   updatedAt: Date(2026-01-02),
 *   installCommand: 'npm install -g @ainative/skill-zerodb-workflows',
 *   homepage: 'https://github.com/ainative/skill-zerodb-workflows',
 *   repository: 'https://github.com/ainative/skill-zerodb-workflows',
 *
 *   // Added by search service:
 *   relevanceScore: 0.95,
 *   matchedFields: ['name', 'keywords', 'description']
 * }
 *
 * SearchStats {
 *   totalSkills: 150,
 *   resultCount: 12,
 *   executionTime: 87,
 *   sourcesSearched: ['official', 'anthropic', 'community']
 * }
 */

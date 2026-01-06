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
/**
 * EXAMPLE: Using the Unified Search Service
 *
 * This file demonstrates how to use the SkillSearchService to search across
 * official, Anthropic, and community marketplaces with filtering and sorting.
 */
import { ISkillSearchService } from './searchServiceTypes.js';
/**
 * Example 1: Search all marketplaces
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchAllMarketplaces(searchService) {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchWithFilters(searchService) {
    console.log('\n=== Example 2: Search with Filters ===');
    const filters = {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchWithDifferentSorts(searchService) {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function searchSpecificMarketplaces(searchService) {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getAllSkills(searchService) {
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function complexFilterExample(searchService) {
    console.log('\n=== Example 6: Complex Filters ===');
    // Find highly-rated community skills about AI
    const filters = {
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
let MarketplaceBrowserExample = class MarketplaceBrowserExample {
    constructor(searchService) {
        this.searchService = searchService;
    }
    async performSearch(query, filters) {
        try {
            const results = await this.searchService.search(query, filters);
            const stats = this.searchService.getLastSearchStats();
            return {
                results,
                stats,
                success: true
            };
        }
        catch (error) {
            console.error('Search failed:', error);
            return {
                results: [],
                stats: null,
                success: false,
                error
            };
        }
    }
    async quickSearch(query) {
        // Quick search with sensible defaults
        return this.searchService.search(query, {
            source: 'all',
            sortBy: 'relevance',
            minRating: 3.0
        });
    }
};
MarketplaceBrowserExample = __decorate([
    __param(0, ISkillSearchService)
], MarketplaceBrowserExample);
export { MarketplaceBrowserExample };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoU2VydmljZUV4YW1wbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9tYXJrZXRwbGFjZS9zZWFyY2hTZXJ2aWNlRXhhbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRzs7Ozs7R0FLRztBQUVILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRzlEOztHQUVHO0FBQ0gsNkRBQTZEO0FBQzdELEtBQUssVUFBVSxxQkFBcUIsQ0FBQyxhQUFrQztJQUN0RSxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7SUFFMUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxhQUFhLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRXZELE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxPQUFPLENBQUMsTUFBTSxXQUFXLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRSxPQUFPLENBQUMsR0FBRyxDQUFD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
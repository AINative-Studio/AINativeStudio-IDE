/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { MarketplaceFormatter } from './marketplaceFormatter.js';
/**
 * Marketplace browse command implementation
 * Fetches and displays skills from all marketplace sources
 */
export class MarketplaceCommand {
    constructor(officialMarketplace, anthropicMarketplace, communityMarketplace, searchService, logService) {
        this.officialMarketplace = officialMarketplace;
        this.anthropicMarketplace = anthropicMarketplace;
        this.communityMarketplace = communityMarketplace;
        this.searchService = searchService;
        this.logService = logService;
    }
    /**
     * Execute marketplace browse command
     */
    async browse(options = {}) {
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
            const output = MarketplaceFormatter.formatBrowseResults(sortedSkills, options.searchTerm, {
                category: options.category,
                provider: options.provider
            });
            return {
                skills: sortedSkills,
                output,
                totalSkills: allSkills.length,
                fromCache: !options.forceRefresh
            };
        }
        catch (error) {
            this.logService.error('[MarketplaceCommand] Browse failed', error);
            throw error;
        }
    }
    /**
     * Fetch skills from all marketplace sources
     */
    async fetchAllSkills(forceRefresh) {
        const allSkills = [];
        const errors = [];
        // Fetch from official marketplace
        try {
            this.logService.info('[MarketplaceCommand] Fetching official skills');
            const officialSkills = await this.officialMarketplace.fetchSkills(forceRefresh);
            allSkills.push(...officialSkills);
            this.logService.info(`[MarketplaceCommand] Fetched ${officialSkills.length} official skills`);
        }
        catch (error) {
            this.logService.warn('[MarketplaceCommand] Failed to fetch official skills', error);
            errors.push({ source: 'official', error: error });
        }
        // Fetch from Anthropic marketplace
        try {
            this.logService.info('[MarketplaceCommand] Fetching Anthropic skills');
            const anthropicSkills = await this.anthropicMarketplace.fetchSkills(forceRefresh);
            allSkills.push(...anthropicSkills);
            this.logService.info(`[MarketplaceCommand] Fetched ${anthropicSkills.length} Anthropic skills`);
        }
        catch (error) {
            this.logService.warn('[MarketplaceCommand] Failed to fetch Anthropic skills', error);
            errors.push({ source: 'anthropic', error: error });
        }
        // Fetch from community marketplace
        try {
            this.logService.info('[MarketplaceCommand] Fetching community skills');
            const communitySkills = await this.communityMarketplace.fetchSkills(forceRefresh);
            allSkills.push(...communitySkills);
            this.logService.info(`[MarketplaceCommand] Fetched ${communitySkills.length} community skills`);
        }
        catch (error) {
            this.logService.warn('[MarketplaceCommand] Failed to fetch community skills', error);
            errors.push({ source: 'community', error: error });
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
    applyFilters(skills, options) {
        let filtered = skills;
        // Filter by provider
        if (options.provider) {
            filtered = filtered.filter(skill => skill.source === options.provider);
            this.logService.info(`[MarketplaceCommand] Filtered by provider: ${options.provider}, ${filtered.length} results`);
        }
        // Filter by category
        if (options.category) {
            const categoryLower = options.category.toLowerCase();
            filtered = filtered.filter(skill => skill.keywords?.some(keyword => keyword.toLowerCase().includes(categoryLower)) ||
                skill.description.toLowerCase().includes(categoryLower) ||
                skill.name.toLowerCase().includes(categoryLower));
            this.logService.info(`[MarketplaceCommand] Filtered by category: ${options.category}, ${filtered.length} results`);
        }
        // Filter by search term
        if (options.searchTerm) {
            const searchLower = options.searchTerm.toLowerCase();
            filtered = filtered.filter(skill => skill.name.toLowerCase().includes(searchLower) ||
                skill.description.toLowerCase().includes(searchLower) ||
                skill.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower)));
            this.logService.info(`[MarketplaceCommand] Filtered by search term: ${options.searchTerm}, ${filtered.length} results`);
        }
        return filtered;
    }
    /**
     * Sort skills by source and name
     */
    sortSkills(skills) {
        const sourceOrder = {
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
    async showCacheStatus() {
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
    async search(query, filters) {
        this.logService.info('[MarketplaceCommand] Searching marketplace', { query, filters });
        try {
            // Use search service for more advanced search
            const results = await this.searchService.search(query, {
                source: filters?.provider || 'all',
                category: filters?.category
            });
            // Convert search results to marketplace skills
            const skills = results.map(result => ({
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
        }
        catch (error) {
            this.logService.error('[MarketplaceCommand] Search failed', error);
            throw error;
        }
    }
    /**
     * Clear marketplace caches
     */
    async clearCache() {
        this.logService.info('[MarketplaceCommand] Clearing marketplace caches');
        await Promise.all([
            this.officialMarketplace.clearCache(),
            this.anthropicMarketplace.clearCache(),
            this.communityMarketplace.clearCache()
        ]);
        this.logService.info('[MarketplaceCommand] All caches cleared');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2VDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL2NsaS9tYXJrZXRwbGFjZUNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFpQ2pFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFFOUIsWUFDa0IsbUJBQXlDLEVBQ3pDLG9CQUEyQyxFQUMzQyxvQkFBMkMsRUFDM0MsYUFBa0MsRUFDbEMsVUFBdUI7UUFKdkIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN6Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0Msa0JBQWEsR0FBYixhQUFhLENBQXFCO1FBQ2xDLGVBQVUsR0FBVixVQUFVLENBQWE7SUFDckMsQ0FBQztJQUVMOztPQUVHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFvQyxFQUFFO1FBQ2xELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTlFLGlDQUFpQztRQUNqQyxJQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM3QixPQUFPLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osZ0NBQWdDO1lBQ2hDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLEtBQUssQ0FBQyxDQUFDO1lBRTNFLGdCQUFnQjtZQUNoQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUU3RCwwQkFBMEI7WUFDMUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUVyRCxnQkFBZ0I7WUFDaEIsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsbUJBQW1CLENBQ3RELFlBQVksRUFDWixPQUFPLENBQUMsVUFBVSxFQUNsQjtnQkFDQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7Z0JBQzFCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTthQUMxQixDQUNELENBQUM7WUFFRixPQUFPO2dCQUNOLE1BQU0sRUFBRSxZQUFZO2dCQUNwQixNQUFNO2dCQUNOLFdBQVcsRUFBRSxTQUFTLENBQUMsTUFBTTtnQkFDN0IsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVk7YUFDaEMsQ0FBQztRQUVILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25FLE1BQU0sS0FBSyxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxjQUFjLENBQUMsWUFBcUI7UUFDakQsTUFBTSxTQUFTLEdBQXVCLEVBQUUsQ0FBQztRQUN6QyxNQUFNLE1BQU0sR0FBdUQsRUFBRSxDQUFDO1FBRXRFLGtDQUFrQztRQUNsQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNoRixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLGNBQWMsQ0FBQyxNQUFNLGtCQUFrQixDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsc0RBQXNELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDcEYsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQWMsRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNsRixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBZSxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLGVBQWUsQ0FBQyxNQUFNLG1CQUFtQixDQUFDLENBQUM7UUFDakcsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckYsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEtBQWMsRUFBRSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNsRixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBZSxDQUFDLENBQUM7WUFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLGVBQWUsQ0FBQyxNQUFNLG1CQUFtQixDQUFDLENBQUM7UUFDakcsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckYsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEtBQWMsRUFBRSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVELHFDQUFxQztRQUNyQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztZQUM3RSxNQUFNLElBQUksS0FBSyxDQUFDLDBHQUEwRyxDQUFDLENBQUM7UUFDN0gsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BHLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxZQUFZLENBQUMsTUFBMEIsRUFBRSxPQUFpQztRQUNqRixJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUM7UUFFdEIscUJBQXFCO1FBQ3JCLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsOENBQThDLE9BQU8sQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU0sVUFBVSxDQUFDLENBQUM7UUFDcEgsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JELFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQ2xDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDOUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO2dCQUN2RCxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FDaEQsQ0FBQztZQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxDQUFDO1FBQ3BILENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNyRCxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUNsQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7Z0JBQzlDLEtBQUssQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztnQkFDckQsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQzVFLENBQUM7WUFDRixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxpREFBaUQsT0FBTyxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUMsTUFBTSxVQUFVLENBQUMsQ0FBQztRQUN6SCxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssVUFBVSxDQUFDLE1BQTBCO1FBQzVDLE1BQU0sV0FBVyxHQUFzQztZQUN0RCxRQUFRLEVBQUUsQ0FBQztZQUNYLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDO1FBRUYsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNCLHVCQUF1QjtZQUN2QixNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEUsSUFBSSxhQUFhLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLE9BQU8sYUFBYSxDQUFDO1lBQ3RCLENBQUM7WUFFRCxvQkFBb0I7WUFDcEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsZUFBZTtRQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBRW5FLE1BQU0sQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUMxRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFO1lBQ3pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUU7WUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUM3RixDQUFDLENBQUM7UUFFSCxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQztZQUNyRCxRQUFRO1lBQ1IsU0FBUztZQUNULFNBQVM7U0FDVCxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ04sTUFBTSxFQUFFLEVBQUU7WUFDVixNQUFNO1lBQ04sV0FBVyxFQUFFLENBQUM7WUFDZCxTQUFTLEVBQUUsSUFBSTtTQUNmLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQWEsRUFBRSxPQUczQjtRQUNBLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFdkYsSUFBSSxDQUFDO1lBQ0osOENBQThDO1lBQzlDLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUN0RCxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsSUFBSSxLQUFLO2dCQUNsQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVE7YUFDM0IsQ0FBQyxDQUFDO1lBRUgsK0NBQStDO1lBQy9DLE1BQU0sTUFBTSxHQUF1QixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO2dCQUNqQixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQy9CLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztnQkFDdkIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO2dCQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07Z0JBQ3JCLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtnQkFDekIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO2dCQUNyQixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQzNCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztnQkFDM0IsY0FBYyxFQUFFLE1BQU0sQ0FBQyxjQUFjO2dCQUNyQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7Z0JBQ3pCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTthQUM3QixDQUFDLENBQUMsQ0FBQztZQUVKLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFaEYsT0FBTztnQkFDTixNQUFNO2dCQUNOLE1BQU07Z0JBQ04sV0FBVyxFQUFFLE9BQU8sQ0FBQyxNQUFNO2dCQUMzQixTQUFTLEVBQUUsS0FBSzthQUNoQixDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbkUsTUFBTSxLQUFLLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVU7UUFDZixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7WUFDdEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtTQUN0QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7Q0FDRCJ9
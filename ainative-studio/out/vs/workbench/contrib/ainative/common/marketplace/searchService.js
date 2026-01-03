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
import Fuse from 'fuse.js';
import { ISkillSearchService } from './searchServiceTypes.js';
import { IOfficialMarketplace } from './officialMarketplaceTypes.js';
import { IAnthropicMarketplace } from './anthropicMarketplaceTypes.js';
import { ICommunityMarketplace } from './communityMarketplaceTypes.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
/**
 * Unified search service implementation
 * Provides search across all marketplace sources with fuzzy matching, filtering, and sorting
 */
let SkillSearchService = class SkillSearchService {
    constructor(officialMarketplace, anthropicMarketplace, communityMarketplace) {
        this.officialMarketplace = officialMarketplace;
        this.anthropicMarketplace = anthropicMarketplace;
        this.communityMarketplace = communityMarketplace;
        this.lastSearchStats = null;
    }
    /**
     * Search across all marketplaces with filters and sorting
     */
    async search(query, filters) {
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
    async searchOfficial(query) {
        return this.officialMarketplace.search(query);
    }
    /**
     * Search only the Anthropic marketplace
     */
    async searchAnthropic(query) {
        return this.anthropicMarketplace.search(query);
    }
    /**
     * Search only the community marketplace
     */
    async searchCommunity(query) {
        return this.communityMarketplace.search(query);
    }
    /**
     * Get search statistics from the last search operation
     */
    getLastSearchStats() {
        return this.lastSearchStats;
    }
    /**
     * Determine which sources to search based on filter
     */
    determineSources(sourceFilter) {
        if (!sourceFilter || sourceFilter === 'all') {
            return ['official', 'anthropic', 'community'];
        }
        return [sourceFilter];
    }
    /**
     * Fetch skills from selected sources in parallel
     */
    async fetchFromSources(sources) {
        const promises = [];
        if (sources.includes('official')) {
            promises.push(this.officialMarketplace.fetchSkills().catch(err => {
                console.error('Failed to fetch official marketplace skills:', err);
                return [];
            }));
        }
        if (sources.includes('anthropic')) {
            promises.push(this.anthropicMarketplace.fetchSkills().catch(err => {
                console.error('Failed to fetch Anthropic marketplace skills:', err);
                return [];
            }));
        }
        if (sources.includes('community')) {
            promises.push(this.communityMarketplace.fetchSkills().catch(err => {
                console.error('Failed to fetch community marketplace skills:', err);
                return [];
            }));
        }
        const results = await Promise.all(promises);
        return results.flat();
    }
    /**
     * Apply category and rating filters
     */
    applyFilters(skills, filters) {
        if (!filters) {
            return skills;
        }
        return skills.filter(skill => {
            // Filter by category (keyword match)
            if (filters.category && skill.keywords) {
                const categoryMatch = skill.keywords.some(keyword => keyword.toLowerCase().includes(filters.category.toLowerCase()));
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
    fuzzySearch(query, skills) {
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
    sortResults(results, sortBy) {
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
};
SkillSearchService = __decorate([
    __param(0, IOfficialMarketplace),
    __param(1, IAnthropicMarketplace),
    __param(2, ICommunityMarketplace)
], SkillSearchService);
// Register the service
registerSingleton(ISkillSearchService, SkillSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL21hcmtldHBsYWNlL3NlYXJjaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxJQUFJLE1BQU0sU0FBUyxDQUFDO0FBQzNCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRzlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSw0REFBNEQsQ0FBQztBQUVsSDs7O0dBR0c7QUFDSCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQUt2QixZQUN1QixtQkFBMEQsRUFDekQsb0JBQTRELEVBQzVELG9CQUE0RDtRQUY1Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ3hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUw1RSxvQkFBZSxHQUF1QixJQUFJLENBQUM7SUFNaEQsQ0FBQztJQUVKOztPQUVHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFhLEVBQUUsT0FBdUI7UUFDbEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTdCLG9DQUFvQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXZELHFEQUFxRDtRQUNyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV2RCxzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFdkQsdUJBQXVCO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRWxELGVBQWU7UUFDZixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLFdBQVcsQ0FBQyxDQUFDO1FBRXpFLDBCQUEwQjtRQUMxQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBQzdDLElBQUksQ0FBQyxlQUFlLEdBQUc7WUFDdEIsV0FBVyxFQUFFLFNBQVMsQ0FBQyxNQUFNO1lBQzdCLFdBQVcsRUFBRSxNQUFNLENBQUMsTUFBTTtZQUMxQixhQUFhO1lBQ2IsZUFBZSxFQUFFLE9BQU87U0FDeEIsQ0FBQztRQUVGLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFhO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQWE7UUFDbEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBYTtRQUNsQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSyxnQkFBZ0IsQ0FBQyxZQUF3QztRQUNoRSxJQUFJLENBQUMsWUFBWSxJQUFJLFlBQVksS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUM3QyxPQUFPLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0QsT0FBTyxDQUFDLFlBQWlDLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBNEI7UUFDMUQsTUFBTSxRQUFRLEdBQWtDLEVBQUUsQ0FBQztRQUVuRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxRQUFRLENBQUMsSUFBSSxDQUNaLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ2xELE9BQU8sQ0FBQyxLQUFLLENBQUMsOENBQThDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ25FLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQyxDQUFDLENBQ0YsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxRQUFRLENBQUMsSUFBSSxDQUNaLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ25ELE9BQU8sQ0FBQyxLQUFLLENBQUMsK0NBQStDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3BFLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQyxDQUFDLENBQ0YsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxRQUFRLENBQUMsSUFBSSxDQUNaLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ25ELE9BQU8sQ0FBQyxLQUFLLENBQUMsK0NBQStDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3BFLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQyxDQUFDLENBQ0YsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsT0FBTyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssWUFBWSxDQUFDLE1BQTBCLEVBQUUsT0FBdUI7UUFDdkUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQzVCLHFDQUFxQztZQUNyQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN4QyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FDeEMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FDMUUsQ0FBQztnQkFDRixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BCLE9BQU8sS0FBSyxDQUFDO2dCQUNkLENBQUM7WUFDRixDQUFDO1lBRUQsMkJBQTJCO1lBQzNCLElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDdEMsT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssV0FBVyxDQUFDLEtBQWEsRUFBRSxNQUEwQjtRQUM1RCw4REFBOEQ7UUFDOUQsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzNCLEdBQUcsS0FBSztnQkFDUixjQUFjLEVBQUUsR0FBRztnQkFDbkIsYUFBYSxFQUFFLEVBQUU7YUFDakIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsdUNBQXVDO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM3QixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQzdCLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2dCQUNwQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtnQkFDakMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7YUFDL0I7WUFDRCxTQUFTLEVBQUUsR0FBRyxFQUFFLHdDQUF3QztZQUN4RCxZQUFZLEVBQUUsSUFBSTtZQUNsQixjQUFjLEVBQUUsSUFBSTtZQUNwQixjQUFjLEVBQUUsSUFBSSxFQUFFLDJDQUEyQztZQUNqRSxpQkFBaUIsRUFBRSxLQUFLO1NBQ3hCLENBQUMsQ0FBQztRQUVILE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFbkMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNCLDZFQUE2RTtZQUM3RSxNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRS9DLDhCQUE4QjtZQUM5QixNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFcEUsT0FBTztnQkFDTixHQUFHLE1BQU0sQ0FBQyxJQUFJO2dCQUNkLGNBQWM7Z0JBQ2QsYUFBYTthQUNiLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLFdBQVcsQ0FBQyxPQUF1QixFQUFFLE1BQWM7UUFDMUQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1FBRTVCLFFBQVEsTUFBTSxFQUFFLENBQUM7WUFDaEIsS0FBSyxZQUFZO2dCQUNoQixzQ0FBc0M7Z0JBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9ELE1BQU07WUFFUCxLQUFLLFFBQVE7Z0JBQ1osb0RBQW9EO2dCQUNwRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUNwQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNyRCxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDdEIsT0FBTyxVQUFVLENBQUM7b0JBQ25CLENBQUM7b0JBQ0Qsd0RBQXdEO29CQUN4RCxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELENBQUMsQ0FBQyxDQUFDO2dCQUNILE1BQU07WUFFUCxLQUFLLE1BQU07Z0JBQ1Ysc0NBQXNDO2dCQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUNwQixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsU0FBUyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUNoRixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsU0FBUyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUNoRixPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzFDLENBQUMsQ0FBQyxDQUFDO2dCQUNILE1BQU07WUFFUCxLQUFLLFdBQVcsQ0FBQztZQUNqQjtnQkFDQyx1Q0FBdUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDM0QsTUFBTTtRQUNSLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FDRCxDQUFBO0FBNU9LLGtCQUFrQjtJQU1yQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtHQVJsQixrQkFBa0IsQ0E0T3ZCO0FBRUQsdUJBQXVCO0FBQ3ZCLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixvQ0FBNEIsQ0FBQyJ9
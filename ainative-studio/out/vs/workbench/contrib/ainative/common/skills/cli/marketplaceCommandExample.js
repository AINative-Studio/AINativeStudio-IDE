/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Example usage of the MarketplaceCommand class
 * This demonstrates how to integrate marketplace browsing into the IDE
 */
import { MarketplaceCommand } from './marketplaceCommand.js';
/**
 * Example: Browse all available skills
 */
export async function exampleBrowseAll(officialMarketplace, anthropicMarketplace, communityMarketplace, searchService, logService) {
    const command = new MarketplaceCommand(officialMarketplace, anthropicMarketplace, communityMarketplace, searchService, logService);
    // Browse all skills
    const result = await command.browse();
    console.log(result.output);
    console.log(`Found ${result.skills.length} skills across ${result.totalSkills} total`);
}
/**
 * Example: Search for specific skills
 */
export async function exampleSearchSkills(command) {
    // Search for database-related skills
    const options = {
        searchTerm: 'database'
    };
    const result = await command.browse(options);
    console.log(result.output);
}
/**
 * Example: Filter by category
 */
export async function exampleFilterByCategory(command) {
    // Filter by deployment category
    const options = {
        category: 'deployment'
    };
    const result = await command.browse(options);
    console.log(result.output);
}
/**
 * Example: Filter by provider
 */
export async function exampleFilterByProvider(command) {
    // Show only official skills
    const options = {
        provider: 'official'
    };
    const result = await command.browse(options);
    console.log(result.output);
}
/**
 * Example: Combined filtering
 */
export async function exampleCombinedFiltering(command) {
    // Search for deployment skills from community marketplace
    const options = {
        searchTerm: 'deployment',
        provider: 'community'
    };
    const result = await command.browse(options);
    console.log(result.output);
}
/**
 * Example: Force refresh cache
 */
export async function exampleForceRefresh(command) {
    // Bypass cache and fetch fresh data
    const options = {
        forceRefresh: true
    };
    const result = await command.browse(options);
    console.log('Fresh data fetched:', result.output);
}
/**
 * Example: Show cache status
 */
export async function exampleShowCacheStatus(command) {
    // Show cache status for all marketplaces
    const options = {
        showCacheStatus: true
    };
    const result = await command.browse(options);
    console.log(result.output);
}
/**
 * Example: Advanced search with filters
 */
export async function exampleAdvancedSearch(command) {
    // Use search service for more advanced queries
    const result = await command.search('database', {
        category: 'backend',
        provider: 'official'
    });
    console.log(result.output);
}
/**
 * Example: Clear marketplace caches
 */
export async function exampleClearCache(command) {
    // Clear all marketplace caches
    await command.clearCache();
    console.log('All marketplace caches cleared');
}
/**
 * Example: Handle errors gracefully
 */
export async function exampleErrorHandling(command) {
    try {
        const result = await command.browse({ forceRefresh: true });
        console.log(result.output);
    }
    catch (error) {
        console.error('Error browsing marketplace:', error);
        // Try without force refresh (use cache)
        try {
            const cachedResult = await command.browse();
            console.log('Using cached results:', cachedResult.output);
        }
        catch (cacheError) {
            console.error('No cached results available:', cacheError);
        }
    }
}
/**
 * Example: Integration with VS Code command palette
 * This shows how to register the marketplace browse command
 */
export function exampleRegisterCommand(command) {
    // This would be integrated into the VS Code command registration system
    // For example:
    // vscode.commands.registerCommand('ainative.skill.marketplace.browse', async () => {
    //     const result = await command.browse();
    //     vscode.window.showInformationMessage(result.output);
    // });
    console.log('Command registered: ainative.skill.marketplace.browse');
}
/**
 * Example CLI usage patterns:
 *
 * 1. Browse all skills:
 *    /skill marketplace browse
 *
 * 2. Search for specific skills:
 *    /skill marketplace browse database
 *
 * 3. Filter by category:
 *    /skill marketplace browse --category deployment
 *
 * 4. Filter by provider:
 *    /skill marketplace browse --provider official
 *
 * 5. Combined filters:
 *    /skill marketplace browse database --category backend --provider community
 *
 * 6. Force refresh:
 *    /skill marketplace browse --force-refresh
 *
 * 7. Show cache status:
 *    /skill marketplace browse --show-cache-status
 */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2VDb21tYW5kRXhhbXBsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxscy9jbGkvbWFya2V0cGxhY2VDb21tYW5kRXhhbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRzs7O0dBR0c7QUFFSCxPQUFPLEVBQUUsa0JBQWtCLEVBQTRCLE1BQU0seUJBQXlCLENBQUM7QUFPdkY7O0dBRUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUNyQyxtQkFBeUMsRUFDekMsb0JBQTJDLEVBQzNDLG9CQUEyQyxFQUMzQyxhQUFrQyxFQUNsQyxVQUF1QjtJQUV2QixNQUFNLE9BQU8sR0FBRyxJQUFJLGtCQUFrQixDQUNyQyxtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLG9CQUFvQixFQUNwQixhQUFhLEVBQ2IsVUFBVSxDQUNWLENBQUM7SUFFRixvQkFBb0I7SUFDcEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxrQkFBa0IsTUFBTSxDQUFDLFdBQVcsUUFBUSxDQUFDLENBQUM7QUFDeEYsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FDeEMsT0FBMkI7SUFFM0IscUNBQXFDO0lBQ3JDLE1BQU0sT0FBTyxHQUE2QjtRQUN6QyxVQUFVLEVBQUUsVUFBVTtLQUN0QixDQUFDO0lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Example usage of the MarketplaceCommand class
 * This demonstrates how to integrate marketplace browsing into the IDE
 */

import { MarketplaceCommand, MarketplaceBrowseOptions } from './marketplaceCommand.js';
import { IOfficialMarketplace } from '../../marketplace/officialMarketplaceTypes.js';
import { IAnthropicMarketplace } from '../../marketplace/anthropicMarketplaceTypes.js';
import { ICommunityMarketplace } from '../../marketplace/communityMarketplaceTypes.js';
import { ISkillSearchService } from '../../marketplace/searchServiceTypes.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';

/**
 * Example: Browse all available skills
 */
export async function exampleBrowseAll(
	officialMarketplace: IOfficialMarketplace,
	anthropicMarketplace: IAnthropicMarketplace,
	communityMarketplace: ICommunityMarketplace,
	searchService: ISkillSearchService,
	logService: ILogService
): Promise<void> {
	const command = new MarketplaceCommand(
		officialMarketplace,
		anthropicMarketplace,
		communityMarketplace,
		searchService,
		logService
	);

	// Browse all skills
	const result = await command.browse();
	console.log(result.output);
	console.log(`Found ${result.skills.length} skills across ${result.totalSkills} total`);
}

/**
 * Example: Search for specific skills
 */
export async function exampleSearchSkills(
	command: MarketplaceCommand
): Promise<void> {
	// Search for database-related skills
	const options: MarketplaceBrowseOptions = {
		searchTerm: 'database'
	};

	const result = await command.browse(options);
	console.log(result.output);
}

/**
 * Example: Filter by category
 */
export async function exampleFilterByCategory(
	command: MarketplaceCommand
): Promise<void> {
	// Filter by deployment category
	const options: MarketplaceBrowseOptions = {
		category: 'deployment'
	};

	const result = await command.browse(options);
	console.log(result.output);
}

/**
 * Example: Filter by provider
 */
export async function exampleFilterByProvider(
	command: MarketplaceCommand
): Promise<void> {
	// Show only official skills
	const options: MarketplaceBrowseOptions = {
		provider: 'official'
	};

	const result = await command.browse(options);
	console.log(result.output);
}

/**
 * Example: Combined filtering
 */
export async function exampleCombinedFiltering(
	command: MarketplaceCommand
): Promise<void> {
	// Search for deployment skills from community marketplace
	const options: MarketplaceBrowseOptions = {
		searchTerm: 'deployment',
		provider: 'community'
	};

	const result = await command.browse(options);
	console.log(result.output);
}

/**
 * Example: Force refresh cache
 */
export async function exampleForceRefresh(
	command: MarketplaceCommand
): Promise<void> {
	// Bypass cache and fetch fresh data
	const options: MarketplaceBrowseOptions = {
		forceRefresh: true
	};

	const result = await command.browse(options);
	console.log('Fresh data fetched:', result.output);
}

/**
 * Example: Show cache status
 */
export async function exampleShowCacheStatus(
	command: MarketplaceCommand
): Promise<void> {
	// Show cache status for all marketplaces
	const options: MarketplaceBrowseOptions = {
		showCacheStatus: true
	};

	const result = await command.browse(options);
	console.log(result.output);
}

/**
 * Example: Advanced search with filters
 */
export async function exampleAdvancedSearch(
	command: MarketplaceCommand
): Promise<void> {
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
export async function exampleClearCache(
	command: MarketplaceCommand
): Promise<void> {
	// Clear all marketplace caches
	await command.clearCache();
	console.log('All marketplace caches cleared');
}

/**
 * Example: Handle errors gracefully
 */
export async function exampleErrorHandling(
	command: MarketplaceCommand
): Promise<void> {
	try {
		const result = await command.browse({ forceRefresh: true });
		console.log(result.output);
	} catch (error) {
		console.error('Error browsing marketplace:', error);

		// Try without force refresh (use cache)
		try {
			const cachedResult = await command.browse();
			console.log('Using cached results:', cachedResult.output);
		} catch (cacheError) {
			console.error('No cached results available:', cacheError);
		}
	}
}

/**
 * Example: Integration with VS Code command palette
 * This shows how to register the marketplace browse command
 */
export function exampleRegisterCommand(
	command: MarketplaceCommand
): void {
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

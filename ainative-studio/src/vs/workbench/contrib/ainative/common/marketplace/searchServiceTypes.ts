/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { SearchFilters, SearchResult, SearchStats } from './searchTypes.js';
import { MarketplaceSkill } from './marketplaceTypes.js';

export const ISkillSearchService = createDecorator<ISkillSearchService>('skillSearchService');

/**
 * Unified search service for marketplace skills
 * Provides search across official, Anthropic, and community marketplaces
 */
export interface ISkillSearchService {
	readonly _serviceBrand: undefined;

	/**
	 * Search across all marketplaces with filters and sorting
	 * @param query - Search query string
	 * @param filters - Optional search filters
	 * @returns Array of search results with relevance scores
	 */
	search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;

	/**
	 * Search only the official marketplace
	 * @param query - Search query string
	 * @returns Array of matching skills
	 */
	searchOfficial(query: string): Promise<MarketplaceSkill[]>;

	/**
	 * Search only the Anthropic marketplace
	 * @param query - Search query string
	 * @returns Array of matching skills
	 */
	searchAnthropic(query: string): Promise<MarketplaceSkill[]>;

	/**
	 * Search only the community marketplace
	 * @param query - Search query string
	 * @returns Array of matching skills
	 */
	searchCommunity(query: string): Promise<MarketplaceSkill[]>;

	/**
	 * Get search statistics from the last search operation
	 * @returns Search statistics or null if no search has been performed
	 */
	getLastSearchStats(): SearchStats | null;
}

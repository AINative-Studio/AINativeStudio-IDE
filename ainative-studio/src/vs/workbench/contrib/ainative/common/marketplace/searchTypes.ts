/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { MarketplaceSkill, MarketplaceSource } from './marketplaceTypes.js';

/**
 * Search filters for marketplace skills
 */
export interface SearchFilters {
	/** Filter by source marketplace (official, anthropic, community, or all) */
	source?: MarketplaceSource | 'all';

	/** Filter by category/keyword */
	category?: string;

	/** Minimum rating threshold (0-5) */
	minRating?: number;

	/** Sort order for results */
	sortBy?: 'relevance' | 'popularity' | 'date' | 'rating';
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult extends MarketplaceSkill {
	/** Relevance score (0-1, higher is better) */
	relevanceScore: number;

	/** Fields that matched the search query */
	matchedFields: string[];
}

/**
 * Search statistics
 */
export interface SearchStats {
	/** Total number of skills searched */
	totalSkills: number;

	/** Number of results returned */
	resultCount: number;

	/** Search execution time in milliseconds */
	executionTime: number;

	/** Sources that were searched */
	sourcesSearched: MarketplaceSource[];
}

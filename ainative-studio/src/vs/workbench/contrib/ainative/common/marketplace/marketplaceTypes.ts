/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Source of a marketplace skill
 */
export type MarketplaceSource = 'official' | 'anthropic' | 'community';

/**
 * Marketplace skill information
 * Represents a skill available for installation from a marketplace
 */
export interface MarketplaceSkill {
	/** NPM package name (e.g., @ainative/skill-zerodb-workflows) */
	name: string;
	/** Human-readable description */
	description: string;
	/** Current version */
	version: string;
	/** Source of the skill */
	source: MarketplaceSource;
	/** Author name */
	author: string;
	/** Keywords/tags for search */
	keywords: string[];
	/** Average rating (0-5, optional) */
	rating?: number;
	/** Download count (optional) */
	downloads?: number;
	/** Last update timestamp */
	updatedAt: Date;
	/** Install command (e.g., npm install -g @ainative/skill-zerodb-workflows) */
	installCommand: string;
	/** Homepage URL (optional) */
	homepage?: string;
	/** Repository URL (optional) */
	repository?: string;
}

/**
 * Base marketplace interface
 * All marketplace implementations must implement this
 */
export interface IMarketplace {
	/**
	 * Fetch all available skills from the marketplace
	 * @param forceRefresh - If true, bypass cache and fetch fresh data
	 * @returns Array of marketplace skills
	 */
	fetchSkills(forceRefresh?: boolean): Promise<MarketplaceSkill[]>;

	/**
	 * Install a skill from the marketplace
	 * @param skillName - Name of the skill (e.g., zerodb-workflows)
	 * @param version - Optional version constraint (e.g., 1.2.0, ^1.0.0, latest)
	 */
	install(skillName: string, version?: string): Promise<void>;

	/**
	 * Search for skills by query
	 * @param query - Search query string
	 * @returns Array of matching marketplace skills
	 */
	search(query: string): Promise<MarketplaceSkill[]>;

	/**
	 * Get detailed information about a specific skill
	 * @param skillName - Name of skill
	 * @returns Skill metadata or null if not found
	 */
	getSkillDetails(skillName: string): Promise<MarketplaceSkill | null>;

	/**
	 * Check if cache is valid
	 * @returns True if cache exists and is not expired
	 */
	isCacheValid(): Promise<boolean>;

	/**
	 * Clear the marketplace cache
	 */
	clearCache(): Promise<void>;
}

/**
 * Error thrown during marketplace operations
 */
export class MarketplaceError extends Error {
	constructor(
		message: string,
		public readonly code?: 'NETWORK_ERROR' | 'RATE_LIMIT' | 'NOT_FOUND' | 'PARSE_ERROR' | 'INSTALL_ERROR'
	) {
		super(message);
		this.name = 'MarketplaceError';
	}
}

/**
 * NPM registry search response format
 */
export interface NpmSearchResponse {
	objects: NpmPackageObject[];
	total: number;
	time: string;
}

/**
 * NPM package object in search results
 */
export interface NpmPackageObject {
	package: NpmPackage;
	score: NpmScore;
	searchScore: number;
}

/**
 * NPM package metadata
 */
export interface NpmPackage {
	name: string;
	version: string;
	description: string;
	keywords?: string[];
	date: string;
	links: {
		npm: string;
		homepage?: string;
		repository?: string;
		bugs?: string;
	};
	author?: {
		name: string;
		email?: string;
		username?: string;
	};
	publisher?: {
		username: string;
		email: string;
	};
	maintainers?: Array<{
		username: string;
		email: string;
	}>;
}

/**
 * NPM package score details
 */
export interface NpmScore {
	final: number;
	detail: {
		quality: number;
		popularity: number;
		maintenance: number;
	};
}

/**
 * Cached marketplace data
 */
export interface MarketplaceCacheData {
	skills: MarketplaceSkill[];
	timestamp: number; // Unix milliseconds
	ttl: number; // Time to live in milliseconds
}

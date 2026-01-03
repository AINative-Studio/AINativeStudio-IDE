/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IMarketplace } from './marketplaceTypes.js';

export const ICommunityMarketplace = createDecorator<ICommunityMarketplace>('communityMarketplace');

/**
 * Community skill submission data
 */
export interface CommunitySkillSubmission {
	/** Skill name */
	name: string;
	/** Skill description */
	description: string;
	/** Direct download URL for skill file (zip) */
	skillFileUrl: string;
	/** Category/tag */
	category: string;
	/** Search keywords */
	keywords: string[];
}

/**
 * API response format for community skills
 */
export interface CommunitySkillApiResponse {
	skills: CommunitySkillData[];
}

/**
 * Community skill data from API
 */
export interface CommunitySkillData {
	/** Unique skill ID (UUID) */
	id: string;
	/** Skill name (slug format) */
	name: string;
	/** Human-readable description */
	description: string;
	/** Author username */
	author: string;
	/** Category/type */
	category: string;
	/** Search keywords */
	keywords: string[];
	/** Version string */
	version: string;
	/** Average rating (0-5) */
	rating_avg: number;
	/** Number of ratings */
	rating_count: number;
	/** Total downloads */
	download_count: number;
	/** Approval status */
	status: 'pending' | 'approved' | 'rejected';
	/** CDN URL for skill zip file */
	skill_file_url: string;
	/** Created timestamp */
	created_at: string;
	/** Last updated timestamp */
	updated_at: string;
}

/**
 * Rate skill request
 */
export interface RateSkillRequest {
	/** Rating value (1-5) */
	rating: number;
}

/**
 * Submit skill response
 */
export interface SubmitSkillResponse {
	/** Submission ID */
	id: string;
	/** Current status */
	status: 'pending' | 'approved' | 'rejected';
	/** Message from API */
	message: string;
}

/**
 * Community Marketplace Service
 * Extends IMarketplace with community-specific features
 */
export interface ICommunityMarketplace extends IMarketplace {
	readonly _serviceBrand: undefined;

	/**
	 * Submit a skill for community review
	 * @param skillPath - Absolute path to skill directory containing SKILL.md
	 * @throws Error if authentication required or submission fails
	 */
	submit(skillPath: string): Promise<SubmitSkillResponse>;

	/**
	 * Rate a community skill (1-5 stars)
	 * @param skillId - Unique skill ID from API
	 * @param rating - Rating value (1-5)
	 * @throws Error if authentication required or rating fails
	 */
	rate(skillId: string, rating: number): Promise<void>;

	/**
	 * Get authentication status
	 * @returns True if user is authenticated with AINative API
	 */
	isAuthenticated(): Promise<boolean>;

	/**
	 * Set authentication token
	 * @param token - JWT token from AINative authentication
	 */
	setAuthToken(token: string): void;
}

/**
 * Community marketplace specific error
 */
export class CommunityMarketplaceError extends Error {
	constructor(
		message: string,
		public readonly code?: 'AUTH_REQUIRED' | 'NETWORK_ERROR' | 'RATE_LIMIT' | 'VALIDATION_ERROR' | 'SUBMISSION_FAILED'
	) {
		super(message);
		this.name = 'CommunityMarketplaceError';
	}
}

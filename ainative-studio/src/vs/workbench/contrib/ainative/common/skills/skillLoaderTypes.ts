/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { SkillMetadata, SkillResource } from './skillTypes.js';
import { SkillSource } from './skillRegistryTypes.js';

export const ISkillLoader = createDecorator<ISkillLoader>('skillLoader');

/**
 * Lightweight skill summary - always loaded for all skills
 * Target: ~100 words per skill, total ~1000 tokens for 10 skills
 *
 * Derived from the canonical SkillMetadata (see skillTypes.ts) parsed by
 * ISkillParser, enriched with the install location recorded by ISkillsRegistry.
 */
export interface SkillSummary {
	/** Unique skill identifier (e.g., 'git-workflow') */
	name: string;
	/** Brief description of the skill (shown in skill picker) */
	description: string;
	/** Optional tags for filtering and search */
	tags?: string[];
	/** Semantic version recorded for the installed skill */
	version?: string;
	/** Where the skill was installed from, per the registry entry */
	source: SkillSource;
	/** Absolute path to the installed skill directory */
	path: string;
}

/**
 * Fully loaded skill with body and resources
 * Only loaded on-demand when skill is invoked
 *
 * `metadata`, `body` and `resources` come verbatim from ISkillParser so that
 * the loader never maintains a second, divergent notion of a parsed skill.
 */
export interface LoadedSkill {
	/** Skill metadata from frontmatter */
	metadata: SkillMetadata;
	/** Full markdown body content (excluding frontmatter) */
	body: string;
	/** Bundled resources discovered in the skill directory */
	resources: SkillResource[];
	/** Absolute path to the parsed SKILL.md file */
	fullPath: string;
}

/**
 * Progressive skill loading service
 *
 * Strategy:
 * - Phase 1: Always load metadata for all skills (~1000 tokens total)
 * - Phase 2: Load full body on-demand when skill is invoked
 * - Phase 3: Load reference files when explicitly requested
 */
export interface ISkillLoader {
	readonly _serviceBrand: undefined;

	/**
	 * Load only metadata for a skill (lightweight, ~100 words)
	 * This is always cached and used for skill discovery/picker
	 *
	 * @param skillName Unique skill identifier
	 * @returns Lightweight skill summary
	 */
	loadMetadataOnly(skillName: string): Promise<SkillSummary>;

	/**
	 * Load full skill including body and resources (on-demand)
	 * This is called when the skill is actually invoked
	 *
	 * @param skillName Unique skill identifier
	 * @returns Complete skill with body and resources
	 */
	loadFullSkill(skillName: string): Promise<LoadedSkill>;

	/**
	 * Load a specific reference file from skill's references directory
	 * This is called when Claude requests additional context
	 *
	 * @param skillName Unique skill identifier
	 * @param referencePath Relative path to reference file (e.g., 'ai-attribution-enforcement.md')
	 * @returns File content as string
	 */
	loadReference(skillName: string, referencePath: string): Promise<string>;

	/**
	 * Get metadata for all installed skills
	 * This is used to populate the skill picker and initial context
	 *
	 * @returns Array of all skill summaries (lightweight)
	 */
	getAllMetadata(): Promise<SkillSummary[]>;

	/**
	 * Clear all caches (useful for testing or after skill updates)
	 */
	clearCache(): void;

	/**
	 * Preload metadata for all enabled skills
	 * Called on workspace startup to warm the cache
	 *
	 * @param enabledSkills List of enabled skill names
	 */
	preloadMetadata(enabledSkills: string[]): Promise<void>;

	/**
	 * Get cache statistics for monitoring loader performance
	 */
	getCacheStats(): CacheStats;
}

/**
 * Cache statistics for monitoring performance
 */
export interface CacheStats {
	/** Number of metadata entries in cache */
	metadataCount: number;
	/** Number of full skills in cache */
	fullSkillCount: number;
	/** Estimated memory usage in bytes */
	estimatedMemoryUsage: number;
	/** Cache hit ratio (0-1) */
	hitRatio: number;
}

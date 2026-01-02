/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Skill metadata extracted from frontmatter
 */
export interface SkillMetadata {
	/**
	 * Unique skill name (used as identifier)
	 */
	name: string;

	/**
	 * Human-readable description
	 */
	description: string;

	/**
	 * Skill location (managed or project)
	 */
	location: 'managed' | 'project';

	/**
	 * Tags for categorization and search
	 */
	tags?: string[];

	/**
	 * Other skills this skill depends on
	 */
	dependencies?: string[];

	/**
	 * Version of the skill
	 */
	version?: string;

	/**
	 * Author information
	 */
	author?: string;

	/**
	 * When the skill should be used (context hints)
	 */
	useWhen?: string[];
}

/**
 * Complete skill definition
 */
export interface Skill {
	/**
	 * Skill metadata
	 */
	metadata: SkillMetadata;

	/**
	 * Full markdown content (including frontmatter)
	 */
	content: string;

	/**
	 * Prompt/instructions content (without frontmatter)
	 */
	instructions: string;

	/**
	 * File path to the skill file
	 */
	filePath: string;

	/**
	 * Last modified timestamp
	 */
	lastModified: number;

	// Convenience properties for direct access (mirroring metadata)
	/**
	 * Skill name (convenience property from metadata.name)
	 */
	name?: string;

	/**
	 * Skill description (convenience property from metadata.description)
	 */
	description?: string;

	/**
	 * Skill version (convenience property from metadata.version)
	 */
	version?: string;

	/**
	 * Skill tags (convenience property from metadata.tags)
	 */
	tags?: string[];

	/**
	 * Skill category for organization
	 */
	category?: string;

	/**
	 * Skill source (managed, project, marketplace, etc.)
	 */
	source?: string;
}

/**
 * Skill parsing result
 */
export interface SkillParseResult {
	/**
	 * Whether parsing succeeded
	 */
	success: boolean;

	/**
	 * Parsed skill (if successful)
	 */
	skill?: Skill;

	/**
	 * Error message (if failed)
	 */
	error?: string;
}

/**
 * User skill preferences
 */
export interface SkillPreferences {
	/**
	 * List of installed skill names
	 */
	installedSkills: string[];

	/**
	 * Skill usage statistics (skill name -> usage count)
	 */
	usageStats: Record<string, number>;

	/**
	 * Disabled skills
	 */
	disabledSkills: string[];

	/**
	 * Last updated timestamp
	 */
	lastUpdated: number;
}

/**
 * Skill registry interface for lookups
 */
export interface ISkillRegistry {
	/**
	 * Get all registered skills
	 */
	getAllSkills(): Skill[];

	/**
	 * Get skill by name
	 */
	getSkillByName(name: string): Skill | undefined;

	/**
	 * Get skills by tag
	 */
	getSkillsByTag(tag: string): Skill[];

	/**
	 * Get skills with dependencies resolved
	 */
	getSkillsWithDependencies(skillName: string): Skill[];

	/**
	 * Register a skill
	 */
	registerSkill(skill: Skill): void;

	/**
	 * Unregister a skill
	 */
	unregisterSkill(name: string): void;

	/**
	 * Check if skill exists
	 */
	hasSkill(name: string): boolean;

	/**
	 * Get skill count
	 */
	getSkillCount(): number;

	/**
	 * Clear all skills
	 */
	clear(): void;
}

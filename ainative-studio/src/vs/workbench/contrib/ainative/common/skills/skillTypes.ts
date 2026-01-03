/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * SKILL.md metadata extracted from YAML frontmatter
 * Following the Agent Skills specification (agentskills.io)
 */
export interface SkillMetadata {
	/** Skill identifier (required) */
	name: string;
	/** Human-readable description of what the skill does and when to use it (required) */
	description: string;
	/** Semantic version number */
	version?: string;
	/** Author name or organization */
	author?: string;
	/** License identifier (e.g., MIT, Apache-2.0) */
	license?: string;
	/** Tags for categorization and search */
	tags?: string[];
}

/**
 * Bundled resource discovered within a skill directory
 */
export interface SkillResource {
	/** Type of resource */
	type: 'reference' | 'script' | 'asset';
	/** Absolute path to the resource */
	path: string;
	/** Resource filename */
	name: string;
}

/**
 * Parsed skill containing metadata, body, and discovered resources
 */
export interface Skill {
	/** Parsed YAML frontmatter metadata */
	metadata: SkillMetadata;
	/** Markdown body content (everything after frontmatter) */
	body: string;
	/** Discovered bundled resources (references/, scripts/, assets/) */
	resources: SkillResource[];
	/** Absolute path to the SKILL.md file */
	fullPath: string;
}

/**
 * Error thrown during skill parsing
 */
export class SkillParseError extends Error {
	constructor(message: string, public readonly filePath?: string) {
		super(message);
		this.name = 'SkillParseError';
	}
}

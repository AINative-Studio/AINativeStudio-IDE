/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';

export const ISkillsRegistry = createDecorator<ISkillsRegistry>('skillsRegistry');

/**
 * Source type for installed skills
 */
export type SkillSource = 'local' | 'npm' | 'git';

/**
 * Registry entry for an installed skill
 */
export interface RegistryEntry {
	/** Unique skill name */
	name: string;
	/** Skill version */
	version: string;
	/** Timestamp when skill was installed (Unix milliseconds) */
	installedAt: number;
	/** Source where skill was installed from */
	source: SkillSource;
	/** Absolute path to skill directory */
	path: string;
}

/**
 * Registry file format (stored as JSON)
 */
export interface RegistryFile {
	[skillName: string]: RegistryEntry;
}

/**
 * Skills Registry Service
 * Manages installation, uninstallation, and listing of skills
 * Persists registry to ~/.ainative/skills/registry.json
 */
export interface ISkillsRegistry {
	readonly _serviceBrand: undefined;

	/**
	 * Install a skill from a local path
	 * @param skillPath - Absolute path to skill directory
	 * @throws Error if skill already installed or invalid format
	 */
	install(skillPath: string): Promise<void>;

	/**
	 * Uninstall a skill by name
	 * @param skillName - Name of skill to uninstall
	 * @throws Error if skill not found
	 */
	uninstall(skillName: string): Promise<void>;

	/**
	 * List all installed skills
	 * @returns Array of registry entries
	 */
	list(): Promise<RegistryEntry[]>;

	/**
	 * Get a specific skill by name
	 * @param skillName - Name of skill to retrieve
	 * @returns Registry entry or null if not found
	 */
	get(skillName: string): Promise<RegistryEntry | null>;

	/**
	 * Check if a skill is installed
	 * @param skillName - Name of skill to check
	 * @returns True if skill is installed
	 */
	isInstalled(skillName: string): Promise<boolean>;

	/**
	 * Refresh skills from a directory (e.g., .claude/skills/)
	 * Used for syncing skills when .claude is symlinked
	 * @param skillsSourceDir - Directory containing skill folders
	 * @returns Summary of changes (updated, new, removed skills)
	 */
	refresh(skillsSourceDir: string): Promise<SkillRefreshResult>;

	/**
	 * Clear the registry cache to force reload
	 */
	clearCache(): void;
}

/**
 * Result of refreshing skills from a source directory
 */
export interface SkillRefreshResult {
	/** Skills that were updated (version changed) */
	updated: SkillChange[];
	/** Skills that are newly added */
	new: SkillChange[];
	/** Skills that were removed */
	removed: SkillChange[];
	/** Skills that were unchanged */
	unchanged: string[];
	/** Total number of skills in registry after refresh */
	total: number;
}

/**
 * Represents a change to a skill
 */
export interface SkillChange {
	/** Skill name */
	name: string;
	/** Old version (for updates) or null (for new skills) */
	oldVersion: string | null;
	/** New version (for updates and new skills) or null (for removed skills) */
	newVersion: string | null;
}

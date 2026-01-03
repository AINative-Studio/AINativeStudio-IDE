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
}

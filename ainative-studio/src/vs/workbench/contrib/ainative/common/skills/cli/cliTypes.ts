/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../../platform/instantiation/common/instantiation.js';

export const ISkillInstallService = createDecorator<ISkillInstallService>('skillInstallService');

/**
 * Source type for skill installation
 */
export type InstallSource = 'local' | 'npm' | 'github' | 'url';

/**
 * Options for installing a skill
 */
export interface InstallOptions {
	/** The source string (path, package name, GitHub repo, or URL) */
	source: string;
	/** Force reinstall even if already installed */
	force?: boolean;
	/** Skip validation during install */
	skipValidation?: boolean;
}

/**
 * Result of a skill installation
 */
export interface InstallResult {
	/** Name of the installed skill */
	skillName: string;
	/** Version of the installed skill */
	version: string;
	/** Source type used for installation */
	sourceType: InstallSource;
	/** Path where skill was installed */
	installPath: string;
}

/**
 * Options for uninstalling a skill
 */
export interface UninstallOptions {
	/** Name of the skill to uninstall */
	skillName: string;
	/** Skip confirmation prompt */
	skipConfirmation?: boolean;
}

/**
 * Result of a skill uninstallation
 */
export interface UninstallResult {
	/** Name of the uninstalled skill */
	skillName: string;
	/** Whether the uninstall was successful */
	success: boolean;
}

/**
 * Service for installing and uninstalling skills from various sources
 */
export interface ISkillInstallService {
	readonly _serviceBrand: undefined;

	/**
	 * Install a skill from a source (local path, NPM, GitHub, or URL)
	 * @param options - Installation options
	 * @returns Result of the installation
	 */
	install(options: InstallOptions): Promise<InstallResult>;

	/**
	 * Uninstall a skill by name
	 * @param options - Uninstallation options
	 * @returns Result of the uninstallation
	 */
	uninstall(options: UninstallOptions): Promise<UninstallResult>;

	/**
	 * Detect the source type from a source string
	 * @param source - Source string to analyze
	 * @returns Detected source type
	 */
	detectSourceType(source: string): InstallSource;
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { SkillsConfig, ProjectMetadata, ProjectDetectionResult, SkillRecommendation } from './skillConfigTypes.js';

export const ISkillConfigService = createDecorator<ISkillConfigService>('skillConfigService');

/**
 * Service for managing skills configuration in .mcp.json
 */
export interface ISkillConfigService {
	readonly _serviceBrand: undefined;

	/**
	 * Read skills configuration from .mcp.json
	 * @returns Skills configuration or null if not found
	 */
	readSkillsConfig(): Promise<SkillsConfig | null>;

	/**
	 * Write skills configuration to .mcp.json
	 * @param config Skills configuration to write
	 * @param merge If true, merge with existing config; if false, replace
	 */
	writeSkillsConfig(config: SkillsConfig, merge?: boolean): Promise<void>;

	/**
	 * Detect project type based on workspace files
	 * @returns Detected project metadata with confidence score
	 */
	detectProjectType(): Promise<ProjectDetectionResult>;

	/**
	 * Recommend skills based on project metadata
	 * @param projectMetadata Project metadata to base recommendations on
	 * @returns List of recommended skill identifiers with reasons
	 */
	recommendSkills(projectMetadata: ProjectMetadata): Promise<SkillRecommendation[]>;

	/**
	 * Get list of currently enabled skills
	 * @returns Array of enabled skill identifiers
	 */
	getEnabledSkills(): Promise<string[]>;

	/**
	 * Check if .mcp.json exists in workspace
	 * @returns True if .mcp.json exists
	 */
	hasMCPConfig(): Promise<boolean>;

	/**
	 * Initialize .mcp.json with default configuration
	 * @param includeSkills If true, include skills section with auto-detected config
	 */
	initializeMCPConfig(includeSkills?: boolean): Promise<void>;

	/**
	 * Validate skills configuration
	 * @param config Configuration to validate
	 * @returns Validation errors or empty array if valid
	 */
	validateConfig(config: SkillsConfig): string[];
}

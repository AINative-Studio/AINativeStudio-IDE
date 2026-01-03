/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Skills configuration within .mcp.json
 */
export interface SkillsConfig {
	/** List of enabled skill names */
	enabled: string[];
	/** Local skill paths relative to workspace root */
	projectSpecific?: string[];
	/** Auto-load skills based on project type detection */
	autoLoad?: boolean;
	/** Project metadata for skill recommendations */
	metadata?: ProjectMetadata;
}

/**
 * Project metadata for skill detection and recommendations
 */
export interface ProjectMetadata {
	/** Type of project based on detected patterns */
	projectType?: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'data' | 'unknown';
	/** Detected framework (react, fastapi, django, etc.) */
	framework?: string;
	/** Programming languages used in the project */
	languages?: string[];
	/** Additional detected technologies */
	technologies?: string[];
}

/**
 * Complete .mcp.json configuration structure
 */
export interface MCPConfig {
	/** MCP server configurations */
	mcpServers?: Record<string, {
		command: string;
		args?: string[];
		env?: Record<string, string>;
	}>;
	/** Skills configuration */
	skills?: SkillsConfig;
}

/**
 * Project detection result
 */
export interface ProjectDetectionResult {
	/** Detected project metadata */
	metadata: ProjectMetadata;
	/** Confidence score (0-1) for detection accuracy */
	confidence: number;
	/** Detected files used for determination */
	detectedFiles: string[];
}

/**
 * Skill recommendation result
 */
export interface SkillRecommendation {
	/** Recommended skill identifier */
	skillId: string;
	/** Reason for recommendation */
	reason: string;
	/** Priority level (1-5, 1 being highest) */
	priority: number;
}

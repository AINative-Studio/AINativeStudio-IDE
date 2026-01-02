/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Skill Marketplace Types
 *
 * Defines the data structures for the Skills Marketplace system,
 * including skill packages, registries, and version management.
 */

/**
 * Registry types for skill sources
 */
export type SkillRegistry = 'official' | 'anthropic' | 'community';

/**
 * Skill package metadata
 */
export interface SkillPackageMetadata {
	/** Number of downloads */
	downloads: number;
	/** Average rating (0-5) */
	rating: number;
	/** Last update timestamp (ISO 8601) */
	updated: string;
	/** Creation timestamp (ISO 8601) */
	created: string;
	/** Number of stars/favorites */
	stars?: number;
	/** Number of reviews */
	reviews?: number;
}

/**
 * File hash information for integrity verification
 */
export interface SkillFileHash {
	/** SHA-256 hash of the file content */
	sha256: string;
	/** File size in bytes */
	size: number;
}

/**
 * Skill package file manifest
 */
export interface SkillPackageFiles {
	/** Main skill file (always required) */
	'skill.md': SkillFileHash;
	/** Reference files (optional, glob pattern support) */
	[path: string]: SkillFileHash | string;
}

/**
 * Semantic version constraint
 */
export type VersionConstraint = string; // e.g., "^1.0.0", ">=2.0.0 <3.0.0"

/**
 * Skill dependency specification
 */
export interface SkillDependency {
	/** Dependency skill name */
	name: string;
	/** Version constraint (semver) */
	version?: VersionConstraint;
	/** Registry source (defaults to same as parent) */
	registry?: SkillRegistry;
	/** Optional - mark as optional dependency */
	optional?: boolean;
}

/**
 * Complete skill package definition
 */
export interface SkillPackage {
	/** Unique skill identifier (kebab-case) */
	name: string;
	/** Semantic version */
	version: string;
	/** Short description */
	description: string;
	/** Author name or organization */
	author: string;
	/** Source registry */
	registry: SkillRegistry;
	/** Search/categorization tags */
	tags: string[];
	/** Skill dependencies */
	dependencies?: SkillDependency[];
	/** Files included in package */
	files: SkillPackageFiles;
	/** Package metadata */
	metadata: SkillPackageMetadata;
	/** License identifier (SPDX) */
	license?: string;
	/** Repository URL */
	repository?: string;
	/** Homepage URL */
	homepage?: string;
	/** Bug tracker URL */
	bugs?: string;
	/** Long description (markdown) */
	readme?: string;
	/** Keywords for enhanced search */
	keywords?: string[];
}

/**
 * Minimal skill package info for search results
 */
export interface SkillSearchResult {
	name: string;
	version: string;
	description: string;
	author: string;
	registry: SkillRegistry;
	tags: string[];
	metadata: SkillPackageMetadata;
}

/**
 * Search filters for skill discovery
 */
export interface SkillSearchFilters {
	/** Text query (searches name, description, tags, keywords) */
	query?: string;
	/** Filter by specific registry */
	registry?: SkillRegistry;
	/** Filter by tags (OR logic) */
	tags?: string[];
	/** Filter by author */
	author?: string;
	/** Minimum rating */
	minRating?: number;
	/** Sort field */
	sortBy?: 'downloads' | 'rating' | 'updated' | 'created' | 'name';
	/** Sort direction */
	sortOrder?: 'asc' | 'desc';
	/** Pagination offset */
	offset?: number;
	/** Results per page */
	limit?: number;
}

/**
 * Search results with pagination
 */
export interface SkillSearchResponse {
	/** Search results */
	results: SkillSearchResult[];
	/** Total matching skills (before pagination) */
	total: number;
	/** Current offset */
	offset: number;
	/** Results per page */
	limit: number;
	/** Indicates if more results available */
	hasMore: boolean;
}

/**
 * Installation options
 */
export interface SkillInstallOptions {
	/** Force reinstall even if already installed */
	force?: boolean;
	/** Skip dependency installation */
	skipDependencies?: boolean;
	/** Specific version to install (defaults to latest) */
	version?: string;
	/** Allow prerelease versions */
	allowPrerelease?: boolean;
}

/**
 * Update information for an installed skill
 */
export interface SkillUpdateInfo {
	/** Skill name */
	name: string;
	/** Currently installed version */
	currentVersion: string;
	/** Latest available version */
	latestVersion: string;
	/** Update is a breaking change (major version bump) */
	isBreaking: boolean;
	/** Update is a feature addition (minor version bump) */
	isFeature: boolean;
	/** Update is a bugfix (patch version bump) */
	isPatch: boolean;
	/** Changelog/release notes */
	changelog?: string;
}

/**
 * Installed skill information
 */
export interface InstalledSkill {
	/** Skill package info */
	package: SkillPackage;
	/** Installation path */
	path: string;
	/** Installation timestamp */
	installedAt: string;
	/** Is pinned (won't auto-update) */
	pinned: boolean;
}

/**
 * Dependency resolution node
 */
export interface DependencyNode {
	/** Skill name */
	name: string;
	/** Resolved version */
	version: string;
	/** Source registry */
	registry: SkillRegistry;
	/** Dependencies of this skill */
	dependencies: DependencyNode[];
	/** Is this an optional dependency */
	optional: boolean;
	/** Installation depth (0 = top-level) */
	depth: number;
}

/**
 * Dependency resolution result
 */
export interface DependencyResolution {
	/** Dependency tree */
	tree: DependencyNode[];
	/** Flat list of all skills to install (ordered) */
	installOrder: Array<{ name: string; version: string; registry: SkillRegistry }>;
	/** Detected issues (warnings, not errors) */
	warnings: string[];
}

/**
 * Registry configuration
 */
export interface RegistryConfig {
	/** Registry type */
	type: SkillRegistry;
	/** API base URL */
	url: string;
	/** Registry display name */
	displayName: string;
	/** Is enabled */
	enabled: boolean;
	/** Authentication token (if required) */
	authToken?: string;
	/** Cache TTL in seconds */
	cacheTTL: number;
}

/**
 * Marketplace cache entry
 */
export interface CacheEntry<T> {
	/** Cached data */
	data: T;
	/** Timestamp when cached */
	timestamp: number;
	/** TTL in seconds */
	ttl: number;
}

/**
 * Skill validation error
 */
export interface SkillValidationError {
	/** Field that failed validation */
	field: string;
	/** Error message */
	message: string;
	/** Validation rule that failed */
	rule: string;
}

/**
 * Skill validation result
 */
export interface SkillValidationResult {
	/** Is package valid */
	valid: boolean;
	/** Validation errors */
	errors: SkillValidationError[];
	/** Validation warnings */
	warnings: SkillValidationError[];
}

/**
 * Installation progress event
 */
export interface InstallationProgress {
	/** Skill being installed */
	skillName: string;
	/** Current step */
	step: 'downloading' | 'verifying' | 'extracting' | 'installing' | 'complete';
	/** Progress percentage (0-100) */
	progress: number;
	/** Current status message */
	message: string;
}

/**
 * Publication options for community registry
 */
export interface SkillPublishOptions {
	/** Authentication token */
	authToken: string;
	/** Dry run (validate but don't publish) */
	dryRun?: boolean;
	/** Package tarball path */
	tarballPath?: string;
}

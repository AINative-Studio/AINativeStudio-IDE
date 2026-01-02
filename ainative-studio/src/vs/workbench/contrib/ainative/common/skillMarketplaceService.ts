/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';
import {
	SkillPackage,
	SkillRegistry,
	SkillSearchFilters,
	SkillSearchResponse,
	SkillInstallOptions,
	SkillUpdateInfo,
	InstalledSkill,
	DependencyResolution,
	RegistryConfig,
	SkillValidationResult,
	InstallationProgress,
	SkillPublishOptions,
} from './skillMarketplaceTypes.js';

/**
 * Service for managing skill marketplace operations
 *
 * Provides functionality for:
 * - Searching and discovering skills across multiple registries
 * - Installing and managing skills and their dependencies
 * - Version management and updates
 * - Caching and offline support
 * - Publishing skills to community registry
 */
export interface ISkillMarketplaceService {
	readonly _serviceBrand: undefined;

	// ========================================
	// Registry Management
	// ========================================

	/**
	 * Get all configured registries
	 */
	getRegistries(): RegistryConfig[];

	/**
	 * Get configuration for a specific registry
	 */
	getRegistry(registry: SkillRegistry): RegistryConfig | undefined;

	/**
	 * Update registry configuration
	 */
	updateRegistry(registry: SkillRegistry, config: Partial<RegistryConfig>): Promise<void>;

	/**
	 * Test registry connectivity
	 */
	testRegistry(registry: SkillRegistry): Promise<{ connected: boolean; latency?: number; error?: string }>;

	// ========================================
	// Skill Discovery
	// ========================================

	/**
	 * Search for skills across all or specific registries
	 *
	 * @param filters Search filters including query, registry, tags, etc.
	 * @returns Paginated search results
	 */
	searchSkills(filters?: SkillSearchFilters): Promise<SkillSearchResponse>;

	/**
	 * Get detailed information about a specific skill
	 *
	 * @param name Skill name
	 * @param registry Source registry (searches all if not specified)
	 * @returns Complete skill package or undefined if not found
	 */
	getSkillDetails(name: string, registry?: SkillRegistry): Promise<SkillPackage | undefined>;

	/**
	 * Get all available versions of a skill
	 *
	 * @param name Skill name
	 * @param registry Source registry
	 * @returns Array of available versions (semver sorted, newest first)
	 */
	getSkillVersions(name: string, registry?: SkillRegistry): Promise<string[]>;

	/**
	 * Browse skills by category/tag
	 *
	 * @param tag Category tag
	 * @param registry Optional registry filter
	 * @returns Skills with the specified tag
	 */
	browseByTag(tag: string, registry?: SkillRegistry): Promise<SkillSearchResponse>;

	/**
	 * Get all available tags across registries
	 *
	 * @param registry Optional registry filter
	 * @returns Array of unique tags with usage counts
	 */
	getTags(registry?: SkillRegistry): Promise<Array<{ tag: string; count: number }>>;

	// ========================================
	// Installation & Management
	// ========================================

	/**
	 * Download and install a skill
	 *
	 * @param name Skill name
	 * @param registry Source registry
	 * @param options Installation options
	 * @returns Installed skill information
	 */
	installSkill(name: string, registry?: SkillRegistry, options?: SkillInstallOptions): Promise<InstalledSkill>;

	/**
	 * Uninstall a skill
	 *
	 * @param name Skill name
	 * @param removeData Also remove skill configuration/data
	 * @returns True if successfully uninstalled
	 */
	uninstallSkill(name: string, removeData?: boolean): Promise<boolean>;

	/**
	 * Update an installed skill to the latest version
	 *
	 * @param name Skill name
	 * @param version Specific version (defaults to latest)
	 * @returns Updated skill information
	 */
	updateSkill(name: string, version?: string): Promise<InstalledSkill>;

	/**
	 * Get list of all installed skills
	 *
	 * @returns Array of installed skill information
	 */
	getInstalledSkills(): Promise<InstalledSkill[]>;

	/**
	 * Check if a skill is installed
	 *
	 * @param name Skill name
	 * @returns Installed skill info or undefined
	 */
	getInstalledSkill(name: string): Promise<InstalledSkill | undefined>;

	/**
	 * Pin a skill to prevent automatic updates
	 *
	 * @param name Skill name
	 * @param pinned Whether to pin or unpin
	 */
	pinSkill(name: string, pinned: boolean): Promise<void>;

	// ========================================
	// Updates & Version Management
	// ========================================

	/**
	 * Check for available updates for all installed skills
	 *
	 * @param includePrerelease Include prerelease versions
	 * @returns Array of available updates
	 */
	checkUpdates(includePrerelease?: boolean): Promise<SkillUpdateInfo[]>;

	/**
	 * Check for update for a specific skill
	 *
	 * @param name Skill name
	 * @param includePrerelease Include prerelease versions
	 * @returns Update info or undefined if up to date
	 */
	checkSkillUpdate(name: string, includePrerelease?: boolean): Promise<SkillUpdateInfo | undefined>;

	/**
	 * Update all skills that have available updates
	 *
	 * @param skipBreaking Don't update if major version change
	 * @returns Array of updated skills
	 */
	updateAllSkills(skipBreaking?: boolean): Promise<InstalledSkill[]>;

	/**
	 * Rollback a skill to a previous version
	 *
	 * @param name Skill name
	 * @param version Version to rollback to
	 * @returns Rolled back skill information
	 */
	rollbackSkill(name: string, version: string): Promise<InstalledSkill>;

	// ========================================
	// Dependency Management
	// ========================================

	/**
	 * Resolve dependencies for a skill
	 *
	 * @param name Skill name
	 * @param version Skill version
	 * @param registry Source registry
	 * @returns Dependency resolution with install order
	 */
	resolveDependencies(name: string, version: string, registry?: SkillRegistry): Promise<DependencyResolution>;

	/**
	 * Validate that all dependencies are satisfied
	 *
	 * @param name Skill name
	 * @returns Validation result with missing/incompatible dependencies
	 */
	validateDependencies(name: string): Promise<{ valid: boolean; missing: string[]; incompatible: string[] }>;

	/**
	 * Get dependency tree for an installed skill
	 *
	 * @param name Skill name
	 * @returns Dependency tree
	 */
	getDependencyTree(name: string): Promise<DependencyResolution | undefined>;

	// ========================================
	// Validation & Integrity
	// ========================================

	/**
	 * Validate a skill package structure
	 *
	 * @param skillPackage Package to validate
	 * @returns Validation result
	 */
	validateSkillPackage(skillPackage: SkillPackage): Promise<SkillValidationResult>;

	/**
	 * Verify integrity of downloaded skill files
	 *
	 * @param name Skill name
	 * @returns True if all files match expected hashes
	 */
	verifySkillIntegrity(name: string): Promise<boolean>;

	/**
	 * Repair a corrupted skill installation
	 *
	 * @param name Skill name
	 * @returns True if successfully repaired
	 */
	repairSkill(name: string): Promise<boolean>;

	// ========================================
	// Publishing (Community Registry)
	// ========================================

	/**
	 * Publish a skill to the community registry
	 *
	 * @param skillPackage Skill package to publish
	 * @param options Publishing options
	 * @returns Published package information
	 */
	publishSkill(skillPackage: SkillPackage, options: SkillPublishOptions): Promise<SkillPackage>;

	/**
	 * Unpublish a skill from the community registry
	 *
	 * @param name Skill name
	 * @param version Specific version (unpublishes all versions if not specified)
	 * @param authToken Authentication token
	 * @returns True if successfully unpublished
	 */
	unpublishSkill(name: string, version: string | undefined, authToken: string): Promise<boolean>;

	// ========================================
	// Cache Management
	// ========================================

	/**
	 * Clear all marketplace caches
	 */
	clearCache(): Promise<void>;

	/**
	 * Clear cache for a specific registry
	 *
	 * @param registry Registry to clear
	 */
	clearRegistryCache(registry: SkillRegistry): Promise<void>;

	/**
	 * Refresh cache for all registries
	 */
	refreshCache(): Promise<void>;

	/**
	 * Get cache statistics
	 *
	 * @returns Cache stats including size, hit rate, etc.
	 */
	getCacheStats(): Promise<{ size: number; entries: number; hitRate: number; lastRefresh: string }>;

	// ========================================
	// Events
	// ========================================

	/**
	 * Event fired when a skill installation progresses
	 */
	readonly onInstallProgress: Event<InstallationProgress>;

	/**
	 * Event fired when a skill is installed
	 */
	readonly onSkillInstalled: Event<InstalledSkill>;

	/**
	 * Event fired when a skill is uninstalled
	 */
	readonly onSkillUninstalled: Event<string>;

	/**
	 * Event fired when a skill is updated
	 */
	readonly onSkillUpdated: Event<InstalledSkill>;

	/**
	 * Event fired when updates are available
	 */
	readonly onUpdatesAvailable: Event<SkillUpdateInfo[]>;
}

export const ISkillMarketplaceService = createDecorator<ISkillMarketplaceService>('skillMarketplaceService');

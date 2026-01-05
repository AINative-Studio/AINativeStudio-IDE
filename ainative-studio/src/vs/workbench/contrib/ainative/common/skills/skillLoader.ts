/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';
import {
	ISkillLoader,
	SkillSummary,
	LoadedSkill,
	SkillMetadata,
	SkillResource,
	CacheStats
} from './skillLoaderTypes.js';

/**
 * Placeholder interfaces for components that will be created later
 * These will be replaced when Component 1 (Registry) and Component 2 (Parser) are implemented
 */

// TODO: Replace with actual ISkillsRegistry from Component 1
interface ISkillsRegistry {
	getSkillPath(skillName: string): Promise<string | null>;
	getAllInstalledSkills(): Promise<string[]>;
}

// TODO: Replace with actual ISkillParser from Component 2
interface ISkillParser {
	parseMetadataOnly(content: string): SkillMetadata;
	parseFullSkill(content: string): { metadata: SkillMetadata; body: string; resources: SkillResource[] };
}

/**
 * LRU Cache implementation for full skills
 */
class LRUCache<K, V> {
	private cache: Map<K, V> = new Map();
	private maxSize: number;

	constructor(maxSize: number) {
		this.maxSize = maxSize;
	}

	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	set(key: K, value: V): void {
		// Remove if exists (to re-add at end)
		this.cache.delete(key);

		// Evict oldest if at capacity
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}

		this.cache.set(key, value);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

/**
 * SkillLoader service implementation with progressive disclosure
 *
 * Loading Strategy:
 * 1. Metadata Cache: Never expires, always in memory (~10KB for all skills)
 * 2. Full Skill Cache: LRU cache with max 5 skills (~50KB max)
 * 3. Reference Files: No cache, read on-demand
 *
 * Performance Targets:
 * - Metadata loading: < 10ms per skill
 * - Full skill loading: < 50ms
 * - Reference file loading: < 100ms
 */
export class SkillLoader implements ISkillLoader {
	readonly _serviceBrand: undefined;

	private metadataCache: Map<string, SkillSummary> = new Map();
	private fullSkillCache: LRUCache<string, LoadedSkill>;

	// Performance tracking
	private cacheHits = 0;
	private cacheMisses = 0;

	constructor(
		private readonly registry: ISkillsRegistry,
		private readonly parser: ISkillParser,
		private readonly fileService: IFileService
	) {
		// LRU cache with max 5 full skills
		this.fullSkillCache = new LRUCache(5);
	}

	/**
	 * Load only metadata for a skill (lightweight, ~100 words)
	 * Target: < 10ms per skill
	 */
	async loadMetadataOnly(skillName: string): Promise<SkillSummary> {
		// Check cache first
		const cached = this.metadataCache.get(skillName);
		if (cached) {
			this.cacheHits++;
			return cached;
		}

		this.cacheMisses++;

		// Get skill path from registry
		const skillPath = await this.registry.getSkillPath(skillName);
		if (!skillPath) {
			throw new Error(`Skill not found: ${skillName}`);
		}

		// Read SKILL.md file
		const skillFileUri = URI.file(`${skillPath}/SKILL.md`);
		const fileContent = await this.fileService.readFile(skillFileUri);
		const content = fileContent.value.toString();

		// Parse only frontmatter (fast, no body parsing)
		const metadata = this.parser.parseMetadataOnly(content);

		// Create lightweight summary
		const summary: SkillSummary = {
			name: metadata.name,
			description: metadata.description,
			tags: metadata.tags,
			category: metadata.category,
			location: metadata.location
		};

		// Cache result (never expires)
		this.metadataCache.set(skillName, summary);

		return summary;
	}

	/**
	 * Load full skill including body and resources
	 * Target: < 50ms
	 */
	async loadFullSkill(skillName: string): Promise<LoadedSkill> {
		// Check cache first
		const cached = this.fullSkillCache.get(skillName);
		if (cached) {
			this.cacheHits++;
			return cached;
		}

		this.cacheMisses++;

		// Get skill path from registry
		const skillPath = await this.registry.getSkillPath(skillName);
		if (!skillPath) {
			throw new Error(`Skill not found: ${skillName}`);
		}

		// Read SKILL.md file
		const skillFileUri = URI.file(`${skillPath}/SKILL.md`);
		const fileContent = await this.fileService.readFile(skillFileUri);
		const content = fileContent.value.toString();

		// Parse full skill (metadata + body + resources)
		const parsed = this.parser.parseFullSkill(content);

		const loadedSkill: LoadedSkill = {
			metadata: parsed.metadata,
			body: parsed.body,
			resources: parsed.resources
		};

		// Cache result (LRU, max 5 skills)
		this.fullSkillCache.set(skillName, loadedSkill);

		return loadedSkill;
	}

	/**
	 * Load a reference file from skill's references directory
	 * Target: < 100ms
	 */
	async loadReference(skillName: string, referencePath: string): Promise<string> {
		// Get skill path from registry
		const skillPath = await this.registry.getSkillPath(skillName);
		if (!skillPath) {
			throw new Error(`Skill not found: ${skillName}`);
		}

		// Build full path to reference file
		// Remove 'references/' prefix if present in referencePath
		const cleanPath = referencePath.startsWith('references/')
			? referencePath.substring('references/'.length)
			: referencePath;

		const referenceFileUri = URI.file(`${skillPath}/references/${cleanPath}`);

		// Read file content (no caching for references)
		try {
			const fileContent = await this.fileService.readFile(referenceFileUri);
			return fileContent.value.toString();
		} catch (error) {
			throw new Error(`Reference file not found: ${skillName}/references/${cleanPath}`);
		}
	}

	/**
	 * Get metadata for all installed skills
	 * This is used to populate skill picker and initial context
	 */
	async getAllMetadata(): Promise<SkillSummary[]> {
		// Get all installed skills from registry
		const installedSkills = await this.registry.getAllInstalledSkills();

		// Load metadata for each skill (uses cache)
		const metadataPromises = installedSkills.map(skillName =>
			this.loadMetadataOnly(skillName)
		);

		return Promise.all(metadataPromises);
	}

	/**
	 * Clear all caches
	 */
	clearCache(): void {
		this.metadataCache.clear();
		this.fullSkillCache.clear();
		this.cacheHits = 0;
		this.cacheMisses = 0;
	}

	/**
	 * Preload metadata for enabled skills
	 * Called on workspace startup to warm the cache
	 */
	async preloadMetadata(enabledSkills: string[]): Promise<void> {
		// Load metadata for all enabled skills in parallel
		const startTime = performance.now();

		await Promise.all(
			enabledSkills.map(skillName => this.loadMetadataOnly(skillName))
		);

		const elapsed = performance.now() - startTime;
		console.log(`[SkillLoader] Preloaded ${enabledSkills.length} skills in ${elapsed.toFixed(2)}ms`);
	}

	/**
	 * Get cache statistics for monitoring
	 */
	getCacheStats(): CacheStats {
		const totalRequests = this.cacheHits + this.cacheMisses;
		const hitRatio = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

		// Estimate memory usage (rough approximation)
		const metadataMemory = this.metadataCache.size * 500; // ~500 bytes per summary
		const fullSkillMemory = this.fullSkillCache.size() * 10000; // ~10KB per full skill

		return {
			metadataCount: this.metadataCache.size,
			fullSkillCount: this.fullSkillCache.size(),
			estimatedMemoryUsage: metadataMemory + fullSkillMemory,
			hitRatio
		};
	}
}

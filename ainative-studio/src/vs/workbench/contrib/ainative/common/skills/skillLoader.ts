/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ISkillsRegistry, RegistryEntry } from './skillRegistryTypes.js';
import { ISkillParser } from './skillParserTypes.js';
import {
	ISkillLoader,
	SkillSummary,
	LoadedSkill,
	CacheStats
} from './skillLoaderTypes.js';

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
 * Composition: this service owns no parsing or registry logic of its own. It
 * asks ISkillsRegistry where an installed skill lives, hands that path to
 * ISkillParser to read and parse, and caches the result. IFileService is used
 * directly only for reference files, which the parser does not read.
 *
 * Loading Strategy:
 * 1. Metadata Cache: Never expires, always in memory (~10KB for all skills)
 * 2. Full Skill Cache: LRU cache with max 5 skills (~50KB max)
 * 3. Reference Files: No cache, read on-demand
 *
 * NOTE: ISkillLoader is intentionally not registered as a DI singleton yet —
 * no consumer currently needs a skill's full body or reference files. See
 * SKILLLOADER_README.md ("Service Registration") for how to wire it up once a
 * call site exists.
 */
export class SkillLoader extends Disposable implements ISkillLoader {
	declare readonly _serviceBrand: undefined;

	private metadataCache: Map<string, SkillSummary> = new Map();
	private fullSkillCache: LRUCache<string, LoadedSkill>;

	// Performance tracking
	private cacheHits = 0;
	private cacheMisses = 0;

	constructor(
		@ISkillsRegistry private readonly registry: ISkillsRegistry,
		@ISkillParser private readonly parser: ISkillParser,
		@IFileService private readonly fileService: IFileService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		// LRU cache with max 5 full skills
		this.fullSkillCache = new LRUCache(5);
	}

	/**
	 * Resolve an installed skill's registry entry, which carries the absolute
	 * path to the skill directory on disk.
	 *
	 * @throws Error if the skill is not installed
	 */
	private async resolveInstalledSkill(skillName: string): Promise<RegistryEntry> {
		const entry = await this.registry.get(skillName);
		if (!entry) {
			throw new Error(`Skill not found: ${skillName}`);
		}
		return entry;
	}

	/**
	 * Build the summary a skill picker needs from a parsed skill plus the
	 * registry entry describing where it was installed from.
	 */
	private toSummary(entry: RegistryEntry, metadata: { name: string; description: string; tags?: string[]; version?: string }): SkillSummary {
		return {
			name: metadata.name,
			description: metadata.description,
			tags: metadata.tags,
			version: metadata.version ?? entry.version,
			source: entry.source,
			path: entry.path
		};
	}

	/**
	 * Load only metadata for a skill (lightweight, ~100 words)
	 * Target: < 10ms per skill
	 *
	 * The parser exposes a single whole-file entry point, so a metadata-only
	 * request parses the file once and keeps just the summary resident. The
	 * summary cache never expires, so repeat calls cost nothing.
	 */
	async loadMetadataOnly(skillName: string): Promise<SkillSummary> {
		// Check cache first
		const cached = this.metadataCache.get(skillName);
		if (cached) {
			this.cacheHits++;
			return cached;
		}

		this.cacheMisses++;

		// Resolve the skill's location from the registry
		const entry = await this.resolveInstalledSkill(skillName);

		// Parse SKILL.md via the shared parser (reads the file itself)
		const skillFilePath = joinPath(URI.file(entry.path), 'SKILL.md').fsPath;
		const skill = await this.parser.parseSkillFile(skillFilePath);

		// Create lightweight summary
		const summary = this.toSummary(entry, skill.metadata);

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

		// Resolve the skill's location from the registry
		const entry = await this.resolveInstalledSkill(skillName);

		// Parse full skill (metadata + body + discovered resources)
		const skillFilePath = joinPath(URI.file(entry.path), 'SKILL.md').fsPath;
		const skill = await this.parser.parseSkillFile(skillFilePath);

		const loadedSkill: LoadedSkill = {
			metadata: skill.metadata,
			body: skill.body,
			resources: skill.resources,
			fullPath: skill.fullPath
		};

		// Cache result (LRU, max 5 skills)
		this.fullSkillCache.set(skillName, loadedSkill);

		// Opportunistically warm the metadata cache from the same parse
		if (!this.metadataCache.has(skillName)) {
			this.metadataCache.set(skillName, this.toSummary(entry, skill.metadata));
		}

		return loadedSkill;
	}

	/**
	 * Load a reference file from skill's references directory
	 * Target: < 100ms
	 *
	 * `referencePath` may originate from a model response, so it is confined to
	 * the skill's own references/ directory: an absolute path or one that
	 * escapes upward via '..' is rejected rather than read.
	 */
	async loadReference(skillName: string, referencePath: string): Promise<string> {
		// Resolve the skill's location from the registry
		const entry = await this.resolveInstalledSkill(skillName);

		// Build full path to reference file
		// Remove 'references/' prefix if present in referencePath
		const cleanPath = referencePath.startsWith('references/')
			? referencePath.substring('references/'.length)
			: referencePath;

		const referencesRoot = joinPath(URI.file(entry.path), 'references');
		const referenceFileUri = joinPath(referencesRoot, cleanPath);

		// Confine the resolved path to the skill's references/ directory
		if (!this.isContainedIn(referenceFileUri, referencesRoot)) {
			throw new Error(`Invalid reference path for skill '${skillName}': ${referencePath}`);
		}

		// Read file content (no caching for references)
		try {
			const fileContent = await this.fileService.readFile(referenceFileUri);
			return fileContent.value.toString();
		} catch (error) {
			throw new Error(`Reference file not found: ${skillName}/references/${cleanPath}`);
		}
	}

	/**
	 * Check that `candidate` resolves to a descendant of `root`.
	 * Both URIs are already normalized by joinPath, so a plain prefix check on
	 * the path is sufficient to detect traversal out of `root`.
	 */
	private isContainedIn(candidate: URI, root: URI): boolean {
		if (candidate.scheme !== root.scheme) {
			return false;
		}
		const rootPath = root.path.endsWith('/') ? root.path : `${root.path}/`;
		return candidate.path.startsWith(rootPath);
	}

	/**
	 * Get metadata for all installed skills
	 * This is used to populate skill picker and initial context
	 *
	 * Skills whose SKILL.md fails to parse are skipped rather than failing the
	 * whole listing — one malformed skill must not hide every other skill.
	 */
	async getAllMetadata(): Promise<SkillSummary[]> {
		// Get all installed skills from registry
		const installedSkills = await this.registry.list();

		// Load metadata for each skill (uses cache)
		const summaries = await Promise.all(
			installedSkills.map(async entry => {
				try {
					return await this.loadMetadataOnly(entry.name);
				} catch (error) {
					return undefined;
				}
			})
		);

		return summaries.filter((summary): summary is SkillSummary => summary !== undefined);
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
	 *
	 * A skill that is enabled in config but not installed (or whose SKILL.md is
	 * malformed) must not fail startup, so failures are logged and skipped.
	 */
	async preloadMetadata(enabledSkills: string[]): Promise<void> {
		// Load metadata for all enabled skills in parallel
		const startTime = performance.now();

		const results = await Promise.all(
			enabledSkills.map(async skillName => {
				try {
					await this.loadMetadataOnly(skillName);
					return true;
				} catch (error) {
					this.logService.warn(
						`[SkillLoader] Failed to preload skill '${skillName}': ${error instanceof Error ? error.message : String(error)}`
					);
					return false;
				}
			})
		);

		const loaded = results.filter(ok => ok).length;
		const elapsed = performance.now() - startTime;
		this.logService.trace(`[SkillLoader] Preloaded ${loaded}/${enabledSkills.length} skills in ${elapsed.toFixed(2)}ms`);
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

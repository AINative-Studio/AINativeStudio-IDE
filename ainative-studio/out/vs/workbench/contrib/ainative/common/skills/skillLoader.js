/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ISkillsRegistry } from './skillRegistryTypes.js';
import { ISkillParser } from './skillParserTypes.js';
/**
 * LRU Cache implementation for full skills
 */
class LRUCache {
    constructor(maxSize) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
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
    clear() {
        this.cache.clear();
    }
    size() {
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
let SkillLoader = class SkillLoader extends Disposable {
    constructor(registry, parser, fileService, logService) {
        super();
        this.registry = registry;
        this.parser = parser;
        this.fileService = fileService;
        this.logService = logService;
        this.metadataCache = new Map();
        // Performance tracking
        this.cacheHits = 0;
        this.cacheMisses = 0;
        // LRU cache with max 5 full skills
        this.fullSkillCache = new LRUCache(5);
    }
    /**
     * Resolve an installed skill's registry entry, which carries the absolute
     * path to the skill directory on disk.
     *
     * @throws Error if the skill is not installed
     */
    async resolveInstalledSkill(skillName) {
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
    toSummary(entry, metadata) {
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
    async loadMetadataOnly(skillName) {
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
    async loadFullSkill(skillName) {
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
        const loadedSkill = {
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
    async loadReference(skillName, referencePath) {
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
        }
        catch (error) {
            throw new Error(`Reference file not found: ${skillName}/references/${cleanPath}`);
        }
    }
    /**
     * Check that `candidate` resolves to a descendant of `root`.
     * Both URIs are already normalized by joinPath, so a plain prefix check on
     * the path is sufficient to detect traversal out of `root`.
     */
    isContainedIn(candidate, root) {
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
    async getAllMetadata() {
        // Get all installed skills from registry
        const installedSkills = await this.registry.list();
        // Load metadata for each skill (uses cache)
        const summaries = await Promise.all(installedSkills.map(async (entry) => {
            try {
                return await this.loadMetadataOnly(entry.name);
            }
            catch (error) {
                this.logService.warn(`[SkillLoader] Skipping skill '${entry.name}' in getAllMetadata: ${error instanceof Error ? error.message : String(error)}`);
                return undefined;
            }
        }));
        return summaries.filter((summary) => summary !== undefined);
    }
    /**
     * Clear all caches
     */
    clearCache() {
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
    async preloadMetadata(enabledSkills) {
        // Load metadata for all enabled skills in parallel
        const startTime = performance.now();
        const results = await Promise.all(enabledSkills.map(async (skillName) => {
            try {
                await this.loadMetadataOnly(skillName);
                return true;
            }
            catch (error) {
                this.logService.warn(`[SkillLoader] Failed to preload skill '${skillName}': ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        }));
        const loaded = results.filter(ok => ok).length;
        const elapsed = performance.now() - startTime;
        this.logService.trace(`[SkillLoader] Preloaded ${loaded}/${enabledSkills.length} skills in ${elapsed.toFixed(2)}ms`);
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
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
};
SkillLoader = __decorate([
    __param(0, ISkillsRegistry),
    __param(1, ISkillParser),
    __param(2, IFileService),
    __param(3, ILogService)
], SkillLoader);
export { SkillLoader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvc2tpbGxMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLHlCQUF5QixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQVFyRDs7R0FFRztBQUNILE1BQU0sUUFBUTtJQUliLFlBQVksT0FBZTtRQUhuQixVQUFLLEdBQWMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUlwQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQU07UUFDVCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QixtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUss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
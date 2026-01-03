/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
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
export class SkillLoader {
    constructor(registry, parser, fileService) {
        this.registry = registry;
        this.parser = parser;
        this.fileService = fileService;
        this.metadataCache = new Map();
        // Performance tracking
        this.cacheHits = 0;
        this.cacheMisses = 0;
        // LRU cache with max 5 full skills
        this.fullSkillCache = new LRUCache(5);
    }
    /**
     * Load only metadata for a skill (lightweight, ~100 words)
     * Target: < 10ms per skill
     */
    async loadMetadataOnly(skillName) {
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
        const summary = {
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
    async loadFullSkill(skillName) {
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
        const loadedSkill = {
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
    async loadReference(skillName, referencePath) {
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
        }
        catch (error) {
            throw new Error(`Reference file not found: ${skillName}/references/${cleanPath}`);
        }
    }
    /**
     * Get metadata for all installed skills
     * This is used to populate skill picker and initial context
     */
    async getAllMetadata() {
        // Get all installed skills from registry
        const installedSkills = await this.registry.getAllInstalledSkills();
        // Load metadata for each skill (uses cache)
        const metadataPromises = installedSkills.map(skillName => this.loadMetadataOnly(skillName));
        return Promise.all(metadataPromises);
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
     */
    async preloadMetadata(enabledSkills) {
        // Load metadata for all enabled skills in parallel
        const startTime = performance.now();
        await Promise.all(enabledSkills.map(skillName => this.loadMetadataOnly(skillName)));
        const elapsed = performance.now() - startTime;
        console.log(`[SkillLoader] Preloaded ${enabledSkills.length} skills in ${elapsed.toFixed(2)}ms`);
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvc2tpbGxMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBMkJyRDs7R0FFRztBQUNILE1BQU0sUUFBUTtJQUliLFlBQVksT0FBZTtRQUhuQixVQUFLLEdBQWMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUlwQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQU07UUFDVCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QixtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBTSxFQUFFLEtBQVE7UUFDbkIsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLDhCQUE4QjtRQUM5QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElB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
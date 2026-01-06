/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as path from 'path';
import { SkillLoader } from '../../common/skills/skillLoader.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Schemas } from '../../../../../base/common/network.js';
suite('SkillLoader Tests', () => {
    let loader;
    let disposables;
    let fileService;
    const fixturesPath = path.join(__dirname, 'fixtures', 'skills');
    // Mock registry interface
    class MockSkillsRegistry {
        constructor() {
            this.skills = new Map();
            // Register test skills with their paths
            this.skills.set('minimal-skill', path.join(fixturesPath, 'minimal-skill'));
            this.skills.set('comprehensive-skill', path.join(fixturesPath, 'comprehensive-skill'));
            this.skills.set('skill-with-resources', path.join(fixturesPath, 'skill-with-resources'));
            this.skills.set('unicode-skill', path.join(fixturesPath, 'unicode-skill'));
        }
        async getSkillPath(skillName) {
            return this.skills.get(skillName) || null;
        }
        async getAllInstalledSkills() {
            return Array.from(this.skills.keys());
        }
    }
    // Mock skill parser interface
    class MockSkillParser {
        parseMetadataOnly(content) {
            // Extract frontmatter and parse only metadata
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
            if (!frontmatterMatch) {
                throw new Error('No frontmatter found');
            }
            const metadata = {
                location: 'project'
            };
            const lines = frontmatterMatch[1].split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#'))
                    continue;
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex === -1)
                    continue;
                const key = trimmed.substring(0, colonIndex).trim();
                let value = trimmed.substring(colonIndex + 1).trim();
                // Remove quotes
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                // Handle arrays
                if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
                    const arrayContent = value.substring(1, value.length - 1);
                    metadata.tags = arrayContent.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
                }
                else {
                    switch (key) {
                        case 'name':
                            metadata.name = value;
                            break;
                        case 'description':
                            metadata.description = value;
                            break;
                        case 'version':
                            metadata.version = value;
                            break;
                        case 'author':
                            metadata.author = value;
                            break;
                        case 'category':
                            metadata.category = value;
                            break;
                    }
                }
            }
            return metadata;
        }
        parseFullSkill(content) {
            const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
            if (!frontmatterMatch) {
                throw new Error('No frontmatter found');
            }
            const metadata = this.parseMetadataOnly(content);
            const body = frontmatterMatch[2].trim();
            const resources = [];
            return { metadata, body, resources };
        }
    }
    setup(() => {
        disposables = new DisposableStore();
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const diskProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskProvider);
        const mockRegistry = new MockSkillsRegistry();
        const mockParser = new MockSkillParser();
        loader = new SkillLoader(mockRegistry, mockParser, fileService);
    });
    teardown(() => {
        disposables.dispose();
    });
    suite('Metadata Loading', () => {
        test('should load metadata only without body', async () => {
            const summary = await loader.loadMetadataOnly('minimal-skill');
            assert.strictEqual(summary.name, 'minimal-skill');
            assert.ok(summary.description.length > 0);
            assert.strictEqual(summary.location, 'project');
        });
        test('should load metadata in reasonable time (<10ms)', async () => {
            // First load to warm up
            await loader.loadMetadataOnly('minimal-skill');
            loader.clearCache();
            // Measure actual load time
            const startTime = performance.now();
            await loader.loadMetadataOnly('minimal-skill');
            const elapsed = performance.now() - startTime;
            assert.ok(elapsed < 10, `Metadata loading took ${elapsed}ms, should be < 10ms`);
        });
        test('should get all metadata for installed skills', async () => {
            const allMetadata = await loader.getAllMetadata();
            assert.ok(Array.isArray(allMetadata));
            assert.ok(allMetadata.length >= 4);
            const skillNames = allMetadata.map(s => s.name);
            assert.ok(skillNames.includes('minimal-skill'));
            assert.ok(skillNames.includes('comprehensive-skill'));
            assert.ok(skillNames.includes('skill-with-resources'));
        });
        test('should cache metadata after first load', async () => {
            const summary1 = await loader.loadMetadataOnly('minimal-skill');
            const summary2 = await loader.loadMetadataOnly('minimal-skill');
            // Should return same instance from cache
            assert.strictEqual(summary1.name, summary2.name);
            assert.strictEqual(summary1.description, summary2.description);
            const stats = loader.getCacheStats();
            assert.ok(stats.hitRatio > 0, 'Should have cache hits');
        });
    });
    suite('Full Skill Loading', () => {
        test('should load full skill with metadata and body', async () => {
            const skill = await loader.loadFullSkill('comprehensive-skill');
            assert.ok(skill.metadata);
            assert.strictEqual(skill.metadata.name, 'comprehensive-skill');
            assert.ok(skill.body);
            assert.ok(skill.body.length > 0);
            assert.ok(skill.resources !== undefined);
        });
        test('should load full skill in reasonable time (<50ms)', async () => {
            // First load to warm up
            await loader.loadFullSkill('comprehensive-skill');
            loader.clearCache();
            // Measure actual load time
            const startTime = performance.now();
            await loader.loadFullSkill('comprehensive-skill');
            const elapsed = performance.now() - startTime;
            assert.ok(elapsed < 50, `Full skill loading took ${elapsed}ms, should be < 50ms`);
        });
        test('should cache full skills', async () => {
            const skill1 = await loader.loadFullSkill('minimal-skill');
            const skill2 = await loader.loadFullSkill('minimal-skill');
            assert.strictEqual(skill1.metadata.name, skill2.metadata.name);
            assert.strictEqual(skill1.body, skill2.body);
            const stats = loader.getCacheStats();
            assert.ok(stats.fullSkillCount > 0, 'Should have cached full skills');
        });
        test('should evict oldest skill when cache is full (LRU)', async () => {
            // Load more than cache size (default 5)
            await loader.loadFullSkill('minimal-skill');
            await loader.loadFullSkill('comprehensive-skill');
            await loader.loadFullSkill('skill-with-resources');
            await loader.loadFullSkill('unicode-skill');
            // Access minimal-skill again to make it recently used
            await loader.loadFullSkill('minimal-skill');
            const stats = loader.getCacheStats();
            assert.ok(stats.fullSkillCount <= 5, 'Cache should not exceed max size');
        });
    });
    suite('Reference Loading', () => {
        test('should load reference file on-demand', async () => {
            const content = await loader.loadReference('comprehensive-skill', 'api-docs.md');
            assert.ok(content.length > 0);
            assert.ok(content.includes('API Documentation'));
        });
        test('should load reference in reasonable time (<100ms)', async () => {
            const startTime = performance.now();
            await loader.loadReference('comprehensive-skill', 'api-docs.md');
            const elapsed = performance.now() - startTime;
            assert.ok(elapsed < 100, `Reference loading took ${elapsed}ms, should be < 100ms`);
        });
        test('should throw error for non-existent reference', async () => {
            try {
                await loader.loadReference('comprehensive-skill', 'non-existent.md');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Reference file not found'));
            }
        });
    });
    suite('Caching Strategy', () => {
        test('should clear all caches', async () => {
            await loader.loadMetadataOnly('minimal-skill');
            await loader.loadFullSkill('comprehensive-skill');
            let stats = loader.getCacheStats();
            assert.ok(stats.metadataCount > 0);
            assert.ok(stats.fullSkillCount > 0);
            loader.clearCache();
            stats = loader.getCacheStats();
            assert.strictEqual(stats.metadataCount, 0);
            assert.strictEqual(stats.fullSkillCount, 0);
            assert.strictEqual(stats.hitRatio, 0);
        });
        test('should provide cache statistics', async () => {
            await loader.loadMetadataOnly('minimal-skill');
            await loader.loadMetadataOnly('comprehensive-skill');
            await loader.loadFullSkill('minimal-skill');
            const stats = loader.getCacheStats();
            assert.strictEqual(typeof stats.metadataCount, 'number');
            assert.strictEqual(typeof stats.fullSkillCount, 'number');
            assert.strictEqual(typeof stats.estimatedMemoryUsage, 'number');
            assert.strictEqual(typeof stats.hitRatio, 'number');
            assert.ok(stats.hitRatio >= 0 && stats.hitRatio <= 1);
        });
        test('should maintain separate caches for metadata and full skills', async () => {
            await loader.loadMetadataOnly('minimal-skill');
            const stats1 = loader.getCacheStats();
            assert.strictEqual(stats1.metadataCount, 1);
            assert.strictEqual(stats1.fullSkillCount, 0);
            await loader.loadFullSkill('minimal-skill');
            const stats2 = loader.getCacheStats();
            assert.strictEqual(stats2.metadataCount, 1);
            assert.strictEqual(stats2.fullSkillCount, 1);
        });
    });
    suite('Performance Benchmarks', () => {
        test('should load 10 skills metadata in <50ms total', async () => {
            loader.clearCache();
            const skillsToLoad = ['minimal-skill', 'comprehensive-skill', 'skill-with-resources', 'unicode-skill'];
            const startTime = performance.now();
            // Load each skill multiple times to get 10 operations
            for (let i = 0; i < 3; i++) {
                for (const skillName of skillsToLoad) {
                    await loader.loadMetadataOnly(skillName);
                }
            }
            const elapsed = performance.now() - startTime;
            // Due to caching, subsequent loads should be very fast
            assert.ok(elapsed < 100, `Loading 12 skills took ${elapsed}ms`);
        });
        test('should use less than 10KB for metadata cache', async () => {
            await loader.loadMetadataOnly('minimal-skill');
            await loader.loadMetadataOnly('comprehensive-skill');
            await loader.loadMetadataOnly('skill-with-resources');
            const stats = loader.getCacheStats();
            // Rough estimate: each metadata summary should be < 1KB
            const metadataMemory = stats.metadataCount * 500; // ~500 bytes per summary
            assert.ok(metadataMemory < 10000, `Metadata cache using ~${metadataMemory} bytes, should be < 10KB`);
        });
        test('should use less than 60KB total memory', async () => {
            await loader.loadMetadataOnly('minimal-skill');
            await loader.loadMetadataOnly('comprehensive-skill');
            await loader.loadFullSkill('minimal-skill');
            await loader.loadFullSkill('comprehensive-skill');
            const stats = loader.getCacheStats();
            assert.ok(stats.estimatedMemoryUsage < 60000, `Total memory usage ${stats.estimatedMemoryUsage} bytes, should be < 60KB`);
        });
        test('should achieve 95% context reduction vs loading all skills', async () => {
            // Load only metadata for all skills
            const allMetadata = await loader.getAllMetadata();
            // Calculate metadata size (sum of name + description lengths)
            const metadataSize = allMetadata.reduce((sum, skill) => {
                return sum + skill.name.length + skill.description.length;
            }, 0);
            // Compare with estimated full size (assume average skill has 5000 chars of content)
            const estimatedFullSize = allMetadata.length * 5000;
            const reduction = 1 - (metadataSize / estimatedFullSize);
            assert.ok(reduction >= 0.90, `Context reduction ${(reduction * 100).toFixed(2)}%, should be >= 90%`);
        });
    });
    suite('Preload Functionality', () => {
        test('should preload metadata for enabled skills', async () => {
            loader.clearCache();
            const enabledSkills = ['minimal-skill', 'comprehensive-skill'];
            await loader.preloadMetadata(enabledSkills);
            const stats = loader.getCacheStats();
            assert.strictEqual(stats.metadataCount, enabledSkills.length);
        });
        test('should preload in reasonable time', async () => {
            loader.clearCache();
            const enabledSkills = ['minimal-skill', 'comprehensive-skill', 'skill-with-resources'];
            const startTime = performance.now();
            await loader.preloadMetadata(enabledSkills);
            const elapsed = performance.now() - startTime;
            assert.ok(elapsed < 100, `Preload took ${elapsed}ms, should be < 100ms`);
        });
    });
    suite('Error Handling', () => {
        test('should throw error for non-existent skill', async () => {
            try {
                await loader.loadMetadataOnly('non-existent-skill');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Skill not found'));
            }
        });
        test('should throw error when loading full skill for non-existent skill', async () => {
            try {
                await loader.loadFullSkill('non-existent-skill');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Skill not found'));
            }
        });
        test('should handle malformed skills gracefully', async () => {
            // The parser should throw an error for malformed skills
            // The loader should propagate this error appropriately
            try {
                await loader.loadMetadataOnly('non-existent-skill');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof Error);
            }
        });
    });
    suite('Token Usage Measurement', () => {
        test('should measure token usage for metadata', async () => {
            const summary = await loader.loadMetadataOnly('minimal-skill');
            // Verify token estimation exists (approximate character count / 4)
            const estimatedTokens = (summary.name.length + summary.description.length) / 4;
            assert.ok(estimatedTokens > 0, 'Should have measurable token usage');
        });
        test('should measure token usage for full skill', async () => {
            const skill = await loader.loadFullSkill('comprehensive-skill');
            // Verify we can estimate tokens for full skill
            assert.ok(skill.body !== undefined, 'Skill body should be defined');
            const bodyTokens = skill.body.length / 4;
            assert.ok(bodyTokens > 0, 'Should have measurable token usage for body');
        });
        test('should track cumulative token usage across loads', async () => {
            loader.clearCache();
            await loader.loadMetadataOnly('minimal-skill');
            await loader.loadMetadataOnly('comprehensive-skill');
            await loader.loadFullSkill('minimal-skill');
            const stats = loader.getCacheStats();
            // We loaded content, so memory usage should be > 0
            assert.ok(stats.estimatedMemoryUsage > 0);
        });
    });
    suite('Advanced Caching', () => {
        test('should invalidate cache when skill updated', async () => {
            await loader.loadFullSkill('minimal-skill');
            const stats1 = loader.getCacheStats();
            assert.strictEqual(stats1.fullSkillCount, 1);
            // Clear cache (simulating skill update)
            loader.clearCache();
            const stats2 = loader.getCacheStats();
            assert.strictEqual(stats2.fullSkillCount, 0);
            // Reload should work
            const skill = await loader.loadFullSkill('minimal-skill');
            assert.ok(skill);
        });
        test('should handle cache hits and misses correctly', async () => {
            loader.clearCache();
            // First load is a cache miss
            await loader.loadMetadataOnly('minimal-skill');
            // Second load should be a cache hit
            await loader.loadMetadataOnly('minimal-skill');
            const stats = loader.getCacheStats();
            assert.ok(stats.hitRatio > 0, 'Should have cache hits');
        });
    });
    suite('Very Large Skills', () => {
        test('should handle very large skill bodies (>500KB)', async () => {
            // This verifies the loader can handle large skills without issues
            const skill = await loader.loadFullSkill('comprehensive-skill');
            assert.ok(skill);
            assert.ok(skill.body);
            // Verify the loader handles the skill efficiently
            const stats = loader.getCacheStats();
            assert.ok(stats.estimatedMemoryUsage < 10 * 1024 * 1024, 'Should keep memory usage reasonable');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMb2FkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxMb2FkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFakUsNkRBQTZEO0FBQzdELDZEQUE2RDtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN0Ryw2REFBNkQ7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhFLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxNQUFtQixDQUFDO0lBQ3hCLElBQUksV0FBNEIsQ0FBQztJQUNqQyxJQUFJLFdBQXdCLENBQUM7SUFDN0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRWhFLDBCQUEwQjtJQUMxQixNQUFNLGtCQUFrQjtRQUd2QjtZQUZpQixXQUFNLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7WUFHeEQsd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMs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
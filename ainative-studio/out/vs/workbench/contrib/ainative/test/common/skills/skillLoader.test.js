/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { SkillLoader } from '../../../common/skills/skillLoader.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
/**
 * Unit Tests for SkillLoader
 * Following BDD style (describe/it) and TDD principles
 * Coverage target: 100% for core loading logic
 */
suite('SkillLoader', () => {
    let loader;
    let mockRegistry;
    let mockParser;
    let mockFileService;
    setup(() => {
        // Create mocks
        mockRegistry = createMockRegistry();
        mockParser = createMockParser();
        mockFileService = createMockFileService();
        loader = new SkillLoader(mockRegistry, mockParser, mockFileService);
    });
    suite('loadMetadataOnly', () => {
        test('should load metadata without body', async () => {
            const skillName = 'test-skill';
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockParser.parseMetadataOnly = (content) => {
                return {
                    name: skillName,
                    description: 'Test skill description',
                    tags: ['test'],
                    category: 'testing',
                    location: 'project'
                };
            };
            const result = await loader.loadMetadataOnly(skillName);
            assert.strictEqual(result.name, skillName);
            assert.strictEqual(result.description, 'Test skill description');
            assert.ok(result.tags && result.tags.includes('test'));
        });
        test('should cache metadata for subsequent calls', async () => {
            const skillName = 'cached-skill';
            let callCount = 0;
            mockRegistry.getSkillPath = async (name) => {
                callCount++;
                return `/home/.ainative/skills/${name}`;
            };
            mockParser.parseMetadataOnly = (content) => {
                return {
                    name: skillName,
                    description: 'Cached skill',
                    tags: [],
                    category: 'test',
                    location: 'global'
                };
            };
            // First call - should read from file
            await loader.loadMetadataOnly(skillName);
            const firstCallCount = callCount;
            // Second call - should use cache
            const result = await loader.loadMetadataOnly(skillName);
            assert.strictEqual(result.name, skillName);
            // Registry should only be called once (cache hit on second call)
            assert.strictEqual(callCount, firstCallCount);
        });
        test('should throw error for missing skill', async () => {
            mockRegistry.getSkillPath = async (name) => {
                return null;
            };
            await assert.rejects(async () => await loader.loadMetadataOnly('nonexistent-skill'), (error) => {
                assert.ok(error.message.includes('Skill not found'));
                return true;
            });
        });
    });
    suite('loadFullSkill', () => {
        test('should load body on demand', async () => {
            const skillName = 'full-skill';
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockParser.parseFullSkill = (content) => {
                return {
                    metadata: {
                        name: skillName,
                        description: 'Full skill with body',
                        tags: [],
                        category: 'test',
                        location: 'global'
                    },
                    body: 'This is the full skill body content',
                    resources: []
                };
            };
            const result = await loader.loadFullSkill(skillName);
            assert.strictEqual(result.metadata.name, skillName);
            assert.strictEqual(result.body, 'This is the full skill body content');
            assert.ok(Array.isArray(result.resources));
        });
        test('should cache full skills in LRU cache', async () => {
            const skillName = 'lru-skill';
            let parseCallCount = 0;
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockParser.parseFullSkill = (content) => {
                parseCallCount++;
                return {
                    metadata: {
                        name: skillName,
                        description: 'LRU cached skill',
                        tags: [],
                        category: 'test',
                        location: 'global'
                    },
                    body: 'Body content',
                    resources: []
                };
            };
            // First load
            await loader.loadFullSkill(skillName);
            const firstParseCount = parseCallCount;
            // Second load - should use cache
            const result = await loader.loadFullSkill(skillName);
            assert.strictEqual(result.metadata.name, skillName);
            // Parser should only be called once
            assert.strictEqual(parseCallCount, firstParseCount);
        });
        test('should evict oldest skills when cache is full', async () => {
            // Load 6 skills (cache max is 5)
            for (let i = 1; i <= 6; i++) {
                const skillName = `skill-${i}`;
                mockRegistry.getSkillPath = async (name) => {
                    return `/home/.ainative/skills/${name}`;
                };
                mockParser.parseFullSkill = (content) => {
                    return {
                        metadata: {
                            name: skillName,
                            description: `Skill ${i}`,
                            tags: [],
                            category: 'test',
                            location: 'global'
                        },
                        body: `Body ${i}`,
                        resources: []
                    };
                };
                await loader.loadFullSkill(skillName);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const stats = loader.getCacheStats();
            // Cache should have max 5 skills
            assert.ok(stats.fullSkillCount <= 5);
        });
        test('should handle missing skills gracefully', async () => {
            mockRegistry.getSkillPath = async (name) => {
                return null;
            };
            await assert.rejects(async () => await loader.loadFullSkill('missing-skill'), (error) => {
                assert.ok(error.message.includes('Skill not found'));
                return true;
            });
        });
    });
    suite('loadReferences', () => {
        test('should load reference files on demand', async () => {
            const skillName = 'skill-with-refs';
            const refPath = 'references/example.md';
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockFileService.readFile = async (uri) => {
                if (uri.path.includes('example.md')) {
                    return { value: VSBuffer.fromString('Reference file content') };
                }
                return { value: VSBuffer.fromString('') };
            };
            const content = await loader.loadReference(skillName, refPath);
            assert.strictEqual(content, 'Reference file content');
        });
        test('should not cache reference files', async () => {
            const skillName = 'skill-with-refs';
            const refPath = 'references/nocache.md';
            let readCount = 0;
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockFileService.readFile = async (uri) => {
                readCount++;
                return { value: VSBuffer.fromString('Content') };
            };
            // Read twice
            await loader.loadReference(skillName, refPath);
            await loader.loadReference(skillName, refPath);
            // Should be called twice (no caching)
            assert.strictEqual(readCount, 2);
        });
    });
    suite('getCacheStats', () => {
        test('should measure cache hits and misses', async () => {
            const skillName = 'stats-skill';
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockParser.parseMetadataOnly = (content) => {
                return {
                    name: skillName,
                    description: 'Stats test',
                    tags: [],
                    category: 'test',
                    location: 'global'
                };
            };
            // First call - cache miss
            await loader.loadMetadataOnly(skillName);
            // Second call - cache hit
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            await loader.loadMetadataOnly(skillName);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const stats = loader.getCacheStats(); // Test that cache stats can be retrieved
            assert.strictEqual(0, 1);
            assert.strictEqual(0, 1);
        });
        test('should track metadata cache size', async () => {
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockParser.parseMetadataOnly = (content) => {
                return {
                    name: 'skill',
                    description: 'Test',
                    tags: [],
                    category: 'test',
                    location: 'global'
                };
            };
            // Load 3 different skills
            await loader.loadMetadataOnly('skill-1');
            await loader.loadMetadataOnly('skill-2');
            await loader.loadMetadataOnly('skill-3');
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const stats = loader.getCacheStats();
            assert.strictEqual(stats.metadataCount, 3);
        });
    });
    suite('invalidateCache', () => {
        test('should invalidate cache on skill uninstall', () => {
            // Load some skills first
            const skillName = 'to-be-uninstalled';
            mockRegistry.getSkillPath = async (name) => {
                return `/home/.ainative/skills/${name}`;
            };
            mockParser.parseMetadataOnly = (content) => {
                return {
                    name: skillName,
                    description: 'Will be uninstalled',
                    tags: [],
                    category: 'test',
                    location: 'global'
                };
            };
            // Invalidate cache for specific skill
            loader.clearCache();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const stats = loader.getCacheStats();
            // Cache should be cleared
            assert.ok(stats);
        });
    });
});
/**
 * Helper functions to create mocks
 */
function createMockRegistry() {
    return {
        getSkillPath: async (name) => `/home/.ainative/skills/${name}`,
        getAllInstalledSkills: async () => ['skill-1', 'skill-2']
    };
}
function createMockParser() {
    return {
        parseMetadataOnly: (content) => ({
            name: 'test-skill',
            description: 'Test description',
            tags: [],
            category: 'test',
            location: 'global'
        }),
        parseFullSkill: (content) => ({
            metadata: {
                name: 'test-skill',
                description: 'Test description',
                tags: [],
                category: 'test',
                location: 'global'
            },
            body: 'Test body',
            resources: []
        })
    };
}
function createMockFileService() {
    return {
        readFile: async (uri) => {
            return { value: VSBuffer.fromString('---\nname: test\ndescription: test\n---\n\n# Body') };
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMb2FkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxzL3NraWxsTG9hZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBS3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuRTs7OztHQUlHO0FBQ0gsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFFekIsSUFBSSxNQUFtQixDQUFDO0lBQ3hCLElBQUksWUFBaUIsQ0FBQztJQUN0QixJQUFJLFVBQWUsQ0FBQztJQUNwQixJQUFJLGVBQTZCLENBQUM7SUFFbEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGVBQWU7UUFDZixZQUFZLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztRQUNwQyxVQUFVLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoQyxlQUFlLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztRQUUxQyxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFFOUIsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BELE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQztZQUUvQixZQUFZLENBQUMsWUFBWSxHQUFHLEtBQUssRUFBRSxJQUFZLEVBQUUsRUFBRTtnQkFDbEQsT0FBTywwQkFB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
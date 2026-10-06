/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { SkillLoader } from '../../../common/skills/skillLoader.js';
import { ISkillLoader } from '../../../common/skills/skillLoaderTypes.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
/**
 * Unit tests for SkillLoader's caching contract.
 *
 * These use in-memory stand-ins that implement the REAL ISkillsRegistry and
 * ISkillParser interfaces (from skillRegistryTypes.ts / skillParserTypes.ts),
 * so a signature drift in either service breaks this suite at compile time.
 * Fixture-backed integration coverage against the real SkillParser lives in
 * ../skillLoader.test.ts.
 */
suite('SkillLoader', () => {
    let loader;
    let registry;
    let parser;
    let disposables;
    /** Implements the real ISkillsRegistry and counts resolution calls. */
    class CountingSkillsRegistry {
        constructor(skillNames) {
            this.entries = new Map();
            this.getCallCount = 0;
            this.listCallCount = 0;
            for (const name of skillNames) {
                this.entries.set(name, {
                    name,
                    version: '1.0.0',
                    installedAt: 0,
                    source: 'local',
                    path: `/home/user/.ainative/skills/${name}`
                });
            }
        }
        async install(skillPath) {
            throw new Error('not used by SkillLoader');
        }
        async uninstall(skillName) {
            this.entries.delete(skillName);
        }
        async list() {
            this.listCallCount++;
            return Array.from(this.entries.values());
        }
        async get(skillName) {
            this.getCallCount++;
            return this.entries.get(skillName) ?? null;
        }
        async isInstalled(skillName) {
            return this.entries.has(skillName);
        }
        async refresh(skillsSourceDir) {
            throw new Error('not used by SkillLoader');
        }
        clearCache() {
            // no-op
        }
    }
    /** Implements the real ISkillParser and counts parse calls. */
    class CountingSkillParser {
        constructor() {
            this.parseCallCount = 0;
        }
        async parseSkillFile(filePath) {
            this.parseCallCount++;
            // Derive the skill name from .../<skill-name>/SKILL.md
            const segments = filePath.split(/[\\/]/).filter(s => s.length > 0);
            const name = segments[segments.length - 2] ?? 'unknown';
            return {
                metadata: {
                    name,
                    description: `Description for ${name}`,
                    version: '2.0.0',
                    tags: ['test']
                },
                body: `Body content for ${name}`,
                resources: [
                    { type: 'reference', path: `${filePath}/../references/guide.md`, name: 'guide.md' }
                ],
                fullPath: filePath
            };
        }
        async validateSkillFormat(filePath) {
            return true;
        }
    }
    function createMockFileService() {
        return {
            readFile: async (uri) => {
                return { value: VSBuffer.fromString('Reference file content') };
            }
        };
    }
    setup(() => {
        disposables = new DisposableStore();
        registry = new CountingSkillsRegistry(['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5', 'skill-6']);
        parser = new CountingSkillParser();
        loader = disposables.add(new SkillLoader(registry, parser, createMockFileService(), new NullLogService()));
    });
    teardown(() => {
        disposables.dispose();
    });
    suite('service contract', () => {
        test('SkillLoader should satisfy ISkillLoader', () => {
            // Compile-time guard: this assignment fails to build if the class
            // and the interface drift apart.
            const asService = loader;
            assert.ok(asService);
        });
        test('ISkillLoader decorator should be exported for DI registration', () => {
            // Guards against the loader silently becoming orphaned again: the
            // service identifier must stay importable by a future call site.
            assert.ok(ISkillLoader, 'ISkillLoader service decorator should be defined');
        });
    });
    suite('loadMetadataOnly', () => {
        test('should build a summary from the parser metadata and registry entry', async () => {
            const summary = await loader.loadMetadataOnly('skill-1');
            assert.strictEqual(summary.name, 'skill-1');
            assert.strictEqual(summary.description, 'Description for skill-1');
            assert.strictEqual(summary.version, '2.0.0');
            assert.strictEqual(summary.source, 'local');
            assert.strictEqual(summary.path, '/home/user/.ainative/skills/skill-1');
            assert.ok(summary.tags?.includes('test'));
        });
        test('should parse only once across repeated calls', async () => {
            await loader.loadMetadataOnly('skill-1');
            assert.strictEqual(parser.parseCallCount, 1);
            await loader.loadMetadataOnly('skill-1');
            assert.strictEqual(parser.parseCallCount, 1, 'Second call should hit the metadata cache');
            assert.strictEqual(registry.getCallCount, 1, 'Second call should not re-resolve the registry');
        });
        test('should throw when the skill is not installed', async () => {
            await assert.rejects(() => loader.loadMetadataOnly('nonexistent-skill'), (error) => {
                assert.ok(error.message.includes('Skill not found'));
                return true;
            });
        });
    });
    suite('loadFullSkill', () => {
        test('should return body, resources and fullPath from the parser', async () => {
            const result = await loader.loadFullSkill('skill-1');
            assert.strictEqual(result.metadata.name, 'skill-1');
            assert.strictEqual(result.body, 'Body content for skill-1');
            assert.strictEqual(result.resources.length, 1);
            assert.strictEqual(result.resources[0].type, 'reference');
            assert.ok(result.fullPath.endsWith('SKILL.md'));
        });
        test('should parse only once across repeated calls', async () => {
            await loader.loadFullSkill('skill-1');
            assert.strictEqual(parser.parseCallCount, 1);
            await loader.loadFullSkill('skill-1');
            assert.strictEqual(parser.parseCallCount, 1, 'Second call should hit the LRU cache');
        });
        test('should evict the least recently used skill beyond the cache bound', async () => {
            // Cache bound is 5; load 6 distinct skills
            for (const name of ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5', 'skill-6']) {
                await loader.loadFullSkill(name);
            }
            assert.ok(loader.getCacheStats().fullSkillCount <= 5, 'Cache should not exceed max size');
            // skill-1 was evicted, so it must be re-parsed
            const parsesBefore = parser.parseCallCount;
            await loader.loadFullSkill('skill-1');
            assert.strictEqual(parser.parseCallCount, parsesBefore + 1, 'Evicted skill should be re-parsed');
            // skill-6 is still resident, so it must not be re-parsed
            const parsesAfter = parser.parseCallCount;
            await loader.loadFullSkill('skill-6');
            assert.strictEqual(parser.parseCallCount, parsesAfter, 'Resident skill should stay cached');
        });
        test('should throw when the skill is not installed', async () => {
            await assert.rejects(() => loader.loadFullSkill('missing-skill'), (error) => {
                assert.ok(error.message.includes('Skill not found'));
                return true;
            });
        });
    });
    suite('getAllMetadata', () => {
        test('should enumerate installed skills via registry.list()', async () => {
            const all = await loader.getAllMetadata();
            assert.strictEqual(registry.listCallCount, 1);
            assert.strictEqual(all.length, 6);
            assert.ok(all.map(s => s.name).includes('skill-3'));
        });
    });
    suite('loadReference', () => {
        test('should read reference files relative to the registry path', async () => {
            const content = await loader.loadReference('skill-1', 'references/example.md');
            assert.strictEqual(content, 'Reference file content');
        });
        test('should not cache reference files', async () => {
            await loader.loadReference('skill-1', 'references/nocache.md');
            await loader.loadReference('skill-1', 'references/nocache.md');
            const stats = loader.getCacheStats();
            assert.strictEqual(stats.metadataCount, 0, 'References must not populate the metadata cache');
            assert.strictEqual(stats.fullSkillCount, 0, 'References must not populate the full-skill cache');
        });
        test('should reject a reference path that escapes the skill directory', async () => {
            // referencePath can come from a model response, so traversal out of
            // the skill's own references/ directory must be refused.
            await assert.rejects(() => loader.loadReference('skill-1', '../../../../../../etc/passwd'), (error) => {
                assert.ok(error.message.includes('Invalid reference path'));
                return true;
            });
        });
        test('should reject traversal hidden behind a references/ prefix', async () => {
            await assert.rejects(() => loader.loadReference('skill-1', 'references/../../skill-2/SKILL.md'), (error) => {
                assert.ok(error.message.includes('Invalid reference path'));
                return true;
            });
        });
        test('should allow a nested path inside references/', async () => {
            const content = await loader.loadReference('skill-1', 'nested/deep/guide.md');
            assert.strictEqual(content, 'Reference file content');
        });
    });
    suite('getCacheStats', () => {
        test('should report hits and misses', async () => {
            // miss
            await loader.loadMetadataOnly('skill-1');
            assert.strictEqual(loader.getCacheStats().hitRatio, 0, 'A single miss means a zero hit ratio');
            // hit
            await loader.loadMetadataOnly('skill-1');
            assert.strictEqual(loader.getCacheStats().hitRatio, 0.5, 'One hit and one miss means a 0.5 hit ratio');
        });
        test('should track metadata cache size', async () => {
            await loader.loadMetadataOnly('skill-1');
            await loader.loadMetadataOnly('skill-2');
            await loader.loadMetadataOnly('skill-3');
            assert.strictEqual(loader.getCacheStats().metadataCount, 3);
        });
    });
    suite('clearCache', () => {
        test('should drop every cache and reset counters', async () => {
            await loader.loadMetadataOnly('skill-1');
            await loader.loadFullSkill('skill-2');
            loader.clearCache();
            const stats = loader.getCacheStats();
            assert.strictEqual(stats.metadataCount, 0);
            assert.strictEqual(stats.fullSkillCount, 0);
            assert.strictEqual(stats.hitRatio, 0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMb2FkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxzL3NraWxsTG9hZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUsxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuRTs7Ozs7Ozs7R0FRRztBQUNILEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBRXpCLElBQUksTUFBbUIsQ0FBQztJQUN4QixJQUFJLFFBQWdDLENBQUM7SUFDckMsSUFBSSxNQUEyQixDQUFDO0lBQ2hDLElBQUksV0FBNEIsQ0FBQztJQUVqQyx1RUFBdUU7SUFDdkUsTUFBTSxzQkFBc0I7UUFPM0IsWUFBWSxVQUFvQjtZQUpmLFlBQU8sR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNqRSxpQkFBWSxHQUFHLENBQUMsQ0FBQztZQUNqQixrQkFBYSxHQUFHLENBQUMsQ0FBQztZQUdqQixLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ3RCLElBQUk7b0JBQ0osT0FBTyxFQUFFLE9BQU87b0JBQ2hC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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as path from 'path';
import { SkillLoader } from '../../common/skills/skillLoader.js';
import { SkillParser } from '../../common/skills/skillParser.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../../../../base/common/network.js';
/**
 * Integration tests for SkillLoader against the REAL ISkillParser implementation
 * (SkillParser) and the REAL ISkillsRegistry interface, reading real fixtures
 * from disk. No placeholder/duplicate interfaces are involved.
 *
 * Following BDD style (suite/test) and TDD principles.
 */
suite('SkillLoader Tests', () => {
    let loader;
    let disposables;
    let fileService;
    let registry;
    const fixturesPath = path.join(__dirname, 'fixtures', 'skills');
    /**
     * A fixture-backed registry that implements the REAL ISkillsRegistry
     * interface from skillRegistryTypes.ts. It stands in for the file-backed
     * SkillsRegistry (which persists to ~/.ainative/skills/registry.json) so
     * tests never touch the developer's home directory, while still exercising
     * the exact method signatures SkillLoader depends on.
     */
    class FixtureSkillsRegistry {
        constructor(skillNames) {
            this.entries = new Map();
            /** Counts get() calls so cache-hit behaviour can be asserted */
            this.getCallCount = 0;
            for (const name of skillNames) {
                this.entries.set(name, {
                    name,
                    version: '1.0.0',
                    installedAt: Date.now(),
                    source: 'local',
                    path: path.join(fixturesPath, name)
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
            // no-op: fixtures are static
        }
    }
    setup(() => {
        disposables = new DisposableStore();
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        // Use DiskFileSystemProvider for file:// scheme to read test fixtures
        const diskProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskProvider);
        // REAL parser implementation
        const parser = disposables.add(new SkillParser(fileService));
        registry = new FixtureSkillsRegistry([
            'minimal-skill',
            'comprehensive-skill',
            'skill-with-resources',
            'unicode-skill'
        ]);
        loader = disposables.add(new SkillLoader(registry, parser, fileService, logService));
    });
    teardown(() => {
        disposables.dispose();
    });
    suite('Metadata Loading', () => {
        test('should load a summary derived from the real parser and registry entry', async () => {
            const summary = await loader.loadMetadataOnly('minimal-skill');
            assert.strictEqual(summary.name, 'minimal-skill');
            assert.strictEqual(summary.description, 'A minimal skill with only required fields');
            // source/path come from the registry entry, not the frontmatter
            assert.strictEqual(summary.source, 'local');
            assert.ok(summary.path.endsWith(path.join('fixtures', 'skills', 'minimal-skill')));
        });
        test('should prefer the frontmatter version over the registry version', async () => {
            const summary = await loader.loadMetadataOnly('comprehensive-skill');
            // comprehensive-skill declares version 2.1.0 in frontmatter;
            // the fixture registry entry says 1.0.0
            assert.strictEqual(summary.version, '2.1.0');
        });
        test('should fall back to the registry version when frontmatter omits it', async () => {
            const summary = await loader.loadMetadataOnly('minimal-skill');
            // minimal-skill has no version in frontmatter
            assert.strictEqual(summary.version, '1.0.0');
        });
        test('should surface tags parsed from frontmatter', async () => {
            const summary = await loader.loadMetadataOnly('comprehensive-skill');
            assert.ok(Array.isArray(summary.tags));
            assert.ok(summary.tags?.includes('testing'));
        });
        test('should not re-query the registry on a cache hit', async () => {
            await loader.loadMetadataOnly('minimal-skill');
            const callsAfterFirstLoad = registry.getCallCount;
            await loader.loadMetadataOnly('minimal-skill');
            assert.strictEqual(registry.getCallCount, callsAfterFirstLoad, 'Second load should be served from cache');
            const stats = loader.getCacheStats();
            assert.ok(stats.hitRatio > 0, 'Should have cache hits');
        });
        test('should get all metadata for installed skills via registry.list()', async () => {
            const allMetadata = await loader.getAllMetadata();
            assert.ok(Array.isArray(allMetadata));
            assert.strictEqual(allMetadata.length, 4);
            const skillNames = allMetadata.map(s => s.name);
            assert.ok(skillNames.includes('minimal-skill'));
            assert.ok(skillNames.includes('comprehensive-skill'));
            assert.ok(skillNames.includes('skill-with-resources'));
        });
        test('should skip unparseable skills rather than failing the whole listing', async () => {
            // 'invalid-no-frontmatter' exists as a fixture but has no YAML frontmatter,
            // so the real parser throws SkillParseError for it.
            const mixedRegistry = new FixtureSkillsRegistry(['minimal-skill', 'invalid-no-frontmatter']);
            const parser = disposables.add(new SkillParser(fileService));
            const mixedLoader = disposables.add(new SkillLoader(mixedRegistry, parser, fileService, new NullLogService()));
            const allMetadata = await mixedLoader.getAllMetadata();
            assert.strictEqual(allMetadata.length, 1);
            assert.strictEqual(allMetadata[0].name, 'minimal-skill');
        });
    });
    suite('Full Skill Loading', () => {
        test('should load full skill with metadata, body and resources', async () => {
            const skill = await loader.loadFullSkill('comprehensive-skill');
            assert.ok(skill.metadata);
            assert.strictEqual(skill.metadata.name, 'comprehensive-skill');
            assert.ok(skill.body.length > 0);
            assert.ok(skill.body.includes('Comprehensive Skill'));
            assert.ok(Array.isArray(skill.resources));
            assert.ok(skill.fullPath.endsWith('SKILL.md'));
        });
        test('should discover bundled resources via the real parser', async () => {
            const skill = await loader.loadFullSkill('comprehensive-skill');
            const types = skill.resources.map(r => r.type);
            assert.ok(types.includes('reference'), 'Should discover references/');
            assert.ok(types.includes('script'), 'Should discover scripts/');
            assert.ok(types.includes('asset'), 'Should discover assets/');
            const names = skill.resources.map(r => r.name);
            assert.ok(names.includes('api-docs.md'));
        });
        test('should not re-query the registry on a full-skill cache hit', async () => {
            await loader.loadFullSkill('minimal-skill');
            const callsAfterFirstLoad = registry.getCallCount;
            const skill = await loader.loadFullSkill('minimal-skill');
            assert.strictEqual(registry.getCallCount, callsAfterFirstLoad, 'Second load should be served from cache');
            assert.strictEqual(skill.metadata.name, 'minimal-skill');
            const stats = loader.getCacheStats();
            assert.ok(stats.fullSkillCount > 0, 'Should have cached full skills');
        });
        test('should warm the metadata cache from a full-skill parse', async () => {
            await loader.loadFullSkill('minimal-skill');
            const statsAfterFull = loader.getCacheStats();
            assert.strictEqual(statsAfterFull.metadataCount, 1, 'Full load should also populate the metadata cache');
            const callsBefore = registry.getCallCount;
            await loader.loadMetadataOnly('minimal-skill');
            assert.strictEqual(registry.getCallCount, callsBefore, 'Metadata should already be cached');
        });
        test('should not exceed the LRU cache bound of 5 full skills', async () => {
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
        test('should accept a reference path already prefixed with references/', async () => {
            const content = await loader.loadReference('comprehensive-skill', 'references/api-docs.md');
            assert.ok(content.includes('API Documentation'));
        });
        test('should not cache reference files', async () => {
            await loader.loadReference('comprehensive-skill', 'api-docs.md');
            const statsBefore = loader.getCacheStats();
            await loader.loadReference('comprehensive-skill', 'api-docs.md');
            const statsAfter = loader.getCacheStats();
            // References are never cached, so neither cache grows
            assert.strictEqual(statsAfter.metadataCount, statsBefore.metadataCount);
            assert.strictEqual(statsAfter.fullSkillCount, statsBefore.fullSkillCount);
        });
        test('should throw error for non-existent reference', async () => {
            await assert.rejects(() => loader.loadReference('comprehensive-skill', 'non-existent.md'), (error) => {
                assert.ok(error.message.includes('Reference file not found'));
                return true;
            });
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
            await loader.loadMetadataOnly('comprehensive-skill');
            const stats1 = loader.getCacheStats();
            assert.strictEqual(stats1.metadataCount, 1);
            assert.strictEqual(stats1.fullSkillCount, 0);
            await loader.loadFullSkill('comprehensive-skill');
            const stats2 = loader.getCacheStats();
            assert.strictEqual(stats2.metadataCount, 1);
            assert.strictEqual(stats2.fullSkillCount, 1);
        });
        test('should reload after cache invalidation', async () => {
            await loader.loadFullSkill('minimal-skill');
            assert.strictEqual(loader.getCacheStats().fullSkillCount, 1);
            // Clear cache (simulating a skill update)
            loader.clearCache();
            assert.strictEqual(loader.getCacheStats().fullSkillCount, 0);
            const skill = await loader.loadFullSkill('minimal-skill');
            assert.strictEqual(skill.metadata.name, 'minimal-skill');
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
        test('should not reject when an enabled skill is not installed', async () => {
            loader.clearCache();
            // 'ghost-skill' is enabled in config but absent from the registry
            await loader.preloadMetadata(['minimal-skill', 'ghost-skill']);
            const stats = loader.getCacheStats();
            assert.strictEqual(stats.metadataCount, 1, 'Only the installed skill should be cached');
        });
    });
    suite('Error Handling', () => {
        test('should throw error for non-existent skill metadata', async () => {
            await assert.rejects(() => loader.loadMetadataOnly('non-existent-skill'), (error) => {
                assert.ok(error.message.includes('Skill not found'));
                return true;
            });
        });
        test('should throw error when loading full skill for non-existent skill', async () => {
            await assert.rejects(() => loader.loadFullSkill('non-existent-skill'), (error) => {
                assert.ok(error.message.includes('Skill not found'));
                return true;
            });
        });
        test('should throw error when loading a reference for a non-existent skill', async () => {
            await assert.rejects(() => loader.loadReference('non-existent-skill', 'api-docs.md'), (error) => {
                assert.ok(error.message.includes('Skill not found'));
                return true;
            });
        });
        test('should propagate parse errors for malformed skills', async () => {
            const badRegistry = new FixtureSkillsRegistry(['invalid-no-frontmatter']);
            const parser = disposables.add(new SkillParser(fileService));
            const badLoader = disposables.add(new SkillLoader(badRegistry, parser, fileService, new NullLogService()));
            await assert.rejects(() => badLoader.loadFullSkill('invalid-no-frontmatter'));
        });
    });
    suite('Progressive Disclosure', () => {
        test('should keep metadata far smaller than full bodies', async () => {
            const summary = await loader.loadMetadataOnly('comprehensive-skill');
            const full = await loader.loadFullSkill('comprehensive-skill');
            const summarySize = summary.name.length + summary.description.length;
            assert.ok(summarySize < full.body.length, `Summary (${summarySize} chars) should be smaller than body (${full.body.length} chars)`);
        });
        test('should keep estimated memory usage bounded', async () => {
            await loader.loadMetadataOnly('minimal-skill');
            await loader.loadMetadataOnly('comprehensive-skill');
            await loader.loadFullSkill('minimal-skill');
            await loader.loadFullSkill('comprehensive-skill');
            const stats = loader.getCacheStats();
            assert.ok(stats.estimatedMemoryUsage > 0);
            assert.ok(stats.estimatedMemoryUsage < 60000, `Total memory usage ${stats.estimatedMemoryUsage} bytes, should be < 60KB`);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMb2FkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxMb2FkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRTs7Ozs7O0dBTUc7QUFDSCxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLElBQUksTUFBbUIsQ0FBQztJQUN4QixJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxXQUF3QixDQUFDO0lBQzdCLElBQUksUUFBK0IsQ0FBQztJQUNwQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFaEU7Ozs7OztPQU1HO0lBQ0gsTUFBTSxxQkFBcUI7UUFRMUIsWUFBWSxVQUFvQjtZQUxmLFlBQU8sR0FBK0IsSUFBSSxH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
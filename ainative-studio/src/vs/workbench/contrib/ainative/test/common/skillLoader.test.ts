/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'path';
import { SkillLoader } from '../../common/skills/skillLoader.js';
import { SkillParser } from '../../common/skills/skillParser.js';
import { ISkillsRegistry, RegistryEntry, SkillRefreshResult } from '../../common/skills/skillRegistryTypes.js';
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
	let loader: SkillLoader;
	let disposables: DisposableStore;
	let fileService: FileService;
	let registry: FixtureSkillsRegistry;
	const fixturesPath = path.join(__dirname, 'fixtures', 'skills');

	/**
	 * A fixture-backed registry that implements the REAL ISkillsRegistry
	 * interface from skillRegistryTypes.ts. It stands in for the file-backed
	 * SkillsRegistry (which persists to ~/.ainative/skills/registry.json) so
	 * tests never touch the developer's home directory, while still exercising
	 * the exact method signatures SkillLoader depends on.
	 */
	class FixtureSkillsRegistry implements ISkillsRegistry {
		declare readonly _serviceBrand: undefined;

		private readonly entries: Map<string, RegistryEntry> = new Map();

		/** Counts get() calls so cache-hit behaviour can be asserted */
		getCallCount = 0;

		constructor(skillNames: string[]) {
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

		async install(skillPath: string): Promise<void> {
			throw new Error('not used by SkillLoader');
		}

		async uninstall(skillName: string): Promise<void> {
			this.entries.delete(skillName);
		}

		async list(): Promise<RegistryEntry[]> {
			return Array.from(this.entries.values());
		}

		async get(skillName: string): Promise<RegistryEntry | null> {
			this.getCallCount++;
			return this.entries.get(skillName) ?? null;
		}

		async isInstalled(skillName: string): Promise<boolean> {
			return this.entries.has(skillName);
		}

		async refresh(skillsSourceDir: string): Promise<SkillRefreshResult> {
			throw new Error('not used by SkillLoader');
		}

		clearCache(): void {
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
			const mixedLoader = disposables.add(
				new SkillLoader(mixedRegistry, parser, fileService, new NullLogService())
			);

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
			await assert.rejects(
				() => loader.loadReference('comprehensive-skill', 'non-existent.md'),
				(error: Error) => {
					assert.ok(error.message.includes('Reference file not found'));
					return true;
				}
			);
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
			await assert.rejects(
				() => loader.loadMetadataOnly('non-existent-skill'),
				(error: Error) => {
					assert.ok(error.message.includes('Skill not found'));
					return true;
				}
			);
		});

		test('should throw error when loading full skill for non-existent skill', async () => {
			await assert.rejects(
				() => loader.loadFullSkill('non-existent-skill'),
				(error: Error) => {
					assert.ok(error.message.includes('Skill not found'));
					return true;
				}
			);
		});

		test('should throw error when loading a reference for a non-existent skill', async () => {
			await assert.rejects(
				() => loader.loadReference('non-existent-skill', 'api-docs.md'),
				(error: Error) => {
					assert.ok(error.message.includes('Skill not found'));
					return true;
				}
			);
		});

		test('should propagate parse errors for malformed skills', async () => {
			const badRegistry = new FixtureSkillsRegistry(['invalid-no-frontmatter']);
			const parser = disposables.add(new SkillParser(fileService));
			const badLoader = disposables.add(
				new SkillLoader(badRegistry, parser, fileService, new NullLogService())
			);

			await assert.rejects(() => badLoader.loadFullSkill('invalid-no-frontmatter'));
		});
	});

	suite('Progressive Disclosure', () => {
		test('should keep metadata far smaller than full bodies', async () => {
			const summary = await loader.loadMetadataOnly('comprehensive-skill');
			const full = await loader.loadFullSkill('comprehensive-skill');

			const summarySize = summary.name.length + summary.description.length;
			assert.ok(
				summarySize < full.body.length,
				`Summary (${summarySize} chars) should be smaller than body (${full.body.length} chars)`
			);
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

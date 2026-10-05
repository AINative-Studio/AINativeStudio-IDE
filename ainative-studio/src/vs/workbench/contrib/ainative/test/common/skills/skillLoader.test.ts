/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SkillLoader } from '../../../common/skills/skillLoader.js';
import { ISkillLoader } from '../../../common/skills/skillLoaderTypes.js';
import { ISkillParser } from '../../../common/skills/skillParserTypes.js';
import { ISkillsRegistry, RegistryEntry, SkillRefreshResult } from '../../../common/skills/skillRegistryTypes.js';
import { Skill } from '../../../common/skills/skillTypes.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../base/common/uri.js';
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

	let loader: SkillLoader;
	let registry: CountingSkillsRegistry;
	let parser: CountingSkillParser;
	let disposables: DisposableStore;

	/** Implements the real ISkillsRegistry and counts resolution calls. */
	class CountingSkillsRegistry implements ISkillsRegistry {
		declare readonly _serviceBrand: undefined;

		private readonly entries: Map<string, RegistryEntry> = new Map();
		getCallCount = 0;
		listCallCount = 0;

		constructor(skillNames: string[]) {
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

		async install(skillPath: string): Promise<void> {
			throw new Error('not used by SkillLoader');
		}

		async uninstall(skillName: string): Promise<void> {
			this.entries.delete(skillName);
		}

		async list(): Promise<RegistryEntry[]> {
			this.listCallCount++;
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
			// no-op
		}
	}

	/** Implements the real ISkillParser and counts parse calls. */
	class CountingSkillParser implements ISkillParser {
		declare readonly _serviceBrand: undefined;

		parseCallCount = 0;

		async parseSkillFile(filePath: string): Promise<Skill> {
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

		async validateSkillFormat(filePath: string): Promise<boolean> {
			return true;
		}
	}

	function createMockFileService(): IFileService {
		return {
			readFile: async (uri: URI) => {
				return { value: VSBuffer.fromString('Reference file content') } as any;
			}
		} as any;
	}

	setup(() => {
		disposables = new DisposableStore();
		registry = new CountingSkillsRegistry(['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5', 'skill-6']);
		parser = new CountingSkillParser();

		loader = disposables.add(
			new SkillLoader(registry, parser, createMockFileService(), new NullLogService())
		);
	});

	teardown(() => {
		disposables.dispose();
	});

	suite('service contract', () => {

		test('SkillLoader should satisfy ISkillLoader', () => {
			// Compile-time guard: this assignment fails to build if the class
			// and the interface drift apart.
			const asService: ISkillLoader = loader;
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
			await assert.rejects(
				() => loader.loadMetadataOnly('nonexistent-skill'),
				(error: Error) => {
					assert.ok(error.message.includes('Skill not found'));
					return true;
				}
			);
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
			await assert.rejects(
				() => loader.loadFullSkill('missing-skill'),
				(error: Error) => {
					assert.ok(error.message.includes('Skill not found'));
					return true;
				}
			);
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
			await assert.rejects(
				() => loader.loadReference('skill-1', '../../../../../../etc/passwd'),
				(error: Error) => {
					assert.ok(error.message.includes('Invalid reference path'));
					return true;
				}
			);
		});

		test('should reject traversal hidden behind a references/ prefix', async () => {
			await assert.rejects(
				() => loader.loadReference('skill-1', 'references/../../skill-2/SKILL.md'),
				(error: Error) => {
					assert.ok(error.message.includes('Invalid reference path'));
					return true;
				}
			);
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

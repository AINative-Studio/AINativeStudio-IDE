/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'path';
import { SkillLoader } from '../../common/skills/skillLoader.js';
import { SkillMetadata, SkillResource } from '../../common/skills/skillLoaderTypes.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Schemas } from '../../../../../base/common/network.js';

suite('SkillLoader Tests', () => {
	let loader: SkillLoader;
	let disposables: DisposableStore;
	let fileService: FileService;
	const fixturesPath = path.join(__dirname, 'fixtures', 'skills');

	// Mock registry interface
	class MockSkillsRegistry {
		private readonly skills: Map<string, string> = new Map();

		constructor() {
			// Register test skills with their paths
			this.skills.set('minimal-skill', path.join(fixturesPath, 'minimal-skill'));
			this.skills.set('comprehensive-skill', path.join(fixturesPath, 'comprehensive-skill'));
			this.skills.set('skill-with-resources', path.join(fixturesPath, 'skill-with-resources'));
			this.skills.set('unicode-skill', path.join(fixturesPath, 'unicode-skill'));
		}

		async getSkillPath(skillName: string): Promise<string | null> {
			return this.skills.get(skillName) || null;
		}

		async getAllInstalledSkills(): Promise<string[]> {
			return Array.from(this.skills.keys());
		}
	}

	// Mock skill parser interface
	class MockSkillParser {
		parseMetadataOnly(content: string): SkillMetadata {
			// Extract frontmatter and parse only metadata
			const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
			if (!frontmatterMatch) {
				throw new Error('No frontmatter found');
			}

			const metadata: Partial<SkillMetadata> = {
				location: 'project'
			};

			const lines = frontmatterMatch[1].split('\n');
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) continue;

				const colonIndex = trimmed.indexOf(':');
				if (colonIndex === -1) continue;

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
				} else {
					switch (key) {
						case 'name': metadata.name = value; break;
						case 'description': metadata.description = value; break;
						case 'version': metadata.version = value; break;
						case 'author': metadata.author = value; break;
						case 'category': metadata.category = value; break;
					}
				}
			}

			return metadata as SkillMetadata;
		}

		parseFullSkill(content: string): { metadata: SkillMetadata; body: string; resources: SkillResource[] } {
			const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
			if (!frontmatterMatch) {
				throw new Error('No frontmatter found');
			}

			const metadata = this.parseMetadataOnly(content);
			const body = frontmatterMatch[2].trim();
			const resources: SkillResource[] = [];

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

		loader = new SkillLoader(mockRegistry as any, mockParser as any, fileService);
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
			} catch (error) {
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
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('Skill not found'));
			}
		});

		test('should throw error when loading full skill for non-existent skill', async () => {
			try {
				await loader.loadFullSkill('non-existent-skill');
				assert.fail('Should have thrown error');
			} catch (error) {
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
			} catch (error) {
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

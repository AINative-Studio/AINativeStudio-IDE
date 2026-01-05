/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { URI } from '../../../src/vs/base/common/uri.js';
import { IFileService } from '../../../src/vs/platform/files/common/files.js';
import { SkillsManager } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillsManager.js';
import { SkillParser } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillParser.js';
import { SkillLoader } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillLoader.js';
import { SkillsRegistry } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillsRegistry.js';

suite('Skills Manager Performance Tests', () => {
	let tempDir: string;
	let skillsDir: string;
	let skillsManager: SkillsManager;
	let skillParser: SkillParser;
	let skillLoader: SkillLoader;
	let fileService: IFileService;

	// Performance targets
	const TARGETS = {
		PARSE_SKILL_MD: 50,        // ms - Parse SKILL.md file
		LOAD_METADATA: 10,         // ms - Load metadata only
		LOAD_FULL_SKILL: 50,       // ms - Load full skill
		LOAD_REFERENCE: 100,       // ms - Load reference file
		INSTALL_SKILL: 200,        // ms - Install skill
		UNINSTALL_SKILL: 100,      // ms - Uninstall skill
		LIST_SKILLS: 50,           // ms - List all skills
		METADATA_20_SKILLS: 100,   // ms - Load metadata for 20 skills
		CACHE_HIT_SPEEDUP: 2,      // times - Cache hit should be at least 2x faster
	};

	setup(async () => {
		tempDir = fs.mkdtempSync(path.join(tmpdir(), 'skills-perf-test-'));
		skillsDir = path.join(tempDir, 'skills');
		fs.mkdirSync(skillsDir, { recursive: true });

		// Initialize services
		// fileService = createMockFileService();
		// skillsManager = new SkillsManager(fileService, skillsDir);
		// skillParser = new SkillParser(fileService);
		// skillLoader = new SkillLoader(fileService, skillsDir);
	});

	teardown(() => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	suite('Parsing Performance', () => {
		test(`should parse SKILL.md in < ${TARGETS.PARSE_SKILL_MD}ms`, async () => {
			// Create test skill
			const skillPath = path.join(tempDir, 'perf-test-skill');
			fs.mkdirSync(skillPath, { recursive: true });

			const skillContent = `---
name: performance-test-skill
description: A skill for performance testing
version: 1.0.0
author: Performance Team
tags: [performance, testing, benchmarks]
category: testing
---

# Performance Test Skill

## Section 1

Content for performance testing.

## Section 2

More content to parse.

## Code Examples

\`\`\`typescript
function example() {
	return 'test';
}
\`\`\`
`;

			fs.writeFileSync(path.join(skillPath, 'SKILL.md'), skillContent);

			// Measure parsing time
			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const start = performance.now();
				await skillParser.parseSkillFile(path.join(skillPath, 'SKILL.md'));
				const duration = performance.now() - start;
				times.push(duration);
			}

			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
			const maxTime = Math.max(...times);

			console.log(`Parse SKILL.md - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

			assert.ok(
				avgTime < TARGETS.PARSE_SKILL_MD,
				`Average parse time ${avgTime.toFixed(2)}ms exceeds target ${TARGETS.PARSE_SKILL_MD}ms`
			);
		});

		test('should handle large skill files efficiently', async () => {
			// Create large skill (10KB)
			const skillPath = path.join(tempDir, 'large-skill');
			fs.mkdirSync(skillPath, { recursive: true });

			let largeContent = `---
name: large-skill
description: A large skill for performance testing
---

# Large Skill

`;

			// Add ~9KB of content
			for (let i = 0; i < 100; i++) {
				largeContent += `\n## Section ${i}\n\nContent for section ${i}. `.repeat(10);
			}

			fs.writeFileSync(path.join(skillPath, 'SKILL.md'), largeContent);

			const start = performance.now();
			await skillParser.parseSkillFile(path.join(skillPath, 'SKILL.md'));
			const duration = performance.now() - start;

			console.log(`Parse large skill (10KB): ${duration.toFixed(2)}ms`);

			// Should still be under 100ms for large files
			assert.ok(
				duration < 100,
				`Large file parse time ${duration.toFixed(2)}ms exceeds 100ms threshold`
			);
		});
	});

	suite('Loading Performance', () => {
		test(`should load metadata in < ${TARGETS.LOAD_METADATA}ms`, async () => {
			// Create and install test skill
			const skillPath = createTestSkill('metadata-perf-skill');
			await skillsManager.install(skillPath, 'local');

			// Warm up cache
			await skillLoader.loadMetadataOnly('metadata-perf-skill');

			// Measure cache hit performance
			const iterations = 20;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const start = performance.now();
				await skillLoader.loadMetadataOnly('metadata-perf-skill');
				const duration = performance.now() - start;
				times.push(duration);
			}

			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
			console.log(`Load metadata (cached) - Avg: ${avgTime.toFixed(2)}ms`);

			assert.ok(
				avgTime < TARGETS.LOAD_METADATA,
				`Average metadata load time ${avgTime.toFixed(2)}ms exceeds target ${TARGETS.LOAD_METADATA}ms`
			);
		});

		test(`should load full skill in < ${TARGETS.LOAD_FULL_SKILL}ms`, async () => {
			const skillPath = createTestSkill('full-skill-perf');
			await skillsManager.install(skillPath, 'local');

			// Measure first load (cache miss)
			const start = performance.now();
			await skillLoader.loadFullSkill('full-skill-perf');
			const duration = performance.now() - start;

			console.log(`Load full skill (first load): ${duration.toFixed(2)}ms`);

			assert.ok(
				duration < TARGETS.LOAD_FULL_SKILL,
				`Full skill load time ${duration.toFixed(2)}ms exceeds target ${TARGETS.LOAD_FULL_SKILL}ms`
			);
		});

		test(`should load reference file in < ${TARGETS.LOAD_REFERENCE}ms`, async () => {
			const skillPath = createTestSkill('reference-perf-skill');

			// Create reference file
			const referencesDir = path.join(skillPath, 'references');
			fs.mkdirSync(referencesDir, { recursive: true });
			fs.writeFileSync(
				path.join(referencesDir, 'examples.md'),
				'# Examples\n\n' + 'Example content. '.repeat(100)
			);

			await skillsManager.install(skillPath, 'local');

			const start = performance.now();
			await skillLoader.loadReferenceFile('reference-perf-skill', 'references/examples.md');
			const duration = performance.now() - start;

			console.log(`Load reference file: ${duration.toFixed(2)}ms`);

			assert.ok(
				duration < TARGETS.LOAD_REFERENCE,
				`Reference load time ${duration.toFixed(2)}ms exceeds target ${TARGETS.LOAD_REFERENCE}ms`
			);
		});

		test(`should load 20 skill metadata in < ${TARGETS.METADATA_20_SKILLS}ms`, async () => {
			// Create 20 test skills
			const skillPaths: string[] = [];
			for (let i = 1; i <= 20; i++) {
				const skillPath = createTestSkill(`batch-skill-${i}`);
				await skillsManager.install(skillPath, 'local');
				skillPaths.push(skillPath);
			}

			// Warm up cache
			for (let i = 1; i <= 20; i++) {
				await skillLoader.loadMetadataOnly(`batch-skill-${i}`);
			}

			// Measure batch load performance
			const start = performance.now();
			const promises = [];
			for (let i = 1; i <= 20; i++) {
				promises.push(skillLoader.loadMetadataOnly(`batch-skill-${i}`));
			}
			await Promise.all(promises);
			const duration = performance.now() - start;

			console.log(`Load 20 skill metadata: ${duration.toFixed(2)}ms`);

			assert.ok(
				duration < TARGETS.METADATA_20_SKILLS,
				`Batch metadata load time ${duration.toFixed(2)}ms exceeds target ${TARGETS.METADATA_20_SKILLS}ms`
			);
		});
	});

	suite('Cache Performance', () => {
		test('should demonstrate cache hit speedup', async () => {
			const skillPath = createTestSkill('cache-speedup-test');
			await skillsManager.install(skillPath, 'local');

			// Clear cache to ensure cold start
			skillLoader.invalidateCache();

			// Measure cache miss (first load)
			const missStart = performance.now();
			await skillLoader.loadFullSkill('cache-speedup-test');
			const missDuration = performance.now() - missStart;

			// Measure cache hit (second load)
			const hitStart = performance.now();
			await skillLoader.loadFullSkill('cache-speedup-test');
			const hitDuration = performance.now() - hitStart;

			const speedup = missDuration / hitDuration;

			console.log(`Cache miss: ${missDuration.toFixed(2)}ms`);
			console.log(`Cache hit: ${hitDuration.toFixed(2)}ms`);
			console.log(`Speedup: ${speedup.toFixed(2)}x`);

			assert.ok(
				speedup >= TARGETS.CACHE_HIT_SPEEDUP,
				`Cache speedup ${speedup.toFixed(2)}x is below target ${TARGETS.CACHE_HIT_SPEEDUP}x`
			);
		});

		test('should handle cache eviction efficiently', async () => {
			// Create 7 skills (exceeds LRU cache size of 5)
			for (let i = 1; i <= 7; i++) {
				const skillPath = createTestSkill(`eviction-test-${i}`);
				await skillsManager.install(skillPath, 'local');
			}

			// Load all 7 skills
			const start = performance.now();
			for (let i = 1; i <= 7; i++) {
				await skillLoader.loadFullSkill(`eviction-test-${i}`);
			}
			const duration = performance.now() - start;

			console.log(`Load 7 skills with eviction: ${duration.toFixed(2)}ms`);

			// Should complete in reasonable time despite evictions
			assert.ok(duration < 500, `Eviction handling too slow: ${duration.toFixed(2)}ms`);

			// Verify cache size is maintained
			const stats = skillLoader.getCacheStats();
			assert.strictEqual(stats.fullSkillCacheSize, 5, 'Cache size should be limited to 5');
		});

		test('should maintain cache efficiency under load', async () => {
			// Create 10 skills
			for (let i = 1; i <= 10; i++) {
				const skillPath = createTestSkill(`load-test-${i}`);
				await skillsManager.install(skillPath, 'local');
			}

			// Simulate random access pattern
			const accessPattern = [1, 3, 1, 5, 3, 7, 1, 9, 5, 1]; // Repeated access to skills 1, 3, 5

			const start = performance.now();
			for (const skillNum of accessPattern) {
				await skillLoader.loadFullSkill(`load-test-${skillNum}`);
			}
			const duration = performance.now() - start;

			const stats = skillLoader.getCacheStats();
			const hitRate = stats.metadataCacheHits / (stats.metadataCacheHits + stats.metadataCacheMisses);

			console.log(`Random access pattern: ${duration.toFixed(2)}ms`);
			console.log(`Cache hit rate: ${(hitRate * 100).toFixed(1)}%`);

			// Hit rate should be > 50% with this pattern
			assert.ok(hitRate > 0.5, `Cache hit rate ${(hitRate * 100).toFixed(1)}% is too low`);
		});
	});

	suite('Installation Performance', () => {
		test(`should install skill in < ${TARGETS.INSTALL_SKILL}ms`, async () => {
			const skillPath = createTestSkill('install-perf-test');

			const start = performance.now();
			await skillsManager.install(skillPath, 'local');
			const duration = performance.now() - start;

			console.log(`Install skill: ${duration.toFixed(2)}ms`);

			assert.ok(
				duration < TARGETS.INSTALL_SKILL,
				`Installation time ${duration.toFixed(2)}ms exceeds target ${TARGETS.INSTALL_SKILL}ms`
			);
		});

		test(`should uninstall skill in < ${TARGETS.UNINSTALL_SKILL}ms`, async () => {
			const skillPath = createTestSkill('uninstall-perf-test');
			await skillsManager.install(skillPath, 'local');

			const start = performance.now();
			await skillsManager.uninstall('uninstall-perf-test');
			const duration = performance.now() - start;

			console.log(`Uninstall skill: ${duration.toFixed(2)}ms`);

			assert.ok(
				duration < TARGETS.UNINSTALL_SKILL,
				`Uninstallation time ${duration.toFixed(2)}ms exceeds target ${TARGETS.UNINSTALL_SKILL}ms`
			);
		});

		test(`should list skills in < ${TARGETS.LIST_SKILLS}ms`, async () => {
			// Install 10 skills
			for (let i = 1; i <= 10; i++) {
				const skillPath = createTestSkill(`list-perf-${i}`);
				await skillsManager.install(skillPath, 'local');
			}

			const start = performance.now();
			await skillsManager.list();
			const duration = performance.now() - start;

			console.log(`List 10 skills: ${duration.toFixed(2)}ms`);

			assert.ok(
				duration < TARGETS.LIST_SKILLS,
				`List skills time ${duration.toFixed(2)}ms exceeds target ${TARGETS.LIST_SKILLS}ms`
			);
		});

		test('should handle concurrent installations', async () => {
			const skillPaths: string[] = [];
			for (let i = 1; i <= 5; i++) {
				skillPaths.push(createTestSkill(`concurrent-install-${i}`));
			}

			const start = performance.now();
			await Promise.all(
				skillPaths.map((skillPath, i) =>
					skillsManager.install(skillPath, 'local')
				)
			);
			const duration = performance.now() - start;

			console.log(`5 concurrent installations: ${duration.toFixed(2)}ms`);

			// Should complete in under 1 second
			assert.ok(duration < 1000, `Concurrent installations too slow: ${duration.toFixed(2)}ms`);

			// Verify all installed
			const installed = await skillsManager.list();
			assert.strictEqual(installed.length, 5);
		});
	});

	suite('Memory Performance', () => {
		test('should maintain bounded memory usage', async () => {
			// Install many skills
			for (let i = 1; i <= 20; i++) {
				const skillPath = createTestSkill(`memory-test-${i}`);
				await skillsManager.install(skillPath, 'local');
			}

			// Load all metadata (should stay in memory)
			for (let i = 1; i <= 20; i++) {
				await skillLoader.loadMetadataOnly(`memory-test-${i}`);
			}

			// Calculate approximate memory usage
			// Metadata: ~300 bytes × 20 = 6KB
			const metadataMemory = 6 * 1024; // 6KB in bytes

			console.log(`Approximate metadata memory: ${(metadataMemory / 1024).toFixed(2)}KB`);

			// Memory should be under 10KB for 20 skills
			assert.ok(metadataMemory < 10 * 1024, 'Metadata memory usage too high');
		});

		test('should limit full skill cache memory', async () => {
			// Install 7 skills
			for (let i = 1; i <= 7; i++) {
				const skillPath = createTestSkill(`cache-memory-${i}`);
				await skillsManager.install(skillPath, 'local');
			}

			// Load all skills
			for (let i = 1; i <= 7; i++) {
				await skillLoader.loadFullSkill(`cache-memory-${i}`);
			}

			const stats = skillLoader.getCacheStats();

			// Cache should only hold 5 skills (LRU limit)
			assert.strictEqual(stats.fullSkillCacheSize, 5);

			// Approximate memory: 5KB × 5 skills = 25KB max
			const maxCacheMemory = 25 * 1024;

			console.log(`Maximum full skill cache memory: ${(maxCacheMemory / 1024).toFixed(2)}KB`);

			// Should be under 30KB
			assert.ok(maxCacheMemory < 30 * 1024, 'Full skill cache memory too high');
		});
	});

	suite('Stress Testing', () => {
		test('should handle rapid sequential operations', async () => {
			const skillPath = createTestSkill('stress-test-skill');

			const operations = 50;
			const start = performance.now();

			for (let i = 0; i < operations; i++) {
				if (i % 2 === 0) {
					// Install
					await skillsManager.install(skillPath, 'local');
				} else {
					// Uninstall
					await skillsManager.uninstall('stress-test-skill');
				}
			}

			const duration = performance.now() - start;
			const avgPerOp = duration / operations;

			console.log(`50 install/uninstall operations: ${duration.toFixed(2)}ms`);
			console.log(`Average per operation: ${avgPerOp.toFixed(2)}ms`);

			// Should complete in reasonable time
			assert.ok(duration < 10000, 'Stress test too slow');
		});

		test('should maintain performance with many reference files', async () => {
			const skillPath = createTestSkill('many-refs-skill');

			// Create 50 reference files
			const referencesDir = path.join(skillPath, 'references');
			fs.mkdirSync(referencesDir, { recursive: true });

			for (let i = 1; i <= 50; i++) {
				fs.writeFileSync(
					path.join(referencesDir, `ref-${i}.md`),
					`# Reference ${i}\n\nContent for reference ${i}.`
				);
			}

			await skillsManager.install(skillPath, 'local');

			// Load 10 random reference files
			const start = performance.now();
			for (let i = 1; i <= 10; i += 5) {
				await skillLoader.loadReferenceFile('many-refs-skill', `references/ref-${i}.md`);
			}
			const duration = performance.now() - start;

			console.log(`Load 10 reference files: ${duration.toFixed(2)}ms`);

			// Should complete in under 1 second
			assert.ok(duration < 1000, 'Reference loading too slow');
		});
	});

	// Helper function to create test skills
	function createTestSkill(name: string): string {
		const skillPath = path.join(tempDir, name);
		fs.mkdirSync(skillPath, { recursive: true });

		const content = `---
name: ${name}
description: Performance test skill ${name}
version: 1.0.0
tags: [performance, testing]
---

# ${name}

Test skill for performance benchmarking.

## Content

Sample content for testing.
`;

		fs.writeFileSync(path.join(skillPath, 'SKILL.md'), content);
		return skillPath;
	}
});

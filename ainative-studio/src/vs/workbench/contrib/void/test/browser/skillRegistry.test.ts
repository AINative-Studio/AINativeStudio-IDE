/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';

/**
 * Test suite for Skills Manager - Skill Registry
 *
 * Phase 1: Core Registry Testing
 * Coverage Target: >= 90%
 */

// Mock interfaces until actual implementation exists
interface ISkill {
	name: string;
	description: string;
	version: string;
	author?: string;
	tags?: string[];
	dependencies?: string[];
	content: string;
}

interface ISkillRegistry {
	add(skill: ISkill): void;
	remove(name: string): boolean;
	get(name: string): ISkill | undefined;
	has(name: string): boolean;
	list(): ISkill[];
	findByTag(tag: string): ISkill[];
	clear(): void;
	count(): number;
}

// Mock registry implementation for testing structure
class SkillRegistry implements ISkillRegistry {
	private skills: Map<string, ISkill> = new Map();

	add(skill: ISkill): void {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented - to be implemented in Phase 1');
	}

	remove(name: string): boolean {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}

	get(name: string): ISkill | undefined {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}

	has(name: string): boolean {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}

	list(): ISkill[] {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}

	findByTag(tag: string): ISkill[] {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}

	clear(): void {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}

	count(): number {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}

	resolveDependencies(skillName: string): string[] {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented');
	}
}

// Test utilities
class SkillTestUtils {
	static createMockSkill(overrides?: Partial<ISkill>): ISkill {
		return {
			name: 'mock-skill',
			description: 'Mock skill for testing',
			version: '1.0.0',
			content: '# Mock Content',
			tags: ['test'],
			dependencies: [],
			...overrides
		};
	}
}

suite('Skills Manager - Skill Registry', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	let registry: SkillRegistry;

	setup(() => {
		registry = new SkillRegistry();
	});

	teardown(() => {
		registry.clear();
	});

	/**
	 * Basic Registry Operations
	 */
	suite('Add and Remove Skills', () => {

		test('should add skill to empty registry', () => {
			// Given: Empty registry
			assert.strictEqual(registry.count(), 0);

			// When: Add valid skill
			const skill = SkillTestUtils.createMockSkill({ name: 'test-skill-1' });
			registry.add(skill);

			// Then: Skill should be retrievable and count should increment
			assert.strictEqual(registry.count(), 1);
			assert.ok(registry.has('test-skill-1'));
			assert.strictEqual(registry.get('test-skill-1')?.name, 'test-skill-1');
		});

		test('should add multiple skills', () => {
			// Given: Empty registry
			const skill1 = SkillTestUtils.createMockSkill({ name: 'skill-1' });
			const skill2 = SkillTestUtils.createMockSkill({ name: 'skill-2' });
			const skill3 = SkillTestUtils.createMockSkill({ name: 'skill-3' });

			// When: Add multiple skills
			registry.add(skill1);
			registry.add(skill2);
			registry.add(skill3);

			// Then: All should be retrievable
			assert.strictEqual(registry.count(), 3);
			assert.ok(registry.has('skill-1'));
			assert.ok(registry.has('skill-2'));
			assert.ok(registry.has('skill-3'));
		});

		test('should reject duplicate skill names', () => {
			// Given: Registry with existing skill name
			const skill1 = SkillTestUtils.createMockSkill({ name: 'duplicate-skill' });
			registry.add(skill1);

			// When: Attempt to add skill with same name
			const skill2 = SkillTestUtils.createMockSkill({ name: 'duplicate-skill', version: '2.0.0' });

			// Then: Should reject with clear error message
			assert.throws(
				() => registry.add(skill2),
				/already exists|duplicate/i,
				'Should throw error for duplicate name'
			);
			assert.strictEqual(registry.count(), 1);
			assert.strictEqual(registry.get('duplicate-skill')?.version, '1.0.0');
		});

		test('should remove skill from registry', () => {
			// Given: Registry with multiple skills
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1' }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-2' }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-3' }));

			// When: Remove specific skill
			const removed = registry.remove('skill-2');

			// Then: Skill should not be retrievable and count should decrement
			assert.strictEqual(removed, true, 'Remove should return true');
			assert.strictEqual(registry.count(), 2);
			assert.ok(!registry.has('skill-2'));
			assert.ok(registry.has('skill-1'));
			assert.ok(registry.has('skill-3'));
		});

		test('should return false when removing non-existent skill', () => {
			// Given: Registry without the skill
			registry.add(SkillTestUtils.createMockSkill({ name: 'existing-skill' }));

			// When: Remove non-existent skill
			const removed = registry.remove('non-existent-skill');

			// Then: Should return false, count unchanged
			assert.strictEqual(removed, false);
			assert.strictEqual(registry.count(), 1);
		});

		test('should clear all skills', () => {
			// Given: Registry with multiple skills
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1' }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-2' }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-3' }));

			// When: Clear registry
			registry.clear();

			// Then: Registry should be empty
			assert.strictEqual(registry.count(), 0);
			assert.strictEqual(registry.list().length, 0);
		});
	});

	/**
	 * Lookup Operations
	 */
	suite('Lookup Skills', () => {

		test('should lookup skill by exact name', () => {
			// Given: Registry with multiple skills
			const skill1 = SkillTestUtils.createMockSkill({ name: 'skill-alpha' });
			const skill2 = SkillTestUtils.createMockSkill({ name: 'skill-beta' });
			registry.add(skill1);
			registry.add(skill2);

			// When: Lookup skill by exact name
			const found = registry.get('skill-beta');

			// Then: Should return correct skill
			assert.ok(found);
			assert.strictEqual(found.name, 'skill-beta');
		});

		test('should return undefined for non-existent skill', () => {
			// Given: Registry with skills
			registry.add(SkillTestUtils.createMockSkill({ name: 'existing-skill' }));

			// When: Lookup non-existent skill
			const found = registry.get('non-existent');

			// Then: Should return undefined
			assert.strictEqual(found, undefined);
		});

		test('should check skill existence', () => {
			// Given: Registry with skill
			registry.add(SkillTestUtils.createMockSkill({ name: 'test-skill' }));

			// When: Check existence
			const exists = registry.has('test-skill');
			const notExists = registry.has('other-skill');

			// Then: Should correctly report existence
			assert.strictEqual(exists, true);
			assert.strictEqual(notExists, false);
		});

		test('should list all skills', () => {
			// Given: Registry with N skills
			const skills = [
				SkillTestUtils.createMockSkill({ name: 'skill-1' }),
				SkillTestUtils.createMockSkill({ name: 'skill-2' }),
				SkillTestUtils.createMockSkill({ name: 'skill-3' })
			];
			skills.forEach(s => registry.add(s));

			// When: List all skills
			const list = registry.list();

			// Then: Should return array of N skills
			assert.strictEqual(list.length, 3);
			assert.ok(list.find(s => s.name === 'skill-1'));
			assert.ok(list.find(s => s.name === 'skill-2'));
			assert.ok(list.find(s => s.name === 'skill-3'));
		});

		test('should return empty list for empty registry', () => {
			// Given: Empty registry
			// When: List all skills
			const list = registry.list();

			// Then: Should return empty array
			assert.strictEqual(list.length, 0);
			assert.ok(Array.isArray(list));
		});
	});

	/**
	 * Tag-based Search
	 */
	suite('Tag Search', () => {

		test('should find skills by tag', () => {
			// Given: Skills with various tags
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1', tags: ['testing', 'qa'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-2', tags: ['testing', 'automation'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-3', tags: ['deployment'] }));

			// When: Lookup skills by tag
			const testingSkills = registry.findByTag('testing');

			// Then: Should return all skills with that tag
			assert.strictEqual(testingSkills.length, 2);
			assert.ok(testingSkills.find(s => s.name === 'skill-1'));
			assert.ok(testingSkills.find(s => s.name === 'skill-2'));
		});

		test('should return empty array for non-existent tag', () => {
			// Given: Skills without specific tag
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1', tags: ['testing'] }));

			// When: Search for non-existent tag
			const results = registry.findByTag('non-existent');

			// Then: Should return empty array
			assert.strictEqual(results.length, 0);
			assert.ok(Array.isArray(results));
		});

		test('should handle skills with no tags', () => {
			// Given: Skills with and without tags
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1', tags: [] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-2', tags: ['testing'] }));

			// When: Search by tag
			const results = registry.findByTag('testing');

			// Then: Should only return skills with the tag
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].name, 'skill-2');
		});

		test('should handle tag search case-insensitively', () => {
			// Given: Skills with lowercase tags
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1', tags: ['testing'] }));

			// When: Search with different case
			const resultsLower = registry.findByTag('testing');
			const resultsUpper = registry.findByTag('TESTING');
			const resultsMixed = registry.findByTag('Testing');

			// Then: All should return same results
			assert.strictEqual(resultsLower.length, 1);
			assert.strictEqual(resultsUpper.length, 1);
			assert.strictEqual(resultsMixed.length, 1);
		});
	});

	/**
	 * Dependency Resolution
	 */
	suite('Dependency Resolution', () => {

		test('should resolve simple dependency chain', () => {
			// Given: Skills with dependency chain (A->B->C)
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-c', dependencies: [] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-b', dependencies: ['skill-c'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-a', dependencies: ['skill-b'] }));

			// When: Resolve dependencies for skill A
			const deps = registry.resolveDependencies('skill-a');

			// Then: Should return [B, C] in correct order
			assert.ok(Array.isArray(deps));
			assert.ok(deps.includes('skill-b'));
			assert.ok(deps.includes('skill-c'));
			// skill-c should come before skill-b (dependency order)
			assert.ok(deps.indexOf('skill-c') < deps.indexOf('skill-b'));
		});

		test('should detect circular dependencies', () => {
			// Given: Skills with circular dependencies (A->B->C->A)
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-a', dependencies: ['skill-b'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-b', dependencies: ['skill-c'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-c', dependencies: ['skill-a'] }));

			// When: Resolve dependencies
			// Then: Should throw circular dependency error
			assert.throws(
				() => registry.resolveDependencies('skill-a'),
				/circular/i,
				'Should detect circular dependency'
			);
		});

		test('should handle missing dependencies', () => {
			// Given: Skill requiring non-existent dependency
			registry.add(SkillTestUtils.createMockSkill({
				name: 'skill-a',
				dependencies: ['non-existent-skill']
			}));

			// When: Resolve dependencies
			// Then: Should throw error listing missing dependencies
			assert.throws(
				() => registry.resolveDependencies('skill-a'),
				/missing|not found/i,
				'Should report missing dependency'
			);
		});

		test('should handle skill with no dependencies', () => {
			// Given: Skill with empty dependencies
			registry.add(SkillTestUtils.createMockSkill({ name: 'standalone-skill', dependencies: [] }));

			// When: Resolve dependencies
			const deps = registry.resolveDependencies('standalone-skill');

			// Then: Should return empty array
			assert.ok(Array.isArray(deps));
			assert.strictEqual(deps.length, 0);
		});

		test('should handle multiple skills depending on same skill', () => {
			// Given: Diamond dependency (A->B, A->C, B->D, C->D)
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-d', dependencies: [] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-b', dependencies: ['skill-d'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-c', dependencies: ['skill-d'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-a', dependencies: ['skill-b', 'skill-c'] }));

			// When: Resolve dependencies
			const deps = registry.resolveDependencies('skill-a');

			// Then: D should appear only once, before B and C
			const dCount = deps.filter(d => d === 'skill-d').length;
			assert.strictEqual(dCount, 1, 'Dependency should appear only once');
			assert.ok(deps.indexOf('skill-d') < deps.indexOf('skill-b'));
			assert.ok(deps.indexOf('skill-d') < deps.indexOf('skill-c'));
		});
	});

	/**
	 * Performance Tests
	 */
	suite('Performance', () => {

		test('should handle large registry efficiently', () => {
			// Given: Very large registry (10000+ skills)
			const startTime = performance.now();

			for (let i = 0; i < 10000; i++) {
				registry.add(SkillTestUtils.createMockSkill({ name: `skill-${i}` }));
			}

			const duration = performance.now() - startTime;

			// Then: Should complete in reasonable time
			assert.strictEqual(registry.count(), 10000);
			assert.ok(duration < 2000, `Adding 10000 skills took ${duration}ms, expected < 2000ms`);
		});

		test('should lookup skills quickly in large registry', () => {
			// Given: Large registry
			for (let i = 0; i < 5000; i++) {
				registry.add(SkillTestUtils.createMockSkill({ name: `skill-${i}` }));
			}

			// When: Perform lookup
			const startTime = performance.now();
			const found = registry.get('skill-2500');
			const duration = performance.now() - startTime;

			// Then: Lookup should be fast (< 2ms)
			assert.ok(found);
			assert.ok(duration < 2, `Lookup took ${duration}ms, expected < 2ms`);
		});

		test('should search by tag efficiently in large registry', () => {
			// Given: Large registry with tagged skills
			for (let i = 0; i < 5000; i++) {
				const tags = i % 10 === 0 ? ['testing'] : ['other'];
				registry.add(SkillTestUtils.createMockSkill({ name: `skill-${i}`, tags }));
			}

			// When: Search by tag
			const startTime = performance.now();
			const results = registry.findByTag('testing');
			const duration = performance.now() - startTime;

			// Then: Should be fast (< 20ms)
			assert.strictEqual(results.length, 500); // Every 10th skill
			assert.ok(duration < 20, `Tag search took ${duration}ms, expected < 20ms`);
		});
	});

	/**
	 * Edge Cases
	 */
	suite('Edge Cases', () => {

		test('should handle skills with identical tags but different names', () => {
			// Given: Skills with identical tags
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1', tags: ['a', 'b', 'c'] }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-2', tags: ['a', 'b', 'c'] }));

			// When: Search by tag
			const results = registry.findByTag('a');

			// Then: Should return both skills
			assert.strictEqual(results.length, 2);
		});

		test('should handle skills with very long names', () => {
			// Given: Skill with long name (> 100 characters)
			const longName = 'a'.repeat(150);
			const skill = SkillTestUtils.createMockSkill({ name: longName });

			// When: Add to registry
			registry.add(skill);

			// Then: Should handle correctly
			assert.ok(registry.has(longName));
			assert.strictEqual(registry.get(longName)?.name, longName);
		});

		test('should handle skills with special characters in names', () => {
			// Given: Skill names with hyphens, underscores
			const names = ['skill-with-hyphens', 'skill_with_underscores', 'skill.with.dots'];

			// When: Add skills
			names.forEach(name => {
				registry.add(SkillTestUtils.createMockSkill({ name }));
			});

			// Then: All should be accessible
			names.forEach(name => {
				assert.ok(registry.has(name), `Should have ${name}`);
			});
		});

		test('should handle concurrent modifications safely', () => {
			// Given: Registry with skills
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-1' }));
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-2' }));

			// When: Modify while iterating
			const list = registry.list();
			registry.add(SkillTestUtils.createMockSkill({ name: 'skill-3' }));

			// Then: Original list should be unaffected (defensive copy)
			assert.strictEqual(list.length, 2);
			assert.strictEqual(registry.count(), 3);
		});
	});
});

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
// Mock registry implementation for testing structure
class SkillRegistry {
    constructor() {
        this.skills = new Map();
    }
    add(skill) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented - to be implemented in Phase 1');
    }
    remove(name) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
    get(name) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
    has(name) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
    list() {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
    findByTag(tag) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
    clear() {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
    count() {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
    resolveDependencies(skillName) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented');
    }
}
// Test utilities
class SkillTestUtils {
    static createMockSkill(overrides) {
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
    let registry;
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
            assert.throws(() => registry.add(skill2), /already exists|duplicate/i, 'Should throw error for duplicate name');
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
            assert.throws(() => registry.resolveDependencies('skill-a'), /circular/i, 'Should detect circular dependency');
        });
        test('should handle missing dependencies', () => {
            // Given: Skill requiring non-existent dependency
            registry.add(SkillTestUtils.createMockSkill({
                name: 'skill-a',
                dependencies: ['non-existent-skill']
            }));
            // When: Resolve dependencies
            // Then: Should throw error listing missing dependencies
            assert.throws(() => registry.resolveDependencies('skill-a'), /missing|not found/i, 'Should report missing dependency');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxSZWdpc3RyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL3Rlc3QvYnJvd3Nlci9za2lsbFJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBK0JuRyxxREFBcUQ7QUFDckQsTUFBTSxhQUFhO0lBQW5CO1FBQ1MsV0FBTSxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO0lBOENqRCxDQUFDO0lBNUNBLEdBQUcsQ0FBQyxLQUFhO1FBQ2hCLDJDQUEyQztRQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFZO1FBQ2xCLDJDQUEyQztRQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELEdBQUcsQ0FBQyxJQUFZO1FBQ2YsMkNBQTJDO1FBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsR0FBRyxDQUFDLElBQVk7UUFDZiwyQ0FBMkM7UUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJO1FBQ0gsMkNBQTJDO1FBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsU0FBUyxDQUFDLEdBQVc7UUFDcEIsMkNBQTJDO1FBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNw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
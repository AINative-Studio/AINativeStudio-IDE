/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok, deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SkillRegistry } from '../../common/skillRegistry.js';
suite('SkillRegistry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let registry;
    const createTestSkill = (name, options) => ({
        metadata: {
            name,
            description: `Description for ${name}`,
            location: options?.location || 'managed',
            tags: options?.tags,
            dependencies: options?.dependencies
        },
        content: `---\nname: ${name}\n---\nContent`,
        instructions: 'Content',
        filePath: `/test/${name}.md`,
        lastModified: Date.now()
    });
    setup(() => {
        registry = new SkillRegistry();
    });
    suite('registerSkill', () => {
        test('should register a skill successfully', () => {
            const skill = createTestSkill('test-skill');
            registry.registerSkill(skill);
            strictEqual(registry.hasSkill('test-skill'), true);
            strictEqual(registry.getSkillCount(), 1);
        });
        test('should replace existing skill with same name', () => {
            const skill1 = createTestSkill('test-skill', { tags: ['old'] });
            const skill2 = createTestSkill('test-skill', { tags: ['new'] });
            registry.registerSkill(skill1);
            registry.registerSkill(skill2);
            strictEqual(registry.getSkillCount(), 1);
            const retrieved = registry.getSkillByName('test-skill');
            deepStrictEqual(retrieved?.metadata.tags, ['new']);
        });
        test('should register multiple skills', () => {
            registry.registerSkill(createTestSkill('skill-1'));
            registry.registerSkill(createTestSkill('skill-2'));
            registry.registerSkill(createTestSkill('skill-3'));
            strictEqual(registry.getSkillCount(), 3);
        });
    });
    suite('getSkillByName', () => {
        test('should retrieve registered skill by name', () => {
            const skill = createTestSkill('test-skill');
            registry.registerSkill(skill);
            const retrieved = registry.getSkillByName('test-skill');
            ok(retrieved, 'Should find the skill');
            strictEqual(retrieved?.metadata.name, 'test-skill');
        });
        test('should return undefined for non-existent skill', () => {
            const retrieved = registry.getSkillByName('non-existent');
            strictEqual(retrieved, undefined);
        });
        test('should be case-sensitive', () => {
            const skill = createTestSkill('test-skill');
            registry.registerSkill(skill);
            const retrieved = registry.getSkillByName('Test-Skill');
            strictEqual(retrieved, undefined, 'Should not find skill with different case');
        });
    });
    suite('getSkillsByTag', () => {
        test('should retrieve skills by tag', () => {
            registry.registerSkill(createTestSkill('skill-1', { tags: ['testing', 'quality'] }));
            registry.registerSkill(createTestSkill('skill-2', { tags: ['testing'] }));
            registry.registerSkill(createTestSkill('skill-3', { tags: ['deployment'] }));
            const testingSkills = registry.getSkillsByTag('testing');
            strictEqual(testingSkills.length, 2);
            ok(testingSkills.some(s => s.metadata.name === 'skill-1'));
            ok(testingSkills.some(s => s.metadata.name === 'skill-2'));
        });
        test('should return empty array for non-existent tag', () => {
            registry.registerSkill(createTestSkill('skill-1', { tags: ['testing'] }));
            const skills = registry.getSkillsByTag('non-existent');
            strictEqual(skills.length, 0);
        });
        test('should return empty array when no skills have tags', () => {
            registry.registerSkill(createTestSkill('skill-1'));
            registry.registerSkill(createTestSkill('skill-2'));
            const skills = registry.getSkillsByTag('any-tag');
            strictEqual(skills.length, 0);
        });
        test('should handle skills with no tags field', () => {
            registry.registerSkill(createTestSkill('skill-1', { tags: ['testing'] }));
            registry.registerSkill(createTestSkill('skill-2')); // No tags
            const skills = registry.getSkillsByTag('testing');
            strictEqual(skills.length, 1);
            strictEqual(skills[0].metadata.name, 'skill-1');
        });
    });
    suite('getSkillsWithDependencies', () => {
        test('should return skill with no dependencies as single-item array', () => {
            registry.registerSkill(createTestSkill('standalone-skill'));
            const result = registry.getSkillsWithDependencies('standalone-skill');
            strictEqual(result.length, 1);
            strictEqual(result[0].metadata.name, 'standalone-skill');
        });
        test('should resolve single-level dependencies', () => {
            registry.registerSkill(createTestSkill('base-skill'));
            registry.registerSkill(createTestSkill('dependent-skill', {
                dependencies: ['base-skill']
            }));
            const result = registry.getSkillsWithDependencies('dependent-skill');
            strictEqual(result.length, 2);
            strictEqual(result[0].metadata.name, 'base-skill', 'Dependencies should come first');
            strictEqual(result[1].metadata.name, 'dependent-skill');
        });
        test('should resolve multi-level dependencies', () => {
            registry.registerSkill(createTestSkill('level-1'));
            registry.registerSkill(createTestSkill('level-2', { dependencies: ['level-1'] }));
            registry.registerSkill(createTestSkill('level-3', { dependencies: ['level-2'] }));
            const result = registry.getSkillsWithDependencies('level-3');
            strictEqual(result.length, 3);
            strictEqual(result[0].metadata.name, 'level-1');
            strictEqual(result[1].metadata.name, 'level-2');
            strictEqual(result[2].metadata.name, 'level-3');
        });
        test('should handle multiple dependencies', () => {
            registry.registerSkill(createTestSkill('dep-1'));
            registry.registerSkill(createTestSkill('dep-2'));
            registry.registerSkill(createTestSkill('main-skill', {
                dependencies: ['dep-1', 'dep-2']
            }));
            const result = registry.getSkillsWithDependencies('main-skill');
            strictEqual(result.length, 3);
            ok(result.some(s => s.metadata.name === 'dep-1'));
            ok(result.some(s => s.metadata.name === 'dep-2'));
            strictEqual(result[result.length - 1].metadata.name, 'main-skill');
        });
        test('should handle circular dependencies gracefully', () => {
            registry.registerSkill(createTestSkill('skill-a', { dependencies: ['skill-b'] }));
            registry.registerSkill(createTestSkill('skill-b', { dependencies: ['skill-a'] }));
            const result = registry.getSkillsWithDependencies('skill-a');
            // Should include both without infinite loop
            ok(result.length >= 1 && result.length <= 2, 'Should handle circular deps');
        });
        test('should skip missing dependencies', () => {
            registry.registerSkill(createTestSkill('skill-1', {
                dependencies: ['non-existent', 'also-missing']
            }));
            const result = registry.getSkillsWithDependencies('skill-1');
            strictEqual(result.length, 1, 'Should only include the skill itself');
            strictEqual(result[0].metadata.name, 'skill-1');
        });
        test('should return empty array for non-existent skill', () => {
            const result = registry.getSkillsWithDependencies('non-existent');
            strictEqual(result.length, 0);
        });
        test('should not duplicate dependencies', () => {
            registry.registerSkill(createTestSkill('shared-dep'));
            registry.registerSkill(createTestSkill('dep-a', { dependencies: ['shared-dep'] }));
            registry.registerSkill(createTestSkill('dep-b', { dependencies: ['shared-dep'] }));
            registry.registerSkill(createTestSkill('main', {
                dependencies: ['dep-a', 'dep-b']
            }));
            const result = registry.getSkillsWithDependencies('main');
            const names = result.map(s => s.metadata.name);
            const uniqueNames = new Set(names);
            strictEqual(names.length, uniqueNames.size, 'Should not have duplicates');
            ok(names.includes('shared-dep'));
        });
    });
    suite('unregisterSkill', () => {
        test('should remove skill from registry', () => {
            registry.registerSkill(createTestSkill('test-skill'));
            strictEqual(registry.hasSkill('test-skill'), true);
            registry.unregisterSkill('test-skill');
            strictEqual(registry.hasSkill('test-skill'), false);
            strictEqual(registry.getSkillCount(), 0);
        });
        test('should handle unregistering non-existent skill', () => {
            registry.unregisterSkill('non-existent');
            strictEqual(registry.getSkillCount(), 0);
        });
        test('should not affect other skills', () => {
            registry.registerSkill(createTestSkill('skill-1'));
            registry.registerSkill(createTestSkill('skill-2'));
            registry.registerSkill(createTestSkill('skill-3'));
            registry.unregisterSkill('skill-2');
            strictEqual(registry.getSkillCount(), 2);
            strictEqual(registry.hasSkill('skill-1'), true);
            strictEqual(registry.hasSkill('skill-2'), false);
            strictEqual(registry.hasSkill('skill-3'), true);
        });
    });
    suite('getAllSkills', () => {
        test('should return empty array when no skills registered', () => {
            const skills = registry.getAllSkills();
            strictEqual(skills.length, 0);
        });
        test('should return all registered skills', () => {
            registry.registerSkill(createTestSkill('skill-1'));
            registry.registerSkill(createTestSkill('skill-2'));
            registry.registerSkill(createTestSkill('skill-3'));
            const skills = registry.getAllSkills();
            strictEqual(skills.length, 3);
            const names = skills.map(s => s.metadata.name);
            ok(names.includes('skill-1'));
            ok(names.includes('skill-2'));
            ok(names.includes('skill-3'));
        });
        test('should return copy of skills array', () => {
            registry.registerSkill(createTestSkill('skill-1'));
            const skills1 = registry.getAllSkills();
            const skills2 = registry.getAllSkills();
            ok(skills1 !== skills2, 'Should return different array instances');
            deepStrictEqual(skills1, skills2, 'But arrays should have same content');
        });
    });
    suite('clear', () => {
        test('should remove all skills', () => {
            registry.registerSkill(createTestSkill('skill-1'));
            registry.registerSkill(createTestSkill('skill-2'));
            registry.registerSkill(createTestSkill('skill-3'));
            strictEqual(registry.getSkillCount(), 3);
            registry.clear();
            strictEqual(registry.getSkillCount(), 0);
            strictEqual(registry.getAllSkills().length, 0);
        });
        test('should work on empty registry', () => {
            registry.clear();
            strictEqual(registry.getSkillCount(), 0);
        });
    });
    suite('hasSkill', () => {
        test('should return true for registered skill', () => {
            registry.registerSkill(createTestSkill('test-skill'));
            strictEqual(registry.hasSkill('test-skill'), true);
        });
        test('should return false for non-existent skill', () => {
            strictEqual(registry.hasSkill('non-existent'), false);
        });
        test('should return false after skill is unregistered', () => {
            registry.registerSkill(createTestSkill('test-skill'));
            registry.unregisterSkill('test-skill');
            strictEqual(registry.hasSkill('test-skill'), false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxSZWdpc3RyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9za2lsbFJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzFELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUc5RCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksUUFBdUIsQ0FBQztJQUU1QixNQUFNLGVBQWUsR0FBRyxDQUFDLElBQVksRUFBRSxPQUl0QyxFQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2IsUUFBUSxFQUFFO1lBQ1QsSUFBSTtZQUNKLFdBQVcsRUFBRSxtQkFBbUIsSUFBSSxFQUFFO1lBQ3RDLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxJQUFJLFNBQVM7WUFDeEMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJO1lBQ25CLFlBQVksRUFBRSxPQUFPLEVBQUUsWUFBWTtTQUNuQztRQUNELE9BQU8sRUFBRSxjQUFjLElBQUksZ0JBQWdCO1FBQzNDLFlBQVksRUFBRSxTQUFTO1FBQ3ZCLFFBQVEsRUFBRSxTQUFTLElBQUksS0FBSztRQUM1QixZQUFZLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtLQUN4QixDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsUUFBUSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7SUFDaEMs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
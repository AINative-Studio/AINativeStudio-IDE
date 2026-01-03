/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SkillRegistry } from '../../common/skillRegistry.js';
import { Skill } from '../../common/skillTypes.js';

suite('SkillRegistry', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	let registry: SkillRegistry;

	const createTestSkill = (name: string, options?: {
		tags?: string[];
		dependencies?: string[];
		location?: 'managed' | 'project';
	}): Skill => ({
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

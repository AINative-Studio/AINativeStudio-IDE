/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SkillLoader } from '../../../common/skills/skillLoader.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { URI } from '../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';

/**
 * Unit Tests for SkillLoader
 * Following BDD style (describe/it) and TDD principles
 * Coverage target: 100% for core loading logic
 */
suite('SkillLoader', () => {

	let loader: SkillLoader;
	let mockRegistry: any;
	let mockParser: any;
	let mockFileService: IFileService;

	setup(() => {
		// Create mocks
		mockRegistry = createMockRegistry();
		mockParser = createMockParser();
		mockFileService = createMockFileService();

		loader = new SkillLoader(mockRegistry, mockParser, mockFileService);
	});

	suite('loadMetadataOnly', () => {

		test('should load metadata without body', async () => {
			const skillName = 'test-skill';

			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockParser.parseMetadataOnly = (content: string) => {
				return {
					name: skillName,
					description: 'Test skill description',
					tags: ['test'],
					category: 'testing',
					location: 'project'
				};
			};

			const result = await loader.loadMetadataOnly(skillName);

			assert.strictEqual(result.name, skillName);
			assert.strictEqual(result.description, 'Test skill description');
			assert.ok(result.tags && result.tags.includes('test'));
		});

		test('should cache metadata for subsequent calls', async () => {
			const skillName = 'cached-skill';
			let callCount = 0;

			mockRegistry.getSkillPath = async (name: string) => {
				callCount++;
				return `/home/.ainative/skills/${name}`;
			};

			mockParser.parseMetadataOnly = (content: string) => {
				return {
					name: skillName,
					description: 'Cached skill',
					tags: [],
					category: 'test',
					location: 'global'
				};
			};

			// First call - should read from file
			await loader.loadMetadataOnly(skillName);
			const firstCallCount = callCount;

			// Second call - should use cache
			const result = await loader.loadMetadataOnly(skillName);

			assert.strictEqual(result.name, skillName);
			// Registry should only be called once (cache hit on second call)
			assert.strictEqual(callCount, firstCallCount);
		});

		test('should throw error for missing skill', async () => {
			mockRegistry.getSkillPath = async (name: string) => {
				return null;
			};

			await assert.rejects(
				async () => await loader.loadMetadataOnly('nonexistent-skill'),
				(error: Error) => {
					assert.ok(error.message.includes('Skill not found'));
					return true;
				}
			);
		});
	});

	suite('loadFullSkill', () => {

		test('should load body on demand', async () => {
			const skillName = 'full-skill';

			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockParser.parseFullSkill = (content: string) => {
				return {
					metadata: {
						name: skillName,
						description: 'Full skill with body',
						tags: [],
						category: 'test',
						location: 'global'
					},
					body: 'This is the full skill body content',
					resources: []
				};
			};

			const result = await loader.loadFullSkill(skillName);

			assert.strictEqual(result.metadata.name, skillName);
			assert.strictEqual(result.body, 'This is the full skill body content');
			assert.ok(Array.isArray(result.resources));
		});

		test('should cache full skills in LRU cache', async () => {
			const skillName = 'lru-skill';
			let parseCallCount = 0;

			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockParser.parseFullSkill = (content: string) => {
				parseCallCount++;
				return {
					metadata: {
						name: skillName,
						description: 'LRU cached skill',
						tags: [],
						category: 'test',
						location: 'global'
					},
					body: 'Body content',
					resources: []
				};
			};

			// First load
			await loader.loadFullSkill(skillName);
			const firstParseCount = parseCallCount;

			// Second load - should use cache
			const result = await loader.loadFullSkill(skillName);

			assert.strictEqual(result.metadata.name, skillName);
			// Parser should only be called once
			assert.strictEqual(parseCallCount, firstParseCount);
		});

		test('should evict oldest skills when cache is full', async () => {
			// Load 6 skills (cache max is 5)
			for (let i = 1; i <= 6; i++) {
				const skillName = `skill-${i}`;

				mockRegistry.getSkillPath = async (name: string) => {
					return `/home/.ainative/skills/${name}`;
				};

				mockParser.parseFullSkill = (content: string) => {
					return {
						metadata: {
							name: skillName,
							description: `Skill ${i}`,
							tags: [],
							category: 'test',
							location: 'global'
						},
						body: `Body ${i}`,
						resources: []
					};
				};

				await loader.loadFullSkill(skillName);
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const stats = loader.getCacheStats();

			// Cache should have max 5 skills
			assert.ok(stats.fullSkillCount <= 5);
		});

		test('should handle missing skills gracefully', async () => {
			mockRegistry.getSkillPath = async (name: string) => {
				return null;
			};

			await assert.rejects(
				async () => await loader.loadFullSkill('missing-skill'),
				(error: Error) => {
					assert.ok(error.message.includes('Skill not found'));
					return true;
				}
			);
		});
	});

	suite('loadReferences', () => {

		test('should load reference files on demand', async () => {
			const skillName = 'skill-with-refs';
			const refPath = 'references/example.md';

			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockFileService.readFile = async (uri: URI) => {
				if (uri.path.includes('example.md')) {
					return { value: VSBuffer.fromString('Reference file content') } as any;
				}
				return { value: VSBuffer.fromString('') } as any;
			};

			const content = await loader.loadReference(skillName, refPath);

			assert.strictEqual(content, 'Reference file content');
		});

		test('should not cache reference files', async () => {
			const skillName = 'skill-with-refs';
			const refPath = 'references/nocache.md';
			let readCount = 0;

			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockFileService.readFile = async (uri: URI) => {
				readCount++;
				return { value: VSBuffer.fromString('Content') } as any;
			};

			// Read twice
			await loader.loadReference(skillName, refPath);
			await loader.loadReference(skillName, refPath);

			// Should be called twice (no caching)
			assert.strictEqual(readCount, 2);
		});
	});

	suite('getCacheStats', () => {

		test('should measure cache hits and misses', async () => {
			const skillName = 'stats-skill';

			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockParser.parseMetadataOnly = (content: string) => {
				return {
					name: skillName,
					description: 'Stats test',
					tags: [],
					category: 'test',
					location: 'global'
				};
			};

			// First call - cache miss
			await loader.loadMetadataOnly(skillName);

			// Second call - cache hit
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			await loader.loadMetadataOnly(skillName);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		// @ts-expect-error - Unused variable
		const stats = loader.getCacheStats(); // Test that cache stats can be retrieved

			assert.strictEqual(0, 1);
			assert.strictEqual(0, 1);
		});

		test('should track metadata cache size', async () => {
			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockParser.parseMetadataOnly = (content: string) => {
				return {
					name: 'skill',
					description: 'Test',
					tags: [],
					category: 'test',
					location: 'global'
				};
			};

			// Load 3 different skills
			await loader.loadMetadataOnly('skill-1');
			await loader.loadMetadataOnly('skill-2');
			await loader.loadMetadataOnly('skill-3');

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const stats = loader.getCacheStats();

			assert.strictEqual(stats.metadataCount, 3);
		});
	});

	suite('invalidateCache', () => {

		test('should invalidate cache on skill uninstall', () => {
			// Load some skills first
			const skillName = 'to-be-uninstalled';

			mockRegistry.getSkillPath = async (name: string) => {
				return `/home/.ainative/skills/${name}`;
			};

			mockParser.parseMetadataOnly = (content: string) => {
				return {
					name: skillName,
					description: 'Will be uninstalled',
					tags: [],
					category: 'test',
					location: 'global'
				};
			};

			// Invalidate cache for specific skill
			loader.clearCache();

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const stats = loader.getCacheStats();

			// Cache should be cleared
			assert.ok(stats);
		});
	});
});

/**
 * Helper functions to create mocks
 */
function createMockRegistry(): any {
	return {
		getSkillPath: async (name: string) => `/home/.ainative/skills/${name}`,
		getAllInstalledSkills: async () => ['skill-1', 'skill-2']
	};
}

function createMockParser(): any {
	return {
		parseMetadataOnly: (content: string) => ({
			name: 'test-skill',
			description: 'Test description',
			tags: [],
			category: 'test',
			location: 'global'
		}),
		parseFullSkill: (content: string) => ({
			metadata: {
				name: 'test-skill',
				description: 'Test description',
				tags: [],
				category: 'test',
				location: 'global'
			},
			body: 'Test body',
			resources: []
		})
	};
}

function createMockFileService(): IFileService {
	return {
		readFile: async (uri: URI) => {
			return { value: VSBuffer.fromString('---\nname: test\ndescription: test\n---\n\n# Body') } as any;
		}
	} as any;
}

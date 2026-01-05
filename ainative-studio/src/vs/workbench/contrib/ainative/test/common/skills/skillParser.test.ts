/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SkillParser } from '../../../common/skills/skillParser.js';
import { SkillParseError } from '../../../common/skills/skillTypes.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { URI } from '../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';

/**
 * Unit Tests for SkillParser
 * Following BDD style (describe/it) and TDD principles
 * Coverage target: 100% for core parsing logic
 */
suite('SkillParser', () => {

	let parser: SkillParser;
	let mockFileService: IFileService;

	setup(() => {
		// Create mock file service
		mockFileService = createMockFileService();
		parser = new SkillParser(mockFileService);
	});

	teardown(() => {
		parser.dispose();
	});

	suite('parseSkillFile', () => {

		test('should parse valid SKILL.md with frontmatter', async () => {
			const validSkillContent = `---
name: test-skill
description: A test skill for unit testing
version: 1.0.0
author: Test Author
---

# Test Skill

This is the skill body content.`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(validSkillContent) } as any;
			};

			const result = await parser.parseSkillFile('/path/to/skill/SKILL.md');

			assert.strictEqual(result.metadata.name, 'test-skill');
			assert.strictEqual(result.metadata.description, 'A test skill for unit testing');
			assert.strictEqual(result.metadata.version, '1.0.0');
			assert.strictEqual(result.metadata.author, 'Test Author');
			assert.ok(result.body.includes('Test Skill'));
		});

		test('should throw error on missing frontmatter', async () => {
			const invalidContent = `# Test Skill

This skill is missing frontmatter.`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(invalidContent) } as any;
			};

			await assert.rejects(
				async () => await parser.parseSkillFile('/path/to/skill/SKILL.md'),
				(error: SkillParseError) => {
					assert.ok(error.message.includes('missing YAML frontmatter'));
					return true;
				}
			);
		});

		test('should throw error on missing name field', async () => {
			const contentWithoutName = `---
description: Missing name field
---

# Test Skill`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(contentWithoutName) } as any;
			};

			await assert.rejects(
				async () => await parser.parseSkillFile('/path/to/skill/SKILL.md'),
				(error: SkillParseError) => {
					assert.ok(error.message.includes('name') || error.message.includes('required'));
					return true;
				}
			);
		});

		test('should throw error on missing description field', async () => {
			const contentWithoutDescription = `---
name: test-skill
---

# Test Skill`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(contentWithoutDescription) } as any;
			};

			await assert.rejects(
				async () => await parser.parseSkillFile('/path/to/skill/SKILL.md'),
				(error: SkillParseError) => {
					assert.ok(error.message.includes('description') || error.message.includes('required'));
					return true;
				}
			);
		});

		test('should parse skills with tags array', async () => {
			const contentWithTags = `---
name: test-skill
description: Test skill with tags
tags: [testing, unit-test, bdd]
---

# Test Skill`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(contentWithTags) } as any;
			};

			const result = await parser.parseSkillFile('/path/to/skill/SKILL.md');

			assert.ok(result.metadata.tags);
			assert.strictEqual(result.metadata.tags.length, 3);
			assert.ok(result.metadata.tags.includes('testing'));
			assert.ok(result.metadata.tags.includes('unit-test'));
			assert.ok(result.metadata.tags.includes('bdd'));
		});

		test('should handle empty body', async () => {
			const contentWithEmptyBody = `---
name: test-skill
description: Skill with empty body
---

`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(contentWithEmptyBody) } as any;
			};

			const result = await parser.parseSkillFile('/path/to/skill/SKILL.md');

			assert.strictEqual(result.metadata.name, 'test-skill');
			assert.strictEqual(result.body, '');
		});

		test('should handle malformed YAML gracefully', async () => {
			const malformedYaml = `---
name: test-skill
description: Test [unmatched bracket
---

# Test`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(malformedYaml) } as any;
			};

			// Should not throw - simple parser handles this gracefully
			const result = await parser.parseSkillFile('/path/to/skill/SKILL.md');
			assert.strictEqual(result.metadata.name, 'test-skill');
		});

		test('should validate YAML types (name/description must be strings)', async () => {
			const contentWithCorrectTypes = `---
name: test-skill
description: This is a string description
version: 1.0.0
---

# Test`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(contentWithCorrectTypes) } as any;
			};

			const result = await parser.parseSkillFile('/path/to/skill/SKILL.md');

			assert.strictEqual(typeof result.metadata.name, 'string');
			assert.strictEqual(typeof result.metadata.description, 'string');
		});

		test('should parse skills with quoted values', async () => {
			const contentWithQuotes = `---
name: "test-skill-quoted"
description: 'Single quoted description'
author: "Test Author"
---

# Test`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(contentWithQuotes) } as any;
			};

			const result = await parser.parseSkillFile('/path/to/skill/SKILL.md');

			assert.strictEqual(result.metadata.name, 'test-skill-quoted');
			assert.strictEqual(result.metadata.description, 'Single quoted description');
			assert.strictEqual(result.metadata.author, 'Test Author');
		});

		test('should handle file read errors', async () => {
			mockFileService.readFile = async (uri: URI) => {
				throw new Error('File not found');
			};

			await assert.rejects(
				async () => await parser.parseSkillFile('/path/to/nonexistent/SKILL.md'),
				(error: SkillParseError) => {
					assert.ok(error.message.includes('Failed to read file'));
					return true;
				}
			);
		});
	});

	suite('validateSkillFormat', () => {

		test('should return true for valid skill format', async () => {
			const validContent = `---
name: valid-skill
description: Valid skill format
---

# Content`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(validContent) } as any;
			};

			const result = await parser.validateSkillFormat('/path/to/skill/SKILL.md');

			assert.strictEqual(result, true);
		});

		test('should return false for invalid skill format', async () => {
			const invalidContent = `# No frontmatter here`;

			mockFileService.readFile = async (uri: URI) => {
				return { value: VSBuffer.fromString(invalidContent) } as any;
			};

			const result = await parser.validateSkillFormat('/path/to/skill/SKILL.md');

			assert.strictEqual(result, false);
		});
	});
});

/**
 * Helper function to create mock file service
 */
function createMockFileService(): IFileService {
	return {
		readFile: async (uri: URI) => {
			return { value: VSBuffer.fromString('') } as any;
		},
		stat: async (uri: URI) => {
			return {
				isFile: true,
				isDirectory: false,
				isSymbolicLink: false,
				size: 100,
				mtime: Date.now(),
				ctime: Date.now()
			} as any;
		}
	} as any;
}

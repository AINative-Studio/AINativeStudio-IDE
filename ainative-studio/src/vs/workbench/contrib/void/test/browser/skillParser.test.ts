/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';

/**
 * Test suite for Skills Manager - Skill Parser
 *
 * Phase 1: Core Parser Testing
 * Coverage Target: >= 95%
 */

// Mock interfaces until actual implementation exists
interface ISkillMetadata {
	name: string;
	description: string;
	version: string;
	author?: string;
	tags?: string[];
	dependencies?: string[];
}

interface ISkill extends ISkillMetadata {
	content: string;
}

interface ISkillParseResult {
	success: boolean;
	skill?: ISkill;
	error?: string;
}

// Mock parser implementation for testing structure
class SkillParser {
	async parse(filePath: string): Promise<ISkillParseResult> {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented - to be implemented in Phase 1');
	}

	parseContent(content: string): ISkillParseResult {
		// TODO: Replace with actual implementation
		throw new Error('Not implemented - to be implemented in Phase 1');
	}

	private __extractFrontmatter(content: string): { frontmatter: string; body: string } | null {
		// TODO: Implementation
		throw new Error('Not implemented');
	}

	private __parseYaml(yaml: string): ISkillMetadata {
		// TODO: Implementation
		throw new Error('Not implemented');
	}

	private __validateMetadata(metadata: Partial<ISkillMetadata>): string[] {
		// TODO: Implementation
		throw new Error('Not implemented');
	}
}

suite('Skills Manager - Skill Parser', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	const fixturesPath = join(__dirname, '../../../../../../test/fixtures/skills');
	let parser: SkillParser;

	setup(() => {
		parser = new SkillParser();
	});

	/**
	 * Valid Skill File Parsing Tests
	 */
	suite('Valid Skill Parsing', () => {

		test('should parse simple skill file correctly', async () => {
			// Given: A well-formed skill file with complete frontmatter
			const skillPath = join(fixturesPath, 'valid/simple-skill.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should extract all metadata and content correctly
			assert.strictEqual(result.success, true, 'Parsing should succeed');
			assert.ok(result.skill, 'Skill should be defined');
			assert.strictEqual(result.skill.name, 'test-skill-simple');
			assert.strictEqual(result.skill.version, '1.0.0');
			assert.ok(result.skill.description, 'Description should be present');
			assert.ok(Array.isArray(result.skill.tags), 'Tags should be an array');
			assert.ok(result.skill.content.includes('Simple Test Skill'), 'Content should be extracted');
		});

		test('should parse skill with dependencies', async () => {
			// Given: Skill with dependency declarations
			const skillPath = join(fixturesPath, 'valid/skill-with-dependencies.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should create valid dependency list
			assert.strictEqual(result.success, true);
			assert.ok(result.skill, 'Skill should be defined');
			assert.ok(Array.isArray(result.skill.dependencies), 'Dependencies should be an array');
			assert.ok(result.skill.dependencies!.length > 0, 'Should have dependencies');
			assert.ok(result.skill.dependencies!.includes('test-skill-simple'));
		});

		test('should parse skill with multiple tags', async () => {
			// Given: Skill with various tags
			const skillPath = join(fixturesPath, 'valid/skill-with-tags.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should extract all tags
			assert.strictEqual(result.success, true);
			assert.ok(result.skill, 'Skill should be defined');
			assert.ok(result.skill.tags!.length >= 5, 'Should have multiple tags');
			assert.ok(result.skill.tags!.includes('testing'));
			assert.ok(result.skill.tags!.includes('search'));
		});

		test('should handle Unicode content correctly', async () => {
			// Given: Skill with Unicode characters (emojis, CJK, RTL)
			const skillPath = join(fixturesPath, 'valid/skill-unicode.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should preserve all Unicode correctly
			assert.strictEqual(result.success, true);
			assert.ok(result.skill, 'Skill should be defined');
			assert.ok(result.skill.description.includes('测试技能'));
			assert.ok(result.skill.description.includes('🚀'));
			assert.ok(result.skill.content.includes('欢迎'));
		});

		test('should normalize tags to lowercase', async () => {
			// Given: Tags with mixed case
			const content = `---
name: test-normalization
description: Test tag normalization
version: 1.0.0
tags: [Testing, UPPERCASE, MixedCase]
---
# Test`;

			// When: Parser processes content
			const result = parser.parseContent(content);

			// Then: Tags should be normalized to lowercase
			assert.strictEqual(result.success, true);
			assert.ok(result.skill?.tags!.every(tag => tag === tag.toLowerCase()));
		});

		test('should handle optional metadata fields', async () => {
			// Given: Skill with minimal required fields
			const content = `---
name: minimal-skill
description: Minimal metadata
version: 1.0.0
---
# Minimal Skill`;

			// When: Parser processes content
			const result = parser.parseContent(content);

			// Then: Should succeed with defaults for optional fields
			assert.strictEqual(result.success, true);
			assert.ok(result.skill);
			assert.strictEqual(result.skill.name, 'minimal-skill');
			assert.ok(Array.isArray(result.skill.tags));
			assert.ok(Array.isArray(result.skill.dependencies));
		});
	});

	/**
	 * Invalid Skill File Handling Tests
	 */
	suite('Invalid Skill Handling', () => {

		test('should reject skill without frontmatter', async () => {
			// Given: A markdown file without frontmatter delimiters
			const skillPath = join(fixturesPath, 'invalid/missing-frontmatter.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should return error with specific message
			assert.strictEqual(result.success, false, 'Parsing should fail');
			assert.ok(result.error, 'Error message should be present');
			assert.ok(result.error.includes('frontmatter'), 'Error should mention frontmatter');
		});

		test('should reject skill with invalid YAML', async () => {
			// Given: Frontmatter with invalid YAML syntax
			const skillPath = join(fixturesPath, 'invalid/invalid-yaml.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should return descriptive parsing error
			assert.strictEqual(result.success, false);
			assert.ok(result.error, 'Error message should be present');
			assert.ok(result.error.toLowerCase().includes('yaml') || result.error.includes('syntax'));
		});

		test('should reject skill missing required fields', async () => {
			// Given: Frontmatter missing required fields (description, version)
			const skillPath = join(fixturesPath, 'invalid/missing-required-fields.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should return validation error listing missing fields
			assert.strictEqual(result.success, false);
			assert.ok(result.error, 'Error message should be present');
			assert.ok(result.error.includes('description') || result.error.includes('version'));
		});

		test('should validate version format', async () => {
			// Given: Various version formats
			const invalidVersions = ['1', 'v1.0', '1.0.0.0', 'latest', 'abc'];

			for (const version of invalidVersions) {
				const content = `---
name: test-version
description: Test version validation
version: ${version}
---
# Test`;

				// When: Parser validates version
				const result = parser.parseContent(content);

				// Then: Should reject invalid semver
				assert.strictEqual(result.success, false, `Should reject version: ${version}`);
			}
		});

		test('should validate skill name format', async () => {
			// Given: Invalid skill names
			const invalidNames = ['', 'skill with spaces', 'skill/slash', '../traversal', 'UPPERCASE'];

			for (const name of invalidNames) {
				const content = `---
name: ${name}
description: Test name validation
version: 1.0.0
---
# Test`;

				// When: Parser validates name
				const result = parser.parseContent(content);

				// Then: Should reject invalid names
				assert.strictEqual(result.success, false, `Should reject name: ${name}`);
			}
		});
	});

	/**
	 * Edge Case Tests
	 */
	suite('Edge Cases', () => {

		test('should handle empty file', async () => {
			// Given: Completely empty file
			const skillPath = join(fixturesPath, 'edge-cases/empty-file.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should handle gracefully with error
			assert.strictEqual(result.success, false);
			assert.ok(result.error);
		});

		test('should handle skill with no content', async () => {
			// Given: Frontmatter only, no content
			const skillPath = join(fixturesPath, 'edge-cases/no-content.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should accept (content is optional)
			assert.strictEqual(result.success, true);
			assert.ok(result.skill);
			assert.strictEqual(result.skill.content.trim(), '');
		});

		test('should handle special markdown characters', async () => {
			// Given: Skill content with special markdown characters
			const skillPath = join(fixturesPath, 'edge-cases/special-characters.md');

			// When: Parser processes the file
			const result = await parser.parse(skillPath);

			// Then: Should preserve all special characters correctly
			assert.strictEqual(result.success, true);
			assert.ok(result.skill);
			assert.ok(result.skill.content.includes('*'));
			assert.ok(result.skill.content.includes('['));
			assert.ok(result.skill.content.includes('\\'));
		});

		test('should handle large files efficiently', async function () {
			// Given: Skill file > 100KB in size
			this.timeout(5000); // Allow 5 seconds max
			const skillPath = join(fixturesPath, 'edge-cases/large-file.md');

			// When: Parser processes the file
			const startTime = Date.now();
			const result = await parser.parse(skillPath);
			const duration = Date.now() - startTime;

			// Then: Should handle without memory issues or timeout
			assert.strictEqual(result.success, true);
			assert.ok(duration < 1000, `Large file parsing took ${duration}ms, expected < 1000ms`);
		});

		test('should handle different line endings', async () => {
			// Given: Skills with different line endings (CRLF, LF)
			const contentLF = `---\nname: test-lf\ndescription: LF endings\nversion: 1.0.0\n---\n# Test`;
			const contentCRLF = `---\r\nname: test-crlf\r\ndescription: CRLF endings\r\nversion: 1.0.0\r\n---\r\n# Test`;

			// When: Parser processes both
			const resultLF = parser.parseContent(contentLF);
			const resultCRLF = parser.parseContent(contentCRLF);

			// Then: Both should parse successfully
			assert.strictEqual(resultLF.success, true);
			assert.strictEqual(resultCRLF.success, true);
			assert.strictEqual(resultLF.skill?.name, 'test-lf');
			assert.strictEqual(resultCRLF.skill?.name, 'test-crlf');
		});

		test('should handle very long lines', async () => {
			// Given: Content with extremely long line (> 10,000 characters)
			const longLine = 'x'.repeat(15000);
			const content = `---
name: test-long-line
description: Long line test
version: 1.0.0
---
# Test
${longLine}`;

			// When: Parser processes content
			const result = parser.parseContent(content);

			// Then: Should handle without issues
			assert.strictEqual(result.success, true);
			assert.ok(result.skill?.content.includes(longLine));
		});
	});

	/**
	 * Performance Tests
	 */
	suite('Performance', () => {

		test('should parse single skill in < 10ms', async () => {
			// Given: Simple skill file
			const skillPath = join(fixturesPath, 'valid/simple-skill.md');

			// When: Measure parse time
			const startTime = performance.now();
			await parser.parse(skillPath);
			const duration = performance.now() - startTime;

			// Then: Should complete in < 10ms
			assert.ok(duration < 10, `Parsing took ${duration}ms, expected < 10ms`);
		});

		test('should parse 100 skills in < 100ms', async () => {
			// Given: 100 skill parsing operations
			const skillPath = join(fixturesPath, 'valid/simple-skill.md');
			const content = await readFile(skillPath, 'utf-8');

			// When: Parse same skill 100 times
			const startTime = performance.now();
			for (let i = 0; i < 100; i++) {
				parser.parseContent(content);
			}
			const duration = performance.now() - startTime;

			// Then: Should complete in < 100ms
			assert.ok(duration < 100, `100 parses took ${duration}ms, expected < 100ms`);
		});
	});

	/**
	 * Security Tests
	 */
	suite('Security', () => {

		test('should prevent path traversal in skill names', async () => {
			// Given: Malicious skill name with path traversal
			const content = `---
name: ../../../etc/passwd
description: Malicious skill
version: 1.0.0
---
# Test`;

			// When: Parser processes content
			const result = parser.parseContent(content);

			// Then: Should reject
			assert.strictEqual(result.success, false);
			assert.ok(result.error);
		});

		test('should not execute code in frontmatter', async () => {
			// Given: Frontmatter with potential code injection
			const content = `---
name: test-injection
description: "$(whoami)"
version: 1.0.0
eval: "require('child_process').execSync('ls')"
---
# Test`;

			// When: Parser processes content
			const result = parser.parseContent(content);

			// Then: Should safely parse without execution
			assert.strictEqual(result.success, true);
			assert.strictEqual(result.skill?.description, '$(whoami)');
			// eval field should be ignored
			assert.ok(!('eval' in (result.skill as any)));
		});
	});
});

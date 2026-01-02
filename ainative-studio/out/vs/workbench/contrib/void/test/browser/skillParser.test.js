/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
// Mock parser implementation for testing structure
class SkillParser {
    async parse(filePath) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented - to be implemented in Phase 1');
    }
    parseContent(content) {
        // TODO: Replace with actual implementation
        throw new Error('Not implemented - to be implemented in Phase 1');
    }
    ___extractFrontmatter(content) {
        // TODO: Implementation
        throw new Error('Not implemented');
    }
    ___parseYaml(yaml) {
        // TODO: Implementation
        throw new Error('Not implemented');
    }
    ___validateMetadata(metadata) {
        // TODO: Implementation
        throw new Error('Not implemented');
    }
}
suite('Skills Manager - Skill Parser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const fixturesPath = join(__dirname, '../../../../../../test/fixtures/skills');
    let parser;
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
            assert.ok(result.skill.dependencies.length > 0, 'Should have dependencies');
            assert.ok(result.skill.dependencies.includes('test-skill-simple'));
        });
        test('should parse skill with multiple tags', async () => {
            // Given: Skill with various tags
            const skillPath = join(fixturesPath, 'valid/skill-with-tags.md');
            // When: Parser processes the file
            const result = await parser.parse(skillPath);
            // Then: Should extract all tags
            assert.strictEqual(result.success, true);
            assert.ok(result.skill, 'Skill should be defined');
            assert.ok(result.skill.tags.length >= 5, 'Should have multiple tags');
            assert.ok(result.skill.tags.includes('testing'));
            assert.ok(result.skill.tags.includes('search'));
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
            assert.ok(result.skill?.tags.every(tag => tag === tag.toLowerCase()));
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
            assert.ok(!('eval' in result.skill));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxQYXJzZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC90ZXN0L2Jyb3dzZXIvc2tpbGxQYXJzZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBNkJuRyxtREFBbUQ7QUFDbkQsTUFBTSxXQUFXO0lBQ2hCLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBZ0I7UUFDM0IsMkNBQTJDO1FBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQWU7UUFDM0IsMkNBQTJDO1FBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBZTtRQUM1Qyx1QkFBdUI7UUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTyxZQUFZLENBQUMsSUFBWTtRQUNoQyx1QkFBdUI7UUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxRQUFpQztRQUM1RCx1QkFBdUI7UUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQywrQkFBK0Is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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { SkillParser } from '../../../common/skills/skillParser.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
/**
 * Unit Tests for SkillParser
 * Following BDD style (describe/it) and TDD principles
 * Coverage target: 100% for core parsing logic
 */
suite('SkillParser', () => {
    let parser;
    let mockFileService;
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
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(validSkillContent) };
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
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(invalidContent) };
            };
            await assert.rejects(async () => await parser.parseSkillFile('/path/to/skill/SKILL.md'), (error) => {
                assert.ok(error.message.includes('missing YAML frontmatter'));
                return true;
            });
        });
        test('should throw error on missing name field', async () => {
            const contentWithoutName = `---
description: Missing name field
---

# Test Skill`;
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(contentWithoutName) };
            };
            await assert.rejects(async () => await parser.parseSkillFile('/path/to/skill/SKILL.md'), (error) => {
                assert.ok(error.message.includes('name') || error.message.includes('required'));
                return true;
            });
        });
        test('should throw error on missing description field', async () => {
            const contentWithoutDescription = `---
name: test-skill
---

# Test Skill`;
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(contentWithoutDescription) };
            };
            await assert.rejects(async () => await parser.parseSkillFile('/path/to/skill/SKILL.md'), (error) => {
                assert.ok(error.message.includes('description') || error.message.includes('required'));
                return true;
            });
        });
        test('should parse skills with tags array', async () => {
            const contentWithTags = `---
name: test-skill
description: Test skill with tags
tags: [testing, unit-test, bdd]
---

# Test Skill`;
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(contentWithTags) };
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
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(contentWithEmptyBody) };
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
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(malformedYaml) };
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
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(contentWithCorrectTypes) };
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
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(contentWithQuotes) };
            };
            const result = await parser.parseSkillFile('/path/to/skill/SKILL.md');
            assert.strictEqual(result.metadata.name, 'test-skill-quoted');
            assert.strictEqual(result.metadata.description, 'Single quoted description');
            assert.strictEqual(result.metadata.author, 'Test Author');
        });
        test('should handle file read errors', async () => {
            mockFileService.readFile = async (uri) => {
                throw new Error('File not found');
            };
            await assert.rejects(async () => await parser.parseSkillFile('/path/to/nonexistent/SKILL.md'), (error) => {
                assert.ok(error.message.includes('Failed to read file'));
                return true;
            });
        });
    });
    suite('validateSkillFormat', () => {
        test('should return true for valid skill format', async () => {
            const validContent = `---
name: valid-skill
description: Valid skill format
---

# Content`;
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(validContent) };
            };
            const result = await parser.validateSkillFormat('/path/to/skill/SKILL.md');
            assert.strictEqual(result, true);
        });
        test('should return false for invalid skill format', async () => {
            const invalidContent = `# No frontmatter here`;
            mockFileService.readFile = async (uri) => {
                return { value: VSBuffer.fromString(invalidContent) };
            };
            const result = await parser.validateSkillFormat('/path/to/skill/SKILL.md');
            assert.strictEqual(result, false);
        });
    });
});
/**
 * Helper function to create mock file service
 */
function createMockFileService() {
    return {
        readFile: async (uri) => {
            return { value: VSBuffer.fromString('') };
        },
        stat: async (uri) => {
            return {
                isFile: true,
                isDirectory: false,
                isSymbolicLink: false,
                size: 100,
                mtime: Date.now(),
                ctime: Date.now()
            };
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxQYXJzZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxzL3NraWxsUGFyc2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBSXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuRTs7OztHQUlHO0FBQ0gsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFFekIsSUFBSSxNQUFtQixDQUFDO0lBQ3hCLElBQUksZUFBNkIsQ0FBQztJQUVsQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsMkJBQTJCO1FBQzNCLGVBQWUsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1FBQzFDLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBRTVCLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvRCxNQUFNLGlCQUFpQixHQUFHOzs7Ozs7Ozs7Z0NBU0csQ0FBQztZQUU5QixlQUFlLENBQUMsUUFBUSxHQUFHLEtBQUssRUFBRSxHQUFRLEVBQUUsRUFBRTtnQkFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQVMsQ0FBQztZQUNqRSxDQUFDLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUV0RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsK0JBQStCLENBQUMsQ0FBQztZQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELE1BQU0sY0FBYyxHQUFHOzttQ0FFUyxDQUFDO1lBRWpDLGVBQWUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQVMsQ0FBQztZQUM5RCxDQUFDLENBQUM7WUFFRixNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQ25CLEtBQUssSUFBSSxFQUFFLENBQUMsTUFBTSxNQUFNLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLEVBQ2xFLENBQUMsS0FBc0IsRUFBRSxFQUFFO2dCQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztnQkFDOUQsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDLENBQ0QsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzNELE1BQU0sa0JBQWtCLEdBQUc7Ozs7YUFJakIsQ0FBQztZQUVYLGVBQWUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsRUFBUyxDQUFDO1lBQ2xFLENBQUMsQ0FBQztZQUVGLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FDbkIsS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsRUFDbEUsQ0FBQyxLQUFzQixFQUFFLEVBQUU7Z0JBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDaEYsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDLENBQ0QsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2xFLE1BQU0seUJBQXlCLEdBQUc7Ozs7YUFJeEIsQ0FBQztZQUVYLGVBQWUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsRUFBUyxDQUFDO1lBQ3pFLENBQUMsQ0FBQztZQUVGLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FDbkIsS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsRUFDbEUsQ0FBQyxLQUFzQixFQUFFLEVBQUU7Z0JBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDdkYsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDLENBQ0QsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RELE1BQU0sZUFBZSxHQUFHOzs7Ozs7YUFNZCxDQUFDO1lBRVgsZUFBZSxDQUFDLFFBQVEsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7Z0JBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsRUFBUyxDQUFDO1lBQy9ELENBQUMsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBRXRFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuRCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwQkFBMEIsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMzQyxNQUFNLG9CQUFvQixHQUFHOzs7OztDQUsvQixDQUFDO1lBRUMsZUFBZSxDQUFDLFFBQVEsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7Z0JBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFTLENBQUM7WUFDcEUsQ0FBQyxDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQUM7WUFFdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUQsTUFBTSxhQUFhLEdBQUc7Ozs7O09BS2xCLENBQUM7WUFFTCxlQUFlLENBQUMsUUFBUSxHQUFHLEtBQUssRUFBRSxHQUFRLEVBQUUsRUFBRTtnQkFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFTLENBQUM7WUFDN0QsQ0FBQyxDQUFDO1lBRUYsMkRBQTJEO1lBQzNELE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEYsTUFBTSx1QkFBdUIsR0FBRzs7Ozs7O09BTTVCLENBQUM7WUFFTCxlQUFlLENBQUMsUUFBUSxHQUFHLEtBQUssRUFBRSxHQUFRLEVBQUUsRUFBRTtnQkFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQVMsQ0FBQztZQUN2RSxDQUFDLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUV0RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pELE1BQU0saUJBQWlCLEdBQUc7Ozs7OztPQU10QixDQUFDO1lBRUwsZUFBZSxDQUFDLFFBQVEsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7Z0JBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFTLENBQUM7WUFDakUsQ0FBQyxDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQUM7WUFFdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztZQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2pELGVBQWUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDbkMsQ0FBQyxDQUFDO1lBRUYsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUNuQixLQUFLLElBQUksRUFBRSxDQUFDLE1BQU0sTUFBTSxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxFQUN4RSxDQUFDLEtBQXNCLEVBQUUsRUFBRTtnQkFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQyxDQUNELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUVqQyxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsTUFBTSxZQUFZLEdBQUc7Ozs7O1VBS2QsQ0FBQztZQUVSLGVBQWUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQVMsQ0FBQztZQUM1RCxDQUFDLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBRTNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9ELE1BQU0sY0FBYyxHQUFHLHVCQUF1QixDQUFDO1lBRS9DLGVBQWUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO2dCQUM3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQVMsQ0FBQztZQUM5RCxDQUFDLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBRTNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVIOztHQUVHO0FBQ0gsU0FBUyxxQkFBcUI7SUFDN0IsT0FBTztRQUNOLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFTLENBQUM7UUFDbEQsQ0FBQztRQUNELElBQUksRUFBRSxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDeEIsT0FBTztnQkFDTixNQUFNLEVBQUUsSUFBSTtnQkFDWixXQUFXLEVBQUUsS0FBSztnQkFDbEIsY0FBYyxFQUFFLEtBQUs7Z0JBQ3JCLElBQUksRUFBRSxHQUFHO2dCQUNULEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTthQUNWLENBQUM7UUFDVixDQUFDO0tBQ00sQ0FBQztBQUNWLENBQUMifQ==
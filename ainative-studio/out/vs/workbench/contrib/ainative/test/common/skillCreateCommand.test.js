/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { validateSkillName, executeCreateCommand } from '../../common/skills/cli/createCommand.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
/**
 * Mock File Service for testing
 */
// @ts-expect-error - Mock service for testing, return type handled at runtime
class MockFileService {
    constructor() {
        this.files = new Map();
        this.directories = new Set();
    }
    async resolve(uri) {
        if (this.directories.has(uri.fsPath)) {
            return { isDirectory: true };
        }
        if (this.files.has(uri.fsPath)) {
            return { isFile: true };
        }
        throw new Error('File not found');
    }
    async createFolder(uri) {
        this.directories.add(uri.fsPath);
    }
    async writeFile(uri, content) {
        this.files.set(uri.fsPath, content.toString());
    }
    async readFile(uri) {
        const content = this.files.get(uri.fsPath);
        if (!content) {
            throw new Error('File not found');
        }
        return { value: VSBuffer.fromString(content) };
    }
    getFiles() {
        return this.files;
    }
    getDirectories() {
        return this.directories;
    }
    reset() {
        this.files.clear();
        this.directories.clear();
    }
}
/**
 * Mock Native Environment Service for testing
 */
class MockNativeEnvironmentService {
    constructor() {
        this.userHome = URI.file('/home/testuser');
    }
}
suite('Skill Create Command', () => {
    let mockFileService;
    let mockEnvService;
    setup(() => {
        mockFileService = new MockFileService();
        mockEnvService = new MockNativeEnvironmentService();
    });
    suite('Skill Name Validation', () => {
        test('should accept valid skill names', () => {
            const validNames = [
                'my-skill',
                'test123',
                'awesome-skill-v2',
                'a',
                'skill-1-2-3'
            ];
            for (const name of validNames) {
                const result = validateSkillName(name);
                assert.strictEqual(result.valid, true, `"${name}" should be valid`);
            }
        });
        test('should reject empty skill name', () => {
            const result = validateSkillName('');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('empty'), 'Error should mention empty name');
        });
        test('should reject uppercase letters', () => {
            const result = validateSkillName('MySkill');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('lowercase'), 'Error should mention lowercase requirement');
        });
        test('should reject special characters', () => {
            const invalidNames = [
                'my_skill',
                'skill@test',
                'skill.name',
                'skill!',
                'skill name' // space
            ];
            for (const name of invalidNames) {
                const result = validateSkillName(name);
                assert.strictEqual(result.valid, false, `"${name}" should be invalid`);
            }
        });
        test('should reject leading hyphen', () => {
            const result = validateSkillName('-my-skill');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('start'), 'Error should mention leading hyphen');
        });
        test('should reject trailing hyphen', () => {
            const result = validateSkillName('my-skill-');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('end'), 'Error should mention trailing hyphen');
        });
        test('should reject consecutive hyphens', () => {
            const result = validateSkillName('my--skill');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('consecutive'), 'Error should mention consecutive hyphens');
        });
    });
    suite('Skill Creation', () => {
        test('should create skill with proper directory structure', async () => {
            // Act
            const result = await executeCreateCommand('test-skill', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, true, 'Creation should succeed');
            assert.strictEqual(result.skillName, 'test-skill');
            assert.ok(result.skillPath.includes('test-skill'), 'Path should include skill name');
            // Check directories
            const dirs = mockFileService.getDirectories();
            assert.ok(Array.from(dirs).some(d => d.includes('.ainative/skills/test-skill')), 'Main skill directory should be created');
            assert.ok(Array.from(dirs).some(d => d.includes('test-skill/references')), 'References directory should be created');
            assert.ok(Array.from(dirs).some(d => d.includes('test-skill/scripts')), 'Scripts directory should be created');
            assert.ok(Array.from(dirs).some(d => d.includes('test-skill/assets')), 'Assets directory should be created');
        });
        test('should create SKILL.md with correct content', async () => {
            // Act
            const result = await executeCreateCommand('my-awesome-skill', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, true);
            const files = mockFileService.getFiles();
            const skillMdEntry = Array.from(files.entries()).find(([path]) => path.includes('SKILL.md') && path.includes('my-awesome-skill'));
            assert.ok(skillMdEntry, 'SKILL.md should be created');
            const [, content] = skillMdEntry;
            assert.ok(content.includes('name: my-awesome-skill'), 'Should include skill name in frontmatter');
            assert.ok(content.includes('version: 1.0.0'), 'Should include version');
            assert.ok(content.includes('# My Awesome Skill'), 'Should include formatted title');
            assert.ok(content.includes('## Overview'), 'Should include Overview section');
            assert.ok(content.includes('## When to Use'), 'Should include When to Use section');
            assert.ok(content.includes('## Examples'), 'Should include Examples section');
        });
        test('should create README files in subdirectories', async () => {
            // Act
            const result = await executeCreateCommand('test-skill', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, true);
            const files = mockFileService.getFiles();
            const filePaths = Array.from(files.keys());
            assert.ok(filePaths.some(p => p.includes('references/README.md')), 'References README should be created');
            assert.ok(filePaths.some(p => p.includes('scripts/README.md')), 'Scripts README should be created');
            assert.ok(filePaths.some(p => p.includes('assets/README.md')), 'Assets README should be created');
        });
        test('should return error if skill already exists', async () => {
            // Arrange - Create skill first time
            await executeCreateCommand('existing-skill', mockFileService, mockEnvService);
            // Act - Try to create again
            const result = await executeCreateCommand('existing-skill', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, false, 'Should fail for existing skill');
            assert.ok(result.output.includes('already exists'), 'Error should mention existing directory');
        });
        test('should return error for invalid skill name', async () => {
            // Act
            const result = await executeCreateCommand('Invalid_Name', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.output.includes('lowercase'), 'Error should mention validation failure');
        });
        test('should include next steps in success output', async () => {
            // Act
            const result = await executeCreateCommand('my-skill', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, true);
            assert.ok(result.output.includes('Successfully created'), 'Should include success message');
            assert.ok(result.output.includes('Next steps:'), 'Should include next steps');
            assert.ok(result.output.includes('Edit SKILL.md'), 'Should mention editing SKILL.md');
            assert.ok(result.output.includes('/skill install'), 'Should mention install command');
            assert.ok(result.output.includes('.mcp.json'), 'Should mention configuration');
        });
        test('should format skill name in title correctly', async () => {
            // Act
            const result = await executeCreateCommand('my-awesome-skill', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, true);
            const files = mockFileService.getFiles();
            const skillMdContent = Array.from(files.values()).find(content => content.includes('# My Awesome Skill'));
            assert.ok(skillMdContent, 'Title should be formatted as "My Awesome Skill"');
        });
        test('should handle single-word skill names', async () => {
            // Act
            const result = await executeCreateCommand('testing', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.skillName, 'testing');
            const files = mockFileService.getFiles();
            const skillMdContent = Array.from(files.values()).find(content => content.includes('name: testing'));
            assert.ok(skillMdContent, 'Should handle single-word names');
            assert.ok(skillMdContent.includes('# Testing'), 'Should capitalize single-word title');
        });
        test('should create skill in correct location', async () => {
            // Act
            const result = await executeCreateCommand('location-test', mockFileService, mockEnvService);
            // Assert
            assert.strictEqual(result.success, true);
            assert.ok(result.skillPath.includes('.ainative/skills/location-test'), 'Should create in .ainative/skills directory');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDcmVhdGVDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3NraWxsQ3JlYXRlQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUd4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEU7O0dBRUc7QUFDSCw4RUFBOEU7QUFDOUUsTUFBTSxlQUFlO0lBQXJCO1FBQ1MsVUFBSyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3ZDLGdCQUFXLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7SUF3QzlDLENBQUM7SUF0Q0EsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFRO1FBQ3JCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUM5QixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ3pCLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBUTtRQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBUSxFQUFFLE9BQWlCO1FBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBUTtRQUN0QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNuQixDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sNEJBQTRCO0lBQWxDO1FBQ0MsYUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN2QyxDQUFDO0NBQUE7QUFFRCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLElBQUksZUFBZ0MsQ0FBQztJQUNyQyxJQUFJLGNBQTRDLENBQUM7SUFFakQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3hDLGNBQWMsR0FBRyxJQUFJLDRCQUE0QixFQUFFLENBQUM7SUFDckQsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7WUFDNUMsTUFBTSxVQUFVLEdBQUc7Z0JBQ2xCLFVBQVU7Z0JBQ1YsU0FBUztnQkFDVCxrQkFBa0I7Z0JBQ2xCLEdBQUc7Z0JBQ0gsYUFBYTthQUNiLENBQUM7WUFFRixLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUMvQixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLElBQUksbUJBQW1CLENBQUMsQ0FBQztZQUNyRSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1lBQzNDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDL0UsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1lBQzVDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLDRDQUE0QyxDQUFDLENBQUM7UUFDOUYsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1lBQzdDLE1BQU0sWUFBWSxHQUFHO2dCQUNwQixVQUFVO2dCQUNWLFlBQVk7Z0JBQ1osWUFBWTtnQkFDWixRQUFRO2dCQUNSLFlBQVksQ0FBQyxRQUFRO2FBQ3JCLENBQUM7WUFFRixLQUFLLE1BQU0sSUFBSSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNqQyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLElBQUkscUJBQXFCLENBQUMsQ0FBQztZQUN4RSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFDbkYsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzFDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7UUFDbEYsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1lBQzlDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7UUFDOUYsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDNUIsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RFLE1BQU07WUFDTixNQUFNLE1BQU0sR0FBRyxNQUFNLG9CQUFvQixDQUN4QyxZQUFZLEVBQ1osZUFBMEMsRUFDMUMsY0FBMkMsQ0FDM0MsQ0FBQztZQUVGLFNBQVM7WUFDVCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLHlCQUF5QixDQUFDLENBQUM7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztZQUVyRixvQkFBb0I7WUFDcEIsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxFQUFFLENBQ1IsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLDZCQUE2QixDQUFDLENBQUMsRUFDckUsd0NBQXdDLENBQ3hDLENBQUM7WUFDRixNQUFNLENBQUMsRUFBRSxDQUNSLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEVBQy9ELHdDQUF3QyxDQUN4QyxDQUFDO1lBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FDUixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxFQUM1RCxxQ0FBcUMsQ0FDckMsQ0FBQztZQUNGLE1BQU0sQ0FBQyxFQUFFLENBQ1IsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFDM0Qsb0NBQW9DLENBQ3BDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RCxNQUFNO1lBQ04sTUFBTSxNQUFNLEdBQUcsTUFBTSxvQkFBb0IsQ0FDeEMsa0JBQWtCLEVBQ2xCLGVBQTBDLEVBQzFDLGNBQTJDLENBQzNDLENBQUM7WUFFRixTQUFTO1lBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRXpDLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUNoRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FDOUQsQ0FBQztZQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLDRCQUE0QixDQUFDLENBQUM7WUFFdEQsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsWUFBYSxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7WUFDbEcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztZQUN4RSxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3BGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLG9DQUFvQyxDQUFDLENBQUM7WUFDcEYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDL0UsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0QsTUFBTTtZQUNOLE1BQU0sTUFBTSxHQUFHLE1BQU0sb0JBQW9CLENBQ3hDLFlBQVksRUFDWixlQUEwQyxFQUMxQyxjQUEyQyxDQUMzQyxDQUFDO1lBRUYsU0FBUztZQUNULE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV6QyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUUzQyxNQUFNLENBQUMsRUFBRSxDQUNSLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFDdkQscUNBQXFDLENBQ3JDLENBQUM7WUFDRixNQUFNLENBQUMsRUFBRSxDQUNSLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFDcEQsa0NBQWtDLENBQ2xDLENBQUM7WUFDRixNQUFNLENBQUMsRUFBRSxDQUNSLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFDbkQsaUNBQWlDLENBQ2pDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RCxvQ0FBb0M7WUFDcEMsTUFBTSxvQkFBb0IsQ0FDekIsZ0JBQWdCLEVBQ2hCLGVBQTBDLEVBQzFDLGNBQTJDLENBQzNDLENBQUM7WUFFRiw0QkFBNEI7WUFDNUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxvQkFBb0IsQ0FDeEMsZ0JBQWdCLEVBQ2hCLGVBQTBDLEVBQzFDLGNBQTJDLENBQzNDLENBQUM7WUFFRixTQUFTO1lBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdELE1BQU07WUFDTixNQUFNLE1BQU0sR0FBRyxNQUFNLG9CQUFvQixDQUN4QyxjQUFjLEVBQ2QsZUFBMEMsRUFDMUMsY0FBMkMsQ0FDM0MsQ0FBQztZQUVGLFNBQVM7WUFDVCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1FBQzNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlELE1BQU07WUFDTixNQUFNLE1BQU0sR0FBRyxNQUFNLG9CQUFvQixDQUN4QyxVQUFVLEVBQ1YsZUFBMEMsRUFDMUMsY0FBMkMsQ0FDM0MsQ0FBQztZQUVGLFNBQVM7WUFDVCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7WUFDNUYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztZQUN0RixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztZQUN0RixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLDhCQUE4QixDQUFDLENBQUM7UUFDaEYsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDOUQsTUFBTTtZQUNOLE1BQU0sTUFBTSxHQUFHLE1BQU0sb0JBQW9CLENBQ3hDLGtCQUFrQixFQUNsQixlQUEwQyxFQUMxQyxjQUEyQyxDQUMzQyxDQUFDO1lBRUYsU0FBUztZQUNULE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV6QyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FDaEUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUN0QyxDQUFDO1lBRUYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsaURBQWlELENBQUMsQ0FBQztRQUM5RSxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4RCxNQUFNO1lBQ04sTUFBTSxNQUFNLEdBQUcsTUFBTSxvQkFBb0IsQ0FDeEMsU0FBUyxFQUNULGVBQTBDLEVBQzFDLGNBQTJDLENBQzNDLENBQUM7WUFFRixTQUFTO1lBQ1QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUVoRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FDaEUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FDakMsQ0FBQztZQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7WUFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFlLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFDekYsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUQsTUFBTTtZQUNOLE1BQU0sTUFBTSxHQUFHLE1BQU0sb0JBQW9CLENBQ3hDLGVBQWUsRUFDZixlQUEwQyxFQUMxQyxjQUEyQyxDQUMzQyxDQUFDO1lBRUYsU0FBUztZQUNULE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsRUFBRSxDQUNSLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxDQUFDLEVBQzNELDZDQUE2QyxDQUM3QyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { validateSkillName, executeCreateCommand } from '../../common/skills/cli/createCommand.js';
import { URI } from '../../../../../base/common/uri.js';
import { FileType } from '../../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
/**
 * Mock File Service for testing
 */
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
        return {
            resource: uri,
            name: uri.path.split('/').pop() || '',
            isFile: false,
            isDirectory: true,
            isSymbolicLink: false,
            mtime: Date.now(),
            ctime: Date.now(),
            etag: 'mock-etag',
            size: 0,
            readonly: false,
            locked: false,
            children: undefined,
            type: FileType.Directory
        };
    }
    async writeFile(uri, content) {
        this.files.set(uri.fsPath, content.toString());
        return {
            resource: uri,
            name: uri.path.split('/').pop() || '',
            isFile: true,
            isDirectory: false,
            isSymbolicLink: false,
            mtime: Date.now(),
            ctime: Date.now(),
            etag: 'mock-etag',
            size: content.byteLength,
            readonly: false,
            locked: false,
            children: undefined,
            type: FileType.File
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDcmVhdGVDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3NraWxsQ3JlYXRlQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQXVDLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTlHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRTs7R0FFRztBQUNILE1BQU0sZUFBZTtJQUFyQjtRQUNTLFVBQUssR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN2QyxnQkFBVyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO0lBc0U5QyxDQUFDO0lBcEVBLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBUTtRQUNyQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDOUIsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUN6QixDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0Is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
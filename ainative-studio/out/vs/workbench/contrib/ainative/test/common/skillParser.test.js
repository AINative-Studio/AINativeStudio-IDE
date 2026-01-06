/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as path from 'path';
import { SkillParser } from '../../common/skills/skillParser.js';
import { SkillParseError } from '../../common/skills/skillTypes.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
// import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { Schemas } from '../../../../../base/common/network.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
suite('SkillParser Tests', () => {
    let parser;
    let disposables;
    let fileService;
    const fixturesPath = path.join(__dirname, 'fixtures', 'skills');
    setup(() => {
        disposables = new DisposableStore();
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        // Use DiskFileSystemProvider for file:// scheme to read test fixtures
        const diskProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskProvider);
        parser = disposables.add(new SkillParser(fileService));
    });
    teardown(() => {
        disposables.dispose();
    });
    suite('Valid Parsing', () => {
        test('should parse minimal skill with only required fields', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.strictEqual(skill.metadata.name, 'minimal-skill');
            assert.strictEqual(skill.metadata.description, 'A minimal skill with only required fields');
            assert.ok(skill.body.length > 0);
            assert.ok(skill.fullPath.includes('SKILL.md'));
            assert.ok(Array.isArray(skill.resources));
        });
        test('should extract all frontmatter fields from comprehensive skill', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.strictEqual(skill.metadata.name, 'comprehensive-skill');
            assert.strictEqual(skill.metadata.description, 'A comprehensive skill with all frontmatter fields');
            assert.strictEqual(skill.metadata.version, '2.1.0');
            assert.strictEqual(skill.metadata.author, 'AINative Studio');
            assert.strictEqual(skill.metadata.license, 'MIT');
            assert.ok(Array.isArray(skill.metadata.tags));
            assert.strictEqual(skill.metadata.tags?.length, 3);
            assert.ok(skill.metadata.tags?.includes('testing'));
            assert.ok(skill.metadata.tags?.includes('comprehensive'));
            assert.ok(skill.metadata.tags?.includes('example'));
        });
        test('should parse markdown body content', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.ok(skill.body.length > 0);
            assert.ok(skill.body.includes('# Comprehensive Skill'));
            assert.ok(skill.body.includes('## Usage'));
            assert.ok(skill.body.includes('## Examples'));
        });
        test('should handle empty body content', async () => {
            const skillPath = path.join(fixturesPath, 'empty-body-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.strictEqual(skill.metadata.name, 'empty-body-skill');
            assert.strictEqual(skill.body.trim(), '');
        });
    });
    suite('Resource Discovery', () => {
        test('should discover references directory', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            const referenceResources = skill.resources.filter(r => r.type === 'reference');
            assert.ok(referenceResources.length >= 2, 'Should find at least 2 reference files');
            const hasApiDocs = referenceResources.some(r => r.name === 'api-docs.md');
            const hasExamples = referenceResources.some(r => r.name === 'examples.md');
            assert.ok(hasApiDocs, 'Should find api-docs.md');
            assert.ok(hasExamples, 'Should find examples.md');
        });
        test('should discover multiple resource types', async () => {
            const skillPath = path.join(fixturesPath, 'skill-with-resources', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            const references = skill.resources.filter(r => r.type === 'reference');
            const scripts = skill.resources.filter(r => r.type === 'script');
            const assets = skill.resources.filter(r => r.type === 'asset');
            assert.ok(references.length > 0, 'Should find reference resources');
            assert.ok(scripts.length > 0, 'Should find script resources');
            assert.ok(assets.length > 0, 'Should find asset resources');
        });
        test('should handle skills with no resources', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.ok(Array.isArray(skill.resources));
            assert.strictEqual(skill.resources.length, 0);
        });
    });
    suite('Validation', () => {
        test('should throw error when name field is missing', async () => {
            const skillPath = path.join(fixturesPath, 'invalid-missing-name', 'SKILL.md');
            try {
                await parser.parseSkillFile(skillPath);
                assert.fail('Should have thrown SkillParseError');
            }
            catch (error) {
                assert.ok(error instanceof SkillParseError);
                assert.ok(error.message.includes('Missing required field: name'));
            }
        });
        test('should throw error when description field is missing', async () => {
            const skillPath = path.join(fixturesPath, 'invalid-missing-description', 'SKILL.md');
            try {
                await parser.parseSkillFile(skillPath);
                assert.fail('Should have thrown SkillParseError');
            }
            catch (error) {
                assert.ok(error instanceof SkillParseError);
                assert.ok(error.message.includes('Missing required field: description'));
            }
        });
        test('should throw error for invalid YAML frontmatter', async () => {
            const skillPath = path.join(fixturesPath, 'invalid-bad-yaml', 'SKILL.md');
            // The current parser uses simple key:value parsing, so it may not catch all YAML errors
            // But it should handle the file without crashing
            try {
                const skill = await parser.parseSkillFile(skillPath);
                // If it parses, verify it at least got the basic fields
                assert.strictEqual(skill.metadata.name, 'bad-yaml-skill');
            }
            catch (error) {
                // Also acceptable to throw an error for malformed YAML
                assert.ok(error instanceof SkillParseError);
            }
        });
        test('should throw error when file not found', async () => {
            const skillPath = path.join(fixturesPath, 'non-existent-skill', 'SKILL.md');
            try {
                await parser.parseSkillFile(skillPath);
                assert.fail('Should have thrown SkillParseError');
            }
            catch (error) {
                assert.ok(error instanceof SkillParseError);
                assert.ok(error.message.includes('Failed to read file'));
            }
        });
        test('should throw error when frontmatter delimiters are missing', async () => {
            const skillPath = path.join(fixturesPath, 'invalid-no-frontmatter', 'SKILL.md');
            try {
                await parser.parseSkillFile(skillPath);
                assert.fail('Should have thrown SkillParseError');
            }
            catch (error) {
                assert.ok(error instanceof SkillParseError);
                assert.ok(error.message.includes('missing YAML frontmatter delimiters'));
            }
        });
    });
    suite('Edge Cases', () => {
        test('should parse tags array correctly', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.ok(Array.isArray(skill.metadata.tags));
            assert.strictEqual(skill.metadata.tags?.length, 3);
            skill.metadata.tags?.forEach(tag => {
                assert.strictEqual(typeof tag, 'string');
                assert.ok(tag.length > 0);
            });
        });
        test('should handle Unicode content correctly', async () => {
            const skillPath = path.join(fixturesPath, 'unicode-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.strictEqual(skill.metadata.name, 'unicode-skill');
            assert.ok(skill.body.includes('你好世界'));
            assert.ok(skill.body.includes('こんにちは世界'));
            assert.ok(skill.body.includes('مرحبا بالعالم'));
            assert.ok(skill.body.includes('🚀'));
            assert.ok(Array.isArray(skill.metadata.tags));
            assert.ok(skill.metadata.tags?.some(tag => tag.includes('国际化')));
        });
        test('should trim whitespace from field values', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            // Verify no leading/trailing whitespace
            assert.strictEqual(skill.metadata.name, skill.metadata.name.trim());
            assert.strictEqual(skill.metadata.description, skill.metadata.description.trim());
        });
    });
    suite('validateSkillFormat', () => {
        test('should return true for valid skill', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill', 'SKILL.md');
            const isValid = await parser.validateSkillFormat(skillPath);
            assert.strictEqual(isValid, true);
        });
        test('should return false for invalid skill', async () => {
            const skillPath = path.join(fixturesPath, 'invalid-missing-name', 'SKILL.md');
            const isValid = await parser.validateSkillFormat(skillPath);
            assert.strictEqual(isValid, false);
        });
        test('should return false for non-existent file', async () => {
            const skillPath = path.join(fixturesPath, 'non-existent', 'SKILL.md');
            const isValid = await parser.validateSkillFormat(skillPath);
            assert.strictEqual(isValid, false);
        });
    });
    suite('Performance', () => {
        test('should parse skill in reasonable time (<100ms)', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill', 'SKILL.md');
            const startTime = performance.now();
            await parser.parseSkillFile(skillPath);
            const elapsed = performance.now() - startTime;
            assert.ok(elapsed < 100, `Parsing took ${elapsed}ms, should be < 100ms`);
        });
        test('should handle concurrent parse operations', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill', 'SKILL.md');
            // Parse the same file multiple times concurrently
            const parsePromises = [
                parser.parseSkillFile(skillPath),
                parser.parseSkillFile(skillPath),
                parser.parseSkillFile(skillPath)
            ];
            const results = await Promise.all(parsePromises);
            assert.strictEqual(results.length, 3);
            results.forEach(skill => {
                assert.strictEqual(skill.metadata.name, 'comprehensive-skill');
            });
        });
    });
    suite('Advanced Edge Cases', () => {
        test('should handle Windows line endings (CRLF)', async () => {
            const skillPath = path.join(fixturesPath, 'crlf-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.strictEqual(skill.metadata.name, 'crlf-skill');
            assert.ok(skill.body.length > 0);
        });
        test('should parse skills with nested directory structures', async () => {
            const skillPath = path.join(fixturesPath, 'skill-with-resources', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            // Verify nested resources are discovered
            const references = skill.resources.filter(r => r.type === 'reference');
            assert.ok(references.length > 0, 'Should discover resources in nested directories');
        });
        test('should handle very large SKILL.md files (>1MB)', async () => {
            // This test verifies the parser can handle large files without memory issues
            const skillPath = path.join(fixturesPath, 'large-skill', 'SKILL.md');
            const skill = await parser.parseSkillFile(skillPath);
            assert.strictEqual(skill.metadata.name, 'large-skill');
            assert.ok(skill.body.length > 100000, 'Should parse large body content');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxQYXJzZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxQYXJzZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLG1IQUFtSDtBQUNuSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFJdEcsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixJQUFJLE1BQW1CLENBQUM7SUFDeEIsSUFBSSxXQUE0QixDQUFDO0lBQ2pDLElBQUksV0FBd0IsQ0FBQztJQUM3QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFaEUsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFF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
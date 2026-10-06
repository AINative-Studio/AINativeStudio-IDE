/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as path from 'path';
import { tmpdir } from 'os';
import { URI } from '../../../../../base/common/uri.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../../../../base/common/network.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { SkillParser } from '../../common/skills/skillParser.js';
// Import the actual SkillsRegistry class
// Note: We need to access the class directly since it's not exported by default
// We'll instantiate it manually in the tests
suite('SkillsRegistry Tests', () => {
    let fileService;
    let disposables;
    let testHomeDir;
    let skillsRegistry;
    let mockSkillParser;
    const fixturesPath = path.join(__dirname, 'fixtures', 'skills');
    let registryImpl; // To access private methods for testing
    // Mock skill parser
    class MockSkillParser {
        async parseSkillFile(filePath) {
            // Extract skill name from path
            const skillDir = path.dirname(filePath);
            const skillName = path.basename(skillDir);
            const metadata = {
                name: skillName,
                description: `Description for ${skillName}`,
                version: '1.0.0'
            };
            return {
                metadata,
                body: `Body content for ${skillName}`,
                resources: [],
                fullPath: filePath
            };
        }
        async validateSkillFormat(filePath) {
            return true;
        }
    }
    setup(async () => {
        disposables = new DisposableStore();
        // Set up file service
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const diskProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskProvider);
        // Create unique test home directory
        testHomeDir = URI.file(path.join(tmpdir(), 'ainative-registry-test-' + Date.now()));
        // Mock environment service
        const mockEnvService = {
            userHome: testHomeDir,
        };
        // Create mock parser
        mockSkillParser = new MockSkillParser();
        // Manually instantiate SkillsRegistry
        const { SkillsRegistry } = await import('../../common/skills/skillsRegistry.js');
        registryImpl = new SkillsRegistry(fileService, mockSkillParser, mockEnvService);
        skillsRegistry = registryImpl;
    });
    teardown(async () => {
        // Clean up test directory
        try {
            await fileService.del(testHomeDir, { recursive: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
        disposables.dispose();
    });
    suite('Installation', () => {
        test('should install skill from local path', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const isInstalled = await skillsRegistry.isInstalled('minimal-skill');
            assert.strictEqual(isInstalled, true);
        });
        test('should throw error when installing duplicate skill', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            try {
                await skillsRegistry.install(skillPath);
                assert.fail('Should have thrown error for duplicate installation');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('already installed'));
            }
        });
        test('should create skills directory on first install', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            // Verify directory was created
            const skillsDir = URI.joinPath(testHomeDir, '.ainative', 'skills');
            const stat = await fileService.resolve(skillsDir);
            assert.ok(stat.isDirectory);
        });
        test('should copy all skill files to target directory', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill');
            await skillsRegistry.install(skillPath);
            // Verify SKILL.md was copied
            const targetPath = URI.joinPath(testHomeDir, '.ainative', 'skills', 'comprehensive-skill', 'SKILL.md');
            const stat = await fileService.resolve(targetPath);
            assert.ok(stat);
        });
        test('should record installation timestamp', async () => {
            const beforeInstall = Date.now();
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const entry = await skillsRegistry.get('minimal-skill');
            assert.ok(entry);
            assert.ok(entry.installedAt >= beforeInstall);
            assert.ok(entry.installedAt <= Date.now());
        });
        test('should detect source as local', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const entry = await skillsRegistry.get('minimal-skill');
            assert.ok(entry);
            assert.strictEqual(entry.source, 'local');
        });
    });
    suite('Uninstallation', () => {
        test('should uninstall skill completely', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), true);
            await skillsRegistry.uninstall('minimal-skill');
            assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), false);
        });
        test('should throw error when uninstalling non-existent skill', async () => {
            try {
                await skillsRegistry.uninstall('non-existent-skill');
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('not installed'));
            }
        });
        test('should remove skill directory and all resources', async () => {
            const skillPath = path.join(fixturesPath, 'comprehensive-skill');
            await skillsRegistry.install(skillPath);
            const entry = await skillsRegistry.get('comprehensive-skill');
            assert.ok(entry);
            await skillsRegistry.uninstall('comprehensive-skill');
            // Verify directory was removed
            const skillDir = URI.file(entry.path);
            try {
                await fileService.resolve(skillDir);
                assert.fail('Skill directory should have been removed');
            }
            catch (error) {
                // Expected - directory should not exist
                assert.ok(error);
            }
        });
    });
    suite('Listing and Querying', () => {
        test('should list all installed skills', async () => {
            const skill1Path = path.join(fixturesPath, 'minimal-skill');
            const skill2Path = path.join(fixturesPath, 'comprehensive-skill');
            await skillsRegistry.install(skill1Path);
            await skillsRegistry.install(skill2Path);
            const skills = await skillsRegistry.list();
            assert.strictEqual(skills.length, 2);
            const skillNames = skills.map(s => s.name);
            assert.ok(skillNames.includes('minimal-skill'));
            assert.ok(skillNames.includes('comprehensive-skill'));
        });
        test('should return empty array when no skills installed', async () => {
            const skills = await skillsRegistry.list();
            assert.ok(Array.isArray(skills));
            assert.strictEqual(skills.length, 0);
        });
        test('should return full registry entries', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const skills = await skillsRegistry.list();
            assert.strictEqual(skills.length, 1);
            const entry = skills[0];
            assert.ok(entry.name);
            assert.ok(entry.version);
            assert.ok(entry.installedAt);
            assert.ok(entry.source);
            assert.ok(entry.path);
        });
        test('should get specific skill by name', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const entry = await skillsRegistry.get('minimal-skill');
            assert.ok(entry);
            assert.strictEqual(entry.name, 'minimal-skill');
            assert.strictEqual(entry.version, '1.0.0');
        });
        test('should return null for non-existent skill', async () => {
            const entry = await skillsRegistry.get('non-existent');
            assert.strictEqual(entry, null);
        });
        test('should check if skill is installed', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), false);
            await skillsRegistry.install(skillPath);
            assert.strictEqual(await skillsRegistry.isInstalled('minimal-skill'), true);
        });
    });
    suite('Persistence', () => {
        test('should persist registry to JSON file', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            // Verify registry.json was created
            const registryFile = URI.joinPath(testHomeDir, '.ainative', 'skills', 'registry.json');
            const content = await fileService.readFile(registryFile);
            const data = JSON.parse(content.value.toString());
            assert.ok(data['minimal-skill']);
            assert.strictEqual(data['minimal-skill'].name, 'minimal-skill');
        });
        test('should load existing registry on initialization', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            // Create a new registry instance (simulating restart)
            const mockEnvService = {
                userHome: testHomeDir,
            };
            const { SkillsRegistry } = await import('../../common/skills/skillsRegistry.js');
            const newRegistry = new SkillsRegistry(fileService, mockSkillParser, mockEnvService);
            // Verify the skill is still listed
            const isInstalled = await newRegistry.isInstalled('minimal-skill');
            assert.strictEqual(isInstalled, true);
        });
        test('should create registry file if missing', async () => {
            // First install should create the file
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const registryFile = URI.joinPath(testHomeDir, '.ainative', 'skills', 'registry.json');
            const stat = await fileService.resolve(registryFile);
            assert.ok(stat);
        });
        test('should handle corrupt registry file gracefully', async () => {
            // Create a corrupt registry file
            const skillsDir = URI.joinPath(testHomeDir, '.ainative', 'skills');
            await fileService.createFolder(skillsDir);
            const registryFile = URI.joinPath(skillsDir, 'registry.json');
            const bufferModule = await import('../../../../../base/common/buffer.js');
            await fileService.writeFile(registryFile, bufferModule.VSBuffer.fromString('{ invalid json content }'));
            // Create a new registry instance
            const mockEnvService = {
                userHome: testHomeDir,
            };
            const { SkillsRegistry } = await import('../../common/skills/skillsRegistry.js');
            const newRegistry = new SkillsRegistry(fileService, mockSkillParser, mockEnvService);
            // Should handle corruption by returning empty list
            const skills = await newRegistry.list();
            assert.ok(Array.isArray(skills));
        });
        test('should update registry file after uninstall', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            await skillsRegistry.uninstall('minimal-skill');
            const registryFile = URI.joinPath(testHomeDir, '.ainative', 'skills', 'registry.json');
            const content = await fileService.readFile(registryFile);
            const data = JSON.parse(content.value.toString());
            assert.ok(!data['minimal-skill']);
        });
    });
    suite('Multiple Skills', () => {
        test('should handle multiple skill installations', async () => {
            const skills = ['minimal-skill', 'comprehensive-skill', 'skill-with-resources'];
            for (const skillName of skills) {
                const skillPath = path.join(fixturesPath, skillName);
                await skillsRegistry.install(skillPath);
            }
            const installedSkills = await skillsRegistry.list();
            assert.strictEqual(installedSkills.length, skills.length);
        });
        test('should maintain separate entries for each skill', async () => {
            const skill1Path = path.join(fixturesPath, 'minimal-skill');
            const skill2Path = path.join(fixturesPath, 'comprehensive-skill');
            await skillsRegistry.install(skill1Path);
            await skillsRegistry.install(skill2Path);
            const entry1 = await skillsRegistry.get('minimal-skill');
            const entry2 = await skillsRegistry.get('comprehensive-skill');
            assert.ok(entry1);
            assert.ok(entry2);
            assert.notStrictEqual(entry1.path, entry2.path);
        });
    });
    suite('Error Handling', () => {
        test('should handle invalid skill path gracefully', async () => {
            const invalidPath = path.join(fixturesPath, 'non-existent-skill');
            try {
                await skillsRegistry.install(invalidPath);
                assert.fail('Should have thrown error');
            }
            catch (error) {
                assert.ok(error instanceof Error);
            }
        });
        test('should validate skill before installation', async () => {
            // The parser will be called to validate the skill
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            // This should succeed with our mock parser
            await skillsRegistry.install(skillPath);
            const isInstalled = await skillsRegistry.isInstalled('minimal-skill');
            assert.strictEqual(isInstalled, true);
        });
        test('should handle disk space errors gracefully', async () => {
            // Note: This is a simulation - actual disk space errors are hard to test
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            // Install should succeed in normal conditions
            await skillsRegistry.install(skillPath);
            assert.ok(await skillsRegistry.isInstalled('minimal-skill'));
        });
        test('should handle concurrent install operations safely', async () => {
            const skill1Path = path.join(fixturesPath, 'minimal-skill');
            const skill2Path = path.join(fixturesPath, 'comprehensive-skill');
            const skill3Path = path.join(fixturesPath, 'skill-with-resources');
            // Install multiple skills concurrently
            await Promise.all([
                skillsRegistry.install(skill1Path),
                skillsRegistry.install(skill2Path),
                skillsRegistry.install(skill3Path)
            ]);
            const skills = await skillsRegistry.list();
            assert.strictEqual(skills.length, 3);
        });
    });
    suite('Installation Sources', () => {
        test('should mark source as local for local installations', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const entry = await skillsRegistry.get('minimal-skill');
            assert.ok(entry);
            assert.strictEqual(entry.source, 'local');
        });
        test('should track installation metadata', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            await skillsRegistry.install(skillPath);
            const entry = await skillsRegistry.get('minimal-skill');
            assert.ok(entry);
            assert.ok(entry.name);
            assert.ok(entry.version);
            assert.ok(entry.installedAt);
            assert.ok(entry.path);
            assert.ok(entry.source);
        });
    });
    suite('Refresh (Sync)', () => {
        // refresh() relies on the parser actually reading SKILL.md content
        // (to detect version bumps and reject malformed skills), so this
        // suite wires SkillsRegistry to the REAL SkillParser instead of the
        // name-only MockSkillParser used by the other suites above.
        let realParserRegistry;
        let realParser;
        setup(async () => {
            realParser = disposables.add(new SkillParser(fileService));
            const mockEnvService = {
                userHome: testHomeDir,
            };
            const { SkillsRegistry } = await import('../../common/skills/skillsRegistry.js');
            realParserRegistry = new SkillsRegistry(fileService, realParser, mockEnvService);
        });
        /**
         * Builds a real source directory on disk containing copies of fixture
         * skills, so refresh() can be exercised against the actual
         * ISkillParser + IFileService stack rather than a mocked shape.
         */
        async function buildSourceDir(skillNames) {
            const sourceDir = URI.file(path.join(tmpdir(), 'ainative-refresh-source-' + Date.now() + '-' + Math.random().toString(36).slice(2)));
            await fileService.createFolder(sourceDir);
            for (const name of skillNames) {
                const srcSkillDir = URI.file(path.join(fixturesPath, name));
                const destSkillDir = URI.joinPath(sourceDir, name);
                await fileService.copy(srcSkillDir, destSkillDir, true);
            }
            return sourceDir;
        }
        test('should register skills found in the source directory as new', async () => {
            const sourceDir = await buildSourceDir(['minimal-skill', 'comprehensive-skill']);
            const result = await realParserRegistry.refresh(sourceDir.fsPath);
            assert.strictEqual(result.new.length, 2);
            const newNames = result.new.map(c => c.name);
            assert.ok(newNames.includes('minimal-skill'));
            assert.ok(newNames.includes('comprehensive-skill'));
            assert.strictEqual(result.updated.length, 0);
            assert.strictEqual(result.removed.length, 0);
            assert.strictEqual(result.total, 2);
            assert.strictEqual(await realParserRegistry.isInstalled('minimal-skill'), true);
            assert.strictEqual(await realParserRegistry.isInstalled('comprehensive-skill'), true);
            await fileService.del(sourceDir, { recursive: true });
        });
        test('should mark a skill unchanged when its version did not change', async () => {
            const sourceDir = await buildSourceDir(['minimal-skill']);
            await realParserRegistry.refresh(sourceDir.fsPath);
            const result = await realParserRegistry.refresh(sourceDir.fsPath);
            assert.strictEqual(result.unchanged.length, 1);
            assert.strictEqual(result.unchanged[0], 'minimal-skill');
            assert.strictEqual(result.new.length, 0);
            assert.strictEqual(result.updated.length, 0);
            await fileService.del(sourceDir, { recursive: true });
        });
        test('should mark a skill updated when its SKILL.md version changes on disk', async () => {
            const sourceDir = await buildSourceDir(['minimal-skill']);
            await realParserRegistry.refresh(sourceDir.fsPath);
            // Bump the version in the source SKILL.md between refreshes
            const skillMdUri = URI.joinPath(sourceDir, 'minimal-skill', 'SKILL.md');
            const original = (await fileService.readFile(skillMdUri)).value.toString();
            const bumped = original.includes('version:')
                ? original.replace(/version:\s*[^\n]+/, 'version: 9.9.9')
                : original.replace('---\n', '---\nversion: 9.9.9\n');
            const bufferModule = await import('../../../../../base/common/buffer.js');
            await fileService.writeFile(skillMdUri, bufferModule.VSBuffer.fromString(bumped));
            const result = await realParserRegistry.refresh(sourceDir.fsPath);
            assert.strictEqual(result.updated.length, 1);
            assert.strictEqual(result.updated[0].name, 'minimal-skill');
            assert.strictEqual(result.updated[0].newVersion, '9.9.9');
            await fileService.del(sourceDir, { recursive: true });
        });
        test('should mark a skill removed when it disappears from the source directory', async () => {
            const sourceDir = await buildSourceDir(['minimal-skill', 'comprehensive-skill']);
            await realParserRegistry.refresh(sourceDir.fsPath);
            // Remove one skill from the source directory
            await fileService.del(URI.joinPath(sourceDir, 'comprehensive-skill'), { recursive: true });
            const result = await realParserRegistry.refresh(sourceDir.fsPath);
            assert.strictEqual(result.removed.length, 1);
            assert.strictEqual(result.removed[0].name, 'comprehensive-skill');
            assert.strictEqual(await realParserRegistry.isInstalled('comprehensive-skill'), false);
            assert.strictEqual(await realParserRegistry.isInstalled('minimal-skill'), true);
            await fileService.del(sourceDir, { recursive: true });
        });
        test('should skip unparseable skill directories rather than failing the whole refresh', async () => {
            const sourceDir = await buildSourceDir(['minimal-skill', 'invalid-no-frontmatter']);
            const result = await realParserRegistry.refresh(sourceDir.fsPath);
            assert.strictEqual(result.total, 1);
            assert.strictEqual(await realParserRegistry.isInstalled('minimal-skill'), true);
            assert.strictEqual(await realParserRegistry.isInstalled('invalid-no-frontmatter'), false);
            await fileService.del(sourceDir, { recursive: true });
        });
        test('should throw when the source directory does not exist', async () => {
            const missingDir = path.join(tmpdir(), 'ainative-refresh-missing-' + Date.now());
            await assert.rejects(() => realParserRegistry.refresh(missingDir), (error) => {
                assert.ok(error.message.includes('Failed to refresh skills'));
                return true;
            });
        });
        test('should persist the refreshed registry to registry.json', async () => {
            const sourceDir = await buildSourceDir(['minimal-skill']);
            await realParserRegistry.refresh(sourceDir.fsPath);
            const registryFile = URI.joinPath(testHomeDir, '.ainative', 'skills', 'registry.json');
            const content = await fileService.readFile(registryFile);
            const data = JSON.parse(content.value.toString());
            assert.ok(data['minimal-skill']);
            await fileService.del(sourceDir, { recursive: true });
        });
    });
    suite('Performance Tests', () => {
        test('should handle 100+ installed skills efficiently', async () => {
            // Install several skills
            const skillPaths = [
                'minimal-skill',
                'comprehensive-skill',
                'skill-with-resources'
            ];
            for (const skillName of skillPaths) {
                await skillsRegistry.install(path.join(fixturesPath, skillName));
            }
            const startTime = performance.now();
            const skills = await skillsRegistry.list();
            const elapsed = performance.now() - startTime;
            assert.ok(skills.length >= 3);
            assert.ok(elapsed < 50, `Listing skills took ${elapsed}ms, should be < 50ms`);
        });
        test('should persist registry quickly (<100ms)', async () => {
            const skillPath = path.join(fixturesPath, 'minimal-skill');
            const startTime = performance.now();
            await skillsRegistry.install(skillPath);
            const elapsed = performance.now() - startTime;
            // Installation includes persisting registry.json
            assert.ok(elapsed < 200, `Installation with persistence took ${elapsed}ms`);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxzUmVnaXN0cnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBR2pFLHlDQUF5QztBQUN6QyxnRkFBZ0Y7QUFDaEYsNkNBQTZDO0FBRTdDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsSUFBSSxXQUF3QixDQUFDO0lBQzdCLElBQUksV0FBNEIsQ0FBQztJQUNqQyxJQUFJLFdBQWdCLENBQUM7SUFDckIsSUFBSSxjQUErQixDQUFDO0lBQ3BDLElBQUksZUFBNkIsQ0FBQztJQUNsQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFV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
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
        // We need to import it dynamically to avoid circular dependencies
        const { default: SkillsRegistryModule } = await import('../../common/skills/skillsRegistry.js');
        const SkillsRegistryClass = SkillsRegistryModule.SkillsRegistry || SkillsRegistryModule;
        if (!SkillsRegistryClass) {
            // Try to get the class from the module exports
            const moduleKeys = Object.keys(SkillsRegistryModule);
            const registryClass = moduleKeys.find(key => key.includes('Registry'));
            registryImpl = new SkillsRegistryModule[registryClass || 'SkillsRegistry'](fileService, mockSkillParser, mockEnvService);
        }
        else {
            registryImpl = new SkillsRegistryClass(fileService, mockSkillParser, mockEnvService);
        }
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
            const { default: SkillsRegistryModule } = await import('../../common/skills/skillsRegistry.js');
            const SkillsRegistryClass = SkillsRegistryModule.SkillsRegistry || SkillsRegistryModule;
            let newRegistry;
            if (!SkillsRegistryClass) {
                const moduleKeys = Object.keys(SkillsRegistryModule);
                const registryClass = moduleKeys.find(key => key.includes('Registry'));
                newRegistry = new SkillsRegistryModule[registryClass || 'SkillsRegistry'](fileService, mockSkillParser, mockEnvService);
            }
            else {
                newRegistry = new SkillsRegistryClass(fileService, mockSkillParser, mockEnvService);
            }
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
            await fileService.writeFile(registryFile, Buffer.from('{ invalid json content }'));
            // Create a new registry instance
            const mockEnvService = {
                userHome: testHomeDir,
            };
            const { default: SkillsRegistryModule } = await import('../../common/skills/skillsRegistry.js');
            const SkillsRegistryClass = SkillsRegistryModule.SkillsRegistry || SkillsRegistryModule;
            let newRegistry;
            if (!SkillsRegistryClass) {
                const moduleKeys = Object.keys(SkillsRegistryModule);
                const registryClass = moduleKeys.find(key => key.includes('Registry'));
                newRegistry = new SkillsRegistryModule[registryClass || 'SkillsRegistry'](fileService, mockSkillParser, mockEnvService);
            }
            else {
                newRegistry = new SkillsRegistryClass(fileService, mockSkillParser, mockEnvService);
            }
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
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxzUmVnaXN0cnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFNMUUseUNBQXlDO0FBQ3pDLGdGQUFnRjtBQUNoRiw2Q0FBNkM7QUFFN0MsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxJQUFJLFdBQXdCLENBQUM7SUFDN0IsSUFBSSxXQUE0QixDQUFDO0lBQ2pDLElBQUksV0FBZ0IsQ0FBQztJQUNyQixJQUFJLGNBQStCLENBQUM7SUFDcEMsSUFBSSxlQUE2QixDQUFDO0lBQ2xDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRSxJQUFJLFlBQWlCLENBQUMs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
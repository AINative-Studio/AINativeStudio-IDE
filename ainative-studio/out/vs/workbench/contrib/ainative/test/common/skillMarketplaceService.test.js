/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { SkillMarketplaceService } from '../../common/skillMarketplaceServiceImpl.js';
/**
 * Mock Storage Service for testing
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.onDidChangeValue = () => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
    }
    get(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        return this.storage.get(storageKey) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return value === 'true';
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return parseInt(value, 10);
    }
    store(key, value, scope, target) {
        const storageKey = `${scope}:${key}`;
        if (value === undefined || value === null) {
            this.storage.delete(storageKey);
        }
        else {
            this.storage.set(storageKey, String(value));
        }
    }
    remove(key, scope) {
        const storageKey = `${scope}:${key}`;
        this.storage.delete(storageKey);
    }
    keys(scope, target) {
        const prefix = `${scope}:`;
        return Array.from(this.storage.keys())
            .filter(key => key.startsWith(prefix))
            .map(key => key.substring(prefix.length));
    }
    async logStorage() { }
    async migrate() { }
    isNew(scope) { return false; }
    flush() { return Promise.resolve(); }
    async switch() { }
    async hasScope() { return true; }
}
/**
 * Mock Request Service for testing
 */
class MockRequestService {
    constructor() {
        this.responses = new Map();
    }
    setResponse(url, response) {
        this.responses.set(url, response);
    }
    async request(options, token) {
        const response = this.responses.get(options.url);
        if (!response) {
            return {
                res: {
                    statusCode: 404,
                    headers: {},
                },
                stream: (async function* () { })(),
            };
        }
        const buffer = VSBuffer.fromString(JSON.stringify(response));
        const stream = (async function* () {
            yield buffer.buffer;
        })();
        return {
            res: {
                statusCode: 200,
                headers: {},
            },
            stream,
        };
    }
    async resolveProxy(url) {
        return undefined;
    }
}
/**
 * Mock File Service for testing
 */
class MockFileService {
    constructor() {
        this.files = new Map();
    }
    setFile(path, content) {
        this.files.set(path, content);
    }
    async stat(resource) {
        if (this.files.has(resource.path)) {
            return { isDirectory: false };
        }
        throw new Error('File not found');
    }
    async del(resource, options) {
        this.files.delete(resource.path);
    }
}
/**
 * Test helper to create mock skill packages
 */
function createMockSkillPackage(name, version, registry) {
    return {
        name,
        version,
        description: `Test skill ${name}`,
        author: 'Test Author',
        registry,
        tags: ['test', 'mock'],
        files: {
            'skill.md': {
                sha256: 'mock-hash',
                size: 1024,
            },
        },
        metadata: {
            downloads: 100,
            rating: 4.5,
            updated: new Date().toISOString(),
            created: new Date().toISOString(),
        },
    };
}
suite('SkillMarketplaceService - BDD Tests', () => {
    const disposables = new DisposableStore();
    let service;
    let storageService;
    let requestService;
    let fileService;
    let logService;
    setup(() => {
        storageService = new MockStorageService();
        requestService = new MockRequestService();
        fileService = new MockFileService();
        logService = new NullLogService();
        service = new SkillMarketplaceService(fileService, storageService, requestService, logService);
        disposables.add(service);
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // ========================================
    // Feature: Registry Management
    // ========================================
    suite('Feature: Registry Management', () => {
        test('Scenario: Get all configured registries', () => {
            // Given the service is initialized
            // When I request all registries
            const registries = service.getRegistries();
            // Then I should get all three default registries
            strictEqual(registries.length, 3);
            ok(registries.some(r => r.type === 'official'));
            ok(registries.some(r => r.type === 'anthropic'));
            ok(registries.some(r => r.type === 'community'));
        });
        test('Scenario: Get a specific registry', () => {
            // Given the service is initialized
            // When I request the official registry
            const registry = service.getRegistry('official');
            // Then I should get the official registry configuration
            ok(registry);
            strictEqual(registry.type, 'official');
            strictEqual(registry.displayName, 'AINative Official');
            ok(registry.enabled);
        });
        test('Scenario: Update registry configuration', async () => {
            // Given the service is initialized
            // When I disable the community registry
            await service.updateRegistry('community', { enabled: false });
            // Then the community registry should be disabled
            const registry = service.getRegistry('community');
            ok(registry);
            strictEqual(registry.enabled, false);
        });
        test('Scenario: Test registry connectivity', async () => {
            // Given a registry with a health endpoint
            requestService.setResponse('https://registry.ainative.studio/v1/skills/health', { status: 'ok' });
            // When I test the official registry
            const result = await service.testRegistry('official');
            // Then the registry should be connected
            strictEqual(result.connected, true);
            ok(result.latency !== undefined);
        });
        test('Scenario: Test offline registry', async () => {
            // Given no network response
            // When I test the anthropic registry
            const result = await service.testRegistry('anthropic');
            // Then the registry should be disconnected
            strictEqual(result.connected, false);
            ok(result.error !== undefined);
        });
    });
    // ========================================
    // Feature: Skill Discovery
    // ========================================
    suite('Feature: Skill Discovery', () => {
        test('Scenario: Search for skills by name', async () => {
            // Given skills are available in the registry
            const mockResults = [
                {
                    name: 'git-workflow',
                    version: '1.0.0',
                    description: 'Git workflow automation',
                    author: 'AINative',
                    registry: 'official',
                    tags: ['git', 'workflow'],
                    metadata: {
                        downloads: 1000,
                        rating: 4.8,
                        updated: new Date().toISOString(),
                        created: new Date().toISOString(),
                    },
                },
            ];
            requestService.setResponse('https://registry.ainative.studio/v1/skills/search?q=git', mockResults);
            // When I search for "git"
            const results = await service.searchSkills({ query: 'git' });
            // Then I should get matching skills
            ok(results.results.length > 0);
            ok(results.results.some(s => s.name.includes('git')));
        });
        test('Scenario: Search with filters', async () => {
            // Given skills with various tags
            const mockResults = [
                {
                    name: 'git-workflow',
                    version: '1.0.0',
                    description: 'Git workflow',
                    author: 'AINative',
                    registry: 'official',
                    tags: ['git', 'workflow'],
                    metadata: {
                        downloads: 1000,
                        rating: 4.8,
                        updated: new Date().toISOString(),
                        created: new Date().toISOString(),
                    },
                },
            ];
            requestService.setResponse('https://registry.ainative.studio/v1/skills/search?tags=git%2Cworkflow', mockResults);
            // When I search with tag filters
            const results = await service.searchSkills({
                tags: ['git', 'workflow'],
            });
            // Then I should only get skills with those tags
            ok(results.results.every(s => s.tags.includes('git') || s.tags.includes('workflow')));
        });
        test('Scenario: Get skill details', async () => {
            // Given a skill exists in the registry
            const mockSkill = createMockSkillPackage('test-skill', '1.0.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/test-skill', mockSkill);
            // When I request skill details
            const skill = await service.getSkillDetails('test-skill');
            // Then I should get the complete skill package
            ok(skill);
            strictEqual(skill.name, 'test-skill');
            strictEqual(skill.version, '1.0.0');
        });
        test('Scenario: Get skill versions', async () => {
            // Given a skill with multiple versions
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/test-skill/versions', ['1.2.0', '1.1.0', '1.0.0']);
            // When I request available versions
            const versions = await service.getSkillVersions('test-skill');
            // Then I should get all versions sorted by semver
            ok(versions.length === 3);
            strictEqual(versions[0], '1.2.0'); // Newest first
        });
        test('Scenario: Browse skills by tag', async () => {
            // Given skills tagged with "testing"
            const mockResults = [
                {
                    name: 'test-framework',
                    version: '2.0.0',
                    description: 'Testing framework',
                    author: 'AINative',
                    registry: 'official',
                    tags: ['testing', 'quality'],
                    metadata: {
                        downloads: 500,
                        rating: 4.5,
                        updated: new Date().toISOString(),
                        created: new Date().toISOString(),
                    },
                },
            ];
            requestService.setResponse('https://registry.ainative.studio/v1/skills/search?tags=testing', mockResults);
            // When I browse the "testing" tag
            const results = await service.browseByTag('testing');
            // Then I should get all testing-related skills
            ok(results.results.length > 0);
            ok(results.results.every(s => s.tags.includes('testing')));
        });
        test('Scenario: Get all available tags', async () => {
            // Given multiple registries with various tags
            requestService.setResponse('https://registry.ainative.studio/v1/skills/tags', [
                { tag: 'git', count: 10 },
                { tag: 'testing', count: 8 },
            ]);
            // When I request all tags
            const tags = await service.getTags();
            // Then I should get aggregated tags from all registries
            ok(tags.length > 0);
            ok(tags.every(t => t.tag && t.count > 0));
        });
    });
    // ========================================
    // Feature: Skill Installation
    // ========================================
    suite('Feature: Skill Installation', () => {
        test('Scenario: Install a skill successfully', async () => {
            // Given a skill is available
            const mockSkill = createMockSkillPackage('test-skill', '1.0.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/test-skill', mockSkill);
            // When I install the skill
            let progressEvents = [];
            service.onInstallProgress(e => progressEvents.push(e));
            const installed = await service.installSkill('test-skill');
            // Then the skill should be installed
            ok(installed);
            strictEqual(installed.package.name, 'test-skill');
            ok(progressEvents.length > 0);
            ok(progressEvents.some(e => e.step === 'complete'));
        });
        test('Scenario: Install with dependencies', async () => {
            // Given a skill with dependencies
            const dependency = createMockSkillPackage('dependency-skill', '1.0.0', 'official');
            const mainSkill = {
                ...createMockSkillPackage('main-skill', '1.0.0', 'official'),
                dependencies: [
                    { name: 'dependency-skill', version: '^1.0.0' },
                ],
            };
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/main-skill', mainSkill);
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/dependency-skill', dependency);
            // When I install the main skill
            const installed = await service.installSkill('main-skill');
            // Then both the skill and its dependency should be installed
            ok(installed);
            const installedSkills = await service.getInstalledSkills();
            ok(installedSkills.some(s => s.package.name === 'dependency-skill'));
        });
        test('Scenario: Prevent duplicate installation', async () => {
            // Given a skill is already installed
            const mockSkill = createMockSkillPackage('existing-skill', '1.0.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/existing-skill', mockSkill);
            await service.installSkill('existing-skill');
            // When I try to install it again without force
            let errorThrown = false;
            try {
                await service.installSkill('existing-skill');
            }
            catch (error) {
                errorThrown = true;
            }
            // Then an error should be thrown
            ok(errorThrown);
        });
        test('Scenario: Force reinstall', async () => {
            // Given a skill is already installed
            const mockSkill = createMockSkillPackage('reinstall-skill', '1.0.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/reinstall-skill', mockSkill);
            await service.installSkill('reinstall-skill');
            // When I force reinstall
            const reinstalled = await service.installSkill('reinstall-skill', undefined, { force: true });
            // Then the skill should be reinstalled
            ok(reinstalled);
            strictEqual(reinstalled.package.name, 'reinstall-skill');
        });
        test('Scenario: Get installed skills', async () => {
            // Given multiple skills are installed
            const skill1 = createMockSkillPackage('skill-1', '1.0.0', 'official');
            const skill2 = createMockSkillPackage('skill-2', '2.0.0', 'anthropic');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/skill-1', skill1);
            requestService.setResponse('https://registry.anthropic.com/skills/packages/skill-2', skill2);
            await service.installSkill('skill-1');
            await service.installSkill('skill-2', 'anthropic');
            // When I request installed skills
            const installed = await service.getInstalledSkills();
            // Then I should get all installed skills
            strictEqual(installed.length, 2);
            ok(installed.some(s => s.package.name === 'skill-1'));
            ok(installed.some(s => s.package.name === 'skill-2'));
        });
    });
    // ========================================
    // Feature: Skill Updates
    // ========================================
    suite('Feature: Skill Updates', () => {
        test('Scenario: Check for updates', async () => {
            // Given an outdated skill is installed
            const oldSkill = createMockSkillPackage('update-test', '1.0.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/update-test', oldSkill);
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/update-test/versions', ['1.1.0', '1.0.0']);
            await service.installSkill('update-test');
            // When I check for updates
            const updates = await service.checkUpdates();
            // Then I should get available updates
            ok(updates.length > 0);
            const update = updates.find(u => u.name === 'update-test');
            ok(update);
            strictEqual(update.currentVersion, '1.0.0');
            strictEqual(update.latestVersion, '1.1.0');
        });
        test('Scenario: Update a skill', async () => {
            // Given a skill with an available update
            const oldSkill = createMockSkillPackage('update-skill', '1.0.0', 'official');
            const newSkill = createMockSkillPackage('update-skill', '1.1.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/update-skill', oldSkill);
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/update-skill/versions', ['1.1.0', '1.0.0']);
            await service.installSkill('update-skill');
            // Update the response to the new version
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/update-skill', newSkill);
            // When I update the skill
            const updated = await service.updateSkill('update-skill');
            // Then the skill should be updated
            ok(updated);
            strictEqual(updated.package.version, '1.1.0');
        });
        test('Scenario: Pin a skill to prevent updates', async () => {
            // Given a skill is installed
            const skill = createMockSkillPackage('pin-test', '1.0.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/pin-test', skill);
            await service.installSkill('pin-test');
            // When I pin the skill
            await service.pinSkill('pin-test', true);
            // Then the skill should be excluded from update checks
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/pin-test/versions', ['1.1.0', '1.0.0']);
            const updates = await service.checkUpdates();
            const pinUpdate = updates.find(u => u.name === 'pin-test');
            strictEqual(pinUpdate, undefined);
        });
    });
    // ========================================
    // Feature: Dependency Resolution
    // ========================================
    suite('Feature: Dependency Resolution', () => {
        test('Scenario: Resolve simple dependencies', async () => {
            // Given a skill with dependencies
            const depSkill = createMockSkillPackage('dep-1', '1.0.0', 'official');
            const mainSkill = {
                ...createMockSkillPackage('main', '1.0.0', 'official'),
                dependencies: [{ name: 'dep-1', version: '^1.0.0' }],
            };
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/main', mainSkill);
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/dep-1', depSkill);
            // When I resolve dependencies
            const resolution = await service.resolveDependencies('main', '1.0.0');
            // Then I should get the dependency tree
            ok(resolution);
            ok(resolution.tree.length > 0);
            ok(resolution.installOrder.some(i => i.name === 'dep-1'));
        });
        test('Scenario: Detect circular dependencies', async () => {
            // Given two skills that depend on each other
            const skill1 = {
                ...createMockSkillPackage('circular-1', '1.0.0', 'official'),
                dependencies: [{ name: 'circular-2' }],
            };
            const skill2 = {
                ...createMockSkillPackage('circular-2', '1.0.0', 'official'),
                dependencies: [{ name: 'circular-1' }],
            };
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/circular-1', skill1);
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/circular-2', skill2);
            // When I resolve dependencies
            const resolution = await service.resolveDependencies('circular-1', '1.0.0');
            // Then I should get warnings about circular dependencies
            ok(resolution.warnings.length > 0);
            ok(resolution.warnings.some(w => w.includes('Circular dependency')));
        });
        test('Scenario: Validate dependencies', async () => {
            // Given a skill with missing dependencies
            const skill = createMockSkillPackage('validate-test', '1.0.0', 'official');
            skill.dependencies = [{ name: 'missing-dep', version: '^1.0.0' }];
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/validate-test', skill);
            await service.installSkill('validate-test', undefined, { skipDependencies: true });
            // When I validate dependencies
            const validation = await service.validateDependencies('validate-test');
            // Then I should see missing dependencies
            strictEqual(validation.valid, false);
            ok(validation.missing.includes('missing-dep'));
        });
    });
    // ========================================
    // Feature: Skill Validation
    // ========================================
    suite('Feature: Skill Validation', () => {
        test('Scenario: Validate a valid skill package', async () => {
            // Given a properly formatted skill package
            const validSkill = createMockSkillPackage('valid-skill', '1.0.0', 'official');
            // When I validate the package
            const validation = await service.validateSkillPackage(validSkill);
            // Then it should pass validation
            strictEqual(validation.valid, true);
            strictEqual(validation.errors.length, 0);
        });
        test('Scenario: Validate skill with invalid name', async () => {
            // Given a skill with uppercase in name
            const invalidSkill = createMockSkillPackage('Invalid-Name', '1.0.0', 'official');
            // When I validate the package
            const validation = await service.validateSkillPackage(invalidSkill);
            // Then it should fail validation
            strictEqual(validation.valid, false);
            ok(validation.errors.some(e => e.field === 'name'));
        });
        test('Scenario: Validate skill with invalid version', async () => {
            // Given a skill with non-semver version
            const invalidSkill = createMockSkillPackage('test-skill', 'not-a-version', 'official');
            // When I validate the package
            const validation = await service.validateSkillPackage(invalidSkill);
            // Then it should fail validation
            strictEqual(validation.valid, false);
            ok(validation.errors.some(e => e.field === 'version'));
        });
        test('Scenario: Validate skill without main file', async () => {
            // Given a skill without skill.md
            const invalidSkill = createMockSkillPackage('no-main', '1.0.0', 'official');
            invalidSkill.files = {};
            // When I validate the package
            const validation = await service.validateSkillPackage(invalidSkill);
            // Then it should fail validation
            strictEqual(validation.valid, false);
            ok(validation.errors.some(e => e.field === 'files'));
        });
    });
    // ========================================
    // Feature: Cache Management
    // ========================================
    suite('Feature: Cache Management', () => {
        test('Scenario: Cache search results', async () => {
            // Given search results are cached
            const mockResults = [
                {
                    name: 'cached-skill',
                    version: '1.0.0',
                    description: 'Cached skill',
                    author: 'Test',
                    registry: 'official',
                    tags: ['test'],
                    metadata: {
                        downloads: 100,
                        rating: 4.5,
                        updated: new Date().toISOString(),
                        created: new Date().toISOString(),
                    },
                },
            ];
            requestService.setResponse('https://registry.ainative.studio/v1/skills/search?q=test', mockResults);
            // When I search twice
            await service.searchSkills({ query: 'test' });
            const cachedResults = await service.searchSkills({ query: 'test' });
            // Then the second search should use cached results
            ok(cachedResults.results.length > 0);
        });
        test('Scenario: Clear cache', async () => {
            // Given cache has data
            await service.searchSkills({ query: 'test' });
            // When I clear the cache
            await service.clearCache();
            // Then cache should be empty
            const stats = await service.getCacheStats();
            strictEqual(stats.entries, 0);
        });
        test('Scenario: Get cache statistics', async () => {
            // Given some cached data
            const mockResults = [{
                    name: 'test',
                    version: '1.0.0',
                    description: 'Test',
                    author: 'Test',
                    registry: 'official',
                    tags: [],
                    metadata: {
                        downloads: 0,
                        rating: 0,
                        updated: new Date().toISOString(),
                        created: new Date().toISOString(),
                    },
                }];
            requestService.setResponse('https://registry.ainative.studio/v1/skills/search?q=cache-stats', mockResults);
            await service.searchSkills({ query: 'cache-stats' });
            // When I get cache stats
            const stats = await service.getCacheStats();
            // Then I should get cache metrics
            ok(stats.entries > 0);
            ok(stats.size > 0);
        });
    });
    // ========================================
    // Feature: Skill Uninstallation
    // ========================================
    suite('Feature: Skill Uninstallation', () => {
        test('Scenario: Uninstall a skill', async () => {
            // Given a skill is installed
            const skill = createMockSkillPackage('uninstall-test', '1.0.0', 'official');
            requestService.setResponse('https://registry.ainative.studio/v1/skills/packages/uninstall-test', skill);
            await service.installSkill('uninstall-test');
            // When I uninstall the skill
            const result = await service.uninstallSkill('uninstall-test');
            // Then the skill should be removed
            strictEqual(result, true);
            const installed = await service.getInstalledSkill('uninstall-test');
            strictEqual(installed, undefined);
        });
        test('Scenario: Uninstall non-existent skill', async () => {
            // Given a skill is not installed
            // When I try to uninstall it
            const result = await service.uninstallSkill('non-existent');
            // Then it should return false
            strictEqual(result, false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxNYXJrZXRwbGFjZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxNYXJrZXRwbGFjZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBbUIsTUFBTSxRQUFRLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBSW5HLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHdEY7O0dBRUc7QUFDSCxNQUFNLGtCQUFrQjtJQUF4QjtRQUdTLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUU1QyxxQkFBZ0IsR0FBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkQsc0JBQWlCLEdBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELG9CQUFlLEdBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBc0R2RCxDQUFDO0lBbERBLEdBQUcsQ0FBQyxHQUFXLEVB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
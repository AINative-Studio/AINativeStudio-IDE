/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, __deepStrictEqual } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { IRequestService, IRequestContext } from '../../../../../platform/request/common/request.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { SkillMarketplaceService } from '../../common/skillMarketplaceServiceImpl.js';
import { SkillPackage, SkillRegistry, SkillSearchResult } from '../../common/skillMarketplaceTypes.js';

/**
 * Mock Storage Service for testing
 */
class MockStorageService implements IStorageService {
	_serviceBrand: undefined;

	private storage = new Map<string, string>();

	onDidChangeValue: any = () => ({ dispose: () => { } });
	onDidChangeTarget: any = () => ({ dispose: () => { } });
	onWillSaveState: any = () => ({ dispose: () => { } });

	get(key: string, scope: StorageScope): string | undefined;
	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const storageKey = `${scope}:${key}`;
		return this.storage.get(storageKey) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return value === 'true';
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return parseInt(value, 10);
	}

	store(key: string, value: string | boolean | number | undefined | null, scope: StorageScope, target: StorageTarget): void {
		const storageKey = `${scope}:${key}`;
		if (value === undefined || value === null) {
			this.storage.delete(storageKey);
		} else {
			this.storage.set(storageKey, String(value));
		}
	}

	remove(key: string, scope: StorageScope): void {
		const storageKey = `${scope}:${key}`;
		this.storage.delete(storageKey);
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		const prefix = `${scope}:`;
		return Array.from(this.storage.keys())
			.filter(key => key.startsWith(prefix))
			.map(key => key.substring(prefix.length));
	}

	async logStorage(): Promise<void> { }
	async migrate(): Promise<void> { }
	isNew(scope: StorageScope): boolean { return false; }
	flush(): Promise<void> { return Promise.resolve(); }
	async switch(): Promise<void> { }
	async hasScope(): Promise<boolean> { return true; }
}

/**
 * Mock Request Service for testing
 */
class MockRequestService implements IRequestService {
	_serviceBrand: undefined;

	private responses = new Map<string, any>();

	setResponse(url: string, response: any): void {
		this.responses.set(url, response);
	}

	async request(options: any, token: CancellationToken): Promise<IRequestContext> {
		const response = this.responses.get(options.url);

		if (!response) {
			return {
				res: {
					statusCode: 404,
					headers: {},
				},
				stream: (async function* () { })(),
			} as IRequestContext;
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
		} as IRequestContext;
	}

	async resolveProxy(url: string): Promise<string | undefined> {
		return undefined;
	}
}

/**
 * Mock File Service for testing
 */
class MockFileService implements Partial<IFileService> {
	_serviceBrand: undefined;

	private files = new Map<string, any>();

	setFile(path: string, content: any): void {
		this.files.set(path, content);
	}

	async stat(resource: any): Promise<any> {
		if (this.files.has(resource.path)) {
			return { isDirectory: false };
		}
		throw new Error('File not found');
	}

	async del(resource: any, options?: any): Promise<void> {
		this.files.delete(resource.path);
	}
}

/**
 * Test helper to create mock skill packages
 */
function createMockSkillPackage(name: string, version: string, registry: SkillRegistry): SkillPackage {
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
	let service: SkillMarketplaceService;
	let storageService: MockStorageService;
	let requestService: MockRequestService;
	let fileService: MockFileService;
	let logService: ILogService;

	setup(() => {
		storageService = new MockStorageService();
		requestService = new MockRequestService();
		fileService = new MockFileService() as any;
		logService = new NullLogService();

		service = new SkillMarketplaceService(
			fileService as any,
			storageService,
			requestService,
			logService
		);

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
			const mockResults: SkillSearchResult[] = [
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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/search?q=git',
				mockResults
			);

			// When I search for "git"
			const results = await service.searchSkills({ query: 'git' });

			// Then I should get matching skills
			ok(results.results.length > 0);
			ok(results.results.some(s => s.name.includes('git')));
		});

		test('Scenario: Search with filters', async () => {
			// Given skills with various tags
			const mockResults: SkillSearchResult[] = [
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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/search?tags=git%2Cworkflow',
				mockResults
			);

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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/test-skill',
				mockSkill
			);

			// When I request skill details
			const skill = await service.getSkillDetails('test-skill');

			// Then I should get the complete skill package
			ok(skill);
			strictEqual(skill.name, 'test-skill');
			strictEqual(skill.version, '1.0.0');
		});

		test('Scenario: Get skill versions', async () => {
			// Given a skill with multiple versions
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/test-skill/versions',
				['1.2.0', '1.1.0', '1.0.0']
			);

			// When I request available versions
			const versions = await service.getSkillVersions('test-skill');

			// Then I should get all versions sorted by semver
			ok(versions.length === 3);
			strictEqual(versions[0], '1.2.0'); // Newest first
		});

		test('Scenario: Browse skills by tag', async () => {
			// Given skills tagged with "testing"
			const mockResults: SkillSearchResult[] = [
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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/search?tags=testing',
				mockResults
			);

			// When I browse the "testing" tag
			const results = await service.browseByTag('testing');

			// Then I should get all testing-related skills
			ok(results.results.length > 0);
			ok(results.results.every(s => s.tags.includes('testing')));
		});

		test('Scenario: Get all available tags', async () => {
			// Given multiple registries with various tags
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/tags',
				[
					{ tag: 'git', count: 10 },
					{ tag: 'testing', count: 8 },
				]
			);

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
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/test-skill',
				mockSkill
			);

			// When I install the skill
			let progressEvents: any[] = [];
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
			const mainSkill: SkillPackage = {
				...createMockSkillPackage('main-skill', '1.0.0', 'official'),
				dependencies: [
					{ name: 'dependency-skill', version: '^1.0.0' },
				],
			};

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/main-skill',
				mainSkill
			);
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/dependency-skill',
				dependency
			);

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
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/existing-skill',
				mockSkill
			);

			await service.installSkill('existing-skill');

			// When I try to install it again without force
			let errorThrown = false;
			try {
				await service.installSkill('existing-skill');
			} catch (error) {
				errorThrown = true;
			}

			// Then an error should be thrown
			ok(errorThrown);
		});

		test('Scenario: Force reinstall', async () => {
			// Given a skill is already installed
			const mockSkill = createMockSkillPackage('reinstall-skill', '1.0.0', 'official');
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/reinstall-skill',
				mockSkill
			);

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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/skill-1',
				skill1
			);
			requestService.setResponse(
				'https://registry.anthropic.com/skills/packages/skill-2',
				skill2
			);

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
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/update-test',
				oldSkill
			);
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/update-test/versions',
				['1.1.0', '1.0.0']
			);

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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/update-skill',
				oldSkill
			);
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/update-skill/versions',
				['1.1.0', '1.0.0']
			);

			await service.installSkill('update-skill');

			// Update the response to the new version
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/update-skill',
				newSkill
			);

			// When I update the skill
			const updated = await service.updateSkill('update-skill');

			// Then the skill should be updated
			ok(updated);
			strictEqual(updated.package.version, '1.1.0');
		});

		test('Scenario: Pin a skill to prevent updates', async () => {
			// Given a skill is installed
			const skill = createMockSkillPackage('pin-test', '1.0.0', 'official');
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/pin-test',
				skill
			);

			await service.installSkill('pin-test');

			// When I pin the skill
			await service.pinSkill('pin-test', true);

			// Then the skill should be excluded from update checks
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/pin-test/versions',
				['1.1.0', '1.0.0']
			);

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
			const mainSkill: SkillPackage = {
				...createMockSkillPackage('main', '1.0.0', 'official'),
				dependencies: [{ name: 'dep-1', version: '^1.0.0' }],
			};

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/main',
				mainSkill
			);
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/dep-1',
				depSkill
			);

			// When I resolve dependencies
			const resolution = await service.resolveDependencies('main', '1.0.0');

			// Then I should get the dependency tree
			ok(resolution);
			ok(resolution.tree.length > 0);
			ok(resolution.installOrder.some(i => i.name === 'dep-1'));
		});

		test('Scenario: Detect circular dependencies', async () => {
			// Given two skills that depend on each other
			const skill1: SkillPackage = {
				...createMockSkillPackage('circular-1', '1.0.0', 'official'),
				dependencies: [{ name: 'circular-2' }],
			};
			const skill2: SkillPackage = {
				...createMockSkillPackage('circular-2', '1.0.0', 'official'),
				dependencies: [{ name: 'circular-1' }],
			};

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/circular-1',
				skill1
			);
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/circular-2',
				skill2
			);

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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/validate-test',
				skill
			);

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
			invalidSkill.files = {} as any;

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
			const mockResults: SkillSearchResult[] = [
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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/search?q=test',
				mockResults
			);

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
			const mockResults: SkillSearchResult[] = [{
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

			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/search?q=cache-stats',
				mockResults
			);

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
			requestService.setResponse(
				'https://registry.ainative.studio/v1/skills/packages/uninstall-test',
				skill
			);

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

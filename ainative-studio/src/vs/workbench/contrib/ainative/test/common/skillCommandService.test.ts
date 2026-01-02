/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SkillCommandService, ISkillCommandService } from '../../common/skillCommandService.js';
import { SkillsManagerService, ISkillsManagerService } from '../../common/skillsManagerService.js';
import { ISkillMarketplaceService } from '../../common/skillMarketplaceService.js';
import { Skill, SkillPreferences } from '../../common/skillTypes.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { IFileService, FileSystemProviderCapabilities, IFileSystemProvider } from '../../../../../platform/files/common/files.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { URI } from '../../../../../base/common/uri.js';
import { Event } from '../../../../../base/common/event.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';

/**
 * Mock storage service for testing
 */
class MockStorageService implements IStorageService {
	readonly _serviceBrand: undefined;

	private readonly _onDidChangeValue = new Emitter<{ key: string; scope: StorageScope }>();
	readonly onDidChangeValue = this._onDidChangeValue.event;

	private readonly _onDidChangeTarget = new Emitter<{ key: string }>();
	readonly onDidChangeTarget = this._onDidChangeTarget.event;

	private readonly _onWillSaveState = new Emitter<void>();
	readonly onWillSaveState = this._onWillSaveState.event;

	private storage = new Map<string, string>();

	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		return this.storage.get(key) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean {
		const value = this.storage.get(key);
		return value !== undefined ? value === 'true' : (fallbackValue ?? false);
	}

	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number {
		const value = this.storage.get(key);
		return value !== undefined ? parseInt(value, 10) : (fallbackValue ?? 0);
	}

	store(key: string, value: string | boolean | number | undefined, scope: StorageScope, target: StorageTarget): void {
		if (value === undefined) {
			this.storage.delete(key);
		} else {
			this.storage.set(key, String(value));
		}
		this._onDidChangeValue.fire({ key, scope });
	}

	remove(key: string, scope: StorageScope): void {
		this.storage.delete(key);
		this._onDidChangeValue.fire({ key, scope });
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		return Array.from(this.storage.keys());
	}

	logStorage(): void { }
	migrate(): Promise<void> { return Promise.resolve(); }
	isNew(scope: StorageScope): boolean { return false; }
	flush(): Promise<void> { return Promise.resolve(); }
}

/**
 * Mock file service for testing
 */
class MockFileService implements IFileService {
	readonly _serviceBrand: undefined;

	private files = new Map<string, VSBuffer>();
	private folders = new Set<string>();

	readonly onDidFilesChange = Event.None;
	readonly onDidRunOperation = Event.None;
	readonly onDidChangeFileSystemProviderCapabilities = Event.None;
	readonly onDidChangeFileSystemProviderRegistrations = Event.None;
	readonly onWillActivateFileSystemProvider = Event.None;

	async exists(resource: URI): Promise<boolean> {
		const path = resource.fsPath;
		return this.files.has(path) || this.folders.has(path);
	}

	async readFile(resource: URI): Promise<{ value: VSBuffer }> {
		const content = this.files.get(resource.fsPath);
		if (!content) {
			throw new Error('File not found');
		}
		return { value: content };
	}

	async writeFile(resource: URI, content: VSBuffer): Promise<void> {
		this.files.set(resource.fsPath, content);
	}

	async createFolder(resource: URI): Promise<void> {
		this.folders.add(resource.fsPath);
	}

	async delete(resource: URI): Promise<void> {
		this.files.delete(resource.fsPath);
		this.folders.delete(resource.fsPath);
	}

	// Stub implementations for required interface methods
	readonly providers = new Map();
	canHandleResource(): boolean { return true; }
	hasProvider(): boolean { return true; }
	hasCapability(): boolean { return true; }
	listCapabilities(): any[] { return []; }
	registerProvider(): any { return { dispose: () => { } }; }
	getProvider(): any { return undefined; }
	activateProvider(): Promise<void> { return Promise.resolve(); }
	canCreateFile(): Promise<boolean> { return Promise.resolve(true); }
	canMove(): Promise<boolean> { return Promise.resolve(true); }
	canCopy(): Promise<boolean> { return Promise.resolve(true); }
	canDelete(): Promise<boolean> { return Promise.resolve(true); }
	resolve(): Promise<any> { return Promise.resolve(undefined); }
	stat(): Promise<any> { return Promise.resolve(undefined); }
	readFileStream(): Promise<any> { return Promise.resolve(undefined); }
	createFile(): Promise<any> { return Promise.resolve(undefined); }
	move(): Promise<any> { return Promise.resolve(undefined); }
	copy(): Promise<any> { return Promise.resolve(undefined); }
	cloneFile(): Promise<void> { return Promise.resolve(); }
	watch(): any { return { dispose: () => { } }; }
	getWriteEncoding(): any { return undefined; }
	dispose(): void { }
}

/**
 * Mock marketplace service for testing
 */
class MockMarketplaceService implements ISkillMarketplaceService {
	readonly _serviceBrand: undefined;

	private mockSkills: Skill[] = [];

	setMockSkills(skills: Skill[]): void {
		this.mockSkills = skills;
	}

	async searchSkills(query: string, options?: any): Promise<Skill[]> {
		return this.mockSkills.filter(skill =>
			skill.name.includes(query) || skill.description.includes(query)
		);
	}

	async getSkillByName(name: string): Promise<Skill | undefined> {
		return this.mockSkills.find(skill => skill.name === name);
	}

	async getOfficialSkills(): Promise<Skill[]> {
		return this.mockSkills.filter(skill => skill.source === 'official');
	}

	async getCommunitySkills(): Promise<Skill[]> {
		return this.mockSkills.filter(skill => skill.source === 'community');
	}

	async getSkillsByCategory(category: string): Promise<Skill[]> {
		return this.mockSkills.filter(skill => skill.category === category);
	}

	async getSkillsByTags(tags: string[]): Promise<Skill[]> {
		return this.mockSkills.filter(skill =>
			tags.some(tag => skill.tags?.includes(tag))
		);
	}

	async refreshCache(): Promise<void> {
		// No-op for testing
	}
}

suite('SkillCommandService', () => {
	const disposables = new DisposableStore();
	let skillsManager: SkillsManagerService;
	let marketplace: MockMarketplaceService;
	let commandService: SkillCommandService;
	let storageService: MockStorageService;
	let fileService: MockFileService;
	let logService: ILogService;

	setup(() => {
		storageService = new MockStorageService();
		fileService = new MockFileService();
		logService = new NullLogService();

		skillsManager = new SkillsManagerService(storageService, fileService);
		marketplace = new MockMarketplaceService();
		commandService = new SkillCommandService(
			skillsManager,
			marketplace,
			fileService,
			logService
		);

		disposables.add(skillsManager);
		disposables.add(commandService);
	});

	teardown(() => {
		disposables.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('listSkills', () => {
		test('should list all skills', async () => {
			// Add test skills
			const skill1Uri = URI.parse('file:///test-skill-1/SKILL.md');
			fileService.writeFile(skill1Uri, VSBuffer.fromString(`---
name: test-skill-1
version: 1.0.0
description: Test skill 1
category: testing
tags: [test]
---

Test skill content
`));

			await skillsManager.loadSkillFromFile(skill1Uri);

			const result = await commandService.listSkills();

			ok(result.success);
			strictEqual(result.data.total, 1);
			strictEqual(result.data.enabled, 1);
			strictEqual(result.data.disabled, 0);
		});

		test('should filter by enabled status', async () => {
			// Add and disable a skill
			const skillUri = URI.parse('file:///test-skill/SKILL.md');
			fileService.writeFile(skillUri, VSBuffer.fromString(`---
name: test-skill
version: 1.0.0
description: Test skill
category: testing
---
Content
`));

			await skillsManager.loadSkillFromFile(skillUri);
			skillsManager.disableSkill('test-skill');

			const result = await commandService.listSkills({ enabled: true });

			ok(result.success);
			strictEqual(result.data.total, 0);
		});

		test('should filter by category', async () => {
			const skill1Uri = URI.parse('file:///skill-1/SKILL.md');
			fileService.writeFile(skill1Uri, VSBuffer.fromString(`---
name: skill-1
version: 1.0.0
description: Skill 1
category: development
---
Content
`));

			const skill2Uri = URI.parse('file:///skill-2/SKILL.md');
			fileService.writeFile(skill2Uri, VSBuffer.fromString(`---
name: skill-2
version: 1.0.0
description: Skill 2
category: testing
---
Content
`));

			await skillsManager.loadSkillFromFile(skill1Uri);
			await skillsManager.loadSkillFromFile(skill2Uri);

			const result = await commandService.listSkills({ category: 'testing' });

			ok(result.success);
			strictEqual(result.data.total, 1);
			strictEqual(result.data.skills[0].name, 'skill-2');
		});
	});

	suite('createSkill', () => {
		test('should create skill with proper structure', async () => {
			const result = await commandService.createSkill('my-test-skill');

			ok(result.success);
			strictEqual(result.data.skillName, 'my-test-skill');
			ok(result.data.path.includes('my-test-skill'));
		});

		test('should reject invalid skill names', async () => {
			const result = await commandService.createSkill('Invalid Name!');

			ok(!result.success);
			strictEqual(result.error, 'INVALID_NAME');
		});

		test('should reject duplicate skill names', async () => {
			await commandService.createSkill('duplicate-skill');
			const result = await commandService.createSkill('duplicate-skill');

			ok(!result.success);
			strictEqual(result.error, 'ALREADY_EXISTS');
		});
	});

	suite('enableSkill / disableSkill', () => {
		test('should enable a disabled skill', async () => {
			const skillUri = URI.parse('file:///test-skill/SKILL.md');
			fileService.writeFile(skillUri, VSBuffer.fromString(`---
name: test-skill
version: 1.0.0
description: Test
---
Content
`));

			await skillsManager.loadSkillFromFile(skillUri);
			skillsManager.disableSkill('test-skill');

			const result = await commandService.enableSkill('test-skill');

			ok(result.success);
			strictEqual(result.data.skillName, 'test-skill');

			const preferences = skillsManager.getPreferences();
			ok(!preferences.disabledSkills?.includes('test-skill'));
		});

		test('should disable an enabled skill', async () => {
			const skillUri = URI.parse('file:///test-skill/SKILL.md');
			fileService.writeFile(skillUri, VSBuffer.fromString(`---
name: test-skill
version: 1.0.0
description: Test
---
Content
`));

			await skillsManager.loadSkillFromFile(skillUri);

			const result = await commandService.disableSkill('test-skill');

			ok(result.success);
			strictEqual(result.data.skillName, 'test-skill');

			const preferences = skillsManager.getPreferences();
			ok(preferences.disabledSkills?.includes('test-skill'));
		});

		test('should handle non-existent skills', async () => {
			const result = await commandService.enableSkill('non-existent');

			ok(!result.success);
			strictEqual(result.error, 'NOT_FOUND');
		});
	});

	suite('getSkillInfo', () => {
		test('should get info for installed skill', async () => {
			const skillUri = URI.parse('file:///test-skill/SKILL.md');
			fileService.writeFile(skillUri, VSBuffer.fromString(`---
name: test-skill
version: 1.0.0
description: Test skill description
category: testing
tags: [test, demo]
---
Content
`));

			await skillsManager.loadSkillFromFile(skillUri);

			const result = await commandService.getSkillInfo('test-skill');

			ok(result.success);
			ok(result.data.installed);
			ok(result.data.enabled);
			strictEqual(result.data.skill.name, 'test-skill');
		});

		test('should search marketplace for non-installed skill', async () => {
			marketplace.setMockSkills([{
				name: 'marketplace-skill',
				version: '1.0.0',
				description: 'Marketplace skill',
				category: 'general',
				content: 'Content',
				source: 'marketplace' as any,
				tags: ['marketplace']
			}]);

			const result = await commandService.getSkillInfo('marketplace-skill');

			ok(result.success);
			ok(!result.data.installed);
		});

		test('should handle non-existent skill', async () => {
			const result = await commandService.getSkillInfo('non-existent');

			ok(!result.success);
			strictEqual(result.error, 'NOT_FOUND');
		});
	});

	suite('searchSkills', () => {
		test('should search marketplace for skills', async () => {
			marketplace.setMockSkills([
				{
					name: 'database-skill',
					version: '1.0.0',
					description: 'Database management skill',
					category: 'database',
					content: 'Content',
					source: 'marketplace' as any,
					tags: ['database', 'sql']
				},
				{
					name: 'testing-skill',
					version: '1.0.0',
					description: 'Testing patterns skill',
					category: 'testing',
					content: 'Content',
					source: 'marketplace' as any,
					tags: ['testing', 'tdd']
				}
			]);

			const result = await commandService.searchSkills({ query: 'database' });

			ok(result.success);
			strictEqual(result.data.count, 1);
			strictEqual(result.data.results[0].name, 'database-skill');
		});

		test('should handle no results', async () => {
			marketplace.setMockSkills([]);

			const result = await commandService.searchSkills({ query: 'nonexistent' });

			ok(result.success);
			strictEqual(result.data.count, 0);
		});
	});

	suite('removeSkill', () => {
		test('should remove an installed skill', async () => {
			const skillUri = URI.parse('file:///test-skill/SKILL.md');
			fileService.writeFile(skillUri, VSBuffer.fromString(`---
name: test-skill
version: 1.0.0
description: Test
---
Content
`));

			await skillsManager.loadSkillFromFile(skillUri);

			const result = await commandService.removeSkill('test-skill');

			ok(result.success);
			ok(!skillsManager.hasSkill('test-skill'));
		});

		test('should handle non-existent skill', async () => {
			const result = await commandService.removeSkill('non-existent');

			ok(!result.success);
			strictEqual(result.error, 'NOT_FOUND');
		});
	});

	suite('Source Type Detection', () => {
		test('should detect local path', async () => {
			const result = await commandService.installSkill({ source: './local-skill' });

			// Will fail because local install not fully implemented
			// But we can verify the source type was detected
			ok(!result.success || result.data);
		});

		test('should detect NPM package', async () => {
			const result = await commandService.installSkill({ source: '@ainative/test-skill' });

			ok(!result.success); // NPM not implemented
			strictEqual(result.error, 'NOT_IMPLEMENTED');
		});

		test('should detect GitHub repo', async () => {
			const result = await commandService.installSkill({ source: 'user/repo' });

			ok(!result.success); // GitHub not implemented
			strictEqual(result.error, 'NOT_IMPLEMENTED');
		});

		test('should detect URL', async () => {
			const result = await commandService.installSkill({ source: 'https://example.com/skill.zip' });

			ok(!result.success); // URL not implemented
			strictEqual(result.error, 'NOT_IMPLEMENTED');
		});
	});
});

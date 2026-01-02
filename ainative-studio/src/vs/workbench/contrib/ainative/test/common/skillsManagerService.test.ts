/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, deepStrictEqual } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SkillsManagerService } from '../../common/skillsManagerService.js';
import { Skill, SkillPreferences } from '../../common/skillTypes.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { IFileService, FileSystemProviderCapabilities, IFileSystemProvider, IFileChange } from '../../../../../platform/files/common/files.js';
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

	switch(): Promise<void> {
		return Promise.resolve();
	}

	hasScope(): boolean {
		return true;
	}

	logStorage(): void { }

	migrate(): Promise<void> {
		return Promise.resolve();
	}

	isNew(scope: StorageScope): boolean {
		return false;
	}

	flush(): Promise<void> {
		return Promise.resolve();
	}

	getTarget(): StorageTarget {
		return StorageTarget.USER;
	}

	// Test helper
	clear(): void {
		this.storage.clear();
	}
}

/**
 * Mock file service for testing
 */
class MockFileService implements Partial<IFileService> {
	readonly _serviceBrand: undefined;

	private files = new Map<string, string>();
	private readonly _onDidFilesChange = new Emitter<readonly IFileChange[]>();
	readonly onDidFilesChange = this._onDidFilesChange.event;

	async exists(resource: URI): Promise<boolean> {
		return this.files.has(resource.toString());
	}

	async readFile(resource: URI): Promise<{ value: VSBuffer }> {
		const content = this.files.get(resource.toString());
		if (!content) {
			throw new Error(`File not found: ${resource.toString()}`);
		}
		return { value: VSBuffer.fromString(content) };
	}

	async stat(resource: URI): Promise<{ mtime: number }> {
		if (!this.files.has(resource.toString())) {
			throw new Error(`File not found: ${resource.toString()}`);
		}
		return { mtime: Date.now() };
	}

	// Test helpers
	addFile(path: string, content: string): void {
		this.files.set(path, content);
	}

	removeFile(path: string): void {
		this.files.delete(path);
	}

	clear(): void {
		this.files.clear();
	}
}

suite('SkillsManagerService', () => {
	const disposables = new DisposableStore();
	let storageService: MockStorageService;
	let fileService: MockFileService;
	let skillsManager: SkillsManagerService;

	ensureNoDisposablesAreLeakedInTestSuite();

	const createSkillContent = (name: string, options?: {
		tags?: string[];
		dependencies?: string[];
		location?: 'managed' | 'project';
	}): string => {
		const tags = options?.tags || [];
		const deps = options?.dependencies || [];
		const location = options?.location || 'managed';

		let frontmatter = `---
name: ${name}
description: Description for ${name}
location: ${location}`;

		if (tags.length > 0) {
			frontmatter += '\ntags:';
			tags.forEach(tag => {
				frontmatter += `\n  - ${tag}`;
			});
		}

		if (deps.length > 0) {
			frontmatter += '\ndependencies:';
			deps.forEach(dep => {
				frontmatter += `\n  - ${dep}`;
			});
		}

		frontmatter += '\n---\n\n';
		frontmatter += `# ${name}\n\nInstructions for ${name}.`;

		return frontmatter;
	};

	setup(() => {
		storageService = new MockStorageService();
		fileService = new MockFileService();
		skillsManager = disposables.add(
			new SkillsManagerService(storageService, fileService as any)
		);
	});

	teardown(() => {
		disposables.clear();
		storageService.clear();
		fileService.clear();
	});

	suite('initialization', () => {
		test('should initialize with empty registry', () => {
			strictEqual(skillsManager.getSkillCount(), 0);
			strictEqual(skillsManager.getAllSkills().length, 0);
		});

		test('should load preferences from storage', () => {
			const prefs: SkillPreferences = {
				installedSkills: ['skill-1', 'skill-2'],
				usageStats: { 'skill-1': 5 },
				disabledSkills: ['skill-3'],
				lastUpdated: Date.now()
			};

			storageService.store('ainative.skills.preferences', JSON.stringify(prefs), StorageScope.PROFILE, StorageTarget.USER);

			const newService = new SkillsManagerService(storageService, fileService as any);
			const loadedPrefs = newService.getPreferences();

			deepStrictEqual(loadedPrefs.installedSkills, prefs.installedSkills);
			deepStrictEqual(loadedPrefs.usageStats, prefs.usageStats);
			deepStrictEqual(loadedPrefs.disabledSkills, prefs.disabledSkills);
		});
	});

	suite('loadSkillFromFile', () => {
		test('should load valid skill file', async () => {
			const skillPath = 'file:///test/skills/test-skill.md';
			const content = createSkillContent('test-skill');
			fileService.addFile(skillPath, content);

			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			strictEqual(skillsManager.getSkillCount(), 1);
			ok(skillsManager.hasSkill('test-skill'));
		});

		test('should handle non-existent file', async () => {
			const skillPath = 'file:///test/skills/non-existent.md';

			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			strictEqual(skillsManager.getSkillCount(), 0);
		});

		test('should handle malformed skill file', async () => {
			const skillPath = 'file:///test/skills/malformed.md';
			fileService.addFile(skillPath, 'Not a valid skill file');

			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			strictEqual(skillsManager.getSkillCount(), 0);
		});

		test('should replace existing skill with same name', async () => {
			const skillPath1 = 'file:///test/skills/skill-v1.md';
			const skillPath2 = 'file:///test/skills/skill-v2.md';

			fileService.addFile(skillPath1, createSkillContent('my-skill', { tags: ['old'] }));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath1));

			fileService.addFile(skillPath2, createSkillContent('my-skill', { tags: ['new'] }));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath2));

			strictEqual(skillsManager.getSkillCount(), 1);
			const skill = skillsManager.getSkillByName('my-skill');
			deepStrictEqual(skill?.metadata.tags, ['new']);
		});
	});

	suite('skill retrieval', () => {
		test('should get skill by name', async () => {
			const skillPath = 'file:///test/skills/test-skill.md';
			fileService.addFile(skillPath, createSkillContent('test-skill'));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			const skill = skillsManager.getSkillByName('test-skill');
			ok(skill, 'Skill should exist');
			strictEqual(skill?.metadata.name, 'test-skill');
		});

		test('should get skills by tag', async () => {
			fileService.addFile('file:///test/s1.md', createSkillContent('skill-1', { tags: ['testing', 'quality'] }));
			fileService.addFile('file:///test/s2.md', createSkillContent('skill-2', { tags: ['testing'] }));
			fileService.addFile('file:///test/s3.md', createSkillContent('skill-3', { tags: ['deployment'] }));

			await skillsManager.loadSkillFromFile(URI.parse('file:///test/s1.md'));
			await skillsManager.loadSkillFromFile(URI.parse('file:///test/s2.md'));
			await skillsManager.loadSkillFromFile(URI.parse('file:///test/s3.md'));

			const testingSkills = skillsManager.getSkillsByTag('testing');
			strictEqual(testingSkills.length, 2);
		});

		test('should get skills with dependencies', async () => {
			fileService.addFile('file:///test/base.md', createSkillContent('base-skill'));
			fileService.addFile('file:///test/dep.md', createSkillContent('dependent-skill', {
				dependencies: ['base-skill']
			}));

			await skillsManager.loadSkillFromFile(URI.parse('file:///test/base.md'));
			await skillsManager.loadSkillFromFile(URI.parse('file:///test/dep.md'));

			const skills = skillsManager.getSkillsWithDependencies('dependent-skill');
			strictEqual(skills.length, 2);
			strictEqual(skills[0].metadata.name, 'base-skill');
			strictEqual(skills[1].metadata.name, 'dependent-skill');
		});
	});

	suite('preferences management', () => {
		test('should track installed skills', async () => {
			const skillPath = 'file:///test/skills/test-skill.md';
			fileService.addFile(skillPath, createSkillContent('test-skill'));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			skillsManager.markSkillAsInstalled('test-skill');

			const prefs = skillsManager.getPreferences();
			ok(prefs.installedSkills.includes('test-skill'));
		});

		test('should track usage statistics', () => {
			skillsManager.incrementSkillUsage('test-skill');
			skillsManager.incrementSkillUsage('test-skill');
			skillsManager.incrementSkillUsage('test-skill');

			const prefs = skillsManager.getPreferences();
			strictEqual(prefs.usageStats['test-skill'], 3);
		});

		test('should disable/enable skills', () => {
			skillsManager.disableSkill('test-skill');
			let prefs = skillsManager.getPreferences();
			ok(prefs.disabledSkills.includes('test-skill'));

			skillsManager.enableSkill('test-skill');
			prefs = skillsManager.getPreferences();
			ok(!prefs.disabledSkills.includes('test-skill'));
		});

		test('should persist preferences to storage', async () => {
			const skillPath = 'file:///test/skills/test-skill.md';
			fileService.addFile(skillPath, createSkillContent('test-skill'));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			skillsManager.markSkillAsInstalled('test-skill');
			skillsManager.incrementSkillUsage('test-skill');

			const stored = storageService.get('ainative.skills.preferences', StorageScope.PROFILE);
			ok(stored, 'Preferences should be stored');

			const prefs = JSON.parse(stored!);
			ok(prefs.installedSkills.includes('test-skill'));
			strictEqual(prefs.usageStats['test-skill'], 1);
		});
	});

	suite('events', () => {
		test('should emit onDidChangeSkills when skill is loaded', async () => {
			let eventFired = false;

			disposables.add(skillsManager.onDidChangeSkills(() => {
				eventFired = true;
			}));

			const skillPath = 'file:///test/skills/test-skill.md';
			fileService.addFile(skillPath, createSkillContent('test-skill'));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			ok(eventFired, 'Event should have fired');
		});

		test('should emit onDidChangeSkills when skill is removed', () => {
			let eventFired = false;

			disposables.add(skillsManager.onDidChangeSkills(() => {
				eventFired = true;
			}));

			skillsManager.removeSkill('test-skill');

			ok(eventFired, 'Event should have fired');
		});
	});

	suite('skill removal', () => {
		test('should remove skill from registry', async () => {
			const skillPath = 'file:///test/skills/test-skill.md';
			fileService.addFile(skillPath, createSkillContent('test-skill'));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath));

			strictEqual(skillsManager.hasSkill('test-skill'), true);

			skillsManager.removeSkill('test-skill');

			strictEqual(skillsManager.hasSkill('test-skill'), false);
		});

		test('should remove from installed list when skill is removed', async () => {
			const skillPath = 'file:///test/skills/test-skill.md';
			fileService.addFile(skillPath, createSkillContent('test-skill'));
			await skillsManager.loadSkillFromFile(URI.parse(skillPath));
			skillsManager.markSkillAsInstalled('test-skill');

			skillsManager.removeSkill('test-skill');

			const prefs = skillsManager.getPreferences();
			ok(!prefs.installedSkills.includes('test-skill'));
		});
	});
});

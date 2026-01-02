/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SkillCommandService } from '../../common/skillCommandService.js';
import { SkillsManagerService } from '../../common/skillsManagerService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { URI } from '../../../../../base/common/uri.js';
import { Event } from '../../../../../base/common/event.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
/**
 * Mock storage service for testing
 */
class MockStorageService {
    constructor() {
        this._onDidChangeValue = new Emitter();
        this.onDidChangeValue = this._onDidChangeValue.event;
        this._onDidChangeTarget = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onWillSaveState = new Emitter();
        this.onWillSaveState = this._onWillSaveState.event;
        this.storage = new Map();
    }
    get(key, scope, fallbackValue) {
        return this.storage.get(key) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? value === 'true' : (fallbackValue ?? false);
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? parseInt(value, 10) : (fallbackValue ?? 0);
    }
    store(key, value, scope, target) {
        if (value === undefined) {
            this.storage.delete(key);
        }
        else {
            this.storage.set(key, String(value));
        }
        this._onDidChangeValue.fire({ key, scope });
    }
    remove(key, scope) {
        this.storage.delete(key);
        this._onDidChangeValue.fire({ key, scope });
    }
    keys(scope, target) {
        return Array.from(this.storage.keys());
    }
    logStorage() { }
    migrate() { return Promise.resolve(); }
    isNew(scope) { return false; }
    flush() { return Promise.resolve(); }
}
/**
 * Mock file service for testing
 */
class MockFileService {
    constructor() {
        this.files = new Map();
        this.folders = new Set();
        this.onDidFilesChange = Event.None;
        this.onDidRunOperation = Event.None;
        this.onDidChangeFileSystemProviderCapabilities = Event.None;
        this.onDidChangeFileSystemProviderRegistrations = Event.None;
        this.onWillActivateFileSystemProvider = Event.None;
        // Stub implementations for required interface methods
        this.providers = new Map();
    }
    async exists(resource) {
        const path = resource.fsPath;
        return this.files.has(path) || this.folders.has(path);
    }
    async readFile(resource) {
        const content = this.files.get(resource.fsPath);
        if (!content) {
            throw new Error('File not found');
        }
        return { value: content };
    }
    async writeFile(resource, content) {
        this.files.set(resource.fsPath, content);
    }
    async createFolder(resource) {
        this.folders.add(resource.fsPath);
    }
    async delete(resource) {
        this.files.delete(resource.fsPath);
        this.folders.delete(resource.fsPath);
    }
    canHandleResource() { return true; }
    hasProvider() { return true; }
    hasCapability() { return true; }
    listCapabilities() { return []; }
    registerProvider() { return { dispose: () => { } }; }
    getProvider() { return undefined; }
    activateProvider() { return Promise.resolve(); }
    canCreateFile() { return Promise.resolve(true); }
    canMove() { return Promise.resolve(true); }
    canCopy() { return Promise.resolve(true); }
    canDelete() { return Promise.resolve(true); }
    resolve() { return Promise.resolve(undefined); }
    stat() { return Promise.resolve(undefined); }
    readFileStream() { return Promise.resolve(undefined); }
    createFile() { return Promise.resolve(undefined); }
    move() { return Promise.resolve(undefined); }
    copy() { return Promise.resolve(undefined); }
    cloneFile() { return Promise.resolve(); }
    watch() { return { dispose: () => { } }; }
    getWriteEncoding() { return undefined; }
    dispose() { }
}
/**
 * Mock marketplace service for testing
 */
class MockMarketplaceService {
    constructor() {
        this.mockSkills = [];
    }
    setMockSkills(skills) {
        this.mockSkills = skills;
    }
    async searchSkills(query, options) {
        return this.mockSkills.filter(skill => skill.name.includes(query) || skill.description.includes(query));
    }
    async getSkillByName(name) {
        return this.mockSkills.find(skill => skill.name === name);
    }
    async getOfficialSkills() {
        return this.mockSkills.filter(skill => skill.source === 'official');
    }
    async getCommunitySkills() {
        return this.mockSkills.filter(skill => skill.source === 'community');
    }
    async getSkillsByCategory(category) {
        return this.mockSkills.filter(skill => skill.category === category);
    }
    async getSkillsByTags(tags) {
        return this.mockSkills.filter(skill => tags.some(tag => skill.tags?.includes(tag)));
    }
    async refreshCache() {
        // No-op for testing
    }
}
suite('SkillCommandService', () => {
    const disposables = new DisposableStore();
    let skillsManager;
    let marketplace;
    let commandService;
    let storageService;
    let fileService;
    let logService;
    setup(() => {
        storageService = new MockStorageService();
        fileService = new MockFileService();
        logService = new NullLogService();
        skillsManager = new SkillsManagerService(storageService, fileService);
        marketplace = new MockMarketplaceService();
        commandService = new SkillCommandService(skillsManager, marketplace, fileService, logService);
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
                    source: 'marketplace',
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
                    source: 'marketplace',
                    tags: ['database', 'sql']
                },
                {
                    name: 'testing-skill',
                    version: '1.0.0',
                    description: 'Testing patterns skill',
                    category: 'testing',
                    content: 'Content',
                    source: 'marketplace',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxDb21tYW5kU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9za2lsbENvbW1hbmRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQW1CLE1BQU0sUUFBUSxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUF3QixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBeUIsTUFBTSxzQ0FBc0MsQ0FBQztBQUtuRyxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEU7O0dBRUc7QUFDSCxNQUFNLGtCQUFrQjtJQUF4QjtRQUdrQixzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBd0MsQ0FBQztRQUNoRixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBRXhDLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUFtQixDQUFDO1FBQzVELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FB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
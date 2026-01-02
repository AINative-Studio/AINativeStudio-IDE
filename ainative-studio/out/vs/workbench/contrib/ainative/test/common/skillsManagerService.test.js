/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok, deepStrictEqual } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { SkillsManagerService } from '../../common/skillsManagerService.js';
import { URI } from '../../../../../base/common/uri.js';
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
    switch() {
        return Promise.resolve();
    }
    hasScope() {
        return true;
    }
    logStorage() { }
    migrate() {
        return Promise.resolve();
    }
    isNew(scope) {
        return false;
    }
    flush() {
        return Promise.resolve();
    }
    getTarget() {
        return 0 /* StorageTarget.USER */;
    }
    // Test helper
    clear() {
        this.storage.clear();
    }
}
/**
 * Mock file service for testing
 */
class MockFileService {
    constructor() {
        this.files = new Map();
        this._onDidFilesChange = new Emitter();
        this.onDidFilesChange = this._onDidFilesChange.event;
    }
    async exists(resource) {
        return this.files.has(resource.toString());
    }
    async readFile(resource) {
        const content = this.files.get(resource.toString());
        if (!content) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        return { value: VSBuffer.fromString(content) };
    }
    async stat(resource) {
        if (!this.files.has(resource.toString())) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        return { mtime: Date.now() };
    }
    // Test helpers
    addFile(path, content) {
        this.files.set(path, content);
    }
    removeFile(path) {
        this.files.delete(path);
    }
    clear() {
        this.files.clear();
    }
}
suite('SkillsManagerService', () => {
    const disposables = new DisposableStore();
    let storageService;
    let fileService;
    let skillsManager;
    ensureNoDisposablesAreLeakedInTestSuite();
    const createSkillContent = (name, options) => {
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
        skillsManager = disposables.add(new SkillsManagerService(storageService, fileService));
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
            const prefs = {
                installedSkills: ['skill-1', 'skill-2'],
                usageStats: { 'skill-1': 5 },
                disabledSkills: ['skill-3'],
                lastUpdated: Date.now()
            };
            storageService.store('ainative.skills.preferences', JSON.stringify(prefs), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            const newService = new SkillsManagerService(storageService, fileService);
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
            const stored = storageService.get('ainative.skills.preferences', 0 /* StorageScope.PROFILE */);
            ok(stored, 'Preferences should be stored');
            const prefs = JSON.parse(stored);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzTWFuYWdlclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxzTWFuYWdlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUk1RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFHa0Isc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQXdDLENBQUM7UUFDaEYscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztRQUV4Qyx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBbUIsQ0FBQztRQUM1RCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBRTFDLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDL0Msb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBRS9DLFlBQU8sR0FBRyxJQUFJLEdB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
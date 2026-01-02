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
        this._onDidChangeTarget = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onWillSaveState = new Emitter();
        this.onWillSaveState = this._onWillSaveState.event;
        this.storage = new Map();
    }
    onDidChangeValue(scope, key, disposable) {
        return this._onDidChangeValue.event;
    }
    get(key, scope, fallbackValue) {
        return this.storage.get(key) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? value === 'true' : fallbackValue;
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        return value !== undefined ? parseInt(value, 10) : fallbackValue;
    }
    getObject(key, scope, fallbackValue) {
        const value = this.storage.get(key);
        if (value === undefined) {
            return fallbackValue;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return fallbackValue;
        }
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
    storeAll(entries, external) {
        for (const entry of entries) {
            this.store(entry.key, entry.value, entry.scope, entry.target);
        }
    }
    remove(key, scope) {
        this.storage.delete(key);
        this._onDidChangeValue.fire({ key, scope });
    }
    keys(scope, target) {
        return Array.from(this.storage.keys());
    }
    log() { }
    hasScope(scope) {
        return true;
    }
    switch(to, preserveData) {
        return Promise.resolve();
    }
    isNew(scope) {
        return false;
    }
    optimize(scope) {
        return Promise.resolve();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzTWFuYWdlclNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc2tpbGxzTWFuYWdlclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUk1RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFHa0Isc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQU8sQ0FBQztRQUt2Qyx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBTyxDQUFDO1FBQ2hELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFFMUMscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQU8sQ0FBQztRQUM5QyxvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7UUFFL0MsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBMEY3QyxDQUFDO0lBcEdBLGdCQUFnQixDQUFDLEtBQW1CLEVB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
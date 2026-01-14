/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { SyncCommand } from '../../common/skills/cli/syncCommand.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { URI } from '../../../../../base/common/uri.js';
import * as symlinkUtils from '../../node/skills/symlinkUtils.js';
import * as gitOperations from '../../node/skills/gitOperations.js';
/**
 * Mock SkillsRegistry for testing
 */
class MockSkillsRegistry {
    constructor() {
        this.refreshResult = {
            updated: [],
            new: [],
            removed: [],
            unchanged: [],
            total: 0
        };
    }
    setRefreshResult(result) {
        this.refreshResult = result;
    }
    async install(skillPath) {
        throw new Error('Not implemented');
    }
    async uninstall(skillName) {
        throw new Error('Not implemented');
    }
    async list() {
        return [];
    }
    async get(skillName) {
        return null;
    }
    async isInstalled(skillName) {
        return false;
    }
    async refresh(skillsSourceDir) {
        return this.refreshResult;
    }
    clearCache() {
        // No-op
    }
}
/**
 * Mock NativeEnvironmentService for testing
 */
class MockNativeEnvironmentService {
    constructor() {
        this.userHome = URI.file('/home/test');
    }
}
suite('SyncCommand', () => {
    let syncCommand;
    let mockRegistry;
    let mockEnvService;
    let logService;
    // Store original functions
    let originalCheckSymlink;
    let originalIsGitRepo;
    let originalGetGitStatus;
    let originalGetCurrentBranch;
    let originalGitPull;
    setup(() => {
        mockRegistry = new MockSkillsRegistry();
        mockEnvService = new MockNativeEnvironmentService();
        logService = new NullLogService();
        // Store originals
        originalCheckSymlink = symlinkUtils.checkSymlink;
        originalIsGitRepo = gitOperations.isGitRepo;
        originalGetGitStatus = gitOperations.getGitStatus;
        originalGetCurrentBranch = gitOperations.getCurrentBranch;
        originalGitPull = gitOperations.gitPull;
    });
    teardown(() => {
        // Restore originals
        symlinkUtils.checkSymlink = originalCheckSymlink;
        gitOperations.isGitRepo = originalIsGitRepo;
        gitOperations.getGitStatus = originalGetGitStatus;
        gitOperations.getCurrentBranch = originalGetCurrentBranch;
        gitOperations.gitPull = originalGitPull;
    });
    test('should show setup instructions when .claude is not symlinked', async () => {
        // Mock symlink check to return false
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: false,
            target: null,
            resolvedTarget: null
        });
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, false);
        assert.ok(result.output.includes('Skills sync not available'));
        assert.ok(result.output.includes('not symlinked'));
        assert.ok(result.output.includes('ln -s'));
    });
    test('should fail when target is not a git repository', async () => {
        // Mock symlink check to return true
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: true,
            target: '/path/to/core/.claude',
            resolvedTarget: '/path/to/core/.claude'
        });
        // Mock git repo check to return false
        gitOperations.isGitRepo = async () => false;
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, false);
        assert.ok(result.output.includes('not a git repository'));
        assert.ok(result.errorMessage?.includes('not a git repository'));
    });
    test('should warn when there are uncommitted changes', async () => {
        // Mock symlink check to return true
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: true,
            target: '/path/to/core/.claude',
            resolvedTarget: '/path/to/core/.claude'
        });
        // Mock git repo check to return true
        gitOperations.isGitRepo = async () => true;
        // Mock git status to show uncommitted changes
        gitOperations.getGitStatus = async () => ({
            hasUncommittedChanges: true,
            modifiedFiles: 3,
            untrackedFiles: 2,
            statusOutput: 'M file1.ts\nM file2.ts\n?? file3.ts'
        });
        gitOperations.getCurrentBranch = async () => 'main';
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, false);
        assert.ok(result.output.includes('Uncommitted changes'));
        assert.ok(result.output.includes('Modified files: 3'));
        assert.ok(result.output.includes('Untracked files: 2'));
        assert.ok(result.output.includes('git commit'));
    });
    test('should handle git pull failure', async () => {
        // Mock successful setup
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: true,
            target: '/path/to/core/.claude',
            resolvedTarget: '/path/to/core/.claude'
        });
        gitOperations.isGitRepo = async () => true;
        gitOperations.getGitStatus = async () => ({
            hasUncommittedChanges: false,
            modifiedFiles: 0,
            untrackedFiles: 0,
            statusOutput: ''
        });
        gitOperations.getCurrentBranch = async () => 'main';
        // Mock git pull to fail
        gitOperations.gitPull = async () => ({
            success: false,
            stdout: '',
            stderr: 'Network error',
            errorMessage: 'Network error. Please check your internet connection and try again.'
        });
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, false);
        assert.ok(result.output.includes('Git pull failed'));
        assert.ok(result.output.includes('Network error'));
    });
    test('should successfully sync when everything works', async () => {
        // Mock successful setup
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: true,
            target: '/path/to/core/.claude',
            resolvedTarget: '/path/to/core/.claude'
        });
        gitOperations.isGitRepo = async () => true;
        gitOperations.getGitStatus = async () => ({
            hasUncommittedChanges: false,
            modifiedFiles: 0,
            untrackedFiles: 0,
            statusOutput: ''
        });
        gitOperations.getCurrentBranch = async () => 'main';
        gitOperations.gitPull = async () => ({
            success: true,
            stdout: 'Fast-forward\n 1 file changed',
            stderr: ''
        });
        // Mock refresh result
        mockRegistry.setRefreshResult({
            updated: [
                { name: 'git-workflow', oldVersion: '1.0.0', newVersion: '1.1.0' },
                { name: 'mandatory-tdd', oldVersion: '1.2.0', newVersion: '1.3.0' }
            ],
            new: [
                { name: 'delivery-checklist', oldVersion: null, newVersion: '1.0.0' }
            ],
            removed: [],
            unchanged: ['file-placement', 'code-quality', 'story-workflow'],
            total: 6
        });
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, true);
        assert.ok(result.output.includes('Checking for skill updates'));
        assert.ok(result.output.includes('Detected symlink'));
        assert.ok(result.output.includes('git-workflow (1.0.0 → 1.1.0)'));
        assert.ok(result.output.includes('mandatory-tdd (1.2.0 → 1.3.0)'));
        assert.ok(result.output.includes('delivery-checklist (1.0.0) [NEW]'));
        assert.ok(result.output.includes('Total: 6 skills'));
        assert.ok(result.output.includes('up to date'));
        assert.ok(result.refreshResult);
        assert.strictEqual(result.refreshResult.total, 6);
    });
    test('should handle no changes scenario', async () => {
        // Mock successful setup
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: true,
            target: '/path/to/core/.claude',
            resolvedTarget: '/path/to/core/.claude'
        });
        gitOperations.isGitRepo = async () => true;
        gitOperations.getGitStatus = async () => ({
            hasUncommittedChanges: false,
            modifiedFiles: 0,
            untrackedFiles: 0,
            statusOutput: ''
        });
        gitOperations.getCurrentBranch = async () => 'main';
        // Mock git pull with "already up to date"
        gitOperations.gitPull = async () => ({
            success: true,
            stdout: 'Already up to date.',
            stderr: ''
        });
        // Mock refresh result with no changes
        mockRegistry.setRefreshResult({
            updated: [],
            new: [],
            removed: [],
            unchanged: ['git-workflow', 'mandatory-tdd', 'file-placement'],
            total: 3
        });
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, true);
        assert.ok(result.output.includes('already up to date'));
        assert.ok(result.output.includes('Total: 3 skills'));
        assert.ok(result.output.includes('0 updated, 0 new, 0 removed, 3 unchanged'));
    });
    test('should handle merge conflicts', async () => {
        // Mock successful setup
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: true,
            target: '/path/to/core/.claude',
            resolvedTarget: '/path/to/core/.claude'
        });
        gitOperations.isGitRepo = async () => true;
        gitOperations.getGitStatus = async () => ({
            hasUncommittedChanges: false,
            modifiedFiles: 0,
            untrackedFiles: 0,
            statusOutput: ''
        });
        gitOperations.getCurrentBranch = async () => 'main';
        // Mock git pull with conflict
        gitOperations.gitPull = async () => ({
            success: false,
            stdout: '',
            stderr: 'CONFLICT: Merge conflict in file.ts',
            errorMessage: 'Merge conflict detected. Please resolve conflicts manually.'
        });
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, false);
        assert.ok(result.output.includes('Git pull failed'));
        assert.ok(result.output.includes('Merge conflict'));
        assert.ok(result.output.includes('resolve conflicts'));
    });
    test('should handle removed skills', async () => {
        // Mock successful setup
        symlinkUtils.checkSymlink = async () => ({
            isSymlink: true,
            target: '/path/to/core/.claude',
            resolvedTarget: '/path/to/core/.claude'
        });
        gitOperations.isGitRepo = async () => true;
        gitOperations.getGitStatus = async () => ({
            hasUncommittedChanges: false,
            modifiedFiles: 0,
            untrackedFiles: 0,
            statusOutput: ''
        });
        gitOperations.getCurrentBranch = async () => 'main';
        gitOperations.gitPull = async () => ({
            success: true,
            stdout: 'Fast-forward',
            stderr: ''
        });
        // Mock refresh result with removed skills
        mockRegistry.setRefreshResult({
            updated: [],
            new: [],
            removed: [
                { name: 'deprecated-skill', oldVersion: '1.0.0', newVersion: null }
            ],
            unchanged: ['git-workflow', 'mandatory-tdd'],
            total: 2
        });
        syncCommand = new SyncCommand(mockRegistry, mockEnvService, logService);
        const result = await syncCommand.execute();
        assert.strictEqual(result.success, true);
        assert.ok(result.output.includes('Removed Skills'));
        assert.ok(result.output.includes('deprecated-skill [REMOVED]'));
        assert.ok(result.output.includes('1 removed'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luY0NvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvdGVzdC9jb21tb24vc3luY0NvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXhGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sS0FBSyxhQUFhLE1BQU0sb0NBQW9DLENBQUM7QUFFcEU7O0dBRUc7QUFDSCxNQUFNLGtCQUFrQjtJQUF4QjtRQUdTLGtCQUFhLEdBQXVCO1lBQzNDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsR0FBRyxFQUFFLEVBQUU7WUFDUCxPQUFPLEVBQUUsRUFBRTtZQUNYLFNBQVMsRUFBRSxFQUFFO1lBQ2IsS0FBSyxFQUFFLENBQUM7U0FDUixDQUFDO0lBaUNILENBQUM7SUEvQkEsZ0JBQWdCLENBQUMsTUFBMEI7UUFDMUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUM7SUFDN0IsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBaUI7UUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQWlCO1FBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsS0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SyncCommand } from '../../common/skills/cli/syncCommand.js';
import { ISkillsRegistry, SkillRefreshResult } from '../../common/skills/skillRegistryTypes.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { INativeEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { URI } from '../../../../../base/common/uri.js';
import * as symlinkUtils from '../../node/skills/symlinkUtils.js';
import * as gitOperations from '../../node/skills/cli/gitOperations.js';

/**
 * Mock SkillsRegistry for testing
 */
class MockSkillsRegistry implements ISkillsRegistry {
	_serviceBrand: undefined;

	private refreshResult: SkillRefreshResult = {
		updated: [],
		new: [],
		removed: [],
		unchanged: [],
		total: 0
	};

	setRefreshResult(result: SkillRefreshResult): void {
		this.refreshResult = result;
	}

	async install(skillPath: string): Promise<void> {
		throw new Error('Not implemented');
	}

	async uninstall(skillName: string): Promise<void> {
		throw new Error('Not implemented');
	}

	async list() {
		return [];
	}

	async get(skillName: string) {
		return null;
	}

	async isInstalled(skillName: string) {
		return false;
	}

	async refresh(skillsSourceDir: string): Promise<SkillRefreshResult> {
		return this.refreshResult;
	}

	clearCache(): void {
		// No-op
	}
}

/**
 * Mock NativeEnvironmentService for testing
 */
class MockNativeEnvironmentService implements Partial<INativeEnvironmentService> {
	userHome = URI.file('/home/test');
}

suite('SyncCommand', () => {

	let syncCommand: SyncCommand;
	let mockRegistry: MockSkillsRegistry;
	let mockEnvService: MockNativeEnvironmentService;
	let logService: ILogService;

	// Store original functions
	let originalCheckSymlink: typeof symlinkUtils.checkSymlink;
	let originalIsGitRepo: typeof gitOperations.isGitRepo;
	let originalGetGitStatus: typeof gitOperations.getGitStatus;
	let originalGetCurrentBranch: typeof gitOperations.getCurrentBranch;
	let originalGitPull: typeof gitOperations.gitPull;

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
		(symlinkUtils as any).checkSymlink = originalCheckSymlink;
		(gitOperations as any).isGitRepo = originalIsGitRepo;
		(gitOperations as any).getGitStatus = originalGetGitStatus;
		(gitOperations as any).getCurrentBranch = originalGetCurrentBranch;
		(gitOperations as any).gitPull = originalGitPull;
	});

	test('should show setup instructions when .claude is not symlinked', async () => {
		// Mock symlink check to return false
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: false,
			target: null,
			resolvedTarget: null
		});

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

		const result = await syncCommand.execute();

		assert.strictEqual(result.success, false);
		assert.ok(result.output.includes('Skills sync not available'));
		assert.ok(result.output.includes('not symlinked'));
		assert.ok(result.output.includes('ln -s'));
	});

	test('should fail when target is not a git repository', async () => {
		// Mock symlink check to return true
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: true,
			target: '/path/to/core/.claude',
			resolvedTarget: '/path/to/core/.claude'
		});

		// Mock git repo check to return false
		(gitOperations as any).isGitRepo = async () => false;

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

		const result = await syncCommand.execute();

		assert.strictEqual(result.success, false);
		assert.ok(result.output.includes('not a git repository'));
		assert.ok(result.errorMessage?.includes('not a git repository'));
	});

	test('should warn when there are uncommitted changes', async () => {
		// Mock symlink check to return true
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: true,
			target: '/path/to/core/.claude',
			resolvedTarget: '/path/to/core/.claude'
		});

		// Mock git repo check to return true
		(gitOperations as any).isGitRepo = async () => true;

		// Mock git status to show uncommitted changes
		(gitOperations as any).getGitStatus = async () => ({
			hasUncommittedChanges: true,
			modifiedFiles: 3,
			untrackedFiles: 2,
			statusOutput: 'M file1.ts\nM file2.ts\n?? file3.ts'
		});

		(gitOperations as any).getCurrentBranch = async () => 'main';

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

		const result = await syncCommand.execute();

		assert.strictEqual(result.success, false);
		assert.ok(result.output.includes('Uncommitted changes'));
		assert.ok(result.output.includes('Modified files: 3'));
		assert.ok(result.output.includes('Untracked files: 2'));
		assert.ok(result.output.includes('git commit'));
	});

	test('should handle git pull failure', async () => {
		// Mock successful setup
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: true,
			target: '/path/to/core/.claude',
			resolvedTarget: '/path/to/core/.claude'
		});

		(gitOperations as any).isGitRepo = async () => true;

		(gitOperations as any).getGitStatus = async () => ({
			hasUncommittedChanges: false,
			modifiedFiles: 0,
			untrackedFiles: 0,
			statusOutput: ''
		});

		(gitOperations as any).getCurrentBranch = async () => 'main';

		// Mock git pull to fail
		(gitOperations as any).gitPull = async () => ({
			success: false,
			stdout: '',
			stderr: 'Network error',
			errorMessage: 'Network error. Please check your internet connection and try again.'
		});

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

		const result = await syncCommand.execute();

		assert.strictEqual(result.success, false);
		assert.ok(result.output.includes('Git pull failed'));
		assert.ok(result.output.includes('Network error'));
	});

	test('should successfully sync when everything works', async () => {
		// Mock successful setup
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: true,
			target: '/path/to/core/.claude',
			resolvedTarget: '/path/to/core/.claude'
		});

		(gitOperations as any).isGitRepo = async () => true;

		(gitOperations as any).getGitStatus = async () => ({
			hasUncommittedChanges: false,
			modifiedFiles: 0,
			untrackedFiles: 0,
			statusOutput: ''
		});

		(gitOperations as any).getCurrentBranch = async () => 'main';

		(gitOperations as any).gitPull = async () => ({
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

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

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
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: true,
			target: '/path/to/core/.claude',
			resolvedTarget: '/path/to/core/.claude'
		});

		(gitOperations as any).isGitRepo = async () => true;

		(gitOperations as any).getGitStatus = async () => ({
			hasUncommittedChanges: false,
			modifiedFiles: 0,
			untrackedFiles: 0,
			statusOutput: ''
		});

		(gitOperations as any).getCurrentBranch = async () => 'main';

		// Mock git pull with "already up to date"
		(gitOperations as any).gitPull = async () => ({
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

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

		const result = await syncCommand.execute();

		assert.strictEqual(result.success, true);
		assert.ok(result.output.includes('already up to date'));
		assert.ok(result.output.includes('Total: 3 skills'));
		assert.ok(result.output.includes('0 updated, 0 new, 0 removed, 3 unchanged'));
	});

	test('should handle merge conflicts', async () => {
		// Mock successful setup
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: true,
			target: '/path/to/core/.claude',
			resolvedTarget: '/path/to/core/.claude'
		});

		(gitOperations as any).isGitRepo = async () => true;

		(gitOperations as any).getGitStatus = async () => ({
			hasUncommittedChanges: false,
			modifiedFiles: 0,
			untrackedFiles: 0,
			statusOutput: ''
		});

		(gitOperations as any).getCurrentBranch = async () => 'main';

		// Mock git pull with conflict
		(gitOperations as any).gitPull = async () => ({
			success: false,
			stdout: '',
			stderr: 'CONFLICT: Merge conflict in file.ts',
			errorMessage: 'Merge conflict detected. Please resolve conflicts manually.'
		});

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

		const result = await syncCommand.execute();

		assert.strictEqual(result.success, false);
		assert.ok(result.output.includes('Git pull failed'));
		assert.ok(result.output.includes('Merge conflict'));
		assert.ok(result.output.includes('resolve conflicts'));
	});

	test('should handle removed skills', async () => {
		// Mock successful setup
		(symlinkUtils as any).checkSymlink = async () => ({
			isSymlink: true,
			target: '/path/to/core/.claude',
			resolvedTarget: '/path/to/core/.claude'
		});

		(gitOperations as any).isGitRepo = async () => true;

		(gitOperations as any).getGitStatus = async () => ({
			hasUncommittedChanges: false,
			modifiedFiles: 0,
			untrackedFiles: 0,
			statusOutput: ''
		});

		(gitOperations as any).getCurrentBranch = async () => 'main';

		(gitOperations as any).gitPull = async () => ({
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

		syncCommand = new SyncCommand(
			mockRegistry as any,
			mockEnvService as any,
			logService
		);

		const result = await syncCommand.execute();

		assert.strictEqual(result.success, true);
		assert.ok(result.output.includes('Removed Skills'));
		assert.ok(result.output.includes('deprecated-skill [REMOVED]'));
		assert.ok(result.output.includes('1 removed'));
	});
});

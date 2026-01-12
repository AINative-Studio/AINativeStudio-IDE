/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ISkillsRegistry, SkillRefreshResult } from '../skillRegistryTypes.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { INativeEnvironmentService } from '../../../../../../platform/environment/common/environment.js';
import { checkSymlink, getSymlinkSetupInstructions } from '../../../node/skills/symlinkUtils.js';
import {
	isGitRepo,
	getGitStatus,
	getCurrentBranch,
	gitPull,
	formatGitPullOutput,
	GitOperationResult
} from '../gitOperations.js';
import { join } from 'path';

/**
 * Result of sync command execution
 */
export interface SyncCommandResult {
	/** Whether the sync was successful */
	success: boolean;
	/** Formatted output to display to user */
	output: string;
	/** Refresh result if sync completed successfully */
	refreshResult?: SkillRefreshResult;
	/** Error message if sync failed */
	errorMessage?: string;
}

/**
 * Sync command implementation
 * Syncs skills from core repository when .claude is symlinked
 */
export class SyncCommand {

	private readonly claudeDir: string;
	private readonly skillsDir: string;

	constructor(
		private readonly skillsRegistry: ISkillsRegistry,
		// @ts-expect-error envService is passed but not used yet - keeping for future use
		private readonly envService: INativeEnvironmentService,
		private readonly logService: ILogService
	) {
		// Assuming .claude is in the workspace root or project root
		// This should be configurable based on actual workspace location
		this.claudeDir = join(process.cwd(), '.claude');
		this.skillsDir = join(this.claudeDir, 'skills');
	}

	/**
	 * Execute the sync command
	 */
	async execute(): Promise<SyncCommandResult> {
		this.logService.info('[SyncCommand] Starting sync operation');

		try {
			// Step 1: Check if .claude is a symlink
			const symlinkInfo = await checkSymlink(this.claudeDir);

			if (!symlinkInfo.isSymlink) {
				// Not symlinked - show setup instructions
				const output = getSymlinkSetupInstructions(this.claudeDir);
				this.logService.info('[SyncCommand] .claude is not symlinked');
				return {
					success: false,
					output,
					errorMessage: 'Skills directory is not symlinked'
				};
			}

			this.logService.info('[SyncCommand] Detected symlink', {
				target: symlinkInfo.target,
				resolved: symlinkInfo.resolvedTarget
			});

			const targetDir = symlinkInfo.resolvedTarget!;

			// Step 2: Check if target is a git repository
			const isRepo = await isGitRepo(targetDir);
			if (!isRepo) {
				const output = this.formatNotGitRepoError(targetDir);
				this.logService.error('[SyncCommand] Target is not a git repository');
				return {
					success: false,
					output,
					errorMessage: 'Target directory is not a git repository'
				};
			}

			// Step 3: Get git status
			const gitStatus = await getGitStatus(targetDir);
			const currentBranch = await getCurrentBranch(targetDir);

			// Warn if there are uncommitted changes
			if (gitStatus.hasUncommittedChanges) {
				const output = this.formatUncommittedChangesWarning(gitStatus, currentBranch);
				this.logService.warn('[SyncCommand] Uncommitted changes detected', gitStatus);
				return {
					success: false,
					output,
					errorMessage: 'Repository has uncommitted changes'
				};
			}

			// Step 4: Pull latest changes
			this.logService.info('[SyncCommand] Pulling latest changes from origin/main');
			const pullResult = await gitPull(targetDir, 'origin', 'main');

			if (!pullResult.success) {
				const output = this.formatGitPullError(pullResult);
				this.logService.error('[SyncCommand] Git pull failed', pullResult);
				return {
					success: false,
					output,
					errorMessage: pullResult.errorMessage
				};
			}

			// Step 5: Refresh skills registry
			this.logService.info('[SyncCommand] Refreshing skills registry');
			const refreshResult = await this.skillsRegistry.refresh(this.skillsDir);

			// Step 6: Format success output
			const output = this.formatSuccessOutput(
				symlinkInfo,
				pullResult,
				refreshResult
			);

			this.logService.info('[SyncCommand] Sync completed successfully', refreshResult);

			return {
				success: true,
				output,
				refreshResult
			};

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logService.error('[SyncCommand] Sync failed with error', error);

			const output = this.formatGenericError(errorMessage);
			return {
				success: false,
				output,
				errorMessage
			};
		}
	}

	/**
	 * Format success output
	 */
	private formatSuccessOutput(
		symlinkInfo: { target: string | null; resolvedTarget: string | null },
		pullResult: GitOperationResult,
		refreshResult: SkillRefreshResult
	): string {
		const lines: string[] = [];

		lines.push('Checking for skill updates...\n');
		lines.push(`Detected symlink: .claude → ${symlinkInfo.target}`);
		lines.push('Pulling latest changes from core repository...\n');

		// Git pull status
		lines.push(formatGitPullOutput(pullResult));
		lines.push('');

		lines.push('Refreshing skills cache...\n');

		// Show updated skills
		if (refreshResult.updated.length > 0) {
			lines.push('Updated Skills:');
			for (const skill of refreshResult.updated) {
				lines.push(`  ✓ ${skill.name} (${skill.oldVersion} → ${skill.newVersion})`);
			}
			lines.push('');
		}

		// Show new skills
		if (refreshResult.new.length > 0) {
			lines.push('New Skills:');
			for (const skill of refreshResult.new) {
				lines.push(`  + ${skill.name} (${skill.newVersion}) [NEW]`);
			}
			lines.push('');
		}

		// Show removed skills
		if (refreshResult.removed.length > 0) {
			lines.push('Removed Skills:');
			for (const skill of refreshResult.removed) {
				lines.push(`  - ${skill.name} [REMOVED]`);
			}
			lines.push('');
		}

		// Summary
		const updatedCount = refreshResult.updated.length;
		const newCount = refreshResult.new.length;
		const removedCount = refreshResult.removed.length;
		const unchangedCount = refreshResult.unchanged.length;

		lines.push(`Total: ${refreshResult.total} skills in registry (${updatedCount} updated, ${newCount} new, ${removedCount} removed, ${unchangedCount} unchanged)\n`);
		lines.push('Your skills are now up to date!');

		return lines.join('\n');
	}

	/**
	 * Format error when target is not a git repository
	 */
	private formatNotGitRepoError(targetDir: string): string {
		return `✗ Error: Target directory is not a git repository

Target: ${targetDir}

The symlink target must be a git repository to use /skill sync.

Please ensure:
1. The target directory is a valid git repository
2. The repository has a remote named 'origin'
3. You have proper git credentials configured`;
	}

	/**
	 * Format warning for uncommitted changes
	 */
	private formatUncommittedChangesWarning(
		gitStatus: { modifiedFiles: number; untrackedFiles: number },
		branch: string
	): string {
		return `⚠️  Cannot sync: Uncommitted changes detected

Branch: ${branch}
Modified files: ${gitStatus.modifiedFiles}
Untracked files: ${gitStatus.untrackedFiles}

Please commit or stash your changes before syncing:

  git add .
  git commit -m "Your commit message"

OR

  git stash

Then run /skill sync again.`;
	}

	/**
	 * Format git pull error
	 */
	private formatGitPullError(pullResult: GitOperationResult): string {
		const lines: string[] = [];
		lines.push('✗ Git pull failed\n');

		if (pullResult.errorMessage) {
			lines.push(pullResult.errorMessage);
			lines.push('');
		}

		// Add specific troubleshooting based on error type
		if (pullResult.errorMessage?.includes('Merge conflict')) {
			lines.push('To resolve conflicts:');
			lines.push('1. Navigate to the repository directory');
			lines.push('2. Resolve conflicts manually');
			lines.push('3. Complete the merge with: git commit');
			lines.push('4. Run /skill sync again');
		} else if (pullResult.errorMessage?.includes('Network error')) {
			lines.push('Please check:');
			lines.push('1. Your internet connection is active');
			lines.push('2. GitHub is accessible');
			lines.push('3. Try again in a few moments');
		} else if (pullResult.errorMessage?.includes('Authentication failed')) {
			lines.push('Please check:');
			lines.push('1. Your git credentials are configured');
			lines.push('2. You have access to the repository');
			lines.push('3. Your SSH key or access token is valid');
		}

		return lines.join('\n');
	}

	/**
	 * Format generic error
	 */
	private formatGenericError(errorMessage: string): string {
		return `✗ Sync failed

Error: ${errorMessage}

Please check the logs for more details.`;
	}
}

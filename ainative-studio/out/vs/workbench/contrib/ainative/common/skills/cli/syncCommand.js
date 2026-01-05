/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { checkSymlink, getSymlinkSetupInstructions } from '../symlinkUtils.js';
import { isGitRepo, getGitStatus, getCurrentBranch, gitPull, formatGitPullOutput } from '../gitOperations.js';
import { join } from 'path';
/**
 * Sync command implementation
 * Syncs skills from core repository when .claude is symlinked
 */
export class SyncCommand {
    constructor(skillsRegistry, 
    // @ts-expect-error envService is passed but not used yet - keeping for future use
    envService, logService) {
        this.skillsRegistry = skillsRegistry;
        this.envService = envService;
        this.logService = logService;
        // Assuming .claude is in the workspace root or project root
        // This should be configurable based on actual workspace location
        this.claudeDir = join(process.cwd(), '.claude');
        this.skillsDir = join(this.claudeDir, 'skills');
    }
    /**
     * Execute the sync command
     */
    async execute() {
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
            const targetDir = symlinkInfo.resolvedTarget;
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
            const output = this.formatSuccessOutput(symlinkInfo, pullResult, refreshResult);
            this.logService.info('[SyncCommand] Sync completed successfully', refreshResult);
            return {
                success: true,
                output,
                refreshResult
            };
        }
        catch (error) {
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
    formatSuccessOutput(symlinkInfo, pullResult, refreshResult) {
        const lines = [];
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
    formatNotGitRepoError(targetDir) {
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
    formatUncommittedChangesWarning(gitStatus, branch) {
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
    formatGitPullError(pullResult) {
        const lines = [];
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
        }
        else if (pullResult.errorMessage?.includes('Network error')) {
            lines.push('Please check:');
            lines.push('1. Your internet connection is active');
            lines.push('2. GitHub is accessible');
            lines.push('3. Try again in a few moments');
        }
        else if (pullResult.errorMessage?.includes('Authentication failed')) {
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
    formatGenericError(errorMessage) {
        return `✗ Sync failed

Error: ${errorMessage}

Please check the logs for more details.`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luY0NvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvY2xpL3N5bmNDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvRSxPQUFPLEVBQ04sU0FBUyxFQUNULFlBQVksRUFDWixnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLG1CQUFtQixFQUVuQixNQUFNLHFCQUFxQixDQUFDO0FBQzdCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFnQjVCOzs7R0FHRztBQUNILE1BQU0sT0FBTyxXQUFXO0lBS3ZCLFlBQ2tCLGNBQStCO0lBQ2hELGtGQUFrRjtJQUNqRSxVQUFxQyxFQUNyQyxVQUF1QjtRQUh2QixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFFL0IsZUFBVSxHQUFWLFVBQVUsQ0FBMkI7UUFDckMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUV4Qyw0REFBNEQ7UUFDNUQsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPO1FBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQUU5RCxJQUFJLENBQUM7WUFDSix3Q0FBd0M7WUFDeEMsTUFBTSxXQUFXLEdB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
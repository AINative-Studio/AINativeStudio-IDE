/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
/**
 * Check if a directory is a git repository
 * @param repoPath - Path to check
 * @returns True if it's a git repository
 */
export async function isGitRepo(repoPath) {
    try {
        const result = await execAsync('git rev-parse --git-dir', { cwd: repoPath });
        return result.stdout.trim().length > 0;
    }
    catch (error) {
        return false;
    }
}
/**
 * Get git status for a repository
 * @param repoPath - Path to git repository
 * @returns Git status information
 */
export async function getGitStatus(repoPath) {
    try {
        const result = await execAsync('git status --porcelain', { cwd: repoPath });
        const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);
        const modifiedFiles = lines.filter(line => !line.startsWith('??')).length;
        const untrackedFiles = lines.filter(line => line.startsWith('??')).length;
        return {
            hasUncommittedChanges: lines.length > 0,
            modifiedFiles,
            untrackedFiles,
            statusOutput: result.stdout
        };
    }
    catch (error) {
        throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Get the current branch name
 * @param repoPath - Path to git repository
 * @returns Current branch name
 */
export async function getCurrentBranch(repoPath) {
    try {
        const result = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath });
        return result.stdout.trim();
    }
    catch (error) {
        throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Pull latest changes from remote repository
 * @param repoPath - Path to git repository
 * @param remote - Remote name (default: origin)
 * @param branch - Branch name (default: main)
 * @returns Git operation result
 */
export async function gitPull(repoPath, remote = 'origin', branch = 'main') {
    try {
        const result = await execAsync(`git pull ${remote} ${branch}`, {
            cwd: repoPath,
            timeout: 30000 // 30 second timeout
        });
        return {
            success: true,
            stdout: result.stdout,
            stderr: result.stderr
        };
    }
    catch (error) {
        const errorMessage = error.stderr || error.message || String(error);
        // Check for specific git errors
        if (errorMessage.includes('CONFLICT')) {
            return {
                success: false,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                errorMessage: 'Merge conflict detected. Please resolve conflicts manually.'
            };
        }
        if (errorMessage.includes('Could not resolve host') || errorMessage.includes('network')) {
            return {
                success: false,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                errorMessage: 'Network error. Please check your internet connection and try again.'
            };
        }
        if (errorMessage.includes('Permission denied') || errorMessage.includes('authentication failed')) {
            return {
                success: false,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                errorMessage: 'Authentication failed. Please check your git credentials.'
            };
        }
        return {
            success: false,
            stdout: error.stdout || '',
            stderr: error.stderr || '',
            errorMessage: `Git pull failed: ${errorMessage}`
        };
    }
}
/**
 * Fetch updates from remote without merging
 * @param repoPath - Path to git repository
 * @param remote - Remote name (default: origin)
 * @returns Git operation result
 */
export async function gitFetch(repoPath, remote = 'origin') {
    try {
        const result = await execAsync(`git fetch ${remote}`, {
            cwd: repoPath,
            timeout: 30000
        });
        return {
            success: true,
            stdout: result.stdout,
            stderr: result.stderr
        };
    }
    catch (error) {
        return {
            success: false,
            stdout: error.stdout || '',
            stderr: error.stderr || '',
            errorMessage: error.message || String(error)
        };
    }
}
/**
 * Check if there are incoming changes from remote
 * @param repoPath - Path to git repository
 * @param remote - Remote name (default: origin)
 * @param branch - Branch name (default: main)
 * @returns True if there are incoming changes
 */
export async function hasIncomingChanges(repoPath, remote = 'origin', branch = 'main') {
    try {
        // First fetch to get latest remote info
        await gitFetch(repoPath, remote);
        // Compare local and remote
        const result = await execAsync(`git rev-list HEAD..${remote}/${branch} --count`, { cwd: repoPath });
        const count = parseInt(result.stdout.trim(), 10);
        return count > 0;
    }
    catch (error) {
        return false;
    }
}
/**
 * Format git pull output for display
 * @param result - Git operation result
 * @returns Formatted output string
 */
export function formatGitPullOutput(result) {
    if (!result.success) {
        return `✗ ${result.errorMessage || 'Git pull failed'}`;
    }
    const output = result.stdout || result.stderr;
    // Check for different types of pull results
    if (output.includes('Already up to date') || output.includes('Already up-to-date')) {
        return '✓ Repository is already up to date';
    }
    if (output.includes('Fast-forward')) {
        return '✓ Repository updated successfully (fast-forward)';
    }
    if (output.includes('Merge made')) {
        return '✓ Repository updated successfully (merge)';
    }
    return '✓ Repository updated successfully';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0T3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvbm9kZS9za2lsbHMvZ2l0T3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFakMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBOEJsQzs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxTQUFTLENBQUMsUUFBZ0I7SUFDL0MsSUFBSSxDQUFDO1FBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMseUJBQXlCLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM3RSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDRixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsWUFBWSxDQUFDLFFBQWdCO0lBQ2xELElBQUksQ0FBQztRQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLHdCQUF3QixFQUFFLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDNUUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElB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
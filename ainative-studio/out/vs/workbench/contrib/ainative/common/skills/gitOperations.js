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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0T3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxscy9naXRPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUVqQyxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7QUE4QmxDOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLFNBQVMsQ0FBQyxRQUFnQjtJQUMvQyxJQUFJLENBQUM7UUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQUMsUUFBZ0I7SUFDbEQsSUFBSSxDQUFDO1FBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM1RSxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMs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
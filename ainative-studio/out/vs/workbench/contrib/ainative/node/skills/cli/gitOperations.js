/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
const execAsync = promisify(exec);
/**
 * Helper class for git operations
 * Provides utilities for checking git status, pulling changes, etc.
 */
export class GitOperations {
    /**
     * Check if a directory is a git repository
     * @param dirPath - Absolute path to directory
     * @returns True if directory is a git repository
     */
    static async isGitRepository(dirPath) {
        try {
            const gitDir = path.join(dirPath, '.git');
            const stats = await fs.promises.stat(gitDir);
            return stats.isDirectory();
        }
        catch (error) {
            // .git directory doesn't exist or is not accessible
            return false;
        }
    }
    /**
     * Get git status for a repository
     * @param repoPath - Absolute path to repository
     * @returns Git status information
     */
    static async getStatus(repoPath) {
        try {
            const { stdout } = await execAsync('git status --porcelain', {
                cwd: repoPath
            });
            const lines = stdout.trim().split('\n').filter(line => line.length > 0);
            const modifiedFiles = [];
            const untrackedFiles = [];
            for (const line of lines) {
                const statusCode = line.substring(0, 2);
                const filePath = line.substring(3);
                if (statusCode.includes('M') || statusCode.includes('A') || statusCode.includes('D')) {
                    modifiedFiles.push(filePath);
                }
                else if (statusCode.includes('?')) {
                    untrackedFiles.push(filePath);
                }
            }
            return {
                hasChanges: lines.length > 0,
                modifiedFiles,
                untrackedFiles
            };
        }
        catch (error) {
            throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Pull latest changes from remote repository
     * @param repoPath - Absolute path to repository
     * @param branch - Branch to pull (defaults to current branch)
     * @returns Result of git pull operation
     */
    static async pull(repoPath, branch = 'main') {
        try {
            const { stdout, stderr } = await execAsync(`git pull origin ${branch}`, {
                cwd: repoPath
            });
            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            };
        }
        catch (error) {
            // Git pull can fail for various reasons
            const errorMessage = error.message || String(error);
            const stdout = error.stdout || '';
            const stderr = error.stderr || '';
            // Check if it's a merge conflict
            if (errorMessage.includes('CONFLICT') || stderr.includes('CONFLICT')) {
                return {
                    success: false,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: 'Merge conflict detected. Please resolve conflicts manually.'
                };
            }
            // Check if it's a network error
            if (errorMessage.includes('Could not resolve host') ||
                errorMessage.includes('Failed to connect') ||
                errorMessage.includes('Network is unreachable')) {
                return {
                    success: false,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: 'Network error or remote repository unavailable.'
                };
            }
            // Check if it's an authentication error
            if (errorMessage.includes('Permission denied') ||
                errorMessage.includes('Authentication failed')) {
                return {
                    success: false,
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    error: 'Permission denied. Check your SSH keys or GitHub authentication.'
                };
            }
            // Generic error
            return {
                success: false,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                error: errorMessage
            };
        }
    }
    /**
     * Get the remote URL for a repository
     * @param repoPath - Absolute path to repository
     * @returns Remote URL or null if not configured
     */
    static async getRemoteUrl(repoPath) {
        try {
            const { stdout } = await execAsync('git remote get-url origin', {
                cwd: repoPath
            });
            return stdout.trim();
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get the current branch name
     * @param repoPath - Absolute path to repository
     * @returns Current branch name
     */
    static async getCurrentBranch(repoPath) {
        try {
            const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                cwd: repoPath
            });
            return stdout.trim();
        }
        catch (error) {
            throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Check if git is installed on the system
     * @returns True if git is available
     */
    static async isGitInstalled() {
        try {
            await execAsync('git --version');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Stash uncommitted changes
     * @param repoPath - Absolute path to repository
     * @param message - Optional stash message
     * @returns Result of git stash operation
     */
    static async stash(repoPath, message) {
        try {
            const cmd = message
                ? `git stash push -m "${message}"`
                : 'git stash';
            const { stdout, stderr } = await execAsync(cmd, {
                cwd: repoPath
            });
            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            };
        }
        catch (error) {
            return {
                success: false,
                stdout: error.stdout?.trim() || '',
                stderr: error.stderr?.trim() || '',
                error: error.message || String(error)
            };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0T3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvbm9kZS9za2lsbHMvY2xpL2dpdE9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBRTdCLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQTRCbEM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFDekI7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE9BQWU7UUFDM0MsSUFBSSxDQUFDO1lBQ0osTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDMUMsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3QyxPQUFPLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixvREFBb0Q7WUFDcEQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFnQjtRQUN0QyxJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcs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
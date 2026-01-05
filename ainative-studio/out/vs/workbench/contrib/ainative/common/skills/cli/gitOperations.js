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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0T3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxscy9jbGkvZ2l0T3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDakMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBNEJsQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQUN6Qjs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBZTtRQUMzQyxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxQyxNQUFNLEtBQUssR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLE9BQU8sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLG9EQUFvRDtZQUNwRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQWdCO1FBQ3RDLElBQUksQ0FBQztZQUNKLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRTtnQkFDNUQsR0FBRyxFQUFFLFFBQVE7YUFDYixDQUFDLENBQUM7WUFFSCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDeEUsTUFBTSxhQUFhLEdBQWEsRUFBRSxDQUFDO1lBQ25DLE1BQU0sY0FBYyxHQUFhLEVBQUUsQ0FBQztZQUVwQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUMxQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFbkMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN0RixhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM5QixDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNyQyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU87Z0JBQ04sVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDNUIsYUFBYTtnQkFDYixjQUFjO2FBQ2QsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEcsQ0FBQztJQUNGLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQWdCLEVBQUUsU0FBaUIsTUFBTTtRQUMxRCxJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLG1CQUFtQixNQUFNLEVBQUUsRUFBRTtnQkFDdkUsR0FBRyxFQUFFLFFBQVE7YUFDYixDQUFDLENBQUM7WUFFSCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFO2dCQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRTthQUNyQixDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDckIsd0NBQXdDO1lBQ3hDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO1lBQ2xDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO1lBRWxDLGlDQUFpQztZQUNqQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUN0RSxPQUFPO29CQUNOLE9BQU8sRUFBRSxLQUFLO29CQUNkLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFO29CQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRTtvQkFDckIsS0FBSyxFQUFFLDZEQUE2RDtpQkFDcEUsQ0FBQztZQUNILENBQUM7WUFFRCxnQ0FBZ0M7WUFDaEMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDO2dCQUNsRCxZQUFZLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDO2dCQUMxQyxZQUFZLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQztnQkFDbEQsT0FBTztvQkFDTixPQUFPLEVBQUUsS0FBSztvQkFDZCxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRTtvQkFDckIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUU7b0JBQ3JCLEtBQUssRUFBRSxpREFBaUQ7aUJBQ3hELENBQUM7WUFDSCxDQUFDO1lBRUQsd0NBQXdDO1lBQ3hDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQztnQkFDN0MsWUFBWSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pELE9BQU87b0JBQ04sT0FBTyxFQUFFLEtBQUs7b0JBQ2QsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUU7b0JBQ3JCLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFO29CQUNyQixLQUFLLEVBQUUsa0VBQWtFO2lCQUN6RSxDQUFDO1lBQ0gsQ0FBQztZQUVELGdCQUFnQjtZQUNoQixPQUFPO2dCQUNOLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFO2dCQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRTtnQkFDckIsS0FBSyxFQUFFLFlBQVk7YUFDbkIsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQWdCO1FBQ3pDLElBQUksQ0FBQztZQUNKLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQywyQkFBMkIsRUFBRTtnQkFDL0QsR0FBRyxFQUFFLFFBQVE7YUFDYixDQUFDLENBQUM7WUFDSCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBZ0I7UUFDN0MsSUFBSSxDQUFDO1lBQ0osTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLGlDQUFpQyxFQUFFO2dCQUNyRSxHQUFHLEVBQUUsUUFBUTthQUNiLENBQUMsQ0FBQztZQUNILE9BQU8sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUcsQ0FBQztJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWM7UUFDMUIsSUFBSSxDQUFDO1lBQ0osTUFBTSxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFnQixFQUFFLE9BQWdCO1FBQ3BELElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxHQUFHLE9BQU87Z0JBQ2xCLENBQUMsQ0FBQyxzQkFBc0IsT0FBTyxHQUFHO2dCQUNsQyxDQUFDLENBQUMsV0FBVyxDQUFDO1lBRWYsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxHQUFHLEVBQUU7Z0JBQy9DLEdBQUcsRUFBRSxRQUFRO2FBQ2IsQ0FBQyxDQUFDO1lBRUgsT0FBTztnQkFDTixPQUFPLEVBQUUsSUFBSTtnQkFDYixNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRTtnQkFDckIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUU7YUFDckIsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3JCLE9BQU87Z0JBQ04sT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtnQkFDbEMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtnQkFDbEMsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQzthQUNyQyxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9
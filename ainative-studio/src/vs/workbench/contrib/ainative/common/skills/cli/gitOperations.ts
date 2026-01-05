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
 * Result of a git operation
 */
export interface GitOperationResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Standard output from git command */
	stdout: string;
	/** Standard error from git command */
	stderr: string;
	/** Error message if operation failed */
	error?: string;
}

/**
 * Git status information
 */
export interface GitStatus {
	/** Whether the repository has uncommitted changes */
	hasChanges: boolean;
	/** List of modified files */
	modifiedFiles: string[];
	/** List of untracked files */
	untrackedFiles: string[];
}

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
	static async isGitRepository(dirPath: string): Promise<boolean> {
		try {
			const gitDir = path.join(dirPath, '.git');
			const stats = await fs.promises.stat(gitDir);
			return stats.isDirectory();
		} catch (error) {
			// .git directory doesn't exist or is not accessible
			return false;
		}
	}

	/**
	 * Get git status for a repository
	 * @param repoPath - Absolute path to repository
	 * @returns Git status information
	 */
	static async getStatus(repoPath: string): Promise<GitStatus> {
		try {
			const { stdout } = await execAsync('git status --porcelain', {
				cwd: repoPath
			});

			const lines = stdout.trim().split('\n').filter(line => line.length > 0);
			const modifiedFiles: string[] = [];
			const untrackedFiles: string[] = [];

			for (const line of lines) {
				const statusCode = line.substring(0, 2);
				const filePath = line.substring(3);

				if (statusCode.includes('M') || statusCode.includes('A') || statusCode.includes('D')) {
					modifiedFiles.push(filePath);
				} else if (statusCode.includes('?')) {
					untrackedFiles.push(filePath);
				}
			}

			return {
				hasChanges: lines.length > 0,
				modifiedFiles,
				untrackedFiles
			};
		} catch (error) {
			throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Pull latest changes from remote repository
	 * @param repoPath - Absolute path to repository
	 * @param branch - Branch to pull (defaults to current branch)
	 * @returns Result of git pull operation
	 */
	static async pull(repoPath: string, branch: string = 'main'): Promise<GitOperationResult> {
		try {
			const { stdout, stderr } = await execAsync(`git pull origin ${branch}`, {
				cwd: repoPath
			});

			return {
				success: true,
				stdout: stdout.trim(),
				stderr: stderr.trim()
			};
		} catch (error: any) {
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
	static async getRemoteUrl(repoPath: string): Promise<string | null> {
		try {
			const { stdout } = await execAsync('git remote get-url origin', {
				cwd: repoPath
			});
			return stdout.trim();
		} catch (error) {
			return null;
		}
	}

	/**
	 * Get the current branch name
	 * @param repoPath - Absolute path to repository
	 * @returns Current branch name
	 */
	static async getCurrentBranch(repoPath: string): Promise<string> {
		try {
			const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
				cwd: repoPath
			});
			return stdout.trim();
		} catch (error) {
			throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Check if git is installed on the system
	 * @returns True if git is available
	 */
	static async isGitInstalled(): Promise<boolean> {
		try {
			await execAsync('git --version');
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Stash uncommitted changes
	 * @param repoPath - Absolute path to repository
	 * @param message - Optional stash message
	 * @returns Result of git stash operation
	 */
	static async stash(repoPath: string, message?: string): Promise<GitOperationResult> {
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
		} catch (error: any) {
			return {
				success: false,
				stdout: error.stdout?.trim() || '',
				stderr: error.stderr?.trim() || '',
				error: error.message || String(error)
			};
		}
	}
}

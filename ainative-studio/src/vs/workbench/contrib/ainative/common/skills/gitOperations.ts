/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { exec } from 'child_process';
import { promisify } from 'util';

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
	errorMessage?: string;
}

/**
 * Git status information
 */
export interface GitStatus {
	/** Whether there are uncommitted changes */
	hasUncommittedChanges: boolean;
	/** Number of modified files */
	modifiedFiles: number;
	/** Number of untracked files */
	untrackedFiles: number;
	/** Raw git status output */
	statusOutput: string;
}

/**
 * Check if a directory is a git repository
 * @param repoPath - Path to check
 * @returns True if it's a git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
	try {
		const result = await execAsync('git rev-parse --git-dir', { cwd: repoPath });
		return result.stdout.trim().length > 0;
	} catch (error) {
		return false;
	}
}

/**
 * Get git status for a repository
 * @param repoPath - Path to git repository
 * @returns Git status information
 */
export async function getGitStatus(repoPath: string): Promise<GitStatus> {
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
	} catch (error) {
		throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Get the current branch name
 * @param repoPath - Path to git repository
 * @returns Current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
	try {
		const result = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath });
		return result.stdout.trim();
	} catch (error) {
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
export async function gitPull(
	repoPath: string,
	remote: string = 'origin',
	branch: string = 'main'
): Promise<GitOperationResult> {
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
	} catch (error: any) {
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
export async function gitFetch(
	repoPath: string,
	remote: string = 'origin'
): Promise<GitOperationResult> {
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
	} catch (error: any) {
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
export async function hasIncomingChanges(
	repoPath: string,
	remote: string = 'origin',
	branch: string = 'main'
): Promise<boolean> {
	try {
		// First fetch to get latest remote info
		await gitFetch(repoPath, remote);

		// Compare local and remote
		const result = await execAsync(
			`git rev-list HEAD..${remote}/${branch} --count`,
			{ cwd: repoPath }
		);

		const count = parseInt(result.stdout.trim(), 10);
		return count > 0;
	} catch (error) {
		return false;
	}
}

/**
 * Format git pull output for display
 * @param result - Git operation result
 * @returns Formatted output string
 */
export function formatGitPullOutput(result: GitOperationResult): string {
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

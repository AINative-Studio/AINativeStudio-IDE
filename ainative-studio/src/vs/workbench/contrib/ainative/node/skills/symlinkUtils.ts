/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Information about a symlink
 */
export interface SymlinkInfo {
	/** Whether the path is a symlink */
	isSymlink: boolean;
	/** The target path if it's a symlink, otherwise null */
	target: string | null;
	/** The resolved absolute path of the target */
	resolvedTarget: string | null;
}

/**
 * Check if a path is a symbolic link and get its target
 * @param path - Path to check
 * @returns Symlink information
 */
export async function checkSymlink(path: string): Promise<SymlinkInfo> {
	try {
		const stats = await fs.lstat(path);

		if (!stats.isSymbolicLink()) {
			return {
				isSymlink: false,
				target: null,
				resolvedTarget: null
			};
		}

		// Read the symlink target
		const target = await fs.readlink(path);

		// Resolve to absolute path
		const resolvedTarget = await fs.realpath(path);

		return {
			isSymlink: true,
			target,
			resolvedTarget
		};
	} catch (error) {
		// Path doesn't exist or permission denied
		return {
			isSymlink: false,
			target: null,
			resolvedTarget: null
		};
	}
}

/**
 * Check if a directory is a git repository
 * @param dirPath - Directory path to check
 * @returns True if directory contains .git folder
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
	try {
		const gitPath = join(dirPath, '.git');
		const stats = await fs.stat(gitPath);
		return stats.isDirectory();
	} catch (error) {
		return false;
	}
}

/**
 * Get setup instructions for symlinking .claude directory
 * @param claudePath - Path to .claude directory
 * @returns Multi-line setup instructions
 */
export function getSymlinkSetupInstructions(claudePath: string): string {
	return `⚠️  Skills sync not available

Your .claude directory is not symlinked to the core repository.

To enable syncing:
1. Clone core repository: git clone https://github.com/ainative/core.git
2. Remove current .claude: rm -rf "${claudePath}"
3. Create symlink: ln -s /path/to/core/.claude "${claudePath}"

After setup, run /skill sync again to pull latest skills.`;
}

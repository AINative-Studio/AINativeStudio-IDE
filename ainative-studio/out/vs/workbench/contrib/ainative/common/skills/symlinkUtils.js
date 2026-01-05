/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { promises as fs } from 'fs';
import { join } from 'path';
/**
 * Check if a path is a symbolic link and get its target
 * @param path - Path to check
 * @returns Symlink information
 */
export async function checkSymlink(path) {
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
    }
    catch (error) {
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
export async function isGitRepository(dirPath) {
    try {
        const gitPath = join(dirPath, '.git');
        const stats = await fs.stat(gitPath);
        return stats.isDirectory();
    }
    catch (error) {
        return false;
    }
}
/**
 * Get setup instructions for symlinking .claude directory
 * @param claudePath - Path to .claude directory
 * @returns Multi-line setup instructions
 */
export function getSymlinkSetupInstructions(claudePath) {
    return `⚠️  Skills sync not available

Your .claude directory is not symlinked to the core repository.

To enable syncing:
1. Clone core repository: git clone https://github.com/ainative/core.git
2. Remove current .claude: rm -rf "${claudePath}"
3. Create symlink: ln -s /path/to/core/.claude "${claudePath}"

After setup, run /skill sync again to pull latest skills.`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua1V0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL3N5bWxpbmtVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxJQUFJLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQztBQUNwQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBYzVCOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLFlBQVksQ0FBQyxJQUFZO0lBQzlDLElBQUksQ0FBQztRQUNKLE1BQU0sS0FBSyxHQUFHLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVuQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7WUFDN0IsT0FBTztnQkFDTixTQUFTLEVBQUUsS0FBSztnQkFDaEIsTUFBTSxFQUFFLElBQUk7Z0JBQ1osY0FBYyxFQUFFLElBQUk7YUFDcEIsQ0FBQztRQUNILENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXZDLDJCQUEyQjtRQUMzQixNQUFNLGNBQWMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFL0MsT0FBTztZQUNOLFNBQVMsRUFBRSxJQUFJO1lBQ2YsTUFBTTtZQUNOLGNBQWM7U0FDZCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsMENBQTBDO1FBQzFDLE9BQU87WUFDTixTQUFTLEVBQUUsS0FBSztZQUNoQixNQUFNLEVBQUUsSUFBSTtZQUNaLGNBQWMsRUFBRSxJQUFJO1NBQ3BCLENBQUM7SUFDSCxDQUFDO0FBQ0YsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGVBQWUsQ0FBQyxPQUFlO0lBQ3BELElBQUksQ0FBQztRQUNKLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFVBQWtCO0lBQzdELE9BQU87Ozs7OztxQ0FNNkIsVUFBVTtrREFDRyxVQUFVOzswREFFRixDQUFDO0FBQzNELENBQUMifQ==
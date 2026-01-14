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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltbGlua1V0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9ub2RlL3NraWxscy9zeW1saW5rVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsSUFBSSxFQUFFLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDcEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQztBQWM1Qjs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQUMsSUFBWTtJQUM5QyxJQUFJLENBQUM7UUFDSixNQUFNLEtBQUssR0FBRyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQzdCLE9BQU87Z0JBQ04sU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxJQUFJO2dCQUNaLGNBQWMsRUFBRSxJQUFJO2FBQ3BCLENBQUM7UUFDSCxDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLE1BQU0sTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV2QywyQkFBMkI7UUFDM0IsTUFBTSxjQUFjLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLE9BQU87WUFDTixTQUFTLEVBQUUsSUFBSTtZQUNmLE1BQU07WUFDTixjQUFjO1NBQ2QsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLDBDQUEwQztRQUMxQyxPQUFPO1lBQ04sU0FBUyxFQUFFLEtBQUs7WUFDaEIsTUFBTSxFQUFFLElBQUk7WUFDWixjQUFjLEVBQUUsSUFBSTtTQUNwQixDQUFDO0lBQ0gsQ0FBQztBQUNGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxlQUFlLENBQUMsT0FBZTtJQUNwRCxJQUFJLENBQUM7UUFDSixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxPQUFPLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDRixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxVQUFrQjtJQUM3RCxPQUFPOzs7Ozs7cUNBTTZCLFVBQVU7a0RBQ0csVUFBVTs7MERBRUYsQ0FBQztBQUMzRCxDQUFDIn0=
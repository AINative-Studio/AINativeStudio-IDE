/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Example usage of SyncCommand
 *
 * This file demonstrates how the /skill sync command would be invoked
 * when a user runs it from the CLI.
 */
import { SyncCommand } from './syncCommand.js';
/**
 * Execute the skill sync command
 *
 * This function would be called by the slash command handler when
 * the user types `/skill sync` in the chat interface.
 *
 * @param skillsRegistry - The skills registry service instance
 * @param projectRoot - The project root directory containing .claude
 * @returns User-friendly output message
 */
export async function executeSkillSync(skillsRegistry, envService, logService) {
    // Create the sync command instance
    const syncCommand = new SyncCommand(skillsRegistry, envService, logService);
    // Execute the sync operation
    const result = await syncCommand.execute();
    // Build output message
    let output = result.output;
    if (!result.success && result.errorMessage) {
        output += '\n\n' + result.errorMessage;
    }
    return output;
}
/**
 * Example output scenarios:
 *
 * SUCCESS:
 * ```
 * Checking for skill updates...
 *
 * Detected symlink: .claude → /Users/aideveloper/core/.claude
 * Pulling latest changes from core repository...
 *
 * From https://github.com/company/core
 *    abc123..def456  main -> origin/main
 * Updating abc123..def456
 * Fast-forward
 *  .claude/skills/git-workflow/SKILL.md | 10 ++++++++++
 *  1 file changed, 10 insertions(+)
 *
 * ✓ Repository updated successfully
 *
 * Refreshing skills cache...
 *
 * Updated Skills:
 *   ✓ git-workflow (1.0.0 → 1.1.0)
 *   ✓ mandatory-tdd (1.2.0 → 1.3.0)
 *
 * New Skills:
 *   + delivery-checklist (1.0.0) [NEW]
 *
 * Total: 10 skills in registry (2 updated, 1 new, 7 unchanged)
 *
 * Your skills are now up to date!
 * ```
 *
 * ERROR - Not a symlink:
 * ```
 * Checking for skill updates...
 *
 * Error: .claude is not a symlink
 *
 * To enable skill sync, create a symlink to a core repository:
 *
 *   1. Backup your current .claude directory:
 *      mv .claude .claude.backup
 *
 *   2. Clone the core repository:
 *      git clone https://github.com/your-org/core ~/core
 *
 *   3. Create symlink:
 *      ln -s ~/core/.claude .claude
 *
 *   4. Run sync again:
 *      /skill sync
 * ```
 *
 * ERROR - Uncommitted changes:
 * ```
 * Checking for skill updates...
 *
 * Detected symlink: .claude → /Users/aideveloper/core/.claude
 *
 * Warning: The core repository has uncommitted changes:
 *
 *   M skills/git-workflow/SKILL.md
 *   ?? skills/new-skill/
 *
 * Please commit or stash these changes before syncing:
 *   cd /Users/aideveloper/core
 *   git stash
 *
 * Then run /skill sync again.
 * ```
 */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luY0NvbW1hbmRFeGFtcGxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL2NsaS9zeW5jQ29tbWFuZEV4YW1wbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7O0dBS0c7QUFFSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHL0M7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDckMsY0FBK0IsRUFDL0IsVUFBZSxFQUNmLFVBQWU7SUFFZixtQ0FBbUM7SUFDbkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUU1RSw2QkFBNkI7SUFDN0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFM0MsdUJBQXVCO0lBQ3ZCLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFFM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzVDLE1BQU0sSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN4QyxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBdUVHIn0=
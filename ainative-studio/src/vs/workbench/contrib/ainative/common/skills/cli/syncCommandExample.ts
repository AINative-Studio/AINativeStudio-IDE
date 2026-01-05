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
import { ISkillsRegistry } from '../skillRegistryTypes.js';

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
export async function executeSkillSync(
	skillsRegistry: ISkillsRegistry,
	envService: any,
	logService: any
): Promise<string> {
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

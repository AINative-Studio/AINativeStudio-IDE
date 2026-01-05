/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { INativeEnvironmentService } from '../../../../../../platform/environment/common/environment.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../../base/common/resources.js';
import {
	generateSkillTemplate,
	generateReferencesReadme,
	generateScriptsReadme,
	generateAssetsReadme
} from './templates.js';

/**
 * Result of the create command
 */
export interface CreateCommandResult {
	/** Absolute path to the created skill directory */
	skillPath: string;
	/** Skill name */
	skillName: string;
	/** Whether the skill was created successfully */
	success: boolean;
	/** Formatted output message */
	output: string;
}

/**
 * Validate skill name (alphanumeric + hyphens only)
 */
export function validateSkillName(skillName: string): { valid: boolean; error?: string } {
	if (!skillName || skillName.trim().length === 0) {
		return { valid: false, error: 'Skill name cannot be empty' };
	}

	// Check for valid characters (alphanumeric and hyphens)
	const validPattern = /^[a-z0-9-]+$/;
	if (!validPattern.test(skillName)) {
		return {
			valid: false,
			error: 'Skill name can only contain lowercase letters, numbers, and hyphens'
		};
	}

	// Check for leading/trailing hyphens
	if (skillName.startsWith('-') || skillName.endsWith('-')) {
		return { valid: false, error: 'Skill name cannot start or end with a hyphen' };
	}

	// Check for consecutive hyphens
	if (skillName.includes('--')) {
		return { valid: false, error: 'Skill name cannot contain consecutive hyphens' };
	}

	return { valid: true };
}

/**
 * Execute the /skill create command
 */
export async function executeCreateCommand(
	skillName: string,
	fileService: IFileService,
	envService: INativeEnvironmentService
): Promise<CreateCommandResult> {
	// Validate skill name
	const validation = validateSkillName(skillName);
	if (!validation.valid) {
		return {
			skillPath: '',
			skillName,
			success: false,
			output: `Error: ${validation.error}\n\nSkill name must:\n- Contain only lowercase letters, numbers, and hyphens\n- Not start or end with hyphens\n- Not contain consecutive hyphens\n\nExample: my-awesome-skill`
		};
	}

	// Set up paths
	const ainativeDir = joinPath(envService.userHome, '.ainative');
	const skillsDir = joinPath(ainativeDir, 'skills');
	const skillDir = joinPath(skillsDir, skillName);

	// Check if skill directory already exists
	try {
		const stat = await fileService.resolve(skillDir);
		if (stat) {
			return {
				skillPath: skillDir.fsPath,
				skillName,
				success: false,
				output: `Error: Skill directory already exists at ${skillDir.fsPath}\n\nTo recreate the skill, first delete the existing directory.`
			};
		}
	} catch {
		// Directory doesn't exist, which is what we want
	}

	try {
		// Create main skill directory
		await ensureDirectoryExists(fileService, skillDir);

		// Create subdirectories
		const referencesDir = joinPath(skillDir, 'references');
		const scriptsDir = joinPath(skillDir, 'scripts');
		const assetsDir = joinPath(skillDir, 'assets');

		await ensureDirectoryExists(fileService, referencesDir);
		await ensureDirectoryExists(fileService, scriptsDir);
		await ensureDirectoryExists(fileService, assetsDir);

		// Create SKILL.md
		const skillMdPath = joinPath(skillDir, 'SKILL.md');
		const skillMdContent = generateSkillTemplate(skillName);
		await fileService.writeFile(skillMdPath, VSBuffer.fromString(skillMdContent));

		// Create README files in subdirectories
		const referencesReadmePath = joinPath(referencesDir, 'README.md');
		await fileService.writeFile(referencesReadmePath, VSBuffer.fromString(generateReferencesReadme()));

		const scriptsReadmePath = joinPath(scriptsDir, 'README.md');
		await fileService.writeFile(scriptsReadmePath, VSBuffer.fromString(generateScriptsReadme()));

		const assetsReadmePath = joinPath(assetsDir, 'README.md');
		await fileService.writeFile(assetsReadmePath, VSBuffer.fromString(generateAssetsReadme()));

		// Generate success message
		const output = formatSuccessMessage(skillName, skillDir.fsPath);

		return {
			skillPath: skillDir.fsPath,
			skillName,
			success: true,
			output
		};
	} catch (error) {
		return {
			skillPath: skillDir.fsPath,
			skillName,
			success: false,
			output: `Error creating skill: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}

/**
 * Ensure a directory exists, create if it doesn't
 */
async function ensureDirectoryExists(fileService: IFileService, uri: URI): Promise<void> {
	try {
		const stat = await fileService.resolve(uri);
		if (!stat) {
			await fileService.createFolder(uri);
		}
	} catch {
		// Directory doesn't exist, create it
		await fileService.createFolder(uri);
	}
}

/**
 * Format success message with next steps
 */
function formatSuccessMessage(skillName: string, skillPath: string): string {
	return `✅ Successfully created skill "${skillName}"

Location: ${skillPath}

Directory structure:
├── SKILL.md          # Main skill definition
├── references/       # Reference materials
│   └── README.md
├── scripts/          # Automation scripts
│   └── README.md
└── assets/           # Supporting assets
    └── README.md

Next steps:
1. Edit SKILL.md to define your skill:
   - Update the description and metadata
   - Add usage examples and scenarios
   - Document when to use this skill

2. Add reference materials:
   - Create markdown files in references/
   - Link them from SKILL.md

3. Add automation scripts:
   - Create scripts in scripts/
   - Make them executable (chmod +x)

4. Install the skill:
   /skill install ${skillPath}

5. Enable the skill in .mcp.json:
   Add "${skillName}" to the "enabled" array

Happy skill building! 🚀`;
}

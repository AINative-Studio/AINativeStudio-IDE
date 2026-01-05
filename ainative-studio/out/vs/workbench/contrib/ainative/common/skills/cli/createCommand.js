/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../../base/common/resources.js';
import { generateSkillTemplate, generateReferencesReadme, generateScriptsReadme, generateAssetsReadme } from './templates.js';
/**
 * Validate skill name (alphanumeric + hyphens only)
 */
export function validateSkillName(skillName) {
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
export async function executeCreateCommand(skillName, fileService, envService) {
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
    }
    catch {
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
    }
    catch (error) {
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
async function ensureDirectoryExists(fileService, uri) {
    try {
        const stat = await fileService.resolve(uri);
        if (!stat) {
            await fileService.createFolder(uri);
        }
    }
    catch {
        // Directory doesn't exist, create it
        await fileService.createFolder(uri);
    }
}
/**
 * Format success message with next steps
 */
function formatSuccessMessage(skillName, skillPath) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlQ29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL3NraWxscy9jbGkvY3JlYXRlQ29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsd0JBQXdCLEVBQ3hCLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsTUFBTSxnQkFBZ0IsQ0FBQztBQWdCeEI7O0dBRUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsU0FBaUI7SUFDbEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSw0QkFBNEIsRUFBRSxDQUFDO0lBQzlELENBQUM7SUFFRCx3REFBd0Q7SUFDeEQsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDO0lBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDbkMsT0FBTztZQUNOLEtBQUssRUFBRSxLQUFLO1lBQ1osS0FBSyxFQUFFLHFFQUFxRTtTQUM1RSxDQUFDO0lBQ0gsQ0FBQztJQUVELHFDQUFxQztJQUNyQyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUs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
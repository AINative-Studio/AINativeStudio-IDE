/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Execute the /skill list command
 */
export async function executeListCommand(registry, configService, options = {}) {
    // Get all installed skills
    const installedSkills = await registry.list();
    // Get enabled skills from config
    const enabledSkillNames = await configService.getEnabledSkills();
    const enabledSet = new Set(enabledSkillNames);
    // Create formatted entries
    const formattedEntries = installedSkills.map(entry => {
        const isEnabled = enabledSet.has(entry.name);
        return {
            statusIcon: isEnabled ? '✅' : '❌',
            name: entry.name,
            version: entry.version,
            description: 'Skill description', // TODO: Load from SKILL.md metadata
            source: formatSource(entry.source),
            enabled: isEnabled
        };
    });
    // Apply filters
    let filteredEntries = formattedEntries;
    if (options.enabled) {
        filteredEntries = formattedEntries.filter(e => e.enabled);
    }
    else if (options.disabled) {
        filteredEntries = formattedEntries.filter(e => !e.enabled);
    }
    // Sort: enabled first, then alphabetically
    filteredEntries.sort((a, b) => {
        if (a.enabled !== b.enabled) {
            return a.enabled ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    // Calculate counts
    const totalCount = installedSkills.length;
    const enabledCount = formattedEntries.filter(e => e.enabled).length;
    const disabledCount = totalCount - enabledCount;
    // Generate formatted output
    const output = formatOutput(filteredEntries, totalCount, enabledCount, disabledCount, options);
    return {
        skills: filteredEntries,
        totalCount,
        enabledCount,
        disabledCount,
        output
    };
}
/**
 * Format the output string for display
 */
function formatOutput(skills, totalCount, enabledCount, disabledCount, options) {
    if (skills.length === 0) {
        if (options.enabled) {
            return 'No enabled skills found.\n\nUse "/skill list" to see all installed skills.';
        }
        else if (options.disabled) {
            return 'No disabled skills found.\n\nUse "/skill list" to see all installed skills.';
        }
        else {
            return 'No skills installed.\n\nUse "/skill create <skill-name>" to create a new skill.';
        }
    }
    const lines = [];
    // Header
    if (options.enabled) {
        lines.push('Enabled Skills:\n');
    }
    else if (options.disabled) {
        lines.push('Disabled Skills:\n');
    }
    else {
        lines.push('Installed Skills:\n');
    }
    // Skill entries
    for (const skill of skills) {
        lines.push(`${skill.statusIcon} ${skill.name} (${skill.version})`);
        lines.push(`   ${skill.description}`);
        lines.push(`   Source: ${skill.source}`);
        if (options.disabled && !skill.enabled) {
            lines.push('   [DISABLED]');
        }
        lines.push(''); // Empty line between entries
    }
    // Footer with summary
    if (!options.enabled && !options.disabled) {
        lines.push(`Total: ${totalCount} skill${totalCount !== 1 ? 's' : ''} (${enabledCount} enabled, ${disabledCount} disabled)`);
    }
    else if (options.enabled) {
        lines.push(`Total: ${skills.length} enabled skill${skills.length !== 1 ? 's' : ''}`);
    }
    else if (options.disabled) {
        lines.push(`Total: ${skills.length} disabled skill${skills.length !== 1 ? 's' : ''}`);
    }
    return lines.join('\n');
}
/**
 * Format source type for display
 */
function formatSource(source) {
    switch (source) {
        case 'local':
            return 'local';
        case 'npm':
            return 'official';
        case 'git':
            return 'community';
        default:
            return source;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvY2xpL2xpc3RDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBaURoRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsa0JBQWtCLENBQ3ZDLFFBQXlCLEVBQ3pCLGFBQWtDLEVBQ2xDLFVBQThCLEVBQUU7SUFFaEMsMkJBQTJCO0lBQzNCLE1BQU0sZUFBZSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRTlDLGlDQUFpQztJQUNqQyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDakUsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUU5QywyQkFBMkI7SUFDM0IsTUFBTSxnQkFBZ0IsR0FBMEIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMzRSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxPQUFPO1lBQ04sVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHO1lBQ2pDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDdEIsV0FBVyxFQUFFLG1CQUFtQixFQUFFLG9DQUFvQztZQUN0RSxNQUFNLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDbEMsT0FBTyxFQUFFLFNBQVM7U0FDbEIsQ0FBQztJQUNILENBQUMsQ0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ISkillsRegistry } from '../skillRegistryTypes.js';
import { ISkillConfigService } from '../skillConfigServiceTypes.js';

/**
 * Filter options for listing skills
 */
export interface ListCommandOptions {
	/** Filter to show only enabled skills */
	enabled?: boolean;
	/** Filter to show only disabled skills */
	disabled?: boolean;
}

/**
 * Formatted output for a single skill entry
 */
export interface FormattedSkillEntry {
	/** Status icon (✅ or ❌) */
	statusIcon: string;
	/** Skill name */
	name: string;
	/** Skill version */
	version: string;
	/** Skill description (from metadata if available) */
	description: string;
	/** Source of the skill */
	source: string;
	/** Whether skill is enabled */
	enabled: boolean;
}

/**
 * Result of the list command
 */
export interface ListCommandResult {
	/** Formatted skill entries */
	skills: FormattedSkillEntry[];
	/** Total count */
	totalCount: number;
	/** Enabled count */
	enabledCount: number;
	/** Disabled count */
	disabledCount: number;
	/** Formatted output string */
	output: string;
}

/**
 * Execute the /skill list command
 */
export async function executeListCommand(
	registry: ISkillsRegistry,
	configService: ISkillConfigService,
	options: ListCommandOptions = {}
): Promise<ListCommandResult> {
	// Get all installed skills
	const installedSkills = await registry.list();

	// Get enabled skills from config
	const enabledSkillNames = await configService.getEnabledSkills();
	const enabledSet = new Set(enabledSkillNames);

	// Create formatted entries
	const formattedEntries: FormattedSkillEntry[] = installedSkills.map(entry => {
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
	} else if (options.disabled) {
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
function formatOutput(
	skills: FormattedSkillEntry[],
	totalCount: number,
	enabledCount: number,
	disabledCount: number,
	options: ListCommandOptions
): string {
	if (skills.length === 0) {
		if (options.enabled) {
			return 'No enabled skills found.\n\nUse "/skill list" to see all installed skills.';
		} else if (options.disabled) {
			return 'No disabled skills found.\n\nUse "/skill list" to see all installed skills.';
		} else {
			return 'No skills installed.\n\nUse "/skill create <skill-name>" to create a new skill.';
		}
	}

	const lines: string[] = [];

	// Header
	if (options.enabled) {
		lines.push('Enabled Skills:\n');
	} else if (options.disabled) {
		lines.push('Disabled Skills:\n');
	} else {
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
	} else if (options.enabled) {
		lines.push(`Total: ${skills.length} enabled skill${skills.length !== 1 ? 's' : ''}`);
	} else if (options.disabled) {
		lines.push(`Total: ${skills.length} disabled skill${skills.length !== 1 ? 's' : ''}`);
	}

	return lines.join('\n');
}

/**
 * Format source type for display
 */
function formatSource(source: string): string {
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

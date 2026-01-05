/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { MarketplaceSkill, MarketplaceSource } from '../../marketplace/marketplaceTypes.js';

/**
 * Format marketplace skills for CLI output
 */
export class MarketplaceFormatter {

	/**
	 * Get icon for marketplace source
	 */
	private static getSourceIcon(source: MarketplaceSource): string {
		switch (source) {
			case 'official':
				return '📦';
			case 'anthropic':
				return '🔧';
			case 'community':
				return '🌐';
			default:
				return '📄';
		}
	}

	/**
	 * Get display name for marketplace source
	 */
	private static getSourceDisplayName(source: MarketplaceSource): string {
		switch (source) {
			case 'official':
				return 'Official AINative Skills (npmjs.com/@ainative)';
			case 'anthropic':
				return 'Anthropic Skills (github.com/anthropics/skills)';
			case 'community':
				return 'Community Skills (api.ainative.studio)';
			default:
				return 'Unknown Source';
		}
	}

	/**
	 * Format a single skill for display
	 */
	private static formatSkill(skill: MarketplaceSkill): string {
		const icon = this.getSourceIcon(skill.source);
		const lines: string[] = [];

		// Skill header with icon
		lines.push(`  ${icon} ${skill.name} - ${skill.description}`);

		// Installation command
		lines.push(`     Install: /skill install ${skill.installCommand}`);

		// Version and metadata (optional)
		const metadata: string[] = [];
		if (skill.version) {
			metadata.push(`v${skill.version}`);
		}
		if (skill.author) {
			metadata.push(`by ${skill.author}`);
		}
		if (skill.rating !== undefined) {
			const stars = '⭐'.repeat(Math.round(skill.rating));
			metadata.push(`${stars} (${skill.rating.toFixed(1)})`);
		}
		if (skill.downloads !== undefined) {
			metadata.push(`${skill.downloads.toLocaleString()} downloads`);
		}

		if (metadata.length > 0) {
			lines.push(`     ${metadata.join(' • ')}`);
		}

		return lines.join('\n');
	}

	/**
	 * Group skills by source
	 */
	private static groupBySource(skills: MarketplaceSkill[]): Map<MarketplaceSource, MarketplaceSkill[]> {
		const groups = new Map<MarketplaceSource, MarketplaceSkill[]>();

		for (const skill of skills) {
			if (!groups.has(skill.source)) {
				groups.set(skill.source, []);
			}
			groups.get(skill.source)!.push(skill);
		}

		return groups;
	}

	/**
	 * Format browse results with grouped output
	 */
	static formatBrowseResults(skills: MarketplaceSkill[], searchTerm?: string, filters?: {
		category?: string;
		provider?: MarketplaceSource;
	}): string {
		if (skills.length === 0) {
			return this.formatEmptyResults(searchTerm, filters);
		}

		const lines: string[] = [];

		// Header
		if (searchTerm || filters?.category || filters?.provider) {
			const filterParts: string[] = [];
			if (searchTerm) {
				filterParts.push(`search: "${searchTerm}"`);
			}
			if (filters?.category) {
				filterParts.push(`category: ${filters.category}`);
			}
			if (filters?.provider) {
				filterParts.push(`provider: ${filters.provider}`);
			}
			lines.push(`Available Skills (${filterParts.join(', ')}):\n`);
		} else {
			lines.push('Available Skills:\n');
		}

		// Group by source
		const grouped = this.groupBySource(skills);

		// Display in preferred order: official, anthropic, community
		const sourceOrder: MarketplaceSource[] = ['official', 'anthropic', 'community'];

		for (const source of sourceOrder) {
			const sourceSkills = grouped.get(source);
			if (!sourceSkills || sourceSkills.length === 0) {
				continue;
			}

			// Source header
			lines.push(`${this.getSourceDisplayName(source)}:`);

			// Skills under this source
			for (const skill of sourceSkills) {
				lines.push(this.formatSkill(skill));
				lines.push(''); // Empty line between skills
			}
		}

		// Summary footer
		lines.push(`Total: ${skills.length} skill${skills.length !== 1 ? 's' : ''} available across ${grouped.size} ${grouped.size === 1 ? 'registry' : 'registries'}`);
		lines.push('');
		lines.push('Use --category or search term to filter results.');

		return lines.join('\n');
	}

	/**
	 * Format empty results with helpful suggestions
	 */
	private static formatEmptyResults(searchTerm?: string, filters?: {
		category?: string;
		provider?: MarketplaceSource;
	}): string {
		const lines: string[] = [];

		lines.push('No skills found.');
		lines.push('');

		if (searchTerm || filters?.category || filters?.provider) {
			lines.push('Try:');
			lines.push('  • Broadening your search criteria');
			lines.push('  • Removing filters');
			lines.push('  • Using different keywords');
			lines.push('  • Running /skill marketplace browse to see all available skills');
		} else {
			lines.push('The marketplace appears to be empty or unavailable.');
			lines.push('Please check your network connection and try again.');
		}

		return lines.join('\n');
	}

	/**
	 * Format error message with helpful information
	 */
	static formatError(error: Error, source?: MarketplaceSource): string {
		const lines: string[] = [];

		if (source) {
			lines.push(`Error fetching skills from ${this.getSourceDisplayName(source)}:`);
		} else {
			lines.push('Error browsing marketplace:');
		}

		lines.push(`  ${error.message}`);
		lines.push('');

		// Provide helpful suggestions based on error type
		if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
			lines.push('This appears to be a network error. Please check:');
			lines.push('  • Your internet connection');
			lines.push('  • Firewall or proxy settings');
			lines.push('  • Try again with --force-refresh to bypass cache');
		} else if (error.message.includes('rate limit')) {
			lines.push('Rate limit exceeded. Please:');
			lines.push('  • Wait a few minutes and try again');
			lines.push('  • Use cached results (omit --force-refresh flag)');
		} else if (error.message.includes('timeout')) {
			lines.push('Request timed out. Please:');
			lines.push('  • Check your internet connection');
			lines.push('  • Try again later');
		}

		return lines.join('\n');
	}

	/**
	 * Format loading message with progress
	 */
	static formatLoading(message: string): string {
		return `${message}...`;
	}

	/**
	 * Format cache status information
	 */
	static formatCacheStatus(cacheInfo: {
		official: { valid: boolean; age: number; lastUpdate: Date | null };
		anthropic: { valid: boolean; age: number; lastUpdate: Date | null };
		community: { valid: boolean; age: number; lastUpdate: Date | null };
	}): string {
		const lines: string[] = [];

		lines.push('Cache Status:');
		lines.push('');

		const formatAge = (age: number): string => {
			const minutes = Math.floor(age / 60000);
			if (minutes < 1) {
				return 'just now';
			} else if (minutes < 60) {
				return `${minutes}m ago`;
			} else {
				const hours = Math.floor(minutes / 60);
				return `${hours}h ago`;
			}
		};

		const sources: Array<{ name: string; info: { valid: boolean; age: number; lastUpdate: Date | null } }> = [
			{ name: 'Official', info: cacheInfo.official },
			{ name: 'Anthropic', info: cacheInfo.anthropic },
			{ name: 'Community', info: cacheInfo.community }
		];

		for (const { name, info } of sources) {
			const status = info.valid ? '✓ Valid' : '✗ Expired';
			const updated = info.lastUpdate ? formatAge(info.age) : 'never';
			lines.push(`  ${name}: ${status} (updated ${updated})`);
		}

		lines.push('');
		lines.push('Use --force-refresh to update cache.');

		return lines.join('\n');
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Format marketplace skills for CLI output
 */
export class MarketplaceFormatter {
    /**
     * Get icon for marketplace source
     */
    static getSourceIcon(source) {
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
    static getSourceDisplayName(source) {
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
    static formatSkill(skill) {
        const icon = this.getSourceIcon(skill.source);
        const lines = [];
        // Skill header with icon
        lines.push(`  ${icon} ${skill.name} - ${skill.description}`);
        // Installation command
        lines.push(`     Install: /skill install ${skill.installCommand}`);
        // Version and metadata (optional)
        const metadata = [];
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
    static groupBySource(skills) {
        const groups = new Map();
        for (const skill of skills) {
            if (!groups.has(skill.source)) {
                groups.set(skill.source, []);
            }
            groups.get(skill.source).push(skill);
        }
        return groups;
    }
    /**
     * Format browse results with grouped output
     */
    static formatBrowseResults(skills, searchTerm, filters) {
        if (skills.length === 0) {
            return this.formatEmptyResults(searchTerm, filters);
        }
        const lines = [];
        // Header
        if (searchTerm || filters?.category || filters?.provider) {
            const filterParts = [];
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
        }
        else {
            lines.push('Available Skills:\n');
        }
        // Group by source
        const grouped = this.groupBySource(skills);
        // Display in preferred order: official, anthropic, community
        const sourceOrder = ['official', 'anthropic', 'community'];
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
    static formatEmptyResults(searchTerm, filters) {
        const lines = [];
        lines.push('No skills found.');
        lines.push('');
        if (searchTerm || filters?.category || filters?.provider) {
            lines.push('Try:');
            lines.push('  • Broadening your search criteria');
            lines.push('  • Removing filters');
            lines.push('  • Using different keywords');
            lines.push('  • Running /skill marketplace browse to see all available skills');
        }
        else {
            lines.push('The marketplace appears to be empty or unavailable.');
            lines.push('Please check your network connection and try again.');
        }
        return lines.join('\n');
    }
    /**
     * Format error message with helpful information
     */
    static formatError(error, source) {
        const lines = [];
        if (source) {
            lines.push(`Error fetching skills from ${this.getSourceDisplayName(source)}:`);
        }
        else {
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
        }
        else if (error.message.includes('rate limit')) {
            lines.push('Rate limit exceeded. Please:');
            lines.push('  • Wait a few minutes and try again');
            lines.push('  • Use cached results (omit --force-refresh flag)');
        }
        else if (error.message.includes('timeout')) {
            lines.push('Request timed out. Please:');
            lines.push('  • Check your internet connection');
            lines.push('  • Try again later');
        }
        return lines.join('\n');
    }
    /**
     * Format loading message with progress
     */
    static formatLoading(message) {
        return `${message}...`;
    }
    /**
     * Format cache status information
     */
    static formatCacheStatus(cacheInfo) {
        const lines = [];
        lines.push('Cache Status:');
        lines.push('');
        const formatAge = (age) => {
            const minutes = Math.floor(age / 60000);
            if (minutes < 1) {
                return 'just now';
            }
            else if (minutes < 60) {
                return `${minutes}m ago`;
            }
            else {
                const hours = Math.floor(minutes / 60);
                return `${hours}h ago`;
            }
        };
        const sources = [
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2VGb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9za2lsbHMvY2xpL21hcmtldHBsYWNlRm9ybWF0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG9CQUFvQjtJQUVoQzs7T0FFRztJQUNLLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBeUI7UUFDckQsUUFBUSxNQUFNLEVBQUUsQ0FBQztZQUNoQixLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxJQUFJLENBQUM7WUFDYixLQUFLLFdBQVc7Z0JBQ2YsT0FBTyxJQUFJLENBQUM7WUFDYixLQUFLLFdBQVc7Z0JBQ2YsT0FBTyxJQUFJLENBQUM7WUFDYjtnQkFDQyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsb0JBQW9CLENBQUMsTUFBeUI7UUFDNUQsUUFBUSxNQUFNLEVBQUUsQ0FBQztZQUNoQixLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxnREFBZ0QsQ0FBQztZQUN6RCxLQUFLLFdBQVc7Z0JBQ2YsT0FBTyxpREFBaUQsQ0FBQztZQUMxRCxLQUFLLFdBQVc7Z0JBQ2YsT0FBTyx3Q0FBd0MsQ0FBQztZQUNqRDtnQkFDQyxPQUFPLGdCQUFnQixDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQXVCO1FBQ2pELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztRQUUzQix5QkFBeUI7UUFD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
export class Query {
    constructor(value, sortBy) {
        this.value = value;
        this.sortBy = sortBy;
        this.value = value.trim();
    }
    static suggestions(query, galleryManifest) {
        const commands = ['installed', 'updates', 'enabled', 'disabled', 'builtin'];
        if (galleryManifest?.capabilities.extensionQuery?.filtering?.some(c => c.name === "Featured" /* FilterType.Featured */)) {
            commands.push('featured');
        }
        commands.push(...['popular', 'recommended', 'recentlyPublished', 'workspaceUnsupported', 'deprecated', 'sort']);
        const isCategoriesEnabled = galleryManifest?.capabilities.extensionQuery?.filtering?.some(c => c.name === "Category" /* FilterType.Category */);
        if (isCategoriesEnabled) {
            commands.push('category');
        }
        commands.push(...['tag', 'ext', 'id', 'outdated', 'recentlyUpdated']);
        const sortCommands = [];
        if (galleryManifest?.capabilities.extensionQuery?.sorting?.some(c => c.name === "InstallCount" /* SortBy.InstallCount */)) {
            sortCommands.push('installs');
        }
        if (galleryManifest?.capabilities.extensionQuery?.sorting?.some(c => c.name === "WeightedRating" /* SortBy.WeightedRating */)) {
            sortCommands.push('rating');
        }
        sortCommands.push('name', 'publishedDate', 'updateDate');
        const subcommands = {
            'sort': sortCommands,
            'category': isCategoriesEnabled ? EXTENSION_CATEGORIES.map(c => `"${c.toLowerCase()}"`) : [],
            'tag': [''],
            'ext': [''],
            'id': ['']
        };
        const queryContains = (substr) => query.indexOf(substr) > -1;
        const hasSort = subcommands.sort.some(subcommand => queryContains(`@sort:${subcommand}`));
        const hasCategory = subcommands.category.some(subcommand => queryContains(`@category:${subcommand}`));
        return commands.flatMap(command => {
            if (hasSort && command === 'sort' || hasCategory && command === 'category') {
                return [];
            }
            if (command in subcommands) {
                return subcommands[command]
                    .map(subcommand => `@${command}:${subcommand}${subcommand === '' ? '' : ' '}`);
            }
            else {
                return queryContains(`@${command}`) ? [] : [`@${command} `];
            }
        });
    }
    static parse(value) {
        let sortBy = '';
        value = value.replace(/@sort:(\w+)(-\w*)?/g, (match, by, order) => {
            sortBy = by;
            return '';
        });
        return new Query(value, sortBy);
    }
    toString() {
        let result = this.value;
        if (this.sortBy) {
            result = `${result}${result ? ' ' : ''}@sort:${this.sortBy}`;
        }
        return result;
    }
    isValid() {
        return !/@outdated/.test(this.value);
    }
    equals(other) {
        return this.value === other.value && this.sortBy === other.sortBy;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUXVlcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25RdWVyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUU1RixNQUFNLE9BQU8sS0FBSztJQUVqQixZQUFtQixLQUFhLEVBQVMsTUFBYztRQUFwQyxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQVMsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUN0RCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFhLEVBQUUsZUFBaUQ7UUFFbEYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUUsSUFBSSxlQUFlLEVBQUUsWUFBWSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUkseUNBQXdCLENBQUMsRUFBRSxDQUFDO1lBQ3hHLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUVELFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEgsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLEVBQUUsWUFBWSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFB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
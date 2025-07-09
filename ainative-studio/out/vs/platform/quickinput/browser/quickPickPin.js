/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { localize } from '../../../nls.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
const pinButtonClass = ThemeIcon.asClassName(Codicon.pin);
const pinnedButtonClass = ThemeIcon.asClassName(Codicon.pinned);
const buttonClasses = [pinButtonClass, pinnedButtonClass];
/**
 * Initially, adds pin buttons to all @param quickPick items.
 * When pinned, a copy of the item will be moved to the end of the pinned list and any duplicate within the pinned list will
 * be removed if @param filterDupliates has been provided. Pin and pinned button events trigger updates to the underlying storage.
 * Shows the quickpick once formatted.
 */
export function showWithPinnedItems(storageService, storageKey, quickPick, filterDuplicates) {
    const itemsWithoutPinned = quickPick.items;
    let itemsWithPinned = _formatPinnedItems(storageKey, quickPick, storageService, undefined, filterDuplicates);
    const disposables = new DisposableStore();
    disposables.add(quickPick.onDidTriggerItemButton(async (buttonEvent) => {
        const expectedButton = buttonEvent.button.iconClass && buttonClasses.includes(buttonEvent.button.iconClass);
        if (expectedButton) {
            quickPick.items = itemsWithoutPinned;
            itemsWithPinned = _formatPinnedItems(storageKey, quickPick, storageService, buttonEvent.item, filterDuplicates);
            quickPick.items = quickPick.value ? itemsWithoutPinned : itemsWithPinned;
        }
    }));
    disposables.add(quickPick.onDidChangeValue(async (value) => {
        if (quickPick.items === itemsWithPinned && value) {
            quickPick.items = itemsWithoutPinned;
        }
        else if (quickPick.items === itemsWithoutPinned && !value) {
            quickPick.items = itemsWithPinned;
        }
    }));
    quickPick.items = quickPick.value ? itemsWithoutPinned : itemsWithPinned;
    quickPick.show();
    return disposables;
}
function _formatPinnedItems(storageKey, quickPick, storageService, changedItem, filterDuplicates) {
    const formattedItems = [];
    let pinnedItems;
    if (changedItem) {
        pinnedItems = updatePinnedItems(storageKey, changedItem, storageService);
    }
    else {
        pinnedItems = getPinnedItems(storageKey, storageService);
    }
    if (pinnedItems.length) {
        formattedItems.push({ type: 'separator', label: localize("terminal.commands.pinned", 'pinned') });
    }
    const pinnedIds = new Set();
    for (const itemToFind of pinnedItems) {
        const itemToPin = quickPick.items.find(item => itemsMatch(item, itemToFind));
        if (itemToPin) {
            const pinnedItemId = getItemIdentifier(itemToPin);
            const pinnedItem = { ...itemToPin };
            if (!filterDuplicates || !pinnedIds.has(pinnedItemId)) {
                pinnedIds.add(pinnedItemId);
                updateButtons(pinnedItem, false);
                formattedItems.push(pinnedItem);
            }
        }
    }
    for (const item of quickPick.items) {
        updateButtons(item, true);
        formattedItems.push(item);
    }
    return formattedItems;
}
function getItemIdentifier(item) {
    return item.type === 'separator' ? '' : item.id || `${item.label}${item.description}${item.detail}}`;
}
function updateButtons(item, removePin) {
    if (item.type === 'separator') {
        return;
    }
    // remove button classes before adding the new one
    const newButtons = item.buttons?.filter(button => button.iconClass && !buttonClasses.includes(button.iconClass)) ?? [];
    newButtons.unshift({
        iconClass: removePin ? pinButtonClass : pinnedButtonClass,
        tooltip: removePin ? localize('pinCommand', "Pin command") : localize('pinnedCommand', "Pinned command"),
        alwaysVisible: false
    });
    item.buttons = newButtons;
}
function itemsMatch(itemA, itemB) {
    return getItemIdentifier(itemA) === getItemIdentifier(itemB);
}
function updatePinnedItems(storageKey, changedItem, storageService) {
    const removePin = changedItem.buttons?.find(b => b.iconClass === pinnedButtonClass);
    let items = getPinnedItems(storageKey, storageService);
    if (removePin) {
        items = items.filter(item => getItemIdentifier(item) !== getItemIdentifier(changedItem));
    }
    else {
        items.push(changedItem);
    }
    storageService.store(storageKey, JSON.stringify(items), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    return items;
}
function getPinnedItems(storageKey, storageService) {
    const items = storageService.get(storageKey, 1 /* StorageScope.WORKSPACE */);
    return items ? JSON.parse(items) : [];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tQaWNrUGluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja1BpY2tQaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUczQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBRWpGLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzFELE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDaEUsTUFBTSxhQUFhLEdBQUcsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUMxRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxjQUErQixFQUFFLFVBQWtCLEVBQUUsU0FBOEQsRUFBRSxnQkFBMEI7SUFDbEwsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO0lBQzNDLElBQUksZUFBZSxHQUFHLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzdHLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFDLFdBQVcsRUFBQyxFQUFFO1FBQ3BFLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLENBQUM7WUFDckMsZUFBZSxHQUFHLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUNoSCxTQUFTLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7UUFDMUUsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUMsS0FBSyxFQUFDLEVBQUU7UUFDeEQsSUFBSSxTQUFTLENBQUMsS0FBSyxLQUFLLGVBQWUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNsRCxTQUFTLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDO1FBQ3RDLENBQUM7YUFBTSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEtBQUssa0JBQWtCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM3RCxTQUFTLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVKLFNBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztJQUN6RSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDakIsT0FBTyxXQUFXLENBQUM7QUFDcEIsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsVUFBa0IsRUFBRSxTQUE4RCxFQUFFLGNBQStCLEVBQUUsV0FBNEIsRUFBRSxnQkFBMEI7SUFDeE0sTUFBTSxjQUFjLEdBQW9CLEVBQUUsQ0FBQztJQUMzQyxJQUFJLFdBQVcsQ0FBQztJQUNoQixJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7U0FBTSxDQUFDO1FBQ1AsV0FBVyxHQUFHLGNBQWMsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUNELElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQzVCLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7UUFDdEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0UsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sVUFBVSxHQUFtQixFQUFFLEdBQUksU0FBNEIsRUFBRSxDQUFDO1lBQ3hFLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDdkQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDNUIsYUFBYSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDakMsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNqQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFCLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUNELE9BQU8sY0FBYyxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQW1CO0lBQzdDLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7QUFDdEcsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQW1CLEVBQUUsU0FBa0I7SUFDN0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQy9CLE9BQU87SUFDUixDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZILFVBQVUsQ0FBQyxPQUFPLENBQUM7UUFDbEIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7UUFDekQsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztRQUN4RyxhQUFhLEVBQUUsS0FBSztLQUNwQixDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztBQUMzQixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsS0FBb0IsRUFBRSxLQUFvQjtJQUM3RCxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlELENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsV0FBMkIsRUFBRSxjQUErQjtJQUMxRyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssaUJBQWlCLENBQUMsQ0FBQztJQUNwRixJQUFJLEtBQUssR0FBRyxjQUFjLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ3ZELElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQztTQUFNLENBQUM7UUFDUCxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFDRCxjQUFjLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxnRUFBZ0QsQ0FBQztJQUN2RyxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxVQUFrQixFQUFFLGNBQStCO0lBQzFFLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQztJQUNyRSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3ZDLENBQUMifQ==
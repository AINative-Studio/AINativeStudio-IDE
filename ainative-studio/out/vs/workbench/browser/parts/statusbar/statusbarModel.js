/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isStatusbarEntryLocation } from '../../../services/statusbar/browser/statusbar.js';
import { hide, show, isAncestorOfActiveElement } from '../../../../base/browser/dom.js';
import { Emitter } from '../../../../base/common/event.js';
export class StatusbarViewModel extends Disposable {
    static { this.HIDDEN_ENTRIES_KEY = 'workbench.statusbar.hidden'; }
    get entries() { return this._entries.slice(0); }
    get lastFocusedEntry() {
        return this._lastFocusedEntry && !this.isHidden(this._lastFocusedEntry.id) ? this._lastFocusedEntry : undefined;
    }
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this._onDidChangeEntryVisibility = this._register(new Emitter());
        this.onDidChangeEntryVisibility = this._onDidChangeEntryVisibility.event;
        this._entries = []; // Intentionally not using a map here since multiple entries can have the same ID
        this.hidden = new Set();
        this.restoreState();
        this.registerListeners();
    }
    restoreState() {
        const hiddenRaw = this.storageService.get(StatusbarViewModel.HIDDEN_ENTRIES_KEY, 0 /* StorageScope.PROFILE */);
        if (hiddenRaw) {
            try {
                this.hidden = new Set(JSON.parse(hiddenRaw));
            }
            catch (error) {
                // ignore parsing errors
            }
        }
    }
    registerListeners() {
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, StatusbarViewModel.HIDDEN_ENTRIES_KEY, this._store)(() => this.onDidStorageValueChange()));
    }
    onDidStorageValueChange() {
        // Keep current hidden entries
        const currentlyHidden = new Set(this.hidden);
        // Load latest state of hidden entries
        this.hidden.clear();
        this.restoreState();
        const changed = new Set();
        // Check for each entry that is now visible
        for (const id of currentlyHidden) {
            if (!this.hidden.has(id)) {
                changed.add(id);
            }
        }
        // Check for each entry that is now hidden
        for (const id of this.hidden) {
            if (!currentlyHidden.has(id)) {
                changed.add(id);
            }
        }
        // Update visibility for entries have changed
        if (changed.size > 0) {
            for (const entry of this._entries) {
                if (changed.has(entry.id)) {
                    this.updateVisibility(entry.id, true);
                    changed.delete(entry.id);
                }
            }
        }
    }
    add(entry) {
        // Add to set of entries
        this._entries.push(entry);
        // Update visibility directly
        this.updateVisibility(entry, false);
        // Sort according to priority
        this.sort();
        // Mark first/last visible entry
        this.markFirstLastVisibleEntry();
    }
    remove(entry) {
        const index = this._entries.indexOf(entry);
        if (index >= 0) {
            // Remove from entries
            this._entries.splice(index, 1);
            // Re-sort entries if this one was used
            // as reference from other entries
            if (this._entries.some(otherEntry => isStatusbarEntryLocation(otherEntry.priority.primary) && otherEntry.priority.primary.location.id === entry.id)) {
                this.sort();
            }
            // Mark first/last visible entry
            this.markFirstLastVisibleEntry();
        }
    }
    isHidden(id) {
        return this.hidden.has(id);
    }
    hide(id) {
        if (!this.hidden.has(id)) {
            this.hidden.add(id);
            this.updateVisibility(id, true);
            this.saveState();
        }
    }
    show(id) {
        if (this.hidden.has(id)) {
            this.hidden.delete(id);
            this.updateVisibility(id, true);
            this.saveState();
        }
    }
    findEntry(container) {
        return this._entries.find(entry => entry.container === container);
    }
    getEntries(alignment) {
        return this._entries.filter(entry => entry.alignment === alignment);
    }
    focusNextEntry() {
        this.focusEntry(+1, 0);
    }
    focusPreviousEntry() {
        this.focusEntry(-1, this.entries.length - 1);
    }
    isEntryFocused() {
        return !!this.getFocusedEntry();
    }
    getFocusedEntry() {
        return this._entries.find(entry => isAncestorOfActiveElement(entry.container));
    }
    focusEntry(delta, restartPosition) {
        const getVisibleEntry = (start) => {
            let indexToFocus = start;
            let entry = (indexToFocus >= 0 && indexToFocus < this._entries.length) ? this._entries[indexToFocus] : undefined;
            while (entry && this.isHidden(entry.id)) {
                indexToFocus += delta;
                entry = (indexToFocus >= 0 && indexToFocus < this._entries.length) ? this._entries[indexToFocus] : undefined;
            }
            return entry;
        };
        const focused = this.getFocusedEntry();
        if (focused) {
            const entry = getVisibleEntry(this._entries.indexOf(focused) + delta);
            if (entry) {
                this._lastFocusedEntry = entry;
                entry.labelContainer.focus();
                return;
            }
        }
        const entry = getVisibleEntry(restartPosition);
        if (entry) {
            this._lastFocusedEntry = entry;
            entry.labelContainer.focus();
        }
    }
    updateVisibility(arg1, trigger) {
        // By identifier
        if (typeof arg1 === 'string') {
            const id = arg1;
            for (const entry of this._entries) {
                if (entry.id === id) {
                    this.updateVisibility(entry, trigger);
                }
            }
        }
        // By entry
        else {
            const entry = arg1;
            const isHidden = this.isHidden(entry.id);
            // Use CSS to show/hide item container
            if (isHidden) {
                hide(entry.container);
            }
            else {
                show(entry.container);
            }
            if (trigger) {
                this._onDidChangeEntryVisibility.fire({ id: entry.id, visible: !isHidden });
            }
            // Mark first/last visible entry
            this.markFirstLastVisibleEntry();
        }
    }
    saveState() {
        if (this.hidden.size > 0) {
            this.storageService.store(StatusbarViewModel.HIDDEN_ENTRIES_KEY, JSON.stringify(Array.from(this.hidden.values())), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        else {
            this.storageService.remove(StatusbarViewModel.HIDDEN_ENTRIES_KEY, 0 /* StorageScope.PROFILE */);
        }
    }
    sort() {
        const allEntryIds = new Set(this._entries.map(entry => entry.id));
        // Split up entries into 2 buckets:
        // - those with priority as number that can be compared or with a missing relative entry
        // - those with a relative priority that must be sorted relative to another entry that exists
        const mapEntryWithNumberedPriorityToIndex = new Map();
        const mapEntryWithRelativePriority = new Map();
        for (let i = 0; i < this._entries.length; i++) {
            const entry = this._entries[i];
            if (typeof entry.priority.primary === 'number' || !allEntryIds.has(entry.priority.primary.location.id)) {
                mapEntryWithNumberedPriorityToIndex.set(entry, i);
            }
            else {
                const referenceEntryId = entry.priority.primary.location.id;
                let entries = mapEntryWithRelativePriority.get(referenceEntryId);
                if (!entries) {
                    // It is possible that this entry references another entry
                    // that itself references an entry. In that case, we want
                    // to add it to the entries of the referenced entry.
                    for (const relativeEntries of mapEntryWithRelativePriority.values()) {
                        if (relativeEntries.has(referenceEntryId)) {
                            entries = relativeEntries;
                            break;
                        }
                    }
                    if (!entries) {
                        entries = new Map();
                        mapEntryWithRelativePriority.set(referenceEntryId, entries);
                    }
                }
                entries.set(entry.id, entry);
            }
        }
        // Sort the entries with `priority: number` or referencing a missing entry accordingly
        const sortedEntriesWithNumberedPriority = Array.from(mapEntryWithNumberedPriorityToIndex.keys());
        sortedEntriesWithNumberedPriority.sort((entryA, entryB) => {
            if (entryA.alignment === entryB.alignment) {
                // Sort by primary/secondary priority: higher values move towards the left
                const entryAPrimaryPriority = typeof entryA.priority.primary === 'number' ? entryA.priority.primary : entryA.priority.primary.location.priority;
                const entryBPrimaryPriority = typeof entryB.priority.primary === 'number' ? entryB.priority.primary : entryB.priority.primary.location.priority;
                if (entryAPrimaryPriority !== entryBPrimaryPriority) {
                    return entryBPrimaryPriority - entryAPrimaryPriority;
                }
                if (entryA.priority.secondary !== entryB.priority.secondary) {
                    return entryB.priority.secondary - entryA.priority.secondary;
                }
                // otherwise maintain stable order (both values known to be in map)
                return mapEntryWithNumberedPriorityToIndex.get(entryA) - mapEntryWithNumberedPriorityToIndex.get(entryB);
            }
            if (entryA.alignment === 0 /* StatusbarAlignment.LEFT */) {
                return -1;
            }
            if (entryB.alignment === 0 /* StatusbarAlignment.LEFT */) {
                return 1;
            }
            return 0;
        });
        let sortedEntries;
        // Entries with location: sort in accordingly
        if (mapEntryWithRelativePriority.size > 0) {
            sortedEntries = [];
            for (const entry of sortedEntriesWithNumberedPriority) {
                const relativeEntriesMap = mapEntryWithRelativePriority.get(entry.id);
                const relativeEntries = relativeEntriesMap ? Array.from(relativeEntriesMap.values()) : undefined;
                // Fill relative entries to LEFT
                if (relativeEntries) {
                    sortedEntries.push(...relativeEntries
                        .filter(entry => isStatusbarEntryLocation(entry.priority.primary) && entry.priority.primary.alignment === 0 /* StatusbarAlignment.LEFT */)
                        .sort((entryA, entryB) => entryB.priority.secondary - entryA.priority.secondary));
                }
                // Fill referenced entry
                sortedEntries.push(entry);
                // Fill relative entries to RIGHT
                if (relativeEntries) {
                    sortedEntries.push(...relativeEntries
                        .filter(entry => isStatusbarEntryLocation(entry.priority.primary) && entry.priority.primary.alignment === 1 /* StatusbarAlignment.RIGHT */)
                        .sort((entryA, entryB) => entryB.priority.secondary - entryA.priority.secondary));
                }
                // Delete from map to mark as handled
                mapEntryWithRelativePriority.delete(entry.id);
            }
            // Finally, just append all entries that reference another entry
            // that does not exist to the end of the list
            //
            // Note: this should really not happen because of our check in
            // `allEntryIds`, but we play it safe here to really consume
            // all entries.
            //
            for (const [, entries] of mapEntryWithRelativePriority) {
                sortedEntries.push(...Array.from(entries.values()).sort((entryA, entryB) => entryB.priority.secondary - entryA.priority.secondary));
            }
        }
        // No entries with relative priority: take sorted entries as is
        else {
            sortedEntries = sortedEntriesWithNumberedPriority;
        }
        // Take over as new truth of entries
        this._entries = sortedEntries;
    }
    markFirstLastVisibleEntry() {
        this.doMarkFirstLastVisibleStatusbarItem(this.getEntries(0 /* StatusbarAlignment.LEFT */));
        this.doMarkFirstLastVisibleStatusbarItem(this.getEntries(1 /* StatusbarAlignment.RIGHT */));
    }
    doMarkFirstLastVisibleStatusbarItem(entries) {
        let firstVisibleItem;
        let lastVisibleItem;
        for (const entry of entries) {
            // Clear previous first
            entry.container.classList.remove('first-visible-item', 'last-visible-item');
            const isVisible = !this.isHidden(entry.id);
            if (isVisible) {
                if (!firstVisibleItem) {
                    firstVisibleItem = entry;
                }
                lastVisibleItem = entry;
            }
        }
        // Mark: first visible item
        firstVisibleItem?.container.classList.add('first-visible-item');
        // Mark: last visible item
        lastVisibleItem?.container.classList.add('last-visible-item');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvc3RhdHVzYmFyL3N0YXR1c2Jhck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsd0JBQXdCLEVBQStDLE1BQU0sa0RBQWtELENBQUM7QUFDekksT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUV4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFhM0QsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7YUFFekIsdUJBQWtCLEdBQUcsNEJBQTRCLEFBQS9CLENBQWdDO0lBTTFFLElBQUksT0FBTyxLQUFpQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUc1RSxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNqSCxDQUFDO0lBSUQsWUFBNkIsY0FBK0I7UUFDM0QsS0FBSyxFQUFFLENBQUM7UUFEb0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBYjNDLGdDQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9DLENBQUMsQ0FBQztRQUN0RywrQkFBMEIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDO1FBRXJFLGFBQVEsR0FBK0IsRUFBRSxDQUFDLENBQUMsaUZBQWlGO1FBUTVILFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBS2xDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sWUFBWTtRQUNuQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsK0JBQXVCLENBQUM7UUFDdkcsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQztnQkFDSixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUM5QyxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsd0JBQXdCO1lBQ3pCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLCtCQUF1QixrQkFBa0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3RLLENBQUM7SUFFTyx1QkFBdUI7UUFFOUIsOEJBQThCO1FBQzlCLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU3QyxzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFcEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUVsQywyQ0FBMkM7UUFDM0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQztRQUVELDBDQUEwQztRQUMxQyxLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pCLENBQUM7UUFDRixDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLElBQUksT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0QixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFFdEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzFCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxHQUFHLENBQUMsS0FBK0I7UUFFbEMsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTFCLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXBDLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFWixnQ0FBZ0M7UUFDaEMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUErQjtRQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUVoQixzQkFBc0I7WUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRS9CLHVDQUF1QztZQUN2QyxrQ0FBa0M7WUFDbEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDckosSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2IsQ0FBQztZQUVELGdDQUFnQztZQUNoQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxFQUFVO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQUksQ0FBQyxFQUFVO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFcEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUVoQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsRUFBVTtRQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUV2QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRWhDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsQ0FBQyxTQUFzQjtRQUMvQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsVUFBVSxDQUFDLFNBQTZCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxjQUFjO1FBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUVPLGVBQWU7UUFDdEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFTyxVQUFVLENBQUMsS0FBYSxFQUFFLGVBQXVCO1FBRXhELE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBYSxFQUFFLEVBQUU7WUFDekMsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO1lBQ3pCLElBQUksS0FBSyxHQUFHLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ2pILE9BQU8sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLFlBQVksSUFBSSxLQUFLLENBQUM7Z0JBQ3RCLEtBQUssR0FBRyxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUM5RyxDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUM7UUFFRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdkMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztZQUN0RSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUM7Z0JBRS9CLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBRTdCLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMvQyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQztZQUMvQixLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBSU8sZ0JBQWdCLENBQUMsSUFBdUMsRUFBRSxPQUFnQjtRQUVqRixnQkFBZ0I7UUFDaEIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFFaEIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25DLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztvQkFDckIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDdkMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsV0FBVzthQUNOLENBQUM7WUFDTCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUM7WUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFekMsc0NBQXNDO1lBQ3RDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2QixDQUFDO1lBRUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUM3RSxDQUFDO1lBRUQsZ0NBQWdDO1lBQ2hDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1FBQ2xDLENBQUM7SUFDRixDQUFDO0lBRU8sU0FBUztRQUNoQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsMkRBQTJDLENBQUM7UUFDOUosQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsK0JBQXVCLENBQUM7UUFDekYsQ0FBQztJQUNGLENBQUM7SUFFTyxJQUFJO1FBQ1gsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsRSxtQ0FBbUM7UUFDbkMsd0ZBQXdGO1FBQ3hGLDZGQUE2RjtRQUM3RixNQUFNLG1DQUFtQyxHQUFHLElBQUksR0FBRyxFQUFzRSxDQUFDO1FBQzFILE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxHQUFHLEVBQXFGLENBQUM7UUFDbEksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEtBQUssUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDeEcsbUNBQW1DLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM1RCxJQUFJLE9BQU8sR0FBRyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDakUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUVkLDBEQUEwRDtvQkFDMUQseURBQXlEO29CQUN6RCxvREFBb0Q7b0JBRXBELEtBQUssTUFBTSxlQUFlLElBQUksNEJBQTRCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQzt3QkFDckUsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQzs0QkFDM0MsT0FBTyxHQUFHLGVBQWUsQ0FBQzs0QkFDMUIsTUFBTTt3QkFDUCxDQUFDO29CQUNGLENBQUM7b0JBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNkLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO3dCQUNwQiw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzdELENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxzRkFBc0Y7UUFDdEYsTUFBTSxpQ0FBaUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakcsaUNBQWlDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3pELElBQUksTUFBTSxDQUFDLFNBQVMsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBRTNDLDBFQUEwRTtnQkFFMUUsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hKLE1BQU0scUJBQXFCLEdBQUcsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO2dCQUVoSixJQUFJLHFCQUFxQixLQUFLLHFCQUFxQixFQUFFLENBQUM7b0JBQ3JELE9BQU8scUJBQXFCLEdBQUcscUJBQXFCLENBQUM7Z0JBQ3RELENBQUM7Z0JBRUQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUM3RCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO2dCQUM5RCxDQUFDO2dCQUVELG1FQUFtRTtnQkFDbkUsT0FBTyxtQ0FBbUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFFLEdBQUcsbUNBQW1DLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1lBQzVHLENBQUM7WUFFRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLG9DQUE0QixFQUFFLENBQUM7Z0JBQ2xELE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsU0FBUyxvQ0FBNEIsRUFBRSxDQUFDO2dCQUNsRCxPQUFPLENBQUMsQ0FBQztZQUNWLENBQUM7WUFFRCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxhQUF5QyxDQUFDO1FBRTlDLDZDQUE2QztRQUM3QyxJQUFJLDRCQUE0QixDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxhQUFhLEdBQUcsRUFBRSxDQUFDO1lBRW5CLEtBQUssTUFBTSxLQUFLLElBQUksaUNBQWlDLEVBQUUsQ0FBQztnQkFDdkQsTUFBTSxrQkFBa0IsR0FBRyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RSxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBRWpHLGdDQUFnQztnQkFDaEMsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDckIsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQWU7eUJBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxvQ0FBNEIsQ0FBQzt5QkFDakksSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNwRixDQUFDO2dCQUVELHdCQUF3QjtnQkFDeEIsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFMUIsaUNBQWlDO2dCQUNqQyxJQUFJLGVBQWUsRUFBRSxDQUFDO29CQUNyQixhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBZTt5QkFDbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHFDQUE2QixDQUFDO3lCQUNsSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BGLENBQUM7Z0JBRUQscUNBQXFDO2dCQUNyQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLENBQUM7WUFFRCxnRUFBZ0U7WUFDaEUsNkNBQTZDO1lBQzdDLEVBQUU7WUFDRiw4REFBOEQ7WUFDOUQsNERBQTREO1lBQzVELGVBQWU7WUFDZixFQUFFO1lBQ0YsS0FBSyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSw0QkFBNEIsRUFBRSxDQUFDO2dCQUN4RCxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDckksQ0FBQztRQUNGLENBQUM7UUFFRCwrREFBK0Q7YUFDMUQsQ0FBQztZQUNMLGFBQWEsR0FBRyxpQ0FBaUMsQ0FBQztRQUNuRCxDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQy9CLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxVQUFVLGlDQUF5QixDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxVQUFVLGtDQUEwQixDQUFDLENBQUM7SUFDckYsQ0FBQztJQUVPLG1DQUFtQyxDQUFDLE9BQW1DO1FBQzlFLElBQUksZ0JBQXNELENBQUM7UUFDM0QsSUFBSSxlQUFxRCxDQUFDO1FBRTFELEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFLENBQUM7WUFFN0IsdUJBQXVCO1lBQ3ZCLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBRTVFLE1BQU0sU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0MsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdkIsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO2dCQUMxQixDQUFDO2dCQUVELGVBQWUsR0FBRyxLQUFLLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUM7UUFFRCwyQkFBMkI7UUFDM0IsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUVoRSwwQkFBMEI7UUFDMUIsZUFBZSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDL0QsQ0FBQyJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import { IStatusbarService } from '../../services/statusbar/browser/statusbar.js';
import { isAccessibilityInformation } from '../../../platform/accessibility/common/accessibility.js';
import { isMarkdownString } from '../../../base/common/htmlContent.js';
import { getCodiconAriaLabel } from '../../../base/common/iconLabels.js';
import { hash } from '../../../base/common/hash.js';
import { Emitter } from '../../../base/common/event.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { Iterable } from '../../../base/common/iterator.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { asStatusBarItemIdentifier } from '../common/extHostTypes.js';
import { STATUS_BAR_ERROR_ITEM_BACKGROUND, STATUS_BAR_WARNING_ITEM_BACKGROUND } from '../../common/theme.js';
// --- service
export const IExtensionStatusBarItemService = createDecorator('IExtensionStatusBarItemService');
export var StatusBarUpdateKind;
(function (StatusBarUpdateKind) {
    StatusBarUpdateKind[StatusBarUpdateKind["DidDefine"] = 0] = "DidDefine";
    StatusBarUpdateKind[StatusBarUpdateKind["DidUpdate"] = 1] = "DidUpdate";
})(StatusBarUpdateKind || (StatusBarUpdateKind = {}));
let ExtensionStatusBarItemService = class ExtensionStatusBarItemService {
    constructor(_statusbarService) {
        this._statusbarService = _statusbarService;
        this._entries = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        this._entries.forEach(entry => entry.accessor.dispose());
        this._entries.clear();
        this._onDidChange.dispose();
    }
    setOrUpdateEntry(entryId, id, extensionId, name, text, tooltip, command, color, backgroundColor, alignLeft, priority, accessibilityInformation) {
        // if there are icons in the text use the tooltip for the aria label
        let ariaLabel;
        let role = undefined;
        if (accessibilityInformation) {
            ariaLabel = accessibilityInformation.label;
            role = accessibilityInformation.role;
        }
        else {
            ariaLabel = getCodiconAriaLabel(text);
            if (typeof tooltip === 'string' || isMarkdownString(tooltip)) {
                const tooltipString = typeof tooltip === 'string' ? tooltip : tooltip.value;
                ariaLabel += `, ${tooltipString}`;
            }
        }
        let kind = undefined;
        switch (backgroundColor?.id) {
            case STATUS_BAR_ERROR_ITEM_BACKGROUND:
            case STATUS_BAR_WARNING_ITEM_BACKGROUND:
                // override well known colors that map to status entry kinds to support associated themable hover colors
                kind = backgroundColor.id === STATUS_BAR_ERROR_ITEM_BACKGROUND ? 'error' : 'warning';
                color = undefined;
                backgroundColor = undefined;
        }
        const entry = { name, text, tooltip, command, color, backgroundColor, ariaLabel, role, kind, extensionId };
        if (typeof priority === 'undefined') {
            priority = 0;
        }
        let alignment = alignLeft ? 0 /* StatusbarAlignment.LEFT */ : 1 /* StatusbarAlignment.RIGHT */;
        // alignment and priority can only be set once (at creation time)
        const existingEntry = this._entries.get(entryId);
        if (existingEntry) {
            alignment = existingEntry.alignment;
            priority = existingEntry.priority;
        }
        // Create new entry if not existing
        if (!existingEntry) {
            let entryPriority;
            if (typeof extensionId === 'string') {
                // We cannot enforce unique priorities across all extensions, so we
                // use the extension identifier as a secondary sort key to reduce
                // the likelyhood of collisions.
                // See https://github.com/microsoft/vscode/issues/177835
                // See https://github.com/microsoft/vscode/issues/123827
                entryPriority = { primary: priority, secondary: hash(extensionId) };
            }
            else {
                entryPriority = priority;
            }
            const accessor = this._statusbarService.addEntry(entry, id, alignment, entryPriority);
            this._entries.set(entryId, {
                accessor,
                entry,
                alignment,
                priority,
                disposable: toDisposable(() => {
                    accessor.dispose();
                    this._entries.delete(entryId);
                    this._onDidChange.fire({ removed: entryId });
                })
            });
            this._onDidChange.fire({ added: [entryId, { entry, alignment, priority }] });
            return 0 /* StatusBarUpdateKind.DidDefine */;
        }
        else {
            // Otherwise update
            existingEntry.accessor.update(entry);
            existingEntry.entry = entry;
            return 1 /* StatusBarUpdateKind.DidUpdate */;
        }
    }
    unsetEntry(entryId) {
        this._entries.get(entryId)?.disposable.dispose();
        this._entries.delete(entryId);
    }
    getEntries() {
        return this._entries.entries();
    }
};
ExtensionStatusBarItemService = __decorate([
    __param(0, IStatusbarService)
], ExtensionStatusBarItemService);
registerSingleton(IExtensionStatusBarItemService, ExtensionStatusBarItemService, 1 /* InstantiationType.Delayed */);
function isUserFriendlyStatusItemEntry(candidate) {
    const obj = candidate;
    return (typeof obj.id === 'string' && obj.id.length > 0)
        && typeof obj.name === 'string'
        && typeof obj.text === 'string'
        && (obj.alignment === 'left' || obj.alignment === 'right')
        && (obj.command === undefined || typeof obj.command === 'string')
        && (obj.tooltip === undefined || typeof obj.tooltip === 'string')
        && (obj.priority === undefined || typeof obj.priority === 'number')
        && (obj.accessibilityInformation === undefined || isAccessibilityInformation(obj.accessibilityInformation));
}
const statusBarItemSchema = {
    type: 'object',
    required: ['id', 'text', 'alignment', 'name'],
    properties: {
        id: {
            type: 'string',
            markdownDescription: localize('id', 'The identifier of the status bar entry. Must be unique within the extension. The same value must be used when calling the `vscode.window.createStatusBarItem(id, ...)`-API')
        },
        name: {
            type: 'string',
            description: localize('name', 'The name of the entry, like \'Python Language Indicator\', \'Git Status\' etc. Try to keep the length of the name short, yet descriptive enough that users can understand what the status bar item is about.')
        },
        text: {
            type: 'string',
            description: localize('text', 'The text to show for the entry. You can embed icons in the text by leveraging the `$(<name>)`-syntax, like \'Hello $(globe)!\'')
        },
        tooltip: {
            type: 'string',
            description: localize('tooltip', 'The tooltip text for the entry.')
        },
        command: {
            type: 'string',
            description: localize('command', 'The command to execute when the status bar entry is clicked.')
        },
        alignment: {
            type: 'string',
            enum: ['left', 'right'],
            description: localize('alignment', 'The alignment of the status bar entry.')
        },
        priority: {
            type: 'number',
            description: localize('priority', 'The priority of the status bar entry. Higher value means the item should be shown more to the left.')
        },
        accessibilityInformation: {
            type: 'object',
            description: localize('accessibilityInformation', 'Defines the role and aria label to be used when the status bar entry is focused.'),
            properties: {
                role: {
                    type: 'string',
                    description: localize('accessibilityInformation.role', 'The role of the status bar entry which defines how a screen reader interacts with it. More about aria roles can be found here https://w3c.github.io/aria/#widget_roles')
                },
                label: {
                    type: 'string',
                    description: localize('accessibilityInformation.label', 'The aria label of the status bar entry. Defaults to the entry\'s text.')
                }
            }
        }
    }
};
const statusBarItemsSchema = {
    description: localize('vscode.extension.contributes.statusBarItems', "Contributes items to the status bar."),
    oneOf: [
        statusBarItemSchema,
        {
            type: 'array',
            items: statusBarItemSchema
        }
    ]
};
const statusBarItemsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'statusBarItems',
    jsonSchema: statusBarItemsSchema,
});
let StatusBarItemsExtensionPoint = class StatusBarItemsExtensionPoint {
    constructor(statusBarItemsService) {
        const contributions = new DisposableStore();
        statusBarItemsExtensionPoint.setHandler((extensions) => {
            contributions.clear();
            for (const entry of extensions) {
                if (!isProposedApiEnabled(entry.description, 'contribStatusBarItems')) {
                    entry.collector.error(`The ${statusBarItemsExtensionPoint.name} is proposed API`);
                    continue;
                }
                const { value, collector } = entry;
                for (const candidate of Iterable.wrap(value)) {
                    if (!isUserFriendlyStatusItemEntry(candidate)) {
                        collector.error(localize('invalid', "Invalid status bar item contribution."));
                        continue;
                    }
                    const fullItemId = asStatusBarItemIdentifier(entry.description.identifier, candidate.id);
                    const kind = statusBarItemsService.setOrUpdateEntry(fullItemId, fullItemId, ExtensionIdentifier.toKey(entry.description.identifier), candidate.name ?? entry.description.displayName ?? entry.description.name, candidate.text, candidate.tooltip, candidate.command ? { id: candidate.command, title: candidate.name } : undefined, undefined, undefined, candidate.alignment === 'left', candidate.priority, candidate.accessibilityInformation);
                    if (kind === 0 /* StatusBarUpdateKind.DidDefine */) {
                        contributions.add(toDisposable(() => statusBarItemsService.unsetEntry(fullItemId)));
                    }
                }
            }
        });
    }
};
StatusBarItemsExtensionPoint = __decorate([
    __param(0, IExtensionStatusBarItemService)
], StatusBarItemsExtensionPoint);
export { StatusBarItemsExtensionPoint };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzQmFyRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvc3RhdHVzQmFyRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBaUssTUFBTSwrQ0FBK0MsQ0FBQztBQUdqUCxPQUFPLEVBQTZCLDBCQUEwQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEksT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUseUJBQXlCLEVBQUUs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
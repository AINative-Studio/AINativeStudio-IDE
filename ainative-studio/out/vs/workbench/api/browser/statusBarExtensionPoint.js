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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzQmFyRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL3N0YXR1c0JhckV4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQWlLLE1BQU0sK0NBQStDLENBQUM7QUFHalAsT0FBTyxFQUE2QiwwQkFBMEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hJLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLHlCQUF5QixFQUFF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
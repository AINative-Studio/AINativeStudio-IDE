/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { Action } from '../../../../base/common/actions.js';
import { createActionViewItem, getActionBarActions, getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { equals } from '../../../../base/common/arrays.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { reset } from '../../../../base/browser/dom.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
export function isSCMViewService(element) {
    return Array.isArray(element.repositories) && Array.isArray(element.visibleRepositories);
}
export function isSCMRepository(element) {
    return !!element.provider && !!element.input;
}
export function isSCMInput(element) {
    return !!element.validateInput && typeof element.value === 'string';
}
export function isSCMActionButton(element) {
    return element.type === 'actionButton';
}
export function isSCMResourceGroup(element) {
    return !!element.provider && !!element.resources;
}
export function isSCMResource(element) {
    return !!element.sourceUri && isSCMResourceGroup(element.resourceGroup);
}
export function isSCMResourceNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMResourceGroup(element.context);
}
export function isSCMHistoryItemViewModelTreeElement(element) {
    return element.type === 'historyItemViewModel';
}
export function isSCMHistoryItemLoadMoreTreeElement(element) {
    return element.type === 'historyItemLoadMore';
}
const compareActions = (a, b) => {
    if (a instanceof MenuItemAction && b instanceof MenuItemAction) {
        return a.id === b.id && a.enabled === b.enabled && a.hideActions?.isHidden === b.hideActions?.isHidden;
    }
    return a.id === b.id && a.enabled === b.enabled;
};
export function connectPrimaryMenu(menu, callback, primaryGroup) {
    let cachedPrimary = [];
    let cachedSecondary = [];
    const updateActions = () => {
        const { primary, secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }), primaryGroup);
        if (equals(cachedPrimary, primary, compareActions) && equals(cachedSecondary, secondary, compareActions)) {
            return;
        }
        cachedPrimary = primary;
        cachedSecondary = secondary;
        callback(primary, secondary);
    };
    updateActions();
    return menu.onDidChange(updateActions);
}
export function collectContextMenuActions(menu) {
    return getContextMenuActions(menu.getActions({ shouldForwardArgs: true }), 'inline').secondary;
}
export class StatusBarAction extends Action {
    constructor(command, commandService) {
        super(`statusbaraction{${command.id}}`, command.title, '', true);
        this.command = command;
        this.commandService = commandService;
        this.tooltip = command.tooltip || '';
    }
    run() {
        return this.commandService.executeCommand(this.command.id, ...(this.command.arguments || []));
    }
}
class StatusBarActionViewItem extends ActionViewItem {
    constructor(action, options) {
        super(null, action, { ...options, icon: false, label: true });
    }
    updateLabel() {
        if (this.options.label && this.label) {
            reset(this.label, ...renderLabelWithIcons(this.action.label));
        }
    }
}
export function getActionViewItemProvider(instaService) {
    return (action, options) => {
        if (action instanceof StatusBarAction) {
            return new StatusBarActionViewItem(action, options);
        }
        return createActionViewItem(instaService, action, options);
    };
}
export function getProviderKey(provider) {
    return `${provider.contextValue}:${provider.label}${provider.rootUri ? `:${provider.rootUri.toString()}` : ''}`;
}
export function getRepositoryResourceCount(provider) {
    return provider.groups.reduce((r, g) => r + g.resources.length, 0);
}
export function getHistoryItemEditorTitle(historyItem, maxLength = 20) {
    const title = historyItem.subject.length <= maxLength ?
        historyItem.subject : `${historyItem.subject.substring(0, maxLength)}\u2026`;
    return `${historyItem.displayId ?? historyItem.id} - ${title}`;
}
export function compareHistoryItemRefs(ref1, ref2, currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef) {
    const getHistoryItemRefOrder = (ref) => {
        if (ref.id === currentHistoryItemRef?.id) {
            return 1;
        }
        else if (ref.id === currentHistoryItemRemoteRef?.id) {
            return 2;
        }
        else if (ref.id === currentHistoryItemBaseRef?.id) {
            return 3;
        }
        else if (ref.color !== undefined) {
            return 4;
        }
        return 99;
    };
    // Assign order (current > remote > base > color)
    const ref1Order = getHistoryItemRefOrder(ref1);
    const ref2Order = getHistoryItemRefOrder(ref2);
    return ref1Order - ref2Order;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBUyxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUd2RixPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDbkosT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQThCLE1BQU0sMERBQTBELENBQUM7QUFDdEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFHM0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXhELE9BQU8sRUFBaUIsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdEYsTUFBTSxVQUFVLGdCQUFnQixDQUFDLE9BQVk7SUFDNUMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFFLE9BQTJCLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBRSxPQUEyQixDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDcEksQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBWTtJQUMzQyxPQUFPLENBQUMsQ0FBRSxPQUEwQixDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUUsT0FBMEIsQ0FBQyxLQUFLLENBQUM7QUFDdEYsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsT0FBWTtJQUN0QyxPQUFPLENBQUMsQ0FBRSxPQUFxQixDQUFD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
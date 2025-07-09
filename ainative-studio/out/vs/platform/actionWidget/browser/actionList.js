var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { List } from '../../../base/browser/ui/list/listWidget.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Codicon } from '../../../base/common/codicons.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { OS } from '../../../base/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import './actionWidget.css';
import { localize } from '../../../nls.js';
import { IContextViewService } from '../../contextview/browser/contextView.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { defaultListStyles } from '../../theme/browser/defaultStyles.js';
import { asCssVariable } from '../../theme/common/colorRegistry.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
export const acceptSelectedActionCommand = 'acceptSelectedCodeAction';
export const previewSelectedActionCommand = 'previewSelectedCodeAction';
export var ActionListItemKind;
(function (ActionListItemKind) {
    ActionListItemKind["Action"] = "action";
    ActionListItemKind["Header"] = "header";
})(ActionListItemKind || (ActionListItemKind = {}));
class HeaderRenderer {
    get templateId() { return "header" /* ActionListItemKind.Header */; }
    renderTemplate(container) {
        container.classList.add('group-header');
        const text = document.createElement('span');
        container.append(text);
        return { container, text };
    }
    renderElement(element, _index, templateData) {
        templateData.text.textContent = element.group?.title ?? '';
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
let ActionItemRenderer = class ActionItemRenderer {
    get templateId() { return "action" /* ActionListItemKind.Action */; }
    constructor(_supportsPreview, _keybindingService) {
        this._supportsPreview = _supportsPreview;
        this._keybindingService = _keybindingService;
    }
    renderTemplate(container) {
        container.classList.add(this.templateId);
        const icon = document.createElement('div');
        icon.className = 'icon';
        container.append(icon);
        const text = document.createElement('span');
        text.className = 'title';
        container.append(text);
        const keybinding = new KeybindingLabel(container, OS);
        return { container, icon, text, keybinding };
    }
    renderElement(element, _index, data) {
        if (element.group?.icon) {
            data.icon.className = ThemeIcon.asClassName(element.group.icon);
            if (element.group.icon.color) {
                data.icon.style.color = asCssVariable(element.group.icon.color.id);
            }
        }
        else {
            data.icon.className = ThemeIcon.asClassName(Codicon.lightBulb);
            data.icon.style.color = 'var(--vscode-editorLightBulb-foreground)';
        }
        if (!element.item || !element.label) {
            return;
        }
        dom.setVisibility(!element.hideIcon, data.icon);
        data.text.textContent = stripNewlines(element.label);
        data.keybinding.set(element.keybinding);
        dom.setVisibility(!!element.keybinding, data.keybinding.element);
        const actionTitle = this._keybindingService.lookupKeybinding(acceptSelectedActionCommand)?.getLabel();
        const previewTitle = this._keybindingService.lookupKeybinding(previewSelectedActionCommand)?.getLabel();
        data.container.classList.toggle('option-disabled', element.disabled);
        if (element.disabled) {
            data.container.title = element.label;
        }
        else if (actionTitle && previewTitle) {
            if (this._supportsPreview && element.canPreview) {
                data.container.title = localize({ key: 'label-preview', comment: ['placeholders are keybindings, e.g "F2 to Apply, Shift+F2 to Preview"'] }, "{0} to Apply, {1} to Preview", actionTitle, previewTitle);
            }
            else {
                data.container.title = localize({ key: 'label', comment: ['placeholder is a keybinding, e.g "F2 to Apply"'] }, "{0} to Apply", actionTitle);
            }
        }
        else {
            data.container.title = '';
        }
    }
    disposeTemplate(templateData) {
        templateData.keybinding.dispose();
    }
};
ActionItemRenderer = __decorate([
    __param(1, IKeybindingService)
], ActionItemRenderer);
class AcceptSelectedEvent extends UIEvent {
    constructor() { super('acceptSelectedAction'); }
}
class PreviewSelectedEvent extends UIEvent {
    constructor() { super('previewSelectedAction'); }
}
function getKeyboardNavigationLabel(item) {
    // Filter out header vs. action
    if (item.kind === 'action') {
        return item.label;
    }
    return undefined;
}
let ActionList = class ActionList extends Disposable {
    constructor(user, preview, items, _delegate, _contextViewService, _keybindingService, _layoutService) {
        super();
        this._delegate = _delegate;
        this._contextViewService = _contextViewService;
        this._keybindingService = _keybindingService;
        this._layoutService = _layoutService;
        this._actionLineHeight = 24;
        this._headerLineHeight = 26;
        this.cts = this._register(new CancellationTokenSource());
        this.domNode = document.createElement('div');
        this.domNode.classList.add('actionList');
        const virtualDelegate = {
            getHeight: element => element.kind === "header" /* ActionListItemKind.Header */ ? this._headerLineHeight : this._actionLineHeight,
            getTemplateId: element => element.kind
        };
        this._list = this._register(new List(user, this.domNode, virtualDelegate, [
            new ActionItemRenderer(preview, this._keybindingService),
            new HeaderRenderer(),
        ], {
            keyboardSupport: false,
            typeNavigationEnabled: true,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel },
            accessibilityProvider: {
                getAriaLabel: element => {
                    if (element.kind === "action" /* ActionListItemKind.Action */) {
                        let label = element.label ? stripNewlines(element?.label) : '';
                        if (element.disabled) {
                            label = localize({ key: 'customQuickFixWidget.labels', comment: [`Action widget labels for accessibility.`] }, "{0}, Disabled Reason: {1}", label, element.disabled);
                        }
                        return label;
                    }
                    return null;
                },
                getWidgetAriaLabel: () => localize({ key: 'customQuickFixWidget', comment: [`An action widget option`] }, "Action Widget"),
                getRole: (e) => e.kind === "action" /* ActionListItemKind.Action */ ? 'option' : 'separator',
                getWidgetRole: () => 'listbox',
            },
        }));
        this._list.style(defaultListStyles);
        this._register(this._list.onMouseClick(e => this.onListClick(e)));
        this._register(this._list.onMouseOver(e => this.onListHover(e)));
        this._register(this._list.onDidChangeFocus(() => this.onFocus()));
        this._register(this._list.onDidChangeSelection(e => this.onListSelection(e)));
        this._allMenuItems = items;
        this._list.splice(0, this._list.length, this._allMenuItems);
        if (this._list.length) {
            this.focusNext();
        }
    }
    focusCondition(element) {
        return !element.disabled && element.kind === "action" /* ActionListItemKind.Action */;
    }
    hide(didCancel) {
        this._delegate.onHide(didCancel);
        this.cts.cancel();
        this._contextViewService.hideContextView();
    }
    layout(minWidth) {
        // Updating list height, depending on how many separators and headers there are.
        const numHeaders = this._allMenuItems.filter(item => item.kind === 'header').length;
        const itemsHeight = this._allMenuItems.length * this._actionLineHeight;
        const heightWithHeaders = itemsHeight + numHeaders * this._headerLineHeight - numHeaders * this._actionLineHeight;
        this._list.layout(heightWithHeaders);
        let maxWidth = minWidth;
        if (this._allMenuItems.length >= 50) {
            maxWidth = 380;
        }
        else {
            // For finding width dynamically (not using resize observer)
            const itemWidths = this._allMenuItems.map((_, index) => {
                const element = this.domNode.ownerDocument.getElementById(this._list.getElementID(index));
                if (element) {
                    element.style.width = 'auto';
                    const width = element.getBoundingClientRect().width;
                    element.style.width = '';
                    return width;
                }
                return 0;
            });
            // resize observer - can be used in the future since list widget supports dynamic height but not width
            maxWidth = Math.max(...itemWidths, minWidth);
        }
        const maxVhPrecentage = 0.7;
        const height = Math.min(heightWithHeaders, this._layoutService.getContainer(dom.getWindow(this.domNode)).clientHeight * maxVhPrecentage);
        this._list.layout(height, maxWidth);
        this.domNode.style.height = `${height}px`;
        this._list.domFocus();
        return maxWidth;
    }
    focusPrevious() {
        this._list.focusPrevious(1, true, undefined, this.focusCondition);
    }
    focusNext() {
        this._list.focusNext(1, true, undefined, this.focusCondition);
    }
    acceptSelected(preview) {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return;
        }
        const focusIndex = focused[0];
        const element = this._list.element(focusIndex);
        if (!this.focusCondition(element)) {
            return;
        }
        const event = preview ? new PreviewSelectedEvent() : new AcceptSelectedEvent();
        this._list.setSelection([focusIndex], event);
    }
    onListSelection(e) {
        if (!e.elements.length) {
            return;
        }
        const element = e.elements[0];
        if (element.item && this.focusCondition(element)) {
            this._delegate.onSelect(element.item, e.browserEvent instanceof PreviewSelectedEvent);
        }
        else {
            this._list.setSelection([]);
        }
    }
    onFocus() {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return;
        }
        const focusIndex = focused[0];
        const element = this._list.element(focusIndex);
        this._delegate.onFocus?.(element.item);
    }
    async onListHover(e) {
        const element = e.element;
        if (element && element.item && this.focusCondition(element)) {
            if (this._delegate.onHover && !element.disabled && element.kind === "action" /* ActionListItemKind.Action */) {
                const result = await this._delegate.onHover(element.item, this.cts.token);
                element.canPreview = result ? result.canPreview : undefined;
            }
            if (e.index) {
                this._list.splice(e.index, 1, [element]);
            }
        }
        this._list.setFocus(typeof e.index === 'number' ? [e.index] : []);
    }
    onListClick(e) {
        if (e.element && this.focusCondition(e.element)) {
            this._list.setFocus([]);
        }
    }
};
ActionList = __decorate([
    __param(4, IContextViewService),
    __param(5, IKeybindingService),
    __param(6, ILayoutService)
], ActionList);
export { ActionList };
function stripNewlines(str) {
    return str.replace(/\r\n|\r|\n/g, ' ');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25XaWRnZXQvYnJvd3Nlci9hY3Rpb25MaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdkUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsMEJBQTBCLENBQUM7QUFD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
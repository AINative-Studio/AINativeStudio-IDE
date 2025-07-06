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
import './media/bannerpart.css';
import { localize2 } from '../../../../nls.js';
import { $, addDisposableListener, append, clearNode, EventType, isHTMLElement } from '../../../../base/browser/dom.js';
import { asCSSUrl } from '../../../../base/browser/cssValue.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Part } from '../../part.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Action } from '../../../../base/common/actions.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { Emitter } from '../../../../base/common/event.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { BannerFocused } from '../../../common/contextkeys.js';
// Banner Part
let BannerPart = class BannerPart extends Part {
    get minimumHeight() {
        return this.visible ? this.height : 0;
    }
    get maximumHeight() {
        return this.visible ? this.height : 0;
    }
    get onDidChange() { return this._onDidChangeSize.event; }
    constructor(themeService, layoutService, storageService, contextKeyService, instantiationService) {
        super("workbench.parts.banner" /* Parts.BANNER_PART */, { hasTitle: false }, themeService, storageService, layoutService);
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        // #region IView
        this.height = 26;
        this.minimumWidth = 0;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this._onDidChangeSize = this._register(new Emitter());
        this.visible = false;
        this.focusedActionIndex = -1;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
    }
    createContentArea(parent) {
        this.element = parent;
        this.element.tabIndex = 0;
        // Restore focused action if needed
        this._register(addDisposableListener(this.element, EventType.FOCUS, () => {
            if (this.focusedActionIndex !== -1) {
                this.focusActionLink();
            }
        }));
        // Track focus
        const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
        BannerFocused.bindTo(scopedContextKeyService).set(true);
        return this.element;
    }
    close(item) {
        // Hide banner
        this.setVisibility(false);
        // Remove from document
        clearNode(this.element);
        // Remember choice
        if (typeof item.onClose === 'function') {
            item.onClose();
        }
        this.item = undefined;
    }
    focusActionLink() {
        const length = this.item?.actions?.length ?? 0;
        if (this.focusedActionIndex < length) {
            const actionLink = this.messageActionsContainer?.children[this.focusedActionIndex];
            if (isHTMLElement(actionLink)) {
                this.actionBar?.setFocusable(false);
                actionLink.focus();
            }
        }
        else {
            this.actionBar?.focus(0);
        }
    }
    getAriaLabel(item) {
        if (item.ariaLabel) {
            return item.ariaLabel;
        }
        if (typeof item.message === 'string') {
            return item.message;
        }
        return undefined;
    }
    getBannerMessage(message) {
        if (typeof message === 'string') {
            const element = $('span');
            element.innerText = message;
            return element;
        }
        return this.markdownRenderer.render(message).element;
    }
    setVisibility(visible) {
        if (visible !== this.visible) {
            this.visible = visible;
            this.focusedActionIndex = -1;
            this.layoutService.setPartHidden(!visible, "workbench.parts.banner" /* Parts.BANNER_PART */);
            this._onDidChangeSize.fire(undefined);
        }
    }
    focus() {
        this.focusedActionIndex = -1;
        this.element.focus();
    }
    focusNextAction() {
        const length = this.item?.actions?.length ?? 0;
        this.focusedActionIndex = this.focusedActionIndex < length ? this.focusedActionIndex + 1 : 0;
        this.focusActionLink();
    }
    focusPreviousAction() {
        const length = this.item?.actions?.length ?? 0;
        this.focusedActionIndex = this.focusedActionIndex > 0 ? this.focusedActionIndex - 1 : length;
        this.focusActionLink();
    }
    hide(id) {
        if (this.item?.id !== id) {
            return;
        }
        this.setVisibility(false);
    }
    show(item) {
        if (item.id === this.item?.id) {
            this.setVisibility(true);
            return;
        }
        // Clear previous item
        clearNode(this.element);
        // Banner aria label
        const ariaLabel = this.getAriaLabel(item);
        if (ariaLabel) {
            this.element.setAttribute('aria-label', ariaLabel);
        }
        // Icon
        const iconContainer = append(this.element, $('div.icon-container'));
        iconContainer.setAttribute('aria-hidden', 'true');
        if (ThemeIcon.isThemeIcon(item.icon)) {
            iconContainer.appendChild($(`div${ThemeIcon.asCSSSelector(item.icon)}`));
        }
        else {
            iconContainer.classList.add('custom-icon');
            if (URI.isUri(item.icon)) {
                iconContainer.style.backgroundImage = asCSSUrl(item.icon);
            }
        }
        // Message
        const messageContainer = append(this.element, $('div.message-container'));
        messageContainer.setAttribute('aria-hidden', 'true');
        messageContainer.appendChild(this.getBannerMessage(item.message));
        // Message Actions
        this.messageActionsContainer = append(this.element, $('div.message-actions-container'));
        if (item.actions) {
            for (const action of item.actions) {
                this._register(this.instantiationService.createInstance(Link, this.messageActionsContainer, { ...action, tabIndex: -1 }, {}));
            }
        }
        // Action
        const actionBarContainer = append(this.element, $('div.action-container'));
        this.actionBar = this._register(new ActionBar(actionBarContainer));
        const label = item.closeLabel ?? 'Close Banner';
        const closeAction = this._register(new Action('banner.close', label, ThemeIcon.asClassName(widgetClose), true, () => this.close(item)));
        this.actionBar.push(closeAction, { icon: true, label: false });
        this.actionBar.setFocusable(false);
        this.setVisibility(true);
        this.item = item;
    }
    toJSON() {
        return {
            type: "workbench.parts.banner" /* Parts.BANNER_PART */
        };
    }
};
BannerPart = __decorate([
    __param(0, IThemeService),
    __param(1, IWorkbenchLayoutService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IInstantiationService)
], BannerPart);
export { BannerPart };
registerSingleton(IBannerService, BannerPart, 0 /* InstantiationType.Eager */);
// Keybindings
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.banner.focusBanner',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 9 /* KeyCode.Escape */,
    when: BannerFocused,
    handler: (accessor) => {
        const bannerService = accessor.get(IBannerService);
        bannerService.focus();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.banner.focusNextAction',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: BannerFocused,
    handler: (accessor) => {
        const bannerService = accessor.get(IBannerService);
        bannerService.focusNextAction();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.banner.focusPreviousAction',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [16 /* KeyCode.UpArrow */],
    when: BannerFocused,
    handler: (accessor) => {
        const bannerService = accessor.get(IBannerService);
        bannerService.focusPreviousAction();
    }
});
// Actions
class FocusBannerAction extends Action2 {
    static { this.ID = 'workbench.action.focusBanner'; }
    static { this.LABEL = localize2('focusBanner', "Focus Banner"); }
    constructor() {
        super({
            id: FocusBannerAction.ID,
            title: FocusBannerAction.LABEL,
            category: Categories.View,
            f1: true
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.focusPart("workbench.parts.banner" /* Parts.BANNER_PART */);
    }
}
registerAction2(FocusBannerAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFubmVyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2Jhbm5lci9iYW5uZXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sbURBQW1ELENBQUM7QUFDbkcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ2xILE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUV0SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUvRCxjQUFjO0FBRVAsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFRLElBQUk7SUFVbkMsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUdELElBQWEsV0FBVyxLQUFLLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFZbEUsWUFDZ0IsWUFBMkIsRUFDakIsYUFBc0MsRUFDOUMsY0FBK0IsRUFDNUIsaUJBQXNELEVBQ25ELG9CQUE0RDtRQUVuRixLQUFLLG1EQUFvQixFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBSHRELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQWhDcEYsZ0JBQWdCO1FBRVAsV0FBTSxHQUFXLEVBQUUsQ0FBQztRQUNwQixpQkFBWSxHQUFXLENBQUMsQ0FBQztRQUN6QixpQkFBWSxHQUFXLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztRQVVqRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFpRCxDQUFDLENBQUM7UUFPaEcsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUloQix1QkFBa0IsR0FBVyxDQUFDLENBQUMsQ0FBQztRQVd2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRWtCLGlCQUFpQixDQUFDLE1BQW1CO1FBQ3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUUxQixtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1lBQ3hFLElBQUksSUFBSSxDQUFDLGtCQUFrQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLGNBQWM7UUFDZCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNsRyxhQUFhLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXhELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRU8sS0FBSyxDQUFDLElBQWlCO1FBQzlCLGNBQWM7UUFDZCxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTFCLHVCQUF1QjtRQUN2QixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXhCLGtCQUFrQjtRQUNsQixJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFFL0MsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNuRixJQUFJLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDcEMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWSxDQUFDLElBQWlCO1FBQ3JDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN2QixDQUFDO1FBQ0QsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsT0FBZ0M7UUFDeEQsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUIsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7WUFDNUIsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDdEQsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUFnQjtRQUNyQyxJQUFJLE9BQU8sS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxtREFBb0IsQ0FBQztZQUM5RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxlQUFlO1FBQ2QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTdGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUU3RixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELElBQUksQ0FBQyxFQUFVO1FBQ2QsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUMxQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFpQjtRQUNyQixJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLE9BQU87UUFDUixDQUFDO1FBRUQsc0JBQXNCO1FBQ3RCLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFeEIsb0JBQW9CO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsT0FBTztRQUNQLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDcEUsYUFBYSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbEQsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3RDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUUsQ0FBQzthQUFNLENBQUM7WUFDUCxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUUzQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0QsQ0FBQztRQUNGLENBQUM7UUFFRCxVQUFVO1FBQ1YsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQzFFLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckQsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUVsRSxrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7UUFDeEYsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEVBQUUsR0FBRyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvSCxDQUFDO1FBQ0YsQ0FBQztRQUVELFNBQVM7UUFDVCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUNuRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLGNBQWMsQ0FBQztRQUNoRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTztZQUNOLElBQUksa0RBQW1CO1NBQ3ZCLENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQS9NWSxVQUFVO0lBZ0NwQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7R0FwQ1gsVUFBVSxDQStNdEI7O0FBRUQsaUJBQWlCLENBQUMsY0FBYyxFQUFFLFVBQVUsa0NBQTBCLENBQUM7QUFHdkUsY0FBYztBQUVkLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSw4QkFBOEI7SUFDbEMsTUFBTSw2Q0FBbUM7SUFDekMsT0FBTyx3QkFBZ0I7SUFDdkIsSUFBSSxFQUFFLGFBQWE7SUFDbkIsT0FBTyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsa0NBQWtDO0lBQ3RDLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sNkJBQW9CO0lBQzNCLFNBQVMsRUFBRSw0QkFBbUI7SUFDOUIsSUFBSSxFQUFFLGFBQWE7SUFDbkIsT0FBTyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2pDLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsc0NBQXNDO0lBQzFDLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sNEJBQW1CO0lBQzFCLFNBQVMsRUFBRSwwQkFBaUI7SUFDNUIsSUFBSSxFQUFFLGFBQWE7SUFDbkIsT0FBTyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsYUFBYSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDckMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUdILFVBQVU7QUFFVixNQUFNLGlCQUFrQixTQUFRLE9BQU87YUFFdEIsT0FBRSxHQUFHLDhCQUE4QixDQUFDO2FBQ3BDLFVBQUssR0FBRyxTQUFTLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBRWpFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGlCQUFpQixDQUFDLEVBQUU7WUFDeEIsS0FBSyxFQUFFLGlCQUFpQixDQUFDLEtBQUs7WUFDOUIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzVELGFBQWEsQ0FBQyxTQUFTLGtEQUFtQixDQUFDO0lBQzVDLENBQUM7O0FBR0YsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUMifQ==
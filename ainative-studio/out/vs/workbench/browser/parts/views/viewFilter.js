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
import { Delayer } from '../../../../base/common/async.js';
import * as DOM from '../../../../base/browser/dom.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { badgeBackground, badgeForeground, contrastBorder, asCssVariable } from '../../../../platform/theme/common/colorRegistry.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ContextScopedHistoryInputBox } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { MenuId, MenuRegistry, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { SubmenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Emitter } from '../../../../base/common/event.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
const viewFilterMenu = new MenuId('menu.view.filter');
export const viewFilterSubmenu = new MenuId('submenu.view.filter');
MenuRegistry.appendMenuItem(viewFilterMenu, {
    submenu: viewFilterSubmenu,
    title: localize('more filters', "More Filters..."),
    group: 'navigation',
    icon: Codicon.filter,
});
class MoreFiltersActionViewItem extends SubmenuEntryActionViewItem {
    constructor() {
        super(...arguments);
        this._checked = false;
    }
    set checked(checked) {
        if (this._checked !== checked) {
            this._checked = checked;
            this.updateChecked();
        }
    }
    updateChecked() {
        if (this.element) {
            this.element.classList.toggle('checked', this._checked);
        }
    }
    render(container) {
        super.render(container);
        this.updateChecked();
    }
}
let FilterWidget = class FilterWidget extends Widget {
    get onDidFocus() { return this.focusTracker.onDidFocus; }
    get onDidBlur() { return this.focusTracker.onDidBlur; }
    constructor(options, instantiationService, contextViewService, contextKeyService, keybindingService) {
        super();
        this.options = options;
        this.instantiationService = instantiationService;
        this.contextViewService = contextViewService;
        this.keybindingService = keybindingService;
        this._onDidChangeFilterText = this._register(new Emitter());
        this.onDidChangeFilterText = this._onDidChangeFilterText.event;
        this.isMoreFiltersChecked = false;
        this.delayedFilterUpdate = new Delayer(300);
        this._register(toDisposable(() => this.delayedFilterUpdate.cancel()));
        if (options.focusContextKey) {
            this.focusContextKey = new RawContextKey(options.focusContextKey, false).bindTo(contextKeyService);
        }
        this.element = DOM.$('.viewpane-filter');
        [this.filterInputBox, this.focusTracker] = this.createInput(this.element);
        this._register(this.filterInputBox);
        this._register(this.focusTracker);
        const controlsContainer = DOM.append(this.element, DOM.$('.viewpane-filter-controls'));
        this.filterBadge = this.createBadge(controlsContainer);
        this.toolbar = this._register(this.createToolBar(controlsContainer));
        this.adjustInputBox();
    }
    hasFocus() {
        return this.filterInputBox.hasFocus();
    }
    focus() {
        this.filterInputBox.focus();
    }
    blur() {
        this.filterInputBox.blur();
    }
    updateBadge(message) {
        this.filterBadge.classList.toggle('hidden', !message);
        this.filterBadge.textContent = message || '';
        this.adjustInputBox();
    }
    setFilterText(filterText) {
        this.filterInputBox.value = filterText;
    }
    getFilterText() {
        return this.filterInputBox.value;
    }
    getHistory() {
        return this.filterInputBox.getHistory();
    }
    layout(width) {
        this.element.parentElement?.classList.toggle('grow', width > 700);
        this.element.classList.toggle('small', width < 400);
        this.adjustInputBox();
        this.lastWidth = width;
    }
    relayout() {
        if (this.lastWidth) {
            this.layout(this.lastWidth);
        }
    }
    checkMoreFilters(checked) {
        this.isMoreFiltersChecked = checked;
        if (this.moreFiltersActionViewItem) {
            this.moreFiltersActionViewItem.checked = checked;
        }
    }
    createInput(container) {
        const history = this.options.history || [];
        const inputBox = this._register(this.instantiationService.createInstance(ContextScopedHistoryInputBox, container, this.contextViewService, {
            placeholder: this.options.placeholder,
            ariaLabel: this.options.ariaLabel,
            history: new Set(history),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            inputBoxStyles: defaultInputBoxStyles
        }));
        if (this.options.text) {
            inputBox.value = this.options.text;
        }
        this._register(inputBox.onDidChange(filter => this.delayedFilterUpdate.trigger(() => this.onDidInputChange(inputBox))));
        this._register(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => this.onInputKeyDown(e, inputBox)));
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.KEY_DOWN, this.handleKeyboardEvent));
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.KEY_UP, this.handleKeyboardEvent));
        this._register(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.CLICK, (e) => {
            e.stopPropagation();
            e.preventDefault();
        }));
        const focusTracker = this._register(DOM.trackFocus(inputBox.inputElement));
        if (this.focusContextKey) {
            this._register(focusTracker.onDidFocus(() => this.focusContextKey.set(true)));
            this._register(focusTracker.onDidBlur(() => this.focusContextKey.set(false)));
            this._register(toDisposable(() => this.focusContextKey.reset()));
        }
        return [inputBox, focusTracker];
    }
    createBadge(container) {
        const filterBadge = DOM.append(container, DOM.$('.viewpane-filter-badge.hidden'));
        filterBadge.style.backgroundColor = asCssVariable(badgeBackground);
        filterBadge.style.color = asCssVariable(badgeForeground);
        filterBadge.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        return filterBadge;
    }
    createToolBar(container) {
        return this.instantiationService.createInstance(MenuWorkbenchToolBar, container, viewFilterMenu, {
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            actionViewItemProvider: (action, options) => {
                if (action instanceof SubmenuItemAction && action.item.submenu.id === viewFilterSubmenu.id) {
                    this.moreFiltersActionViewItem = this.instantiationService.createInstance(MoreFiltersActionViewItem, action, options);
                    this.moreFiltersActionViewItem.checked = this.isMoreFiltersChecked;
                    return this.moreFiltersActionViewItem;
                }
                return undefined;
            }
        });
    }
    onDidInputChange(inputbox) {
        inputbox.addToHistory();
        this._onDidChangeFilterText.fire(inputbox.value);
    }
    adjustInputBox() {
        this.filterInputBox.inputElement.style.paddingRight = this.element.classList.contains('small') || this.filterBadge.classList.contains('hidden') ? '25px' : '150px';
    }
    // Action toolbar is swallowing some keys for action items which should not be for an input box
    handleKeyboardEvent(event) {
        if (event.equals(10 /* KeyCode.Space */)
            || event.equals(15 /* KeyCode.LeftArrow */)
            || event.equals(17 /* KeyCode.RightArrow */)
            || event.equals(14 /* KeyCode.Home */)
            || event.equals(13 /* KeyCode.End */)) {
            event.stopPropagation();
        }
    }
    onInputKeyDown(event, filterInputBox) {
        let handled = false;
        if (event.equals(2 /* KeyCode.Tab */) && !this.toolbar.isEmpty()) {
            this.toolbar.focus();
            handled = true;
        }
        if (handled) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
};
FilterWidget = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextViewService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService)
], FilterWidget);
export { FilterWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0ZpbHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy92aWV3cy92aWV3RmlsdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBS3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDckksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ2xILE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDaEgsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQXNCLG9CQUFvQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFD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
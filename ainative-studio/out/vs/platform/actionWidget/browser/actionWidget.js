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
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import './actionWidget.css';
import { localize, localize2 } from '../../../nls.js';
import { acceptSelectedActionCommand, ActionList, previewSelectedActionCommand } from './actionList.js';
import { Action2, registerAction2 } from '../../actions/common/actions.js';
import { IContextKeyService, RawContextKey } from '../../contextkey/common/contextkey.js';
import { IContextViewService } from '../../contextview/browser/contextView.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { inputActiveOptionBackground, registerColor } from '../../theme/common/colorRegistry.js';
registerColor('actionBar.toggledBackground', inputActiveOptionBackground, localize('actionBar.toggledBackground', 'Background color for toggled action items in action bar.'));
const ActionWidgetContextKeys = {
    Visible: new RawContextKey('codeActionMenuVisible', false, localize('codeActionMenuVisible', "Whether the action widget list is visible"))
};
export const IActionWidgetService = createDecorator('actionWidgetService');
let ActionWidgetService = class ActionWidgetService extends Disposable {
    get isVisible() {
        return ActionWidgetContextKeys.Visible.getValue(this._contextKeyService) || false;
    }
    constructor(_contextViewService, _contextKeyService, _instantiationService) {
        super();
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._list = this._register(new MutableDisposable());
    }
    show(user, supportsPreview, items, delegate, anchor, container, actionBarActions) {
        const visibleContext = ActionWidgetContextKeys.Visible.bindTo(this._contextKeyService);
        const list = this._instantiationService.createInstance(ActionList, user, supportsPreview, items, delegate);
        this._contextViewService.showContextView({
            getAnchor: () => anchor,
            render: (container) => {
                visibleContext.set(true);
                return this._renderWidget(container, list, actionBarActions ?? []);
            },
            onHide: (didCancel) => {
                visibleContext.reset();
                this._onWidgetClosed(didCancel);
            },
        }, container, false);
    }
    acceptSelected(preview) {
        this._list.value?.acceptSelected(preview);
    }
    focusPrevious() {
        this._list?.value?.focusPrevious();
    }
    focusNext() {
        this._list?.value?.focusNext();
    }
    hide(didCancel) {
        this._list.value?.hide(didCancel);
        this._list.clear();
    }
    clear() {
        this._list.clear();
    }
    _renderWidget(element, list, actionBarActions) {
        const widget = document.createElement('div');
        widget.classList.add('action-widget');
        element.appendChild(widget);
        this._list.value = list;
        if (this._list.value) {
            widget.appendChild(this._list.value.domNode);
        }
        else {
            throw new Error('List has no value');
        }
        const renderDisposables = new DisposableStore();
        // Invisible div to block mouse interaction in the rest of the UI
        const menuBlock = document.createElement('div');
        const block = element.appendChild(menuBlock);
        block.classList.add('context-view-block');
        renderDisposables.add(dom.addDisposableListener(block, dom.EventType.MOUSE_DOWN, e => e.stopPropagation()));
        // Invisible div to block mouse interaction with the menu
        const pointerBlockDiv = document.createElement('div');
        const pointerBlock = element.appendChild(pointerBlockDiv);
        pointerBlock.classList.add('context-view-pointerBlock');
        // Removes block on click INSIDE widget or ANY mouse movement
        renderDisposables.add(dom.addDisposableListener(pointerBlock, dom.EventType.POINTER_MOVE, () => pointerBlock.remove()));
        renderDisposables.add(dom.addDisposableListener(pointerBlock, dom.EventType.MOUSE_DOWN, () => pointerBlock.remove()));
        // Action bar
        let actionBarWidth = 0;
        if (actionBarActions.length) {
            const actionBar = this._createActionBar('.action-widget-action-bar', actionBarActions);
            if (actionBar) {
                widget.appendChild(actionBar.getContainer().parentElement);
                renderDisposables.add(actionBar);
                actionBarWidth = actionBar.getContainer().offsetWidth;
            }
        }
        const width = this._list.value?.layout(actionBarWidth);
        widget.style.width = `${width}px`;
        const focusTracker = renderDisposables.add(dom.trackFocus(element));
        renderDisposables.add(focusTracker.onDidBlur(() => this.hide(true)));
        return renderDisposables;
    }
    _createActionBar(className, actions) {
        if (!actions.length) {
            return undefined;
        }
        const container = dom.$(className);
        const actionBar = new ActionBar(container);
        actionBar.push(actions, { icon: false, label: true });
        return actionBar;
    }
    _onWidgetClosed(didCancel) {
        this._list.value?.hide(didCancel);
    }
};
ActionWidgetService = __decorate([
    __param(0, IContextViewService),
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], ActionWidgetService);
registerSingleton(IActionWidgetService, ActionWidgetService, 1 /* InstantiationType.Delayed */);
const weight = 100 /* KeybindingWeight.EditorContrib */ + 1000;
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'hideCodeActionWidget',
            title: localize2('hideCodeActionWidget.title', "Hide action widget"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 9 /* KeyCode.Escape */,
                secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
            },
        });
    }
    run(accessor) {
        accessor.get(IActionWidgetService).hide(true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'selectPrevCodeAction',
            title: localize2('selectPrevCodeAction.title', "Select previous action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 16 /* KeyCode.UpArrow */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
                mac: { primary: 16 /* KeyCode.UpArrow */, secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */, 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */] },
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.focusPrevious();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'selectNextCodeAction',
            title: localize2('selectNextCodeAction.title', "Select next action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 18 /* KeyCode.DownArrow */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
                mac: { primary: 18 /* KeyCode.DownArrow */, secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */, 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */] }
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.focusNext();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: acceptSelectedActionCommand,
            title: localize2('acceptSelected.title', "Accept selected action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 3 /* KeyCode.Enter */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */],
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.acceptSelected();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: previewSelectedActionCommand,
            title: localize2('previewSelected.title', "Preview selected action"),
            precondition: ActionWidgetContextKeys.Visible,
            keybinding: {
                weight,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
            }
        });
    }
    run(accessor) {
        const widgetService = accessor.get(IActionWidgetService);
        if (widgetService instanceof ActionWidgetService) {
            widgetService.acceptSelected(true);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9uV2lkZ2V0L2Jyb3dzZXIvYWN0aW9uV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBSTVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEgsT0FBTyxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxVQUFVLEVBQXdDLDRCQUE0QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOUksT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0UsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNkNBQTZDLENBQUM7QUFFdkgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWpHLGFBQWEsQ0FDWiw2QkFBNkIsRUFDN0IsMkJBQTJCLEVBQzNCLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSwwREFBMEQsQ0FB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
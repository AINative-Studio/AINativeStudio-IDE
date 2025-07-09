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
import { localize, localize2 } from '../../../../nls.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Action } from '../../../../base/common/actions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { StatusBarFocused } from '../../../common/contextkeys.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
export class ToggleStatusbarEntryVisibilityAction extends Action {
    constructor(id, label, model) {
        super(id, label, undefined, true);
        this.model = model;
        this.checked = !model.isHidden(id);
    }
    async run() {
        if (this.model.isHidden(this.id)) {
            this.model.show(this.id);
        }
        else {
            this.model.hide(this.id);
        }
    }
}
export class HideStatusbarEntryAction extends Action {
    constructor(id, name, model) {
        super(id, localize('hide', "Hide '{0}'", name), undefined, true);
        this.model = model;
    }
    async run() {
        this.model.hide(this.id);
    }
}
let ManageExtensionAction = class ManageExtensionAction extends Action {
    constructor(extensionId, commandService) {
        super('statusbar.manage.extension', localize('manageExtension', "Manage Extension"));
        this.extensionId = extensionId;
        this.commandService = commandService;
    }
    run() {
        return this.commandService.executeCommand('_extensions.manage', this.extensionId);
    }
};
ManageExtensionAction = __decorate([
    __param(1, ICommandService)
], ManageExtensionAction);
export { ManageExtensionAction };
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusPrevious',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 15 /* KeyCode.LeftArrow */,
    secondary: [16 /* KeyCode.UpArrow */],
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focusPreviousEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusNext',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 17 /* KeyCode.RightArrow */,
    secondary: [18 /* KeyCode.DownArrow */],
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focusNextEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusFirst',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 14 /* KeyCode.Home */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focus(false);
        statusBarService.focusNextEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.focusLast',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 13 /* KeyCode.End */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        statusBarService.focus(false);
        statusBarService.focusPreviousEntry();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.statusBar.clearFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 9 /* KeyCode.Escape */,
    when: StatusBarFocused,
    handler: (accessor) => {
        const statusBarService = accessor.get(IStatusbarService);
        const editorService = accessor.get(IEditorService);
        if (statusBarService.isEntryFocused()) {
            statusBarService.focus(false);
        }
        else if (editorService.activeEditorPane) {
            editorService.activeEditorPane.focus();
        }
    }
});
class FocusStatusBarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusStatusBar',
            title: localize2('focusStatusBar', 'Focus Status Bar'),
            category: Categories.View,
            f1: true
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.focusPart("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, getActiveWindow());
    }
}
registerAction2(FocusStatusBarAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9zdGF0dXNiYXIvc3RhdHVzYmFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQVMsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFFdEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbkYsTUFBTSxPQUFPLG9DQUFxQyxTQUFRLE1BQU07SUFFL0QsWUFBWSxFQUFVLEVBQUUsS0FBYSxFQUFVLEtBQXlCO1FBQ3ZFLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQURZLFVBQUssR0FBTCxLQUFLLENBQW9CO1FB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
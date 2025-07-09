/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { MenuId, Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { IQuickInputService, ItemActivation } from '../../../platform/quickinput/common/quickInput.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { inQuickPickContext, defaultQuickAccessContext, getQuickNavigateHandler } from '../quickaccess.js';
import { Codicon } from '../../../base/common/codicons.js';
//#region Quick access management commands and keys
const globalQuickAccessKeybinding = {
    primary: 2048 /* KeyMod.CtrlCmd */ | 46 /* KeyCode.KeyP */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */],
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 46 /* KeyCode.KeyP */, secondary: undefined }
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.closeQuickOpen',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 9 /* KeyCode.Escape */, secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        return quickInputService.cancel();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.acceptSelectedQuickOpenItem',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        return quickInputService.accept();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.alternativeAcceptSelectedQuickOpenItem',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        return quickInputService.accept({ ctrlCmd: true, alt: false });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.focusQuickOpen',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.focus();
    }
});
const quickAccessNavigateNextInFilePickerId = 'workbench.action.quickOpenNavigateNextInFilePicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigateNextInFilePickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigateNextInFilePickerId, true),
    when: defaultQuickAccessContext,
    primary: globalQuickAccessKeybinding.primary,
    secondary: globalQuickAccessKeybinding.secondary,
    mac: globalQuickAccessKeybinding.mac
});
const quickAccessNavigatePreviousInFilePickerId = 'workbench.action.quickOpenNavigatePreviousInFilePicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigatePreviousInFilePickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigatePreviousInFilePickerId, false),
    when: defaultQuickAccessContext,
    primary: globalQuickAccessKeybinding.primary | 1024 /* KeyMod.Shift */,
    secondary: [globalQuickAccessKeybinding.secondary[0] | 1024 /* KeyMod.Shift */],
    mac: {
        primary: globalQuickAccessKeybinding.mac.primary | 1024 /* KeyMod.Shift */,
        secondary: undefined
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.quickPickManyToggle',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: inQuickPickContext,
    primary: 0,
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.toggle();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.quickInputBack',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    when: inQuickPickContext,
    primary: 0,
    win: { primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */ },
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 88 /* KeyCode.Minus */ },
    linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 88 /* KeyCode.Minus */ },
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.back();
    }
});
registerAction2(class QuickAccessAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.quickOpen',
            title: localize2('quickOpen', "Go to File..."),
            metadata: {
                description: `Quick access`,
                args: [{
                        name: 'prefix',
                        schema: {
                            'type': 'string'
                        }
                    }]
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: globalQuickAccessKeybinding.primary,
                secondary: globalQuickAccessKeybinding.secondary,
                mac: globalQuickAccessKeybinding.mac
            },
            f1: true
        });
    }
    run(accessor, prefix) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(typeof prefix === 'string' ? prefix : undefined, { preserveValue: typeof prefix === 'string' /* preserve as is if provided */ });
    }
});
registerAction2(class QuickAccessAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.quickOpenWithModes',
            title: localize('quickOpenWithModes', "Quick Open"),
            icon: Codicon.search,
            menu: {
                id: MenuId.CommandCenterCenter,
                order: 100
            }
        });
    }
    run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const providerOptions = {
            includeHelp: true,
            from: 'commandCenter',
        };
        quickInputService.quickAccess.show(undefined, {
            preserveValue: true,
            providerOptions
        });
    }
});
CommandsRegistry.registerCommand('workbench.action.quickOpenPreviousEditor', async (accessor) => {
    const quickInputService = accessor.get(IQuickInputService);
    quickInputService.quickAccess.show('', { itemActivation: ItemActivation.SECOND });
});
//#endregion
//#region Workbench actions
class BaseQuickAccessNavigateAction extends Action2 {
    constructor(id, title, next, quickNavigate, keybinding) {
        super({ id, title, f1: true, keybinding });
        this.id = id;
        this.next = next;
        this.quickNavigate = quickNavigate;
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keys = keybindingService.lookupKeybindings(this.id);
        const quickNavigate = this.quickNavigate ? { keybindings: keys } : undefined;
        quickInputService.navigate(this.next, quickNavigate);
    }
}
class QuickAccessNavigateNextAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenNavigateNext', localize2('quickNavigateNext', 'Navigate Next in Quick Open'), true, true);
    }
}
class QuickAccessNavigatePreviousAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenNavigatePrevious', localize2('quickNavigatePrevious', 'Navigate Previous in Quick Open'), false, true);
    }
}
class QuickAccessSelectNextAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenSelectNext', localize2('quickSelectNext', 'Select Next in Quick Open'), true, false, {
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
            when: inQuickPickContext,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */ }
        });
    }
}
class QuickAccessSelectPreviousAction extends BaseQuickAccessNavigateAction {
    constructor() {
        super('workbench.action.quickOpenSelectPrevious', localize2('quickSelectPrevious', 'Select Previous in Quick Open'), false, false, {
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
            when: inQuickPickContext,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */ }
        });
    }
}
registerAction2(QuickAccessSelectNextAction);
registerAction2(QuickAccessSelectPreviousAction);
registerAction2(QuickAccessNavigateNextAction);
registerAction2(QuickAccessNavigatePreviousAction);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3NBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvcXVpY2tBY2Nlc3NBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFxQyxNQUFNLDREQUE0RCxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUVqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUczRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0QsbURBQW1EO0FBRW5ELE1BQU0sMkJBQTJCLEdBQUc7SUFDbkMsT0FBTyxFQUFFLGlEQUE2QjtJQUN0QyxTQUFTLEVBQUUsQ0FBQyxpREFBNkIsQ0FBQztJQUMxQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsaURBQTZCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRTtDQUNyRSxDQUFDO0FBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSxFQUFFLGlDQUFpQztJQUNyQyxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsa0JB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
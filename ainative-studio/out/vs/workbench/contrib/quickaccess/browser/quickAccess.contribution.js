/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { HelpQuickAccessProvider } from '../../../../platform/quickinput/browser/helpQuickAccess.js';
import { ViewQuickAccessProvider, OpenViewPickerAction, QuickAccessViewPickerAction } from './viewQuickAccess.js';
import { CommandsQuickAccessProvider, ShowAllCommandsAction, ClearCommandHistoryAction } from './commandsQuickAccess.js';
import { MenuRegistry, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { inQuickPickContext, getQuickNavigateHandler } from '../../../browser/quickaccess.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
//#region Quick Access Proviers
const quickAccessRegistry = Registry.as(Extensions.Quickaccess);
quickAccessRegistry.registerQuickAccessProvider({
    ctor: HelpQuickAccessProvider,
    prefix: HelpQuickAccessProvider.PREFIX,
    placeholder: localize('helpQuickAccessPlaceholder', "Type '{0}' to get help on the actions you can take from here.", HelpQuickAccessProvider.PREFIX),
    helpEntries: [{
            description: localize('helpQuickAccess', "Show all Quick Access Providers"),
            commandCenterOrder: 70,
            commandCenterLabel: localize('more', 'More')
        }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: ViewQuickAccessProvider,
    prefix: ViewQuickAccessProvider.PREFIX,
    contextKey: 'inViewsPicker',
    placeholder: localize('viewQuickAccessPlaceholder', "Type the name of a view, output channel or terminal to open."),
    helpEntries: [{ description: localize('viewQuickAccess', "Open View"), commandId: OpenViewPickerAction.ID }]
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: CommandsQuickAccessProvider,
    prefix: CommandsQuickAccessProvider.PREFIX,
    contextKey: 'inCommandsPicker',
    placeholder: localize('commandsQuickAccessPlaceholder', "Type the name of a command to run."),
    helpEntries: [{ description: localize('commandsQuickAccess', "Show and Run Commands"), commandId: ShowAllCommandsAction.ID, commandCenterOrder: 20 }]
});
//#endregion
//#region Menu contributions
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    group: '1_open',
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize({ key: 'miCommandPalette', comment: ['&& denotes a mnemonic'] }, "&&Command Palette...")
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
    group: '1_welcome',
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize({ key: 'miShowAllCommands', comment: ['&& denotes a mnemonic'] }, "Show All Commands")
    },
    order: 2
});
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    group: '1_open',
    command: {
        id: OpenViewPickerAction.ID,
        title: localize({ key: 'miOpenView', comment: ['&& denotes a mnemonic'] }, "&&Open View...")
    },
    order: 2
});
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '5_infile_nav',
    command: {
        id: 'workbench.action.gotoLine',
        title: localize({ key: 'miGotoLine', comment: ['&& denotes a mnemonic'] }, "Go to &&Line/Column...")
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
    group: '1_command',
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize('commandPalette', "Command Palette...")
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    group: 'z_commands',
    when: EditorContextKeys.editorSimpleInput.toNegated(),
    command: {
        id: ShowAllCommandsAction.ID,
        title: localize('commandPalette', "Command Palette..."),
    },
    order: 1
});
//#endregion
//#region Workbench actions and commands
registerAction2(ClearCommandHistoryAction);
registerAction2(ShowAllCommandsAction);
registerAction2(OpenViewPickerAction);
registerAction2(QuickAccessViewPickerAction);
const inViewsPickerContextKey = 'inViewsPicker';
const inViewsPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(inViewsPickerContextKey));
const viewPickerKeybinding = QuickAccessViewPickerAction.KEYBINDING;
const quickAccessNavigateNextInViewPickerId = 'workbench.action.quickOpenNavigateNextInViewPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigateNextInViewPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigateNextInViewPickerId, true),
    when: inViewsPickerContext,
    primary: viewPickerKeybinding.primary,
    linux: viewPickerKeybinding.linux,
    mac: viewPickerKeybinding.mac
});
const quickAccessNavigatePreviousInViewPickerId = 'workbench.action.quickOpenNavigatePreviousInViewPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigatePreviousInViewPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigatePreviousInViewPickerId, false),
    when: inViewsPickerContext,
    primary: viewPickerKeybinding.primary | 1024 /* KeyMod.Shift */,
    linux: viewPickerKeybinding.linux,
    mac: {
        primary: viewPickerKeybinding.mac.primary | 1024 /* KeyMod.Shift */
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3F1aWNrYWNjZXNzL2Jyb3dzZXIvcXVpY2tBY2Nlc3MuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXdCLFVBQVUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNsSCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUscUJBQXFCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRW5GLCtCQUErQjtBQUUvQixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztB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
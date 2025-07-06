/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import { InputFocusedContext } from '../../contextkey/common/contextkeys.js';
import { KeybindingsRegistry } from '../../keybinding/common/keybindingsRegistry.js';
import { endOfQuickInputBoxContext, inQuickInputContext, quickInputTypeContextKeyValue } from './quickInput.js';
import { IQuickInputService, QuickPickFocus } from '../common/quickInput.js';
const defaultCommandAndKeybindingRule = {
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickPick" /* QuickInputType.QuickPick */), inQuickInputContext),
    metadata: { description: localize('quickPick', "Used while in the context of the quick pick. If you change one keybinding for this command, you should change all of the other keybindings (modifier variants) of this command as well.") }
};
function registerQuickPickCommandAndKeybindingRule(rule, options = {}) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        ...defaultCommandAndKeybindingRule,
        ...rule,
        secondary: getSecondary(rule.primary, rule.secondary ?? [], options)
    });
}
const ctrlKeyMod = isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */;
// This function will generate all the combinations of keybindings for the given primary keybinding
function getSecondary(primary, secondary, options = {}) {
    if (options.withAltMod) {
        secondary.push(512 /* KeyMod.Alt */ + primary);
    }
    if (options.withCtrlMod) {
        secondary.push(ctrlKeyMod + primary);
        if (options.withAltMod) {
            secondary.push(512 /* KeyMod.Alt */ + ctrlKeyMod + primary);
        }
    }
    if (options.withCmdMod && isMacintosh) {
        secondary.push(2048 /* KeyMod.CtrlCmd */ + primary);
        if (options.withCtrlMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + primary);
        }
        if (options.withAltMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + primary);
            if (options.withCtrlMod) {
                secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 256 /* KeyMod.WinCtrl */ + primary);
            }
        }
    }
    return secondary;
}
//#region Navigation
function focusHandler(focus, focusOnQuickNatigate) {
    return accessor => {
        // Assuming this is a quick pick due to above when clause
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        if (!currentQuickPick) {
            return;
        }
        if (focusOnQuickNatigate && currentQuickPick.quickNavigate) {
            return currentQuickPick.focus(focusOnQuickNatigate);
        }
        return currentQuickPick.focus(focus);
    };
}
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.pageNext', primary: 12 /* KeyCode.PageDown */, handler: focusHandler(QuickPickFocus.NextPage) }, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.pagePrevious', primary: 11 /* KeyCode.PageUp */, handler: focusHandler(QuickPickFocus.PreviousPage) }, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.first', primary: ctrlKeyMod + 14 /* KeyCode.Home */, handler: focusHandler(QuickPickFocus.First) }, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.last', primary: ctrlKeyMod + 13 /* KeyCode.End */, handler: focusHandler(QuickPickFocus.Last) }, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.next', primary: 18 /* KeyCode.DownArrow */, handler: focusHandler(QuickPickFocus.Next) }, { withCtrlMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.previous', primary: 16 /* KeyCode.UpArrow */, handler: focusHandler(QuickPickFocus.Previous) }, { withCtrlMod: true });
// The next & previous separator commands are interesting because if we are in quick access mode, we are already holding a modifier key down.
// In this case, we want that modifier key+up/down to navigate to the next/previous item, not the next/previous separator.
// To handle this, we have a separate command for navigating to the next/previous separator when we are not in quick access mode.
// If, however, we are in quick access mode, and you hold down an additional modifier key, we will navigate to the next/previous separator.
const nextSeparatorFallbackDesc = localize('quickInput.nextSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the next item. If we are not in quick access mode, this will navigate to the next separator.");
const prevSeparatorFallbackDesc = localize('quickInput.previousSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the previous item. If we are not in quick access mode, this will navigate to the previous separator.");
if (isMacintosh) {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 18 /* KeyCode.DownArrow */],
        handler: focusHandler(QuickPickFocus.NextSeparator)
    }, { withCtrlMod: true });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 16 /* KeyCode.UpArrow */],
        handler: focusHandler(QuickPickFocus.PreviousSeparator)
    }, { withCtrlMod: true });
}
else {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator)
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator)
    });
}
//#endregion
//#region Accept
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.acceptInBackground',
    // If we are in the quick pick but the input box is not focused or our cursor is at the end of the input box
    when: ContextKeyExpr.and(defaultCommandAndKeybindingRule.when, ContextKeyExpr.or(InputFocusedContext.negate(), endOfQuickInputBoxContext)),
    primary: 17 /* KeyCode.RightArrow */,
    // Need a little extra weight to ensure this keybinding is preferred over the default cmd+alt+right arrow keybinding
    // https://github.com/microsoft/vscode/blob/1451e4fbbbf074a4355cc537c35b547b80ce1c52/src/vs/workbench/browser/parts/editor/editorActions.ts#L1178-L1195
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: (accessor) => {
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        currentQuickPick?.accept(true);
    },
}, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
//#region Toggle Hover
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.toggleHover',
    primary: ctrlKeyMod | 10 /* KeyCode.Space */,
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.toggleHover();
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxFQUErQyxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hILE9BQU8sRUFBRSxrQkFBa0IsRUFBOEIsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFekcsTUFBTSwrQkFBK0IsR0FBRztJQUN2QyxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLDZCQUE2Qiw2Q0FBMkIsRUFBRSxtQkFBbUIsQ0FBQztJQUM3SCxRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSx5TEFBeUwsQ0FBQyxFQUFFO0NBQzNPLENBQUM7QUFDRixTQUFTLHlDQUF5QyxDQUFDLElBQWdFLEVBQUUsVUFBaUYsRUFBRTtJQUN2TSxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxHQUFHLCtCQUErQjtRQUNsQyxHQUFHLElBQUk7UUFDUCxTQUFTLEVBQUUs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
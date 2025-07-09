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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3F1aWNrSW5wdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdFLE9BQU8sRUFBK0MsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsSSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsbUJBQW1CLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNoSCxPQUFPLEVBQUUsa0JBQWtCLEVBQThCLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXpHLE1BQU0sK0JBQStCLEdBQUc7SUFDdkMsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsNkNBQTJCLEVBQUUsbUJBQW1CLENBQUM7SUFDN0gsUUFBUSxFQUFFLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUseUxBQXlMLENBQUMsRUFBRTtDQUMzTyxDQUFDO0FBQ0YsU0FBUyx5Q0FBeUMsQ0FBQyxJQUFnRSxFQUFFLFVBQWlGLEVBQUU7SUFDdk0sbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsR0FBRywrQkFBK0I7UUFDbEMsR0FBRyxJQUFJO1FBQ1AsU0FBUyxFQUFF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
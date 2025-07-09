/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { MultiCommand } from '../../../../editor/browser/editorExtensions.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { accessibilityHelpIsShown, accessibleViewContainsCodeBlocks, accessibleViewCurrentProviderId, accessibleViewGoToSymbolSupported, accessibleViewHasAssignedKeybindings, accessibleViewHasUnassignedKeybindings, accessibleViewIsShown, accessibleViewSupportsNavigation, accessibleViewVerbosityEnabled } from './accessibilityConfiguration.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
const accessibleViewMenu = {
    id: MenuId.AccessibleView,
    group: 'navigation',
    when: accessibleViewIsShown
};
const commandPalette = {
    id: MenuId.CommandPalette,
    group: '',
    order: 1
};
class AccessibleViewNextAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewNext" /* AccessibilityCommandId.ShowNext */,
            precondition: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: [
                commandPalette,
                {
                    ...accessibleViewMenu,
                    when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
                }
            ],
            icon: Codicon.arrowDown,
            title: localize('editor.action.accessibleViewNext', "Show Next in Accessible View")
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).next();
    }
}
registerAction2(AccessibleViewNextAction);
class AccessibleViewNextCodeBlockAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewNextCodeBlock" /* AccessibilityCommandId.NextCodeBlock */,
            precondition: ContextKeyExpr.and(accessibleViewContainsCodeBlocks, ContextKeyExpr.or(ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "panelChat" /* AccessibleViewProviderId.PanelChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineChat" /* AccessibleViewProviderId.InlineChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "quickChat" /* AccessibleViewProviderId.QuickChat */))),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */, },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.arrowRight,
            menu: {
                ...accessibleViewMenu,
                when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewContainsCodeBlocks),
            },
            title: localize('editor.action.accessibleViewNextCodeBlock', "Accessible View: Next Code Block")
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).navigateToCodeBlock('next');
    }
}
registerAction2(AccessibleViewNextCodeBlockAction);
class AccessibleViewPreviousCodeBlockAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewPreviousCodeBlock" /* AccessibilityCommandId.PreviousCodeBlock */,
            precondition: ContextKeyExpr.and(accessibleViewContainsCodeBlocks, ContextKeyExpr.or(ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "panelChat" /* AccessibleViewProviderId.PanelChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineChat" /* AccessibleViewProviderId.InlineChat */), ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "quickChat" /* AccessibleViewProviderId.QuickChat */))),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */, },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: Codicon.arrowLeft,
            menu: {
                ...accessibleViewMenu,
                when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewContainsCodeBlocks),
            },
            title: localize('editor.action.accessibleViewPreviousCodeBlock', "Accessible View: Previous Code Block")
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).navigateToCodeBlock('previous');
    }
}
registerAction2(AccessibleViewPreviousCodeBlockAction);
class AccessibleViewPreviousAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewPrevious" /* AccessibilityCommandId.ShowPrevious */,
            precondition: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            icon: Codicon.arrowUp,
            menu: [
                commandPalette,
                {
                    ...accessibleViewMenu,
                    when: ContextKeyExpr.and(accessibleViewIsShown, accessibleViewSupportsNavigation),
                }
            ],
            title: localize('editor.action.accessibleViewPrevious', "Show Previous in Accessible View")
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).previous();
    }
}
registerAction2(AccessibleViewPreviousAction);
class AccessibleViewGoToSymbolAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewGoToSymbol" /* AccessibilityCommandId.GoToSymbol */,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewGoToSymbolSupported),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 89 /* KeyCode.Period */],
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10
            },
            icon: Codicon.symbolMisc,
            menu: [
                commandPalette,
                {
                    ...accessibleViewMenu,
                    when: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewGoToSymbolSupported),
                }
            ],
            title: localize('editor.action.accessibleViewGoToSymbol', "Go To Symbol in Accessible View")
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).goToSymbol();
    }
}
registerAction2(AccessibleViewGoToSymbolAction);
function registerCommand(command) {
    command.register();
    return command;
}
export const AccessibilityHelpAction = registerCommand(new MultiCommand({
    id: "editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */,
    precondition: undefined,
    kbOpts: {
        primary: 512 /* KeyMod.Alt */ | 59 /* KeyCode.F1 */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        linux: {
            primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 59 /* KeyCode.F1 */,
            secondary: [512 /* KeyMod.Alt */ | 59 /* KeyCode.F1 */]
        },
        kbExpr: accessibilityHelpIsShown.toNegated()
    },
    menuOpts: [{
            menuId: MenuId.CommandPalette,
            group: '',
            title: localize('editor.action.accessibilityHelp', "Open Accessibility Help"),
            order: 1
        }],
}));
export const AccessibleViewAction = registerCommand(new MultiCommand({
    id: "editor.action.accessibleView" /* AccessibilityCommandId.OpenAccessibleView */,
    precondition: undefined,
    kbOpts: {
        primary: 512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        linux: {
            primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 60 /* KeyCode.F2 */,
            secondary: [512 /* KeyMod.Alt */ | 60 /* KeyCode.F2 */]
        }
    },
    menuOpts: [{
            menuId: MenuId.CommandPalette,
            group: '',
            title: localize('editor.action.accessibleView', "Open Accessible View"),
            order: 1
        }],
}));
class AccessibleViewDisableHintAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewDisableHint" /* AccessibilityCommandId.DisableVerbosityHint */,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewVerbosityEnabled),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 64 /* KeyCode.F6 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            icon: Codicon.bellSlash,
            menu: [
                commandPalette,
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.or(accessibleViewIsShown, accessibilityHelpIsShown), accessibleViewVerbosityEnabled),
                }
            ],
            title: localize('editor.action.accessibleViewDisableHint', "Disable Accessible View Hint")
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).disableHint();
    }
}
registerAction2(AccessibleViewDisableHintAction);
class AccessibilityHelpConfigureKeybindingsAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibilityHelpConfigureKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureKeybindings */,
            precondition: ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewHasUnassignedKeybindings),
            icon: Codicon.recordKeys,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 41 /* KeyCode.KeyK */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: [
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    order: 3,
                    when: accessibleViewHasUnassignedKeybindings,
                }
            ],
            title: localize('editor.action.accessibilityHelpConfigureUnassignedKeybindings', "Accessibility Help Configure Unassigned Keybindings")
        });
    }
    async run(accessor) {
        await accessor.get(IAccessibleViewService).configureKeybindings(true);
    }
}
registerAction2(AccessibilityHelpConfigureKeybindingsAction);
class AccessibilityHelpConfigureAssignedKeybindingsAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibilityHelpConfigureAssignedKeybindings" /* AccessibilityCommandId.AccessibilityHelpConfigureAssignedKeybindings */,
            precondition: ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewHasAssignedKeybindings),
            icon: Codicon.recordKeys,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 31 /* KeyCode.KeyA */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: [
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    order: 4,
                    when: accessibleViewHasAssignedKeybindings,
                }
            ],
            title: localize('editor.action.accessibilityHelpConfigureAssignedKeybindings', "Accessibility Help Configure Assigned Keybindings")
        });
    }
    async run(accessor) {
        await accessor.get(IAccessibleViewService).configureKeybindings(false);
    }
}
registerAction2(AccessibilityHelpConfigureAssignedKeybindingsAction);
class AccessibilityHelpOpenHelpLinkAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibilityHelpOpenHelpLink" /* AccessibilityCommandId.AccessibilityHelpOpenHelpLink */,
            precondition: ContextKeyExpr.and(accessibilityHelpIsShown),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 38 /* KeyCode.KeyH */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            title: localize('editor.action.accessibilityHelpOpenHelpLink', "Accessibility Help Open Help Link")
        });
    }
    run(accessor) {
        accessor.get(IAccessibleViewService).openHelpLink();
    }
}
registerAction2(AccessibilityHelpOpenHelpLinkAction);
class AccessibleViewAcceptInlineCompletionAction extends Action2 {
    constructor() {
        super({
            id: "editor.action.accessibleViewAcceptInlineCompletion" /* AccessibilityCommandId.AccessibleViewAcceptInlineCompletion */,
            precondition: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineCompletions" /* AccessibleViewProviderId.InlineCompletions */)),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 90 /* KeyCode.Slash */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            icon: Codicon.check,
            menu: [
                commandPalette,
                {
                    id: MenuId.AccessibleView,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "inlineCompletions" /* AccessibleViewProviderId.InlineCompletions */))
                }
            ],
            title: localize('editor.action.accessibleViewAcceptInlineCompletionAction', "Accept Inline Completion")
        });
    }
    async run(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!editor) {
            return;
        }
        const model = InlineCompletionsController.get(editor)?.model.get();
        const state = model?.state.get();
        if (!model || !state) {
            return;
        }
        await model.accept(editor);
        model.stop();
        editor.focus();
    }
}
registerAction2(AccessibleViewAcceptInlineCompletionAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmxlVmlld0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBVyxZQUFZLEVBQW9CLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUd0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsZ0NBQWdDLEVBQUUsK0JBQStCLEVBQUUsaUNBQWlDLEVBQUUsb0NBQW9DLEVBQUUsc0NBQXNDLEVBQUUscUJBQXFCLEVBQUUsZ0NBQWdDLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4VixPQUFPLEVBQTRCLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDaEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0dBQWdHLENBQUM7QUFFN0ksTUFBTSxrQkFBa0IsR0FBRztJQUMxQixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7SUFDekIsS0FBSyxFQUFFLFlBQVk7SUFDbkIsSUFBSSxFQUFFLHFCQUFxQjtDQUMzQixDQUFDO0FBQ0YsTUFBTSxjQUFjLEdBQUc7SUFDdEIsRUFBRSxF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
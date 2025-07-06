/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { TextDiffEditor } from './textDiffEditor.js';
import { ActiveCompareEditorCanSwapContext, TextCompareEditorActiveContext, TextCompareEditorVisibleContext } from '../../../common/contextkeys.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
export const TOGGLE_DIFF_SIDE_BY_SIDE = 'toggle.diff.renderSideBySide';
export const GOTO_NEXT_CHANGE = 'workbench.action.compareEditor.nextChange';
export const GOTO_PREVIOUS_CHANGE = 'workbench.action.compareEditor.previousChange';
export const DIFF_FOCUS_PRIMARY_SIDE = 'workbench.action.compareEditor.focusPrimarySide';
export const DIFF_FOCUS_SECONDARY_SIDE = 'workbench.action.compareEditor.focusSecondarySide';
export const DIFF_FOCUS_OTHER_SIDE = 'workbench.action.compareEditor.focusOtherSide';
export const DIFF_OPEN_SIDE = 'workbench.action.compareEditor.openSide';
export const TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE = 'toggle.diff.ignoreTrimWhitespace';
export const DIFF_SWAP_SIDES = 'workbench.action.compareEditor.swapSides';
export function registerDiffEditorCommands() {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: GOTO_NEXT_CHANGE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: TextCompareEditorVisibleContext,
        primary: 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */,
        handler: (accessor, ...args) => navigateInDiffEditor(accessor, args, true)
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: GOTO_NEXT_CHANGE,
            title: localize2('compare.nextChange', 'Go to Next Change'),
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: GOTO_PREVIOUS_CHANGE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: TextCompareEditorVisibleContext,
        primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
        handler: (accessor, ...args) => navigateInDiffEditor(accessor, args, false)
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: GOTO_PREVIOUS_CHANGE,
            title: localize2('compare.previousChange', 'Go to Previous Change'),
        }
    });
    function getActiveTextDiffEditor(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const resource = args.length > 0 && args[0] instanceof URI ? args[0] : undefined;
        for (const editor of [editorService.activeEditorPane, ...editorService.visibleEditorPanes]) {
            if (editor instanceof TextDiffEditor && (!resource || editor.input instanceof DiffEditorInput && isEqual(editor.input.primary.resource, resource))) {
                return editor;
            }
        }
        return undefined;
    }
    function navigateInDiffEditor(accessor, args, next) {
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        if (activeTextDiffEditor) {
            activeTextDiffEditor.getControl()?.goToDiff(next ? 'next' : 'previous');
        }
    }
    let FocusTextDiffEditorMode;
    (function (FocusTextDiffEditorMode) {
        FocusTextDiffEditorMode[FocusTextDiffEditorMode["Original"] = 0] = "Original";
        FocusTextDiffEditorMode[FocusTextDiffEditorMode["Modified"] = 1] = "Modified";
        FocusTextDiffEditorMode[FocusTextDiffEditorMode["Toggle"] = 2] = "Toggle";
    })(FocusTextDiffEditorMode || (FocusTextDiffEditorMode = {}));
    function focusInDiffEditor(accessor, args, mode) {
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        if (activeTextDiffEditor) {
            switch (mode) {
                case FocusTextDiffEditorMode.Original:
                    activeTextDiffEditor.getControl()?.getOriginalEditor().focus();
                    break;
                case FocusTextDiffEditorMode.Modified:
                    activeTextDiffEditor.getControl()?.getModifiedEditor().focus();
                    break;
                case FocusTextDiffEditorMode.Toggle:
                    if (activeTextDiffEditor.getControl()?.getModifiedEditor().hasWidgetFocus()) {
                        return focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Original);
                    }
                    else {
                        return focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Modified);
                    }
            }
        }
    }
    function toggleDiffSideBySide(accessor, args) {
        const configService = accessor.get(ITextResourceConfigurationService);
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        const m = activeTextDiffEditor?.getControl()?.getModifiedEditor()?.getModel();
        if (!m) {
            return;
        }
        const key = 'diffEditor.renderSideBySide';
        const val = configService.getValue(m.uri, key);
        configService.updateValue(m.uri, key, !val);
    }
    function toggleDiffIgnoreTrimWhitespace(accessor, args) {
        const configService = accessor.get(ITextResourceConfigurationService);
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        const m = activeTextDiffEditor?.getControl()?.getModifiedEditor()?.getModel();
        if (!m) {
            return;
        }
        const key = 'diffEditor.ignoreTrimWhitespace';
        const val = configService.getValue(m.uri, key);
        configService.updateValue(m.uri, key, !val);
    }
    async function swapDiffSides(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const diffEditor = getActiveTextDiffEditor(accessor, args);
        const activeGroup = diffEditor?.group;
        const diffInput = diffEditor?.input;
        if (!diffEditor || typeof activeGroup === 'undefined' || !(diffInput instanceof DiffEditorInput) || !diffInput.modified.resource) {
            return;
        }
        const untypedDiffInput = diffInput.toUntyped({ preserveViewState: activeGroup.id, preserveResource: true });
        if (!untypedDiffInput) {
            return;
        }
        // Since we are about to replace the diff editor, make
        // sure to first open the modified side if it is not
        // yet opened. This ensures that the swapping is not
        // bringing up a confirmation dialog to save.
        if (diffInput.modified.isModified() && editorService.findEditors({ resource: diffInput.modified.resource, typeId: diffInput.modified.typeId, editorId: diffInput.modified.editorId }).length === 0) {
            await editorService.openEditor({
                ...untypedDiffInput.modified,
                options: {
                    ...untypedDiffInput.modified.options,
                    pinned: true,
                    inactive: true
                }
            }, activeGroup);
        }
        // Replace the input with the swapped variant
        await editorService.replaceEditors([
            {
                editor: diffInput,
                replacement: {
                    ...untypedDiffInput,
                    original: untypedDiffInput.modified,
                    modified: untypedDiffInput.original,
                    options: {
                        ...untypedDiffInput.options,
                        pinned: true
                    }
                }
            }
        ], activeGroup);
    }
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: TOGGLE_DIFF_SIDE_BY_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => toggleDiffSideBySide(accessor, args)
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_FOCUS_PRIMARY_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Modified)
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_FOCUS_SECONDARY_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Original)
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_FOCUS_OTHER_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Toggle)
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => toggleDiffIgnoreTrimWhitespace(accessor, args)
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_SWAP_SIDES,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => swapDiffSides(accessor, args)
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: TOGGLE_DIFF_SIDE_BY_SIDE,
            title: localize2('toggleInlineView', "Toggle Inline View"),
            category: localize('compare', "Compare")
        },
        when: TextCompareEditorActiveContext
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: DIFF_SWAP_SIDES,
            title: localize2('swapDiffSides', "Swap Left and Right Editor Side"),
            category: localize('compare', "Compare")
        },
        when: ContextKeyExpr.and(TextCompareEditorActiveContext, ActiveCompareEditorCanSwapContext)
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2RpZmZFZGl0b3JDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwSixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLDhCQUE4QixDQUFDO0FBQ3ZFLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLDJDQUEyQyxDQUFDO0FBQzVFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLCtDQUErQyxDQUFDO0FBQ3BGLE1BQU0s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
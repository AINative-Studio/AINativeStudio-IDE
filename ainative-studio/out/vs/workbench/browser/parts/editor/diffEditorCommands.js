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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9kaWZmRWRpdG9yQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwSCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxtQkFBbUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLDhCQUE4QixFQUFFLCtCQUErQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEosT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVsRixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyw4QkFBOEIsQ0FBQztBQUN2RSxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRywyQ0FBMkMsQ0FBQztBQUM1RSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRywrQ0FBK0MsQ0FBQztBQUNwRixNQUFN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
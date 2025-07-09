/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveElement } from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { EditorAction2 } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { DiffEditorWidget } from './diffEditorWidget.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import './registrations.contribution.js';
export class ToggleCollapseUnchangedRegions extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.toggleCollapseUnchangedRegions',
            title: localize2('toggleCollapseUnchangedRegions', 'Toggle Collapse Unchanged Regions'),
            icon: Codicon.map,
            toggled: ContextKeyExpr.has('config.diffEditor.hideUnchangedRegions.enabled'),
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            menu: {
                when: ContextKeyExpr.has('isInDiffEditor'),
                id: MenuId.EditorTitle,
                order: 22,
                group: 'navigation',
            },
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
        configurationService.updateValue('diffEditor.hideUnchangedRegions.enabled', newValue);
    }
}
export class ToggleShowMovedCodeBlocks extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.toggleShowMovedCodeBlocks',
            title: localize2('toggleShowMovedCodeBlocks', 'Toggle Show Moved Code Blocks'),
            precondition: ContextKeyExpr.has('isInDiffEditor'),
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.experimental.showMoves');
        configurationService.updateValue('diffEditor.experimental.showMoves', newValue);
    }
}
export class ToggleUseInlineViewWhenSpaceIsLimited extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.toggleUseInlineViewWhenSpaceIsLimited',
            title: localize2('toggleUseInlineViewWhenSpaceIsLimited', 'Toggle Use Inline View When Space Is Limited'),
            precondition: ContextKeyExpr.has('isInDiffEditor'),
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.useInlineViewWhenSpaceIsLimited');
        configurationService.updateValue('diffEditor.useInlineViewWhenSpaceIsLimited', newValue);
    }
}
const diffEditorCategory = localize2('diffEditor', "Diff Editor");
export class SwitchSide extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.switchSide',
            title: localize2('switchSide', 'Switch Side'),
            icon: Codicon.arrowSwap,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            f1: true,
            category: diffEditorCategory,
        });
    }
    runEditorCommand(accessor, editor, arg) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            if (arg && arg.dryRun) {
                return { destinationSelection: diffEditor.mapToOtherSide().destinationSelection };
            }
            else {
                diffEditor.switchSide();
            }
        }
        return undefined;
    }
}
export class ExitCompareMove extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.exitCompareMove',
            title: localize2('exitCompareMove', 'Exit Compare Move'),
            icon: Codicon.close,
            precondition: EditorContextKeys.comparingMovedCode,
            f1: false,
            category: diffEditorCategory,
            keybinding: {
                weight: 10000,
                primary: 9 /* KeyCode.Escape */,
            }
        });
    }
    runEditorCommand(accessor, editor, ...args) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.exitCompareMove();
        }
    }
}
export class CollapseAllUnchangedRegions extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.collapseAllUnchangedRegions',
            title: localize2('collapseAllUnchangedRegions', 'Collapse All Unchanged Regions'),
            icon: Codicon.fold,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            f1: true,
            category: diffEditorCategory,
        });
    }
    runEditorCommand(accessor, editor, ...args) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.collapseAllUnchangedRegions();
        }
    }
}
export class ShowAllUnchangedRegions extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.showAllUnchangedRegions',
            title: localize2('showAllUnchangedRegions', 'Show All Unchanged Regions'),
            icon: Codicon.unfold,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            f1: true,
            category: diffEditorCategory,
        });
    }
    runEditorCommand(accessor, editor, ...args) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.showAllUnchangedRegions();
        }
    }
}
export class RevertHunkOrSelection extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.revert',
            title: localize2('revert', 'Revert'),
            f1: false,
            category: diffEditorCategory,
        });
    }
    run(accessor, arg) {
        const diffEditor = findDiffEditor(accessor, arg.originalUri, arg.modifiedUri);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.revertRangeMappings(arg.mapping.innerChanges ?? []);
        }
        return undefined;
    }
}
const accessibleDiffViewerCategory = localize2('accessibleDiffViewer', "Accessible Diff Viewer");
export class AccessibleDiffViewerNext extends Action2 {
    static { this.id = 'editor.action.accessibleDiffViewer.next'; }
    constructor() {
        super({
            id: AccessibleDiffViewerNext.id,
            title: localize2('editor.action.accessibleDiffViewer.next', 'Go to Next Difference'),
            category: accessibleDiffViewerCategory,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            keybinding: {
                primary: 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            f1: true,
        });
    }
    run(accessor) {
        const diffEditor = findFocusedDiffEditor(accessor);
        diffEditor?.accessibleDiffViewerNext();
    }
}
export class AccessibleDiffViewerPrev extends Action2 {
    static { this.id = 'editor.action.accessibleDiffViewer.prev'; }
    constructor() {
        super({
            id: AccessibleDiffViewerPrev.id,
            title: localize2('editor.action.accessibleDiffViewer.prev', 'Go to Previous Difference'),
            category: accessibleDiffViewerCategory,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            f1: true,
        });
    }
    run(accessor) {
        const diffEditor = findFocusedDiffEditor(accessor);
        diffEditor?.accessibleDiffViewerPrev();
    }
}
export function findDiffEditor(accessor, originalUri, modifiedUri) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const diffEditors = codeEditorService.listDiffEditors();
    return diffEditors.find(diffEditor => {
        const modified = diffEditor.getModifiedEditor();
        const original = diffEditor.getOriginalEditor();
        return modified && modified.getModel()?.uri.toString() === modifiedUri.toString()
            && original && original.getModel()?.uri.toString() === originalUri.toString();
    }) || null;
}
export function findFocusedDiffEditor(accessor) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const diffEditors = codeEditorService.listDiffEditors();
    const activeElement = getActiveElement();
    if (activeElement) {
        for (const d of diffEditors) {
            const container = d.getContainerDomNode();
            if (container.contains(activeElement)) {
                return d;
            }
        }
    }
    return null;
}
/**
 * If `editor` is the original or modified editor of a diff editor, it returns it.
 * It returns null otherwise.
 */
export function findDiffEditorContainingCodeEditor(accessor, editor) {
    if (!editor.getOption(63 /* EditorOption.inDiffEditor */)) {
        return null;
    }
    const codeEditorService = accessor.get(ICodeEditorService);
    for (const diffEditor of codeEditorService.listDiffEditors()) {
        const originalEditor = diffEditor.getOriginalEditor();
        const modifiedEditor = diffEditor.getModifiedEditor();
        if (originalEditor === editor || modifiedEditor === editor) {
            return diffEditor;
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sMkJBQTJCLENBQUM7QUFDNUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE9BQU8saUNBQWlDLENBQUM7QUFLekMsTUFBTSxPQUFPLDhCQUErQixTQUFRLE9BQU87SUFDMUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMkNBQTJDO1lBQy9DLEtBQUssRUFBRSxTQUFTLENBQUMsZ0NBQWdDLEVBQUUsbUNBQW1DLENBQUM7WUFDdkYsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHO1lBQ2pCLE9BQU8sRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGdEQUFnRCxDQUFDO1lBQzdFLFlB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { resolveCommandsContext } from '../../../browser/parts/editor/editorCommandsContext.js';
import { MultiDiffEditor } from './multiDiffEditor.js';
import { MultiDiffEditorInput } from './multiDiffEditorInput.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
export class GoToFileAction extends Action2 {
    constructor() {
        super({
            id: 'multiDiffEditor.goToFile',
            title: localize2('goToFile', 'Open File'),
            icon: Codicon.goToFile,
            precondition: ActiveEditorContext.isEqualTo(MultiDiffEditor.ID),
            menu: {
                when: ActiveEditorContext.isEqualTo(MultiDiffEditor.ID),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 22,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        let selections = undefined;
        if (!(activeEditorPane instanceof MultiDiffEditor)) {
            return;
        }
        const editor = activeEditorPane.tryGetCodeEditor(uri);
        if (editor) {
            selections = editor.editor.getSelections() ?? undefined;
        }
        let targetUri = uri;
        const item = activeEditorPane.findDocumentDiffItem(uri);
        if (item && item.goToFileUri) {
            targetUri = item.goToFileUri;
        }
        await editorService.openEditor({
            resource: targetUri,
            options: {
                selection: selections?.[0],
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            },
        });
    }
}
export class CollapseAllAction extends Action2 {
    constructor() {
        super({
            id: 'multiDiffEditor.collapseAll',
            title: localize2('collapseAllDiffs', 'Collapse All Diffs'),
            icon: Codicon.collapseAll,
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.not('multiDiffEditorAllCollapsed')),
            menu: {
                when: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.not('multiDiffEditorAllCollapsed')),
                id: MenuId.EditorTitle,
                group: 'navigation',
                order: 100
            },
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const groupContext = resolvedContext.groupedEditors[0];
        if (!groupContext) {
            return;
        }
        const editor = groupContext.editors[0];
        if (editor instanceof MultiDiffEditorInput) {
            const viewModel = await editor.getViewModel();
            viewModel.collapseAll();
        }
    }
}
export class ExpandAllAction extends Action2 {
    constructor() {
        super({
            id: 'multiDiffEditor.expandAll',
            title: localize2('ExpandAllDiffs', 'Expand All Diffs'),
            icon: Codicon.expandAll,
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.has('multiDiffEditorAllCollapsed')),
            menu: {
                when: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.has('multiDiffEditorAllCollapsed')),
                id: MenuId.EditorTitle,
                group: 'navigation',
                order: 100
            },
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const groupContext = resolvedContext.groupedEditors[0];
        if (!groupContext) {
            return;
        }
        const editor = groupContext.editors[0];
        if (editor instanceof MultiDiffEditorInput) {
            const viewModel = await editor.getViewModel();
            viewModel.expandAll();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tdWx0aURpZmZFZGl0b3IvYnJvd3Nlci9hY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUc5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckUsTUFBTSxPQUFPLGNBQWUsU0FBUSxPQUFPO0lBQzFDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDBCQUEwQjtZQUM5QixLQUFLLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUM7WUFDekMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQ3RCLFlBQVksRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLENBQUMs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
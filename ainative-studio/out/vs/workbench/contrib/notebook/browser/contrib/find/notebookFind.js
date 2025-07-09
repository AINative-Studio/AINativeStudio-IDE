/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/notebookFind.css';
import { Schemas } from '../../../../../../base/common/network.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { ICodeEditorService } from '../../../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { getSelectionSearchString, StartFindAction, StartFindReplaceAction } from '../../../../../../editor/contrib/find/browser/findController.js';
import { localize2 } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { NotebookFindContrib } from './notebookFindWidget.js';
import { NotebookMultiCellAction } from '../../controller/coreActions.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CellUri, NotebookFindScopeType } from '../../../common/notebookCommon.js';
import { INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR, KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR } from '../../../common/notebookContextKeys.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
registerNotebookContribution(NotebookFindContrib.id, NotebookFindContrib);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.hideFind',
            title: localize2('notebookActions.hideFind', 'Hide Find in Notebook'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED),
                primary: 9 /* KeyCode.Escape */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const controller = editor.getContribution(NotebookFindContrib.id);
        controller.hide();
        editor.focus();
    }
});
registerAction2(class extends NotebookMultiCellAction {
    constructor() {
        super({
            id: 'notebook.find',
            title: localize2('notebookActions.findInNotebook', 'Find in Notebook'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.or(NOTEBOOK_IS_ACTIVE_EDITOR, INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR), EditorContextKeys.focus.toNegated()),
                primary: 36 /* KeyCode.KeyF */ | 2048 /* KeyMod.CtrlCmd */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const controller = editor.getContribution(NotebookFindContrib.id);
        controller.show(undefined, { findScope: { findScopeType: NotebookFindScopeType.None } });
    }
});
function notebookContainsTextModel(uri, textModel) {
    if (textModel.uri.scheme === Schemas.vscodeNotebookCell) {
        const cellUri = CellUri.parse(textModel.uri);
        if (cellUri && isEqual(cellUri.notebook, uri)) {
            return true;
        }
    }
    return false;
}
function getSearchStringOptions(editor, opts) {
    // Get the search string result, following the same logic in _start function in 'vs/editor/contrib/find/browser/findController'
    if (opts.seedSearchStringFromSelection === 'single') {
        const selectionSearchString = getSelectionSearchString(editor, opts.seedSearchStringFromSelection, opts.seedSearchStringFromNonEmptySelection);
        if (selectionSearchString) {
            return {
                searchString: selectionSearchString,
                selection: editor.getSelection()
            };
        }
    }
    else if (opts.seedSearchStringFromSelection === 'multiple' && !opts.updateSearchScope) {
        const selectionSearchString = getSelectionSearchString(editor, opts.seedSearchStringFromSelection);
        if (selectionSearchString) {
            return {
                searchString: selectionSearchString,
                selection: editor.getSelection()
            };
        }
    }
    return undefined;
}
StartFindAction.addImplementation(100, (accessor, codeEditor, args) => {
    const editorService = accessor.get(IEditorService);
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor) {
        return false;
    }
    if (!codeEditor.hasModel()) {
        return false;
    }
    if (!editor.hasEditorFocus() && !editor.hasWebviewFocus()) {
        const codeEditorService = accessor.get(ICodeEditorService);
        // check if the active pane contains the active text editor
        const textEditor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (editor.hasModel() && textEditor && textEditor.hasModel() && notebookContainsTextModel(editor.textModel.uri, textEditor.getModel())) {
            // the active text editor is in notebook editor
        }
        else {
            return false;
        }
    }
    const controller = editor.getContribution(NotebookFindContrib.id);
    const searchStringOptions = getSearchStringOptions(codeEditor, {
        forceRevealReplace: false,
        seedSearchStringFromSelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never' ? 'single' : 'none',
        seedSearchStringFromNonEmptySelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: codeEditor.getOption(43 /* EditorOption.find */).globalFindClipboard,
        shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: codeEditor.getOption(43 /* EditorOption.find */).loop
    });
    let options = undefined;
    const uri = codeEditor.getModel().uri;
    const data = CellUri.parse(uri);
    if (searchStringOptions?.selection && data) {
        const cell = editor.getCellByHandle(data.handle);
        if (cell) {
            options = {
                searchStringSeededFrom: { cell, range: searchStringOptions.selection },
            };
        }
    }
    controller.show(searchStringOptions?.searchString, options);
    return true;
});
StartFindReplaceAction.addImplementation(100, (accessor, codeEditor, args) => {
    const editorService = accessor.get(IEditorService);
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor) {
        return false;
    }
    if (!codeEditor.hasModel()) {
        return false;
    }
    const controller = editor.getContribution(NotebookFindContrib.id);
    const searchStringOptions = getSearchStringOptions(codeEditor, {
        forceRevealReplace: false,
        seedSearchStringFromSelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection !== 'never' ? 'single' : 'none',
        seedSearchStringFromNonEmptySelection: codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: codeEditor.getOption(43 /* EditorOption.find */).globalFindClipboard,
        shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: codeEditor.getOption(43 /* EditorOption.find */).loop
    });
    if (controller) {
        controller.replace(searchStringOptions?.searchString);
        return true;
    }
    return false;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGaW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9maW5kL25vdGVib29rRmluZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDBCQUEwQixDQUFDO0FBRWxDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFekYsT0FBTyxFQUF3Qix3QkFBd0IsRUFBcUIsZUFBZSxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0wsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzVGLE9BQU8sRUFBa0MsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RixPQUFPLEVBQTJCLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbkcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxtQ0FB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
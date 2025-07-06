/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { INotebookEditorService } from '../services/notebookEditorService.js';
import { NotebookSetting } from '../../common/notebookCommon.js';
import { isNotebookEditorInput } from '../../common/notebookEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
export class NotebookIndentUsingTabs extends Action2 {
    static { this.ID = 'notebook.action.indentUsingTabs'; }
    constructor() {
        super({
            id: NotebookIndentUsingTabs.ID,
            title: nls.localize('indentUsingTabs', "Indent Using Tabs"),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        changeNotebookIndentation(accessor, false, false);
    }
}
export class NotebookIndentUsingSpaces extends Action2 {
    static { this.ID = 'notebook.action.indentUsingSpaces'; }
    constructor() {
        super({
            id: NotebookIndentUsingSpaces.ID,
            title: nls.localize('indentUsingSpaces', "Indent Using Spaces"),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        changeNotebookIndentation(accessor, true, false);
    }
}
export class NotebookChangeTabDisplaySize extends Action2 {
    static { this.ID = 'notebook.action.changeTabDisplaySize'; }
    constructor() {
        super({
            id: NotebookChangeTabDisplaySize.ID,
            title: nls.localize('changeTabDisplaySize', "Change Tab Display Size"),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        changeNotebookIndentation(accessor, true, true);
    }
}
export class NotebookIndentationToSpacesAction extends Action2 {
    static { this.ID = 'notebook.action.convertIndentationToSpaces'; }
    constructor() {
        super({
            id: NotebookIndentationToSpacesAction.ID,
            title: nls.localize('convertIndentationToSpaces', "Convert Indentation to Spaces"),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        convertNotebookIndentation(accessor, true);
    }
}
export class NotebookIndentationToTabsAction extends Action2 {
    static { this.ID = 'notebook.action.convertIndentationToTabs'; }
    constructor() {
        super({
            id: NotebookIndentationToTabsAction.ID,
            title: nls.localize('convertIndentationToTabs', "Convert Indentation to Tabs"),
            precondition: undefined,
        });
    }
    run(accessor, ...args) {
        convertNotebookIndentation(accessor, false);
    }
}
function changeNotebookIndentation(accessor, insertSpaces, displaySizeOnly) {
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const notebookEditorService = accessor.get(INotebookEditorService);
    const quickInputService = accessor.get(IQuickInputService);
    // keep this check here to pop on non-notebook actions
    const activeInput = editorService.activeEditorPane?.input;
    const isNotebook = isNotebookEditorInput(activeInput);
    if (!isNotebook) {
        return;
    }
    // get notebook editor to access all codeEditors
    const notebookEditor = notebookEditorService.retrieveExistingWidgetFromURI(activeInput.resource)?.value;
    if (!notebookEditor) {
        return;
    }
    const picks = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
        id: n.toString(),
        label: n.toString(),
    }));
    // store the initial values of the configuration
    const initialConfig = configurationService.getValue(NotebookSetting.cellEditorOptionsCustomizations);
    const initialInsertSpaces = initialConfig['editor.insertSpaces'];
    // remove the initial values from the configuration
    delete initialConfig['editor.indentSize'];
    delete initialConfig['editor.tabSize'];
    delete initialConfig['editor.insertSpaces'];
    setTimeout(() => {
        quickInputService.pick(picks, { placeHolder: nls.localize({ key: 'selectTabWidth', comment: ['Tab corresponds to the tab key'] }, "Select Tab Size for Current File") }).then(pick => {
            if (pick) {
                const pickedVal = parseInt(pick.label, 10);
                if (displaySizeOnly) {
                    configurationService.updateValue(NotebookSetting.cellEditorOptionsCustomizations, {
                        ...initialConfig,
                        'editor.tabSize': pickedVal,
                        'editor.indentSize': pickedVal,
                        'editor.insertSpaces': initialInsertSpaces
                    });
                }
                else {
                    configurationService.updateValue(NotebookSetting.cellEditorOptionsCustomizations, {
                        ...initialConfig,
                        'editor.tabSize': pickedVal,
                        'editor.indentSize': pickedVal,
                        'editor.insertSpaces': insertSpaces
                    });
                }
            }
        });
    }, 50 /* quick input is sensitive to being opened so soon after another */);
}
function convertNotebookIndentation(accessor, tabsToSpaces) {
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const logService = accessor.get(ILogService);
    const textModelService = accessor.get(ITextModelService);
    const notebookEditorService = accessor.get(INotebookEditorService);
    const bulkEditService = accessor.get(IBulkEditService);
    // keep this check here to pop on non-notebook
    const activeInput = editorService.activeEditorPane?.input;
    const isNotebook = isNotebookEditorInput(activeInput);
    if (!isNotebook) {
        return;
    }
    // get notebook editor to access all codeEditors
    const notebookTextModel = notebookEditorService.retrieveExistingWidgetFromURI(activeInput.resource)?.value?.textModel;
    if (!notebookTextModel) {
        return;
    }
    const disposable = new DisposableStore();
    try {
        Promise.all(notebookTextModel.cells.map(async (cell) => {
            const ref = await textModelService.createModelReference(cell.uri);
            disposable.add(ref);
            const textEditorModel = ref.object.textEditorModel;
            const modelOpts = cell.textModel?.getOptions();
            if (!modelOpts) {
                return;
            }
            const edits = getIndentationEditOperations(textEditorModel, modelOpts.tabSize, tabsToSpaces);
            bulkEditService.apply(edits, { label: nls.localize('convertIndentation', "Convert Indentation"), code: 'undoredo.convertIndentation', });
        })).then(() => {
            // store the initial values of the configuration
            const initialConfig = configurationService.getValue(NotebookSetting.cellEditorOptionsCustomizations);
            const initialIndentSize = initialConfig['editor.indentSize'];
            const initialTabSize = initialConfig['editor.tabSize'];
            // remove the initial values from the configuration
            delete initialConfig['editor.indentSize'];
            delete initialConfig['editor.tabSize'];
            delete initialConfig['editor.insertSpaces'];
            configurationService.updateValue(NotebookSetting.cellEditorOptionsCustomizations, {
                ...initialConfig,
                'editor.tabSize': initialTabSize,
                'editor.indentSize': initialIndentSize,
                'editor.insertSpaces': tabsToSpaces
            });
            disposable.dispose();
        });
    }
    catch {
        logService.error('Failed to convert indentation to spaces for notebook cells.');
    }
}
function getIndentationEditOperations(model, tabSize, tabsToSpaces) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return [];
    }
    let spaces = '';
    for (let i = 0; i < tabSize; i++) {
        spaces += ' ';
    }
    const spacesRegExp = new RegExp(spaces, 'gi');
    const edits = [];
    for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
        let lastIndentationColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        if (lastIndentationColumn === 0) {
            lastIndentationColumn = model.getLineMaxColumn(lineNumber);
        }
        if (lastIndentationColumn === 1) {
            continue;
        }
        const originalIndentationRange = new Range(lineNumber, 1, lineNumber, lastIndentationColumn);
        const originalIndentation = model.getValueInRange(originalIndentationRange);
        const newIndentation = (tabsToSpaces
            ? originalIndentation.replace(/\t/ig, spaces)
            : originalIndentation.replace(spacesRegExp, '\t'));
        edits.push(new ResourceTextEdit(model.uri, { range: originalIndentationRange, text: newIndentation }));
    }
    return edits;
}
registerAction2(NotebookIndentUsingSpaces);
registerAction2(NotebookIndentUsingTabs);
registerAction2(NotebookChangeTabDisplaySize);
registerAction2(NotebookIndentationToSpacesAction);
registerAction2(NotebookIndentationToTabsAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmRlbnRhdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvbm90ZWJvb2tJbmRlbnRhdGlvbkFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0csT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsTUFBTSxPQUFPLHVCQUF3QixTQUFRLE9BQU87YUFDNUIsT0FBRSxHQUFHLGlD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
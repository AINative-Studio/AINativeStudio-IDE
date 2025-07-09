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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmRlbnRhdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL25vdGVib29rSW5kZW50YXRpb25BY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXJGLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxPQUFPO2FBQzVCLE9BQUUsR0FBRyxp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
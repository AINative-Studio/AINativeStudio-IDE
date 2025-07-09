/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { CommandExecutor } from '../../../../../editor/common/cursor/cursor.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { getIconClasses } from '../../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { LineCommentCommand } from '../../../../../editor/contrib/comment/browser/lineCommentCommand.js';
import { localize, localize2 } from '../../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext, InputFocusedContextKey } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { InlineChatController } from '../../../inlineChat/browser/inlineChatController.js';
import { CTX_INLINE_CHAT_FOCUSED } from '../../../inlineChat/common/inlineChat.js';
import { changeCellToKind, runDeleteAction } from './cellOperations.js';
import { CELL_TITLE_CELL_GROUP_ID, CELL_TITLE_OUTPUT_GROUP_ID, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, NotebookAction, NotebookCellAction, NotebookMultiCellAction, executeNotebookCondition, findTargetCellEditor } from './coreActions.js';
import { NotebookChangeTabDisplaySize, NotebookIndentUsingSpaces, NotebookIndentUsingTabs, NotebookIndentationToSpacesAction, NotebookIndentationToTabsAction } from './notebookIndentationActions.js';
import { CHANGE_CELL_LANGUAGE, CellEditState, DETECT_CELL_LANGUAGE, QUIT_EDIT_CELL_COMMAND_ID, getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import * as icons from '../notebookIcons.js';
import { CellKind, NotebookCellExecutionState, NotebookSetting } from '../../common/notebookCommon.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_IS_FIRST_OUTPUT, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_TYPE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_HAS_OUTPUTS, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_OUTPUT_FOCUSED, NOTEBOOK_OUTPUT_INPUT_FOCUSED, NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON } from '../../common/notebookContextKeys.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { NotebookInlineVariablesController } from '../contrib/notebookVariables/notebookInlineVariables.js';
const CLEAR_ALL_CELLS_OUTPUTS_COMMAND_ID = 'notebook.clearAllCellsOutputs';
const EDIT_CELL_COMMAND_ID = 'notebook.cell.edit';
const DELETE_CELL_COMMAND_ID = 'notebook.cell.delete';
export const CLEAR_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.clearOutputs';
export const SELECT_NOTEBOOK_INDENTATION_ID = 'notebook.selectIndentation';
export const COMMENT_SELECTED_CELLS_ID = 'notebook.commentSelectedCells';
registerAction2(class EditCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: EDIT_CELL_COMMAND_ID,
            title: localize('notebookActions.editCell', "Edit Cell"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), EditorContextKeys.hoverFocused.toNegated(), NOTEBOOK_OUTPUT_INPUT_FOCUSED.toNegated()),
                primary: 3 /* KeyCode.Enter */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.toNegated(), NOTEBOOK_CELL_EDITABLE),
                order: 1 /* CellToolbarOrder.EditCell */,
                group: CELL_TITLE_CELL_GROUP_ID
            },
            icon: icons.editIcon,
        });
    }
    async runWithContext(accessor, context) {
        if (!context.notebookEditor.hasModel()) {
            return;
        }
        await context.notebookEditor.focusNotebookCell(context.cell, 'editor');
        const foundEditor = context.cell ? findTargetCellEditor(context, context.cell) : undefined;
        if (foundEditor && foundEditor.hasTextFocus() && InlineChatController.get(foundEditor)?.getWidgetPosition()?.lineNumber === foundEditor.getPosition()?.lineNumber) {
            InlineChatController.get(foundEditor)?.focus();
        }
    }
});
const quitEditCondition = ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext, CTX_INLINE_CHAT_FOCUSED.toNegated());
registerAction2(class QuitEditCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: QUIT_EDIT_CELL_COMMAND_ID,
            title: localize('notebookActions.quitEdit', "Stop Editing Cell"),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_EDITABLE),
                order: 4 /* CellToolbarOrder.SaveCell */,
                group: CELL_TITLE_CELL_GROUP_ID
            },
            icon: icons.stopEditIcon,
            keybinding: [
                {
                    when: ContextKeyExpr.and(quitEditCondition, EditorContextKeys.hoverVisible.toNegated(), EditorContextKeys.hasNonEmptySelection.toNegated(), EditorContextKeys.hasMultipleSelections.toNegated()),
                    primary: 9 /* KeyCode.Escape */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT - 5
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
                    primary: 9 /* KeyCode.Escape */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5
                },
                {
                    when: ContextKeyExpr.and(quitEditCondition, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
                    win: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */
                    },
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT - 5
                },
            ]
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell.cellKind === CellKind.Markup) {
            context.cell.updateEditState(CellEditState.Preview, QUIT_EDIT_CELL_COMMAND_ID);
        }
        await context.notebookEditor.focusNotebookCell(context.cell, 'container', { skipReveal: true });
    }
});
registerAction2(class DeleteCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: DELETE_CELL_COMMAND_ID,
            title: localize('notebookActions.deleteCell', "Delete Cell"),
            keybinding: {
                primary: 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */
                },
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_OUTPUT_INPUT_FOCUSED.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: [
                {
                    id: MenuId.NotebookCellDelete,
                    when: NOTEBOOK_EDITOR_EDITABLE,
                    group: CELL_TITLE_CELL_GROUP_ID
                },
                {
                    id: MenuId.InteractiveCellDelete,
                    group: CELL_TITLE_CELL_GROUP_ID
                }
            ],
            icon: icons.deleteCellIcon
        });
    }
    async runWithContext(accessor, context) {
        if (!context.notebookEditor.hasModel()) {
            return;
        }
        let confirmation;
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const runState = notebookExecutionStateService.getCellExecution(context.cell.uri)?.state;
        const configService = accessor.get(IConfigurationService);
        if (runState === NotebookCellExecutionState.Executing && configService.getValue(NotebookSetting.confirmDeleteRunningCell)) {
            const dialogService = accessor.get(IDialogService);
            const primaryButton = localize('confirmDeleteButton', "Delete");
            confirmation = await dialogService.confirm({
                type: 'question',
                message: localize('confirmDeleteButtonMessage', "This cell is running, are you sure you want to delete it?"),
                primaryButton: primaryButton,
                checkbox: {
                    label: localize('doNotAskAgain', "Do not ask me again")
                }
            });
        }
        else {
            confirmation = { confirmed: true };
        }
        if (!confirmation.confirmed) {
            return;
        }
        if (confirmation.checkboxChecked === true) {
            await configService.updateValue(NotebookSetting.confirmDeleteRunningCell, false);
        }
        runDeleteAction(context.notebookEditor, context.cell);
    }
});
registerAction2(class ClearCellOutputsAction extends NotebookCellAction {
    constructor() {
        super({
            id: CLEAR_CELL_OUTPUTS_COMMAND_ID,
            title: localize('clearCellOutputs', 'Clear Cell Outputs'),
            menu: [
                {
                    id: MenuId.NotebookCellTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('code'), executeNotebookCondition, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON.toNegated()),
                    order: 6 /* CellToolbarOrder.ClearCellOutput */,
                    group: CELL_TITLE_OUTPUT_GROUP_ID
                },
                {
                    id: MenuId.NotebookOutputToolbar,
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_IS_FIRST_OUTPUT, NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON)
                },
            ],
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
                primary: 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            icon: icons.clearIcon
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const editor = context.notebookEditor;
        if (!editor.hasModel() || !editor.textModel.length) {
            return;
        }
        const cell = context.cell;
        const index = editor.textModel.cells.indexOf(cell.model);
        if (index < 0) {
            return;
        }
        const computeUndoRedo = !editor.isReadOnly;
        editor.textModel.applyEdits([{ editType: 2 /* CellEditType.Output */, index, outputs: [] }], true, undefined, () => undefined, undefined, computeUndoRedo);
        const runState = notebookExecutionStateService.getCellExecution(context.cell.uri)?.state;
        if (runState !== NotebookCellExecutionState.Executing) {
            context.notebookEditor.textModel.applyEdits([{
                    editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: {
                        runStartTime: null,
                        runStartTimeAdjustment: null,
                        runEndTime: null,
                        executionOrder: null,
                        lastRunSuccess: null
                    }
                }], true, undefined, () => undefined, undefined, computeUndoRedo);
        }
    }
});
registerAction2(class ClearAllCellOutputsAction extends NotebookAction {
    constructor() {
        super({
            id: CLEAR_ALL_CELLS_OUTPUTS_COMMAND_ID,
            title: localize('clearAllCellsOutputs', 'Clear All Outputs'),
            precondition: NOTEBOOK_HAS_OUTPUTS,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: 0
                },
                {
                    id: MenuId.NotebookToolbar,
                    when: ContextKeyExpr.and(executeNotebookCondition, ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                    group: 'navigation/execute',
                    order: 10
                }
            ],
            icon: icons.clearIcon
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const editor = context.notebookEditor;
        if (!editor.hasModel() || !editor.textModel.length) {
            return;
        }
        const computeUndoRedo = !editor.isReadOnly;
        editor.textModel.applyEdits(editor.textModel.cells.map((cell, index) => ({
            editType: 2 /* CellEditType.Output */, index, outputs: []
        })), true, undefined, () => undefined, undefined, computeUndoRedo);
        const clearExecutionMetadataEdits = editor.textModel.cells.map((cell, index) => {
            const runState = notebookExecutionStateService.getCellExecution(cell.uri)?.state;
            if (runState !== NotebookCellExecutionState.Executing) {
                return {
                    editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: {
                        runStartTime: null,
                        runStartTimeAdjustment: null,
                        runEndTime: null,
                        executionOrder: null,
                        lastRunSuccess: null
                    }
                };
            }
            else {
                return undefined;
            }
        }).filter(edit => !!edit);
        if (clearExecutionMetadataEdits.length) {
            context.notebookEditor.textModel.applyEdits(clearExecutionMetadataEdits, true, undefined, () => undefined, undefined, computeUndoRedo);
        }
        const controller = editor.getContribution(NotebookInlineVariablesController.id);
        controller.clearNotebookInlineDecorations();
    }
});
registerAction2(class ChangeCellLanguageAction extends NotebookCellAction {
    constructor() {
        super({
            id: CHANGE_CELL_LANGUAGE,
            title: localize('changeLanguage', 'Change Cell Language'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 43 /* KeyCode.KeyM */),
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE)
            },
            metadata: {
                description: localize('changeLanguage', 'Change Cell Language'),
                args: [
                    {
                        name: 'range',
                        description: 'The cell range',
                        schema: {
                            'type': 'object',
                            'required': ['start', 'end'],
                            'properties': {
                                'start': {
                                    'type': 'number'
                                },
                                'end': {
                                    'type': 'number'
                                }
                            }
                        }
                    },
                    {
                        name: 'language',
                        description: 'The target cell language',
                        schema: {
                            'type': 'string'
                        }
                    }
                ]
            }
        });
    }
    getCellContextFromArgs(accessor, context, ...additionalArgs) {
        if (!context || typeof context.start !== 'number' || typeof context.end !== 'number' || context.start >= context.end) {
            return;
        }
        const language = additionalArgs.length && typeof additionalArgs[0] === 'string' ? additionalArgs[0] : undefined;
        const activeEditorContext = this.getEditorContextFromArgsOrActive(accessor);
        if (!activeEditorContext || !activeEditorContext.notebookEditor.hasModel() || context.start >= activeEditorContext.notebookEditor.getLength()) {
            return;
        }
        // TODO@rebornix, support multiple cells
        return {
            notebookEditor: activeEditorContext.notebookEditor,
            cell: activeEditorContext.notebookEditor.cellAt(context.start),
            language
        };
    }
    async runWithContext(accessor, context) {
        if (context.language) {
            await this.setLanguage(context, context.language);
        }
        else {
            await this.showLanguagePicker(accessor, context);
        }
    }
    async showLanguagePicker(accessor, context) {
        const topItems = [];
        const mainItems = [];
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const quickInputService = accessor.get(IQuickInputService);
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const kernelService = accessor.get(INotebookKernelService);
        let languages = context.notebookEditor.activeKernel?.supportedLanguages;
        if (!languages) {
            const matchResult = kernelService.getMatchingKernel(context.notebookEditor.textModel);
            const allSupportedLanguages = matchResult.all.flatMap(kernel => kernel.supportedLanguages);
            languages = allSupportedLanguages.length > 0 ? allSupportedLanguages : languageService.getRegisteredLanguageIds();
        }
        const providerLanguages = new Set([
            ...languages,
            'markdown'
        ]);
        providerLanguages.forEach(languageId => {
            let description;
            if (context.cell.cellKind === CellKind.Markup ? (languageId === 'markdown') : (languageId === context.cell.language)) {
                description = localize('languageDescription', "({0}) - Current Language", languageId);
            }
            else {
                description = localize('languageDescriptionConfigured', "({0})", languageId);
            }
            const languageName = languageService.getLanguageName(languageId);
            if (!languageName) {
                // Notebook has unrecognized language
                return;
            }
            const item = {
                label: languageName,
                iconClasses: getIconClasses(modelService, languageService, this.getFakeResource(languageName, languageService)),
                description,
                languageId
            };
            if (languageId === 'markdown' || languageId === context.cell.language) {
                topItems.push(item);
            }
            else {
                mainItems.push(item);
            }
        });
        mainItems.sort((a, b) => {
            return a.description.localeCompare(b.description);
        });
        // Offer to "Auto Detect"
        const autoDetectMode = {
            label: localize('autoDetect', "Auto Detect")
        };
        const picks = [
            autoDetectMode,
            { type: 'separator', label: localize('languagesPicks', "languages (identifier)") },
            ...topItems,
            { type: 'separator' },
            ...mainItems
        ];
        const selection = await quickInputService.pick(picks, { placeHolder: localize('pickLanguageToConfigure', "Select Language Mode") });
        const languageId = selection === autoDetectMode
            ? await languageDetectionService.detectLanguage(context.cell.uri)
            : selection?.languageId;
        if (languageId) {
            await this.setLanguage(context, languageId);
        }
    }
    async setLanguage(context, languageId) {
        await setCellToLanguage(languageId, context);
    }
    /**
     * Copied from editorStatus.ts
     */
    getFakeResource(lang, languageService) {
        let fakeResource;
        const languageId = languageService.getLanguageIdByLanguageName(lang);
        if (languageId) {
            const extensions = languageService.getExtensions(languageId);
            if (extensions.length) {
                fakeResource = URI.file(extensions[0]);
            }
            else {
                const filenames = languageService.getFilenames(languageId);
                if (filenames.length) {
                    fakeResource = URI.file(filenames[0]);
                }
            }
        }
        return fakeResource;
    }
});
registerAction2(class DetectCellLanguageAction extends NotebookCellAction {
    constructor() {
        super({
            id: DETECT_CELL_LANGUAGE,
            title: localize2('detectLanguage', "Accept Detected Language for Cell"),
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
            keybinding: { primary: 34 /* KeyCode.KeyD */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */, weight: 200 /* KeybindingWeight.WorkbenchContrib */ }
        });
    }
    async runWithContext(accessor, context) {
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const notificationService = accessor.get(INotificationService);
        const kernelService = accessor.get(INotebookKernelService);
        const kernel = kernelService.getSelectedOrSuggestedKernel(context.notebookEditor.textModel);
        const providerLanguages = [...kernel?.supportedLanguages ?? []];
        providerLanguages.push('markdown');
        const detection = await languageDetectionService.detectLanguage(context.cell.uri, providerLanguages);
        if (detection) {
            setCellToLanguage(detection, context);
        }
        else {
            notificationService.warn(localize('noDetection', "Unable to detect cell language"));
        }
    }
});
async function setCellToLanguage(languageId, context) {
    if (languageId === 'markdown' && context.cell?.language !== 'markdown') {
        const idx = context.notebookEditor.getCellIndex(context.cell);
        await changeCellToKind(CellKind.Markup, { cell: context.cell, notebookEditor: context.notebookEditor, ui: true }, 'markdown', Mimes.markdown);
        const newCell = context.notebookEditor.cellAt(idx);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, 'editor');
        }
    }
    else if (languageId !== 'markdown' && context.cell?.cellKind === CellKind.Markup) {
        await changeCellToKind(CellKind.Code, { cell: context.cell, notebookEditor: context.notebookEditor, ui: true }, languageId);
    }
    else {
        const index = context.notebookEditor.textModel.cells.indexOf(context.cell.model);
        context.notebookEditor.textModel.applyEdits([{ editType: 4 /* CellEditType.CellLanguage */, index, language: languageId }], true, undefined, () => undefined, undefined, !context.notebookEditor.isReadOnly);
    }
}
registerAction2(class SelectNotebookIndentation extends NotebookAction {
    constructor() {
        super({
            id: SELECT_NOTEBOOK_INDENTATION_ID,
            title: localize2('selectNotebookIndentation', 'Select Indentation'),
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
        });
    }
    async runWithContext(accessor, context) {
        await this.showNotebookIndentationPicker(accessor, context);
    }
    async showNotebookIndentationPicker(accessor, context) {
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const activeNotebook = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!activeNotebook || activeNotebook.isDisposed) {
            return quickInputService.pick([{ label: localize('noNotebookEditor', "No notebook editor active at this time") }]);
        }
        if (activeNotebook.isReadOnly) {
            return quickInputService.pick([{ label: localize('noWritableCodeEditor', "The active notebook editor is read-only.") }]);
        }
        const picks = [
            new NotebookIndentUsingTabs(), // indent using tabs
            new NotebookIndentUsingSpaces(), // indent using spaces
            new NotebookChangeTabDisplaySize(), // change tab size
            new NotebookIndentationToTabsAction(), // convert indentation to tabs
            new NotebookIndentationToSpacesAction() // convert indentation to spaces
        ].map(item => {
            return {
                id: item.desc.id,
                label: item.desc.title.toString(),
                run: () => {
                    instantiationService.invokeFunction(item.run);
                }
            };
        });
        picks.splice(3, 0, { type: 'separator', label: localize('indentConvert', "convert file") });
        picks.unshift({ type: 'separator', label: localize('indentView', "change view") });
        const action = await quickInputService.pick(picks, { placeHolder: localize('pickAction', "Select Action"), matchOnDetail: true });
        if (!action) {
            return;
        }
        action.run();
        context.notebookEditor.focus();
        return;
    }
});
registerAction2(class CommentSelectedCellsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COMMENT_SELECTED_CELLS_ID,
            title: localize('commentSelectedCells', "Comment Selected Cells"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        context.selectedCells.forEach(async (cellViewModel) => {
            const textModel = await cellViewModel.resolveTextModel();
            const commentsOptions = cellViewModel.commentOptions;
            const cellCommentCommand = new LineCommentCommand(languageConfigurationService, new Selection(1, 1, textModel.getLineCount(), textModel.getLineMaxColumn(textModel.getLineCount())), // comment the entire cell
            textModel.getOptions().tabSize, 0 /* Type.Toggle */, commentsOptions.insertSpace ?? true, commentsOptions.ignoreEmptyLines ?? true, false);
            // store any selections that are in the cell, allows them to be shifted by comments and preserved
            const cellEditorSelections = cellViewModel.getSelections();
            const initialTrackedRangesIDs = cellEditorSelections.map(selection => {
                return textModel._setTrackedRange(null, selection, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
            });
            CommandExecutor.executeCommands(textModel, cellEditorSelections, [cellCommentCommand]);
            const newTrackedSelections = initialTrackedRangesIDs.map(i => {
                return textModel._getTrackedRange(i);
            }).filter(r => !!r).map((range) => {
                return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
            });
            cellViewModel.setSelections(newTrackedSelections ?? []);
        }); // end of cells forEach
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2VkaXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0sd0NBQXdDLENBQUM7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRXhILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFRLE1BQU0scUVBQXFFLENBQUM7QUFDL0csT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFB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
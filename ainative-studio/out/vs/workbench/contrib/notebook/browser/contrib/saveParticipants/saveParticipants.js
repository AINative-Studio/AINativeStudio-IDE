/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { HierarchicalKind } from '../../../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../../../editor/browser/services/bulkEditService.js';
import { trimTrailingWhitespace } from '../../../../../../editor/common/commands/trimTrailingWhitespaceCommand.js';
import { Position } from '../../../../../../editor/common/core/position.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
import { ApplyCodeActionReason, applyCodeAction, getCodeActions } from '../../../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind, CodeActionTriggerSource } from '../../../../../../editor/contrib/codeAction/common/types.js';
import { getDocumentFormattingEditsWithSelectedProvider } from '../../../../../../editor/contrib/format/browser/format.js';
import { SnippetController2 } from '../../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { IWorkspaceTrustManagementService } from '../../../../../../platform/workspace/common/workspaceTrust.js';
import { Extensions as WorkbenchContributionsExtensions } from '../../../../../common/contributions.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { NotebookFileWorkingCopyModel } from '../../../common/notebookEditorModel.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IWorkingCopyFileService } from '../../../../../services/workingCopy/common/workingCopyFileService.js';
import { NotebookMultiCursorController, NotebookMultiCursorState } from '../multicursor/notebookMulticursor.js';
export class NotebookSaveParticipant {
    constructor(_editorService) {
        this._editorService = _editorService;
    }
    canParticipate() {
        const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        const controller = editor?.getContribution(NotebookMultiCursorController.id);
        if (!controller) {
            return true;
        }
        return controller.getState() !== NotebookMultiCursorState.Editing;
    }
}
let FormatOnSaveParticipant = class FormatOnSaveParticipant {
    constructor(editorWorkerService, languageFeaturesService, instantiationService, textModelService, bulkEditService, configurationService) {
        this.editorWorkerService = editorWorkerService;
        this.languageFeaturesService = languageFeaturesService;
        this.instantiationService = instantiationService;
        this.textModelService = textModelService;
        this.bulkEditService = bulkEditService;
        this.configurationService = configurationService;
    }
    async participate(workingCopy, context, progress, token) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        if (context.reason === 2 /* SaveReason.AUTO */) {
            return undefined;
        }
        const enabled = this.configurationService.getValue(NotebookSetting.formatOnSave);
        if (!enabled) {
            return undefined;
        }
        progress.report({ message: localize('notebookFormatSave.formatting', "Formatting") });
        const notebook = workingCopy.model.notebookModel;
        const formatApplied = await this.instantiationService.invokeFunction(CodeActionParticipantUtils.checkAndRunFormatCodeAction, notebook, progress, token);
        const disposable = new DisposableStore();
        try {
            if (!formatApplied) {
                const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                    const ref = await this.textModelService.createModelReference(cell.uri);
                    disposable.add(ref);
                    const model = ref.object.textEditorModel;
                    const formatEdits = await getDocumentFormattingEditsWithSelectedProvider(this.editorWorkerService, this.languageFeaturesService, model, 2 /* FormattingMode.Silent */, token);
                    const edits = [];
                    if (formatEdits) {
                        edits.push(...formatEdits.map(edit => new ResourceTextEdit(model.uri, edit, model.getVersionId())));
                        return edits;
                    }
                    return [];
                }));
                await this.bulkEditService.apply(/* edit */ allCellEdits.flat(), { label: localize('formatNotebook', "Format Notebook"), code: 'undoredo.formatNotebook', });
            }
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
FormatOnSaveParticipant = __decorate([
    __param(0, IEditorWorkerService),
    __param(1, ILanguageFeaturesService),
    __param(2, IInstantiationService),
    __param(3, ITextModelService),
    __param(4, IBulkEditService),
    __param(5, IConfigurationService)
], FormatOnSaveParticipant);
let TrimWhitespaceParticipant = class TrimWhitespaceParticipant extends NotebookSaveParticipant {
    constructor(configurationService, editorService, textModelService, bulkEditService) {
        super(editorService);
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.textModelService = textModelService;
        this.bulkEditService = bulkEditService;
    }
    async participate(workingCopy, context, progress, _token) {
        const trimTrailingWhitespaceOption = this.configurationService.getValue('files.trimTrailingWhitespace');
        const trimInRegexAndStrings = this.configurationService.getValue('files.trimTrailingWhitespaceInRegexAndStrings');
        if (trimTrailingWhitespaceOption && this.canParticipate()) {
            await this.doTrimTrailingWhitespace(workingCopy, context.reason === 2 /* SaveReason.AUTO */, trimInRegexAndStrings, progress);
        }
    }
    async doTrimTrailingWhitespace(workingCopy, isAutoSaved, trimInRegexesAndStrings, progress) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        const disposable = new DisposableStore();
        const notebook = workingCopy.model.notebookModel;
        const activeCellEditor = getActiveCellCodeEditor(this.editorService);
        let cursors = [];
        let prevSelection = [];
        try {
            const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                if (cell.cellKind !== CellKind.Code) {
                    return [];
                }
                const ref = await this.textModelService.createModelReference(cell.uri);
                disposable.add(ref);
                const model = ref.object.textEditorModel;
                const isActiveCell = (activeCellEditor && cell.uri.toString() === activeCellEditor.getModel()?.uri.toString());
                if (isActiveCell) {
                    prevSelection = activeCellEditor.getSelections() ?? [];
                    if (isAutoSaved) {
                        cursors = prevSelection.map(s => s.getPosition()); // get initial cursor positions
                        const snippetsRange = SnippetController2.get(activeCellEditor)?.getSessionEnclosingRange();
                        if (snippetsRange) {
                            for (let lineNumber = snippetsRange.startLineNumber; lineNumber <= snippetsRange.endLineNumber; lineNumber++) {
                                cursors.push(new Position(lineNumber, model.getLineMaxColumn(lineNumber)));
                            }
                        }
                    }
                }
                const ops = trimTrailingWhitespace(model, cursors, trimInRegexesAndStrings);
                if (!ops.length) {
                    return []; // Nothing to do
                }
                return ops.map(op => new ResourceTextEdit(model.uri, { ...op, text: op.text || '' }, model.getVersionId()));
            }));
            const filteredEdits = allCellEdits.flat().filter(edit => edit !== undefined);
            await this.bulkEditService.apply(filteredEdits, { label: localize('trimNotebookWhitespace', "Notebook Trim Trailing Whitespace"), code: 'undoredo.notebookTrimTrailingWhitespace' });
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
TrimWhitespaceParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, ITextModelService),
    __param(3, IBulkEditService)
], TrimWhitespaceParticipant);
let TrimFinalNewLinesParticipant = class TrimFinalNewLinesParticipant extends NotebookSaveParticipant {
    constructor(configurationService, editorService, bulkEditService) {
        super(editorService);
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.bulkEditService = bulkEditService;
    }
    async participate(workingCopy, context, progress, _token) {
        if (this.configurationService.getValue('files.trimFinalNewlines') && this.canParticipate()) {
            await this.doTrimFinalNewLines(workingCopy, context.reason === 2 /* SaveReason.AUTO */, progress);
        }
    }
    /**
     * returns 0 if the entire file is empty
     */
    findLastNonEmptyLine(textBuffer) {
        for (let lineNumber = textBuffer.getLineCount(); lineNumber >= 1; lineNumber--) {
            const lineLength = textBuffer.getLineLength(lineNumber);
            if (lineLength) {
                // this line has content
                return lineNumber;
            }
        }
        // no line has content
        return 0;
    }
    async doTrimFinalNewLines(workingCopy, isAutoSaved, progress) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        const disposable = new DisposableStore();
        const notebook = workingCopy.model.notebookModel;
        const activeCellEditor = getActiveCellCodeEditor(this.editorService);
        try {
            const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                if (cell.cellKind !== CellKind.Code) {
                    return;
                }
                // autosave -- don't trim every trailing line, just up to the cursor line
                let cannotTouchLineNumber = 0;
                const isActiveCell = (activeCellEditor && cell.uri.toString() === activeCellEditor.getModel()?.uri.toString());
                if (isAutoSaved && isActiveCell) {
                    const selections = activeCellEditor.getSelections() ?? [];
                    for (const sel of selections) {
                        cannotTouchLineNumber = Math.max(cannotTouchLineNumber, sel.selectionStartLineNumber);
                    }
                }
                const textBuffer = cell.textBuffer;
                const lastNonEmptyLine = this.findLastNonEmptyLine(textBuffer);
                const deleteFromLineNumber = Math.max(lastNonEmptyLine + 1, cannotTouchLineNumber + 1);
                if (deleteFromLineNumber > textBuffer.getLineCount()) {
                    return;
                }
                const deletionRange = new Range(deleteFromLineNumber, 1, textBuffer.getLineCount(), textBuffer.getLineLastNonWhitespaceColumn(textBuffer.getLineCount()));
                if (deletionRange.isEmpty()) {
                    return;
                }
                // create the edit to delete all lines in deletionRange
                return new ResourceTextEdit(cell.uri, { range: deletionRange, text: '' }, cell.textModel?.getVersionId());
            }));
            const filteredEdits = allCellEdits.flat().filter(edit => edit !== undefined);
            await this.bulkEditService.apply(filteredEdits, { label: localize('trimNotebookNewlines', "Trim Final New Lines"), code: 'undoredo.trimFinalNewLines' });
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
TrimFinalNewLinesParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, IBulkEditService)
], TrimFinalNewLinesParticipant);
let InsertFinalNewLineParticipant = class InsertFinalNewLineParticipant extends NotebookSaveParticipant {
    constructor(configurationService, bulkEditService, editorService) {
        super(editorService);
        this.configurationService = configurationService;
        this.bulkEditService = bulkEditService;
        this.editorService = editorService;
    }
    async participate(workingCopy, context, progress, _token) {
        // waiting on notebook-specific override before this feature can sync with 'files.insertFinalNewline'
        // if (this.configurationService.getValue('files.insertFinalNewline')) {
        if (this.configurationService.getValue(NotebookSetting.insertFinalNewline) && this.canParticipate()) {
            await this.doInsertFinalNewLine(workingCopy, context.reason === 2 /* SaveReason.AUTO */, progress);
        }
    }
    async doInsertFinalNewLine(workingCopy, isAutoSaved, progress) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        const disposable = new DisposableStore();
        const notebook = workingCopy.model.notebookModel;
        // get initial cursor positions
        const activeCellEditor = getActiveCellCodeEditor(this.editorService);
        let selections;
        if (activeCellEditor) {
            selections = activeCellEditor.getSelections() ?? [];
        }
        try {
            const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                if (cell.cellKind !== CellKind.Code) {
                    return;
                }
                const lineCount = cell.textBuffer.getLineCount();
                const lastLineIsEmptyOrWhitespace = cell.textBuffer.getLineFirstNonWhitespaceColumn(lineCount) === 0;
                if (!lineCount || lastLineIsEmptyOrWhitespace) {
                    return;
                }
                return new ResourceTextEdit(cell.uri, { range: new Range(lineCount + 1, cell.textBuffer.getLineLength(lineCount), lineCount + 1, cell.textBuffer.getLineLength(lineCount)), text: cell.textBuffer.getEOL() }, cell.textModel?.getVersionId());
            }));
            const filteredEdits = allCellEdits.filter(edit => edit !== undefined);
            await this.bulkEditService.apply(filteredEdits, { label: localize('insertFinalNewLine', "Insert Final New Line"), code: 'undoredo.insertFinalNewLine' });
            // set cursor back to initial position after inserting final new line
            if (activeCellEditor && selections) {
                activeCellEditor.setSelections(selections);
            }
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
InsertFinalNewLineParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IBulkEditService),
    __param(2, IEditorService)
], InsertFinalNewLineParticipant);
let CodeActionOnSaveParticipant = class CodeActionOnSaveParticipant {
    constructor(configurationService, logService, workspaceTrustManagementService, textModelService, instantiationService) {
        this.configurationService = configurationService;
        this.logService = logService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.textModelService = textModelService;
        this.instantiationService = instantiationService;
    }
    async participate(workingCopy, context, progress, token) {
        const isTrusted = this.workspaceTrustManagementService.isWorkspaceTrusted();
        if (!isTrusted) {
            return;
        }
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        let saveTrigger = '';
        if (context.reason === 2 /* SaveReason.AUTO */) {
            // currently this won't happen, as vs/editor/contrib/codeAction/browser/codeAction.ts L#104 filters out codeactions on autosave. Just future-proofing
            // ? notebook CodeActions on autosave seems dangerous (perf-wise)
            // saveTrigger = 'always'; // TODO@Yoyokrazy, support during debt
            return undefined;
        }
        else if (context.reason === 1 /* SaveReason.EXPLICIT */) {
            saveTrigger = 'explicit';
        }
        else {
            // 	SaveReason.FOCUS_CHANGE, WINDOW_CHANGE need to be addressed when autosaves are enabled
            return undefined;
        }
        const notebookModel = workingCopy.model.notebookModel;
        const setting = this.configurationService.getValue(NotebookSetting.codeActionsOnSave);
        const settingItems = Array.isArray(setting)
            ? setting
            : Object.keys(setting).filter(x => setting[x]);
        const allCodeActions = this.createCodeActionsOnSave(settingItems);
        const excludedActions = allCodeActions
            .filter(x => setting[x.value] === 'never' || setting[x.value] === false);
        const includedActions = allCodeActions
            .filter(x => setting[x.value] === saveTrigger || setting[x.value] === true);
        const editorCodeActionsOnSave = includedActions.filter(x => !CodeActionKind.Notebook.contains(x));
        const notebookCodeActionsOnSave = includedActions.filter(x => CodeActionKind.Notebook.contains(x));
        // run notebook code actions
        if (notebookCodeActionsOnSave.length) {
            const nbDisposable = new DisposableStore();
            progress.report({ message: localize('notebookSaveParticipants.notebookCodeActions', "Running 'Notebook' code actions") });
            try {
                const cell = notebookModel.cells[0];
                const ref = await this.textModelService.createModelReference(cell.uri);
                nbDisposable.add(ref);
                const textEditorModel = ref.object.textEditorModel;
                await this.instantiationService.invokeFunction(CodeActionParticipantUtils.applyOnSaveGenericCodeActions, textEditorModel, notebookCodeActionsOnSave, excludedActions, progress, token);
            }
            catch {
                this.logService.error('Failed to apply notebook code action on save');
            }
            finally {
                progress.report({ increment: 100 });
                nbDisposable.dispose();
            }
        }
        // run cell level code actions
        if (editorCodeActionsOnSave.length) {
            // prioritize `source.fixAll` code actions
            if (!Array.isArray(setting)) {
                editorCodeActionsOnSave.sort((a, b) => {
                    if (CodeActionKind.SourceFixAll.contains(a)) {
                        if (CodeActionKind.SourceFixAll.contains(b)) {
                            return 0;
                        }
                        return -1;
                    }
                    if (CodeActionKind.SourceFixAll.contains(b)) {
                        return 1;
                    }
                    return 0;
                });
            }
            const cellDisposable = new DisposableStore();
            progress.report({ message: localize('notebookSaveParticipants.cellCodeActions', "Running 'Cell' code actions") });
            try {
                await Promise.all(notebookModel.cells.map(async (cell) => {
                    const ref = await this.textModelService.createModelReference(cell.uri);
                    cellDisposable.add(ref);
                    const textEditorModel = ref.object.textEditorModel;
                    await this.instantiationService.invokeFunction(CodeActionParticipantUtils.applyOnSaveGenericCodeActions, textEditorModel, editorCodeActionsOnSave, excludedActions, progress, token);
                }));
            }
            catch {
                this.logService.error('Failed to apply code action on save');
            }
            finally {
                progress.report({ increment: 100 });
                cellDisposable.dispose();
            }
        }
    }
    createCodeActionsOnSave(settingItems) {
        const kinds = settingItems.map(x => new HierarchicalKind(x));
        // Remove subsets
        return kinds.filter(kind => {
            return kinds.every(otherKind => otherKind.equals(kind) || !otherKind.contains(kind));
        });
    }
};
CodeActionOnSaveParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ILogService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, ITextModelService),
    __param(4, IInstantiationService)
], CodeActionOnSaveParticipant);
export class CodeActionParticipantUtils {
    static async checkAndRunFormatCodeAction(accessor, notebookModel, progress, token) {
        const instantiationService = accessor.get(IInstantiationService);
        const textModelService = accessor.get(ITextModelService);
        const logService = accessor.get(ILogService);
        const configurationService = accessor.get(IConfigurationService);
        const formatDisposable = new DisposableStore();
        let formatResult = false;
        progress.report({ message: localize('notebookSaveParticipants.formatCodeActions', "Running 'Format' code actions") });
        try {
            const cell = notebookModel.cells[0];
            const ref = await textModelService.createModelReference(cell.uri);
            formatDisposable.add(ref);
            const textEditorModel = ref.object.textEditorModel;
            const defaultFormatterExtId = configurationService.getValue(NotebookSetting.defaultFormatter);
            formatResult = await instantiationService.invokeFunction(CodeActionParticipantUtils.applyOnSaveFormatCodeAction, textEditorModel, new HierarchicalKind('notebook.format'), [], defaultFormatterExtId, progress, token);
        }
        catch {
            logService.error('Failed to apply notebook format action on save');
        }
        finally {
            progress.report({ increment: 100 });
            formatDisposable.dispose();
        }
        return formatResult;
    }
    static async applyOnSaveGenericCodeActions(accessor, model, codeActionsOnSave, excludes, progress, token) {
        const instantiationService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const logService = accessor.get(ILogService);
        const getActionProgress = new class {
            constructor() {
                this._names = new Set();
            }
            _report() {
                progress.report({
                    message: localize({ key: 'codeaction.get2', comment: ['[configure]({1}) is a link. Only translate `configure`. Do not change brackets and parentheses or {1}'] }, "Getting code actions from '{0}' ([configure]({1})).", [...this._names].map(name => `'${name}'`).join(', '), 'command:workbench.action.openSettings?%5B%22notebook.codeActionsOnSave%22%5D')
                });
            }
            report(provider) {
                if (provider.displayName && !this._names.has(provider.displayName)) {
                    this._names.add(provider.displayName);
                    this._report();
                }
            }
        };
        for (const codeActionKind of codeActionsOnSave) {
            const actionsToRun = await CodeActionParticipantUtils.getActionsToRun(model, codeActionKind, excludes, languageFeaturesService, getActionProgress, token);
            if (token.isCancellationRequested) {
                actionsToRun.dispose();
                return;
            }
            try {
                for (const action of actionsToRun.validActions) {
                    const codeActionEdits = action.action.edit?.edits;
                    let breakFlag = false;
                    if (!action.action.kind?.startsWith('notebook')) {
                        for (const edit of codeActionEdits ?? []) {
                            const workspaceTextEdit = edit;
                            if (workspaceTextEdit.resource && isEqual(workspaceTextEdit.resource, model.uri)) {
                                continue;
                            }
                            else {
                                // error -> applied to multiple resources
                                breakFlag = true;
                                break;
                            }
                        }
                    }
                    if (breakFlag) {
                        logService.warn('Failed to apply code action on save, applied to multiple resources.');
                        continue;
                    }
                    progress.report({ message: localize('codeAction.apply', "Applying code action '{0}'.", action.action.title) });
                    await instantiationService.invokeFunction(applyCodeAction, action, ApplyCodeActionReason.OnSave, {}, token);
                    if (token.isCancellationRequested) {
                        return;
                    }
                }
            }
            catch {
                // Failure to apply a code action should not block other on save actions
            }
            finally {
                actionsToRun.dispose();
            }
        }
    }
    static async applyOnSaveFormatCodeAction(accessor, model, formatCodeActionOnSave, excludes, extensionId, progress, token) {
        const instantiationService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const logService = accessor.get(ILogService);
        const getActionProgress = new class {
            constructor() {
                this._names = new Set();
            }
            _report() {
                progress.report({
                    message: localize({ key: 'codeaction.get2', comment: ['[configure]({1}) is a link. Only translate `configure`. Do not change brackets and parentheses or {1}'] }, "Getting code actions from '{0}' ([configure]({1})).", [...this._names].map(name => `'${name}'`).join(', '), 'command:workbench.action.openSettings?%5B%22notebook.defaultFormatter%22%5D')
                });
            }
            report(provider) {
                if (provider.displayName && !this._names.has(provider.displayName)) {
                    this._names.add(provider.displayName);
                    this._report();
                }
            }
        };
        const providedActions = await CodeActionParticipantUtils.getActionsToRun(model, formatCodeActionOnSave, excludes, languageFeaturesService, getActionProgress, token);
        // warn the user if there are more than one provided format action, and there is no specified defaultFormatter
        if (providedActions.validActions.length > 1 && !extensionId) {
            logService.warn('More than one format code action is provided, the 0th one will be used. A default can be specified via `notebook.defaultFormatter` in your settings.');
        }
        if (token.isCancellationRequested) {
            providedActions.dispose();
            return false;
        }
        try {
            const action = extensionId ? providedActions.validActions.find(action => action.provider?.extensionId === extensionId) : providedActions.validActions[0];
            if (!action) {
                return false;
            }
            progress.report({ message: localize('codeAction.apply', "Applying code action '{0}'.", action.action.title) });
            await instantiationService.invokeFunction(applyCodeAction, action, ApplyCodeActionReason.OnSave, {}, token);
            if (token.isCancellationRequested) {
                return false;
            }
        }
        catch {
            logService.error('Failed to apply notebook format code action on save');
            return false;
        }
        finally {
            providedActions.dispose();
        }
        return true;
    }
    // @Yoyokrazy this could likely be modified to leverage the extensionID, therefore not getting actions from providers unnecessarily -- future work
    static getActionsToRun(model, codeActionKind, excludes, languageFeaturesService, progress, token) {
        return getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
            type: 1 /* CodeActionTriggerType.Invoke */,
            triggerAction: CodeActionTriggerSource.OnSave,
            filter: { include: codeActionKind, excludes: excludes, includeSourceActions: true },
        }, progress, token);
    }
}
function getActiveCellCodeEditor(editorService) {
    const activePane = editorService.activeEditorPane;
    const notebookEditor = getNotebookEditorFromEditorPane(activePane);
    const activeCodeEditor = notebookEditor?.activeCodeEditor;
    return activeCodeEditor;
}
let SaveParticipantsContribution = class SaveParticipantsContribution extends Disposable {
    constructor(instantiationService, workingCopyFileService) {
        super();
        this.instantiationService = instantiationService;
        this.workingCopyFileService = workingCopyFileService;
        this.registerSaveParticipants();
    }
    registerSaveParticipants() {
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(TrimWhitespaceParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(CodeActionOnSaveParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(FormatOnSaveParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(InsertFinalNewLineParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(TrimFinalNewLinesParticipant)));
    }
};
SaveParticipantsContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyFileService)
], SaveParticipantsContribution);
export { SaveParticipantsContribution };
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(SaveParticipantsContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvc2F2ZVBhcnRpY2lwYW50cy9zYXZlUGFydGljaXBhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBZ0IsZ0JBQWdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNoSSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBSXRFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDM0ksT0FBTyxFQUFrQixjQUFjLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN0SSxPQUFPLEVBQWtCLDhDQUE4QyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFD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
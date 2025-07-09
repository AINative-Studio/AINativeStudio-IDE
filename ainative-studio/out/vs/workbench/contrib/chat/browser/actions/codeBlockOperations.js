var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { isEqual } from '../../../../../base/common/resources.js';
import * as strings from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../nls.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { reviewEdits } from '../../../inlineChat/browser/inlineChatController.js';
import { insertCell } from '../../../notebook/browser/controller/cellOperations.js';
import { CellKind, NOTEBOOK_EDITOR_ID } from '../../../notebook/common/notebookCommon.js';
import { ICodeMapperService } from '../../common/chatCodeMapperService.js';
import { IChatService } from '../../common/chatService.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
let InsertCodeBlockOperation = class InsertCodeBlockOperation {
    constructor(editorService, textFileService, bulkEditService, codeEditorService, chatService, languageService, dialogService) {
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.bulkEditService = bulkEditService;
        this.codeEditorService = codeEditorService;
        this.chatService = chatService;
        this.languageService = languageService;
        this.dialogService = dialogService;
    }
    async run(context) {
        const activeEditorControl = getEditableActiveCodeEditor(this.editorService);
        if (activeEditorControl) {
            await this.handleTextEditor(activeEditorControl, context);
        }
        else {
            const activeNotebookEditor = getActiveNotebookEditor(this.editorService);
            if (activeNotebookEditor) {
                await this.handleNotebookEditor(activeNotebookEditor, context);
            }
            else {
                this.notify(localize('insertCodeBlock.noActiveEditor', "To insert the code block, open a code editor or notebook editor and set the cursor at the location where to insert the code block."));
            }
        }
        notifyUserAction(this.chatService, context, {
            kind: 'insert',
            codeBlockIndex: context.codeBlockIndex,
            totalCharacters: context.code.length
        });
    }
    async handleNotebookEditor(notebookEditor, codeBlockContext) {
        if (notebookEditor.isReadOnly) {
            this.notify(localize('insertCodeBlock.readonlyNotebook', "Cannot insert the code block to read-only notebook editor."));
            return false;
        }
        const focusRange = notebookEditor.getFocus();
        const next = Math.max(focusRange.end - 1, 0);
        insertCell(this.languageService, notebookEditor, next, CellKind.Code, 'below', codeBlockContext.code, true);
        return true;
    }
    async handleTextEditor(codeEditor, codeBlockContext) {
        const activeModel = codeEditor.getModel();
        if (isReadOnly(activeModel, this.textFileService)) {
            this.notify(localize('insertCodeBlock.readonly', "Cannot insert the code block to read-only code editor."));
            return false;
        }
        const range = codeEditor.getSelection() ?? new Range(activeModel.getLineCount(), 1, activeModel.getLineCount(), 1);
        const text = reindent(codeBlockContext.code, activeModel, range.startLineNumber);
        const edits = [new ResourceTextEdit(activeModel.uri, { range, text })];
        await this.bulkEditService.apply(edits);
        this.codeEditorService.listCodeEditors().find(editor => editor.getModel()?.uri.toString() === activeModel.uri.toString())?.focus();
        return true;
    }
    notify(message) {
        //this.notificationService.notify({ severity: Severity.Info, message });
        this.dialogService.info(message);
    }
};
InsertCodeBlockOperation = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, IBulkEditService),
    __param(3, ICodeEditorService),
    __param(4, IChatService),
    __param(5, ILanguageService),
    __param(6, IDialogService)
], InsertCodeBlockOperation);
export { InsertCodeBlockOperation };
let ApplyCodeBlockOperation = class ApplyCodeBlockOperation {
    constructor(editorService, textFileService, chatService, languageService, fileService, dialogService, logService, codeMapperService, progressService, quickInputService, labelService, instantiationService) {
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.chatService = chatService;
        this.languageService = languageService;
        this.fileService = fileService;
        this.dialogService = dialogService;
        this.logService = logService;
        this.codeMapperService = codeMapperService;
        this.progressService = progressService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
    }
    async run(context) {
        let activeEditorControl = getEditableActiveCodeEditor(this.editorService);
        const codemapperUri = await this.evaluateURIToUse(context.codemapperUri, activeEditorControl);
        if (!codemapperUri) {
            return;
        }
        if (codemapperUri && !isEqual(activeEditorControl?.getModel().uri, codemapperUri)) {
            // reveal the target file
            try {
                const editorPane = await this.editorService.openEditor({ resource: codemapperUri });
                const codeEditor = getCodeEditor(editorPane?.getControl());
                if (codeEditor && codeEditor.hasModel()) {
                    this.tryToRevealCodeBlock(codeEditor, context.code);
                    activeEditorControl = codeEditor;
                }
                else {
                    this.notify(localize('applyCodeBlock.errorOpeningFile', "Failed to open {0} in a code editor.", codemapperUri.toString()));
                    return;
                }
            }
            catch (e) {
                this.logService.info('[ApplyCodeBlockOperation] error opening code mapper file', codemapperUri, e);
                return;
            }
        }
        let result = undefined;
        if (activeEditorControl) {
            result = await this.handleTextEditor(activeEditorControl, context.code);
        }
        else {
            const activeNotebookEditor = getActiveNotebookEditor(this.editorService);
            if (activeNotebookEditor) {
                result = await this.handleNotebookEditor(activeNotebookEditor, context.code);
            }
            else {
                this.notify(localize('applyCodeBlock.noActiveEditor', "To apply this code block, open a code or notebook editor."));
            }
        }
        notifyUserAction(this.chatService, context, {
            kind: 'apply',
            codeBlockIndex: context.codeBlockIndex,
            totalCharacters: context.code.length,
            codeMapper: result?.codeMapper,
            editsProposed: !!result?.editsProposed
        });
    }
    async evaluateURIToUse(resource, activeEditorControl) {
        if (resource && await this.fileService.exists(resource)) {
            return resource;
        }
        const activeEditorOption = activeEditorControl?.getModel().uri ? { label: localize('activeEditor', "Active editor '{0}'", this.labelService.getUriLabel(activeEditorControl.getModel().uri, { relative: true })), id: 'activeEditor' } : undefined;
        const untitledEditorOption = { label: localize('newUntitledFile', "New untitled editor"), id: 'newUntitledFile' };
        const options = [];
        if (resource) {
            // code block had an URI, but it doesn't exist
            options.push({ label: localize('createFile', "New file '{0}'", this.labelService.getUriLabel(resource, { relative: true })), id: 'createFile' });
            options.push(untitledEditorOption);
            if (activeEditorOption) {
                options.push(activeEditorOption);
            }
        }
        else {
            // code block had no URI
            if (activeEditorOption) {
                options.push(activeEditorOption);
            }
            options.push(untitledEditorOption);
        }
        const selected = options.length > 1 ? await this.quickInputService.pick(options, { placeHolder: localize('selectOption', "Select where to apply the code block") }) : options[0];
        if (selected) {
            switch (selected.id) {
                case 'createFile':
                    if (resource) {
                        try {
                            await this.fileService.writeFile(resource, VSBuffer.fromString(''));
                        }
                        catch (error) {
                            this.notify(localize('applyCodeBlock.fileWriteError', "Failed to create file: {0}", error.message));
                            return URI.from({ scheme: 'untitled', path: resource.path });
                        }
                    }
                    return resource;
                case 'newUntitledFile':
                    return URI.from({ scheme: 'untitled', path: resource ? resource.path : 'Untitled-1' });
                case 'activeEditor':
                    return activeEditorControl?.getModel().uri;
            }
        }
        return undefined;
    }
    async handleNotebookEditor(notebookEditor, code) {
        if (notebookEditor.isReadOnly) {
            this.notify(localize('applyCodeBlock.readonlyNotebook', "Cannot apply code block to read-only notebook editor."));
            return undefined;
        }
        const focusRange = notebookEditor.getFocus();
        const next = Math.max(focusRange.end - 1, 0);
        insertCell(this.languageService, notebookEditor, next, CellKind.Code, 'below', code, true);
        return undefined;
    }
    async handleTextEditor(codeEditor, code) {
        const activeModel = codeEditor.getModel();
        if (isReadOnly(activeModel, this.textFileService)) {
            this.notify(localize('applyCodeBlock.readonly', "Cannot apply code block to read-only file."));
            return undefined;
        }
        const codeBlock = { code, resource: activeModel.uri, markdownBeforeBlock: undefined };
        const codeMapper = this.codeMapperService.providers[0]?.displayName;
        if (!codeMapper) {
            this.notify(localize('applyCodeBlock.noCodeMapper', "No code mapper available."));
            return undefined;
        }
        let editsProposed = false;
        const cancellationTokenSource = new CancellationTokenSource();
        try {
            const iterable = await this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */, delay: 500, sticky: true, cancellable: true }, async (progress) => {
                progress.report({ message: localize('applyCodeBlock.progress', "Applying code block using {0}...", codeMapper) });
                const editsIterable = this.getEdits(codeBlock, cancellationTokenSource.token);
                return await this.waitForFirstElement(editsIterable);
            }, () => cancellationTokenSource.cancel());
            editsProposed = await this.applyWithInlinePreview(iterable, codeEditor, cancellationTokenSource);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                this.notify(localize('applyCodeBlock.error', "Failed to apply code block: {0}", e.message));
            }
        }
        finally {
            cancellationTokenSource.dispose();
        }
        return {
            editsProposed,
            codeMapper
        };
    }
    getEdits(codeBlock, token) {
        return new AsyncIterableObject(async (executor) => {
            const request = {
                codeBlocks: [codeBlock]
            };
            const response = {
                textEdit: (target, edit) => {
                    executor.emitOne(edit);
                },
                notebookEdit(_resource, _edit) {
                    //
                },
            };
            const result = await this.codeMapperService.mapCode(request, response, token);
            if (result?.errorMessage) {
                executor.reject(new Error(result.errorMessage));
            }
        });
    }
    async waitForFirstElement(iterable) {
        const iterator = iterable[Symbol.asyncIterator]();
        let result = await iterator.next();
        if (result.done) {
            return {
                async *[Symbol.asyncIterator]() {
                    return;
                }
            };
        }
        return {
            async *[Symbol.asyncIterator]() {
                while (!result.done) {
                    yield result.value;
                    result = await iterator.next();
                }
            }
        };
    }
    async applyWithInlinePreview(edits, codeEditor, tokenSource) {
        return this.instantiationService.invokeFunction(reviewEdits, codeEditor, edits, tokenSource.token);
    }
    tryToRevealCodeBlock(codeEditor, codeBlock) {
        const match = codeBlock.match(/(\S[^\n]*)\n/); // substring that starts with a non-whitespace character and ends with a newline
        if (match && match[1].length > 10) {
            const findMatch = codeEditor.getModel().findNextMatch(match[1], { lineNumber: 1, column: 1 }, false, false, null, false);
            if (findMatch) {
                codeEditor.revealRangeInCenter(findMatch.range);
            }
        }
    }
    notify(message) {
        //this.notificationService.notify({ severity: Severity.Info, message });
        this.dialogService.info(message);
    }
};
ApplyCodeBlockOperation = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, IChatService),
    __param(3, ILanguageService),
    __param(4, IFileService),
    __param(5, IDialogService),
    __param(6, ILogService),
    __param(7, ICodeMapperService),
    __param(8, IProgressService),
    __param(9, IQuickInputService),
    __param(10, ILabelService),
    __param(11, IInstantiationService)
], ApplyCodeBlockOperation);
export { ApplyCodeBlockOperation };
function notifyUserAction(chatService, context, action) {
    if (isResponseVM(context.element)) {
        chatService.notifyUserAction({
            agentId: context.element.agent?.id,
            command: context.element.slashCommand?.name,
            sessionId: context.element.sessionId,
            requestId: context.element.requestId,
            result: context.element.result,
            action
        });
    }
}
function getActiveNotebookEditor(editorService) {
    const activeEditorPane = editorService.activeEditorPane;
    if (activeEditorPane?.getId() === NOTEBOOK_EDITOR_ID) {
        const notebookEditor = activeEditorPane.getControl();
        if (notebookEditor.hasModel()) {
            return notebookEditor;
        }
    }
    return undefined;
}
function getEditableActiveCodeEditor(editorService) {
    const activeCodeEditorInNotebook = getActiveNotebookEditor(editorService)?.activeCodeEditor;
    if (activeCodeEditorInNotebook && activeCodeEditorInNotebook.hasTextFocus() && activeCodeEditorInNotebook.hasModel()) {
        return activeCodeEditorInNotebook;
    }
    let codeEditor = getCodeEditor(editorService.activeTextEditorControl);
    if (!codeEditor) {
        for (const editor of editorService.visibleTextEditorControls) {
            codeEditor = getCodeEditor(editor);
            if (codeEditor) {
                break;
            }
        }
    }
    if (!codeEditor || !codeEditor.hasModel()) {
        return undefined;
    }
    return codeEditor;
}
function isReadOnly(model, textFileService) {
    // Check if model is editable, currently only support untitled and text file
    const activeTextModel = textFileService.files.get(model.uri) ?? textFileService.untitled.get(model.uri);
    return !!activeTextModel?.isReadonly();
}
function reindent(codeBlockContent, model, seletionStartLine) {
    const newContent = strings.splitLines(codeBlockContent);
    if (newContent.length === 0) {
        return codeBlockContent;
    }
    const formattingOptions = model.getFormattingOptions();
    const codeIndentLevel = computeIndentation(model.getLineContent(seletionStartLine), formattingOptions.tabSize).level;
    const indents = newContent.map(line => computeIndentation(line, formattingOptions.tabSize));
    // find the smallest indent level in the code block
    const newContentIndentLevel = indents.reduce((min, indent, index) => {
        if (indent.length !== newContent[index].length) { // ignore empty lines
            return Math.min(indent.level, min);
        }
        return min;
    }, Number.MAX_VALUE);
    if (newContentIndentLevel === Number.MAX_VALUE || newContentIndentLevel === codeIndentLevel) {
        // all lines are empty or the indent is already correct
        return codeBlockContent;
    }
    const newLines = [];
    for (let i = 0; i < newContent.length; i++) {
        const { level, length } = indents[i];
        const newLevel = Math.max(0, codeIndentLevel + level - newContentIndentLevel);
        const newIndentation = formattingOptions.insertSpaces ? ' '.repeat(formattingOptions.tabSize * newLevel) : '\t'.repeat(newLevel);
        newLines.push(newIndentation + newContent[i].substring(length));
    }
    return newLines.join('\n');
}
/**
 * Returns:
 *  - level: the line's the ident level in tabs
 *  - length: the number of characters of the leading whitespace
 */
export function computeIndentation(line, tabSize) {
    let nSpaces = 0;
    let level = 0;
    let i = 0;
    let length = 0;
    const len = line.length;
    while (i < len) {
        const chCode = line.charCodeAt(i);
        if (chCode === 32 /* CharCode.Space */) {
            nSpaces++;
            if (nSpaces === tabSize) {
                level++;
                nSpaces = 0;
                length = i + 1;
            }
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            level++;
            nSpaces = 0;
            length = i + 1;
        }
        else {
            break;
        }
        i++;
    }
    return { level, length };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jb2RlQmxvY2tPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFeEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xFLE9BQU8sS0FBSyxPQUFPLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxhQUFhLEVBQXFCLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxN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
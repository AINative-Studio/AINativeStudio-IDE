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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { trimTrailingWhitespace } from '../../../../editor/common/commands/trimTrailingWhitespaceCommand.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { ApplyCodeActionReason, applyCodeAction, getCodeActions } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind, CodeActionTriggerSource } from '../../../../editor/contrib/codeAction/common/types.js';
import { formatDocumentRangesWithSelectedProvider, formatDocumentWithSelectedProvider } from '../../../../editor/contrib/format/browser/format.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchContributionsExtensions } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { getModifiedRanges } from '../../format/browser/formatModified.js';
let TrimWhitespaceParticipant = class TrimWhitespaceParticipant {
    constructor(configurationService, codeEditorService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        // Nothing
    }
    async participate(model, context) {
        if (!model.textEditorModel) {
            return;
        }
        const trimTrailingWhitespaceOption = this.configurationService.getValue('files.trimTrailingWhitespace', { overrideIdentifier: model.textEditorModel.getLanguageId(), resource: model.resource });
        const trimInRegexAndStrings = this.configurationService.getValue('files.trimTrailingWhitespaceInRegexAndStrings', { overrideIdentifier: model.textEditorModel.getLanguageId(), resource: model.resource });
        if (trimTrailingWhitespaceOption) {
            this.doTrimTrailingWhitespace(model.textEditorModel, context.reason === 2 /* SaveReason.AUTO */, trimInRegexAndStrings);
        }
    }
    doTrimTrailingWhitespace(model, isAutoSaved, trimInRegexesAndStrings) {
        let prevSelection = [];
        let cursors = [];
        const editor = findEditor(model, this.codeEditorService);
        if (editor) {
            // Find `prevSelection` in any case do ensure a good undo stack when pushing the edit
            // Collect active cursors in `cursors` only if `isAutoSaved` to avoid having the cursors jump
            prevSelection = editor.getSelections();
            if (isAutoSaved) {
                cursors = prevSelection.map(s => s.getPosition());
                const snippetsRange = SnippetController2.get(editor)?.getSessionEnclosingRange();
                if (snippetsRange) {
                    for (let lineNumber = snippetsRange.startLineNumber; lineNumber <= snippetsRange.endLineNumber; lineNumber++) {
                        cursors.push(new Position(lineNumber, model.getLineMaxColumn(lineNumber)));
                    }
                }
            }
        }
        const ops = trimTrailingWhitespace(model, cursors, trimInRegexesAndStrings);
        if (!ops.length) {
            return; // Nothing to do
        }
        model.pushEditOperations(prevSelection, ops, (_edits) => prevSelection);
    }
};
TrimWhitespaceParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService)
], TrimWhitespaceParticipant);
export { TrimWhitespaceParticipant };
function findEditor(model, codeEditorService) {
    let candidate = null;
    if (model.isAttachedToEditor()) {
        for (const editor of codeEditorService.listCodeEditors()) {
            if (editor.hasModel() && editor.getModel() === model) {
                if (editor.hasTextFocus()) {
                    return editor; // favour focused editor if there are multiple
                }
                candidate = editor;
            }
        }
    }
    return candidate;
}
let FinalNewLineParticipant = class FinalNewLineParticipant {
    constructor(configurationService, codeEditorService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        // Nothing
    }
    async participate(model, context) {
        if (!model.textEditorModel) {
            return;
        }
        if (this.configurationService.getValue('files.insertFinalNewline', { overrideIdentifier: model.textEditorModel.getLanguageId(), resource: model.resource })) {
            this.doInsertFinalNewLine(model.textEditorModel);
        }
    }
    doInsertFinalNewLine(model) {
        const lineCount = model.getLineCount();
        const lastLine = model.getLineContent(lineCount);
        const lastLineIsEmptyOrWhitespace = strings.lastNonWhitespaceIndex(lastLine) === -1;
        if (!lineCount || lastLineIsEmptyOrWhitespace) {
            return;
        }
        const edits = [EditOperation.insert(new Position(lineCount, model.getLineMaxColumn(lineCount)), model.getEOL())];
        const editor = findEditor(model, this.codeEditorService);
        if (editor) {
            editor.executeEdits('insertFinalNewLine', edits, editor.getSelections());
        }
        else {
            model.pushEditOperations([], edits, () => null);
        }
    }
};
FinalNewLineParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService)
], FinalNewLineParticipant);
export { FinalNewLineParticipant };
let TrimFinalNewLinesParticipant = class TrimFinalNewLinesParticipant {
    constructor(configurationService, codeEditorService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        // Nothing
    }
    async participate(model, context) {
        if (!model.textEditorModel) {
            return;
        }
        if (this.configurationService.getValue('files.trimFinalNewlines', { overrideIdentifier: model.textEditorModel.getLanguageId(), resource: model.resource })) {
            this.doTrimFinalNewLines(model.textEditorModel, context.reason === 2 /* SaveReason.AUTO */);
        }
    }
    /**
     * returns 0 if the entire file is empty
     */
    findLastNonEmptyLine(model) {
        for (let lineNumber = model.getLineCount(); lineNumber >= 1; lineNumber--) {
            const lineLength = model.getLineLength(lineNumber);
            if (lineLength > 0) {
                // this line has content
                return lineNumber;
            }
        }
        // no line has content
        return 0;
    }
    doTrimFinalNewLines(model, isAutoSaved) {
        const lineCount = model.getLineCount();
        // Do not insert new line if file does not end with new line
        if (lineCount === 1) {
            return;
        }
        let prevSelection = [];
        let cannotTouchLineNumber = 0;
        const editor = findEditor(model, this.codeEditorService);
        if (editor) {
            prevSelection = editor.getSelections();
            if (isAutoSaved) {
                for (let i = 0, len = prevSelection.length; i < len; i++) {
                    const positionLineNumber = prevSelection[i].positionLineNumber;
                    if (positionLineNumber > cannotTouchLineNumber) {
                        cannotTouchLineNumber = positionLineNumber;
                    }
                }
            }
        }
        const lastNonEmptyLine = this.findLastNonEmptyLine(model);
        const deleteFromLineNumber = Math.max(lastNonEmptyLine + 1, cannotTouchLineNumber + 1);
        const deletionRange = model.validateRange(new Range(deleteFromLineNumber, 1, lineCount, model.getLineMaxColumn(lineCount)));
        if (deletionRange.isEmpty()) {
            return;
        }
        model.pushEditOperations(prevSelection, [EditOperation.delete(deletionRange)], _edits => prevSelection);
        editor?.setSelections(prevSelection);
    }
};
TrimFinalNewLinesParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService)
], TrimFinalNewLinesParticipant);
export { TrimFinalNewLinesParticipant };
let FormatOnSaveParticipant = class FormatOnSaveParticipant {
    constructor(configurationService, codeEditorService, instantiationService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        this.instantiationService = instantiationService;
        // Nothing
    }
    async participate(model, context, progress, token) {
        if (!model.textEditorModel) {
            return;
        }
        if (context.reason === 2 /* SaveReason.AUTO */) {
            return undefined;
        }
        const textEditorModel = model.textEditorModel;
        const overrides = { overrideIdentifier: textEditorModel.getLanguageId(), resource: textEditorModel.uri };
        const nestedProgress = new Progress(provider => {
            progress.report({
                message: localize({ key: 'formatting2', comment: ['[configure]({1}) is a link. Only translate `configure`. Do not change brackets and parentheses or {1}'] }, "Running '{0}' Formatter ([configure]({1})).", provider.displayName || provider.extensionId && provider.extensionId.value || '???', 'command:workbench.action.openSettings?%5B%22editor.formatOnSave%22%5D')
            });
        });
        const enabled = this.configurationService.getValue('editor.formatOnSave', overrides);
        if (!enabled) {
            return undefined;
        }
        const editorOrModel = findEditor(textEditorModel, this.codeEditorService) || textEditorModel;
        const mode = this.configurationService.getValue('editor.formatOnSaveMode', overrides);
        if (mode === 'file') {
            await this.instantiationService.invokeFunction(formatDocumentWithSelectedProvider, editorOrModel, 2 /* FormattingMode.Silent */, nestedProgress, token);
        }
        else {
            const ranges = await this.instantiationService.invokeFunction(getModifiedRanges, isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel);
            if (ranges === null && mode === 'modificationsIfAvailable') {
                // no SCM, fallback to formatting the whole file iff wanted
                await this.instantiationService.invokeFunction(formatDocumentWithSelectedProvider, editorOrModel, 2 /* FormattingMode.Silent */, nestedProgress, token);
            }
            else if (ranges) {
                // formatted modified ranges
                await this.instantiationService.invokeFunction(formatDocumentRangesWithSelectedProvider, editorOrModel, ranges, 2 /* FormattingMode.Silent */, nestedProgress, token, false);
            }
        }
    }
};
FormatOnSaveParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService),
    __param(2, IInstantiationService)
], FormatOnSaveParticipant);
let CodeActionOnSaveParticipant = class CodeActionOnSaveParticipant extends Disposable {
    constructor(configurationService, instantiationService, languageFeaturesService, hostService, editorService, codeEditorService) {
        super();
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.languageFeaturesService = languageFeaturesService;
        this.hostService = hostService;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this._register(this.hostService.onDidChangeFocus(() => { this.triggerCodeActionsCommand(); }));
        this._register(this.editorService.onDidActiveEditorChange(() => { this.triggerCodeActionsCommand(); }));
    }
    async triggerCodeActionsCommand() {
        if (this.configurationService.getValue('editor.codeActions.triggerOnFocusChange') && this.configurationService.getValue('files.autoSave') === 'afterDelay') {
            const model = this.codeEditorService.getActiveCodeEditor()?.getModel();
            if (!model) {
                return undefined;
            }
            const settingsOverrides = { overrideIdentifier: model.getLanguageId(), resource: model.uri };
            const setting = this.configurationService.getValue('editor.codeActionsOnSave', settingsOverrides);
            if (!setting) {
                return undefined;
            }
            if (Array.isArray(setting)) {
                return undefined;
            }
            const settingItems = Object.keys(setting).filter(x => setting[x] && setting[x] === 'always' && CodeActionKind.Source.contains(new HierarchicalKind(x)));
            const cancellationTokenSource = new CancellationTokenSource();
            const codeActionKindList = [];
            for (const item of settingItems) {
                codeActionKindList.push(new HierarchicalKind(item));
            }
            // run code actions based on what is found from setting === 'always', no exclusions.
            await this.applyOnSaveActions(model, codeActionKindList, [], Progress.None, cancellationTokenSource.token);
        }
    }
    async participate(model, context, progress, token) {
        if (!model.textEditorModel) {
            return;
        }
        const textEditorModel = model.textEditorModel;
        const settingsOverrides = { overrideIdentifier: textEditorModel.getLanguageId(), resource: textEditorModel.uri };
        // Convert boolean values to strings
        const setting = this.configurationService.getValue('editor.codeActionsOnSave', settingsOverrides);
        if (!setting) {
            return undefined;
        }
        if (context.reason === 2 /* SaveReason.AUTO */) {
            return undefined;
        }
        if (context.reason !== 1 /* SaveReason.EXPLICIT */ && Array.isArray(setting)) {
            return undefined;
        }
        const settingItems = Array.isArray(setting)
            ? setting
            : Object.keys(setting).filter(x => setting[x] && setting[x] !== 'never');
        const codeActionsOnSave = this.createCodeActionsOnSave(settingItems);
        if (!Array.isArray(setting)) {
            codeActionsOnSave.sort((a, b) => {
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
        if (!codeActionsOnSave.length) {
            return undefined;
        }
        const excludedActions = Array.isArray(setting)
            ? []
            : Object.keys(setting)
                .filter(x => setting[x] === 'never' || false)
                .map(x => new HierarchicalKind(x));
        progress.report({ message: localize('codeaction', "Quick Fixes") });
        const filteredSaveList = Array.isArray(setting) ? codeActionsOnSave : codeActionsOnSave.filter(x => setting[x.value] === 'always' || ((setting[x.value] === 'explicit' || setting[x.value] === true) && context.reason === 1 /* SaveReason.EXPLICIT */));
        await this.applyOnSaveActions(textEditorModel, filteredSaveList, excludedActions, progress, token);
    }
    createCodeActionsOnSave(settingItems) {
        const kinds = settingItems.map(x => new HierarchicalKind(x));
        // Remove subsets
        return kinds.filter(kind => {
            return kinds.every(otherKind => otherKind.equals(kind) || !otherKind.contains(kind));
        });
    }
    async applyOnSaveActions(model, codeActionsOnSave, excludes, progress, token) {
        const getActionProgress = new class {
            constructor() {
                this._names = new Set();
            }
            _report() {
                progress.report({
                    message: localize({ key: 'codeaction.get2', comment: ['[configure]({1}) is a link. Only translate `configure`. Do not change brackets and parentheses or {1}'] }, "Getting code actions from {0} ([configure]({1})).", [...this._names].map(name => `'${name}'`).join(', '), 'command:workbench.action.openSettings?%5B%22editor.codeActionsOnSave%22%5D')
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
            const actionsToRun = await this.getActionsToRun(model, codeActionKind, excludes, getActionProgress, token);
            if (token.isCancellationRequested) {
                actionsToRun.dispose();
                return;
            }
            try {
                for (const action of actionsToRun.validActions) {
                    progress.report({ message: localize('codeAction.apply', "Applying code action '{0}'.", action.action.title) });
                    await this.instantiationService.invokeFunction(applyCodeAction, action, ApplyCodeActionReason.OnSave, {}, token);
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
    getActionsToRun(model, codeActionKind, excludes, progress, token) {
        return getCodeActions(this.languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
            type: 2 /* CodeActionTriggerType.Auto */,
            triggerAction: CodeActionTriggerSource.OnSave,
            filter: { include: codeActionKind, excludes: excludes, includeSourceActions: true },
        }, progress, token);
    }
};
CodeActionOnSaveParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IInstantiationService),
    __param(2, ILanguageFeaturesService),
    __param(3, IHostService),
    __param(4, IEditorService),
    __param(5, ICodeEditorService)
], CodeActionOnSaveParticipant);
let SaveParticipantsContribution = class SaveParticipantsContribution extends Disposable {
    constructor(instantiationService, textFileService) {
        super();
        this.instantiationService = instantiationService;
        this.textFileService = textFileService;
        this.registerSaveParticipants();
    }
    registerSaveParticipants() {
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(TrimWhitespaceParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(CodeActionOnSaveParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(FormatOnSaveParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(FinalNewLineParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(TrimFinalNewLinesParticipant)));
    }
};
SaveParticipantsContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextFileService)
], SaveParticipantsContribution);
export { SaveParticipantsContribution };
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(SaveParticipantsContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9zYXZlUGFydGljaXBhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQXFCLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSWhFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDckksT0FBTyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2hILE9BQU8sRUFBa0Isd0NBQXdDLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztB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
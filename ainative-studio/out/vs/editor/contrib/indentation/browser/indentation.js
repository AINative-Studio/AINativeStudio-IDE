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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { IModelService } from '../../../common/services/model.js';
import * as indentUtils from '../common/indentUtils.js';
import * as nls from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { getGoodIndentForLine, getIndentMetadata } from '../../../common/languages/autoIndent.js';
import { getReindentEditOperations } from '../common/indentation.js';
import { getStandardTokenTypeAtPosition } from '../../../common/tokens/lineTokens.js';
export class IndentationToSpacesAction extends EditorAction {
    static { this.ID = 'editor.action.indentationToSpaces'; }
    constructor() {
        super({
            id: IndentationToSpacesAction.ID,
            label: nls.localize2('indentationToSpaces', "Convert Indentation to Spaces"),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('indentationToSpacesDescription', "Convert the tab indentation to spaces."),
            }
        });
    }
    run(accessor, editor) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const modelOpts = model.getOptions();
        const selection = editor.getSelection();
        if (!selection) {
            return;
        }
        const command = new IndentationToSpacesCommand(selection, modelOpts.tabSize);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
        model.updateOptions({
            insertSpaces: true
        });
    }
}
export class IndentationToTabsAction extends EditorAction {
    static { this.ID = 'editor.action.indentationToTabs'; }
    constructor() {
        super({
            id: IndentationToTabsAction.ID,
            label: nls.localize2('indentationToTabs', "Convert Indentation to Tabs"),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('indentationToTabsDescription', "Convert the spaces indentation to tabs."),
            }
        });
    }
    run(accessor, editor) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const modelOpts = model.getOptions();
        const selection = editor.getSelection();
        if (!selection) {
            return;
        }
        const command = new IndentationToTabsCommand(selection, modelOpts.tabSize);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
        model.updateOptions({
            insertSpaces: false
        });
    }
}
export class ChangeIndentationSizeAction extends EditorAction {
    constructor(insertSpaces, displaySizeOnly, opts) {
        super(opts);
        this.insertSpaces = insertSpaces;
        this.displaySizeOnly = displaySizeOnly;
    }
    run(accessor, editor) {
        const quickInputService = accessor.get(IQuickInputService);
        const modelService = accessor.get(IModelService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const creationOpts = modelService.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        const modelOpts = model.getOptions();
        const picks = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
            id: n.toString(),
            label: n.toString(),
            // add description for tabSize value set in the configuration
            description: (n === creationOpts.tabSize && n === modelOpts.tabSize
                ? nls.localize('configuredTabSize', "Configured Tab Size")
                : n === creationOpts.tabSize
                    ? nls.localize('defaultTabSize', "Default Tab Size")
                    : n === modelOpts.tabSize
                        ? nls.localize('currentTabSize', "Current Tab Size")
                        : undefined)
        }));
        // auto focus the tabSize set for the current editor
        const autoFocusIndex = Math.min(model.getOptions().tabSize - 1, 7);
        setTimeout(() => {
            quickInputService.pick(picks, { placeHolder: nls.localize({ key: 'selectTabWidth', comment: ['Tab corresponds to the tab key'] }, "Select Tab Size for Current File"), activeItem: picks[autoFocusIndex] }).then(pick => {
                if (pick) {
                    if (model && !model.isDisposed()) {
                        const pickedVal = parseInt(pick.label, 10);
                        if (this.displaySizeOnly) {
                            model.updateOptions({
                                tabSize: pickedVal
                            });
                        }
                        else {
                            model.updateOptions({
                                tabSize: pickedVal,
                                indentSize: pickedVal,
                                insertSpaces: this.insertSpaces
                            });
                        }
                    }
                }
            });
        }, 50 /* quick input is sensitive to being opened so soon after another */);
    }
}
export class IndentUsingTabs extends ChangeIndentationSizeAction {
    static { this.ID = 'editor.action.indentUsingTabs'; }
    constructor() {
        super(false, false, {
            id: IndentUsingTabs.ID,
            label: nls.localize2('indentUsingTabs', "Indent Using Tabs"),
            precondition: undefined,
            metadata: {
                description: nls.localize2('indentUsingTabsDescription', "Use indentation with tabs."),
            }
        });
    }
}
export class IndentUsingSpaces extends ChangeIndentationSizeAction {
    static { this.ID = 'editor.action.indentUsingSpaces'; }
    constructor() {
        super(true, false, {
            id: IndentUsingSpaces.ID,
            label: nls.localize2('indentUsingSpaces', "Indent Using Spaces"),
            precondition: undefined,
            metadata: {
                description: nls.localize2('indentUsingSpacesDescription', "Use indentation with spaces."),
            }
        });
    }
}
export class ChangeTabDisplaySize extends ChangeIndentationSizeAction {
    static { this.ID = 'editor.action.changeTabDisplaySize'; }
    constructor() {
        super(true, true, {
            id: ChangeTabDisplaySize.ID,
            label: nls.localize2('changeTabDisplaySize', "Change Tab Display Size"),
            precondition: undefined,
            metadata: {
                description: nls.localize2('changeTabDisplaySizeDescription', "Change the space size equivalent of the tab."),
            }
        });
    }
}
export class DetectIndentation extends EditorAction {
    static { this.ID = 'editor.action.detectIndentation'; }
    constructor() {
        super({
            id: DetectIndentation.ID,
            label: nls.localize2('detectIndentation', "Detect Indentation from Content"),
            precondition: undefined,
            metadata: {
                description: nls.localize2('detectIndentationDescription', "Detect the indentation from content."),
            }
        });
    }
    run(accessor, editor) {
        const modelService = accessor.get(IModelService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const creationOpts = modelService.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        model.detectIndentation(creationOpts.insertSpaces, creationOpts.tabSize);
    }
}
export class ReindentLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.reindentlines',
            label: nls.localize2('editor.reindentlines', "Reindent Lines"),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('editor.reindentlinesDescription', "Reindent the lines of the editor."),
            }
        });
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const edits = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        if (edits.length > 0) {
            editor.pushUndoStop();
            editor.executeEdits(this.id, edits);
            editor.pushUndoStop();
        }
    }
}
export class ReindentSelectedLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.reindentselectedlines',
            label: nls.localize2('editor.reindentselectedlines', "Reindent Selected Lines"),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: nls.localize2('editor.reindentselectedlinesDescription', "Reindent the selected lines of the editor."),
            }
        });
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const selections = editor.getSelections();
        if (selections === null) {
            return;
        }
        const edits = [];
        for (const selection of selections) {
            let startLineNumber = selection.startLineNumber;
            let endLineNumber = selection.endLineNumber;
            if (startLineNumber !== endLineNumber && selection.endColumn === 1) {
                endLineNumber--;
            }
            if (startLineNumber === 1) {
                if (startLineNumber === endLineNumber) {
                    continue;
                }
            }
            else {
                startLineNumber--;
            }
            const editOperations = getReindentEditOperations(model, languageConfigurationService, startLineNumber, endLineNumber);
            edits.push(...editOperations);
        }
        if (edits.length > 0) {
            editor.pushUndoStop();
            editor.executeEdits(this.id, edits);
            editor.pushUndoStop();
        }
    }
}
export class AutoIndentOnPasteCommand {
    constructor(edits, initialSelection) {
        this._initialSelection = initialSelection;
        this._edits = [];
        this._selectionId = null;
        for (const edit of edits) {
            if (edit.range && typeof edit.text === 'string') {
                this._edits.push(edit);
            }
        }
    }
    getEditOperations(model, builder) {
        for (const edit of this._edits) {
            builder.addEditOperation(Range.lift(edit.range), edit.text);
        }
        let selectionIsSet = false;
        if (Array.isArray(this._edits) && this._edits.length === 1 && this._initialSelection.isEmpty()) {
            if (this._edits[0].range.startColumn === this._initialSelection.endColumn &&
                this._edits[0].range.startLineNumber === this._initialSelection.endLineNumber) {
                selectionIsSet = true;
                this._selectionId = builder.trackSelection(this._initialSelection, true);
            }
            else if (this._edits[0].range.endColumn === this._initialSelection.startColumn &&
                this._edits[0].range.endLineNumber === this._initialSelection.startLineNumber) {
                selectionIsSet = true;
                this._selectionId = builder.trackSelection(this._initialSelection, false);
            }
        }
        if (!selectionIsSet) {
            this._selectionId = builder.trackSelection(this._initialSelection);
        }
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
let AutoIndentOnPaste = class AutoIndentOnPaste {
    static { this.ID = 'editor.contrib.autoIndentOnPaste'; }
    constructor(editor, _languageConfigurationService) {
        this.editor = editor;
        this._languageConfigurationService = _languageConfigurationService;
        this.callOnDispose = new DisposableStore();
        this.callOnModel = new DisposableStore();
        this.callOnDispose.add(editor.onDidChangeConfiguration(() => this.update()));
        this.callOnDispose.add(editor.onDidChangeModel(() => this.update()));
        this.callOnDispose.add(editor.onDidChangeModelLanguage(() => this.update()));
    }
    update() {
        // clean up
        this.callOnModel.clear();
        // we are disabled
        if (this.editor.getOption(12 /* EditorOption.autoIndent */) < 4 /* EditorAutoIndentStrategy.Full */ || this.editor.getOption(57 /* EditorOption.formatOnPaste */)) {
            return;
        }
        // no model
        if (!this.editor.hasModel()) {
            return;
        }
        this.callOnModel.add(this.editor.onDidPaste(({ range }) => {
            this.trigger(range);
        }));
    }
    trigger(range) {
        const selections = this.editor.getSelections();
        if (selections === null || selections.length > 1) {
            return;
        }
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        const containsOnlyWhitespace = this.rangeContainsOnlyWhitespaceCharacters(model, range);
        if (containsOnlyWhitespace) {
            return;
        }
        if (isStartOrEndInString(model, range)) {
            return;
        }
        if (!model.tokenization.isCheapToTokenize(range.getStartPosition().lineNumber)) {
            return;
        }
        const autoIndent = this.editor.getOption(12 /* EditorOption.autoIndent */);
        const { tabSize, indentSize, insertSpaces } = model.getOptions();
        const textEdits = [];
        const indentConverter = {
            shiftIndent: (indentation) => {
                return ShiftCommand.shiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            },
            unshiftIndent: (indentation) => {
                return ShiftCommand.unshiftIndent(indentation, indentation.length + 1, tabSize, indentSize, insertSpaces);
            }
        };
        let startLineNumber = range.startLineNumber;
        while (startLineNumber <= range.endLineNumber) {
            if (this.shouldIgnoreLine(model, startLineNumber)) {
                startLineNumber++;
                continue;
            }
            break;
        }
        if (startLineNumber > range.endLineNumber) {
            return;
        }
        let firstLineText = model.getLineContent(startLineNumber);
        if (!/\S/.test(firstLineText.substring(0, range.startColumn - 1))) {
            const indentOfFirstLine = getGoodIndentForLine(autoIndent, model, model.getLanguageId(), startLineNumber, indentConverter, this._languageConfigurationService);
            if (indentOfFirstLine !== null) {
                const oldIndentation = strings.getLeadingWhitespace(firstLineText);
                const newSpaceCnt = indentUtils.getSpaceCnt(indentOfFirstLine, tabSize);
                const oldSpaceCnt = indentUtils.getSpaceCnt(oldIndentation, tabSize);
                if (newSpaceCnt !== oldSpaceCnt) {
                    const newIndent = indentUtils.generateIndent(newSpaceCnt, tabSize, insertSpaces);
                    textEdits.push({
                        range: new Range(startLineNumber, 1, startLineNumber, oldIndentation.length + 1),
                        text: newIndent
                    });
                    firstLineText = newIndent + firstLineText.substring(oldIndentation.length);
                }
                else {
                    const indentMetadata = getIndentMetadata(model, startLineNumber, this._languageConfigurationService);
                    if (indentMetadata === 0 || indentMetadata === 8 /* IndentConsts.UNINDENT_MASK */) {
                        // we paste content into a line where only contains whitespaces
                        // after pasting, the indentation of the first line is already correct
                        // the first line doesn't match any indentation rule
                        // then no-op.
                        return;
                    }
                }
            }
        }
        const firstLineNumber = startLineNumber;
        // ignore empty or ignored lines
        while (startLineNumber < range.endLineNumber) {
            if (!/\S/.test(model.getLineContent(startLineNumber + 1))) {
                startLineNumber++;
                continue;
            }
            break;
        }
        if (startLineNumber !== range.endLineNumber) {
            const virtualModel = {
                tokenization: {
                    getLineTokens: (lineNumber) => {
                        return model.tokenization.getLineTokens(lineNumber);
                    },
                    getLanguageId: () => {
                        return model.getLanguageId();
                    },
                    getLanguageIdAtPosition: (lineNumber, column) => {
                        return model.getLanguageIdAtPosition(lineNumber, column);
                    },
                },
                getLineContent: (lineNumber) => {
                    if (lineNumber === firstLineNumber) {
                        return firstLineText;
                    }
                    else {
                        return model.getLineContent(lineNumber);
                    }
                }
            };
            const indentOfSecondLine = getGoodIndentForLine(autoIndent, virtualModel, model.getLanguageId(), startLineNumber + 1, indentConverter, this._languageConfigurationService);
            if (indentOfSecondLine !== null) {
                const newSpaceCntOfSecondLine = indentUtils.getSpaceCnt(indentOfSecondLine, tabSize);
                const oldSpaceCntOfSecondLine = indentUtils.getSpaceCnt(strings.getLeadingWhitespace(model.getLineContent(startLineNumber + 1)), tabSize);
                if (newSpaceCntOfSecondLine !== oldSpaceCntOfSecondLine) {
                    const spaceCntOffset = newSpaceCntOfSecondLine - oldSpaceCntOfSecondLine;
                    for (let i = startLineNumber + 1; i <= range.endLineNumber; i++) {
                        const lineContent = model.getLineContent(i);
                        const originalIndent = strings.getLeadingWhitespace(lineContent);
                        const originalSpacesCnt = indentUtils.getSpaceCnt(originalIndent, tabSize);
                        const newSpacesCnt = originalSpacesCnt + spaceCntOffset;
                        const newIndent = indentUtils.generateIndent(newSpacesCnt, tabSize, insertSpaces);
                        if (newIndent !== originalIndent) {
                            textEdits.push({
                                range: new Range(i, 1, i, originalIndent.length + 1),
                                text: newIndent
                            });
                        }
                    }
                }
            }
        }
        if (textEdits.length > 0) {
            this.editor.pushUndoStop();
            const cmd = new AutoIndentOnPasteCommand(textEdits, this.editor.getSelection());
            this.editor.executeCommand('autoIndentOnPaste', cmd);
            this.editor.pushUndoStop();
        }
    }
    rangeContainsOnlyWhitespaceCharacters(model, range) {
        const lineContainsOnlyWhitespace = (content) => {
            return content.trim().length === 0;
        };
        let containsOnlyWhitespace = true;
        if (range.startLineNumber === range.endLineNumber) {
            const lineContent = model.getLineContent(range.startLineNumber);
            const linePart = lineContent.substring(range.startColumn - 1, range.endColumn - 1);
            containsOnlyWhitespace = lineContainsOnlyWhitespace(linePart);
        }
        else {
            for (let i = range.startLineNumber; i <= range.endLineNumber; i++) {
                const lineContent = model.getLineContent(i);
                if (i === range.startLineNumber) {
                    const linePart = lineContent.substring(range.startColumn - 1);
                    containsOnlyWhitespace = lineContainsOnlyWhitespace(linePart);
                }
                else if (i === range.endLineNumber) {
                    const linePart = lineContent.substring(0, range.endColumn - 1);
                    containsOnlyWhitespace = lineContainsOnlyWhitespace(linePart);
                }
                else {
                    containsOnlyWhitespace = model.getLineFirstNonWhitespaceColumn(i) === 0;
                }
                if (!containsOnlyWhitespace) {
                    break;
                }
            }
        }
        return containsOnlyWhitespace;
    }
    shouldIgnoreLine(model, lineNumber) {
        model.tokenization.forceTokenization(lineNumber);
        const nonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        if (nonWhitespaceColumn === 0) {
            return true;
        }
        const tokens = model.tokenization.getLineTokens(lineNumber);
        if (tokens.getCount() > 0) {
            const firstNonWhitespaceTokenIndex = tokens.findTokenIndexAtOffset(nonWhitespaceColumn);
            if (firstNonWhitespaceTokenIndex >= 0 && tokens.getStandardTokenType(firstNonWhitespaceTokenIndex) === 1 /* StandardTokenType.Comment */) {
                return true;
            }
        }
        return false;
    }
    dispose() {
        this.callOnDispose.dispose();
        this.callOnModel.dispose();
    }
};
AutoIndentOnPaste = __decorate([
    __param(1, ILanguageConfigurationService)
], AutoIndentOnPaste);
export { AutoIndentOnPaste };
function isStartOrEndInString(model, range) {
    const isPositionInString = (position) => {
        const tokenType = getStandardTokenTypeAtPosition(model, position);
        return tokenType === 2 /* StandardTokenType.String */;
    };
    return isPositionInString(range.getStartPosition()) || isPositionInString(range.getEndPosition());
}
function getIndentationEditOperations(model, builder, tabSize, tabsToSpaces) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return;
    }
    let spaces = '';
    for (let i = 0; i < tabSize; i++) {
        spaces += ' ';
    }
    const spacesRegExp = new RegExp(spaces, 'gi');
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
        builder.addEditOperation(originalIndentationRange, newIndentation);
    }
}
export class IndentationToSpacesCommand {
    constructor(selection, tabSize) {
        this.selection = selection;
        this.tabSize = tabSize;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        this.selectionId = builder.trackSelection(this.selection);
        getIndentationEditOperations(model, builder, this.tabSize, true);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
}
export class IndentationToTabsCommand {
    constructor(selection, tabSize) {
        this.selection = selection;
        this.tabSize = tabSize;
        this.selectionId = null;
    }
    getEditOperations(model, builder) {
        this.selectionId = builder.trackSelection(this.selection);
        getIndentationEditOperations(model, builder, this.tabSize, false);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this.selectionId);
    }
}
registerEditorContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(IndentationToSpacesAction);
registerEditorAction(IndentationToTabsAction);
registerEditorAction(IndentUsingTabs);
registerEditorAction(IndentUsingSpaces);
registerEditorAction(ChangeTabDisplaySize);
registerEditorAction(DetectIndentation);
registerEditorAction(ReindentLinesAction);
registerEditorAction(ReindentSelectedLinesAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5kZW50YXRpb24vYnJvd3Nlci9pbmRlbnRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFtRCxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6TCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHeEUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSXpFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTNHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNsRSxPQUFPLEtBQUssV0FBVyxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDckUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHdEYsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFlBQVk7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
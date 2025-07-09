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
var NotebookInlineVariablesController_1;
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { format } from '../../../../../../base/common/strings.js';
import { Position } from '../../../../../../editor/common/core/position.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../../nls.js';
import { registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { createInlineValueDecoration } from '../../../../debug/browser/debugEditorContribution.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { NotebookAction } from '../../controller/coreActions.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
class InlineSegment {
    constructor(column, text) {
        this.column = column;
        this.text = text;
    }
}
let NotebookInlineVariablesController = class NotebookInlineVariablesController extends Disposable {
    static { NotebookInlineVariablesController_1 = this; }
    static { this.id = 'notebook.inlineVariablesController'; }
    static { this.MAX_CELL_LINES = 5000; } // Skip extremely large cells
    constructor(notebookEditor, notebookKernelService, notebookExecutionStateService, languageFeaturesService, configurationService, debugService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookKernelService = notebookKernelService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.languageFeaturesService = languageFeaturesService;
        this.configurationService = configurationService;
        this.debugService = debugService;
        this.cellDecorationIds = new Map();
        this.cellContentListeners = new ResourceMap();
        this.currentCancellationTokenSources = new ResourceMap();
        this._register(this.notebookExecutionStateService.onDidChangeExecution(async (e) => {
            const inlineValuesSetting = this.configurationService.getValue(NotebookSetting.notebookInlineValues);
            if (inlineValuesSetting === 'off') {
                return;
            }
            if (e.type === NotebookExecutionType.cell) {
                await this.updateInlineVariables(e);
            }
        }));
        this._register(Event.runAndSubscribe(this.configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration(NotebookSetting.notebookInlineValues)) {
                if (this.configurationService.getValue(NotebookSetting.notebookInlineValues) === 'off') {
                    this.clearNotebookInlineDecorations();
                }
            }
        }));
    }
    async updateInlineVariables(event) {
        if (event.changed) { // undefined -> execution was completed, so return on all else. no code should execute until we know it's an execution completion
            return;
        }
        const cell = this.notebookEditor.getCellByHandle(event.cellHandle);
        if (!cell) {
            return;
        }
        // Cancel any ongoing request in this cell
        const existingSource = this.currentCancellationTokenSources.get(cell.uri);
        if (existingSource) {
            existingSource.cancel();
        }
        // Create a new CancellationTokenSource for the new request per cell
        this.currentCancellationTokenSources.set(cell.uri, new CancellationTokenSource());
        const token = this.currentCancellationTokenSources.get(cell.uri).token;
        if (this.debugService.state !== 0 /* State.Inactive */) {
            this._clearNotebookInlineDecorations();
            return;
        }
        if (!this.notebookEditor.textModel?.uri || !isEqual(this.notebookEditor.textModel.uri, event.notebook)) {
            return;
        }
        const model = await cell.resolveTextModel();
        if (!model) {
            return;
        }
        const inlineValuesSetting = this.configurationService.getValue(NotebookSetting.notebookInlineValues);
        const hasInlineValueProvider = this.languageFeaturesService.inlineValuesProvider.has(model);
        // Skip if setting is off or if auto and no provider is registered
        if (inlineValuesSetting === 'off' || (inlineValuesSetting === 'auto' && !hasInlineValueProvider)) {
            return;
        }
        this.clearCellInlineDecorations(cell);
        const inlineDecorations = [];
        if (hasInlineValueProvider) {
            // use extension based provider, borrowed from https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/browser/debugEditorContribution.ts#L679
            const lastLine = model.getLineCount();
            const lastColumn = model.getLineMaxColumn(lastLine);
            const ctx = {
                frameId: 0, // ignored, we won't have a stack from since not in a debug session
                stoppedLocation: new Range(lastLine, lastColumn, lastLine, lastColumn) // executing cell by cell, so "stopped" location would just be the end of document
            };
            const providers = this.languageFeaturesService.inlineValuesProvider.ordered(model).reverse();
            const lineDecorations = new Map();
            const fullCellRange = new Range(1, 1, lastLine, lastColumn);
            const promises = providers.flatMap(provider => Promise.resolve(provider.provideInlineValues(model, fullCellRange, ctx, token)).then(async (result) => {
                if (!result) {
                    return;
                }
                const notebook = this.notebookEditor.textModel;
                if (!notebook) {
                    return;
                }
                const kernel = this.notebookKernelService.getMatchingKernel(notebook);
                const kernelVars = [];
                if (result.some(iv => iv.type === 'variable')) { // if anyone will need a lookup, get vars now to avoid needing to do it multiple times
                    if (!this.notebookEditor.hasModel()) {
                        return; // should not happen, a cell will be executed
                    }
                    const variables = kernel.selected?.provideVariables(event.notebook, undefined, 'named', 0, token);
                    if (variables) {
                        for await (const v of variables) {
                            kernelVars.push(v);
                        }
                    }
                }
                for (const iv of result) {
                    let text = undefined;
                    switch (iv.type) {
                        case 'text':
                            text = iv.text;
                            break;
                        case 'variable': {
                            const name = iv.variableName;
                            if (!name) {
                                continue; // skip to next var, no valid name to lookup with
                            }
                            const value = kernelVars.find(v => v.name === name)?.value;
                            if (!value) {
                                continue;
                            }
                            text = format('{0} = {1}', name, value);
                            break;
                        }
                        case 'expression': {
                            continue; // no active debug session, so evaluate would break
                        }
                    }
                    if (text) {
                        const line = iv.range.startLineNumber;
                        let lineSegments = lineDecorations.get(line);
                        if (!lineSegments) {
                            lineSegments = [];
                            lineDecorations.set(line, lineSegments);
                        }
                        if (!lineSegments.some(iv => iv.text === text)) { // de-dupe
                            lineSegments.push(new InlineSegment(iv.range.startColumn, text));
                        }
                    }
                }
            }, err => {
                onUnexpectedExternalError(err);
            }));
            await Promise.all(promises);
            // sort line segments and concatenate them into a decoration
            lineDecorations.forEach((segments, line) => {
                if (segments.length > 0) {
                    segments.sort((a, b) => a.column - b.column);
                    const text = segments.map(s => s.text).join(', ');
                    const editorWidth = cell.layoutInfo.editorWidth;
                    const fontInfo = cell.layoutInfo.fontInfo;
                    if (fontInfo && cell.textModel) {
                        const base = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                        const lineLength = cell.textModel.getLineLength(line);
                        const available = Math.max(0, base - lineLength);
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb', undefined, available));
                    }
                    else {
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb'));
                    }
                }
            });
        }
        else if (inlineValuesSetting === 'on') { // fallback approach only when setting is 'on'
            if (!this.notebookEditor.hasModel()) {
                return; // should not happen, a cell will be executed
            }
            const kernel = this.notebookKernelService.getMatchingKernel(this.notebookEditor.textModel);
            const variables = kernel?.selected?.provideVariables(event.notebook, undefined, 'named', 0, token);
            if (!variables) {
                return;
            }
            const vars = [];
            for await (const v of variables) {
                vars.push(v);
            }
            const varNames = vars.map(v => v.name);
            const document = cell.textModel;
            if (!document) {
                return;
            }
            // Skip processing for extremely large cells
            if (document.getLineCount() > NotebookInlineVariablesController_1.MAX_CELL_LINES) {
                return;
            }
            const inlineDecorations = [];
            const processedVars = new Set();
            // Get both function ranges and comment ranges
            const functionRanges = this.getFunctionRanges(document);
            const commentedRanges = this.getCommentedRanges(document);
            const ignoredRanges = [...functionRanges, ...commentedRanges];
            const lineDecorations = new Map();
            // For each variable name found in the kernel results
            for (const varName of varNames) {
                if (processedVars.has(varName)) {
                    continue;
                }
                // Look for variable usage globally - using word boundaries to ensure exact matches
                const regex = new RegExp(`\\b${varName}\\b(?!\\w)`, 'g');
                let lastMatchOutsideIgnored = null;
                let foundMatch = false;
                // Scan lines in reverse to find last occurrence first
                const lines = document.getValue().split('\n');
                for (let lineNumber = lines.length - 1; lineNumber >= 0; lineNumber--) {
                    const line = lines[lineNumber];
                    let match;
                    while ((match = regex.exec(line)) !== null) {
                        const startIndex = match.index;
                        const pos = new Position(lineNumber + 1, startIndex + 1);
                        // Check if this position is in any ignored range (function or comment)
                        if (!this.isPositionInRanges(pos, ignoredRanges)) {
                            lastMatchOutsideIgnored = {
                                line: lineNumber + 1,
                                column: startIndex + 1
                            };
                            foundMatch = true;
                            break; // Take first match in reverse order (which is last chronologically)
                        }
                    }
                    if (foundMatch) {
                        break; // We found our last valid occurrence, no need to check earlier lines
                    }
                }
                if (lastMatchOutsideIgnored) {
                    const inlineVal = varName + ' = ' + vars.find(v => v.name === varName)?.value;
                    let lineSegments = lineDecorations.get(lastMatchOutsideIgnored.line);
                    if (!lineSegments) {
                        lineSegments = [];
                        lineDecorations.set(lastMatchOutsideIgnored.line, lineSegments);
                    }
                    if (!lineSegments.some(iv => iv.text === inlineVal)) { // de-dupe
                        lineSegments.push(new InlineSegment(lastMatchOutsideIgnored.column, inlineVal));
                    }
                }
                processedVars.add(varName);
            }
            // sort line segments and concatenate them into a decoration
            lineDecorations.forEach((segments, line) => {
                if (segments.length > 0) {
                    segments.sort((a, b) => a.column - b.column);
                    const text = segments.map(s => s.text).join(', ');
                    const editorWidth = cell.layoutInfo.editorWidth;
                    const fontInfo = cell.layoutInfo.fontInfo;
                    if (fontInfo && cell.textModel) {
                        const base = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                        const lineLength = cell.textModel.getLineLength(line);
                        const available = Math.max(0, base - lineLength);
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb', undefined, available));
                    }
                    else {
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb'));
                    }
                }
            });
            if (inlineDecorations.length > 0) {
                this.updateCellInlineDecorations(cell, inlineDecorations);
                this.initCellContentListener(cell);
            }
        }
    }
    getFunctionRanges(document) {
        return document.getLanguageId() === 'python'
            ? this.getPythonFunctionRanges(document.getValue())
            : this.getBracedFunctionRanges(document.getValue());
    }
    getPythonFunctionRanges(code) {
        const functionRanges = [];
        const lines = code.split('\n');
        let functionStartLine = -1;
        let inFunction = false;
        let pythonIndentLevel = -1;
        const pythonFunctionDeclRegex = /^(\s*)(async\s+)?(?:def\s+\w+|class\s+\w+)\s*\([^)]*\)\s*:/;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            // Check for Python function/class declarations
            const pythonMatch = line.match(pythonFunctionDeclRegex);
            if (pythonMatch) {
                if (inFunction) {
                    // If we're already in a function and find another at the same or lower indent, close the current one
                    const currentIndent = pythonMatch[1].length;
                    if (currentIndent <= pythonIndentLevel) {
                        functionRanges.push(new Range(functionStartLine + 1, 1, lineNumber, line.length + 1));
                        inFunction = false;
                    }
                }
                if (!inFunction) {
                    inFunction = true;
                    functionStartLine = lineNumber;
                    pythonIndentLevel = pythonMatch[1].length;
                }
                continue;
            }
            // Check indentation for Python functions
            if (inFunction) {
                // Skip empty lines
                if (line.trim() === '') {
                    continue;
                }
                // Get the indentation of the current line
                const currentIndent = line.match(/^\s*/)?.[0].length ?? 0;
                // If we hit a line with same or lower indentation than where the function started,
                // we've exited the function
                if (currentIndent <= pythonIndentLevel) {
                    functionRanges.push(new Range(functionStartLine + 1, 1, lineNumber, line.length + 1));
                    inFunction = false;
                    pythonIndentLevel = -1;
                }
            }
        }
        // Handle case where Python function is at the end of the document
        if (inFunction) {
            functionRanges.push(new Range(functionStartLine + 1, 1, lines.length, lines[lines.length - 1].length + 1));
        }
        return functionRanges;
    }
    getBracedFunctionRanges(code) {
        const functionRanges = [];
        const lines = code.split('\n');
        let braceDepth = 0;
        let functionStartLine = -1;
        let inFunction = false;
        const functionDeclRegex = /\b(?:function\s+\w+|(?:async\s+)?(?:\w+\s*=\s*)?\([^)]*\)\s*=>|class\s+\w+|(?:public|private|protected|static)?\s*\w+\s*\([^)]*\)\s*{)/;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            for (const char of line) {
                if (char === '{') {
                    if (!inFunction && functionDeclRegex.test(line)) {
                        inFunction = true;
                        functionStartLine = lineNumber;
                    }
                    braceDepth++;
                }
                else if (char === '}') {
                    braceDepth--;
                    if (braceDepth === 0 && inFunction) {
                        functionRanges.push(new Range(functionStartLine + 1, 1, lineNumber + 1, line.length + 1));
                        inFunction = false;
                    }
                }
            }
        }
        return functionRanges;
    }
    getCommentedRanges(document) {
        return this._getCommentedRanges(document);
    }
    _getCommentedRanges(document) {
        try {
            return this.getCommentedRangesByAccurateTokenization(document);
        }
        catch (e) {
            // Fall back to manual parsing if tokenization fails
            return this.getCommentedRangesByManualParsing(document);
        }
    }
    getCommentedRangesByAccurateTokenization(document) {
        const commentRanges = [];
        const lineCount = document.getLineCount();
        // Skip processing for extremely large documents
        if (lineCount > NotebookInlineVariablesController_1.MAX_CELL_LINES) {
            return commentRanges;
        }
        // Process each line - force tokenization if needed and process tokens in a single pass
        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            // Force tokenization if needed
            if (!document.tokenization.hasAccurateTokensForLine(lineNumber)) {
                document.tokenization.forceTokenization(lineNumber);
            }
            const lineTokens = document.tokenization.getLineTokens(lineNumber);
            // Skip lines with no tokens
            if (lineTokens.getCount() === 0) {
                continue;
            }
            let startCharacter;
            // Check each token in the line
            for (let tokenIndex = 0; tokenIndex < lineTokens.getCount(); tokenIndex++) {
                const tokenType = lineTokens.getStandardTokenType(tokenIndex);
                if (tokenType === 1 /* StandardTokenType.Comment */ || tokenType === 2 /* StandardTokenType.String */ || tokenType === 3 /* StandardTokenType.RegEx */) {
                    if (startCharacter === undefined) {
                        // Start of a comment or string
                        startCharacter = lineTokens.getStartOffset(tokenIndex);
                    }
                    const endCharacter = lineTokens.getEndOffset(tokenIndex);
                    // Check if this is the end of the comment/string section (either end of line or different token type follows)
                    const isLastToken = tokenIndex === lineTokens.getCount() - 1;
                    const nextTokenDifferent = !isLastToken &&
                        lineTokens.getStandardTokenType(tokenIndex + 1) !== tokenType;
                    if (isLastToken || nextTokenDifferent) {
                        // End of comment/string section
                        commentRanges.push(new Range(lineNumber, startCharacter + 1, lineNumber, endCharacter + 1));
                        startCharacter = undefined;
                    }
                }
                else {
                    // Reset when we hit a non-comment, non-string token
                    startCharacter = undefined;
                }
            }
        }
        return commentRanges;
    }
    getCommentedRangesByManualParsing(document) {
        const commentRanges = [];
        const lines = document.getValue().split('\n');
        const languageId = document.getLanguageId();
        // Different comment patterns by language
        const lineCommentToken = languageId === 'python' ? '#' :
            languageId === 'javascript' || languageId === 'typescript' ? '//' :
                null;
        const blockComments = (languageId === 'javascript' || languageId === 'typescript') ? { start: '/*', end: '*/' } :
            null;
        let inBlockComment = false;
        let blockCommentStartLine = -1;
        let blockCommentStartCol = -1;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            const trimmedLine = line.trim();
            // Skip empty lines
            if (trimmedLine.length === 0) {
                continue;
            }
            if (blockComments) {
                if (!inBlockComment) {
                    const startIndex = line.indexOf(blockComments.start);
                    if (startIndex !== -1) {
                        inBlockComment = true;
                        blockCommentStartLine = lineNumber;
                        blockCommentStartCol = startIndex;
                    }
                }
                if (inBlockComment) {
                    const endIndex = line.indexOf(blockComments.end);
                    if (endIndex !== -1) {
                        commentRanges.push(new Range(blockCommentStartLine + 1, blockCommentStartCol + 1, lineNumber + 1, endIndex + blockComments.end.length + 1));
                        inBlockComment = false;
                    }
                    continue;
                }
            }
            if (!inBlockComment && lineCommentToken && line.trimLeft().startsWith(lineCommentToken)) {
                const startCol = line.indexOf(lineCommentToken);
                commentRanges.push(new Range(lineNumber + 1, startCol + 1, lineNumber + 1, line.length + 1));
            }
        }
        // Handle block comment at end of file
        if (inBlockComment) {
            commentRanges.push(new Range(blockCommentStartLine + 1, blockCommentStartCol + 1, lines.length, lines[lines.length - 1].length + 1));
        }
        return commentRanges;
    }
    isPositionInRanges(position, ranges) {
        return ranges.some(range => range.containsPosition(position));
    }
    updateCellInlineDecorations(cell, decorations) {
        const oldDecorations = this.cellDecorationIds.get(cell) ?? [];
        this.cellDecorationIds.set(cell, cell.deltaModelDecorations(oldDecorations, decorations));
    }
    initCellContentListener(cell) {
        const cellModel = cell.textModel;
        if (!cellModel) {
            return; // should not happen
        }
        // Clear decorations on content change
        this.cellContentListeners.set(cell.uri, cellModel.onDidChangeContent(() => {
            this.clearCellInlineDecorations(cell);
        }));
    }
    clearCellInlineDecorations(cell) {
        const cellDecorations = this.cellDecorationIds.get(cell) ?? [];
        if (cellDecorations) {
            cell.deltaModelDecorations(cellDecorations, []);
            this.cellDecorationIds.delete(cell);
        }
        const listener = this.cellContentListeners.get(cell.uri);
        if (listener) {
            listener.dispose();
            this.cellContentListeners.delete(cell.uri);
        }
    }
    _clearNotebookInlineDecorations() {
        this.cellDecorationIds.forEach((_, cell) => {
            this.clearCellInlineDecorations(cell);
        });
    }
    clearNotebookInlineDecorations() {
        this._clearNotebookInlineDecorations();
    }
    dispose() {
        super.dispose();
        this._clearNotebookInlineDecorations();
        this.currentCancellationTokenSources.forEach(source => source.cancel());
        this.currentCancellationTokenSources.clear();
        this.cellContentListeners.forEach(listener => listener.dispose());
        this.cellContentListeners.clear();
    }
};
NotebookInlineVariablesController = NotebookInlineVariablesController_1 = __decorate([
    __param(1, INotebookKernelService),
    __param(2, INotebookExecutionStateService),
    __param(3, ILanguageFeaturesService),
    __param(4, IConfigurationService),
    __param(5, IDebugService)
], NotebookInlineVariablesController);
export { NotebookInlineVariablesController };
registerNotebookContribution(NotebookInlineVariablesController.id, NotebookInlineVariablesController);
registerAction2(class ClearNotebookInlineValues extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.clearAllInlineValues',
            title: localize('clearAllInlineValues', 'Clear All Inline Values'),
        });
    }
    runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const controller = editor.getContribution(NotebookInlineVariablesController.id);
        controller.clearNotebookInlineDecorations();
        return Promise.resolve();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL25vdGVib29rVmFyaWFibGVzL25vdGVib29rSW5saW5lVmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFJdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDeEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuRyxP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
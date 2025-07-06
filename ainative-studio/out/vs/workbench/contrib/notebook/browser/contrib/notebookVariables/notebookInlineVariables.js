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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1ZhcmlhYmxlcy9ub3RlYm9va0lubGluZVZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBSXRFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFD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
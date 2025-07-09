/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stringDiff } from '../../../base/common/diff/diff.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { computeLinks } from '../languages/linkComputer.js';
import { BasicInplaceReplace } from '../languages/supports/inplaceReplaceSupport.js';
import { createMonacoBaseAPI } from './editorBaseApi.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { UnicodeTextModelHighlighter } from './unicodeTextModelHighlighter.js';
import { DiffComputer } from '../diff/legacyLinesDiffComputer.js';
import { linesDiffComputers } from '../diff/linesDiffComputers.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { computeDefaultDocumentColors } from '../languages/defaultDocumentColorsComputer.js';
import { findSectionHeaders } from './findSectionHeaders.js';
import { WorkerTextModelSyncServer } from './textModelSync/textModelSync.impl.js';
/**
 * @internal
 */
export class EditorWorker {
    constructor(_foreignModule = null) {
        this._foreignModule = _foreignModule;
        this._workerTextModelSyncServer = new WorkerTextModelSyncServer();
    }
    dispose() {
    }
    async $ping() {
        return 'pong';
    }
    _getModel(uri) {
        return this._workerTextModelSyncServer.getModel(uri);
    }
    getModels() {
        return this._workerTextModelSyncServer.getModels();
    }
    $acceptNewModel(data) {
        this._workerTextModelSyncServer.$acceptNewModel(data);
    }
    $acceptModelChanged(uri, e) {
        this._workerTextModelSyncServer.$acceptModelChanged(uri, e);
    }
    $acceptRemovedModel(uri) {
        this._workerTextModelSyncServer.$acceptRemovedModel(uri);
    }
    async $computeUnicodeHighlights(url, options, range) {
        const model = this._getModel(url);
        if (!model) {
            return { ranges: [], hasMore: false, ambiguousCharacterCount: 0, invisibleCharacterCount: 0, nonBasicAsciiCharacterCount: 0 };
        }
        return UnicodeTextModelHighlighter.computeUnicodeHighlights(model, options, range);
    }
    async $findSectionHeaders(url, options) {
        const model = this._getModel(url);
        if (!model) {
            return [];
        }
        return findSectionHeaders(model, options);
    }
    // ---- BEGIN diff --------------------------------------------------------------------------
    async $computeDiff(originalUrl, modifiedUrl, options, algorithm) {
        const original = this._getModel(originalUrl);
        const modified = this._getModel(modifiedUrl);
        if (!original || !modified) {
            return null;
        }
        const result = EditorWorker.computeDiff(original, modified, options, algorithm);
        return result;
    }
    static computeDiff(originalTextModel, modifiedTextModel, options, algorithm) {
        const diffAlgorithm = algorithm === 'advanced' ? linesDiffComputers.getDefault() : linesDiffComputers.getLegacy();
        const originalLines = originalTextModel.getLinesContent();
        const modifiedLines = modifiedTextModel.getLinesContent();
        const result = diffAlgorithm.computeDiff(originalLines, modifiedLines, options);
        const identical = (result.changes.length > 0 ? false : this._modelsAreIdentical(originalTextModel, modifiedTextModel));
        function getLineChanges(changes) {
            return changes.map(m => ([m.original.startLineNumber, m.original.endLineNumberExclusive, m.modified.startLineNumber, m.modified.endLineNumberExclusive, m.innerChanges?.map(m => [
                    m.originalRange.startLineNumber,
                    m.originalRange.startColumn,
                    m.originalRange.endLineNumber,
                    m.originalRange.endColumn,
                    m.modifiedRange.startLineNumber,
                    m.modifiedRange.startColumn,
                    m.modifiedRange.endLineNumber,
                    m.modifiedRange.endColumn,
                ])]));
        }
        return {
            identical,
            quitEarly: result.hitTimeout,
            changes: getLineChanges(result.changes),
            moves: result.moves.map(m => ([
                m.lineRangeMapping.original.startLineNumber,
                m.lineRangeMapping.original.endLineNumberExclusive,
                m.lineRangeMapping.modified.startLineNumber,
                m.lineRangeMapping.modified.endLineNumberExclusive,
                getLineChanges(m.changes)
            ])),
        };
    }
    static _modelsAreIdentical(original, modified) {
        const originalLineCount = original.getLineCount();
        const modifiedLineCount = modified.getLineCount();
        if (originalLineCount !== modifiedLineCount) {
            return false;
        }
        for (let line = 1; line <= originalLineCount; line++) {
            const originalLine = original.getLineContent(line);
            const modifiedLine = modified.getLineContent(line);
            if (originalLine !== modifiedLine) {
                return false;
            }
        }
        return true;
    }
    async $computeDirtyDiff(originalUrl, modifiedUrl, ignoreTrimWhitespace) {
        const original = this._getModel(originalUrl);
        const modified = this._getModel(modifiedUrl);
        if (!original || !modified) {
            return null;
        }
        const originalLines = original.getLinesContent();
        const modifiedLines = modified.getLinesContent();
        const diffComputer = new DiffComputer(originalLines, modifiedLines, {
            shouldComputeCharChanges: false,
            shouldPostProcessCharChanges: false,
            shouldIgnoreTrimWhitespace: ignoreTrimWhitespace,
            shouldMakePrettyDiff: true,
            maxComputationTime: 1000
        });
        return diffComputer.computeDiff().changes;
    }
    // ---- END diff --------------------------------------------------------------------------
    // ---- BEGIN minimal edits ---------------------------------------------------------------
    static { this._diffLimit = 100000; }
    async $computeMoreMinimalEdits(modelUrl, edits, pretty) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return edits;
        }
        const result = [];
        let lastEol = undefined;
        edits = edits.slice(0).sort((a, b) => {
            if (a.range && b.range) {
                return Range.compareRangesUsingStarts(a.range, b.range);
            }
            // eol only changes should go to the end
            const aRng = a.range ? 0 : 1;
            const bRng = b.range ? 0 : 1;
            return aRng - bRng;
        });
        // merge adjacent edits
        let writeIndex = 0;
        for (let readIndex = 1; readIndex < edits.length; readIndex++) {
            if (Range.getEndPosition(edits[writeIndex].range).equals(Range.getStartPosition(edits[readIndex].range))) {
                edits[writeIndex].range = Range.fromPositions(Range.getStartPosition(edits[writeIndex].range), Range.getEndPosition(edits[readIndex].range));
                edits[writeIndex].text += edits[readIndex].text;
            }
            else {
                writeIndex++;
                edits[writeIndex] = edits[readIndex];
            }
        }
        edits.length = writeIndex + 1;
        for (let { range, text, eol } of edits) {
            if (typeof eol === 'number') {
                lastEol = eol;
            }
            if (Range.isEmpty(range) && !text) {
                // empty change
                continue;
            }
            const original = model.getValueInRange(range);
            text = text.replace(/\r\n|\n|\r/g, model.eol);
            if (original === text) {
                // noop
                continue;
            }
            // make sure diff won't take too long
            if (Math.max(text.length, original.length) > EditorWorker._diffLimit) {
                result.push({ range, text });
                continue;
            }
            // compute diff between original and edit.text
            const changes = stringDiff(original, text, pretty);
            const editOffset = model.offsetAt(Range.lift(range).getStartPosition());
            for (const change of changes) {
                const start = model.positionAt(editOffset + change.originalStart);
                const end = model.positionAt(editOffset + change.originalStart + change.originalLength);
                const newEdit = {
                    text: text.substr(change.modifiedStart, change.modifiedLength),
                    range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column }
                };
                if (model.getValueInRange(newEdit.range) !== newEdit.text) {
                    result.push(newEdit);
                }
            }
        }
        if (typeof lastEol === 'number') {
            result.push({ eol: lastEol, text: '', range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 } });
        }
        return result;
    }
    $computeHumanReadableDiff(modelUrl, edits, options) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return edits;
        }
        const result = [];
        let lastEol = undefined;
        edits = edits.slice(0).sort((a, b) => {
            if (a.range && b.range) {
                return Range.compareRangesUsingStarts(a.range, b.range);
            }
            // eol only changes should go to the end
            const aRng = a.range ? 0 : 1;
            const bRng = b.range ? 0 : 1;
            return aRng - bRng;
        });
        for (let { range, text, eol } of edits) {
            if (typeof eol === 'number') {
                lastEol = eol;
            }
            if (Range.isEmpty(range) && !text) {
                // empty change
                continue;
            }
            const original = model.getValueInRange(range);
            text = text.replace(/\r\n|\n|\r/g, model.eol);
            if (original === text) {
                // noop
                continue;
            }
            // make sure diff won't take too long
            if (Math.max(text.length, original.length) > EditorWorker._diffLimit) {
                result.push({ range, text });
                continue;
            }
            // compute diff between original and edit.text
            const originalLines = original.split(/\r\n|\n|\r/);
            const modifiedLines = text.split(/\r\n|\n|\r/);
            const diff = linesDiffComputers.getDefault().computeDiff(originalLines, modifiedLines, options);
            const start = Range.lift(range).getStartPosition();
            function addPositions(pos1, pos2) {
                return new Position(pos1.lineNumber + pos2.lineNumber - 1, pos2.lineNumber === 1 ? pos1.column + pos2.column - 1 : pos2.column);
            }
            function getText(lines, range) {
                const result = [];
                for (let i = range.startLineNumber; i <= range.endLineNumber; i++) {
                    const line = lines[i - 1];
                    if (i === range.startLineNumber && i === range.endLineNumber) {
                        result.push(line.substring(range.startColumn - 1, range.endColumn - 1));
                    }
                    else if (i === range.startLineNumber) {
                        result.push(line.substring(range.startColumn - 1));
                    }
                    else if (i === range.endLineNumber) {
                        result.push(line.substring(0, range.endColumn - 1));
                    }
                    else {
                        result.push(line);
                    }
                }
                return result;
            }
            for (const c of diff.changes) {
                if (c.innerChanges) {
                    for (const x of c.innerChanges) {
                        result.push({
                            range: Range.fromPositions(addPositions(start, x.originalRange.getStartPosition()), addPositions(start, x.originalRange.getEndPosition())),
                            text: getText(modifiedLines, x.modifiedRange).join(model.eol)
                        });
                    }
                }
                else {
                    throw new BugIndicatingError('The experimental diff algorithm always produces inner changes');
                }
            }
        }
        if (typeof lastEol === 'number') {
            result.push({ eol: lastEol, text: '', range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 } });
        }
        return result;
    }
    // ---- END minimal edits ---------------------------------------------------------------
    async $computeLinks(modelUrl) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return null;
        }
        return computeLinks(model);
    }
    // --- BEGIN default document colors -----------------------------------------------------------
    async $computeDefaultDocumentColors(modelUrl) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return null;
        }
        return computeDefaultDocumentColors(model);
    }
    // ---- BEGIN suggest --------------------------------------------------------------------------
    static { this._suggestionsLimit = 10000; }
    async $textualSuggest(modelUrls, leadingWord, wordDef, wordDefFlags) {
        const sw = new StopWatch();
        const wordDefRegExp = new RegExp(wordDef, wordDefFlags);
        const seen = new Set();
        outer: for (const url of modelUrls) {
            const model = this._getModel(url);
            if (!model) {
                continue;
            }
            for (const word of model.words(wordDefRegExp)) {
                if (word === leadingWord || !isNaN(Number(word))) {
                    continue;
                }
                seen.add(word);
                if (seen.size > EditorWorker._suggestionsLimit) {
                    break outer;
                }
            }
        }
        return { words: Array.from(seen), duration: sw.elapsed() };
    }
    // ---- END suggest --------------------------------------------------------------------------
    //#region -- word ranges --
    async $computeWordRanges(modelUrl, range, wordDef, wordDefFlags) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return Object.create(null);
        }
        const wordDefRegExp = new RegExp(wordDef, wordDefFlags);
        const result = Object.create(null);
        for (let line = range.startLineNumber; line < range.endLineNumber; line++) {
            const words = model.getLineWords(line, wordDefRegExp);
            for (const word of words) {
                if (!isNaN(Number(word.word))) {
                    continue;
                }
                let array = result[word.word];
                if (!array) {
                    array = [];
                    result[word.word] = array;
                }
                array.push({
                    startLineNumber: line,
                    startColumn: word.startColumn,
                    endLineNumber: line,
                    endColumn: word.endColumn
                });
            }
        }
        return result;
    }
    //#endregion
    async $navigateValueSet(modelUrl, range, up, wordDef, wordDefFlags) {
        const model = this._getModel(modelUrl);
        if (!model) {
            return null;
        }
        const wordDefRegExp = new RegExp(wordDef, wordDefFlags);
        if (range.startColumn === range.endColumn) {
            range = {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.endColumn + 1
            };
        }
        const selectionText = model.getValueInRange(range);
        const wordRange = model.getWordAtPosition({ lineNumber: range.startLineNumber, column: range.startColumn }, wordDefRegExp);
        if (!wordRange) {
            return null;
        }
        const word = model.getValueInRange(wordRange);
        const result = BasicInplaceReplace.INSTANCE.navigateValueSet(range, selectionText, wordRange, word, up);
        return result;
    }
    // ---- BEGIN foreign module support --------------------------------------------------------------------------
    // foreign method request
    $fmr(method, args) {
        if (!this._foreignModule || typeof this._foreignModule[method] !== 'function') {
            return Promise.reject(new Error('Missing requestHandler or method: ' + method));
        }
        try {
            return Promise.resolve(this._foreignModule[method].apply(this._foreignModule, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
}
if (typeof importScripts === 'function') {
    // Running in a web worker
    globalThis.monaco = createMonacoBaseAPI();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2ViV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvZWRpdG9yV2ViV29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUkvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDL0MsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSWpELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLDJCQUEyQixFQUE2QixNQUFNLGtDQUFrQyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxZQUFZLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUczRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RixPQUFPLEVBQTJDLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEcsT0FBTyxFQUFnQix5QkFBeUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBa0NoRzs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBS3hCLFlBQ2tCLGlCQUE2QixJQUFJO1FBQWpD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { hash, StringSHA1 } from '../../../../../base/common/hash.js';
import { Disposable, DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import * as UUID from '../../../../../base/common/uuid.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { PieceTreeTextBuffer } from '../../../../../editor/common/model/pieceTreeTextBuffer/pieceTreeTextBuffer.js';
import { createTextBuffer } from '../../../../../editor/common/model/textModel.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { NotebookCellOutputTextModel } from './notebookCellOutputTextModel.js';
import { ThrottledDelayer } from '../../../../../base/common/async.js';
import { toFormattedString } from '../../../../../base/common/jsonFormatter.js';
import { splitLines } from '../../../../../base/common/strings.js';
export class NotebookCellTextModel extends Disposable {
    get outputs() {
        return this._outputs;
    }
    get metadata() {
        return this._metadata;
    }
    set metadata(newMetadata) {
        this._metadata = newMetadata;
        this._hash = null;
        this._onDidChangeMetadata.fire();
    }
    get internalMetadata() {
        return this._internalMetadata;
    }
    set internalMetadata(newInternalMetadata) {
        const lastRunSuccessChanged = this._internalMetadata.lastRunSuccess !== newInternalMetadata.lastRunSuccess;
        newInternalMetadata = {
            ...newInternalMetadata,
            ...{ runStartTimeAdjustment: computeRunStartTimeAdjustment(this._internalMetadata, newInternalMetadata) }
        };
        this._internalMetadata = newInternalMetadata;
        this._hash = null;
        this._onDidChangeInternalMetadata.fire({ lastRunSuccessChanged });
    }
    get language() {
        return this._language;
    }
    set language(newLanguage) {
        if (this._textModel
            // 1. the language update is from workspace edit, checking if it's the same as text model's mode
            && this._textModel.getLanguageId() === this._languageService.getLanguageIdByLanguageName(newLanguage)
            // 2. the text model's mode might be the same as the `this.language`, even if the language friendly name is not the same, we should not trigger an update
            && this._textModel.getLanguageId() === this._languageService.getLanguageIdByLanguageName(this.language)) {
            return;
        }
        this._hasLanguageSetExplicitly = true;
        this._setLanguageInternal(newLanguage);
    }
    get mime() {
        return this._mime;
    }
    set mime(newMime) {
        if (this._mime === newMime) {
            return;
        }
        this._mime = newMime;
        this._hash = null;
        this._onDidChangeContent.fire('mime');
    }
    get textBuffer() {
        if (this._textBuffer) {
            return this._textBuffer;
        }
        this._textBuffer = this._register(createTextBuffer(this._source, 1 /* model.DefaultEndOfLine.LF */).textBuffer);
        this._register(this._textBuffer.onDidChangeContent(() => {
            this._hash = null;
            if (!this._textModel) {
                this._onDidChangeContent.fire('content');
            }
            this.autoDetectLanguage();
        }));
        return this._textBuffer;
    }
    get alternativeId() {
        return this._alternativeId;
    }
    get textModel() {
        return this._textModel;
    }
    set textModel(m) {
        if (this._textModel === m) {
            return;
        }
        this._textModelDisposables.clear();
        this._textModel = m;
        if (this._textModel) {
            this.setRegisteredLanguage(this._languageService, this._textModel.getLanguageId(), this.language);
            // Listen to language changes on the model
            this._textModelDisposables.add(this._textModel.onDidChangeLanguage((e) => this.setRegisteredLanguage(this._languageService, e.newLanguage, this.language)));
            this._textModelDisposables.add(this._textModel.onWillDispose(() => this.textModel = undefined));
            this._textModelDisposables.add(this._textModel.onDidChangeContent((e) => {
                if (this._textModel) {
                    this._versionId = this._textModel.getVersionId();
                    this._alternativeId = this._textModel.getAlternativeVersionId();
                }
                this._textBufferHash = null;
                this._onDidChangeContent.fire('content');
                this._onDidChangeContent.fire({ type: 'model', event: e });
            }));
            this._textModel._overwriteVersionId(this._versionId);
            this._textModel._overwriteAlternativeVersionId(this._versionId);
            this._onDidChangeTextModel.fire();
        }
    }
    setRegisteredLanguage(languageService, newLanguage, currentLanguage) {
        // The language defined in the cell might not be supported in the editor so the text model might be using the default fallback
        // If so let's not modify the language
        const isFallBackLanguage = (newLanguage === PLAINTEXT_LANGUAGE_ID || newLanguage === 'jupyter');
        if (!languageService.isRegisteredLanguageId(currentLanguage) && isFallBackLanguage) {
            // notify to display warning, but don't change the language
            this._onDidChangeLanguage.fire(currentLanguage);
        }
        else {
            this.language = newLanguage;
        }
    }
    static { this.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY = 600; }
    get hasLanguageSetExplicitly() { return this._hasLanguageSetExplicitly; }
    constructor(uri, handle, _source, _language, _mime, cellKind, outputs, metadata, internalMetadata, collapseState, transientOptions, _languageService, _languageDetectionService = undefined) {
        super();
        this.uri = uri;
        this.handle = handle;
        this._source = _source;
        this._language = _language;
        this._mime = _mime;
        this.cellKind = cellKind;
        this.collapseState = collapseState;
        this.transientOptions = transientOptions;
        this._languageService = _languageService;
        this._languageDetectionService = _languageDetectionService;
        this._onDidChangeTextModel = this._register(new Emitter());
        this.onDidChangeTextModel = this._onDidChangeTextModel.event;
        this._onDidChangeOutputs = this._register(new Emitter());
        this.onDidChangeOutputs = this._onDidChangeOutputs.event;
        this._onDidChangeOutputItems = this._register(new Emitter());
        this.onDidChangeOutputItems = this._onDidChangeOutputItems.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidChangeMetadata = this._register(new Emitter());
        this.onDidChangeMetadata = this._onDidChangeMetadata.event;
        this._onDidChangeInternalMetadata = this._register(new Emitter());
        this.onDidChangeInternalMetadata = this._onDidChangeInternalMetadata.event;
        this._onDidChangeLanguage = this._register(new Emitter());
        this.onDidChangeLanguage = this._onDidChangeLanguage.event;
        this._textBufferHash = null;
        this._hash = null;
        this._versionId = 1;
        this._alternativeId = 1;
        this._textModelDisposables = this._register(new DisposableStore());
        this._textModel = undefined;
        this.autoDetectLanguageThrottler = this._register(new ThrottledDelayer(NotebookCellTextModel.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY));
        this._autoLanguageDetectionEnabled = false;
        this._hasLanguageSetExplicitly = false;
        this._outputs = outputs.map(op => new NotebookCellOutputTextModel(op));
        this._metadata = metadata ?? {};
        this._internalMetadata = internalMetadata ?? {};
    }
    enableAutoLanguageDetection() {
        this._autoLanguageDetectionEnabled = true;
        this.autoDetectLanguage();
    }
    async autoDetectLanguage() {
        if (this._autoLanguageDetectionEnabled) {
            this.autoDetectLanguageThrottler.trigger(() => this._doAutoDetectLanguage());
        }
    }
    async _doAutoDetectLanguage() {
        if (this.hasLanguageSetExplicitly) {
            return;
        }
        const newLanguage = await this._languageDetectionService?.detectLanguage(this.uri);
        if (!newLanguage) {
            return;
        }
        if (this._textModel
            && this._textModel.getLanguageId() === this._languageService.getLanguageIdByLanguageName(newLanguage)
            && this._textModel.getLanguageId() === this._languageService.getLanguageIdByLanguageName(this.language)) {
            return;
        }
        this._setLanguageInternal(newLanguage);
    }
    _setLanguageInternal(newLanguage) {
        const newLanguageId = this._languageService.getLanguageIdByLanguageName(newLanguage);
        if (newLanguageId === null) {
            return;
        }
        if (this._textModel) {
            const languageId = this._languageService.createById(newLanguageId);
            this._textModel.setLanguage(languageId.languageId);
        }
        if (this._language === newLanguage) {
            return;
        }
        this._language = newLanguage;
        this._hash = null;
        this._onDidChangeLanguage.fire(newLanguage);
        this._onDidChangeContent.fire('language');
    }
    resetTextBuffer(textBuffer) {
        this._textBuffer = textBuffer;
    }
    getValue() {
        const fullRange = this.getFullModelRange();
        const eol = this.textBuffer.getEOL();
        if (eol === '\n') {
            return this.textBuffer.getValueInRange(fullRange, 1 /* model.EndOfLinePreference.LF */);
        }
        else {
            return this.textBuffer.getValueInRange(fullRange, 2 /* model.EndOfLinePreference.CRLF */);
        }
    }
    getTextBufferHash() {
        if (this._textBufferHash !== null) {
            return this._textBufferHash;
        }
        const shaComputer = new StringSHA1();
        const snapshot = this.textBuffer.createSnapshot(false);
        let text;
        while ((text = snapshot.read())) {
            shaComputer.update(text);
        }
        this._textBufferHash = shaComputer.digest();
        return this._textBufferHash;
    }
    getHashValue() {
        if (this._hash !== null) {
            return this._hash;
        }
        this._hash = hash([hash(this.language), this.getTextBufferHash(), this._getPersisentMetadata(), this.transientOptions.transientOutputs ? [] : this._outputs.map(op => ({
                outputs: op.outputs.map(output => ({
                    mime: output.mime,
                    data: Array.from(output.data.buffer)
                })),
                metadata: op.metadata
            }))]);
        return this._hash;
    }
    _getPersisentMetadata() {
        return getFormattedMetadataJSON(this.transientOptions.transientCellMetadata, this.metadata, this.language);
    }
    getTextLength() {
        return this.textBuffer.getLength();
    }
    getFullModelRange() {
        const lineCount = this.textBuffer.getLineCount();
        return new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
    }
    spliceNotebookCellOutputs(splice) {
        if (splice.deleteCount > 0 && splice.newOutputs.length > 0) {
            const commonLen = Math.min(splice.deleteCount, splice.newOutputs.length);
            // update
            for (let i = 0; i < commonLen; i++) {
                const currentOutput = this.outputs[splice.start + i];
                const newOutput = splice.newOutputs[i];
                this.replaceOutput(currentOutput.outputId, newOutput);
            }
            const removed = this.outputs.splice(splice.start + commonLen, splice.deleteCount - commonLen, ...splice.newOutputs.slice(commonLen));
            removed.forEach(output => output.dispose());
            this._onDidChangeOutputs.fire({ start: splice.start + commonLen, deleteCount: splice.deleteCount - commonLen, newOutputs: splice.newOutputs.slice(commonLen) });
        }
        else {
            const removed = this.outputs.splice(splice.start, splice.deleteCount, ...splice.newOutputs);
            removed.forEach(output => output.dispose());
            this._onDidChangeOutputs.fire(splice);
        }
    }
    replaceOutput(outputId, newOutputItem) {
        const outputIndex = this.outputs.findIndex(output => output.outputId === outputId);
        if (outputIndex < 0) {
            return false;
        }
        const output = this.outputs[outputIndex];
        // convert to dto and dispose the cell output model
        output.replaceData({
            outputs: newOutputItem.outputs,
            outputId: newOutputItem.outputId,
            metadata: newOutputItem.metadata
        });
        newOutputItem.dispose();
        this._onDidChangeOutputItems.fire();
        return true;
    }
    changeOutputItems(outputId, append, items) {
        const outputIndex = this.outputs.findIndex(output => output.outputId === outputId);
        if (outputIndex < 0) {
            return false;
        }
        const output = this.outputs[outputIndex];
        if (append) {
            output.appendData(items);
        }
        else {
            output.replaceData({ outputId: outputId, outputs: items, metadata: output.metadata });
        }
        this._onDidChangeOutputItems.fire();
        return true;
    }
    _outputNotEqualFastCheck(left, right) {
        if (left.length !== right.length) {
            return false;
        }
        for (let i = 0; i < this.outputs.length; i++) {
            const l = left[i];
            const r = right[i];
            if (l.outputs.length !== r.outputs.length) {
                return false;
            }
            for (let k = 0; k < l.outputs.length; k++) {
                if (l.outputs[k].mime !== r.outputs[k].mime) {
                    return false;
                }
                if (l.outputs[k].data.byteLength !== r.outputs[k].data.byteLength) {
                    return false;
                }
            }
        }
        return true;
    }
    equal(b) {
        if (this.language !== b.language) {
            return false;
        }
        if (this.outputs.length !== b.outputs.length) {
            return false;
        }
        if (this.getTextLength() !== b.getTextLength()) {
            return false;
        }
        if (!this.transientOptions.transientOutputs) {
            // compare outputs
            if (!this._outputNotEqualFastCheck(this.outputs, b.outputs)) {
                return false;
            }
        }
        return this.getHashValue() === b.getHashValue();
    }
    /**
     * Only compares
     * - language
     * - mime
     * - cellKind
     * - internal metadata (conditionally)
     * - source
     */
    fastEqual(b, ignoreMetadata) {
        if (this.language !== b.language) {
            return false;
        }
        if (this.mime !== b.mime) {
            return false;
        }
        if (this.cellKind !== b.cellKind) {
            return false;
        }
        if (!ignoreMetadata) {
            if (this.internalMetadata?.executionOrder !== b.internalMetadata?.executionOrder
                || this.internalMetadata?.lastRunSuccess !== b.internalMetadata?.lastRunSuccess
                || this.internalMetadata?.runStartTime !== b.internalMetadata?.runStartTime
                || this.internalMetadata?.runStartTimeAdjustment !== b.internalMetadata?.runStartTimeAdjustment
                || this.internalMetadata?.runEndTime !== b.internalMetadata?.runEndTime) {
                return false;
            }
        }
        // Once we attach the cell text buffer to an editor, the source of truth is the text buffer instead of the original source
        if (this._textBuffer) {
            if (!NotebookCellTextModel.linesAreEqual(this.textBuffer.getLinesContent(), b.source)) {
                return false;
            }
        }
        else if (this._source !== b.source) {
            return false;
        }
        return true;
    }
    static linesAreEqual(aLines, b) {
        const bLines = splitLines(b);
        if (aLines.length !== bLines.length) {
            return false;
        }
        for (let i = 0; i < aLines.length; i++) {
            if (aLines[i] !== bLines[i]) {
                return false;
            }
        }
        return true;
    }
    dispose() {
        dispose(this._outputs);
        // Manually release reference to previous text buffer to avoid large leaks
        // in case someone leaks a CellTextModel reference
        const emptyDisposedTextBuffer = new PieceTreeTextBuffer([], '', '\n', false, false, true, true);
        emptyDisposedTextBuffer.dispose();
        this._textBuffer = emptyDisposedTextBuffer;
        super.dispose();
    }
}
export function cloneNotebookCellTextModel(cell) {
    return {
        source: cell.getValue(),
        language: cell.language,
        mime: cell.mime,
        cellKind: cell.cellKind,
        outputs: cell.outputs.map(output => ({
            outputs: output.outputs,
            /* paste should generate new outputId */ outputId: UUID.generateUuid()
        })),
        metadata: {}
    };
}
function computeRunStartTimeAdjustment(oldMetadata, newMetadata) {
    if (oldMetadata.runStartTime !== newMetadata.runStartTime && typeof newMetadata.runStartTime === 'number') {
        const offset = Date.now() - newMetadata.runStartTime;
        return offset < 0 ? Math.abs(offset) : 0;
    }
    else {
        return newMetadata.runStartTimeAdjustment;
    }
}
export function getFormattedMetadataJSON(transientCellMetadata, metadata, language, sortKeys) {
    let filteredMetadata = {};
    if (transientCellMetadata) {
        const keys = new Set([...Object.keys(metadata)]);
        for (const key of keys) {
            if (!(transientCellMetadata[key])) {
                filteredMetadata[key] = metadata[key];
            }
        }
    }
    else {
        filteredMetadata = metadata;
    }
    const obj = {
        language,
        ...filteredMetadata
    };
    // Give preference to the language we have been given.
    // Metadata can contain `language` due to round-tripping of cell metadata.
    // I.e. we add it here, and then from SCM when we revert the cell, we get this same metadata back with the `language` property.
    if (language) {
        obj.language = language;
    }
    const metadataSource = toFormattedString(sortKeys ? sortObjectPropertiesRecursively(obj) : obj, {});
    return metadataSource;
}
/**
 * Sort the JSON to ensure when diffing, the JSON keys are sorted & matched correctly in diff view.
 */
export function sortObjectPropertiesRecursively(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectPropertiesRecursively);
    }
    if (obj !== undefined && obj !== null && typeof obj === 'object' && Object.keys(obj).length > 0) {
        return Object.keys(obj)
            .sort()
            .reduce((sortedObj, prop) => {
            sortedObj[prop] = sortObjectPropertiesRecursively(obj[prop]);
            return sortedObj;
        }, {});
    }
    return obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsVGV4dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9tb2RlbC9ub3RlYm9va0NlbGxUZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFL0YsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDcEgsT0FBTyxFQUFFLGdCQUFnQixFQUFhLE1BQU0saURBQWlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRW5FLE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO0lBdUJwRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUlELElBQUks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
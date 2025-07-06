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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsVGV4dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL21vZGVsL25vdGVib29rQ2VsbFRleHRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUvRixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWEsTUFBTSxpREFBaUQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUVoRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUvRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFbkUsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7SUF1QnBELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBSUQsSUFBSSxR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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toFormattedString } from '../../../../../base/common/jsonFormatter.js';
import { NotebookCellsChangeType, NotebookMetadataUri } from '../notebookCommon.js';
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { createTextBuffer } from '../../../../../editor/common/model/textModel.js';
export function getFormattedNotebookMetadataJSON(transientMetadata, metadata) {
    let filteredMetadata = {};
    if (transientMetadata) {
        const keys = new Set([...Object.keys(metadata)]);
        for (const key of keys) {
            if (!(transientMetadata[key])) {
                filteredMetadata[key] = metadata[key];
            }
        }
    }
    else {
        filteredMetadata = metadata;
    }
    const metadataSource = toFormattedString(filteredMetadata, {});
    return metadataSource;
}
export class NotebookDocumentMetadataTextModel extends Disposable {
    get metadata() {
        return this.notebookModel.metadata;
    }
    get textBuffer() {
        if (this._textBuffer) {
            return this._textBuffer;
        }
        const source = getFormattedNotebookMetadataJSON(this.notebookModel.transientOptions.transientDocumentMetadata, this.metadata);
        this._textBuffer = this._register(createTextBuffer(source, 1 /* DefaultEndOfLine.LF */).textBuffer);
        this._register(this._textBuffer.onDidChangeContent(() => {
            this._onDidChange.fire();
        }));
        return this._textBuffer;
    }
    constructor(notebookModel) {
        super();
        this.notebookModel = notebookModel;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._textBufferHash = null;
        this.uri = NotebookMetadataUri.generate(this.notebookModel.uri);
        this._register(this.notebookModel.onDidChangeContent((e) => {
            if (e.rawEvents.some(event => event.kind === NotebookCellsChangeType.ChangeDocumentMetadata || event.kind === NotebookCellsChangeType.ModelChange)) {
                this._textBuffer?.dispose();
                this._textBuffer = undefined;
                this._textBufferHash = null;
                this._onDidChange.fire();
            }
        }));
    }
    getHash() {
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
    getValue() {
        const fullRange = this.getFullModelRange();
        const eol = this.textBuffer.getEOL();
        if (eol === '\n') {
            return this.textBuffer.getValueInRange(fullRange, 1 /* EndOfLinePreference.LF */);
        }
        else {
            return this.textBuffer.getValueInRange(fullRange, 2 /* EndOfLinePreference.CRLF */);
        }
    }
    getFullModelRange() {
        const lineCount = this.textBuffer.getLineCount();
        return new Range(1, 1, lineCount, this.textBuffer.getLineLength(lineCount) + 1);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNZXRhZGF0YVRleHRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbW9kZWwvbm90ZWJvb2tNZXRhZGF0YVRleHRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRixPQUFPLEVBQWdGLHVCQUF1QixFQUE0QixtQkFBbUIsRUFBNkIsTUFBTSxzQkFBc0IsQ0FBQztBQUN2TixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFbkYsTUFBTSxVQUFVLGdDQUFnQyxDQUFDLGlCQUF3RCxFQUFFLFFBQWtDO0lBQzVJLElBQUksZ0JBQWdCLEdBQTJCLEVBQUUsQ0FBQztJQUVsRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUMsR0FBaUMsQ0FBQyxDQUFDLEVBQ3pELENBQUM7Z0JBQ0YsZ0JBQWdCLENBQUMsR0FBRyxD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
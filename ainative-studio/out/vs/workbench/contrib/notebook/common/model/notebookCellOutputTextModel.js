/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { compressOutputItemStreams, isTextStreamMime } from '../notebookCommon.js';
export class NotebookCellOutputTextModel extends Disposable {
    get outputs() {
        return this._rawOutput.outputs || [];
    }
    get metadata() {
        return this._rawOutput.metadata;
    }
    get outputId() {
        return this._rawOutput.outputId;
    }
    get alternativeOutputId() {
        return this._alternativeOutputId;
    }
    get versionId() {
        return this._versionId;
    }
    constructor(_rawOutput) {
        super();
        this._rawOutput = _rawOutput;
        this._onDidChangeData = this._register(new Emitter());
        this.onDidChangeData = this._onDidChangeData.event;
        this._versionId = 0;
        // mime: versionId: buffer length
        this.versionedBufferLengths = {};
        this._alternativeOutputId = this._rawOutput.outputId;
    }
    replaceData(rawData) {
        this.versionedBufferLengths = {};
        this._rawOutput = rawData;
        this.optimizeOutputItems();
        this._versionId = this._versionId + 1;
        this._onDidChangeData.fire();
    }
    appendData(items) {
        this.trackBufferLengths();
        this._rawOutput.outputs.push(...items);
        this.optimizeOutputItems();
        this._versionId = this._versionId + 1;
        this._onDidChangeData.fire();
    }
    trackBufferLengths() {
        this.outputs.forEach(output => {
            if (isTextStreamMime(output.mime)) {
                if (!this.versionedBufferLengths[output.mime]) {
                    this.versionedBufferLengths[output.mime] = {};
                }
                this.versionedBufferLengths[output.mime][this.versionId] = output.data.byteLength;
            }
        });
    }
    appendedSinceVersion(versionId, mime) {
        const bufferLength = this.versionedBufferLengths[mime]?.[versionId];
        const output = this.outputs.find(output => output.mime === mime);
        if (bufferLength && output) {
            return output.data.slice(bufferLength);
        }
        return undefined;
    }
    optimizeOutputItems() {
        if (this.outputs.length > 1 && this.outputs.every(item => isTextStreamMime(item.mime))) {
            // Look for the mimes in the items, and keep track of their order.
            // Merge the streams into one output item, per mime type.
            const mimeOutputs = new Map();
            const mimeTypes = [];
            this.outputs.forEach(item => {
                let items;
                if (mimeOutputs.has(item.mime)) {
                    items = mimeOutputs.get(item.mime);
                }
                else {
                    items = [];
                    mimeOutputs.set(item.mime, items);
                    mimeTypes.push(item.mime);
                }
                items.push(item.data.buffer);
            });
            this.outputs.length = 0;
            mimeTypes.forEach(mime => {
                const compressionResult = compressOutputItemStreams(mimeOutputs.get(mime));
                this.outputs.push({
                    mime,
                    data: compressionResult.data
                });
                if (compressionResult.didCompression) {
                    // we can't rely on knowing buffer lengths if we've erased previous lines
                    this.versionedBufferLengths = {};
                }
            });
        }
    }
    asDto() {
        return {
            // data: this._data,
            metadata: this._rawOutput.metadata,
            outputs: this._rawOutput.outputs,
            outputId: this._rawOutput.outputId
        };
    }
    bumpVersion() {
        this._versionId = this._versionId + 1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsT3V0cHV0VGV4dE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9tb2RlbC9ub3RlYm9va0NlbGxPdXRwdXRUZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQTJDLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFNUgsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQVU7SUFLMUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7SUFDakMsQ0FBQztJQU9ELElBQUksbUJBQW1CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ2xDLENBQUM7SUFJRCxJQUFJLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVELFlBQ1MsVUFBc0I7UUFFOUIsS0FBSyxFQUFFLENBQUM7UUFGQSxlQUFVLEdBQVYsVUFBVSxDQUFZO1FBL0J2QixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUMvRCxvQkFBZSxH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
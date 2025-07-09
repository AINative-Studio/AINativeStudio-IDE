/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileOperationError } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { areFunctions, isUndefinedOrNull } from '../../../../base/common/types.js';
export const ITextFileService = createDecorator('textFileService');
export var TextFileOperationResult;
(function (TextFileOperationResult) {
    TextFileOperationResult[TextFileOperationResult["FILE_IS_BINARY"] = 0] = "FILE_IS_BINARY";
})(TextFileOperationResult || (TextFileOperationResult = {}));
export class TextFileOperationError extends FileOperationError {
    static isTextFileOperationError(obj) {
        return obj instanceof Error && !isUndefinedOrNull(obj.textFileOperationResult);
    }
    constructor(message, textFileOperationResult, options) {
        super(message, 10 /* FileOperationResult.FILE_OTHER_ERROR */);
        this.textFileOperationResult = textFileOperationResult;
        this.options = options;
    }
}
/**
 * States the text file editor model can be in.
 */
export var TextFileEditorModelState;
(function (TextFileEditorModelState) {
    /**
     * A model is saved.
     */
    TextFileEditorModelState[TextFileEditorModelState["SAVED"] = 0] = "SAVED";
    /**
     * A model is dirty.
     */
    TextFileEditorModelState[TextFileEditorModelState["DIRTY"] = 1] = "DIRTY";
    /**
     * A model is currently being saved but this operation has not completed yet.
     */
    TextFileEditorModelState[TextFileEditorModelState["PENDING_SAVE"] = 2] = "PENDING_SAVE";
    /**
     * A model is in conflict mode when changes cannot be saved because the
     * underlying file has changed. Models in conflict mode are always dirty.
     */
    TextFileEditorModelState[TextFileEditorModelState["CONFLICT"] = 3] = "CONFLICT";
    /**
     * A model is in orphan state when the underlying file has been deleted.
     */
    TextFileEditorModelState[TextFileEditorModelState["ORPHAN"] = 4] = "ORPHAN";
    /**
     * Any error that happens during a save that is not causing the CONFLICT state.
     * Models in error mode are always dirty.
     */
    TextFileEditorModelState[TextFileEditorModelState["ERROR"] = 5] = "ERROR";
})(TextFileEditorModelState || (TextFileEditorModelState = {}));
export var TextFileResolveReason;
(function (TextFileResolveReason) {
    TextFileResolveReason[TextFileResolveReason["EDITOR"] = 1] = "EDITOR";
    TextFileResolveReason[TextFileResolveReason["REFERENCE"] = 2] = "REFERENCE";
    TextFileResolveReason[TextFileResolveReason["OTHER"] = 3] = "OTHER";
})(TextFileResolveReason || (TextFileResolveReason = {}));
export var EncodingMode;
(function (EncodingMode) {
    /**
     * Instructs the encoding support to encode the object with the provided encoding
     */
    EncodingMode[EncodingMode["Encode"] = 0] = "Encode";
    /**
     * Instructs the encoding support to decode the object with the provided encoding
     */
    EncodingMode[EncodingMode["Decode"] = 1] = "Decode";
})(EncodingMode || (EncodingMode = {}));
export function isTextFileEditorModel(model) {
    const candidate = model;
    return areFunctions(candidate.setEncoding, candidate.getEncoding, candidate.save, candidate.revert, candidate.isDirty, candidate.getLanguageId);
}
export function snapshotToString(snapshot) {
    const chunks = [];
    let chunk;
    while (typeof (chunk = snapshot.read()) === 'string') {
        chunks.push(chunk);
    }
    return chunks.join('');
}
export function stringToSnapshot(value) {
    let done = false;
    return {
        read() {
            if (!done) {
                done = true;
                return value;
            }
            return null;
        }
    };
}
export function toBufferOrReadable(value) {
    if (typeof value === 'undefined') {
        return undefined;
    }
    if (typeof value === 'string') {
        return VSBuffer.fromString(value);
    }
    return {
        read: () => {
            const chunk = value.read();
            if (typeof chunk === 'string') {
                return VSBuffer.fromString(chunk);
            }
            return null;
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dGZpbGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vdGV4dGZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBdUUsa0JBQWtCLEVBQWdFLE1BQU0sNENBQTRDLENBQUM7QUFDbk4sT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzdGLE9BQU8sRUFBRSxRQUFRLEVBQTRDLE1BQU0sbUNBQW1DLENBQUM7QUFDdkcsT0FBTyxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBT25GLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FBQztBQWlKckYsTUFBTSxDQUFOLElBQWtCLHVCQUVqQjtBQUZELFdBQWtCLHVCQUF1QjtJQUN4Qyx5RkFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUZpQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBRXhDO0FBRUQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGtCQUFrQjtJQUU3RCxNQUFNLENBQUMsd0JBQXdCLENBQUMsR0FBWTtRQUMzQyxPQUFPLEdBQUcsWUFBWSxLQUFLLElBQUksQ0FBQyxpQkFBaUIsQ0FBRSxHQUE4QixDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDNUcsQ0FBQztJQUlELFlBQ0MsT0FBZSxFQUNSLHVCQUFnRCxFQUN2RCxPQUFzRDtRQUV0RCxLQUFLLENBQUMsT0FBTyxnREFBdUMsQ0FBQztRQUg5Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQXlCO1FBS3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQXVCRDs7R0FFRztBQUNI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
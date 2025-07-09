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
var FilePromptContentProvider_1;
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { OpenFailed, NotPromptFile, ResolveError, FolderReference } from '../../promptFileReferenceErrors.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
/**
 * Prompt contents provider for a file on the disk referenced by the provided {@linkcode URI}.
 */
let FilePromptContentProvider = FilePromptContentProvider_1 = class FilePromptContentProvider extends PromptContentsProviderBase {
    constructor(uri, fileService) {
        super();
        this.uri = uri;
        this.fileService = fileService;
        // make sure the object is updated on file changes
        this._register(this.fileService.onDidFilesChange((event) => {
            // if file was added or updated, forward the event to
            // the `getContentsStream()` produce a new stream for file contents
            if (event.contains(this.uri, 1 /* FileChangeType.ADDED */, 0 /* FileChangeType.UPDATED */)) {
                // we support only full file parsing right now because
                // the event doesn't contain a list of changed lines
                return this.onChangeEmitter.fire('full');
            }
            // if file was deleted, forward the event to
            // the `getContentsStream()` produce an error
            if (event.contains(this.uri, 2 /* FileChangeType.DELETED */)) {
                return this.onChangeEmitter.fire(event);
            }
        }));
    }
    /**
     * Creates a stream of lines from the file based on the changes listed in
     * the provided event.
     *
     * @param event - event that describes the changes in the file; `'full'` is
     * 				  the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        assert(!cancellationToken?.isCancellationRequested, new CancellationError());
        // get the binary stream of the file contents
        let fileStream;
        try {
            // ensure that the referenced URI points to a file before
            // trying to get a stream for its contents
            const info = await this.fileService.resolve(this.uri);
            // validate that the cancellation was not yet requested
            assert(!cancellationToken?.isCancellationRequested, new CancellationError());
            assert(info.isFile, new FolderReference(this.uri));
            fileStream = await this.fileService.readFileStream(this.uri);
        }
        catch (error) {
            if (error instanceof ResolveError) {
                throw error;
            }
            throw new OpenFailed(this.uri, error);
        }
        assertDefined(fileStream, new OpenFailed(this.uri, 'Failed to open file stream.'));
        // after the promise above complete, this object can be already disposed or
        // the cancellation could be requested, in that case destroy the stream and
        // throw cancellation error
        if (this.disposed || cancellationToken?.isCancellationRequested) {
            fileStream.value.destroy();
            throw new CancellationError();
        }
        // if URI doesn't point to a prompt snippet file, don't try to resolve it
        if (isPromptFile(this.uri) === false) {
            throw new NotPromptFile(this.uri);
        }
        return fileStream.value;
    }
    createNew(promptContentsSource) {
        return new FilePromptContentProvider_1(promptContentsSource.uri, this.fileService);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `file-prompt-contents-provider:${this.uri.path}`;
    }
};
FilePromptContentProvider = FilePromptContentProvider_1 = __decorate([
    __param(1, IFileService)
], FilePromptContentProvider);
export { FilePromptContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbnRlbnRQcm92aWRlcnMvZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RyxPQUFPLEVBQW9DLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxIOztHQUVHO0FBQ0ksSUFBTSx5QkFBeUIsaUNBQS9CLE1BQU0seUJBQTBCLFNBQVEsMEJBQTRDO0lBQzFGLFlBQ2lCLEdBQVEsRUFDTyxXQUF5QjtRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQUhRLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDTyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUl4RCxrREFBa0Q7UUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDM0MscURBQXFEO1lBQ3JELG1FQUFtRTtZ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
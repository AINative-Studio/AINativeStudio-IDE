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
var ChatEditingNotebookFileSystemProvider_1;
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { FileType, IFileService } from '../../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookService } from '../../../../notebook/common/notebookService.js';
import { IChatEditingService } from '../../../common/chatEditingService.js';
import { ChatEditingNotebookSnapshotScheme, deserializeSnapshot } from './chatEditingModifiedNotebookSnapshot.js';
import { ChatEditingSession } from '../chatEditingSession.js';
let ChatEditingNotebookFileSystemProviderContrib = class ChatEditingNotebookFileSystemProviderContrib extends Disposable {
    static { this.ID = 'chatEditingNotebookFileSystemProviderContribution'; }
    constructor(fileService, instantiationService) {
        super();
        this.fileService = fileService;
        const fileSystemProvider = instantiationService.createInstance(ChatEditingNotebookFileSystemProvider);
        this._register(this.fileService.registerProvider(ChatEditingNotebookSnapshotScheme, fileSystemProvider));
    }
};
ChatEditingNotebookFileSystemProviderContrib = __decorate([
    __param(0, IFileService),
    __param(1, IInstantiationService)
], ChatEditingNotebookFileSystemProviderContrib);
export { ChatEditingNotebookFileSystemProviderContrib };
let ChatEditingNotebookFileSystemProvider = class ChatEditingNotebookFileSystemProvider {
    static { ChatEditingNotebookFileSystemProvider_1 = this; }
    static { this.registeredFiles = new ResourceMap(); }
    static registerFile(resource, buffer) {
        ChatEditingNotebookFileSystemProvider_1.registeredFiles.set(resource, buffer);
        return {
            dispose() {
                if (ChatEditingNotebookFileSystemProvider_1.registeredFiles.get(resource) === buffer) {
                    ChatEditingNotebookFileSystemProvider_1.registeredFiles.delete(resource);
                }
            }
        };
    }
    constructor(_chatEditingService, notebookService) {
        this._chatEditingService = _chatEditingService;
        this.notebookService = notebookService;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ | 16384 /* FileSystemProviderCapabilities.FileAtomicRead */ | 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    watch(_resource, _opts) {
        return Disposable.None;
    }
    async stat(_resource) {
        return {
            type: FileType.File,
            ctime: 0,
            mtime: 0,
            size: 0
        };
    }
    mkdir(_resource) {
        throw new Error('Method not implemented1.');
    }
    readdir(_resource) {
        throw new Error('Method not implemented2.');
    }
    delete(_resource, _opts) {
        throw new Error('Method not implemented3.');
    }
    rename(_from, _to, _opts) {
        throw new Error('Method not implemented4.');
    }
    copy(_from, _to, _opts) {
        throw new Error('Method not implemented5.');
    }
    async readFile(resource) {
        const buffer = ChatEditingNotebookFileSystemProvider_1.registeredFiles.get(resource);
        if (buffer) {
            return buffer.buffer;
        }
        const queryData = JSON.parse(resource.query);
        if (!queryData.viewType) {
            throw new Error('File not found, viewType not found');
        }
        const session = this._chatEditingService.getEditingSession(queryData.sessionId);
        if (!(session instanceof ChatEditingSession) || !queryData.requestId) {
            throw new Error('File not found, session not found');
        }
        const snapshotEntry = session.getSnapshot(queryData.requestId, queryData.undoStop || undefined, resource);
        if (!snapshotEntry) {
            throw new Error('File not found, snapshot not found');
        }
        const { data } = deserializeSnapshot(snapshotEntry.current);
        const { serializer } = await this.notebookService.withNotebookDataProvider(queryData.viewType);
        return serializer.notebookToData(data).then(s => s.buffer);
    }
    writeFile(__resource, _content, _opts) {
        throw new Error('Method not implemented7.');
    }
    readFileStream(__resource, _opts, _token) {
        throw new Error('Method not implemented8.');
    }
    open(__resource, _opts) {
        throw new Error('Method not implemented9.');
    }
    close(_fd) {
        throw new Error('Method not implemented10.');
    }
    read(_fd, _pos, _data, _offset, _length) {
        throw new Error('Method not implemented11.');
    }
    write(_fd, _pos, _data, _offset, _length) {
        throw new Error('Method not implemented12.');
    }
    cloneFile(_from, __to) {
        throw new Error('Method not implemented13.');
    }
};
ChatEditingNotebookFileSystemProvider = ChatEditingNotebookFileSystemProvider_1 = __decorate([
    __param(0, IChatEditingService),
    __param(1, INotebookService)
], ChatEditingNotebookFileSystemProvider);
export { ChatEditingNotebookFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvbm90ZWJvb2svY2hhdEVkaXRpbmdOb3RlYm9va0ZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHbkUsT0FBTyxFQUFrQyxRQUFRLEVBQW9HLFlBQVksRUFBZ0UsTUFBTSxrREFBa0QsQ0FBQztBQUMxUixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNsSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUd2RCxJQUFNLDRDQUE0QyxHQUFsRCxNQUFNLDRDQUE2QyxTQUFRLFVBQVU7YUFDcEUsT0FBRSxHQUFHLG1EQUFtRCxBQUF0RCxDQUF1RDtJQUNoRSxZQUNnQyxXQUF5QixFQUNqQyxvQkFBMkM7UUFHbEUsS0FBSyxFQUFFLENBQUM7UUFKdUIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFLeEQsTUFBTSxrQkFBa0Is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
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
var ChatEditingTextModelContentProvider_1;
import { URI } from '../../../../../base/common/uri.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { chatEditingSnapshotScheme } from '../../common/chatEditingService.js';
import { ChatEditingSession } from './chatEditingSession.js';
let ChatEditingTextModelContentProvider = class ChatEditingTextModelContentProvider {
    static { ChatEditingTextModelContentProvider_1 = this; }
    static { this.scheme = 'chat-editing-text-model'; }
    static getFileURI(chatSessionId, documentId, path) {
        return URI.from({
            scheme: ChatEditingTextModelContentProvider_1.scheme,
            path,
            query: JSON.stringify({ kind: 'doc', documentId, chatSessionId }),
        });
    }
    constructor(_chatEditingService, _modelService) {
        this._chatEditingService = _chatEditingService;
        this._modelService = _modelService;
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const data = JSON.parse(resource.query);
        const session = this._chatEditingService.getEditingSession(data.chatSessionId);
        const entry = session?.entries.get().find(candidate => candidate.entryId === data.documentId);
        if (!entry) {
            return null;
        }
        return this._modelService.getModel(entry.originalURI);
    }
};
ChatEditingTextModelContentProvider = ChatEditingTextModelContentProvider_1 = __decorate([
    __param(1, IModelService)
], ChatEditingTextModelContentProvider);
export { ChatEditingTextModelContentProvider };
let ChatEditingSnapshotTextModelContentProvider = class ChatEditingSnapshotTextModelContentProvider {
    static getSnapshotFileURI(chatSessionId, requestId, undoStop, path) {
        return URI.from({
            scheme: chatEditingSnapshotScheme,
            path,
            query: JSON.stringify({ sessionId: chatSessionId, requestId: requestId ?? '', undoStop: undoStop ?? '' }),
        });
    }
    constructor(_chatEditingService, _modelService) {
        this._chatEditingService = _chatEditingService;
        this._modelService = _modelService;
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const data = JSON.parse(resource.query);
        const session = this._chatEditingService.getEditingSession(data.sessionId);
        if (!(session instanceof ChatEditingSession) || !data.requestId) {
            return null;
        }
        return session.getSnapshotModel(data.requestId, data.undoStop || undefined, resource);
    }
};
ChatEditingSnapshotTextModelContentProvider = __decorate([
    __param(1, IModelService)
], ChatEditingSnapshotTextModelContentProvider);
export { ChatEditingSnapshotTextModelContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdUZXh0TW9kZWxDb250ZW50UHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ1RleHRNb2RlbENvbnRlbnRQcm92aWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsT0FBTyxFQUFFLHlCQUF5QixFQUF1QixNQUFNLG9DQUFvQyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBSXRELElBQU0sbUNBQW1DLEdBQXpDLE1BQU0sbUNBQW1DOzthQUN4QixXQUFNLEdBQUcseUJBQXlCLEFBQTVCLENBQTZCO0lBRW5ELE1BQU0sQ0FBQyxVQUFVLENBQUMsYUFBcUIsRUFBRSxVQUFrQixFQUFFLElBQVk7UUFDL0UsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2YsTUFBTSxFQUFFLHFDQUFtQyxDQUFDLE1BQU07WUFDbEQsSUFBSTtZQUNKLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFpRCxDQUFDO1NBQ2hILENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUNrQixtQkFBd0MsRUFDekIsYUFBNEI7UUFEM0Msd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN6QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtJQUN6RCxDQUFDO0lBRUwsS0FBSyxDQUFDLGtCQUFrQixD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
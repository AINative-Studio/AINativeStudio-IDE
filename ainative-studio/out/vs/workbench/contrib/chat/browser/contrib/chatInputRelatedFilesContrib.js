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
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { autorun } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatWidgetService } from '../chat.js';
let ChatRelatedFilesContribution = class ChatRelatedFilesContribution extends Disposable {
    static { this.ID = 'chat.relatedFilesWorkingSet'; }
    constructor(chatEditingService, chatWidgetService) {
        super();
        this.chatEditingService = chatEditingService;
        this.chatWidgetService = chatWidgetService;
        this.chatEditingSessionDisposables = new Map();
        this._register(autorun((reader) => {
            const sessions = this.chatEditingService.editingSessionsObs.read(reader);
            sessions.forEach(session => {
                const widget = this.chatWidgetService.getWidgetBySessionId(session.chatSessionId);
                if (widget && !this.chatEditingSessionDisposables.has(session.chatSessionId)) {
                    this._handleNewEditingSession(session, widget);
                }
            });
        }));
    }
    _updateRelatedFileSuggestions(currentEditingSession, widget) {
        if (this._currentRelatedFilesRetrievalOperation) {
            return;
        }
        const workingSetEntries = currentEditingSession.entries.get();
        if (workingSetEntries.length > 0 || widget.attachmentModel.fileAttachments.length === 0) {
            // Do this only for the initial working set state
            return;
        }
        this._currentRelatedFilesRetrievalOperation = this.chatEditingService.getRelatedFiles(currentEditingSession.chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None)
            .then((files) => {
            if (!files?.length || !widget.viewModel?.sessionId || !widget.input.relatedFiles) {
                return;
            }
            const currentEditingSession = this.chatEditingService.getEditingSession(widget.viewModel.sessionId);
            if (!currentEditingSession || currentEditingSession.entries.get().length) {
                return; // Might have disposed while we were calculating
            }
            const existingFiles = new ResourceSet([...widget.attachmentModel.fileAttachments, ...widget.input.relatedFiles.removedFiles]);
            if (!existingFiles.size) {
                return;
            }
            // Pick up to 2 related files
            const newSuggestions = new ResourceMap();
            for (const group of files) {
                for (const file of group.files) {
                    if (newSuggestions.size >= 2) {
                        break;
                    }
                    if (existingFiles.has(file.uri)) {
                        continue;
                    }
                    newSuggestions.set(file.uri, localize('relatedFile', "{0} (Suggested)", file.description));
                    existingFiles.add(file.uri);
                }
            }
            widget.input.relatedFiles.value = [...newSuggestions.entries()].map(([uri, description]) => ({ uri, description }));
        })
            .finally(() => {
            this._currentRelatedFilesRetrievalOperation = undefined;
        });
    }
    _handleNewEditingSession(currentEditingSession, widget) {
        const disposableStore = new DisposableStore();
        disposableStore.add(currentEditingSession.onDidDispose(() => {
            disposableStore.clear();
        }));
        this._updateRelatedFileSuggestions(currentEditingSession, widget);
        const onDebouncedType = Event.debounce(widget.inputEditor.onDidChangeModelContent, () => null, 3000);
        disposableStore.add(onDebouncedType(() => {
            this._updateRelatedFileSuggestions(currentEditingSession, widget);
        }));
        disposableStore.add(widget.attachmentModel.onDidChangeContext(() => {
            this._updateRelatedFileSuggestions(currentEditingSession, widget);
        }));
        disposableStore.add(currentEditingSession.onDidDispose(() => {
            disposableStore.dispose();
        }));
        disposableStore.add(widget.onDidAcceptInput(() => {
            widget.input.relatedFiles?.clear();
            this._updateRelatedFileSuggestions(currentEditingSession, widget);
        }));
        this.chatEditingSessionDisposables.set(currentEditingSession.chatSessionId, disposableStore);
    }
    dispose() {
        for (const store of this.chatEditingSessionDisposables.values()) {
            store.dispose();
        }
        super.dispose();
    }
};
ChatRelatedFilesContribution = __decorate([
    __param(0, IChatEditingService),
    __param(1, IChatWidgetService)
], ChatRelatedFilesContribution);
export { ChatRelatedFilesContribution };
export class ChatRelatedFiles extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._removedFiles = new ResourceSet();
        this._value = [];
    }
    get removedFiles() {
        return this._removedFiles;
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this._value = value;
        this._onDidChange.fire();
    }
    remove(uri) {
        this._value = this._value.filter(file => !isEqual(file.uri, uri));
        this._removedFiles.add(uri);
        this._onDidChange.fire();
    }
    clearRemovedFiles() {
        this._removedFiles.clear();
    }
    clear() {
        this._value = [];
        this._removedFiles.clear();
        this._onDidChange.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UmVsYXRlZEZpbGVzQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXRJbnB1dFJlbGF0ZWRGaWxlc0NvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxFQUFFLG1CQUFtQixFQUF1QixNQUFNLG9DQUFvQyxDQUFDO0FBQzlGLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV0RCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDM0MsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFpQztJQUtuRCxZQUNzQixrQkFBd0QsRUFDekQsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBSDhCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDeEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUwxRCxrQ0FBNkIs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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UmVsYXRlZEZpbGVzQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0SW5wdXRSZWxhdGVkRmlsZXNDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWpELE9BQU8sRUFBRSxtQkFBbUIsRUFBdUIsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFdEQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO2FBQzNDLE9BQUUsR0FBRyw2QkFBNkIsQUFBaEMsQ0FBaUM7SUFLbkQsWUFDc0Isa0JBQXdELEVBQ3pELGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQUg4Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3hDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFMMUQsa0NBQTZC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
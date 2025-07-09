var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, observableFromEvent } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
export const ctxIsGlobalEditingSession = new RawContextKey('chatEdits.isGlobalEditingSession', undefined, localize('chat.ctxEditSessionIsGlobal', "The current editor is part of the global edit session"));
export const ctxHasEditorModification = new RawContextKey('chatEdits.hasEditorModifications', undefined, localize('chat.hasEditorModifications', "The current editor contains chat modifications"));
export const ctxReviewModeEnabled = new RawContextKey('chatEdits.isReviewModeEnabled', true, localize('chat.ctxReviewModeEnabled', "Review mode for chat changes is enabled"));
export const ctxHasRequestInProgress = new RawContextKey('chatEdits.isRequestInProgress', false, localize('chat.ctxHasRequestInProgress', "The current editor shows a file from an edit session which is still in progress"));
export const ctxRequestCount = new RawContextKey('chatEdits.requestCount', 0, localize('chatEdits.requestCount', "The number of turns the editing session in this editor has"));
let ChatEditingEditorContextKeys = class ChatEditingEditorContextKeys {
    static { this.ID = 'chat.edits.editorContextKeys'; }
    constructor(instaService, editorGroupsService) {
        this._store = new DisposableStore();
        const editorGroupCtx = this._store.add(new DisposableMap());
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        this._store.add(autorun(r => {
            const toDispose = new Set(editorGroupCtx.keys());
            for (const group of editorGroups.read(r)) {
                toDispose.delete(group);
                if (editorGroupCtx.has(group)) {
                    continue;
                }
                editorGroupCtx.set(group, instaService.createInstance(ContextKeyGroup, group));
            }
            for (const item of toDispose) {
                editorGroupCtx.deleteAndDispose(item);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingEditorContextKeys = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorGroupsService)
], ChatEditingEditorContextKeys);
export { ChatEditingEditorContextKeys };
let ContextKeyGroup = class ContextKeyGroup {
    constructor(group, inlineChatSessionService, chatEditingService, chatService) {
        this._store = new DisposableStore();
        this._ctxIsGlobalEditingSession = ctxIsGlobalEditingSession.bindTo(group.scopedContextKeyService);
        this._ctxHasEditorModification = ctxHasEditorModification.bindTo(group.scopedContextKeyService);
        this._ctxHasRequestInProgress = ctxHasRequestInProgress.bindTo(group.scopedContextKeyService);
        this._ctxReviewModeEnabled = ctxReviewModeEnabled.bindTo(group.scopedContextKeyService);
        this._ctxRequestCount = ctxRequestCount.bindTo(group.scopedContextKeyService);
        const editorObs = observableFromEvent(this, group.onDidModelChange, () => group.activeEditor);
        this._store.add(autorun(r => {
            const editor = editorObs.read(r);
            const uri = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (!uri) {
                this._reset();
                return;
            }
            const tuple = new ObservableEditorSession(uri, chatEditingService, inlineChatSessionService).value.read(r);
            if (!tuple) {
                this._reset();
                return;
            }
            const { session, entry, isInlineChat } = tuple;
            const chatModel = chatService.getSession(session.chatSessionId);
            const isRequestInProgress = chatModel
                ? observableFromEvent(this, chatModel.onDidChange, () => chatModel.requestInProgress)
                : constObservable(false);
            this._ctxHasEditorModification.set(isInlineChat || entry?.state.read(r) === 0 /* WorkingSetEntryState.Modified */);
            this._ctxIsGlobalEditingSession.set(session.isGlobalEditingSession);
            this._ctxReviewModeEnabled.set(entry ? entry.reviewMode.read(r) : false);
            this._ctxHasRequestInProgress.set(Boolean(entry?.isCurrentlyBeingModifiedBy.read(r)) // any entry changing
                || (isInlineChat && isRequestInProgress.read(r)) // inline chat request
            );
            // number of requests
            const requestCount = chatModel
                ? observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().length)
                : constObservable(0);
            this._ctxRequestCount.set(requestCount.read(r));
        }));
    }
    _reset() {
        this._ctxIsGlobalEditingSession.reset();
        this._ctxHasEditorModification.reset();
        this._ctxHasRequestInProgress.reset();
        this._ctxReviewModeEnabled.reset();
        this._ctxRequestCount.reset();
    }
    dispose() {
        this._store.dispose();
        this._reset();
    }
};
ContextKeyGroup = __decorate([
    __param(1, IInlineChatSessionService),
    __param(2, IChatEditingService),
    __param(3, IChatService)
], ContextKeyGroup);
let ObservableEditorSession = class ObservableEditorSession {
    constructor(uri, chatEditingService, inlineChatService) {
        const inlineSessionObs = observableFromEvent(this, inlineChatService.onDidChangeSessions, () => inlineChatService.getSession2(uri));
        const sessionObs = chatEditingService.editingSessionsObs.map((value, r) => {
            for (const session of value) {
                const entry = session.readEntry(uri, r);
                if (entry) {
                    return { session, entry, isInlineChat: false };
                }
            }
            return undefined;
        });
        this.value = derived(r => {
            const inlineSession = inlineSessionObs.read(r);
            if (inlineSession) {
                return { session: inlineSession.editingSession, entry: inlineSession.editingSession.readEntry(uri, r), isInlineChat: true };
            }
            return sessionObs.read(r);
        });
    }
};
ObservableEditorSession = __decorate([
    __param(1, IChatEditingService),
    __param(2, IInlineChatSessionService)
], ObservableEditorSession);
export { ObservableEditorSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JDb250ZXh0S2V5cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdFZGl0b3JDb250ZXh0S2V5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUvSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hGLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsbUJBQW1CLEVBQWlFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTNELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLElBQUksYUFBYSxDQUFVLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVB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
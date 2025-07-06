/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatEditingService = createDecorator('chatEditingService');
export const chatEditingSnapshotScheme = 'chat-editing-snapshot-text-model';
export var WorkingSetEntryRemovalReason;
(function (WorkingSetEntryRemovalReason) {
    WorkingSetEntryRemovalReason[WorkingSetEntryRemovalReason["User"] = 0] = "User";
    WorkingSetEntryRemovalReason[WorkingSetEntryRemovalReason["Programmatic"] = 1] = "Programmatic";
})(WorkingSetEntryRemovalReason || (WorkingSetEntryRemovalReason = {}));
export var WorkingSetEntryState;
(function (WorkingSetEntryState) {
    WorkingSetEntryState[WorkingSetEntryState["Modified"] = 0] = "Modified";
    WorkingSetEntryState[WorkingSetEntryState["Accepted"] = 1] = "Accepted";
    WorkingSetEntryState[WorkingSetEntryState["Rejected"] = 2] = "Rejected";
    WorkingSetEntryState[WorkingSetEntryState["Transient"] = 3] = "Transient";
    WorkingSetEntryState[WorkingSetEntryState["Attached"] = 4] = "Attached";
    WorkingSetEntryState[WorkingSetEntryState["Sent"] = 5] = "Sent";
})(WorkingSetEntryState || (WorkingSetEntryState = {}));
export var ChatEditingSessionChangeType;
(function (ChatEditingSessionChangeType) {
    ChatEditingSessionChangeType[ChatEditingSessionChangeType["WorkingSet"] = 0] = "WorkingSet";
    ChatEditingSessionChangeType[ChatEditingSessionChangeType["Other"] = 1] = "Other";
})(ChatEditingSessionChangeType || (ChatEditingSessionChangeType = {}));
export var ChatEditingSessionState;
(function (ChatEditingSessionState) {
    ChatEditingSessionState[ChatEditingSessionState["Initial"] = 0] = "Initial";
    ChatEditingSessionState[ChatEditingSessionState["StreamingEdits"] = 1] = "StreamingEdits";
    ChatEditingSessionState[ChatEditingSessionState["Idle"] = 2] = "Idle";
    ChatEditingSessionState[ChatEditingSessionState["Disposed"] = 3] = "Disposed";
})(ChatEditingSessionState || (ChatEditingSessionState = {}));
export const CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME = 'chat-editing-multi-diff-source';
export const chatEditingWidgetFileStateContextKey = new RawContextKey('chatEditingWidgetFileState', undefined, localize('chatEditingWidgetFileState', "The current state of the file in the chat editing widget"));
export const chatEditingAgentSupportsReadonlyReferencesContextKey = new RawContextKey('chatEditingAgentSupportsReadonlyReferences', undefined, localize('chatEditingAgentSupportsReadonlyReferences', "Whether the chat editing agent supports readonly references (temporary)"));
export const decidedChatEditingResourceContextKey = new RawContextKey('decidedChatEditingResource', []);
export const chatEditingResourceContextKey = new RawContextKey('chatEditingResource', undefined);
export const inChatEditingSessionContextKey = new RawContextKey('inChatEditingSession', undefined);
export const hasUndecidedChatEditingResourceContextKey = new RawContextKey('hasUndecidedChatEditingResource', false);
export const hasAppliedChatEditsContextKey = new RawContextKey('hasAppliedChatEdits', false);
export const applyingChatEditsFailedContextKey = new RawContextKey('applyingChatEditsFailed', false);
export const chatEditingMaxFileAssignmentName = 'chatEditingSessionFileLimit';
export const defaultChatEditingMaxFileLimit = 10;
export var ChatEditKind;
(function (ChatEditKind) {
    ChatEditKind[ChatEditKind["Created"] = 0] = "Created";
    ChatEditKind[ChatEditKind["Modified"] = 1] = "Modified";
})(ChatEditKind || (ChatEditKind = {}));
export function isChatEditingActionContext(thing) {
    return typeof thing === 'object' && !!thing && 'sessionId' in thing;
}
export function getMultiDiffSourceUri(session) {
    return URI.from({
        scheme: CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME,
        authority: session.chatSessionId,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0RWRpdGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBSzdGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQTZEOUYsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsa0NBQWtDLENBQUM7QUFpRTVFLE1BQU0sQ0FBTixJQUFrQiw0QkFHakI7QUFIRCxXQUFrQiw0QkFBNEI7SUFDN0MsK0VBQUksQ0FBQTtJQUNKLCtGQUFZLENBQUE7QUFDYixDQUFDLEVBSGlCLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFHN0M7QUFFRCxNQUFNLENBQU4sSUFBa0Isb0JBT2pCO0FBUEQsV0FBa0Isb0JBQW9CO0lBQ3JDLHVFQUFRLENBQUE7SUFDUix1RUFBUSxDQUFBO0lBQ1IsdUVBQVEsQ0FBQTtJQUNSLHlFQUFTLENBQUE7SUFDVCx1RUFBUSxDQUFBO0lBQ1IsK0RBQUksQ0FBQTtBQUNMLENBQUMsRUFQaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQU9yQztBQUVELE1BQU0sQ0FBTixJQUFrQiw0QkFHakI7QUFIRCxXQUFrQiw0QkFBNEI7SUFDN0MsMkZBQVUsQ0FBQTtJQUNWLGlGQUFLLENBQUE7QUFDTixDQUFDLEVBSGlCLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFHN0M7QUF1RkQsTUFBTSxDQUFOLElBQWtCLHVCQUtqQjtBQUxELFdBQWtCLHVCQUF1QjtJQUN4QywyRUFBVyxDQUFBO0lBQ1gseUZBQWtCLENBQUE7SUFDbEIscUVBQVEsQ0FBQTtJQUNSLDZFQUFZLENBQUE7QUFDYixDQUFDLEVBTGlCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUFLeEM7QUFFRCxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxnQ0FBZ0MsQ0FBQztBQUUvRixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxJQUFJLGFBQWEsQ0FBdUIsNEJBQTRCLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSwwREFBMEQsQ0FBQyxDQUFDLENBQUM7QUFDek8sTUFBTSxDQUFDLE1BQU0sb0RBQW9ELEdBQUcsSUFBSSxhQUFhLENBQVUsNENBQTRDLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSx5RUFBeUUsQ0FBQyxDQUFDLENBQUM7QUFDM1IsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQVcsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbEgsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQXFCLHFCQUFxQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3JILE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLElBQUksYUFBYSxDQUFzQixzQkFBc0IsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUN4SCxNQUFNLENBQUMsTUFBTSx5Q0FBeUMsR0FBRyxJQUFJLGFBQWEsQ0FBc0IsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDMUksTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQXNCLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2xILE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLElBQUksYUFBYSxDQUFzQix5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUUxSCxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyw2QkFBNkIsQ0FBQztBQUM5RSxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxFQUFFLENBQUM7QUFFakQsTUFBTSxDQUFOLElBQWtCLFlBR2pCO0FBSEQsV0FBa0IsWUFBWTtJQUM3QixxREFBTyxDQUFBO0lBQ1AsdURBQVEsQ0FBQTtBQUNULENBQUMsRUFIaUIsWUFBWSxLQUFaLFlBQVksUUFHN0I7QUFPRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsS0FBYztJQUN4RCxPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLFdBQVcsSUFBSSxLQUFLLENBQUM7QUFDckUsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxPQUE0QjtJQUNqRSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDZixNQUFNLEVBQUUsOENBQThDO1FBQ3RELFNBQVMsRUFBRSxPQUFPLENBQUMsYUFBYTtLQUNoQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=
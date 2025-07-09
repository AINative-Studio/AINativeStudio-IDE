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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRFZGl0aW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFLN0YsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFDO0FBNkQ5RixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxrQ0FBa0MsQ0FBQztBQWlFNUUsTUFBTSxDQUFOLElBQWtCLDRCQUdqQjtBQUhELFdBQWtCLDRCQUE0QjtJQUM3QywrRUFBSSxDQUFBO0lBQ0osK0ZBQVksQ0FBQTtBQUNiLENBQUMsRUFIaUIsNEJBQTRCLEtBQTVCLDRCQUE0QixRQUc3QztBQUVELE1BQU0sQ0FBTixJQUFrQixvQkFPakI7QUFQRCxXQUFrQixvQkFBb0I7SUFDckMsdUVBQVEsQ0FBQTtJQUNSLHVFQUFRLENBQUE7SUFDUix1RUFBUSxDQUFBO0lBQ1IseUVBQVMsQ0FBQTtJQUNULHVFQUFRLENBQUE7SUFDUiwrREFBSSxDQUFBO0FBQ0wsQ0FBQyxFQVBpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBT3JDO0FBRUQsTUFBTSxDQUFOLElBQWtCLDRCQUdqQjtBQUhELFdBQWtCLDRCQUE0QjtJQUM3QywyRkFBVSxDQUFBO0lBQ1YsaUZBQUssQ0FBQTtBQUNOLENBQUMsRUFIaUIsNEJBQTRCLEtBQTVCLDRCQUE0QixRQUc3QztBQXVGRCxNQUFNLENBQU4sSUFBa0IsdUJBS2pCO0FBTEQsV0FBa0IsdUJBQXVCO0lBQ3hDLDJFQUFXLENBQUE7SUFDWCx5RkFBa0IsQ0FBQTtJQUNsQixxRUFBUSxDQUFBO0lBQ1IsNkVBQVksQ0FBQTtBQUNiLENBQUMsRUFMaUIsdUJBQXVCLEtBQXZCLHVCQUF1QixRQUt4QztBQUVELE1BQU0sQ0FBQyxNQUFNLDhDQUE4QyxHQUFHLGdDQUFnQyxDQUFDO0FBRS9GLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUF1Qiw0QkFBNEIsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDBEQUEwRCxDQUFDLENBQUMsQ0FBQztBQUN6TyxNQUFNLENBQUMsTUFBTSxvREFBb0QsR0FBRyxJQUFJLGFBQWEsQ0FBVSw0Q0FBNEMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLHlFQUF5RSxDQUFDLENBQUMsQ0FBQztBQUMzUixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxJQUFJLGFBQWEsQ0FBVyw0QkFBNEIsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNsSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FBcUIscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDckgsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsSUFBSSxhQUFhLENBQXNCLHNCQUFzQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3hILE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUFHLElBQUksYUFBYSxDQUFzQixpQ0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxSSxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FBc0IscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbEgsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsSUFBSSxhQUFhLENBQXNCLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRTFILE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLDZCQUE2QixDQUFDO0FBQzlFLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLEVBQUUsQ0FBQztBQUVqRCxNQUFNLENBQU4sSUFBa0IsWUFHakI7QUFIRCxXQUFrQixZQUFZO0lBQzdCLHFEQUFPLENBQUE7SUFDUCx1REFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhpQixZQUFZLEtBQVosWUFBWSxRQUc3QjtBQU9ELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxLQUFjO0lBQ3hELE9BQU8sT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNyRSxDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLE9BQTRCO0lBQ2pFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNmLE1BQU0sRUFBRSw4Q0FBOEM7UUFDdEQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhO0tBQ2hDLENBQUMsQ0FBQztBQUNKLENBQUMifQ==
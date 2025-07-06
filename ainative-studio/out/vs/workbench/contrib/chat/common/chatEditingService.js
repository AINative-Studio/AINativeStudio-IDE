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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEVkaXRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUs3RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUE2RDlGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGtDQUFrQyxDQUFDO0FBaUU1RSxNQUFNLENBQU4sSUFBa0IsNEJBR2pCO0FBSEQsV0FBa0IsNEJBQTRCO0lBQzdDLCtFQUFJLENBQUE7SUFDSiwrRkFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUhpQiw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBRzdDO0FBRUQsTUFBTSxDQUFOLElBQWtCLG9CQU9qQjtBQVBELFdBQWtCLG9CQUFvQjtJQUNyQyx1RUFBUSxDQUFBO0lBQ1IsdUVBQVEsQ0FBQTtJQUNSLHVFQUFRLENBQUE7SUFDUix5RUFBUyxDQUFBO0lBQ1QsdUVBQVEsQ0FBQTtJQUNSLCtEQUFJLENBQUE7QUFDTCxDQUFDLEVBUGlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFPckM7QUFFRCxNQUFNLENBQU4sSUFBa0IsNEJBR2pCO0FBSEQsV0FBa0IsNEJBQTRCO0lBQzdDLDJGQUFVLENBQUE7SUFDVixpRkFBSyxDQUFBO0FBQ04sQ0FBQyxFQUhpQiw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBRzdDO0FBdUZELE1BQU0sQ0FBTixJQUFrQix1QkFLakI7QUFMRCxXQUFrQix1QkFBdUI7SUFDeEMsMkVBQVcsQ0FBQTtJQUNYLHlGQUFrQixDQUFBO0lBQ2xCLHFFQUFRLENBQUE7SUFDUiw2RUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUxpQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBS3hDO0FBRUQsTUFBTSxDQUFDLE1BQU0sOENBQThDLEdBQUcsZ0NBQWdDLENBQUM7QUFFL0YsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQXVCLDRCQUE0QixFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsMERBQTBELENBQUMsQ0FBQyxDQUFDO0FBQ3pPLE1BQU0sQ0FBQyxNQUFNLG9EQUFvRCxHQUFHLElBQUksYUFBYSxDQUFVLDRDQUE0QyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsNENBQTRDLEVBQUUseUVBQXlFLENBQUMsQ0FBQyxDQUFDO0FBQzNSLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUFXLDRCQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2xILE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFxQixxQkFBcUIsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNySCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FBc0Isc0JBQXNCLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDeEgsTUFBTSxDQUFDLE1BQU0seUNBQXlDLEdBQUcsSUFBSSxhQUFhLENBQXNCLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzFJLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFzQixxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNsSCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxJQUFJLGFBQWEsQ0FBc0IseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFMUgsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsNkJBQTZCLENBQUM7QUFDOUUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsRUFBRSxDQUFDO0FBRWpELE1BQU0sQ0FBTixJQUFrQixZQUdqQjtBQUhELFdBQWtCLFlBQVk7SUFDN0IscURBQU8sQ0FBQTtJQUNQLHVEQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLFlBQVksS0FBWixZQUFZLFFBRzdCO0FBT0QsTUFBTSxVQUFVLDBCQUEwQixDQUFDLEtBQWM7SUFDeEQsT0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxXQUFXLElBQUksS0FBSyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsT0FBNEI7SUFDakUsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLDhDQUE4QztRQUN0RCxTQUFTLEVBQUUsT0FBTyxDQUFDLGFBQWE7S0FDaEMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9
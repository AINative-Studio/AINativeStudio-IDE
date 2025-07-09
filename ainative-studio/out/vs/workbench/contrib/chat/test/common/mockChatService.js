/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
export class MockChatService {
    constructor() {
        this.onDidSubmitRequest = Event.None;
        this.sessions = new Map();
        this.onDidPerformUserAction = undefined;
        this.onDidDisposeSession = undefined;
        this.unifiedViewEnabled = false;
    }
    isEnabled(location) {
        throw new Error('Method not implemented.');
    }
    hasSessions() {
        throw new Error('Method not implemented.');
    }
    getProviderInfos() {
        throw new Error('Method not implemented.');
    }
    startSession(location, token) {
        throw new Error('Method not implemented.');
    }
    addSession(session) {
        this.sessions.set(session.sessionId, session);
    }
    getSession(sessionId) {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return this.sessions.get(sessionId) ?? {};
    }
    async getOrRestoreSession(sessionId) {
        throw new Error('Method not implemented.');
    }
    loadSessionFromContent(data) {
        throw new Error('Method not implemented.');
    }
    /**
     * Returns whether the request was accepted.
     */
    sendRequest(sessionId, message) {
        throw new Error('Method not implemented.');
    }
    resendRequest(request, options) {
        throw new Error('Method not implemented.');
    }
    adoptRequest(sessionId, request) {
        throw new Error('Method not implemented.');
    }
    removeRequest(sessionid, requestId) {
        throw new Error('Method not implemented.');
    }
    cancelCurrentRequestForSession(sessionId) {
        throw new Error('Method not implemented.');
    }
    clearSession(sessionId) {
        throw new Error('Method not implemented.');
    }
    addCompleteRequest(sessionId, message, variableData, attempt, response) {
        throw new Error('Method not implemented.');
    }
    async getHistory() {
        throw new Error('Method not implemented.');
    }
    async clearAllHistoryEntries() {
        throw new Error('Method not implemented.');
    }
    async removeHistoryEntry(sessionId) {
        throw new Error('Method not implemented.');
    }
    notifyUserAction(event) {
        throw new Error('Method not implemented.');
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        throw new Error('Method not implemented.');
    }
    setChatSessionTitle(sessionId, title) {
        throw new Error('Method not implemented.');
    }
    isEditingLocation(location) {
        throw new Error('Method not implemented.');
    }
    getChatStorageFolder() {
        throw new Error('Method not implemented.');
    }
    logChatIndex() {
        throw new Error('Method not implemented.');
    }
    isPersistedSessionEmpty(sessionId) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbW9ja0NoYXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQU81RCxNQUFNLE9BQU8sZUFBZTtJQUE1QjtRQUdDLHVCQUFrQixHQUFxQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRTFELGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztRQTZEakQsMkJBQXNCLEdBQWdDLFNBQVUsQ0FBQztRQUlqRSx3QkFBbUIsR0FBNkUsU0FBVSxDQUFDO1FBVTNHLHVCQUFrQixHQUFHLEtBQUssQ0FBQztJQWdCNUIsQ0FBQztJQXpGQSxTQUFTLENBQUMsUUFBMkI7UUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxXQUFXO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxnQkFBZ0I7UUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFlBQVksQ0FBQyxRQUEyQixFQUFFLEtBQXdCO1FBQ2pFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsVUFBVSxDQUFDLE9BQW1CO1FBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUNELFVBQVUsQ0FBQyxTQUFpQjtRQUMzQixtRUFBbUU7UUFDbkUsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFnQixDQUFDO0lBQ3pELENBQUM7SUFDRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsU0FBaUI7UUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxzQkFBc0IsQ0FBQyxJQUEyQjtRQUNqRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLFNBQWlCLEVBQUUsT0FBZTtRQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELGFBQWEsQ0FBQyxPQUEwQixFQUFFLE9BQTZDO1FBQ3RGLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsWUFBWSxDQUFDLFNBQWlCLEVBQUUsT0FBMEI7UUFDekQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxhQUFhLENBQUMsU0FBaUIsRUFBRSxTQUFpQjtRQUNqRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELDhCQUE4QixDQUFDLFNBQWlCO1FBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsWUFBWSxDQUFDLFNBQWlCO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0Qsa0JBQWtCLENBQUMsU0FBaUIsRUFBRSxPQUFvQyxFQUFFLFlBQWtELEVBQUUsT0FBMkIsRUFBRSxRQUErQjtRQUMzTCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELEtBQUssQ0FBQyxVQUFVO1FBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxLQUFLLENBQUMsc0JBQXNCO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQWlCO1FBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBR0QsZ0JBQWdCLENBQUMsS0FBMkI7UUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFHRCxtQkFBbUIsQ0FBQyxzQkFBbUQsRUFBRSxXQUFnQjtRQUN4RixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELG1CQUFtQixDQUFDLFNBQWlCLEVBQUUsS0FBYTtRQUNuRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUdELGlCQUFpQixDQUFDLFFBQTJCO1FBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsWUFBWTtRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsdUJBQXVCLENBQUMsU0FBaUI7UUFDeEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCJ9
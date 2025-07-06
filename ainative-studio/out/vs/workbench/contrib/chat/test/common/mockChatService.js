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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9tb2NrQ2hhdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBTzVELE1BQU0sT0FBTyxlQUFlO0lBQTVCO1FBR0MsdUJBQWtCLEdBQXFDLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFMUQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1FBNkRqRCwyQkFBc0IsR0FBZ0MsU0FBVSxDQUFDO1FBSWpFLHdCQUFtQixHQUE2RSxTQUFVLENBQUM7UUFVM0csdUJBQWtCLEdBQUcsS0FBSyxDQUFDO0lBZ0I1QixDQUFDO0lBekZBLFNBQVMsQ0FBQyxRQUEyQjtRQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFdBQVc7UUFDVixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELGdCQUFnQjtRQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsWUFBWSxDQUFDLFFBQTJCLEVBQUUsS0FBd0I7UUFDakUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxVQUFVLENBQUMsT0FBbUI7UUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0QsVUFBVSxDQUFDLFNBQWlCO1FBQzNCLG1FQUFtRTtR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
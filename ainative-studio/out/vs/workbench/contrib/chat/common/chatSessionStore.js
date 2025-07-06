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
import { Sequencer } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { joinPath } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService, toFileOperationResult } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ChatModel, normalizeSerializableChatData } from './chatModel.js';
const maxPersistedSessions = 25;
const ChatIndexStorageKey = 'chat.ChatSessionStore.index';
// const ChatTransferIndexStorageKey = 'ChatSessionStore.transferIndex';
let ChatSessionStore = class ChatSessionStore extends Disposable {
    constructor(fileService, environmentService, logService, workspaceContextService, telemetryService, storageService, lifecycleService, userDataProfilesService) {
        super();
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.workspaceContextService = workspaceContextService;
        this.telemetryService = telemetryService;
        this.storageService = storageService;
        this.lifecycleService = lifecycleService;
        this.userDataProfilesService = userDataProfilesService;
        // private readonly transferredSessionStorageRoot: URI;
        this.storeQueue = new Sequencer();
        this.shuttingDown = false;
        const workspace = this.workspaceContextService.getWorkspace();
        const isEmptyWindow = !workspace.configuration && workspace.folders.length === 0;
        const workspaceId = this.workspaceContextService.getWorkspace().id;
        this.storageRoot = isEmptyWindow ?
            joinPath(this.userDataProfilesService.defaultProfile.globalStorageHome, 'emptyWindowChatSessions') :
            joinPath(this.environmentService.workspaceStorageHome, workspaceId, 'chatSessions');
        this.previousEmptyWindowStorageRoot = isEmptyWindow ?
            joinPath(this.environmentService.workspaceStorageHome, 'no-workspace', 'chatSessions') :
            undefined;
        // TODO tmpdir
        // this.transferredSessionStorageRoot = joinPath(this.environmentService.workspaceStorageHome, 'transferredChatSessions');
        this._register(this.lifecycleService.onWillShutdown(e => {
            this.shuttingDown = true;
            if (!this.storeTask) {
                return;
            }
            e.join(this.storeTask, {
                id: 'join.chatSessionStore',
                label: localize('join.chatSessionStore', "Saving chat history")
            });
        }));
    }
    async storeSessions(sessions) {
        if (this.shuttingDown) {
            // Don't start this task if we missed the chance to block shutdown
            return;
        }
        try {
            this.storeTask = this.storeQueue.queue(async () => {
                try {
                    await Promise.all(sessions.map(session => this.writeSession(session)));
                    await this.trimEntries();
                    await this.flushIndex();
                }
                catch (e) {
                    this.reportError('storeSessions', 'Error storing chat sessions', e);
                }
            });
            await this.storeTask;
        }
        finally {
            this.storeTask = undefined;
        }
    }
    // async storeTransferSession(transferData: IChatTransfer, session: ISerializableChatData): Promise<void> {
    // 	try {
    // 		const content = JSON.stringify(session, undefined, 2);
    // 		await this.fileService.writeFile(this.transferredSessionStorageRoot, VSBuffer.fromString(content));
    // 	} catch (e) {
    // 		this.reportError('sessionWrite', 'Error writing chat session', e);
    // 		return;
    // 	}
    // 	const index = this.getTransferredSessionIndex();
    // 	index[transferData.toWorkspace.toString()] = transferData;
    // 	try {
    // 		this.storageService.store(ChatTransferIndexStorageKey, index, StorageScope.PROFILE, StorageTarget.MACHINE);
    // 	} catch (e) {
    // 		this.reportError('storeTransferSession', 'Error storing chat transfer session', e);
    // 	}
    // }
    // private getTransferredSessionIndex(): IChatTransferIndex {
    // 	try {
    // 		const data: IChatTransferIndex = this.storageService.getObject(ChatTransferIndexStorageKey, StorageScope.PROFILE, {});
    // 		return data;
    // 	} catch (e) {
    // 		this.reportError('getTransferredSessionIndex', 'Error reading chat transfer index', e);
    // 		return {};
    // 	}
    // }
    async writeSession(session) {
        try {
            const index = this.internalGetIndex();
            const storageLocation = this.getStorageLocation(session.sessionId);
            const content = JSON.stringify(session, undefined, 2);
            await this.fileService.writeFile(storageLocation, VSBuffer.fromString(content));
            // Write succeeded, update index
            index.entries[session.sessionId] = getSessionMetadata(session);
        }
        catch (e) {
            this.reportError('sessionWrite', 'Error writing chat session', e);
        }
    }
    async flushIndex() {
        const index = this.internalGetIndex();
        try {
            this.storageService.store(ChatIndexStorageKey, index, this.getIndexStorageScope(), 1 /* StorageTarget.MACHINE */);
        }
        catch (e) {
            // Only if JSON.stringify fails, AFAIK
            this.reportError('indexWrite', 'Error writing index', e);
        }
    }
    getIndexStorageScope() {
        const workspace = this.workspaceContextService.getWorkspace();
        const isEmptyWindow = !workspace.configuration && workspace.folders.length === 0;
        return isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */;
    }
    async trimEntries() {
        const index = this.internalGetIndex();
        const entries = Object.entries(index.entries)
            .sort((a, b) => b[1].lastMessageDate - a[1].lastMessageDate)
            .map(([id]) => id);
        if (entries.length > maxPersistedSessions) {
            const entriesToDelete = entries.slice(maxPersistedSessions);
            for (const entry of entriesToDelete) {
                delete index.entries[entry];
            }
            this.logService.trace(`ChatSessionStore: Trimmed ${entriesToDelete.length} old chat sessions from index`);
        }
    }
    async internalDeleteSession(sessionId) {
        const index = this.internalGetIndex();
        if (!index.entries[sessionId]) {
            return;
        }
        const storageLocation = this.getStorageLocation(sessionId);
        try {
            await this.fileService.del(storageLocation);
        }
        catch (e) {
            if (toFileOperationResult(e) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.reportError('sessionDelete', 'Error deleting chat session', e);
            }
        }
        finally {
            delete index.entries[sessionId];
        }
    }
    hasSessions() {
        return Object.keys(this.internalGetIndex().entries).length > 0;
    }
    isSessionEmpty(sessionId) {
        const index = this.internalGetIndex();
        return index.entries[sessionId]?.isEmpty ?? true;
    }
    async deleteSession(sessionId) {
        await this.storeQueue.queue(async () => {
            await this.internalDeleteSession(sessionId);
            await this.flushIndex();
        });
    }
    async clearAllSessions() {
        await this.storeQueue.queue(async () => {
            const index = this.internalGetIndex();
            const entries = Object.keys(index.entries);
            this.logService.info(`ChatSessionStore: Clearing ${entries.length} chat sessions`);
            await Promise.all(entries.map(entry => this.internalDeleteSession(entry)));
            await this.flushIndex();
        });
    }
    async setSessionTitle(sessionId, title) {
        await this.storeQueue.queue(async () => {
            const index = this.internalGetIndex();
            if (index.entries[sessionId]) {
                index.entries[sessionId].title = title;
            }
        });
    }
    reportError(reasonForTelemetry, message, error) {
        this.logService.error(`ChatSessionStore: ` + message, toErrorMessage(error));
        const fileOperationReason = error && toFileOperationResult(error);
        this.telemetryService.publicLog2('chatSessionStoreError', {
            reason: reasonForTelemetry,
            fileOperationReason: fileOperationReason ?? -1
        });
    }
    internalGetIndex() {
        if (this.indexCache) {
            return this.indexCache;
        }
        const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
        if (!data) {
            this.indexCache = { version: 1, entries: {} };
            return this.indexCache;
        }
        try {
            const index = JSON.parse(data);
            if (isChatSessionIndex(index)) {
                // Success
                this.indexCache = index;
            }
            else {
                this.reportError('invalidIndexFormat', `Invalid index format: ${data}`);
                this.indexCache = { version: 1, entries: {} };
            }
            return this.indexCache;
        }
        catch (e) {
            // Only if JSON.parse fails
            this.reportError('invalidIndexJSON', `Index corrupt: ${data}`, e);
            this.indexCache = { version: 1, entries: {} };
            return this.indexCache;
        }
    }
    async getIndex() {
        return this.storeQueue.queue(async () => {
            return this.internalGetIndex().entries;
        });
    }
    logIndex() {
        const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
        this.logService.info('ChatSessionStore index: ', data);
    }
    async migrateDataIfNeeded(getInitialData) {
        await this.storeQueue.queue(async () => {
            const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
            const needsMigrationFromStorageService = !data;
            if (needsMigrationFromStorageService) {
                const initialData = getInitialData();
                if (initialData) {
                    await this.migrate(initialData);
                }
            }
        });
    }
    async migrate(initialData) {
        const numSessions = Object.keys(initialData).length;
        this.logService.info(`ChatSessionStore: Migrating ${numSessions} chat sessions from storage service to file system`);
        await Promise.all(Object.values(initialData).map(async (session) => {
            await this.writeSession(session);
        }));
        await this.flushIndex();
    }
    async readSession(sessionId) {
        return await this.storeQueue.queue(async () => {
            let rawData;
            const storageLocation = this.getStorageLocation(sessionId);
            try {
                rawData = (await this.fileService.readFile(storageLocation)).value.toString();
            }
            catch (e) {
                this.reportError('sessionReadFile', `Error reading chat session file ${sessionId}`, e);
                if (toFileOperationResult(e) === 1 /* FileOperationResult.FILE_NOT_FOUND */ && this.previousEmptyWindowStorageRoot) {
                    rawData = await this.readSessionFromPreviousLocation(sessionId);
                }
                if (!rawData) {
                    return undefined;
                }
            }
            try {
                // TODO Copied from ChatService.ts, cleanup
                const session = revive(JSON.parse(rawData)); // Revive serialized URIs in session data
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                return normalizeSerializableChatData(session);
            }
            catch (err) {
                this.reportError('malformedSession', `Malformed session data in ${storageLocation.fsPath}: [${rawData.substring(0, 20)}${rawData.length > 20 ? '...' : ''}]`, err);
                return undefined;
            }
        });
    }
    async readSessionFromPreviousLocation(sessionId) {
        let rawData;
        if (this.previousEmptyWindowStorageRoot) {
            const storageLocation2 = joinPath(this.previousEmptyWindowStorageRoot, `${sessionId}.json`);
            try {
                rawData = (await this.fileService.readFile(storageLocation2)).value.toString();
                this.logService.info(`ChatSessionStore: Read chat session ${sessionId} from previous location`);
            }
            catch (e) {
                this.reportError('sessionReadFile', `Error reading chat session file ${sessionId} from previous location`, e);
                return undefined;
            }
        }
        return rawData;
    }
    getStorageLocation(chatSessionId) {
        return joinPath(this.storageRoot, `${chatSessionId}.json`);
    }
    getChatStorageFolder() {
        return this.storageRoot;
    }
};
ChatSessionStore = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, ILogService),
    __param(3, IWorkspaceContextService),
    __param(4, ITelemetryService),
    __param(5, IStorageService),
    __param(6, ILifecycleService),
    __param(7, IUserDataProfilesService)
], ChatSessionStore);
export { ChatSessionStore };
function isChatSessionEntryMetadata(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        typeof obj.sessionId === 'string' &&
        typeof obj.title === 'string' &&
        typeof obj.lastMessageDate === 'number');
}
// TODO if we update the index version:
// Don't throw away index when moving backwards in VS Code version. Try to recover it. But this scenario is hard.
function isChatSessionIndex(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const index = data;
    if (index.version !== 1) {
        return false;
    }
    if (typeof index.entries !== 'object' || index.entries === null) {
        return false;
    }
    for (const key in index.entries) {
        if (!isChatSessionEntryMetadata(index.entries[key])) {
            return false;
        }
    }
    return true;
}
function getSessionMetadata(session) {
    const title = session instanceof ChatModel ?
        (session.title || localize('newChat', "New Chat")) :
        session.customTitle ?? ChatModel.getDefaultTitle(session.requests);
    return {
        sessionId: session.sessionId,
        title,
        lastMessageDate: session.lastMessageDate,
        isImported: session.isImported,
        initialLocation: session.initialLocation,
        isEmpty: session instanceof ChatModel ? session.getRequests().length === 0 : session.requests.length === 0
    };
}
// type IChatTransferDto = Dto<IChatTransfer>;
/**
 * Map of destination workspace URI to chat transfer data
 */
// type IChatTransferIndex = Record<string, IChatTransferDto>;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRTZXNzaW9uU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQXVCLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFD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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2Vzc2lvblN0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUF1QixZQUFZLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FB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
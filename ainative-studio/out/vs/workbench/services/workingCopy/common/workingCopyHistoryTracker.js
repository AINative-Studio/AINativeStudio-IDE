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
var WorkingCopyHistoryTracker_1;
import { localize } from '../../../../nls.js';
import { GlobalIdleValue, Limiter } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IPathService } from '../../path/common/pathService.js';
import { isStoredFileWorkingCopySaveEvent } from './storedFileWorkingCopy.js';
import { IWorkingCopyHistoryService, MAX_PARALLEL_HISTORY_IO_OPS } from './workingCopyHistory.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { Schemas } from '../../../../base/common/network.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IFileService } from '../../../../platform/files/common/files.js';
let WorkingCopyHistoryTracker = class WorkingCopyHistoryTracker extends Disposable {
    static { WorkingCopyHistoryTracker_1 = this; }
    static { this.SETTINGS = {
        ENABLED: 'workbench.localHistory.enabled',
        SIZE_LIMIT: 'workbench.localHistory.maxFileSize',
        EXCLUDES: 'workbench.localHistory.exclude'
    }; }
    static { this.UNDO_REDO_SAVE_SOURCE = SaveSourceRegistry.registerSource('undoRedo.source', localize('undoRedo.source', "Undo / Redo")); }
    constructor(workingCopyService, workingCopyHistoryService, uriIdentityService, pathService, configurationService, undoRedoService, contextService, fileService) {
        super();
        this.workingCopyService = workingCopyService;
        this.workingCopyHistoryService = workingCopyHistoryService;
        this.uriIdentityService = uriIdentityService;
        this.pathService = pathService;
        this.configurationService = configurationService;
        this.undoRedoService = undoRedoService;
        this.contextService = contextService;
        this.fileService = fileService;
        this.limiter = this._register(new Limiter(MAX_PARALLEL_HISTORY_IO_OPS));
        this.resourceExcludeMatcher = this._register(new GlobalIdleValue(() => {
            const matcher = this._register(new ResourceGlobMatcher(root => this.configurationService.getValue(WorkingCopyHistoryTracker_1.SETTINGS.EXCLUDES, { resource: root }), event => event.affectsConfiguration(WorkingCopyHistoryTracker_1.SETTINGS.EXCLUDES), this.contextService, this.configurationService));
            return matcher;
        }));
        this.pendingAddHistoryEntryOperations = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.workingCopyContentVersion = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.historyEntryContentVersion = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.registerListeners();
    }
    registerListeners() {
        // File Events
        this._register(this.fileService.onDidRunOperation(e => this.onDidRunFileOperation(e)));
        // Working Copy Events
        this._register(this.workingCopyService.onDidChangeContent(workingCopy => this.onDidChangeContent(workingCopy)));
        this._register(this.workingCopyService.onDidSave(e => this.onDidSave(e)));
    }
    async onDidRunFileOperation(e) {
        if (!this.shouldTrackHistoryFromFileOperationEvent(e)) {
            return; // return early for working copies we are not interested in
        }
        const source = e.resource;
        const target = e.target.resource;
        // Move working copy history entries for this file move event
        const resources = await this.workingCopyHistoryService.moveEntries(source, target);
        // Make sure to track the content version of each entry that
        // was moved in our map. This ensures that a subsequent save
        // without a content change does not add a redundant entry
        // (https://github.com/microsoft/vscode/issues/145881)
        for (const resource of resources) {
            const contentVersion = this.getContentVersion(resource);
            this.historyEntryContentVersion.set(resource, contentVersion);
        }
    }
    onDidChangeContent(workingCopy) {
        // Increment content version ID for resource
        const contentVersionId = this.getContentVersion(workingCopy.resource);
        this.workingCopyContentVersion.set(workingCopy.resource, contentVersionId + 1);
    }
    getContentVersion(resource) {
        return this.workingCopyContentVersion.get(resource) || 0;
    }
    onDidSave(e) {
        if (!this.shouldTrackHistoryFromSaveEvent(e)) {
            return; // return early for working copies we are not interested in
        }
        const contentVersion = this.getContentVersion(e.workingCopy.resource);
        if (this.historyEntryContentVersion.get(e.workingCopy.resource) === contentVersion) {
            return; // return early when content version already has associated history entry
        }
        // Cancel any previous operation for this resource
        this.pendingAddHistoryEntryOperations.get(e.workingCopy.resource)?.dispose(true);
        // Create new cancellation token support and remember
        const cts = new CancellationTokenSource();
        this.pendingAddHistoryEntryOperations.set(e.workingCopy.resource, cts);
        // Queue new operation to add to history
        this.limiter.queue(async () => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            const contentVersion = this.getContentVersion(e.workingCopy.resource);
            // Figure out source of save operation if not provided already
            let source = e.source;
            if (!e.source) {
                source = this.resolveSourceFromUndoRedo(e);
            }
            // Add entry
            await this.workingCopyHistoryService.addEntry({ resource: e.workingCopy.resource, source, timestamp: e.stat.mtime }, cts.token);
            // Remember content version as being added to history
            this.historyEntryContentVersion.set(e.workingCopy.resource, contentVersion);
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Finally remove from pending operations
            this.pendingAddHistoryEntryOperations.delete(e.workingCopy.resource);
        });
    }
    resolveSourceFromUndoRedo(e) {
        const lastStackElement = this.undoRedoService.getLastElement(e.workingCopy.resource);
        if (lastStackElement) {
            if (lastStackElement.code === 'undoredo.textBufferEdit') {
                return undefined; // ignore any unspecific stack element that resulted just from typing
            }
            return lastStackElement.label;
        }
        const allStackElements = this.undoRedoService.getElements(e.workingCopy.resource);
        if (allStackElements.future.length > 0 || allStackElements.past.length > 0) {
            return WorkingCopyHistoryTracker_1.UNDO_REDO_SAVE_SOURCE;
        }
        return undefined;
    }
    shouldTrackHistoryFromSaveEvent(e) {
        if (!isStoredFileWorkingCopySaveEvent(e)) {
            return false; // only support working copies that are backed by stored files
        }
        return this.shouldTrackHistory(e.workingCopy.resource, e.stat);
    }
    shouldTrackHistoryFromFileOperationEvent(e) {
        if (!e.isOperation(2 /* FileOperation.MOVE */)) {
            return false; // only interested in move operations
        }
        return this.shouldTrackHistory(e.target.resource, e.target);
    }
    shouldTrackHistory(resource, stat) {
        if (resource.scheme !== this.pathService.defaultUriScheme && // track history for all workspace resources
            resource.scheme !== Schemas.vscodeUserData && // track history for all settings
            resource.scheme !== Schemas.inMemory // track history for tests that use in-memory
        ) {
            return false; // do not support unknown resources
        }
        const configuredMaxFileSizeInBytes = 1024 * this.configurationService.getValue(WorkingCopyHistoryTracker_1.SETTINGS.SIZE_LIMIT, { resource });
        if (stat.size > configuredMaxFileSizeInBytes) {
            return false; // only track files that are not too large
        }
        if (this.configurationService.getValue(WorkingCopyHistoryTracker_1.SETTINGS.ENABLED, { resource }) === false) {
            return false; // do not track when history is disabled
        }
        // Finally check for exclude setting
        return !this.resourceExcludeMatcher.value.matches(resource);
    }
};
WorkingCopyHistoryTracker = WorkingCopyHistoryTracker_1 = __decorate([
    __param(0, IWorkingCopyService),
    __param(1, IWorkingCopyHistoryService),
    __param(2, IUriIdentityService),
    __param(3, IPathService),
    __param(4, IConfigurationService),
    __param(5, IUndoRedoService),
    __param(6, IWorkspaceContextService),
    __param(7, IFileService)
], WorkingCopyHistoryTracker);
export { WorkingCopyHistoryTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5VHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5SGlzdG9yeVRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFN0YsT0FBTyxFQUFjLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBK0IsTUFBTSw0QkFBNEIsQ0FBQztBQUczRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRyxPQUFPLEVBQXlCLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxD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
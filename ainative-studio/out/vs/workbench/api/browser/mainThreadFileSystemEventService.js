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
var MainThreadFileSystemEventService_1;
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { localize } from '../../../nls.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IBulkEditService } from '../../../editor/browser/services/bulkEditService.js';
import { IProgressService } from '../../../platform/progress/common/progress.js';
import { raceCancellation } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../base/common/severity.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { reviveWorkspaceEditDto } from './mainThreadBulkEdits.js';
import { URI } from '../../../base/common/uri.js';
let MainThreadFileSystemEventService = class MainThreadFileSystemEventService {
    static { MainThreadFileSystemEventService_1 = this; }
    static { this.MementoKeyAdditionalEdits = `file.particpants.additionalEdits`; }
    constructor(extHostContext, _fileService, workingCopyFileService, bulkEditService, progressService, dialogService, storageService, logService, envService, uriIdentService, _logService) {
        this._fileService = _fileService;
        this._logService = _logService;
        this._listener = new DisposableStore();
        this._watches = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystemEventService);
        this._listener.add(_fileService.onDidFilesChange(event => {
            this._proxy.$onFileEvent({
                created: event.rawAdded,
                changed: event.rawUpdated,
                deleted: event.rawDeleted
            });
        }));
        const that = this;
        const fileOperationParticipant = new class {
            async participate(files, operation, undoInfo, timeout, token) {
                if (undoInfo?.isUndoing) {
                    return;
                }
                const cts = new CancellationTokenSource(token);
                const timer = setTimeout(() => cts.cancel(), timeout);
                const data = await progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: this._progressLabel(operation),
                    cancellable: true,
                    delay: Math.min(timeout / 2, 3000)
                }, () => {
                    // race extension host event delivery against timeout AND user-cancel
                    const onWillEvent = that._proxy.$onWillRunFileOperation(operation, files, timeout, cts.token);
                    return raceCancellation(onWillEvent, cts.token);
                }, () => {
                    // user-cancel
                    cts.cancel();
                }).finally(() => {
                    cts.dispose();
                    clearTimeout(timer);
                });
                if (!data || data.edit.edits.length === 0) {
                    // cancelled, no reply, or no edits
                    return;
                }
                const needsConfirmation = data.edit.edits.some(edit => edit.metadata?.needsConfirmation);
                let showPreview = storageService.getBoolean(MainThreadFileSystemEventService_1.MementoKeyAdditionalEdits, 0 /* StorageScope.PROFILE */);
                if (envService.extensionTestsLocationURI) {
                    // don't show dialog in tests
                    showPreview = false;
                }
                if (showPreview === undefined) {
                    // show a user facing message
                    let message;
                    if (data.extensionNames.length === 1) {
                        if (operation === 0 /* FileOperation.CREATE */) {
                            message = localize('ask.1.create', "Extension '{0}' wants to make refactoring changes with this file creation", data.extensionNames[0]);
                        }
                        else if (operation === 3 /* FileOperation.COPY */) {
                            message = localize('ask.1.copy', "Extension '{0}' wants to make refactoring changes with this file copy", data.extensionNames[0]);
                        }
                        else if (operation === 2 /* FileOperation.MOVE */) {
                            message = localize('ask.1.move', "Extension '{0}' wants to make refactoring changes with this file move", data.extensionNames[0]);
                        }
                        else /* if (operation === FileOperation.DELETE) */ {
                            message = localize('ask.1.delete', "Extension '{0}' wants to make refactoring changes with this file deletion", data.extensionNames[0]);
                        }
                    }
                    else {
                        if (operation === 0 /* FileOperation.CREATE */) {
                            message = localize({ key: 'ask.N.create', comment: ['{0} is a number, e.g "3 extensions want..."'] }, "{0} extensions want to make refactoring changes with this file creation", data.extensionNames.length);
                        }
                        else if (operation === 3 /* FileOperation.COPY */) {
                            message = localize({ key: 'ask.N.copy', comment: ['{0} is a number, e.g "3 extensions want..."'] }, "{0} extensions want to make refactoring changes with this file copy", data.extensionNames.length);
                        }
                        else if (operation === 2 /* FileOperation.MOVE */) {
                            message = localize({ key: 'ask.N.move', comment: ['{0} is a number, e.g "3 extensions want..."'] }, "{0} extensions want to make refactoring changes with this file move", data.extensionNames.length);
                        }
                        else /* if (operation === FileOperation.DELETE) */ {
                            message = localize({ key: 'ask.N.delete', comment: ['{0} is a number, e.g "3 extensions want..."'] }, "{0} extensions want to make refactoring changes with this file deletion", data.extensionNames.length);
                        }
                    }
                    if (needsConfirmation) {
                        // edit which needs confirmation -> always show dialog
                        const { confirmed } = await dialogService.confirm({
                            type: Severity.Info,
                            message,
                            primaryButton: localize('preview', "Show &&Preview"),
                            cancelButton: localize('cancel', "Skip Changes")
                        });
                        showPreview = true;
                        if (!confirmed) {
                            // no changes wanted
                            return;
                        }
                    }
                    else {
                        // choice
                        let Choice;
                        (function (Choice) {
                            Choice[Choice["OK"] = 0] = "OK";
                            Choice[Choice["Preview"] = 1] = "Preview";
                            Choice[Choice["Cancel"] = 2] = "Cancel";
                        })(Choice || (Choice = {}));
                        const { result, checkboxChecked } = await dialogService.prompt({
                            type: Severity.Info,
                            message,
                            buttons: [
                                {
                                    label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                                    run: () => Choice.OK
                                },
                                {
                                    label: localize({ key: 'preview', comment: ['&& denotes a mnemonic'] }, "Show &&Preview"),
                                    run: () => Choice.Preview
                                }
                            ],
                            cancelButton: {
                                label: localize('cancel', "Skip Changes"),
                                run: () => Choice.Cancel
                            },
                            checkbox: { label: localize('again', "Do not ask me again") }
                        });
                        if (result === Choice.Cancel) {
                            // no changes wanted, don't persist cancel option
                            return;
                        }
                        showPreview = result === Choice.Preview;
                        if (checkboxChecked) {
                            storageService.store(MainThreadFileSystemEventService_1.MementoKeyAdditionalEdits, showPreview, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                        }
                    }
                }
                logService.info('[onWill-handler] applying additional workspace edit from extensions', data.extensionNames);
                await bulkEditService.apply(reviveWorkspaceEditDto(data.edit, uriIdentService), { undoRedoGroupId: undoInfo?.undoRedoGroupId, showPreview });
            }
            _progressLabel(operation) {
                switch (operation) {
                    case 0 /* FileOperation.CREATE */:
                        return localize('msg-create', "Running 'File Create' participants...");
                    case 2 /* FileOperation.MOVE */:
                        return localize('msg-rename', "Running 'File Rename' participants...");
                    case 3 /* FileOperation.COPY */:
                        return localize('msg-copy', "Running 'File Copy' participants...");
                    case 1 /* FileOperation.DELETE */:
                        return localize('msg-delete', "Running 'File Delete' participants...");
                    case 4 /* FileOperation.WRITE */:
                        return localize('msg-write', "Running 'File Write' participants...");
                }
            }
        };
        // BEFORE file operation
        this._listener.add(workingCopyFileService.addFileOperationParticipant(fileOperationParticipant));
        // AFTER file operation
        this._listener.add(workingCopyFileService.onDidRunWorkingCopyFileOperation(e => this._proxy.$onDidRunFileOperation(e.operation, e.files)));
    }
    async $watch(extensionId, session, resource, unvalidatedOpts, correlate) {
        const uri = URI.revive(resource);
        const opts = {
            ...unvalidatedOpts
        };
        // Convert a recursive watcher to a flat watcher if the path
        // turns out to not be a folder. Recursive watching is only
        // possible on folders, so we help all file watchers by checking
        // early.
        if (opts.recursive) {
            try {
                const stat = await this._fileService.stat(uri);
                if (!stat.isDirectory) {
                    opts.recursive = false;
                }
            }
            catch (error) {
                // ignore
            }
        }
        // Correlated file watching: use an exclusive `createWatcher()`
        // Note: currently not enabled for extensions (but leaving in in case of future usage)
        if (correlate && !opts.recursive) {
            this._logService.trace(`MainThreadFileSystemEventService#$watch(): request to start watching correlated (extension: ${extensionId}, path: ${uri.toString(true)}, recursive: ${opts.recursive}, session: ${session}, excludes: ${JSON.stringify(opts.excludes)}, includes: ${JSON.stringify(opts.includes)})`);
            const watcherDisposables = new DisposableStore();
            const subscription = watcherDisposables.add(this._fileService.createWatcher(uri, { ...opts, recursive: false }));
            watcherDisposables.add(subscription.onDidChange(event => {
                this._proxy.$onFileEvent({
                    session,
                    created: event.rawAdded,
                    changed: event.rawUpdated,
                    deleted: event.rawDeleted
                });
            }));
            this._watches.set(session, watcherDisposables);
        }
        // Uncorrelated file watching: via shared `watch()`
        else {
            this._logService.trace(`MainThreadFileSystemEventService#$watch(): request to start watching uncorrelated (extension: ${extensionId}, path: ${uri.toString(true)}, recursive: ${opts.recursive}, session: ${session}, excludes: ${JSON.stringify(opts.excludes)}, includes: ${JSON.stringify(opts.includes)})`);
            const subscription = this._fileService.watch(uri, opts);
            this._watches.set(session, subscription);
        }
    }
    $unwatch(session) {
        if (this._watches.has(session)) {
            this._logService.trace(`MainThreadFileSystemEventService#$unwatch(): request to stop watching (session: ${session})`);
            this._watches.deleteAndDispose(session);
        }
    }
    dispose() {
        this._listener.dispose();
        this._watches.dispose();
    }
};
MainThreadFileSystemEventService = MainThreadFileSystemEventService_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadFileSystemEventService),
    __param(1, IFileService),
    __param(2, IWorkingCopyFileService),
    __param(3, IBulkEditService),
    __param(4, IProgressService),
    __param(5, IDialogService),
    __param(6, IStorageService),
    __param(7, ILogService),
    __param(8, IEnvironmentService),
    __param(9, IUriIdentityService),
    __param(10, ILogService)
], MainThreadFileSystemEventService);
export { MainThreadFileSystemEventService };
registerAction2(class ResetMemento extends Action2 {
    constructor() {
        super({
            id: 'files.participants.resetChoice',
            title: {
                value: localize('label', "Reset choice for 'File operation needs preview'"),
                original: `Reset choice for 'File operation needs preview'`
            },
            f1: true
        });
    }
    run(accessor) {
        accessor.get(IStorageService).remove(MainThreadFileSystemEventService.MementoKeyAdditionalEdits, 0 /* StorageScope.PROFILE */);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRGaWxlU3lzdGVtRXZlbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25GLE9BQU8sRUFBaUIsWUFBWSxFQUFpQixNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUFzQyxXQUFXLEVBQXlDLE1BQU0sK0JBQStCLENBQUM7QUFDdkosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBd0MsdUJBQXVCLEVBQWdELE1BQU0sNkRBQTZELENBQUM7QUFDMUwsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFvQixNQUFNLCtDQUErQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxD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
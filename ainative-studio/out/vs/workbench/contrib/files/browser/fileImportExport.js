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
var BrowserFileUpload_1, FileDownload_1;
import { localize } from '../../../../nls.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { getFileNamesMessage, IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IExplorerService } from './files.js';
import { VIEW_ID } from '../common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Limiter, Promises, RunOnceWorker } from '../../../../base/common/async.js';
import { newWriteableBufferStream, VSBuffer } from '../../../../base/common/buffer.js';
import { basename, dirname, joinPath } from '../../../../base/common/resources.js';
import { ResourceFileEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { ExplorerItem } from '../common/explorerModel.js';
import { URI } from '../../../../base/common/uri.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { extractEditorsAndFilesDropData } from '../../../../platform/dnd/browser/dnd.js';
import { IWorkspaceEditingService } from '../../../services/workspaces/common/workspaceEditing.js';
import { isWeb } from '../../../../base/common/platform.js';
import { getActiveWindow, isDragEvent, triggerDownload } from '../../../../base/browser/dom.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { listenStream } from '../../../../base/common/stream.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { canceled } from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { WebFileSystemAccess } from '../../../../platform/files/browser/webFileSystemAccess.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let BrowserFileUpload = class BrowserFileUpload {
    static { BrowserFileUpload_1 = this; }
    static { this.MAX_PARALLEL_UPLOADS = 20; }
    constructor(progressService, dialogService, explorerService, editorService, fileService) {
        this.progressService = progressService;
        this.dialogService = dialogService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.fileService = fileService;
    }
    upload(target, source) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const uploadPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: true,
            title: localize('uploadingFiles', "Uploading")
        }, async (progress) => this.doUpload(target, this.toTransfer(source), progress, cts.token), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => uploadPromise);
        return uploadPromise;
    }
    toTransfer(source) {
        if (isDragEvent(source)) {
            return source.dataTransfer;
        }
        const transfer = { items: [] };
        // We want to reuse the same code for uploading from
        // Drag & Drop as well as input element based upload
        // so we convert into webkit data transfer when the
        // input element approach is used (simplified).
        for (const file of source) {
            transfer.items.push({
                webkitGetAsEntry: () => {
                    return {
                        name: file.name,
                        isDirectory: false,
                        isFile: true,
                        createReader: () => { throw new Error('Unsupported for files'); },
                        file: resolve => resolve(file)
                    };
                }
            });
        }
        return transfer;
    }
    async doUpload(target, source, progress, token) {
        const items = source.items;
        // Somehow the items thing is being modified at random, maybe as a security
        // measure since this is a DND operation. As such, we copy the items into
        // an array we own as early as possible before using it.
        const entries = [];
        for (const item of items) {
            entries.push(item.webkitGetAsEntry());
        }
        const results = [];
        const operation = {
            startTime: Date.now(),
            progressScheduler: new RunOnceWorker(steps => { progress.report(steps[steps.length - 1]); }, 1000),
            filesTotal: entries.length,
            filesUploaded: 0,
            totalBytesUploaded: 0
        };
        // Upload all entries in parallel up to a
        // certain maximum leveraging the `Limiter`
        const uploadLimiter = new Limiter(BrowserFileUpload_1.MAX_PARALLEL_UPLOADS);
        await Promises.settled(entries.map(entry => {
            return uploadLimiter.queue(async () => {
                if (token.isCancellationRequested) {
                    return;
                }
                // Confirm overwrite as needed
                if (target && entry.name && target.getChild(entry.name)) {
                    const { confirmed } = await this.dialogService.confirm(getFileOverwriteConfirm(entry.name));
                    if (!confirmed) {
                        return;
                    }
                    await this.explorerService.applyBulkEdit([new ResourceFileEdit(joinPath(target.resource, entry.name), undefined, { recursive: true, folder: target.getChild(entry.name)?.isDirectory })], {
                        undoLabel: localize('overwrite', "Overwrite {0}", entry.name),
                        progressLabel: localize('overwriting', "Overwriting {0}", entry.name),
                    });
                    if (token.isCancellationRequested) {
                        return;
                    }
                }
                // Upload entry
                const result = await this.doUploadEntry(entry, target.resource, target, progress, operation, token);
                if (result) {
                    results.push(result);
                }
            });
        }));
        operation.progressScheduler.dispose();
        // Open uploaded file in editor only if we upload just one
        const firstUploadedFile = results[0];
        if (!token.isCancellationRequested && firstUploadedFile?.isFile) {
            await this.editorService.openEditor({ resource: firstUploadedFile.resource, options: { pinned: true } });
        }
    }
    async doUploadEntry(entry, parentResource, target, progress, operation, token) {
        if (token.isCancellationRequested || !entry.name || (!entry.isFile && !entry.isDirectory)) {
            return undefined;
        }
        // Report progress
        let fileBytesUploaded = 0;
        const reportProgress = (fileSize, bytesUploaded) => {
            fileBytesUploaded += bytesUploaded;
            operation.totalBytesUploaded += bytesUploaded;
            const bytesUploadedPerSecond = operation.totalBytesUploaded / ((Date.now() - operation.startTime) / 1000);
            // Small file
            let message;
            if (fileSize < ByteSize.MB) {
                if (operation.filesTotal === 1) {
                    message = `${entry.name}`;
                }
                else {
                    message = localize('uploadProgressSmallMany', "{0} of {1} files ({2}/s)", operation.filesUploaded, operation.filesTotal, ByteSize.formatSize(bytesUploadedPerSecond));
                }
            }
            // Large file
            else {
                message = localize('uploadProgressLarge', "{0} ({1} of {2}, {3}/s)", entry.name, ByteSize.formatSize(fileBytesUploaded), ByteSize.formatSize(fileSize), ByteSize.formatSize(bytesUploadedPerSecond));
            }
            // Report progress but limit to update only once per second
            operation.progressScheduler.work({ message });
        };
        operation.filesUploaded++;
        reportProgress(0, 0);
        // Handle file upload
        const resource = joinPath(parentResource, entry.name);
        if (entry.isFile) {
            const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Chrome/Edge/Firefox support stream method, but only use it for
            // larger files to reduce the overhead of the streaming approach
            if (typeof file.stream === 'function' && file.size > ByteSize.MB) {
                await this.doUploadFileBuffered(resource, file, reportProgress, token);
            }
            // Fallback to unbuffered upload for other browsers or small files
            else {
                await this.doUploadFileUnbuffered(resource, file, reportProgress);
            }
            return { isFile: true, resource };
        }
        // Handle folder upload
        else {
            // Create target folder
            await this.fileService.createFolder(resource);
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Recursive upload files in this directory
            const dirReader = entry.createReader();
            const childEntries = [];
            let done = false;
            do {
                const childEntriesChunk = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
                if (childEntriesChunk.length > 0) {
                    childEntries.push(...childEntriesChunk);
                }
                else {
                    done = true; // an empty array is a signal that all entries have been read
                }
            } while (!done && !token.isCancellationRequested);
            // Update operation total based on new counts
            operation.filesTotal += childEntries.length;
            // Split up files from folders to upload
            const folderTarget = target && target.getChild(entry.name) || undefined;
            const fileChildEntries = [];
            const folderChildEntries = [];
            for (const childEntry of childEntries) {
                if (childEntry.isFile) {
                    fileChildEntries.push(childEntry);
                }
                else if (childEntry.isDirectory) {
                    folderChildEntries.push(childEntry);
                }
            }
            // Upload files (up to `MAX_PARALLEL_UPLOADS` in parallel)
            const fileUploadQueue = new Limiter(BrowserFileUpload_1.MAX_PARALLEL_UPLOADS);
            await Promises.settled(fileChildEntries.map(fileChildEntry => {
                return fileUploadQueue.queue(() => this.doUploadEntry(fileChildEntry, resource, folderTarget, progress, operation, token));
            }));
            // Upload folders (sequentially give we don't know their sizes)
            for (const folderChildEntry of folderChildEntries) {
                await this.doUploadEntry(folderChildEntry, resource, folderTarget, progress, operation, token);
            }
            return { isFile: false, resource };
        }
    }
    async doUploadFileBuffered(resource, file, progressReporter, token) {
        const writeableStream = newWriteableBufferStream({
            // Set a highWaterMark to prevent the stream
            // for file upload to produce large buffers
            // in-memory
            highWaterMark: 10
        });
        const writeFilePromise = this.fileService.writeFile(resource, writeableStream);
        // Read the file in chunks using File.stream() web APIs
        try {
            const reader = file.stream().getReader();
            let res = await reader.read();
            while (!res.done) {
                if (token.isCancellationRequested) {
                    break;
                }
                // Write buffer into stream but make sure to wait
                // in case the `highWaterMark` is reached
                const buffer = VSBuffer.wrap(res.value);
                await writeableStream.write(buffer);
                if (token.isCancellationRequested) {
                    break;
                }
                // Report progress
                progressReporter(file.size, buffer.byteLength);
                res = await reader.read();
            }
            writeableStream.end(undefined);
        }
        catch (error) {
            writeableStream.error(error);
            writeableStream.end();
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Wait for file being written to target
        await writeFilePromise;
    }
    doUploadFileUnbuffered(resource, file, progressReporter) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    if (event.target?.result instanceof ArrayBuffer) {
                        const buffer = VSBuffer.wrap(new Uint8Array(event.target.result));
                        await this.fileService.writeFile(resource, buffer);
                        // Report progress
                        progressReporter(file.size, buffer.byteLength);
                    }
                    else {
                        throw new Error('Could not read from dropped file.');
                    }
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            };
            // Start reading the file to trigger `onload`
            reader.readAsArrayBuffer(file);
        });
    }
};
BrowserFileUpload = BrowserFileUpload_1 = __decorate([
    __param(0, IProgressService),
    __param(1, IDialogService),
    __param(2, IExplorerService),
    __param(3, IEditorService),
    __param(4, IFileService)
], BrowserFileUpload);
export { BrowserFileUpload };
//#endregion
//#region External File Import (drag and drop)
let ExternalFileImport = class ExternalFileImport {
    constructor(fileService, hostService, contextService, configurationService, dialogService, workspaceEditingService, explorerService, editorService, progressService, notificationService, instantiationService) {
        this.fileService = fileService;
        this.hostService = hostService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this.workspaceEditingService = workspaceEditingService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.instantiationService = instantiationService;
    }
    async import(target, source, targetWindow) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const importPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: true,
            title: localize('copyingFiles', "Copying...")
        }, async () => await this.doImport(target, source, targetWindow, cts.token), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => importPromise);
        return importPromise;
    }
    async doImport(target, source, targetWindow, token) {
        // Activate all providers for the resources dropped
        const candidateFiles = coalesce((await this.instantiationService.invokeFunction(accessor => extractEditorsAndFilesDropData(accessor, source))).map(editor => editor.resource));
        await Promise.all(candidateFiles.map(resource => this.fileService.activateProvider(resource.scheme)));
        // Check for dropped external files to be folders
        const files = coalesce(candidateFiles.filter(resource => this.fileService.hasProvider(resource)));
        const resolvedFiles = await this.fileService.resolveAll(files.map(file => ({ resource: file })));
        if (token.isCancellationRequested) {
            return;
        }
        // Pass focus to window
        this.hostService.focus(targetWindow);
        // Handle folders by adding to workspace if we are in workspace context and if dropped on top
        const folders = resolvedFiles.filter(resolvedFile => resolvedFile.success && resolvedFile.stat?.isDirectory).map(resolvedFile => ({ uri: resolvedFile.stat.resource }));
        if (folders.length > 0 && target.isRoot) {
            let ImportChoice;
            (function (ImportChoice) {
                ImportChoice[ImportChoice["Copy"] = 1] = "Copy";
                ImportChoice[ImportChoice["Add"] = 2] = "Add";
            })(ImportChoice || (ImportChoice = {}));
            const buttons = [
                {
                    label: folders.length > 1 ?
                        localize('copyFolders', "&&Copy Folders") :
                        localize('copyFolder', "&&Copy Folder"),
                    run: () => ImportChoice.Copy
                }
            ];
            let message;
            // We only allow to add a folder to the workspace if there is already a workspace folder with that scheme
            const workspaceFolderSchemas = this.contextService.getWorkspace().folders.map(folder => folder.uri.scheme);
            if (folders.some(folder => workspaceFolderSchemas.indexOf(folder.uri.scheme) >= 0)) {
                buttons.unshift({
                    label: folders.length > 1 ?
                        localize('addFolders', "&&Add Folders to Workspace") :
                        localize('addFolder', "&&Add Folder to Workspace"),
                    run: () => ImportChoice.Add
                });
                message = folders.length > 1 ?
                    localize('dropFolders', "Do you want to copy the folders or add the folders to the workspace?") :
                    localize('dropFolder', "Do you want to copy '{0}' or add '{0}' as a folder to the workspace?", basename(folders[0].uri));
            }
            else {
                message = folders.length > 1 ?
                    localize('copyfolders', "Are you sure to want to copy folders?") :
                    localize('copyfolder', "Are you sure to want to copy '{0}'?", basename(folders[0].uri));
            }
            const { result } = await this.dialogService.prompt({
                type: Severity.Info,
                message,
                buttons,
                cancelButton: true
            });
            // Add folders
            if (result === ImportChoice.Add) {
                return this.workspaceEditingService.addFolders(folders);
            }
            // Copy resources
            if (result === ImportChoice.Copy) {
                return this.importResources(target, files, token);
            }
        }
        // Handle dropped files (only support FileStat as target)
        else if (target instanceof ExplorerItem) {
            return this.importResources(target, files, token);
        }
    }
    async importResources(target, resources, token) {
        if (resources && resources.length > 0) {
            // Resolve target to check for name collisions and ask user
            const targetStat = await this.fileService.resolve(target.resource);
            if (token.isCancellationRequested) {
                return;
            }
            // Check for name collisions
            const targetNames = new Set();
            const caseSensitive = this.fileService.hasCapability(target.resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
            if (targetStat.children) {
                targetStat.children.forEach(child => {
                    targetNames.add(caseSensitive ? child.name : child.name.toLowerCase());
                });
            }
            let inaccessibleFileCount = 0;
            const resourcesFiltered = coalesce((await Promises.settled(resources.map(async (resource) => {
                const fileDoesNotExist = !(await this.fileService.exists(resource));
                if (fileDoesNotExist) {
                    inaccessibleFileCount++;
                    return undefined;
                }
                if (targetNames.has(caseSensitive ? basename(resource) : basename(resource).toLowerCase())) {
                    const confirmationResult = await this.dialogService.confirm(getFileOverwriteConfirm(basename(resource)));
                    if (!confirmationResult.confirmed) {
                        return undefined;
                    }
                }
                return resource;
            }))));
            if (inaccessibleFileCount > 0) {
                this.notificationService.error(inaccessibleFileCount > 1 ? localize('filesInaccessible', "Some or all of the dropped files could not be accessed for import.") : localize('fileInaccessible', "The dropped file could not be accessed for import."));
            }
            // Copy resources through bulk edit API
            const resourceFileEdits = resourcesFiltered.map(resource => {
                const sourceFileName = basename(resource);
                const targetFile = joinPath(target.resource, sourceFileName);
                return new ResourceFileEdit(resource, targetFile, { overwrite: true, copy: true });
            });
            const undoLevel = this.configurationService.getValue().explorer.confirmUndo;
            await this.explorerService.applyBulkEdit(resourceFileEdits, {
                undoLabel: resourcesFiltered.length === 1 ?
                    localize({ comment: ['substitution will be the name of the file that was imported'], key: 'importFile' }, "Import {0}", basename(resourcesFiltered[0])) :
                    localize({ comment: ['substitution will be the number of files that were imported'], key: 'importnFile' }, "Import {0} resources", resourcesFiltered.length),
                progressLabel: resourcesFiltered.length === 1 ?
                    localize({ comment: ['substitution will be the name of the file that was copied'], key: 'copyingFile' }, "Copying {0}", basename(resourcesFiltered[0])) :
                    localize({ comment: ['substitution will be the number of files that were copied'], key: 'copyingnFile' }, "Copying {0} resources", resourcesFiltered.length),
                progressLocation: 10 /* ProgressLocation.Window */,
                confirmBeforeUndo: undoLevel === "verbose" /* UndoConfirmLevel.Verbose */ || undoLevel === "default" /* UndoConfirmLevel.Default */,
            });
            // if we only add one file, just open it directly
            const autoOpen = this.configurationService.getValue().explorer.autoOpenDroppedFile;
            if (autoOpen && resourceFileEdits.length === 1) {
                const item = this.explorerService.findClosest(resourceFileEdits[0].newResource);
                if (item && !item.isDirectory) {
                    this.editorService.openEditor({ resource: item.resource, options: { pinned: true } });
                }
            }
        }
    }
};
ExternalFileImport = __decorate([
    __param(0, IFileService),
    __param(1, IHostService),
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IDialogService),
    __param(5, IWorkspaceEditingService),
    __param(6, IExplorerService),
    __param(7, IEditorService),
    __param(8, IProgressService),
    __param(9, INotificationService),
    __param(10, IInstantiationService)
], ExternalFileImport);
export { ExternalFileImport };
let FileDownload = class FileDownload {
    static { FileDownload_1 = this; }
    static { this.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY = 'workbench.explorer.downloadPath'; }
    constructor(fileService, explorerService, progressService, logService, fileDialogService, storageService) {
        this.fileService = fileService;
        this.explorerService = explorerService;
        this.progressService = progressService;
        this.logService = logService;
        this.fileDialogService = fileDialogService;
        this.storageService = storageService;
    }
    download(source) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const downloadPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: isWeb,
            title: localize('downloadingFiles', "Downloading")
        }, async (progress) => this.doDownload(source, progress, cts), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => downloadPromise);
        return downloadPromise;
    }
    async doDownload(sources, progress, cts) {
        for (const source of sources) {
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Web: use DOM APIs to download files with optional support
            // for folders and large files
            if (isWeb) {
                await this.doDownloadBrowser(source.resource, progress, cts);
            }
            // Native: use working copy file service to get at the contents
            else {
                await this.doDownloadNative(source, progress, cts);
            }
        }
    }
    async doDownloadBrowser(resource, progress, cts) {
        const stat = await this.fileService.resolve(resource, { resolveMetadata: true });
        if (cts.token.isCancellationRequested) {
            return;
        }
        const maxBlobDownloadSize = 32 * ByteSize.MB; // avoid to download via blob-trick >32MB to avoid memory pressure
        const preferFileSystemAccessWebApis = stat.isDirectory || stat.size > maxBlobDownloadSize;
        // Folder: use FS APIs to download files and folders if available and preferred
        const activeWindow = getActiveWindow();
        if (preferFileSystemAccessWebApis && WebFileSystemAccess.supported(activeWindow)) {
            try {
                const parentFolder = await activeWindow.showDirectoryPicker();
                const operation = {
                    startTime: Date.now(),
                    progressScheduler: new RunOnceWorker(steps => { progress.report(steps[steps.length - 1]); }, 1000),
                    filesTotal: stat.isDirectory ? 0 : 1, // folders increment filesTotal within downloadFolder method
                    filesDownloaded: 0,
                    totalBytesDownloaded: 0,
                    fileBytesDownloaded: 0
                };
                if (stat.isDirectory) {
                    const targetFolder = await parentFolder.getDirectoryHandle(stat.name, { create: true });
                    await this.downloadFolderBrowser(stat, targetFolder, operation, cts.token);
                }
                else {
                    await this.downloadFileBrowser(parentFolder, stat, operation, cts.token);
                }
                operation.progressScheduler.dispose();
            }
            catch (error) {
                this.logService.warn(error);
                cts.cancel(); // `showDirectoryPicker` will throw an error when the user cancels
            }
        }
        // File: use traditional download to circumvent browser limitations
        else if (stat.isFile) {
            let bufferOrUri;
            try {
                bufferOrUri = (await this.fileService.readFile(stat.resource, { limits: { size: maxBlobDownloadSize } }, cts.token)).value.buffer;
            }
            catch (error) {
                bufferOrUri = FileAccess.uriToBrowserUri(stat.resource);
            }
            if (!cts.token.isCancellationRequested) {
                triggerDownload(bufferOrUri, stat.name);
            }
        }
    }
    async downloadFileBufferedBrowser(resource, target, operation, token) {
        const contents = await this.fileService.readFileStream(resource, undefined, token);
        if (token.isCancellationRequested) {
            target.close();
            return;
        }
        return new Promise((resolve, reject) => {
            const sourceStream = contents.value;
            const disposables = new DisposableStore();
            disposables.add(toDisposable(() => target.close()));
            disposables.add(createSingleCallFunction(token.onCancellationRequested)(() => {
                disposables.dispose();
                reject(canceled());
            }));
            listenStream(sourceStream, {
                onData: data => {
                    target.write(data.buffer);
                    this.reportProgress(contents.name, contents.size, data.byteLength, operation);
                },
                onError: error => {
                    disposables.dispose();
                    reject(error);
                },
                onEnd: () => {
                    disposables.dispose();
                    resolve();
                }
            }, token);
        });
    }
    async downloadFileUnbufferedBrowser(resource, target, operation, token) {
        const contents = await this.fileService.readFile(resource, undefined, token);
        if (!token.isCancellationRequested) {
            target.write(contents.value.buffer);
            this.reportProgress(contents.name, contents.size, contents.value.byteLength, operation);
        }
        target.close();
    }
    async downloadFileBrowser(targetFolder, file, operation, token) {
        // Report progress
        operation.filesDownloaded++;
        operation.fileBytesDownloaded = 0; // reset for this file
        this.reportProgress(file.name, 0, 0, operation);
        // Start to download
        const targetFile = await targetFolder.getFileHandle(file.name, { create: true });
        const targetFileWriter = await targetFile.createWritable();
        // For large files, write buffered using streams
        if (file.size > ByteSize.MB) {
            return this.downloadFileBufferedBrowser(file.resource, targetFileWriter, operation, token);
        }
        // For small files prefer to write unbuffered to reduce overhead
        return this.downloadFileUnbufferedBrowser(file.resource, targetFileWriter, operation, token);
    }
    async downloadFolderBrowser(folder, targetFolder, operation, token) {
        if (folder.children) {
            operation.filesTotal += (folder.children.map(child => child.isFile)).length;
            for (const child of folder.children) {
                if (token.isCancellationRequested) {
                    return;
                }
                if (child.isFile) {
                    await this.downloadFileBrowser(targetFolder, child, operation, token);
                }
                else {
                    const childFolder = await targetFolder.getDirectoryHandle(child.name, { create: true });
                    const resolvedChildFolder = await this.fileService.resolve(child.resource, { resolveMetadata: true });
                    await this.downloadFolderBrowser(resolvedChildFolder, childFolder, operation, token);
                }
            }
        }
    }
    reportProgress(name, fileSize, bytesDownloaded, operation) {
        operation.fileBytesDownloaded += bytesDownloaded;
        operation.totalBytesDownloaded += bytesDownloaded;
        const bytesDownloadedPerSecond = operation.totalBytesDownloaded / ((Date.now() - operation.startTime) / 1000);
        // Small file
        let message;
        if (fileSize < ByteSize.MB) {
            if (operation.filesTotal === 1) {
                message = name;
            }
            else {
                message = localize('downloadProgressSmallMany', "{0} of {1} files ({2}/s)", operation.filesDownloaded, operation.filesTotal, ByteSize.formatSize(bytesDownloadedPerSecond));
            }
        }
        // Large file
        else {
            message = localize('downloadProgressLarge', "{0} ({1} of {2}, {3}/s)", name, ByteSize.formatSize(operation.fileBytesDownloaded), ByteSize.formatSize(fileSize), ByteSize.formatSize(bytesDownloadedPerSecond));
        }
        // Report progress but limit to update only once per second
        operation.progressScheduler.work({ message });
    }
    async doDownloadNative(explorerItem, progress, cts) {
        progress.report({ message: explorerItem.name });
        let defaultUri;
        const lastUsedDownloadPath = this.storageService.get(FileDownload_1.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (lastUsedDownloadPath) {
            defaultUri = joinPath(URI.file(lastUsedDownloadPath), explorerItem.name);
        }
        else {
            defaultUri = joinPath(explorerItem.isDirectory ?
                await this.fileDialogService.defaultFolderPath(Schemas.file) :
                await this.fileDialogService.defaultFilePath(Schemas.file), explorerItem.name);
        }
        const destination = await this.fileDialogService.showSaveDialog({
            availableFileSystems: [Schemas.file],
            saveLabel: localize('downloadButton', "Download"),
            title: localize('chooseWhereToDownload', "Choose Where to Download"),
            defaultUri
        });
        if (destination) {
            // Remember as last used download folder
            this.storageService.store(FileDownload_1.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY, dirname(destination).fsPath, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Perform download
            await this.explorerService.applyBulkEdit([new ResourceFileEdit(explorerItem.resource, destination, { overwrite: true, copy: true })], {
                undoLabel: localize('downloadBulkEdit', "Download {0}", explorerItem.name),
                progressLabel: localize('downloadingBulkEdit', "Downloading {0}", explorerItem.name),
                progressLocation: 10 /* ProgressLocation.Window */
            });
        }
        else {
            cts.cancel(); // User canceled a download. In case there were multiple files selected we should cancel the remainder of the prompts #86100
        }
    }
};
FileDownload = FileDownload_1 = __decorate([
    __param(0, IFileService),
    __param(1, IExplorerService),
    __param(2, IProgressService),
    __param(3, ILogService),
    __param(4, IFileDialogService),
    __param(5, IStorageService)
], FileDownload);
export { FileDownload };
//#endregion
//#region Helpers
export function getFileOverwriteConfirm(name) {
    return {
        message: localize('confirmOverwrite', "A file or folder with the name '{0}' already exists in the destination folder. Do you want to replace it?", name),
        detail: localize('irreversible', "This action is irreversible!"),
        primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
        type: 'warning'
    };
}
export function getMultipleFilesOverwriteConfirm(files) {
    if (files.length > 1) {
        return {
            message: localize('confirmManyOverwrites', "The following {0} files and/or folders already exist in the destination folder. Do you want to replace them?", files.length),
            detail: getFileNamesMessage(files) + '\n' + localize('irreversible', "This action is irreversible!"),
            primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
            type: 'warning'
        };
    }
    return getFileOverwriteConfirm(basename(files[0]));
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUltcG9ydEV4cG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVJbXBvcnRFeHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFpQixjQUFjLEVBQUUsa0JBQWtCLEVBQWlCLE1BQU0sZ0RBQWdELENBQUM7QUFDdkosT0FBTyxFQUFFLFFBQVEsRUFBa0MsWUFBWSxFQUF5QixNQUFNLDRDQUE0QyxDQUFDO0FBQzNJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQWEsZ0JBQWdCLEVBQW1DLE1BQU0sa0RBQWtELENBQUM7QUFDaEksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzlDLE9BQU8sRUFBeUMsT0FBTyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3REFB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
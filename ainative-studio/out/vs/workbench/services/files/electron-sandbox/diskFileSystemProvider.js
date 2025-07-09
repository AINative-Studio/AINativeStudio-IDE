/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { isLinux } from '../../../../base/common/platform.js';
import { AbstractDiskFileSystemProvider } from '../../../../platform/files/common/diskFileSystemProvider.js';
import { DiskFileSystemProviderClient, LOCAL_FILE_SYSTEM_CHANNEL_NAME } from '../../../../platform/files/common/diskFileSystemProviderClient.js';
import { UniversalWatcherClient } from './watcherClient.js';
import { LogService } from '../../../../platform/log/common/logService.js';
/**
 * A sandbox ready disk file system provider that delegates almost all calls
 * to the main process via `DiskFileSystemProviderServer` except for recursive
 * file watching that is done via shared process workers due to CPU intensity.
 */
export class DiskFileSystemProvider extends AbstractDiskFileSystemProvider {
    constructor(mainProcessService, utilityProcessWorkerWorkbenchService, logService, loggerService) {
        super(logService, { watcher: { forceUniversal: true /* send all requests to universal watcher process */ } });
        this.utilityProcessWorkerWorkbenchService = utilityProcessWorkerWorkbenchService;
        this.loggerService = loggerService;
        this._watcherLogService = undefined;
        this.provider = this._register(new DiskFileSystemProviderClient(mainProcessService.getChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME), { pathCaseSensitive: isLinux, trash: true }));
        this.registerListeners();
    }
    registerListeners() {
        // Forward events from the embedded provider
        this._register(this.provider.onDidChangeFile(changes => this._onDidChangeFile.fire(changes)));
        this._register(this.provider.onDidWatchError(error => this._onDidWatchError.fire(error)));
    }
    //#region File Capabilities
    get onDidChangeCapabilities() { return this.provider.onDidChangeCapabilities; }
    get capabilities() { return this.provider.capabilities; }
    //#endregion
    //#region File Metadata Resolving
    stat(resource) {
        return this.provider.stat(resource);
    }
    readdir(resource) {
        return this.provider.readdir(resource);
    }
    //#endregion
    //#region File Reading/Writing
    readFile(resource, opts) {
        return this.provider.readFile(resource, opts);
    }
    readFileStream(resource, opts, token) {
        return this.provider.readFileStream(resource, opts, token);
    }
    writeFile(resource, content, opts) {
        return this.provider.writeFile(resource, content, opts);
    }
    open(resource, opts) {
        return this.provider.open(resource, opts);
    }
    close(fd) {
        return this.provider.close(fd);
    }
    read(fd, pos, data, offset, length) {
        return this.provider.read(fd, pos, data, offset, length);
    }
    write(fd, pos, data, offset, length) {
        return this.provider.write(fd, pos, data, offset, length);
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    mkdir(resource) {
        return this.provider.mkdir(resource);
    }
    delete(resource, opts) {
        return this.provider.delete(resource, opts);
    }
    rename(from, to, opts) {
        return this.provider.rename(from, to, opts);
    }
    copy(from, to, opts) {
        return this.provider.copy(from, to, opts);
    }
    //#endregion
    //#region Clone File
    cloneFile(from, to) {
        return this.provider.cloneFile(from, to);
    }
    //#endregion
    //#region File Watching
    createUniversalWatcher(onChange, onLogMessage, verboseLogging) {
        return new UniversalWatcherClient(changes => onChange(changes), msg => onLogMessage(msg), verboseLogging, this.utilityProcessWorkerWorkbenchService);
    }
    createNonRecursiveWatcher() {
        throw new Error('Method not implemented in sandbox.'); // we never expect this to be called given we set `forceUniversal: true`
    }
    get watcherLogService() {
        if (!this._watcherLogService) {
            this._watcherLogService = new LogService(this.loggerService.createLogger('fileWatcher', { name: localize('fileWatcher', "File Watcher") }));
        }
        return this._watcherLogService;
    }
    logWatcherMessage(msg) {
        this.watcherLogService[msg.type](msg.message);
        if (msg.type !== 'trace' && msg.type !== 'debug') {
            super.logWatcherMessage(msg); // allow non-verbose log messages in window log
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZmlsZXMvZWxlY3Ryb24tc2FuZGJveC9kaXNrRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFLN0csT0FBTyxFQUFFLDRCQUE0QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFFakosT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTNFOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsOEJBQThCO0lBVXpFLFlBQ0Msa0JBQXVDLEVBQ3RCLG9DQUEyRSxFQUM1RixVQUF1QixFQUNOLGFBQTZCO1FBRTlDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBSjdGLHlDQUFvQyxHQUFwQyxvQ0FBb0MsQ0FBdUM7UUFFM0Usa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBOEd2Qyx1QkFBa0IsR0FBNEIsU0FBUyxDQUFDO1FBMUcvRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSw0QkFBNEIsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsOEJB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
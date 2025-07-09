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
import { join } from '../../../base/common/path.js';
import { basename, isEqual, isEqualOrParent } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestWorkspace } from '../../../platform/workspace/test/common/testWorkspace.js';
import { isLinux, isMacintosh } from '../../../base/common/platform.js';
import { InMemoryStorageService } from '../../../platform/storage/common/storage.js';
import { NullExtensionService } from '../../services/extensions/common/extensions.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import product from '../../../platform/product/common/product.js';
import { AbstractLoggerService, LogLevel, NullLogger } from '../../../platform/log/common/log.js';
export class TestLoggerService extends AbstractLoggerService {
    constructor(logsHome) {
        super(LogLevel.Info, logsHome ?? URI.file('tests').with({ scheme: 'vscode-tests' }));
    }
    doCreateLogger() { return new NullLogger(); }
}
let TestTextResourcePropertiesService = class TestTextResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', { overrideIdentifier: language, resource });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return (isLinux || isMacintosh) ? '\n' : '\r\n';
    }
};
TestTextResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], TestTextResourcePropertiesService);
export { TestTextResourcePropertiesService };
export class TestContextService {
    get onDidChangeWorkspaceName() { return this._onDidChangeWorkspaceName.event; }
    get onWillChangeWorkspaceFolders() { return this._onWillChangeWorkspaceFolders.event; }
    get onDidChangeWorkspaceFolders() { return this._onDidChangeWorkspaceFolders.event; }
    get onDidChangeWorkbenchState() { return this._onDidChangeWorkbenchState.event; }
    constructor(workspace = TestWorkspace, options = null) {
        this.workspace = workspace;
        this.options = options || Object.create(null);
        this._onDidChangeWorkspaceName = new Emitter();
        this._onWillChangeWorkspaceFolders = new Emitter();
        this._onDidChangeWorkspaceFolders = new Emitter();
        this._onDidChangeWorkbenchState = new Emitter();
    }
    getFolders() {
        return this.workspace ? this.workspace.folders : [];
    }
    getWorkbenchState() {
        if (this.workspace.configuration) {
            return 3 /* WorkbenchState.WORKSPACE */;
        }
        if (this.workspace.folders.length) {
            return 2 /* WorkbenchState.FOLDER */;
        }
        return 1 /* WorkbenchState.EMPTY */;
    }
    getCompleteWorkspace() {
        return Promise.resolve(this.getWorkspace());
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkspaceFolder(resource) {
        return this.workspace.getFolder(resource);
    }
    setWorkspace(workspace) {
        this.workspace = workspace;
    }
    getOptions() {
        return this.options;
    }
    updateOptions() { }
    isInsideWorkspace(resource) {
        if (resource && this.workspace) {
            return isEqualOrParent(resource, this.workspace.folders[0].uri);
        }
        return false;
    }
    toResource(workspaceRelativePath) {
        return URI.file(join('C:\\', workspaceRelativePath));
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        return URI.isUri(workspaceIdOrFolder) && isEqual(this.workspace.folders[0].uri, workspaceIdOrFolder);
    }
}
export class TestStorageService extends InMemoryStorageService {
    testEmitWillSaveState(reason) {
        super.emitWillSaveState(reason);
    }
}
export class TestHistoryService {
    constructor(root) {
        this.root = root;
    }
    async reopenLastClosedEditor() { }
    async goForward() { }
    async goBack() { }
    async goPrevious() { }
    async goLast() { }
    removeFromHistory(_input) { }
    clear() { }
    clearRecentlyOpened() { }
    getHistory() { return []; }
    async openNextRecentlyUsedEditor(group) { }
    async openPreviouslyUsedEditor(group) { }
    getLastActiveWorkspaceRoot(_schemeFilter) { return this.root; }
    getLastActiveFile(_schemeFilter) { return undefined; }
}
export class TestWorkingCopy extends Disposable {
    constructor(resource, isDirty = false, typeId = 'testWorkingCopyType') {
        super();
        this.resource = resource;
        this.typeId = typeId;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this.capabilities = 0 /* WorkingCopyCapabilities.None */;
        this.dirty = false;
        this.name = basename(this.resource);
        this.dirty = isDirty;
    }
    setDirty(dirty) {
        if (this.dirty !== dirty) {
            this.dirty = dirty;
            this._onDidChangeDirty.fire();
        }
    }
    setContent(content) {
        this._onDidChangeContent.fire();
    }
    isDirty() {
        return this.dirty;
    }
    isModified() {
        return this.isDirty();
    }
    async save(options, stat) {
        this._onDidSave.fire({ reason: options?.reason ?? 1 /* SaveReason.EXPLICIT */, stat: stat ?? createFileStat(this.resource), source: options?.source });
        return true;
    }
    async revert(options) {
        this.setDirty(false);
    }
    async backup(token) {
        return {};
    }
}
export function createFileStat(resource, readonly = false, isFile, isDirectory, children) {
    return {
        resource,
        etag: Date.now().toString(),
        mtime: Date.now(),
        ctime: Date.now(),
        size: 42,
        isFile: isFile ?? true,
        isDirectory: isDirectory ?? false,
        isSymbolicLink: false,
        readonly,
        locked: false,
        name: basename(resource),
        children: children?.map(c => createFileStat(c.resource, false, c.isFile, c.isDirectory))
    };
}
export class TestWorkingCopyFileService {
    constructor() {
        this.onWillRunWorkingCopyFileOperation = Event.None;
        this.onDidFailWorkingCopyFileOperation = Event.None;
        this.onDidRunWorkingCopyFileOperation = Event.None;
        this.hasSaveParticipants = false;
    }
    addFileOperationParticipant(participant) { return Disposable.None; }
    addSaveParticipant(participant) { return Disposable.None; }
    async runSaveParticipants(workingCopy, context, progress, token) { }
    async delete(operations, token, undoInfo) { }
    registerWorkingCopyProvider(provider) { return Disposable.None; }
    getDirty(resource) { return []; }
    create(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
    createFolder(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
    move(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
    copy(operations, token, undoInfo) { throw new Error('Method not implemented.'); }
}
export function mock() {
    return function () { };
}
export class TestExtensionService extends NullExtensionService {
}
export const TestProductService = { _serviceBrand: undefined, ...product };
export class TestActivityService {
    constructor() {
        this.onDidChangeActivity = Event.None;
    }
    getViewContainerActivities(viewContainerId) {
        return [];
    }
    getActivity(id) {
        return [];
    }
    showViewContainerActivity(viewContainerId, badge) {
        return this;
    }
    showViewActivity(viewId, badge) {
        return this;
    }
    showAccountsActivity(activity) {
        return this;
    }
    showGlobalActivity(activity) {
        return this;
    }
    dispose() { }
}
export const NullFilesConfigurationService = new class {
    constructor() {
        this.onDidChangeAutoSaveConfiguration = Event.None;
        this.onDidChangeAutoSaveDisabled = Event.None;
        this.onDidChangeReadonly = Event.None;
        this.onDidChangeFilesAssociation = Event.None;
        this.isHotExitEnabled = false;
        this.hotExitConfiguration = undefined;
    }
    getAutoSaveConfiguration() { throw new Error('Method not implemented.'); }
    getAutoSaveMode() { throw new Error('Method not implemented.'); }
    hasShortAutoSaveDelay() { throw new Error('Method not implemented.'); }
    toggleAutoSave() { throw new Error('Method not implemented.'); }
    enableAutoSaveAfterShortDelay(resourceOrEditor) { throw new Error('Method not implemented.'); }
    disableAutoSave(resourceOrEditor) { throw new Error('Method not implemented.'); }
    isReadonly(resource, stat) { return false; }
    async updateReadonly(resource, readonly) { }
    preventSaveConflicts(resource, language) { throw new Error('Method not implemented.'); }
};
export class TestWorkspaceTrustEnablementService {
    constructor(isEnabled = true) {
        this.isEnabled = isEnabled;
    }
    isWorkspaceTrustEnabled() {
        return this.isEnabled;
    }
}
export class TestWorkspaceTrustManagementService extends Disposable {
    constructor(trusted = true) {
        super();
        this.trusted = trusted;
        this._onDidChangeTrust = this._register(new Emitter());
        this.onDidChangeTrust = this._onDidChangeTrust.event;
        this._onDidChangeTrustedFolders = this._register(new Emitter());
        this.onDidChangeTrustedFolders = this._onDidChangeTrustedFolders.event;
        this._onDidInitiateWorkspaceTrustRequestOnStartup = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequestOnStartup = this._onDidInitiateWorkspaceTrustRequestOnStartup.event;
    }
    get acceptsOutOfWorkspaceFiles() {
        throw new Error('Method not implemented.');
    }
    set acceptsOutOfWorkspaceFiles(value) {
        throw new Error('Method not implemented.');
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        throw new Error('Method not implemented.');
    }
    getTrustedUris() {
        throw new Error('Method not implemented.');
    }
    setParentFolderTrust(trusted) {
        throw new Error('Method not implemented.');
    }
    getUriTrustInfo(uri) {
        throw new Error('Method not implemented.');
    }
    async setTrustedUris(folders) {
        throw new Error('Method not implemented.');
    }
    async setUrisTrust(uris, trusted) {
        throw new Error('Method not implemented.');
    }
    canSetParentFolderTrust() {
        throw new Error('Method not implemented.');
    }
    canSetWorkspaceTrust() {
        throw new Error('Method not implemented.');
    }
    isWorkspaceTrusted() {
        return this.trusted;
    }
    isWorkspaceTrustForced() {
        return false;
    }
    get workspaceTrustInitialized() {
        return Promise.resolve();
    }
    get workspaceResolved() {
        return Promise.resolve();
    }
    async setWorkspaceTrust(trusted) {
        if (this.trusted !== trusted) {
            this.trusted = trusted;
            this._onDidChangeTrust.fire(this.trusted);
        }
    }
}
export class TestWorkspaceTrustRequestService extends Disposable {
    constructor(_trusted) {
        super();
        this._trusted = _trusted;
        this._onDidInitiateOpenFilesTrustRequest = this._register(new Emitter());
        this.onDidInitiateOpenFilesTrustRequest = this._onDidInitiateOpenFilesTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequest = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequest = this._onDidInitiateWorkspaceTrustRequest.event;
        this._onDidInitiateWorkspaceTrustRequestOnStartup = this._register(new Emitter());
        this.onDidInitiateWorkspaceTrustRequestOnStartup = this._onDidInitiateWorkspaceTrustRequestOnStartup.event;
        this.requestOpenUrisHandler = async (uris) => {
            return 1 /* WorkspaceTrustUriResponse.Open */;
        };
    }
    requestOpenFilesTrust(uris) {
        return this.requestOpenUrisHandler(uris);
    }
    async completeOpenFilesTrustRequest(result, saveResponse) {
        throw new Error('Method not implemented.');
    }
    cancelWorkspaceTrustRequest() {
        throw new Error('Method not implemented.');
    }
    async completeWorkspaceTrustRequest(trusted) {
        throw new Error('Method not implemented.');
    }
    async requestWorkspaceTrust(options) {
        return this._trusted;
    }
    requestWorkspaceTrustOnStartup() {
        throw new Error('Method not implemented.');
    }
}
export class TestMarkerService {
    constructor() {
        this.onMarkerChanged = Event.None;
    }
    getStatistics() { throw new Error('Method not implemented.'); }
    changeOne(owner, resource, markers) { }
    changeAll(owner, data) { }
    remove(owner, resources) { }
    read(filter) { return []; }
    installResourceFilter(resource, reason) {
        return { dispose: () => { } };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2NvbW1vbi93b3JrYmVuY2hUZXN0U2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUV6RixPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBdUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUUxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV0RixPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFJNUUsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUM7QUFHbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFXLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQVMzRyxNQUFNLE9BQU8saUJBQWtCLFNBQVEscUJBQXFCO0lBQzNELFlBQVksUUFBYztRQUN6QixLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxR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
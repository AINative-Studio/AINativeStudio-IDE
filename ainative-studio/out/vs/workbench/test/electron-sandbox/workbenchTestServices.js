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
import { Event } from '../../../base/common/event.js';
import { workbenchInstantiationService as browserWorkbenchInstantiationService, TestEncodingOracle, TestEnvironmentService, TestLifecycleService } from '../browser/workbenchTestServices.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { AbstractNativeExtensionTipsService } from '../../../platform/extensionManagement/common/extensionTipsService.js';
import { IExtensionManagementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { NativeTextFileService } from '../../services/textfile/electron-sandbox/nativeTextFileService.js';
import { insert } from '../../../base/common/arrays.js';
import { Schemas } from '../../../base/common/network.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../platform/log/common/log.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { NativeWorkingCopyBackupService } from '../../services/workingCopy/electron-sandbox/workingCopyBackupService.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
export class TestSharedProcessService {
    createRawConnection() { throw new Error('Not Implemented'); }
    getChannel(channelName) { return undefined; }
    registerChannel(channelName, channel) { }
    notifyRestored() { }
}
export class TestNativeHostService {
    constructor() {
        this.windowId = -1;
        this.onDidOpenMainWindow = Event.None;
        this.onDidMaximizeWindow = Event.None;
        this.onDidUnmaximizeWindow = Event.None;
        this.onDidFocusMainWindow = Event.None;
        this.onDidBlurMainWindow = Event.None;
        this.onDidFocusMainOrAuxiliaryWindow = Event.None;
        this.onDidBlurMainOrAuxiliaryWindow = Event.None;
        this.onDidResumeOS = Event.None;
        this.onDidChangeColorScheme = Event.None;
        this.onDidChangePassword = Event.None;
        this.onDidTriggerWindowSystemContextMenu = Event.None;
        this.onDidChangeWindowFullScreen = Event.None;
        this.onDidChangeDisplay = Event.None;
        this.windowCount = Promise.resolve(1);
    }
    getWindowCount() { return this.windowCount; }
    async getWindows() { return []; }
    async getActiveWindowId() { return undefined; }
    async getActiveWindowPosition() { return undefined; }
    async getNativeWindowHandle(windowId) { return undefined; }
    openWindow(arg1, arg2) {
        throw new Error('Method not implemented.');
    }
    async toggleFullScreen() { }
    async isMaximized() { return true; }
    async isFullScreen() { return true; }
    async maximizeWindow() { }
    async unmaximizeWindow() { }
    async minimizeWindow() { }
    async moveWindowTop(options) { }
    getCursorScreenPoint() { throw new Error('Method not implemented.'); }
    async positionWindow(position, options) { }
    async updateWindowControls(options) { }
    async setMinimumSize(width, height) { }
    async saveWindowSplash(value) { }
    async focusWindow(options) { }
    async showMessageBox(options) { throw new Error('Method not implemented.'); }
    async showSaveDialog(options) { throw new Error('Method not implemented.'); }
    async showOpenDialog(options) { throw new Error('Method not implemented.'); }
    async pickFileFolderAndOpen(options) { }
    async pickFileAndOpen(options) { }
    async pickFolderAndOpen(options) { }
    async pickWorkspaceAndOpen(options) { }
    async showItemInFolder(path) { }
    async setRepresentedFilename(path) { }
    async isAdmin() { return false; }
    async writeElevated(source, target) { }
    async isRunningUnderARM64Translation() { return false; }
    async getOSProperties() { return Object.create(null); }
    async getOSStatistics() { return Object.create(null); }
    async getOSVirtualMachineHint() { return 0; }
    async getOSColorScheme() { return { dark: true, highContrast: false }; }
    async hasWSLFeatureInstalled() { return false; }
    async getProcessId() { throw new Error('Method not implemented.'); }
    async killProcess() { }
    async setDocumentEdited(edited) { }
    async openExternal(url, defaultApplication) { return false; }
    async updateTouchBar() { }
    async moveItemToTrash() { }
    async newWindowTab() { }
    async showPreviousWindowTab() { }
    async showNextWindowTab() { }
    async moveWindowTabToNewWindow() { }
    async mergeAllWindowTabs() { }
    async toggleWindowTabsBar() { }
    async installShellCommand() { }
    async uninstallShellCommand() { }
    async notifyReady() { }
    async relaunch(options) { }
    async reload() { }
    async closeWindow() { }
    async quit() { }
    async exit(code) { }
    async openDevTools(options) { }
    async toggleDevTools() { }
    async openGPUInfoWindow() { }
    async resolveProxy(url) { return undefined; }
    async lookupAuthorization(authInfo) { return undefined; }
    async lookupKerberosAuthorization(url) { return undefined; }
    async loadCertificates() { return []; }
    async findFreePort(startPort, giveUpAfter, timeout, stride) { return -1; }
    async readClipboardText(type) { return ''; }
    async writeClipboardText(text, type) { }
    async readClipboardFindText() { return ''; }
    async writeClipboardFindText(text) { }
    async writeClipboardBuffer(format, buffer, type) { }
    async readImage() { return Uint8Array.from([]); }
    async readClipboardBuffer(format) { return VSBuffer.wrap(Uint8Array.from([])); }
    async hasClipboard(format, type) { return false; }
    async windowsGetStringRegKey(hive, path, name) { return undefined; }
    async profileRenderer() { throw new Error(); }
    async getScreenshot() { return undefined; }
}
let TestExtensionTipsService = class TestExtensionTipsService extends AbstractNativeExtensionTipsService {
    constructor(environmentService, telemetryService, extensionManagementService, storageService, nativeHostService, extensionRecommendationNotificationService, fileService, productService) {
        super(environmentService.userHome, nativeHostService, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService);
    }
};
TestExtensionTipsService = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ITelemetryService),
    __param(2, IExtensionManagementService),
    __param(3, IStorageService),
    __param(4, INativeHostService),
    __param(5, IExtensionRecommendationNotificationService),
    __param(6, IFileService),
    __param(7, IProductService)
], TestExtensionTipsService);
export { TestExtensionTipsService };
export function workbenchInstantiationService(overrides, disposables = new DisposableStore()) {
    const instantiationService = browserWorkbenchInstantiationService({
        workingCopyBackupService: () => disposables.add(new TestNativeWorkingCopyBackupService()),
        ...overrides
    }, disposables);
    instantiationService.stub(INativeHostService, new TestNativeHostService());
    return instantiationService;
}
let TestServiceAccessor = class TestServiceAccessor {
    constructor(lifecycleService, textFileService, filesConfigurationService, contextService, modelService, fileService, nativeHostService, fileDialogService, workingCopyBackupService, workingCopyService, editorService) {
        this.lifecycleService = lifecycleService;
        this.textFileService = textFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.contextService = contextService;
        this.modelService = modelService;
        this.fileService = fileService;
        this.nativeHostService = nativeHostService;
        this.fileDialogService = fileDialogService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.workingCopyService = workingCopyService;
        this.editorService = editorService;
    }
};
TestServiceAccessor = __decorate([
    __param(0, ILifecycleService),
    __param(1, ITextFileService),
    __param(2, IFilesConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IModelService),
    __param(5, IFileService),
    __param(6, INativeHostService),
    __param(7, IFileDialogService),
    __param(8, IWorkingCopyBackupService),
    __param(9, IWorkingCopyService),
    __param(10, IEditorService)
], TestServiceAccessor);
export { TestServiceAccessor };
export class TestNativeTextFileServiceWithEncodingOverrides extends NativeTextFileService {
    get encoding() {
        if (!this._testEncoding) {
            this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
        }
        return this._testEncoding;
    }
}
export class TestNativeWorkingCopyBackupService extends NativeWorkingCopyBackupService {
    constructor() {
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        const fileService = new FileService(logService);
        const lifecycleService = new TestLifecycleService();
        super(environmentService, fileService, logService, lifecycleService);
        const inMemoryFileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(fileService.registerProvider(Schemas.inMemory, inMemoryFileSystemProvider));
        const uriIdentityService = this._register(new UriIdentityService(fileService));
        const userDataProfilesService = this._register(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        this._register(fileService.registerProvider(Schemas.vscodeUserData, this._register(new FileUserDataProvider(Schemas.file, inMemoryFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService))));
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this.pendingBackupsArr = [];
        this.discardedAllBackups = false;
        this._register(fileService);
        this._register(lifecycleService);
    }
    testGetFileService() {
        return this.fileService;
    }
    async waitForAllBackups() {
        await Promise.all(this.pendingBackupsArr);
    }
    joinBackupResource() {
        return new Promise(resolve => this.backupResourceJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        const p = super.backup(identifier, content, versionId, meta, token);
        const removeFromPendingBackups = insert(this.pendingBackupsArr, p.then(undefined, undefined));
        try {
            await p;
        }
        finally {
            removeFromPendingBackups();
        }
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    joinDiscardBackup() {
        return new Promise(resolve => this.discardBackupJoiners.push(resolve));
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async discardBackups(filter) {
        this.discardedAllBackups = true;
        return super.discardBackups(filter);
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2VsZWN0cm9uLXNhbmRib3gvd29ya2JlbmNoVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsNkJBQTZCLElBQUksb0NBQW9DLEVBQTZCLGtCQUFrQixFQUFFLHNCQUFzQixFQUF5RSxvQkFBb0IsRUFBdUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyVCxPQUFPLEVBQUUsa0JBQWtCLEVBQW9ELE1BQU0sMkNBQTJDLENBQUM7QUFDakksT0FBTyxFQUFFLFFBQVEsRUFBNEMsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFFakYsT0FBTyxFQUFFLGtCQUFrQixFQUE0QixNQUFNLDZDQUE2QyxDQUFDO0FBSzNHLE9BQU8sRUFBdUIseUJBQXlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzFILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQzVJLE9BQU8sRUFBRSxlQUFlLEVB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
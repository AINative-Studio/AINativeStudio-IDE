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
import { Emitter, Event } from '../../../../base/common/event.js';
import { IHostService } from './host.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isFolderToOpen, isWorkspaceToOpen, isFileToOpen } from '../../../../platform/window/common/window.js';
import { isResourceEditorInput, pathsToEditors } from '../../../common/editor.js';
import { whenEditorClosed } from '../../../browser/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { EventType, ModifierKeyEmitter, addDisposableListener, addDisposableThrottledListener, detectFullscreen, disposableWindowInterval, getActiveDocument, getWindowId, onDidRegisterWindow, trackFocus } from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { memoize } from '../../../../base/common/decorators.js';
import { parseLineAndColumnAware } from '../../../../base/common/extpath.js';
import { IWorkspaceEditingService } from '../../workspaces/common/workspaceEditing.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getWorkspaceIdentifier } from '../../workspaces/browser/workspaces.js';
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { isUndefined } from '../../../../base/common/types.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Schemas } from '../../../../base/common/network.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { mainWindow, isAuxiliaryWindow } from '../../../../base/browser/window.js';
import { isIOS, isMacintosh } from '../../../../base/common/platform.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
var HostShutdownReason;
(function (HostShutdownReason) {
    /**
     * An unknown shutdown reason.
     */
    HostShutdownReason[HostShutdownReason["Unknown"] = 1] = "Unknown";
    /**
     * A shutdown that was potentially triggered by keyboard use.
     */
    HostShutdownReason[HostShutdownReason["Keyboard"] = 2] = "Keyboard";
    /**
     * An explicit shutdown via code.
     */
    HostShutdownReason[HostShutdownReason["Api"] = 3] = "Api";
})(HostShutdownReason || (HostShutdownReason = {}));
let BrowserHostService = class BrowserHostService extends Disposable {
    constructor(layoutService, configurationService, fileService, labelService, environmentService, instantiationService, lifecycleService, logService, dialogService, contextService, userDataProfilesService) {
        super();
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.lifecycleService = lifecycleService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.userDataProfilesService = userDataProfilesService;
        this.shutdownReason = HostShutdownReason.Unknown;
        if (environmentService.options?.workspaceProvider) {
            this.workspaceProvider = environmentService.options.workspaceProvider;
        }
        else {
            this.workspaceProvider = new class {
                constructor() {
                    this.workspace = undefined;
                    this.trusted = undefined;
                }
                async open() { return true; }
            };
        }
        this.registerListeners();
    }
    registerListeners() {
        // Veto shutdown depending on `window.confirmBeforeClose` setting
        this._register(this.lifecycleService.onBeforeShutdown(e => this.onBeforeShutdown(e)));
        // Track modifier keys to detect keybinding usage
        this._register(ModifierKeyEmitter.getInstance().event(() => this.updateShutdownReasonFromEvent()));
    }
    onBeforeShutdown(e) {
        switch (this.shutdownReason) {
            // Unknown / Keyboard shows veto depending on setting
            case HostShutdownReason.Unknown:
            case HostShutdownReason.Keyboard: {
                const confirmBeforeClose = this.configurationService.getValue('window.confirmBeforeClose');
                if (confirmBeforeClose === 'always' || (confirmBeforeClose === 'keyboardOnly' && this.shutdownReason === HostShutdownReason.Keyboard)) {
                    e.veto(true, 'veto.confirmBeforeClose');
                }
                break;
            }
            // Api never shows veto
            case HostShutdownReason.Api:
                break;
        }
        // Unset for next shutdown
        this.shutdownReason = HostShutdownReason.Unknown;
    }
    updateShutdownReasonFromEvent() {
        if (this.shutdownReason === HostShutdownReason.Api) {
            return; // do not overwrite any explicitly set shutdown reason
        }
        if (ModifierKeyEmitter.getInstance().isModifierPressed) {
            this.shutdownReason = HostShutdownReason.Keyboard;
        }
        else {
            this.shutdownReason = HostShutdownReason.Unknown;
        }
    }
    //#region Focus
    get onDidChangeFocus() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const focusTracker = disposables.add(trackFocus(window));
            const visibilityTracker = disposables.add(new DomEmitter(window.document, 'visibilitychange'));
            Event.any(Event.map(focusTracker.onDidFocus, () => this.hasFocus, disposables), Event.map(focusTracker.onDidBlur, () => this.hasFocus, disposables), Event.map(visibilityTracker.event, () => this.hasFocus, disposables), Event.map(this.onDidChangeActiveWindow, () => this.hasFocus, disposables))(focus => emitter.fire(focus));
        }, { window: mainWindow, disposables: this._store }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    get hasFocus() {
        return getActiveDocument().hasFocus();
    }
    async hadLastFocus() {
        return true;
    }
    async focus(targetWindow) {
        targetWindow.focus();
    }
    //#endregion
    //#region Window
    get onDidChangeActiveWindow() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const windowId = getWindowId(window);
            // Emit via focus tracking
            const focusTracker = disposables.add(trackFocus(window));
            disposables.add(focusTracker.onDidFocus(() => emitter.fire(windowId)));
            // Emit via interval: immediately when opening an auxiliary window,
            // it is possible that document focus has not yet changed, so we
            // poll for a while to ensure we catch the event.
            if (isAuxiliaryWindow(window)) {
                disposables.add(disposableWindowInterval(window, () => {
                    const hasFocus = window.document.hasFocus();
                    if (hasFocus) {
                        emitter.fire(windowId);
                    }
                    return hasFocus;
                }, 100, 20));
            }
        }, { window: mainWindow, disposables: this._store }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    get onDidChangeFullScreen() {
        const emitter = this._register(new Emitter());
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            const windowId = getWindowId(window);
            const viewport = isIOS && window.visualViewport ? window.visualViewport /** Visual viewport */ : window /** Layout viewport */;
            // Fullscreen (Browser)
            for (const event of [EventType.FULLSCREEN_CHANGE, EventType.WK_FULLSCREEN_CHANGE]) {
                disposables.add(addDisposableListener(window.document, event, () => emitter.fire({ windowId, fullscreen: !!detectFullscreen(window) })));
            }
            // Fullscreen (Native)
            disposables.add(addDisposableThrottledListener(viewport, EventType.RESIZE, () => emitter.fire({ windowId, fullscreen: !!detectFullscreen(window) }), undefined, isMacintosh ? 2000 /* adjust for macOS animation */ : 800 /* can be throttled */));
        }, { window: mainWindow, disposables: this._store }));
        return emitter.event;
    }
    openWindow(arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(arg1, arg2);
        }
        return this.doOpenEmptyWindow(arg1);
    }
    async doOpenWindow(toOpen, options) {
        const payload = this.preservePayload(false /* not an empty window */, options);
        const fileOpenables = [];
        const foldersToAdd = [];
        const foldersToRemove = [];
        for (const openable of toOpen) {
            openable.label = openable.label || this.getRecentLabel(openable);
            // Folder
            if (isFolderToOpen(openable)) {
                if (options?.addMode) {
                    foldersToAdd.push({ uri: openable.folderUri });
                }
                else if (options?.removeMode) {
                    foldersToRemove.push(openable.folderUri);
                }
                else {
                    this.doOpen({ folderUri: openable.folderUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
                }
            }
            // Workspace
            else if (isWorkspaceToOpen(openable)) {
                this.doOpen({ workspaceUri: openable.workspaceUri }, { reuse: this.shouldReuse(options, false /* no file */), payload });
            }
            // File (handled later in bulk)
            else if (isFileToOpen(openable)) {
                fileOpenables.push(openable);
            }
        }
        // Handle Folders to add or remove
        if (foldersToAdd.length > 0 || foldersToRemove.length > 0) {
            this.withServices(async (accessor) => {
                const workspaceEditingService = accessor.get(IWorkspaceEditingService);
                if (foldersToAdd.length > 0) {
                    await workspaceEditingService.addFolders(foldersToAdd);
                }
                if (foldersToRemove.length > 0) {
                    await workspaceEditingService.removeFolders(foldersToRemove);
                }
            });
        }
        // Handle Files
        if (fileOpenables.length > 0) {
            this.withServices(async (accessor) => {
                const editorService = accessor.get(IEditorService);
                // Support mergeMode
                if (options?.mergeMode && fileOpenables.length === 4) {
                    const editors = coalesce(await pathsToEditors(fileOpenables, this.fileService, this.logService));
                    if (editors.length !== 4 || !isResourceEditorInput(editors[0]) || !isResourceEditorInput(editors[1]) || !isResourceEditorInput(editors[2]) || !isResourceEditorInput(editors[3])) {
                        return; // invalid resources
                    }
                    // Same Window: open via editor service in current window
                    if (this.shouldReuse(options, true /* file */)) {
                        editorService.openEditor({
                            input1: { resource: editors[0].resource },
                            input2: { resource: editors[1].resource },
                            base: { resource: editors[2].resource },
                            result: { resource: editors[3].resource },
                            options: { pinned: true }
                        });
                    }
                    // New Window: open into empty window
                    else {
                        const environment = new Map();
                        environment.set('mergeFile1', editors[0].resource.toString());
                        environment.set('mergeFile2', editors[1].resource.toString());
                        environment.set('mergeFileBase', editors[2].resource.toString());
                        environment.set('mergeFileResult', editors[3].resource.toString());
                        this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                    }
                }
                // Support diffMode
                else if (options?.diffMode && fileOpenables.length === 2) {
                    const editors = coalesce(await pathsToEditors(fileOpenables, this.fileService, this.logService));
                    if (editors.length !== 2 || !isResourceEditorInput(editors[0]) || !isResourceEditorInput(editors[1])) {
                        return; // invalid resources
                    }
                    // Same Window: open via editor service in current window
                    if (this.shouldReuse(options, true /* file */)) {
                        editorService.openEditor({
                            original: { resource: editors[0].resource },
                            modified: { resource: editors[1].resource },
                            options: { pinned: true }
                        });
                    }
                    // New Window: open into empty window
                    else {
                        const environment = new Map();
                        environment.set('diffFileSecondary', editors[0].resource.toString());
                        environment.set('diffFilePrimary', editors[1].resource.toString());
                        this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                    }
                }
                // Just open normally
                else {
                    for (const openable of fileOpenables) {
                        // Same Window: open via editor service in current window
                        if (this.shouldReuse(options, true /* file */)) {
                            let openables = [];
                            // Support: --goto parameter to open on line/col
                            if (options?.gotoLineMode) {
                                const pathColumnAware = parseLineAndColumnAware(openable.fileUri.path);
                                openables = [{
                                        fileUri: openable.fileUri.with({ path: pathColumnAware.path }),
                                        options: {
                                            selection: !isUndefined(pathColumnAware.line) ? { startLineNumber: pathColumnAware.line, startColumn: pathColumnAware.column || 1 } : undefined
                                        }
                                    }];
                            }
                            else {
                                openables = [openable];
                            }
                            editorService.openEditors(coalesce(await pathsToEditors(openables, this.fileService, this.logService)), undefined, { validateTrust: true });
                        }
                        // New Window: open into empty window
                        else {
                            const environment = new Map();
                            environment.set('openFile', openable.fileUri.toString());
                            if (options?.gotoLineMode) {
                                environment.set('gotoLineMode', 'true');
                            }
                            this.doOpen(undefined, { payload: Array.from(environment.entries()) });
                        }
                    }
                }
                // Support wait mode
                const waitMarkerFileURI = options?.waitMarkerFileURI;
                if (waitMarkerFileURI) {
                    (async () => {
                        // Wait for the resources to be closed in the text editor...
                        await this.instantiationService.invokeFunction(accessor => whenEditorClosed(accessor, fileOpenables.map(fileOpenable => fileOpenable.fileUri)));
                        // ...before deleting the wait marker file
                        await this.fileService.del(waitMarkerFileURI);
                    })();
                }
            });
        }
    }
    withServices(fn) {
        // Host service is used in a lot of contexts and some services
        // need to be resolved dynamically to avoid cyclic dependencies
        // (https://github.com/microsoft/vscode/issues/108522)
        this.instantiationService.invokeFunction(accessor => fn(accessor));
    }
    preservePayload(isEmptyWindow, options) {
        // Selectively copy payload: for now only extension debugging properties are considered
        const newPayload = new Array();
        if (!isEmptyWindow && this.environmentService.extensionDevelopmentLocationURI) {
            newPayload.push(['extensionDevelopmentPath', this.environmentService.extensionDevelopmentLocationURI.toString()]);
            if (this.environmentService.debugExtensionHost.debugId) {
                newPayload.push(['debugId', this.environmentService.debugExtensionHost.debugId]);
            }
            if (this.environmentService.debugExtensionHost.port) {
                newPayload.push(['inspect-brk-extensions', String(this.environmentService.debugExtensionHost.port)]);
            }
        }
        const newWindowProfile = options?.forceProfile
            ? this.userDataProfilesService.profiles.find(profile => profile.name === options?.forceProfile)
            : undefined;
        if (newWindowProfile && !newWindowProfile.isDefault) {
            newPayload.push(['profile', newWindowProfile.name]);
        }
        return newPayload.length ? newPayload : undefined;
    }
    getRecentLabel(openable) {
        if (isFolderToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(openable.folderUri, { verbose: 2 /* Verbosity.LONG */ });
        }
        if (isWorkspaceToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(getWorkspaceIdentifier(openable.workspaceUri), { verbose: 2 /* Verbosity.LONG */ });
        }
        return this.labelService.getUriLabel(openable.fileUri, { appendWorkspaceSuffix: true });
    }
    shouldReuse(options = Object.create(null), isFile) {
        if (options.waitMarkerFileURI) {
            return true; // always handle --wait in same window
        }
        const windowConfig = this.configurationService.getValue('window');
        const openInNewWindowConfig = isFile ? (windowConfig?.openFilesInNewWindow || 'off' /* default */) : (windowConfig?.openFoldersInNewWindow || 'default' /* default */);
        let openInNewWindow = (options.preferNewWindow || !!options.forceNewWindow) && !options.forceReuseWindow;
        if (!options.forceNewWindow && !options.forceReuseWindow && (openInNewWindowConfig === 'on' || openInNewWindowConfig === 'off')) {
            openInNewWindow = (openInNewWindowConfig === 'on');
        }
        return !openInNewWindow;
    }
    async doOpenEmptyWindow(options) {
        return this.doOpen(undefined, {
            reuse: options?.forceReuseWindow,
            payload: this.preservePayload(true /* empty window */, options)
        });
    }
    async doOpen(workspace, options) {
        // When we are in a temporary workspace and are asked to open a local folder
        // we swap that folder into the workspace to avoid a window reload. Access
        // to local resources is only possible without a window reload because it
        // needs user activation.
        if (workspace && isFolderToOpen(workspace) && workspace.folderUri.scheme === Schemas.file && isTemporaryWorkspace(this.contextService.getWorkspace())) {
            this.withServices(async (accessor) => {
                const workspaceEditingService = accessor.get(IWorkspaceEditingService);
                await workspaceEditingService.updateFolders(0, this.contextService.getWorkspace().folders.length, [{ uri: workspace.folderUri }]);
            });
            return;
        }
        // We know that `workspaceProvider.open` will trigger a shutdown
        // with `options.reuse` so we handle this expected shutdown
        if (options?.reuse) {
            await this.handleExpectedShutdown(4 /* ShutdownReason.LOAD */);
        }
        const opened = await this.workspaceProvider.open(workspace, options);
        if (!opened) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Warning,
                message: localize('unableToOpenExternal', "The browser interrupted the opening of a new tab or window. Press 'Open' to open it anyway."),
                primaryButton: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, "&&Open")
            });
            if (confirmed) {
                await this.workspaceProvider.open(workspace, options);
            }
        }
    }
    async toggleFullScreen(targetWindow) {
        const target = this.layoutService.getContainer(targetWindow);
        // Chromium
        if (targetWindow.document.fullscreen !== undefined) {
            if (!targetWindow.document.fullscreen) {
                try {
                    return await target.requestFullscreen();
                }
                catch (error) {
                    this.logService.warn('toggleFullScreen(): requestFullscreen failed'); // https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
                }
            }
            else {
                try {
                    return await targetWindow.document.exitFullscreen();
                }
                catch (error) {
                    this.logService.warn('toggleFullScreen(): exitFullscreen failed');
                }
            }
        }
        // Safari and Edge 14 are all using webkit prefix
        if (targetWindow.document.webkitIsFullScreen !== undefined) {
            try {
                if (!targetWindow.document.webkitIsFullScreen) {
                    target.webkitRequestFullscreen(); // it's async, but doesn't return a real promise.
                }
                else {
                    targetWindow.document.webkitExitFullscreen(); // it's async, but doesn't return a real promise.
                }
            }
            catch {
                this.logService.warn('toggleFullScreen(): requestFullscreen/exitFullscreen failed');
            }
        }
    }
    async moveTop(targetWindow) {
        // There seems to be no API to bring a window to front in browsers
    }
    async getCursorScreenPoint() {
        return undefined;
    }
    //#endregion
    //#region Lifecycle
    async restart() {
        this.reload();
    }
    async reload() {
        await this.handleExpectedShutdown(3 /* ShutdownReason.RELOAD */);
        mainWindow.location.reload();
    }
    async close() {
        await this.handleExpectedShutdown(1 /* ShutdownReason.CLOSE */);
        mainWindow.close();
    }
    async withExpectedShutdown(expectedShutdownTask) {
        const previousShutdownReason = this.shutdownReason;
        try {
            this.shutdownReason = HostShutdownReason.Api;
            return await expectedShutdownTask();
        }
        finally {
            this.shutdownReason = previousShutdownReason;
        }
    }
    async handleExpectedShutdown(reason) {
        // Update shutdown reason in a way that we do
        // not show a dialog because this is a expected
        // shutdown.
        this.shutdownReason = HostShutdownReason.Api;
        // Signal shutdown reason to lifecycle
        return this.lifecycleService.withExpectedShutdown(reason);
    }
    //#endregion
    //#region Screenshots
    async getScreenshot() {
        // Gets a screenshot from the browser. This gets the screenshot via the browser's display
        // media API which will typically offer a picker of all available screens and windows for
        // the user to select. Using the video stream provided by the display media API, this will
        // capture a single frame of the video and convert it to a JPEG image.
        const store = new DisposableStore();
        // Create a video element to play the captured screen source
        const video = document.createElement('video');
        store.add(toDisposable(() => video.remove()));
        let stream;
        try {
            // Create a stream from the screen source (capture screen without audio)
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: false,
                video: true
            });
            // Set the stream as the source of the video element
            video.srcObject = stream;
            video.play();
            // Wait for the video to load properly before capturing the screenshot
            await Promise.all([
                new Promise(r => store.add(addDisposableListener(video, 'loadedmetadata', () => r()))),
                new Promise(r => store.add(addDisposableListener(video, 'canplaythrough', () => r())))
            ]);
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return undefined;
            }
            // Draw the portion of the video (x, y) with the specified width and height
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Convert the canvas to a Blob (JPEG format), use .95 for quality
            const blob = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95));
            if (!blob) {
                throw new Error('Failed to create blob from canvas');
            }
            // Convert the Blob to an ArrayBuffer
            return blob.arrayBuffer();
        }
        catch (error) {
            console.error('Error taking screenshot:', error);
            return undefined;
        }
        finally {
            store.dispose();
            if (stream) {
                for (const track of stream.getTracks()) {
                    track.stop();
                }
            }
        }
    }
    //#endregion
    //#region Native Handle
    async getNativeWindowHandle(_windowId) {
        return undefined;
    }
};
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeFocus", null);
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeActiveWindow", null);
__decorate([
    memoize
], BrowserHostService.prototype, "onDidChangeFullScreen", null);
BrowserHostService = __decorate([
    __param(0, ILayoutService),
    __param(1, IConfigurationService),
    __param(2, IFileService),
    __param(3, ILabelService),
    __param(4, IBrowserWorkbenchEnvironmentService),
    __param(5, IInstantiationService),
    __param(6, ILifecycleService),
    __param(7, ILogService),
    __param(8, IDialogService),
    __param(9, IWorkspaceContextService),
    __param(10, IUserDataProfilesService)
], BrowserHostService);
export { BrowserHostService };
registerSingleton(IHostService, BrowserHostService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlckhvc3RTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9ob3N0L2Jyb3dzZXIvYnJvd3Nlckhvc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUN6QyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXdELGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQW1ELE1BQU0sOENBQThDLENBQUM7QUFDdE4sT0FBTyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFhLE1BQU0sNENBQTRDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxxQkFBcUIsRUFBRSw4QkFBOEIsRUFBRSxnQkFBZ0IsRUFBRSx3QkFBd0IsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0s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
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
var WindowTitle_1;
import { localize } from '../../../../nls.js';
import { dirname, basename } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isWindows, isWeb, isMacintosh, isNative } from '../../../../base/common/platform.js';
import { trim } from '../../../../base/common/strings.js';
import { template } from '../../../../base/common/labels.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Emitter } from '../../../../base/common/event.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { getWindowById } from '../../../../base/browser/dom.js';
import { IDecorationsService } from '../../../services/decorations/common/decorations.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
var WindowSettingNames;
(function (WindowSettingNames) {
    WindowSettingNames["titleSeparator"] = "window.titleSeparator";
    WindowSettingNames["title"] = "window.title";
})(WindowSettingNames || (WindowSettingNames = {}));
export const defaultWindowTitle = (() => {
    if (isMacintosh && isNative) {
        return '${activeEditorShort}${separator}${rootName}${separator}${profileName}'; // macOS has native dirty indicator
    }
    const base = '${dirty}${activeEditorShort}${separator}${rootName}${separator}${profileName}${separator}${appName}';
    if (isWeb) {
        return base + '${separator}${remoteName}'; // Web: always show remote name
    }
    return base;
})();
export const defaultWindowTitleSeparator = isMacintosh ? ' \u2014 ' : ' - ';
let WindowTitle = class WindowTitle extends Disposable {
    static { WindowTitle_1 = this; }
    static { this.NLS_USER_IS_ADMIN = isWindows ? localize('userIsAdmin', "[Administrator]") : localize('userIsSudo', "[Superuser]"); }
    static { this.NLS_EXTENSION_HOST = localize('devExtensionWindowTitlePrefix', "[Extension Development Host]"); }
    static { this.TITLE_DIRTY = '\u25cf '; }
    get value() { return this.title ?? ''; }
    get workspaceName() { return this.labelService.getWorkspaceLabel(this.contextService.getWorkspace()); }
    get fileName() {
        const activeEditor = this.editorService.activeEditor;
        if (!activeEditor) {
            return undefined;
        }
        const fileName = activeEditor.getTitle(0 /* Verbosity.SHORT */);
        const dirty = activeEditor?.isDirty() && !activeEditor.isSaving() ? WindowTitle_1.TITLE_DIRTY : '';
        return `${dirty}${fileName}`;
    }
    constructor(targetWindow, editorGroupsContainer, configurationService, contextKeyService, editorService, environmentService, contextService, labelService, userDataProfileService, productService, viewsService, decorationsService, accessibilityService) {
        super();
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        this.labelService = labelService;
        this.userDataProfileService = userDataProfileService;
        this.productService = productService;
        this.viewsService = viewsService;
        this.decorationsService = decorationsService;
        this.accessibilityService = accessibilityService;
        this.properties = { isPure: true, isAdmin: false, prefix: undefined };
        this.variables = new Map();
        this.activeEditorListeners = this._register(new DisposableStore());
        this.titleUpdater = this._register(new RunOnceScheduler(() => this.doUpdateTitle(), 0));
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.titleIncludesFocusedView = false;
        this.titleIncludesEditorState = false;
        this.editorService = editorService.createScoped(editorGroupsContainer, this._store);
        this.windowId = targetWindow.vscodeWindowId;
        this.checkTitleVariables();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationChanged(e)));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onActiveEditorChange()));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.titleUpdater.schedule()));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.titleUpdater.schedule()));
        this._register(this.contextService.onDidChangeWorkspaceName(() => this.titleUpdater.schedule()));
        this._register(this.labelService.onDidChangeFormatters(() => this.titleUpdater.schedule()));
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(() => this.titleUpdater.schedule()));
        this._register(this.viewsService.onDidChangeFocusedView(() => {
            if (this.titleIncludesFocusedView) {
                this.titleUpdater.schedule();
            }
        }));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this.variables)) {
                this.titleUpdater.schedule();
            }
        }));
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this.titleUpdater.schedule()));
    }
    onConfigurationChanged(event) {
        const affectsTitleConfiguration = event.affectsConfiguration("window.title" /* WindowSettingNames.title */);
        if (affectsTitleConfiguration) {
            this.checkTitleVariables();
        }
        if (affectsTitleConfiguration || event.affectsConfiguration("window.titleSeparator" /* WindowSettingNames.titleSeparator */)) {
            this.titleUpdater.schedule();
        }
    }
    checkTitleVariables() {
        const titleTemplate = this.configurationService.getValue("window.title" /* WindowSettingNames.title */);
        if (typeof titleTemplate === 'string') {
            this.titleIncludesFocusedView = titleTemplate.includes('${focusedView}');
            this.titleIncludesEditorState = titleTemplate.includes('${activeEditorState}');
        }
    }
    onActiveEditorChange() {
        // Dispose old listeners
        this.activeEditorListeners.clear();
        // Calculate New Window Title
        this.titleUpdater.schedule();
        // Apply listener for dirty and label changes
        const activeEditor = this.editorService.activeEditor;
        if (activeEditor) {
            this.activeEditorListeners.add(activeEditor.onDidChangeDirty(() => this.titleUpdater.schedule()));
            this.activeEditorListeners.add(activeEditor.onDidChangeLabel(() => this.titleUpdater.schedule()));
        }
        // Apply listeners for tracking focused code editor
        if (this.titleIncludesFocusedView) {
            const activeTextEditorControl = this.editorService.activeTextEditorControl;
            const textEditorControls = [];
            if (isCodeEditor(activeTextEditorControl)) {
                textEditorControls.push(activeTextEditorControl);
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                textEditorControls.push(activeTextEditorControl.getOriginalEditor(), activeTextEditorControl.getModifiedEditor());
            }
            for (const textEditorControl of textEditorControls) {
                this.activeEditorListeners.add(textEditorControl.onDidBlurEditorText(() => this.titleUpdater.schedule()));
                this.activeEditorListeners.add(textEditorControl.onDidFocusEditorText(() => this.titleUpdater.schedule()));
            }
        }
        // Apply listener for decorations to track editor state
        if (this.titleIncludesEditorState) {
            this.activeEditorListeners.add(this.decorationsService.onDidChangeDecorations(() => this.titleUpdater.schedule()));
        }
    }
    doUpdateTitle() {
        const title = this.getFullWindowTitle();
        if (title !== this.title) {
            // Always set the native window title to identify us properly to the OS
            let nativeTitle = title;
            if (!trim(nativeTitle)) {
                nativeTitle = this.productService.nameLong;
            }
            const window = getWindowById(this.windowId, true).window;
            if (!window.document.title && isMacintosh && nativeTitle === this.productService.nameLong) {
                // TODO@electron macOS: if we set a window title for
                // the first time and it matches the one we set in
                // `windowImpl.ts` somehow the window does not appear
                // in the "Windows" menu. As such, we set the title
                // briefly to something different to ensure macOS
                // recognizes we have a window.
                // See: https://github.com/microsoft/vscode/issues/191288
                window.document.title = `${this.productService.nameLong} ${WindowTitle_1.TITLE_DIRTY}`;
            }
            window.document.title = nativeTitle;
            this.title = title;
            this.onDidChangeEmitter.fire();
        }
    }
    getFullWindowTitle() {
        const { prefix, suffix } = this.getTitleDecorations();
        let title = this.getWindowTitle() || this.productService.nameLong;
        if (prefix) {
            title = `${prefix} ${title}`;
        }
        if (suffix) {
            title = `${title} ${suffix}`;
        }
        // Replace non-space whitespace
        return title.replace(/[^\S ]/g, ' ');
    }
    getTitleDecorations() {
        let prefix;
        let suffix;
        if (this.properties.prefix) {
            prefix = this.properties.prefix;
        }
        if (this.environmentService.isExtensionDevelopment) {
            prefix = !prefix
                ? WindowTitle_1.NLS_EXTENSION_HOST
                : `${WindowTitle_1.NLS_EXTENSION_HOST} - ${prefix}`;
        }
        if (this.properties.isAdmin) {
            suffix = WindowTitle_1.NLS_USER_IS_ADMIN;
        }
        return { prefix, suffix };
    }
    updateProperties(properties) {
        const isAdmin = typeof properties.isAdmin === 'boolean' ? properties.isAdmin : this.properties.isAdmin;
        const isPure = typeof properties.isPure === 'boolean' ? properties.isPure : this.properties.isPure;
        const prefix = typeof properties.prefix === 'string' ? properties.prefix : this.properties.prefix;
        if (isAdmin !== this.properties.isAdmin || isPure !== this.properties.isPure || prefix !== this.properties.prefix) {
            this.properties.isAdmin = isAdmin;
            this.properties.isPure = isPure;
            this.properties.prefix = prefix;
            this.titleUpdater.schedule();
        }
    }
    registerVariables(variables) {
        let changed = false;
        for (const { name, contextKey } of variables) {
            if (!this.variables.has(contextKey)) {
                this.variables.set(contextKey, name);
                changed = true;
            }
        }
        if (changed) {
            this.titleUpdater.schedule();
        }
    }
    /**
     * Possible template values:
     *
     * {activeEditorLong}: e.g. /Users/Development/myFolder/myFileFolder/myFile.txt
     * {activeEditorMedium}: e.g. myFolder/myFileFolder/myFile.txt
     * {activeEditorShort}: e.g. myFile.txt
     * {activeFolderLong}: e.g. /Users/Development/myFolder/myFileFolder
     * {activeFolderMedium}: e.g. myFolder/myFileFolder
     * {activeFolderShort}: e.g. myFileFolder
     * {rootName}: e.g. myFolder1, myFolder2, myFolder3
     * {rootPath}: e.g. /Users/Development
     * {folderName}: e.g. myFolder
     * {folderPath}: e.g. /Users/Development/myFolder
     * {appName}: e.g. VS Code
     * {remoteName}: e.g. SSH
     * {dirty}: indicator
     * {focusedView}: e.g. Terminal
     * {separator}: conditional separator
     * {activeEditorState}: e.g. Modified
     */
    getWindowTitle() {
        const editor = this.editorService.activeEditor;
        const workspace = this.contextService.getWorkspace();
        // Compute root
        let root;
        if (workspace.configuration) {
            root = workspace.configuration;
        }
        else if (workspace.folders.length) {
            root = workspace.folders[0].uri;
        }
        // Compute active editor folder
        const editorResource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
        let editorFolderResource = editorResource ? dirname(editorResource) : undefined;
        if (editorFolderResource?.path === '.') {
            editorFolderResource = undefined;
        }
        // Compute folder resource
        // Single Root Workspace: always the root single workspace in this case
        // Otherwise: root folder of the currently active file if any
        let folder = undefined;
        if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            folder = workspace.folders[0];
        }
        else if (editorResource) {
            folder = this.contextService.getWorkspaceFolder(editorResource) ?? undefined;
        }
        // Compute remote
        // vscode-remtoe: use as is
        // otherwise figure out if we have a virtual folder opened
        let remoteName = undefined;
        if (this.environmentService.remoteAuthority && !isWeb) {
            remoteName = this.labelService.getHostLabel(Schemas.vscodeRemote, this.environmentService.remoteAuthority);
        }
        else {
            const virtualWorkspaceLocation = getVirtualWorkspaceLocation(workspace);
            if (virtualWorkspaceLocation) {
                remoteName = this.labelService.getHostLabel(virtualWorkspaceLocation.scheme, virtualWorkspaceLocation.authority);
            }
        }
        // Variables
        const activeEditorShort = editor ? editor.getTitle(0 /* Verbosity.SHORT */) : '';
        const activeEditorMedium = editor ? editor.getTitle(1 /* Verbosity.MEDIUM */) : activeEditorShort;
        const activeEditorLong = editor ? editor.getTitle(2 /* Verbosity.LONG */) : activeEditorMedium;
        const activeFolderShort = editorFolderResource ? basename(editorFolderResource) : '';
        const activeFolderMedium = editorFolderResource ? this.labelService.getUriLabel(editorFolderResource, { relative: true }) : '';
        const activeFolderLong = editorFolderResource ? this.labelService.getUriLabel(editorFolderResource) : '';
        const rootName = this.labelService.getWorkspaceLabel(workspace);
        const rootNameShort = this.labelService.getWorkspaceLabel(workspace, { verbose: 0 /* LabelVerbosity.SHORT */ });
        const rootPath = root ? this.labelService.getUriLabel(root) : '';
        const folderName = folder ? folder.name : '';
        const folderPath = folder ? this.labelService.getUriLabel(folder.uri) : '';
        const dirty = editor?.isDirty() && !editor.isSaving() ? WindowTitle_1.TITLE_DIRTY : '';
        const appName = this.productService.nameLong;
        const profileName = this.userDataProfileService.currentProfile.isDefault ? '' : this.userDataProfileService.currentProfile.name;
        const focusedView = this.viewsService.getFocusedViewName();
        const activeEditorState = editorResource ? this.decorationsService.getDecoration(editorResource, false)?.tooltip : undefined;
        const variables = {};
        for (const [contextKey, name] of this.variables) {
            variables[name] = this.contextKeyService.getContextKeyValue(contextKey) ?? '';
        }
        let titleTemplate = this.configurationService.getValue("window.title" /* WindowSettingNames.title */);
        if (typeof titleTemplate !== 'string') {
            titleTemplate = defaultWindowTitle;
        }
        if (!this.titleIncludesEditorState && this.accessibilityService.isScreenReaderOptimized() && this.configurationService.getValue('accessibility.windowTitleOptimized')) {
            titleTemplate += '${separator}${activeEditorState}';
        }
        let separator = this.configurationService.getValue("window.titleSeparator" /* WindowSettingNames.titleSeparator */);
        if (typeof separator !== 'string') {
            separator = defaultWindowTitleSeparator;
        }
        return template(titleTemplate, {
            ...variables,
            activeEditorShort,
            activeEditorLong,
            activeEditorMedium,
            activeFolderShort,
            activeFolderMedium,
            activeFolderLong,
            rootName,
            rootPath,
            rootNameShort,
            folderName,
            folderPath,
            dirty,
            appName,
            remoteName,
            profileName,
            focusedView,
            activeEditorState,
            separator: { label: separator }
        });
    }
    isCustomTitleFormat() {
        if (this.accessibilityService.isScreenReaderOptimized() || this.titleIncludesEditorState) {
            return true;
        }
        const title = this.configurationService.inspect("window.title" /* WindowSettingNames.title */);
        const titleSeparator = this.configurationService.inspect("window.titleSeparator" /* WindowSettingNames.titleSeparator */);
        return title.value !== title.defaultValue || titleSeparator.value !== titleSeparator.defaultValue;
    }
};
WindowTitle = WindowTitle_1 = __decorate([
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IEditorService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IWorkspaceContextService),
    __param(7, ILabelService),
    __param(8, IUserDataProfileService),
    __param(9, IProductService),
    __param(10, IViewsService),
    __param(11, IDecorationsService),
    __param(12, IAccessibilityService)
], WindowTitle);
export { WindowTitle };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93VGl0bGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdGl0bGViYXIvd2luZG93VGl0bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxxQkFBcUIsRUFBNkIsTUFBTSw0REFBNEQsQ0FBQztBQUM5SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQWEsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsd0JBQXdCLEVBQW9DLE1BQU0sb0RBQW9ELENBQUM7QUFDaEksT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBK0IsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtD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
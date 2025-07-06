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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93VGl0bGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy90aXRsZWJhci93aW5kb3dUaXRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsT0FBTyxFQUFFLHFCQUFxQixFQUE2QixNQUFNLDREQUE0RCxDQUFDO0FBQzlILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBYSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSx3QkFBd0IsRUFBb0MsTUFBTSxvREFBb0QsQ0FBQztBQUNoSSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUErQixNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0Ms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
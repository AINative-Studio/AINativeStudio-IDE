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
var ResourceContextKey_1;
import { DisposableStore } from '../../base/common/lifecycle.js';
import { localize } from '../../nls.js';
import { IContextKeyService, RawContextKey } from '../../platform/contextkey/common/contextkey.js';
import { basename, dirname, extname, isEqual } from '../../base/common/resources.js';
import { ILanguageService } from '../../editor/common/languages/language.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IModelService } from '../../editor/common/services/model.js';
import { Schemas } from '../../base/common/network.js';
import { DEFAULT_EDITOR_ASSOCIATION } from './editor.js';
//#region < --- Workbench --- >
export const WorkbenchStateContext = new RawContextKey('workbenchState', undefined, { type: 'string', description: localize('workbenchState', "The kind of workspace opened in the window, either 'empty' (no workspace), 'folder' (single folder) or 'workspace' (multi-root workspace)") });
export const WorkspaceFolderCountContext = new RawContextKey('workspaceFolderCount', 0, localize('workspaceFolderCount', "The number of root folders in the workspace"));
export const OpenFolderWorkspaceSupportContext = new RawContextKey('openFolderWorkspaceSupport', true, true);
export const EnterMultiRootWorkspaceSupportContext = new RawContextKey('enterMultiRootWorkspaceSupport', true, true);
export const EmptyWorkspaceSupportContext = new RawContextKey('emptyWorkspaceSupport', true, true);
export const DirtyWorkingCopiesContext = new RawContextKey('dirtyWorkingCopies', false, localize('dirtyWorkingCopies', "Whether there are any working copies with unsaved changes"));
export const RemoteNameContext = new RawContextKey('remoteName', '', localize('remoteName', "The name of the remote the window is connected to or an empty string if not connected to any remote"));
export const VirtualWorkspaceContext = new RawContextKey('virtualWorkspace', '', localize('virtualWorkspace', "The scheme of the current workspace is from a virtual file system or an empty string."));
export const TemporaryWorkspaceContext = new RawContextKey('temporaryWorkspace', false, localize('temporaryWorkspace', "The scheme of the current workspace is from a temporary file system."));
export const IsMainWindowFullscreenContext = new RawContextKey('isFullscreen', false, localize('isFullscreen', "Whether the main window is in fullscreen mode"));
export const IsAuxiliaryWindowFocusedContext = new RawContextKey('isAuxiliaryWindowFocusedContext', false, localize('isAuxiliaryWindowFocusedContext', "Whether an auxiliary window is focused"));
export const HasWebFileSystemAccess = new RawContextKey('hasWebFileSystemAccess', false, true); // Support for FileSystemAccess web APIs (https://wicg.github.io/file-system-access)
export const EmbedderIdentifierContext = new RawContextKey('embedderIdentifier', undefined, localize('embedderIdentifier', 'The identifier of the embedder according to the product service, if one is defined'));
//#endregion
//#region < --- Editor --- >
// Editor State Context Keys
export const ActiveEditorDirtyContext = new RawContextKey('activeEditorIsDirty', false, localize('activeEditorIsDirty', "Whether the active editor has unsaved changes"));
export const ActiveEditorPinnedContext = new RawContextKey('activeEditorIsNotPreview', false, localize('activeEditorIsNotPreview', "Whether the active editor is not in preview mode"));
export const ActiveEditorFirstInGroupContext = new RawContextKey('activeEditorIsFirstInGroup', false, localize('activeEditorIsFirstInGroup', "Whether the active editor is the first one in its group"));
export const ActiveEditorLastInGroupContext = new RawContextKey('activeEditorIsLastInGroup', false, localize('activeEditorIsLastInGroup', "Whether the active editor is the last one in its group"));
export const ActiveEditorStickyContext = new RawContextKey('activeEditorIsPinned', false, localize('activeEditorIsPinned', "Whether the active editor is pinned"));
export const ActiveEditorReadonlyContext = new RawContextKey('activeEditorIsReadonly', false, localize('activeEditorIsReadonly', "Whether the active editor is read-only"));
export const ActiveCompareEditorCanSwapContext = new RawContextKey('activeCompareEditorCanSwap', false, localize('activeCompareEditorCanSwap', "Whether the active compare editor can swap sides"));
export const ActiveEditorCanToggleReadonlyContext = new RawContextKey('activeEditorCanToggleReadonly', true, localize('activeEditorCanToggleReadonly', "Whether the active editor can toggle between being read-only or writeable"));
export const ActiveEditorCanRevertContext = new RawContextKey('activeEditorCanRevert', false, localize('activeEditorCanRevert', "Whether the active editor can revert"));
export const ActiveEditorCanSplitInGroupContext = new RawContextKey('activeEditorCanSplitInGroup', true);
// Editor Kind Context Keys
export const ActiveEditorContext = new RawContextKey('activeEditor', null, { type: 'string', description: localize('activeEditor', "The identifier of the active editor") });
export const ActiveEditorAvailableEditorIdsContext = new RawContextKey('activeEditorAvailableEditorIds', '', localize('activeEditorAvailableEditorIds', "The available editor identifiers that are usable for the active editor"));
export const TextCompareEditorVisibleContext = new RawContextKey('textCompareEditorVisible', false, localize('textCompareEditorVisible', "Whether a text compare editor is visible"));
export const TextCompareEditorActiveContext = new RawContextKey('textCompareEditorActive', false, localize('textCompareEditorActive', "Whether a text compare editor is active"));
export const SideBySideEditorActiveContext = new RawContextKey('sideBySideEditorActive', false, localize('sideBySideEditorActive', "Whether a side by side editor is active"));
// Editor Group Context Keys
export const EditorGroupEditorsCountContext = new RawContextKey('groupEditorsCount', 0, localize('groupEditorsCount', "The number of opened editor groups"));
export const ActiveEditorGroupEmptyContext = new RawContextKey('activeEditorGroupEmpty', false, localize('activeEditorGroupEmpty', "Whether the active editor group is empty"));
export const ActiveEditorGroupIndexContext = new RawContextKey('activeEditorGroupIndex', 0, localize('activeEditorGroupIndex', "The index of the active editor group"));
export const ActiveEditorGroupLastContext = new RawContextKey('activeEditorGroupLast', false, localize('activeEditorGroupLast', "Whether the active editor group is the last group"));
export const ActiveEditorGroupLockedContext = new RawContextKey('activeEditorGroupLocked', false, localize('activeEditorGroupLocked', "Whether the active editor group is locked"));
export const MultipleEditorGroupsContext = new RawContextKey('multipleEditorGroups', false, localize('multipleEditorGroups', "Whether there are multiple editor groups opened"));
export const SingleEditorGroupsContext = MultipleEditorGroupsContext.toNegated();
export const MultipleEditorsSelectedInGroupContext = new RawContextKey('multipleEditorsSelectedInGroup', false, localize('multipleEditorsSelectedInGroup', "Whether multiple editors have been selected in an editor group"));
export const TwoEditorsSelectedInGroupContext = new RawContextKey('twoEditorsSelectedInGroup', false, localize('twoEditorsSelectedInGroup', "Whether exactly two editors have been selected in an editor group"));
export const SelectedEditorsInGroupFileOrUntitledResourceContextKey = new RawContextKey('SelectedEditorsInGroupFileOrUntitledResourceContextKey', true, localize('SelectedEditorsInGroupFileOrUntitledResourceContextKey', "Whether all selected editors in a group have a file or untitled resource associated"));
// Editor Part Context Keys
export const EditorPartMultipleEditorGroupsContext = new RawContextKey('editorPartMultipleEditorGroups', false, localize('editorPartMultipleEditorGroups', "Whether there are multiple editor groups opened in an editor part"));
export const EditorPartSingleEditorGroupsContext = EditorPartMultipleEditorGroupsContext.toNegated();
export const EditorPartMaximizedEditorGroupContext = new RawContextKey('editorPartMaximizedEditorGroup', false, localize('editorPartEditorGroupMaximized', "Editor Part has a maximized group"));
export const IsAuxiliaryEditorPartContext = new RawContextKey('isAuxiliaryEditorPart', false, localize('isAuxiliaryEditorPart', "Editor Part is in an auxiliary window"));
// Editor Layout Context Keys
export const EditorsVisibleContext = new RawContextKey('editorIsOpen', false, localize('editorIsOpen', "Whether an editor is open"));
export const InEditorZenModeContext = new RawContextKey('inZenMode', false, localize('inZenMode', "Whether Zen mode is enabled"));
export const IsMainEditorCenteredLayoutContext = new RawContextKey('isCenteredLayout', false, localize('isMainEditorCenteredLayout', "Whether centered layout is enabled for the main editor"));
export const SplitEditorsVertically = new RawContextKey('splitEditorsVertically', false, localize('splitEditorsVertically', "Whether editors split vertically"));
export const MainEditorAreaVisibleContext = new RawContextKey('mainEditorAreaVisible', true, localize('mainEditorAreaVisible', "Whether the editor area in the main window is visible"));
export const EditorTabsVisibleContext = new RawContextKey('editorTabsVisible', true, localize('editorTabsVisible', "Whether editor tabs are visible"));
//#endregion
//#region < --- Side Bar --- >
export const SideBarVisibleContext = new RawContextKey('sideBarVisible', false, localize('sideBarVisible', "Whether the sidebar is visible"));
export const SidebarFocusContext = new RawContextKey('sideBarFocus', false, localize('sideBarFocus', "Whether the sidebar has keyboard focus"));
export const ActiveViewletContext = new RawContextKey('activeViewlet', '', localize('activeViewlet', "The identifier of the active viewlet"));
//#endregion
//#region < --- Status Bar --- >
export const StatusBarFocused = new RawContextKey('statusBarFocused', false, localize('statusBarFocused', "Whether the status bar has keyboard focus"));
//#endregion
//#region < --- Title Bar --- >
export const TitleBarStyleContext = new RawContextKey('titleBarStyle', 'custom', localize('titleBarStyle', "Style of the window title bar"));
export const TitleBarVisibleContext = new RawContextKey('titleBarVisible', false, localize('titleBarVisible', "Whether the title bar is visible"));
//#endregion
//#region < --- Banner --- >
export const BannerFocused = new RawContextKey('bannerFocused', false, localize('bannerFocused', "Whether the banner has keyboard focus"));
//#endregion
//#region < --- Notifications --- >
export const NotificationFocusedContext = new RawContextKey('notificationFocus', true, localize('notificationFocus', "Whether a notification has keyboard focus"));
export const NotificationsCenterVisibleContext = new RawContextKey('notificationCenterVisible', false, localize('notificationCenterVisible', "Whether the notifications center is visible"));
export const NotificationsToastsVisibleContext = new RawContextKey('notificationToastsVisible', false, localize('notificationToastsVisible', "Whether a notification toast is visible"));
//#endregion
//#region < --- Auxiliary Bar --- >
export const ActiveAuxiliaryContext = new RawContextKey('activeAuxiliary', '', localize('activeAuxiliary', "The identifier of the active auxiliary panel"));
export const AuxiliaryBarFocusContext = new RawContextKey('auxiliaryBarFocus', false, localize('auxiliaryBarFocus', "Whether the auxiliary bar has keyboard focus"));
export const AuxiliaryBarVisibleContext = new RawContextKey('auxiliaryBarVisible', false, localize('auxiliaryBarVisible', "Whether the auxiliary bar is visible"));
//#endregion
//#region < --- Panel --- >
export const ActivePanelContext = new RawContextKey('activePanel', '', localize('activePanel', "The identifier of the active panel"));
export const PanelFocusContext = new RawContextKey('panelFocus', false, localize('panelFocus', "Whether the panel has keyboard focus"));
export const PanelPositionContext = new RawContextKey('panelPosition', 'bottom', localize('panelPosition', "The position of the panel, always 'bottom'"));
export const PanelAlignmentContext = new RawContextKey('panelAlignment', 'center', localize('panelAlignment', "The alignment of the panel, either 'center', 'left', 'right' or 'justify'"));
export const PanelVisibleContext = new RawContextKey('panelVisible', false, localize('panelVisible', "Whether the panel is visible"));
export const PanelMaximizedContext = new RawContextKey('panelMaximized', false, localize('panelMaximized', "Whether the panel is maximized"));
//#endregion
//#region < --- Views --- >
export const FocusedViewContext = new RawContextKey('focusedView', '', localize('focusedView', "The identifier of the view that has keyboard focus"));
export function getVisbileViewContextKey(viewId) { return `view.${viewId}.visible`; }
//#endregion
//#region < --- Resources --- >
let ResourceContextKey = class ResourceContextKey {
    static { ResourceContextKey_1 = this; }
    // NOTE: DO NOT CHANGE THE DEFAULT VALUE TO ANYTHING BUT
    // UNDEFINED! IT IS IMPORTANT THAT DEFAULTS ARE INHERITED
    // FROM THE PARENT CONTEXT AND ONLY UNDEFINED DOES THIS
    static { this.Scheme = new RawContextKey('resourceScheme', undefined, { type: 'string', description: localize('resourceScheme', "The scheme of the resource") }); }
    static { this.Filename = new RawContextKey('resourceFilename', undefined, { type: 'string', description: localize('resourceFilename', "The file name of the resource") }); }
    static { this.Dirname = new RawContextKey('resourceDirname', undefined, { type: 'string', description: localize('resourceDirname', "The folder name the resource is contained in") }); }
    static { this.Path = new RawContextKey('resourcePath', undefined, { type: 'string', description: localize('resourcePath', "The full path of the resource") }); }
    static { this.LangId = new RawContextKey('resourceLangId', undefined, { type: 'string', description: localize('resourceLangId', "The language identifier of the resource") }); }
    static { this.Resource = new RawContextKey('resource', undefined, { type: 'URI', description: localize('resource', "The full value of the resource including scheme and path") }); }
    static { this.Extension = new RawContextKey('resourceExtname', undefined, { type: 'string', description: localize('resourceExtname', "The extension name of the resource") }); }
    static { this.HasResource = new RawContextKey('resourceSet', undefined, { type: 'boolean', description: localize('resourceSet', "Whether a resource is present or not") }); }
    static { this.IsFileSystemResource = new RawContextKey('isFileSystemResource', undefined, { type: 'boolean', description: localize('isFileSystemResource', "Whether the resource is backed by a file system provider") }); }
    constructor(_contextKeyService, _fileService, _languageService, _modelService) {
        this._contextKeyService = _contextKeyService;
        this._fileService = _fileService;
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._disposables = new DisposableStore();
        this._schemeKey = ResourceContextKey_1.Scheme.bindTo(this._contextKeyService);
        this._filenameKey = ResourceContextKey_1.Filename.bindTo(this._contextKeyService);
        this._dirnameKey = ResourceContextKey_1.Dirname.bindTo(this._contextKeyService);
        this._pathKey = ResourceContextKey_1.Path.bindTo(this._contextKeyService);
        this._langIdKey = ResourceContextKey_1.LangId.bindTo(this._contextKeyService);
        this._resourceKey = ResourceContextKey_1.Resource.bindTo(this._contextKeyService);
        this._extensionKey = ResourceContextKey_1.Extension.bindTo(this._contextKeyService);
        this._hasResource = ResourceContextKey_1.HasResource.bindTo(this._contextKeyService);
        this._isFileSystemResource = ResourceContextKey_1.IsFileSystemResource.bindTo(this._contextKeyService);
        this._disposables.add(_fileService.onDidChangeFileSystemProviderRegistrations(() => {
            const resource = this.get();
            this._isFileSystemResource.set(Boolean(resource && _fileService.hasProvider(resource)));
        }));
        this._disposables.add(_modelService.onModelAdded(model => {
            if (isEqual(model.uri, this.get())) {
                this._setLangId();
            }
        }));
        this._disposables.add(_modelService.onModelLanguageChanged(e => {
            if (isEqual(e.model.uri, this.get())) {
                this._setLangId();
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    _setLangId() {
        const value = this.get();
        if (!value) {
            this._langIdKey.set(null);
            return;
        }
        const langId = this._modelService.getModel(value)?.getLanguageId() ?? this._languageService.guessLanguageIdByFilepathOrFirstLine(value);
        this._langIdKey.set(langId);
    }
    set(value) {
        value = value ?? undefined;
        if (isEqual(this._value, value)) {
            return;
        }
        this._value = value;
        this._contextKeyService.bufferChangeEvents(() => {
            this._resourceKey.set(value ? value.toString() : null);
            this._schemeKey.set(value ? value.scheme : null);
            this._filenameKey.set(value ? basename(value) : null);
            this._dirnameKey.set(value ? this.uriToPath(dirname(value)) : null);
            this._pathKey.set(value ? this.uriToPath(value) : null);
            this._setLangId();
            this._extensionKey.set(value ? extname(value) : null);
            this._hasResource.set(Boolean(value));
            this._isFileSystemResource.set(value ? this._fileService.hasProvider(value) : false);
        });
    }
    uriToPath(uri) {
        if (uri.scheme === Schemas.file) {
            return uri.fsPath;
        }
        return uri.path;
    }
    reset() {
        this._value = undefined;
        this._contextKeyService.bufferChangeEvents(() => {
            this._resourceKey.reset();
            this._schemeKey.reset();
            this._filenameKey.reset();
            this._dirnameKey.reset();
            this._pathKey.reset();
            this._langIdKey.reset();
            this._extensionKey.reset();
            this._hasResource.reset();
            this._isFileSystemResource.reset();
        });
    }
    get() {
        return this._value;
    }
};
ResourceContextKey = ResourceContextKey_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IFileService),
    __param(2, ILanguageService),
    __param(3, IModelService)
], ResourceContextKey);
export { ResourceContextKey };
//#endregion
export function applyAvailableEditorIds(contextKey, editor, editorResolverService) {
    if (!editor) {
        contextKey.set('');
        return;
    }
    const editorResource = editor.resource;
    if (editorResource?.scheme === Schemas.untitled && editor.editorId !== DEFAULT_EDITOR_ASSOCIATION.id) {
        // Non text editor untitled files cannot be easily serialized between extensions
        // so instead we disable this context key to prevent common commands that act on the active editor
        contextKey.set('');
    }
    else {
        const editors = editorResource ? editorResolverService.getEditors(editorResource).map(editor => editor.id) : [];
        contextKey.set(editors.join(','));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9jb250ZXh0a2V5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDeEMsT0FBTyxFQUFFLGtCQUFrQixFQUFlLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUd2RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFekQsK0JBQStCO0FBRS9CLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUFTLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSwySUFBMkksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0UyxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGFBQWEsQ0FBUyxzQkFBc0IsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFF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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2NvbnRleHRrZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUsa0JBQWtCLEVBQWUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3ZELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUV6RCwrQkFBK0I7QUFFL0IsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxhQUFhLENBQVMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLDJJQUEySSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3RTLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUFTLHNCQUFzQixFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUs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
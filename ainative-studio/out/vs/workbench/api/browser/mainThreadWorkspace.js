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
import { isCancellationError } from '../../../base/common/errors.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isNative } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IRequestService } from '../../../platform/request/common/request.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../platform/workspace/common/workspaceTrust.js';
import { IWorkspaceContextService, isUntitledWorkspace } from '../../../platform/workspace/common/workspace.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { checkGlobFileExists } from '../../services/extensions/common/workspaceContains.js';
import { QueryBuilder } from '../../services/search/common/queryBuilder.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ISearchService } from '../../services/search/common/search.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IEditSessionIdentityService } from '../../../platform/workspace/common/editSessions.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../common/editor.js';
import { coalesce } from '../../../base/common/arrays.js';
import { ICanonicalUriService } from '../../../platform/workspace/common/canonicalUri.js';
import { revive } from '../../../base/common/marshalling.js';
import { bufferToStream, readableToBuffer, VSBuffer } from '../../../base/common/buffer.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { consumeStream } from '../../../base/common/stream.js';
let MainThreadWorkspace = class MainThreadWorkspace {
    constructor(extHostContext, _searchService, _contextService, _editSessionIdentityService, _canonicalUriService, _editorService, _workspaceEditingService, _notificationService, _requestService, _instantiationService, _labelService, _environmentService, fileService, _workspaceTrustManagementService, _workspaceTrustRequestService, _textFileService) {
        this._searchService = _searchService;
        this._contextService = _contextService;
        this._editSessionIdentityService = _editSessionIdentityService;
        this._canonicalUriService = _canonicalUriService;
        this._editorService = _editorService;
        this._workspaceEditingService = _workspaceEditingService;
        this._notificationService = _notificationService;
        this._requestService = _requestService;
        this._instantiationService = _instantiationService;
        this._labelService = _labelService;
        this._environmentService = _environmentService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._textFileService = _textFileService;
        this._toDispose = new DisposableStore();
        this._activeCancelTokens = Object.create(null);
        // --- edit sessions ---
        this.registeredEditSessionProviders = new Map();
        // --- canonical uri identities ---
        this.registeredCanonicalUriProviders = new Map();
        this._queryBuilder = this._instantiationService.createInstance(QueryBuilder);
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostWorkspace);
        const workspace = this._contextService.getWorkspace();
        // The workspace file is provided be a unknown file system provider. It might come
        // from the extension host. So initialize now knowing that `rootPath` is undefined.
        if (workspace.configuration && !isNative && !fileService.hasProvider(workspace.configuration)) {
            this._proxy.$initializeWorkspace(this.getWorkspaceData(workspace), this.isWorkspaceTrusted());
        }
        else {
            this._contextService.getCompleteWorkspace().then(workspace => this._proxy.$initializeWorkspace(this.getWorkspaceData(workspace), this.isWorkspaceTrusted()));
        }
        this._contextService.onDidChangeWorkspaceFolders(this._onDidChangeWorkspace, this, this._toDispose);
        this._contextService.onDidChangeWorkbenchState(this._onDidChangeWorkspace, this, this._toDispose);
        this._workspaceTrustManagementService.onDidChangeTrust(this._onDidGrantWorkspaceTrust, this, this._toDispose);
    }
    dispose() {
        this._toDispose.dispose();
        for (const requestId in this._activeCancelTokens) {
            const tokenSource = this._activeCancelTokens[requestId];
            tokenSource.cancel();
        }
    }
    // --- workspace ---
    $updateWorkspaceFolders(extensionName, index, deleteCount, foldersToAdd) {
        const workspaceFoldersToAdd = foldersToAdd.map(f => ({ uri: URI.revive(f.uri), name: f.name }));
        // Indicate in status message
        this._notificationService.status(this.getStatusMessage(extensionName, workspaceFoldersToAdd.length, deleteCount), { hideAfter: 10 * 1000 /* 10s */ });
        return this._workspaceEditingService.updateFolders(index, deleteCount, workspaceFoldersToAdd, true);
    }
    getStatusMessage(extensionName, addCount, removeCount) {
        let message;
        const wantsToAdd = addCount > 0;
        const wantsToDelete = removeCount > 0;
        // Add Folders
        if (wantsToAdd && !wantsToDelete) {
            if (addCount === 1) {
                message = localize('folderStatusMessageAddSingleFolder', "Extension '{0}' added 1 folder to the workspace", extensionName);
            }
            else {
                message = localize('folderStatusMessageAddMultipleFolders', "Extension '{0}' added {1} folders to the workspace", extensionName, addCount);
            }
        }
        // Delete Folders
        else if (wantsToDelete && !wantsToAdd) {
            if (removeCount === 1) {
                message = localize('folderStatusMessageRemoveSingleFolder', "Extension '{0}' removed 1 folder from the workspace", extensionName);
            }
            else {
                message = localize('folderStatusMessageRemoveMultipleFolders', "Extension '{0}' removed {1} folders from the workspace", extensionName, removeCount);
            }
        }
        // Change Folders
        else {
            message = localize('folderStatusChangeFolder', "Extension '{0}' changed folders of the workspace", extensionName);
        }
        return message;
    }
    _onDidChangeWorkspace() {
        this._proxy.$acceptWorkspaceData(this.getWorkspaceData(this._contextService.getWorkspace()));
    }
    getWorkspaceData(workspace) {
        if (this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return null;
        }
        return {
            configuration: workspace.configuration || undefined,
            isUntitled: workspace.configuration ? isUntitledWorkspace(workspace.configuration, this._environmentService) : false,
            folders: workspace.folders,
            id: workspace.id,
            name: this._labelService.getWorkspaceLabel(workspace),
            transient: workspace.transient
        };
    }
    // --- search ---
    $startFileSearch(_includeFolder, options, token) {
        const includeFolder = URI.revive(_includeFolder);
        const workspace = this._contextService.getWorkspace();
        const query = this._queryBuilder.file(includeFolder ? [includeFolder] : workspace.folders, revive(options));
        return this._searchService.fileSearch(query, token).then(result => {
            return result.results.map(m => m.resource);
        }, err => {
            if (!isCancellationError(err)) {
                return Promise.reject(err);
            }
            return null;
        });
    }
    $startTextSearch(pattern, _folder, options, requestId, token) {
        const folder = URI.revive(_folder);
        const workspace = this._contextService.getWorkspace();
        const folders = folder ? [folder] : workspace.folders.map(folder => folder.uri);
        const query = this._queryBuilder.text(pattern, folders, revive(options));
        query._reason = 'startTextSearch';
        const onProgress = (p) => {
            if (p.results) {
                this._proxy.$handleTextSearchResult(p, requestId);
            }
        };
        const search = this._searchService.textSearch(query, token, onProgress).then(result => {
            return { limitHit: result.limitHit };
        }, err => {
            if (!isCancellationError(err)) {
                return Promise.reject(err);
            }
            return null;
        });
        return search;
    }
    $checkExists(folders, includes, token) {
        return this._instantiationService.invokeFunction((accessor) => checkGlobFileExists(accessor, folders, includes, token));
    }
    // --- save & edit resources ---
    async $save(uriComponents, options) {
        const uri = URI.revive(uriComponents);
        const editors = [...this._editorService.findEditors(uri, { supportSideBySide: SideBySideEditor.PRIMARY })];
        const result = await this._editorService.save(editors, {
            reason: 1 /* SaveReason.EXPLICIT */,
            saveAs: options.saveAs,
            force: !options.saveAs
        });
        return this._saveResultToUris(result).at(0);
    }
    _saveResultToUris(result) {
        if (!result.success) {
            return [];
        }
        return coalesce(result.editors.map(editor => EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY })));
    }
    $saveAll(includeUntitled) {
        return this._editorService.saveAll({ includeUntitled }).then(res => res.success);
    }
    $resolveProxy(url) {
        return this._requestService.resolveProxy(url);
    }
    $lookupAuthorization(authInfo) {
        return this._requestService.lookupAuthorization(authInfo);
    }
    $lookupKerberosAuthorization(url) {
        return this._requestService.lookupKerberosAuthorization(url);
    }
    $loadCertificates() {
        return this._requestService.loadCertificates();
    }
    // --- trust ---
    $requestWorkspaceTrust(options) {
        return this._workspaceTrustRequestService.requestWorkspaceTrust(options);
    }
    isWorkspaceTrusted() {
        return this._workspaceTrustManagementService.isWorkspaceTrusted();
    }
    _onDidGrantWorkspaceTrust() {
        this._proxy.$onDidGrantWorkspaceTrust();
    }
    $registerEditSessionIdentityProvider(handle, scheme) {
        const disposable = this._editSessionIdentityService.registerEditSessionIdentityProvider({
            scheme: scheme,
            getEditSessionIdentifier: async (workspaceFolder, token) => {
                return this._proxy.$getEditSessionIdentifier(workspaceFolder.uri, token);
            },
            provideEditSessionIdentityMatch: async (workspaceFolder, identity1, identity2, token) => {
                return this._proxy.$provideEditSessionIdentityMatch(workspaceFolder.uri, identity1, identity2, token);
            }
        });
        this.registeredEditSessionProviders.set(handle, disposable);
        this._toDispose.add(disposable);
    }
    $unregisterEditSessionIdentityProvider(handle) {
        const disposable = this.registeredEditSessionProviders.get(handle);
        disposable?.dispose();
        this.registeredEditSessionProviders.delete(handle);
    }
    $registerCanonicalUriProvider(handle, scheme) {
        const disposable = this._canonicalUriService.registerCanonicalUriProvider({
            scheme: scheme,
            provideCanonicalUri: async (uri, targetScheme, token) => {
                const result = await this._proxy.$provideCanonicalUri(uri, targetScheme, token);
                if (result) {
                    return URI.revive(result);
                }
                return result;
            }
        });
        this.registeredCanonicalUriProviders.set(handle, disposable);
        this._toDispose.add(disposable);
    }
    $unregisterCanonicalUriProvider(handle) {
        const disposable = this.registeredCanonicalUriProviders.get(handle);
        disposable?.dispose();
        this.registeredCanonicalUriProviders.delete(handle);
    }
    // --- encodings
    async $decode(content, resource, options) {
        const stream = await this._textFileService.getDecodedStream(URI.revive(resource) ?? undefined, bufferToStream(content), { acceptTextOnly: true, encoding: options?.encoding });
        return consumeStream(stream, chunks => chunks.join());
    }
    async $encode(content, resource, options) {
        const res = await this._textFileService.getEncodedReadable(URI.revive(resource) ?? undefined, content, { encoding: options?.encoding });
        return res instanceof VSBuffer ? res : readableToBuffer(res);
    }
};
MainThreadWorkspace = __decorate([
    extHostNamedCustomer(MainContext.MainThreadWorkspace),
    __param(1, ISearchService),
    __param(2, IWorkspaceContextService),
    __param(3, IEditSessionIdentityService),
    __param(4, ICanonicalUriService),
    __param(5, IEditorService),
    __param(6, IWorkspaceEditingService),
    __param(7, INotificationService),
    __param(8, IRequestService),
    __param(9, IInstantiationService),
    __param(10, ILabelService),
    __param(11, IEnvironmentService),
    __param(12, IFileService),
    __param(13, IWorkspaceTrustManagementService),
    __param(14, IWorkspaceTrustRequestService),
    __param(15, ITextFileService)
], MainThreadWorkspace);
export { MainThreadWorkspace };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkV29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQXlCLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3JHLE9BQU8sRUFBZ0MsZ0NBQWdDLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNySyxPQUFPLEVBQWMsd0JBQXdCLEVBQWtCLG1CQUFtQixFQUFtQixNQUFNLGlEQUFpRCxDQUFDO0FBQzdKLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsbUJBQW1C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
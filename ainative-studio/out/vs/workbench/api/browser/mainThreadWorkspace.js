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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFdvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUF5QixlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNyRyxPQUFPLEVBQWdDLGdDQUFnQyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckssT0FBTyxFQUFjLHdCQUF3QixFQUFrQixtQkFBbUIsRUFBbUIsTUFBTSxpREFBaUQsQ0FBQztBQUM3SixPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFzRCxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoSSxPQUFPLEVBQUUsY0FBYyxFQUFzQixNQUFNLCtDQUErQyxDQUFDO0FBQ25HLE9BQU8sRUFBaUQsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdkgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBOEQsV0FBVyxFQUE0QixNQUFNLCtCQUErQixDQUFDO0FBQ2xLLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxzQkFBc0IsRUFBYyxnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHeEQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFPL0IsWUFDQyxjQUErQixFQUNmLGNBQStDLEVBQ3JDLGVBQTBELEVBQ3ZELDJCQUF5RSxFQUNoRixvQkFBMkQsRUFDakUsY0FBK0MsRUFDckMsd0JBQW1FLEVBQ3ZFLG9CQUEyRCxFQUNoRSxlQUFpRCxFQUMzQyxxQkFBNkQsRUFDckUsYUFBNkMsRUFDdkMsbUJBQXlELEVBQ2hFLFdBQXlCLEVBQ0wsZ0NBQW1GLEVBQ3RGLDZCQUE2RSxFQUMxRixnQkFBbUQ7UUFkcEMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3BCLG9CQUFlLEdBQWYsZUFBZSxDQUEwQjtRQUN0QyxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO1FBQy9ELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDaEQsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3BCLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFDdEQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUMvQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDMUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNwRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUN0Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBRTNCLHFDQUFnQyxHQUFoQyxnQ0FBZ0MsQ0FBa0M7UUFDckUsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUErQjtRQUN6RSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBckJyRCxlQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNuQyx3QkFBbUIsR0FBOEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQTBOdEcsd0JBQXdCO1FBQ2hCLG1DQUE4QixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBdUJ4RSxtQ0FBbUM7UUFDM0Isb0NBQStCLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUE3TnhFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDdkUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0RCxrRkFBa0Y7UUFDbEYsbUZBQW1GO1FBQ25GLElBQUksU0FBUyxDQUFDLGFBQWEsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDL0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUMvRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUosQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEcsSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0csQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRTFCLEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hELFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUVELG9CQUFvQjtJQUVwQix1QkFBdUIsQ0FBQyxhQUFxQixFQUFFLEtBQWEsRUFBRSxXQUFtQixFQUFFLFlBQXFEO1FBQ3ZJLE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFaEcsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRXRKLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JHLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxhQUFxQixFQUFFLFFBQWdCLEVBQUUsV0FBbUI7UUFDcEYsSUFBSSxPQUFlLENBQUM7UUFFcEIsTUFBTSxVQUFVLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUNoQyxNQUFNLGFBQWEsR0FBRyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBRXRDLGNBQWM7UUFDZCxJQUFJLFVBQVUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2xDLElBQUksUUFBUSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLEdBQUcsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLGlEQUFpRCxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzVILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLG9EQUFvRCxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1SSxDQUFDO1FBQ0YsQ0FBQztRQUVELGlCQUFpQjthQUNaLElBQUksYUFBYSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdkMsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sR0FBRyxRQUFRLENBQUMsdUNBQXVDLEVBQUUscURBQXFELEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDbkksQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxRQUFRLENBQUMsMENBQTBDLEVBQUUsd0RBQXdELEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3RKLENBQUM7UUFDRixDQUFDO1FBRUQsaUJBQWlCO2FBQ1osQ0FBQztZQUNMLE9BQU8sR0FBRyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsa0RBQWtELEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbkgsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFNBQXFCO1FBQzdDLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsRUFBRSxpQ0FBeUIsRUFBRSxDQUFDO1lBQ3ZFLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU87WUFDTixhQUFhLEVBQUUsU0FBUyxDQUFDLGFBQWEsSUFBSSxTQUFTO1lBQ25ELFVBQVUsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQ3BILE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTztZQUMxQixFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUU7WUFDaEIsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDO1lBQ3JELFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztTQUM5QixDQUFDO0lBQ0gsQ0FBQztJQUVELGlCQUFpQjtJQUVqQixnQkFBZ0IsQ0FBQyxjQUFvQyxFQUFFLE9BQWdELEVBQUUsS0FBd0I7UUFDaEksTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNqRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXRELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUNwQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQ25ELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FDZixDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pFLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ1IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1QixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxPQUFxQixFQUFFLE9BQTZCLEVBQUUsT0FBZ0QsRUFBRSxTQUFpQixFQUFFLEtBQXdCO1FBQ25LLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0RCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWhGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDekUsS0FBSyxDQUFDLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQztRQUVsQyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQXNCLEVBQUUsRUFBRTtZQUM3QyxJQUFpQixDQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQWEsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQy9ELENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FDM0UsTUFBTSxDQUFDLEVBQUU7WUFDUixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxDQUFDLEVBQ0QsR0FBRyxDQUFDLEVBQUU7WUFDTCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQWlDLEVBQUUsUUFBa0IsRUFBRSxLQUF3QjtRQUMzRixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDekgsQ0FBQztJQUVELGdDQUFnQztJQUVoQyxLQUFLLENBQUMsS0FBSyxDQUFDLGFBQTRCLEVBQUUsT0FBNEI7UUFDckUsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNHLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3RELE1BQU0sNkJBQXFCO1lBQzNCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTTtTQUN0QixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE1BQTBCO1FBQ25ELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEosQ0FBQztJQUVELFFBQVEsQ0FBQyxlQUF5QjtRQUNqQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQUVELGFBQWEsQ0FBQyxHQUFXO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELG9CQUFvQixDQUFDLFFBQWtCO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsNEJBQTRCLENBQUMsR0FBVztRQUN2QyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsZ0JBQWdCO0lBRWhCLHNCQUFzQixDQUFDLE9BQXNDO1FBQzVELE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsT0FBTyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUNuRSxDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBS0Qsb0NBQW9DLENBQUMsTUFBYyxFQUFFLE1BQWM7UUFDbEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLG1DQUFtQyxDQUFDO1lBQ3ZGLE1BQU0sRUFBRSxNQUFNO1lBQ2Qsd0JBQXdCLEVBQUUsS0FBSyxFQUFFLGVBQWdDLEVBQUUsS0FBd0IsRUFBRSxFQUFFO2dCQUM5RixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRSxDQUFDO1lBQ0QsK0JBQStCLEVBQUUsS0FBSyxFQUFFLGVBQWdDLEVBQUUsU0FBaUIsRUFBRSxTQUFpQixFQUFFLEtBQXdCLEVBQUUsRUFBRTtnQkFDM0ksT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGdDQUFnQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RyxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELHNDQUFzQyxDQUFDLE1BQWM7UUFDcEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBS0QsNkJBQTZCLENBQUMsTUFBYyxFQUFFLE1BQWM7UUFDM0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLDRCQUE0QixDQUFDO1lBQ3pFLE1BQU0sRUFBRSxNQUFNO1lBQ2QsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLEdBQWtCLEVBQUUsWUFBb0IsRUFBRSxLQUF3QixFQUFFLEVBQUU7Z0JBQ2pHLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNoRixJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDM0IsQ0FBQztnQkFDRCxPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsK0JBQStCLENBQUMsTUFBYztRQUM3QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BFLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsK0JBQStCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxnQkFBZ0I7SUFFaEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFpQixFQUFFLFFBQW1DLEVBQUUsT0FBOEI7UUFDbkcsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0ssT0FBTyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBZSxFQUFFLFFBQW1DLEVBQUUsT0FBOEI7UUFDakcsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3hJLE9BQU8sR0FBRyxZQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5RCxDQUFDO0NBQ0QsQ0FBQTtBQXpSWSxtQkFBbUI7SUFEL0Isb0JBQW9CLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDO0lBVW5ELFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxtQkFBbUIsQ0FBQTtJQUNuQixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsZ0NBQWdDLENBQUE7SUFDaEMsWUFBQSw2QkFBNkIsQ0FBQTtJQUM3QixZQUFBLGdCQUFnQixDQUFBO0dBdkJOLG1CQUFtQixDQXlSL0IifQ==
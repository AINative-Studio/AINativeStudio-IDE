/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { hash } from '../../../base/common/hash.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import * as typeConverters from './extHostTypeConverters.js';
import { shouldSerializeBuffersForPostMessage, toExtensionData } from './extHostWebview.js';
import { Cache } from './cache.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as extHostTypes from './extHostTypes.js';
class CustomDocumentStoreEntry {
    constructor(document, _storagePath) {
        this.document = document;
        this._storagePath = _storagePath;
        this._backupCounter = 1;
        this._edits = new Cache('custom documents');
    }
    addEdit(item) {
        return this._edits.add([item]);
    }
    async undo(editId, isDirty) {
        await this.getEdit(editId).undo();
        if (!isDirty) {
            this.disposeBackup();
        }
    }
    async redo(editId, isDirty) {
        await this.getEdit(editId).redo();
        if (!isDirty) {
            this.disposeBackup();
        }
    }
    disposeEdits(editIds) {
        for (const id of editIds) {
            this._edits.delete(id);
        }
    }
    getNewBackupUri() {
        if (!this._storagePath) {
            throw new Error('Backup requires a valid storage path');
        }
        const fileName = hashPath(this.document.uri) + (this._backupCounter++);
        return joinPath(this._storagePath, fileName);
    }
    updateBackup(backup) {
        this._backup?.delete();
        this._backup = backup;
    }
    disposeBackup() {
        this._backup?.delete();
        this._backup = undefined;
    }
    getEdit(editId) {
        const edit = this._edits.get(editId, 0);
        if (!edit) {
            throw new Error('No edit found');
        }
        return edit;
    }
}
class CustomDocumentStore {
    constructor() {
        this._documents = new Map();
    }
    get(viewType, resource) {
        return this._documents.get(this.key(viewType, resource));
    }
    add(viewType, document, storagePath) {
        const key = this.key(viewType, document.uri);
        if (this._documents.has(key)) {
            throw new Error(`Document already exists for viewType:${viewType} resource:${document.uri}`);
        }
        const entry = new CustomDocumentStoreEntry(document, storagePath);
        this._documents.set(key, entry);
        return entry;
    }
    delete(viewType, document) {
        const key = this.key(viewType, document.uri);
        this._documents.delete(key);
    }
    key(viewType, resource) {
        return `${viewType}@@@${resource}`;
    }
}
var CustomEditorType;
(function (CustomEditorType) {
    CustomEditorType[CustomEditorType["Text"] = 0] = "Text";
    CustomEditorType[CustomEditorType["Custom"] = 1] = "Custom";
})(CustomEditorType || (CustomEditorType = {}));
class EditorProviderStore {
    constructor() {
        this._providers = new Map();
    }
    addTextProvider(viewType, extension, provider) {
        return this.add(viewType, { type: 0 /* CustomEditorType.Text */, extension, provider });
    }
    addCustomProvider(viewType, extension, provider) {
        return this.add(viewType, { type: 1 /* CustomEditorType.Custom */, extension, provider });
    }
    get(viewType) {
        return this._providers.get(viewType);
    }
    add(viewType, entry) {
        if (this._providers.has(viewType)) {
            throw new Error(`Provider for viewType:${viewType} already registered`);
        }
        this._providers.set(viewType, entry);
        return new extHostTypes.Disposable(() => this._providers.delete(viewType));
    }
}
export class ExtHostCustomEditors {
    constructor(mainContext, _extHostDocuments, _extensionStoragePaths, _extHostWebview, _extHostWebviewPanels) {
        this._extHostDocuments = _extHostDocuments;
        this._extensionStoragePaths = _extensionStoragePaths;
        this._extHostWebview = _extHostWebview;
        this._extHostWebviewPanels = _extHostWebviewPanels;
        this._editorProviders = new EditorProviderStore();
        this._documents = new CustomDocumentStore();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadCustomEditors);
    }
    registerCustomEditorProvider(extension, viewType, provider, options) {
        const disposables = new DisposableStore();
        if (isCustomTextEditorProvider(provider)) {
            disposables.add(this._editorProviders.addTextProvider(viewType, extension, provider));
            this._proxy.$registerTextEditorProvider(toExtensionData(extension), viewType, options.webviewOptions || {}, {
                supportsMove: !!provider.moveCustomTextEditor,
            }, shouldSerializeBuffersForPostMessage(extension));
        }
        else {
            disposables.add(this._editorProviders.addCustomProvider(viewType, extension, provider));
            if (isCustomEditorProviderWithEditingCapability(provider)) {
                disposables.add(provider.onDidChangeCustomDocument(e => {
                    const entry = this.getCustomDocumentEntry(viewType, e.document.uri);
                    if (isEditEvent(e)) {
                        const editId = entry.addEdit(e);
                        this._proxy.$onDidEdit(e.document.uri, viewType, editId, e.label);
                    }
                    else {
                        this._proxy.$onContentChange(e.document.uri, viewType);
                    }
                }));
            }
            this._proxy.$registerCustomEditorProvider(toExtensionData(extension), viewType, options.webviewOptions || {}, !!options.supportsMultipleEditorsPerDocument, shouldSerializeBuffersForPostMessage(extension));
        }
        return extHostTypes.Disposable.from(disposables, new extHostTypes.Disposable(() => {
            this._proxy.$unregisterEditorProvider(viewType);
        }));
    }
    async $createCustomDocument(resource, viewType, backupId, untitledDocumentData, cancellation) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        if (entry.type !== 1 /* CustomEditorType.Custom */) {
            throw new Error(`Invalid provide type for '${viewType}'`);
        }
        const revivedResource = URI.revive(resource);
        const document = await entry.provider.openCustomDocument(revivedResource, { backupId, untitledDocumentData: untitledDocumentData?.buffer }, cancellation);
        let storageRoot;
        if (isCustomEditorProviderWithEditingCapability(entry.provider) && this._extensionStoragePaths) {
            storageRoot = this._extensionStoragePaths.workspaceValue(entry.extension) ?? this._extensionStoragePaths.globalValue(entry.extension);
        }
        this._documents.add(viewType, document, storageRoot);
        return { editable: isCustomEditorProviderWithEditingCapability(entry.provider) };
    }
    async $disposeCustomDocument(resource, viewType) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        if (entry.type !== 1 /* CustomEditorType.Custom */) {
            throw new Error(`Invalid provider type for '${viewType}'`);
        }
        const revivedResource = URI.revive(resource);
        const { document } = this.getCustomDocumentEntry(viewType, revivedResource);
        this._documents.delete(viewType, document);
        document.dispose();
    }
    async $resolveCustomEditor(resource, handle, viewType, initData, position, cancellation) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        const viewColumn = typeConverters.ViewColumn.to(position);
        const webview = this._extHostWebview.createNewWebview(handle, initData.contentOptions, entry.extension);
        const panel = this._extHostWebviewPanels.createNewWebviewPanel(handle, viewType, initData.title, viewColumn, initData.options, webview, initData.active);
        const revivedResource = URI.revive(resource);
        switch (entry.type) {
            case 1 /* CustomEditorType.Custom */: {
                const { document } = this.getCustomDocumentEntry(viewType, revivedResource);
                return entry.provider.resolveCustomEditor(document, panel, cancellation);
            }
            case 0 /* CustomEditorType.Text */: {
                const document = this._extHostDocuments.getDocument(revivedResource);
                return entry.provider.resolveCustomTextEditor(document, panel, cancellation);
            }
            default: {
                throw new Error('Unknown webview provider type');
            }
        }
    }
    $disposeEdits(resourceComponents, viewType, editIds) {
        const document = this.getCustomDocumentEntry(viewType, resourceComponents);
        document.disposeEdits(editIds);
    }
    async $onMoveCustomEditor(handle, newResourceComponents, viewType) {
        const entry = this._editorProviders.get(viewType);
        if (!entry) {
            throw new Error(`No provider found for '${viewType}'`);
        }
        if (!entry.provider.moveCustomTextEditor) {
            throw new Error(`Provider does not implement move '${viewType}'`);
        }
        const webview = this._extHostWebviewPanels.getWebviewPanel(handle);
        if (!webview) {
            throw new Error(`No webview found`);
        }
        const resource = URI.revive(newResourceComponents);
        const document = this._extHostDocuments.getDocument(resource);
        await entry.provider.moveCustomTextEditor(document, webview, CancellationToken.None);
    }
    async $undo(resourceComponents, viewType, editId, isDirty) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        return entry.undo(editId, isDirty);
    }
    async $redo(resourceComponents, viewType, editId, isDirty) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        return entry.redo(editId, isDirty);
    }
    async $revert(resourceComponents, viewType, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        await provider.revertCustomDocument(entry.document, cancellation);
        entry.disposeBackup();
    }
    async $onSave(resourceComponents, viewType, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        await provider.saveCustomDocument(entry.document, cancellation);
        entry.disposeBackup();
    }
    async $onSaveAs(resourceComponents, viewType, targetResource, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        return provider.saveCustomDocumentAs(entry.document, URI.revive(targetResource), cancellation);
    }
    async $backup(resourceComponents, viewType, cancellation) {
        const entry = this.getCustomDocumentEntry(viewType, resourceComponents);
        const provider = this.getCustomEditorProvider(viewType);
        const backup = await provider.backupCustomDocument(entry.document, {
            destination: entry.getNewBackupUri(),
        }, cancellation);
        entry.updateBackup(backup);
        return backup.id;
    }
    getCustomDocumentEntry(viewType, resource) {
        const entry = this._documents.get(viewType, URI.revive(resource));
        if (!entry) {
            throw new Error('No custom document found');
        }
        return entry;
    }
    getCustomEditorProvider(viewType) {
        const entry = this._editorProviders.get(viewType);
        const provider = entry?.provider;
        if (!provider || !isCustomEditorProviderWithEditingCapability(provider)) {
            throw new Error('Custom document is not editable');
        }
        return provider;
    }
}
function isCustomEditorProviderWithEditingCapability(provider) {
    return !!provider.onDidChangeCustomDocument;
}
function isCustomTextEditorProvider(provider) {
    return typeof provider.resolveCustomTextEditor === 'function';
}
function isEditEvent(e) {
    return typeof e.undo === 'function'
        && typeof e.redo === 'function';
}
function hashPath(resource) {
    const str = resource.scheme === Schemas.file || resource.scheme === Schemas.untitled ? resource.fsPath : resource.toString();
    return hash(str) + '';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEN1c3RvbUVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEN1c3RvbUVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFJakUsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQW1CLG9DQUFvQyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBSTdHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFDO0FBR2xELE1BQU0sd0JBQXdCO0lBSTdCLFlBQ2lCLFFBQStCLEVBQzlCLFlBQTZCO1FBRDlCLGFBQVEsR0FBUixRQUFRLENBQXVCO1FBQzlCLGlCQUFZLEdBQVosWUFBWSxDQUFpQjtRQUp2QyxtQkFBYyxHQUFHLENBQUMsQ0FBQztRQU9WLFdBQU0sR0FBRyxJQUFJLEtBQUssQ0FBaUMsa0JBQWtCLENBQUMsQ0FBQztJQUZwRixDQUFDO0lBTUwsT0FBTyxDQUFDLElBQW9DO1FBQzNDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQWMsRUFBRSxPQUFnQjtRQUMxQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFjLEVBQUUsT0FBZ0I7UUFDMUMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQVksQ0FBQyxPQUFpQjtRQUM3QixLQUFLLE1BQU0sRUFBRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7SUFDRixDQUFDO0lBRUQsZUFBZTtRQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFDRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUFtQztRQUMvQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxhQUFhO1FBQ1osSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztJQUMxQixDQUFDO0lBRU8sT0FBTyxDQUFDLE1BQWM7UUFDN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEO0FBRUQsTUFBTSxtQkFBbUI7SUFBekI7UUFDa0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO0lBd0IzRSxDQUFDO0lBdEJPLEdBQUcsQ0FBQyxRQUFnQixFQUFFLFFBQW9CO1FBQ2hELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQWdCLEVBQUUsUUFBK0IsRUFBRSxXQUE0QjtRQUN6RixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0MsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLFFBQVEsYUFBYSxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUM5RixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxRQUFnQixFQUFFLFFBQStCO1FBQzlELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRU8sR0FBRyxDQUFDLFFBQWdCLEVBQUUsUUFBb0I7UUFDakQsT0FBTyxHQUFHLFFBQVEsTUFBTSxRQUFRLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0NBQ0Q7QUFFRCxJQUFXLGdCQUdWO0FBSEQsV0FBVyxnQkFBZ0I7SUFDMUIsdURBQUksQ0FBQTtJQUNKLDJEQUFNLENBQUE7QUFDUCxDQUFDLEVBSFUsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQUcxQjtBQVlELE1BQU0sbUJBQW1CO0lBQXpCO1FBQ2tCLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztJQXFCaEUsQ0FBQztJQW5CTyxlQUFlLENBQUMsUUFBZ0IsRUFBRSxTQUFnQyxFQUFFLFFBQXlDO1FBQ25ILE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLCtCQUF1QixFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxRQUFnQixFQUFFLFNBQWdDLEVBQUUsUUFBNkM7UUFDekgsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksaUNBQXlCLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFTyxHQUFHLENBQUMsUUFBZ0IsRUFBRSxLQUFvQjtRQUNqRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsUUFBUSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckMsT0FBTyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sb0JBQW9CO0lBUWhDLFlBQ0MsV0FBeUMsRUFDeEIsaUJBQW1DLEVBQ25DLHNCQUEwRCxFQUMxRCxlQUFnQyxFQUNoQyxxQkFBMkM7UUFIM0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFrQjtRQUNuQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQW9DO1FBQzFELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXNCO1FBVDVDLHFCQUFnQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUU3QyxlQUFVLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBU3ZELElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDekYsQ0FBQztJQUVNLDRCQUE0QixDQUNsQyxTQUFnQyxFQUNoQyxRQUFnQixFQUNoQixRQUErRSxFQUMvRSxPQUFzRztRQUV0RyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLElBQUksMEJBQTBCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsY0FBYyxJQUFJLEVBQUUsRUFBRTtnQkFDM0csWUFBWSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CO2FBQzdDLEVBQUUsb0NBQW9DLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUV4RixJQUFJLDJDQUEyQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzNELFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3BFLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQ3BCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNuRSxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztvQkFDeEQsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsY0FBYyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxFQUFFLG9DQUFvQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDOU0sQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ2xDLFdBQVcsRUFDWCxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCLENBQUMsUUFBdUIsRUFBRSxRQUFnQixFQUFFLFFBQTRCLEVBQUUsb0JBQTBDLEVBQUUsWUFBK0I7UUFDL0ssTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxJQUFJLG9DQUE0QixFQUFFLENBQUM7WUFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QyxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRTFKLElBQUksV0FBNEIsQ0FBQztRQUNqQyxJQUFJLDJDQUEyQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNoRyxXQUFXLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkksQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFckQsT0FBTyxFQUFFLFFBQVEsRUFBRSwyQ0FBMkMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztJQUNsRixDQUFDO0lBRUQsS0FBSyxDQUFDLHNCQUFzQixDQUFDLFFBQXVCLEVBQUUsUUFBZ0I7UUFDckUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxJQUFJLG9DQUE0QixFQUFFLENBQUM7WUFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0MsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQ3pCLFFBQXVCLEVBQ3ZCLE1BQXFDLEVBQ3JDLFFBQWdCLEVBQ2hCLFFBS0MsRUFDRCxRQUEyQixFQUMzQixZQUErQjtRQUUvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTFELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hHLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV6SixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTdDLFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BCLG9DQUE0QixDQUFDLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQzVFLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzFFLENBQUM7WUFDRCxrQ0FBMEIsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ3JFLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzlFLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUNsRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsa0JBQWlDLEVBQUUsUUFBZ0IsRUFBRSxPQUFpQjtRQUNuRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDM0UsUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLE1BQWMsRUFBRSxxQkFBb0MsRUFBRSxRQUFnQjtRQUMvRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELElBQUksQ0FBRSxLQUFLLENBQUMsUUFBNEMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9FLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDbkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5RCxNQUFPLEtBQUssQ0FBQyxRQUE0QyxDQUFDLG9CQUFxQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUgsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsa0JBQWlDLEVBQUUsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsT0FBZ0I7UUFDaEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsa0JBQWlDLEVBQUUsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsT0FBZ0I7UUFDaEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hFLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWlDLEVBQUUsUUFBZ0IsRUFBRSxZQUErQjtRQUNqRyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDeEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sUUFBUSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEUsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFpQyxFQUFFLFFBQWdCLEVBQUUsWUFBK0I7UUFDakcsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4RCxNQUFNLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hFLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxrQkFBaUMsRUFBRSxRQUFnQixFQUFFLGNBQTZCLEVBQUUsWUFBK0I7UUFDbEksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4RCxPQUFPLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWlDLEVBQUUsUUFBZ0IsRUFBRSxZQUErQjtRQUNqRyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDeEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXhELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7WUFDbEUsV0FBVyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUU7U0FDcEMsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqQixLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLE9BQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRU8sc0JBQXNCLENBQUMsUUFBZ0IsRUFBRSxRQUF1QjtRQUN2RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sdUJBQXVCLENBQUMsUUFBZ0I7UUFDL0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRCxNQUFNLFFBQVEsR0FBRyxLQUFLLEVBQUUsUUFBUSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3pFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztDQUNEO0FBRUQsU0FBUywyQ0FBMkMsQ0FBQyxRQUE2RztJQUNqSyxPQUFPLENBQUMsQ0FBRSxRQUF3QyxDQUFDLHlCQUF5QixDQUFDO0FBQzlFLENBQUM7QUFFRCxTQUFTLDBCQUEwQixDQUFDLFFBQXNHO0lBQ3pJLE9BQU8sT0FBUSxRQUE0QyxDQUFDLHVCQUF1QixLQUFLLFVBQVUsQ0FBQztBQUNwRyxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsQ0FBMkU7SUFDL0YsT0FBTyxPQUFRLENBQW9DLENBQUMsSUFBSSxLQUFLLFVBQVU7V0FDbkUsT0FBUSxDQUFvQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUM7QUFDdEUsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLFFBQWE7SUFDOUIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQzdILE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN2QixDQUFDIn0=
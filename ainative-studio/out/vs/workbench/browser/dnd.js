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
import { DataTransfers } from '../../base/browser/dnd.js';
import { DragAndDropObserver, EventType, addDisposableListener, onDidRegisterWindow } from '../../base/browser/dom.js';
import { coalesce } from '../../base/common/arrays.js';
import { UriList } from '../../base/common/dataTransfer.js';
import { Emitter, Event } from '../../base/common/event.js';
import { Disposable, DisposableStore, markAsSingleton } from '../../base/common/lifecycle.js';
import { stringify } from '../../base/common/marshalling.js';
import { Mimes } from '../../base/common/mime.js';
import { FileAccess, Schemas } from '../../base/common/network.js';
import { isWindows } from '../../base/common/platform.js';
import { basename, isEqual } from '../../base/common/resources.js';
import { URI } from '../../base/common/uri.js';
import { CodeDataTransfers, Extensions, LocalSelectionTransfer, createDraggedEditorInputFromRawResourcesData, extractEditorsAndFilesDropData } from '../../platform/dnd/browser/dnd.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { extractSelection, withSelection } from '../../platform/opener/common/opener.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { IWorkspaceContextService, hasWorkspaceFileExtension, isTemporaryWorkspace } from '../../platform/workspace/common/workspace.js';
import { IWorkspacesService } from '../../platform/workspaces/common/workspaces.js';
import { EditorResourceAccessor, isEditorIdentifier, isResourceDiffEditorInput, isResourceMergeEditorInput, isResourceSideBySideEditorInput } from '../common/editor.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { IHostService } from '../services/host/browser/host.js';
import { ITextFileService } from '../services/textfile/common/textfiles.js';
import { IWorkspaceEditingService } from '../services/workspaces/common/workspaceEditing.js';
import { mainWindow } from '../../base/browser/window.js';
import { BroadcastDataChannel } from '../../base/browser/broadcast.js';
//#region Editor / Resources DND
export class DraggedEditorIdentifier {
    constructor(identifier) {
        this.identifier = identifier;
    }
}
export class DraggedEditorGroupIdentifier {
    constructor(identifier) {
        this.identifier = identifier;
    }
}
export async function extractTreeDropData(dataTransfer) {
    const editors = [];
    const resourcesKey = Mimes.uriList.toLowerCase();
    // Data Transfer: Resources
    if (dataTransfer.has(resourcesKey)) {
        try {
            const asString = await dataTransfer.get(resourcesKey)?.asString();
            const rawResourcesData = JSON.stringify(UriList.parse(asString ?? ''));
            editors.push(...createDraggedEditorInputFromRawResourcesData(rawResourcesData));
        }
        catch (error) {
            // Invalid transfer
        }
    }
    return editors;
}
/**
 * Shared function across some components to handle drag & drop of resources.
 * E.g. of folders and workspace files to open them in the window instead of
 * the editor or to handle dirty editors being dropped between instances of Code.
 */
let ResourcesDropHandler = class ResourcesDropHandler {
    constructor(options, fileService, workspacesService, editorService, workspaceEditingService, hostService, contextService, instantiationService) {
        this.options = options;
        this.fileService = fileService;
        this.workspacesService = workspacesService;
        this.editorService = editorService;
        this.workspaceEditingService = workspaceEditingService;
        this.hostService = hostService;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
    }
    async handleDrop(event, targetWindow, resolveTargetGroup, afterDrop, options) {
        const editors = await this.instantiationService.invokeFunction(accessor => extractEditorsAndFilesDropData(accessor, event));
        if (!editors.length) {
            return;
        }
        // Make the window active to handle the drop properly within
        await this.hostService.focus(targetWindow);
        // Check for workspace file / folder being dropped if we are allowed to do so
        if (this.options.allowWorkspaceOpen) {
            const localFilesAllowedToOpenAsWorkspace = coalesce(editors.filter(editor => editor.allowWorkspaceOpen && editor.resource?.scheme === Schemas.file).map(editor => editor.resource));
            if (localFilesAllowedToOpenAsWorkspace.length > 0) {
                const isWorkspaceOpening = await this.handleWorkspaceDrop(localFilesAllowedToOpenAsWorkspace);
                if (isWorkspaceOpening) {
                    return; // return early if the drop operation resulted in this window changing to a workspace
                }
            }
        }
        // Add external ones to recently open list unless dropped resource is a workspace
        const externalLocalFiles = coalesce(editors.filter(editor => editor.isExternal && editor.resource?.scheme === Schemas.file).map(editor => editor.resource));
        if (externalLocalFiles.length) {
            this.workspacesService.addRecentlyOpened(externalLocalFiles.map(resource => ({ fileUri: resource })));
        }
        // Open in Editor
        const targetGroup = resolveTargetGroup?.();
        await this.editorService.openEditors(editors.map(editor => ({
            ...editor,
            resource: editor.resource,
            options: {
                ...editor.options,
                ...options,
                pinned: true
            }
        })), targetGroup, { validateTrust: true });
        // Finish with provided function
        afterDrop?.(targetGroup);
    }
    async handleWorkspaceDrop(resources) {
        const toOpen = [];
        const folderURIs = [];
        await Promise.all(resources.map(async (resource) => {
            // Check for Workspace
            if (hasWorkspaceFileExtension(resource)) {
                toOpen.push({ workspaceUri: resource });
                return;
            }
            // Check for Folder
            try {
                const stat = await this.fileService.stat(resource);
                if (stat.isDirectory) {
                    toOpen.push({ folderUri: stat.resource });
                    folderURIs.push({ uri: stat.resource });
                }
            }
            catch (error) {
                // Ignore error
            }
        }));
        // Return early if no external resource is a folder or workspace
        if (toOpen.length === 0) {
            return false;
        }
        // Open in separate windows if we drop workspaces or just one folder
        if (toOpen.length > folderURIs.length || folderURIs.length === 1) {
            await this.hostService.openWindow(toOpen);
        }
        // Add to workspace if we are in a temporary workspace
        else if (isTemporaryWorkspace(this.contextService.getWorkspace())) {
            await this.workspaceEditingService.addFolders(folderURIs);
        }
        // Finally, enter untitled workspace when dropping >1 folders
        else {
            await this.workspaceEditingService.createAndEnterWorkspace(folderURIs);
        }
        return true;
    }
};
ResourcesDropHandler = __decorate([
    __param(1, IFileService),
    __param(2, IWorkspacesService),
    __param(3, IEditorService),
    __param(4, IWorkspaceEditingService),
    __param(5, IHostService),
    __param(6, IWorkspaceContextService),
    __param(7, IInstantiationService)
], ResourcesDropHandler);
export { ResourcesDropHandler };
export function fillEditorsDragData(accessor, resourcesOrEditors, event, options) {
    if (resourcesOrEditors.length === 0 || !event.dataTransfer) {
        return;
    }
    const textFileService = accessor.get(ITextFileService);
    const editorService = accessor.get(IEditorService);
    const fileService = accessor.get(IFileService);
    const labelService = accessor.get(ILabelService);
    // Extract resources from URIs or Editors that
    // can be handled by the file service
    const resources = coalesce(resourcesOrEditors.map((resourceOrEditor) => {
        if (URI.isUri(resourceOrEditor)) {
            return { resource: resourceOrEditor };
        }
        if (isEditorIdentifier(resourceOrEditor)) {
            if (URI.isUri(resourceOrEditor.editor.resource)) {
                return { resource: resourceOrEditor.editor.resource };
            }
            return undefined; // editor without resource
        }
        return { ...resourceOrEditor, resource: resourceOrEditor.selection ? withSelection(resourceOrEditor.resource, resourceOrEditor.selection) : resourceOrEditor.resource };
    }));
    const fileSystemResources = resources.filter(({ resource }) => fileService.hasProvider(resource));
    if (!options?.disableStandardTransfer) {
        // Text: allows to paste into text-capable areas
        const lineDelimiter = isWindows ? '\r\n' : '\n';
        event.dataTransfer.setData(DataTransfers.TEXT, fileSystemResources.map(({ resource }) => labelService.getUriLabel(resource, { noPrefix: true })).join(lineDelimiter));
        // Download URL: enables support to drag a tab as file to desktop
        // Requirements:
        // - Chrome/Edge only
        // - only a single file is supported
        // - only file:/ resources are supported
        const firstFile = fileSystemResources.find(({ isDirectory }) => !isDirectory);
        if (firstFile) {
            const firstFileUri = FileAccess.uriToFileUri(firstFile.resource); // enforce `file:` URIs
            if (firstFileUri.scheme === Schemas.file) {
                event.dataTransfer.setData(DataTransfers.DOWNLOAD_URL, [Mimes.binary, basename(firstFile.resource), firstFileUri.toString()].join(':'));
            }
        }
    }
    // Resource URLs: allows to drop multiple file resources to a target in VS Code
    const files = fileSystemResources.filter(({ isDirectory }) => !isDirectory);
    if (files.length) {
        event.dataTransfer.setData(DataTransfers.RESOURCES, JSON.stringify(files.map(({ resource }) => resource.toString())));
    }
    // Contributions
    const contributions = Registry.as(Extensions.DragAndDropContribution).getAll();
    for (const contribution of contributions) {
        contribution.setData(resources, event);
    }
    // Editors: enables cross window DND of editors
    // into the editor area while presering UI state
    const draggedEditors = [];
    for (const resourceOrEditor of resourcesOrEditors) {
        // Extract resource editor from provided object or URI
        let editor = undefined;
        if (isEditorIdentifier(resourceOrEditor)) {
            const untypedEditor = resourceOrEditor.editor.toUntyped({ preserveViewState: resourceOrEditor.groupId });
            if (untypedEditor) {
                editor = { ...untypedEditor, resource: EditorResourceAccessor.getCanonicalUri(untypedEditor) };
            }
        }
        else if (URI.isUri(resourceOrEditor)) {
            const { selection, uri } = extractSelection(resourceOrEditor);
            editor = { resource: uri, options: selection ? { selection } : undefined };
        }
        else if (!resourceOrEditor.isDirectory) {
            editor = {
                resource: resourceOrEditor.resource,
                options: {
                    selection: resourceOrEditor.selection,
                }
            };
        }
        if (!editor) {
            continue; // skip over editors that cannot be transferred via dnd
        }
        // Fill in some properties if they are not there already by accessing
        // some well known things from the text file universe.
        // This is not ideal for custom editors, but those have a chance to
        // provide everything from the `toUntyped` method.
        {
            const resource = editor.resource;
            if (resource) {
                const textFileModel = textFileService.files.get(resource);
                if (textFileModel) {
                    // language
                    if (typeof editor.languageId !== 'string') {
                        editor.languageId = textFileModel.getLanguageId();
                    }
                    // encoding
                    if (typeof editor.encoding !== 'string') {
                        editor.encoding = textFileModel.getEncoding();
                    }
                    // contents (only if dirty and not too large)
                    if (typeof editor.contents !== 'string' && textFileModel.isDirty() && !textFileModel.textEditorModel.isTooLargeForHeapOperation()) {
                        editor.contents = textFileModel.textEditorModel.getValue();
                    }
                }
                // viewState
                if (!editor.options?.viewState) {
                    editor.options = {
                        ...editor.options,
                        viewState: (() => {
                            for (const visibleEditorPane of editorService.visibleEditorPanes) {
                                if (isEqual(visibleEditorPane.input.resource, resource)) {
                                    const viewState = visibleEditorPane.getViewState();
                                    if (viewState) {
                                        return viewState;
                                    }
                                }
                            }
                            return undefined;
                        })()
                    };
                }
            }
        }
        // Add as dragged editor
        draggedEditors.push(editor);
    }
    if (draggedEditors.length) {
        event.dataTransfer.setData(CodeDataTransfers.EDITORS, stringify(draggedEditors));
        // Add a URI list entry
        const uriListEntries = [];
        for (const editor of draggedEditors) {
            if (editor.resource) {
                uriListEntries.push(editor.options?.selection ? withSelection(editor.resource, editor.options.selection) : editor.resource);
            }
            else if (isResourceDiffEditorInput(editor)) {
                if (editor.modified.resource) {
                    uriListEntries.push(editor.modified.resource);
                }
            }
            else if (isResourceSideBySideEditorInput(editor)) {
                if (editor.primary.resource) {
                    uriListEntries.push(editor.primary.resource);
                }
            }
            else if (isResourceMergeEditorInput(editor)) {
                uriListEntries.push(editor.result.resource);
            }
        }
        // Due to https://bugs.chromium.org/p/chromium/issues/detail?id=239745, we can only set
        // a single uri for the real `text/uri-list` type. Otherwise all uris end up joined together
        // However we write the full uri-list to an internal type so that other parts of VS Code
        // can use the full list.
        if (!options?.disableStandardTransfer) {
            event.dataTransfer.setData(Mimes.uriList, UriList.create(uriListEntries.slice(0, 1)));
        }
        event.dataTransfer.setData(DataTransfers.INTERNAL_URI_LIST, UriList.create(uriListEntries));
    }
}
export class CompositeDragAndDropData {
    constructor(type, id) {
        this.type = type;
        this.id = id;
    }
    update(dataTransfer) {
        // no-op
    }
    getData() {
        return { type: this.type, id: this.id };
    }
}
export class DraggedCompositeIdentifier {
    constructor(compositeId) {
        this.compositeId = compositeId;
    }
    get id() {
        return this.compositeId;
    }
}
export class DraggedViewIdentifier {
    constructor(viewId) {
        this.viewId = viewId;
    }
    get id() {
        return this.viewId;
    }
}
export class CompositeDragAndDropObserver extends Disposable {
    static get INSTANCE() {
        if (!CompositeDragAndDropObserver.instance) {
            CompositeDragAndDropObserver.instance = new CompositeDragAndDropObserver();
            markAsSingleton(CompositeDragAndDropObserver.instance);
        }
        return CompositeDragAndDropObserver.instance;
    }
    constructor() {
        super();
        this.transferData = LocalSelectionTransfer.getInstance();
        this.onDragStart = this._register(new Emitter());
        this.onDragEnd = this._register(new Emitter());
        this._register(this.onDragEnd.event(e => {
            const id = e.dragAndDropData.getData().id;
            const type = e.dragAndDropData.getData().type;
            const data = this.readDragData(type);
            if (data?.getData().id === id) {
                this.transferData.clearData(type === 'view' ? DraggedViewIdentifier.prototype : DraggedCompositeIdentifier.prototype);
            }
        }));
    }
    readDragData(type) {
        if (this.transferData.hasData(type === 'view' ? DraggedViewIdentifier.prototype : DraggedCompositeIdentifier.prototype)) {
            const data = this.transferData.getData(type === 'view' ? DraggedViewIdentifier.prototype : DraggedCompositeIdentifier.prototype);
            if (data && data[0]) {
                return new CompositeDragAndDropData(type, data[0].id);
            }
        }
        return undefined;
    }
    writeDragData(id, type) {
        this.transferData.setData([type === 'view' ? new DraggedViewIdentifier(id) : new DraggedCompositeIdentifier(id)], type === 'view' ? DraggedViewIdentifier.prototype : DraggedCompositeIdentifier.prototype);
    }
    registerTarget(element, callbacks) {
        const disposableStore = new DisposableStore();
        disposableStore.add(new DragAndDropObserver(element, {
            onDragEnter: e => {
                e.preventDefault();
                if (callbacks.onDragEnter) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (data) {
                        callbacks.onDragEnter({ eventData: e, dragAndDropData: data });
                    }
                }
            },
            onDragLeave: e => {
                const data = this.readDragData('composite') || this.readDragData('view');
                if (callbacks.onDragLeave && data) {
                    callbacks.onDragLeave({ eventData: e, dragAndDropData: data });
                }
            },
            onDrop: e => {
                if (callbacks.onDrop) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDrop({ eventData: e, dragAndDropData: data });
                    // Fire drag event in case drop handler destroys the dragged element
                    this.onDragEnd.fire({ eventData: e, dragAndDropData: data });
                }
            },
            onDragOver: e => {
                e.preventDefault();
                if (callbacks.onDragOver) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDragOver({ eventData: e, dragAndDropData: data });
                }
            }
        }));
        if (callbacks.onDragStart) {
            this.onDragStart.event(e => {
                callbacks.onDragStart(e);
            }, this, disposableStore);
        }
        if (callbacks.onDragEnd) {
            this.onDragEnd.event(e => {
                callbacks.onDragEnd(e);
            }, this, disposableStore);
        }
        return this._register(disposableStore);
    }
    registerDraggable(element, draggedItemProvider, callbacks) {
        element.draggable = true;
        const disposableStore = new DisposableStore();
        disposableStore.add(new DragAndDropObserver(element, {
            onDragStart: e => {
                const { id, type } = draggedItemProvider();
                this.writeDragData(id, type);
                e.dataTransfer?.setDragImage(element, 0, 0);
                this.onDragStart.fire({ eventData: e, dragAndDropData: this.readDragData(type) });
            },
            onDragEnd: e => {
                const { type } = draggedItemProvider();
                const data = this.readDragData(type);
                if (!data) {
                    return;
                }
                this.onDragEnd.fire({ eventData: e, dragAndDropData: data });
            },
            onDragEnter: e => {
                if (callbacks.onDragEnter) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    if (data) {
                        callbacks.onDragEnter({ eventData: e, dragAndDropData: data });
                    }
                }
            },
            onDragLeave: e => {
                const data = this.readDragData('composite') || this.readDragData('view');
                if (!data) {
                    return;
                }
                callbacks.onDragLeave?.({ eventData: e, dragAndDropData: data });
            },
            onDrop: e => {
                if (callbacks.onDrop) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDrop({ eventData: e, dragAndDropData: data });
                    // Fire drag event in case drop handler destroys the dragged element
                    this.onDragEnd.fire({ eventData: e, dragAndDropData: data });
                }
            },
            onDragOver: e => {
                if (callbacks.onDragOver) {
                    const data = this.readDragData('composite') || this.readDragData('view');
                    if (!data) {
                        return;
                    }
                    callbacks.onDragOver({ eventData: e, dragAndDropData: data });
                }
            }
        }));
        if (callbacks.onDragStart) {
            this.onDragStart.event(e => {
                callbacks.onDragStart(e);
            }, this, disposableStore);
        }
        if (callbacks.onDragEnd) {
            this.onDragEnd.event(e => {
                callbacks.onDragEnd(e);
            }, this, disposableStore);
        }
        return this._register(disposableStore);
    }
}
export function toggleDropEffect(dataTransfer, dropEffect, shouldHaveIt) {
    if (!dataTransfer) {
        return;
    }
    dataTransfer.dropEffect = shouldHaveIt ? dropEffect : 'none';
}
let ResourceListDnDHandler = class ResourceListDnDHandler {
    constructor(toResource, instantiationService) {
        this.toResource = toResource;
        this.instantiationService = instantiationService;
    }
    getDragURI(element) {
        const resource = this.toResource(element);
        return resource ? resource.toString() : null;
    }
    getDragLabel(elements) {
        const resources = coalesce(elements.map(this.toResource));
        return resources.length === 1 ? basename(resources[0]) : resources.length > 1 ? String(resources.length) : undefined;
    }
    onDragStart(data, originalEvent) {
        const resources = [];
        const elements = data.elements;
        for (const element of elements) {
            const resource = this.toResource(element);
            if (resource) {
                resources.push(resource);
            }
        }
        this.onWillDragElements(elements, originalEvent);
        if (resources.length) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, resources, originalEvent));
        }
    }
    onWillDragElements(elements, originalEvent) {
        // noop
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return false;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
    dispose() { }
};
ResourceListDnDHandler = __decorate([
    __param(1, IInstantiationService)
], ResourceListDnDHandler);
export { ResourceListDnDHandler };
//#endregion
class GlobalWindowDraggedOverTracker extends Disposable {
    static { this.CHANNEL_NAME = 'monaco-workbench-global-dragged-over'; }
    constructor() {
        super();
        this.broadcaster = this._register(new BroadcastDataChannel(GlobalWindowDraggedOverTracker.CHANNEL_NAME));
        this.draggedOver = false;
        this.registerListeners();
    }
    registerListeners() {
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window, EventType.DRAG_OVER, () => this.markDraggedOver(false), true));
            disposables.add(addDisposableListener(window, EventType.DRAG_LEAVE, () => this.clearDraggedOver(false), true));
        }, { window: mainWindow, disposables: this._store }));
        this._register(this.broadcaster.onDidReceiveData(data => {
            if (data === true) {
                this.markDraggedOver(true);
            }
            else {
                this.clearDraggedOver(true);
            }
        }));
    }
    get isDraggedOver() { return this.draggedOver; }
    markDraggedOver(fromBroadcast) {
        if (this.draggedOver === true) {
            return; // alrady marked
        }
        this.draggedOver = true;
        if (!fromBroadcast) {
            this.broadcaster.postData(true);
        }
    }
    clearDraggedOver(fromBroadcast) {
        if (this.draggedOver === false) {
            return; // alrady cleared
        }
        this.draggedOver = false;
        if (!fromBroadcast) {
            this.broadcaster.postData(false);
        }
    }
}
const globalDraggedOverTracker = new GlobalWindowDraggedOverTracker();
/**
 * Returns whether the workbench is currently dragged over in any of
 * the opened windows (main windows and auxiliary windows).
 */
export function isWindowDraggedOver() {
    return globalDraggedOverTracker.isDraggedOver;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvZG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sMkJBQTJCLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBS3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFrQixNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0csT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFnRixzQkFBc0IsRUFBRSw0Q0FBNEMsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RRLE9B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
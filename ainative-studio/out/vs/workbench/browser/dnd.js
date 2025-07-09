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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2RuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLDJCQUEyQixDQUFDO0FBQzVFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUt2SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBa0IsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBZ0Ysc0JBQXNCLEVBQUUsNENBQTRDLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0USxP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
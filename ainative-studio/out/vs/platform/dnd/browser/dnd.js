/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DataTransfers } from '../../../base/browser/dnd.js';
import { mainWindow } from '../../../base/browser/window.js';
import { coalesce } from '../../../base/common/arrays.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { ResourceMap } from '../../../base/common/map.js';
import { parse } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { isNative, isWeb } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { HTMLFileSystemProvider } from '../../files/browser/htmlFileSystemProvider.js';
import { WebFileSystemAccess } from '../../files/browser/webFileSystemAccess.js';
import { ByteSize, IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { extractSelection } from '../../opener/common/opener.js';
import { Registry } from '../../registry/common/platform.js';
//#region Editor / Resources DND
export const CodeDataTransfers = {
    EDITORS: 'CodeEditors',
    FILES: 'CodeFiles',
    SYMBOLS: 'application/vnd.code.symbols',
    MARKERS: 'application/vnd.code.diagnostics',
};
export function extractEditorsDropData(e) {
    const editors = [];
    if (e.dataTransfer && e.dataTransfer.types.length > 0) {
        // Data Transfer: Code Editors
        const rawEditorsData = e.dataTransfer.getData(CodeDataTransfers.EDITORS);
        if (rawEditorsData) {
            try {
                editors.push(...parse(rawEditorsData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Data Transfer: Resources
        else {
            try {
                const rawResourcesData = e.dataTransfer.getData(DataTransfers.RESOURCES);
                editors.push(...createDraggedEditorInputFromRawResourcesData(rawResourcesData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Check for native file transfer
        if (e.dataTransfer?.files) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (file && getPathForFile(file)) {
                    try {
                        editors.push({ resource: URI.file(getPathForFile(file)), isExternal: true, allowWorkspaceOpen: true });
                    }
                    catch (error) {
                        // Invalid URI
                    }
                }
            }
        }
        // Check for CodeFiles transfer
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (rawCodeFiles) {
            try {
                const codeFiles = JSON.parse(rawCodeFiles);
                for (const codeFile of codeFiles) {
                    editors.push({ resource: URI.file(codeFile), isExternal: true, allowWorkspaceOpen: true });
                }
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Workbench contributions
        const contributions = Registry.as(Extensions.DragAndDropContribution).getAll();
        for (const contribution of contributions) {
            const data = e.dataTransfer.getData(contribution.dataFormatKey);
            if (data) {
                try {
                    editors.push(...contribution.getEditorInputs(data));
                }
                catch (error) {
                    // Invalid transfer
                }
            }
        }
    }
    // Prevent duplicates: it is possible that we end up with the same
    // dragged editor multiple times because multiple data transfers
    // are being used (https://github.com/microsoft/vscode/issues/128925)
    const coalescedEditors = [];
    const seen = new ResourceMap();
    for (const editor of editors) {
        if (!editor.resource) {
            coalescedEditors.push(editor);
        }
        else if (!seen.has(editor.resource)) {
            coalescedEditors.push(editor);
            seen.set(editor.resource, true);
        }
    }
    return coalescedEditors;
}
export async function extractEditorsAndFilesDropData(accessor, e) {
    const editors = extractEditorsDropData(e);
    // Web: Check for file transfer
    if (e.dataTransfer && isWeb && containsDragType(e, DataTransfers.FILES)) {
        const files = e.dataTransfer.items;
        if (files) {
            const instantiationService = accessor.get(IInstantiationService);
            const filesData = await instantiationService.invokeFunction(accessor => extractFilesDropData(accessor, e));
            for (const fileData of filesData) {
                editors.push({ resource: fileData.resource, contents: fileData.contents?.toString(), isExternal: true, allowWorkspaceOpen: fileData.isDirectory });
            }
        }
    }
    return editors;
}
export function createDraggedEditorInputFromRawResourcesData(rawResourcesData) {
    const editors = [];
    if (rawResourcesData) {
        const resourcesRaw = JSON.parse(rawResourcesData);
        for (const resourceRaw of resourcesRaw) {
            if (resourceRaw.indexOf(':') > 0) { // mitigate https://github.com/microsoft/vscode/issues/124946
                const { selection, uri } = extractSelection(URI.parse(resourceRaw));
                editors.push({ resource: uri, options: { selection } });
            }
        }
    }
    return editors;
}
async function extractFilesDropData(accessor, event) {
    // Try to extract via `FileSystemHandle`
    if (WebFileSystemAccess.supported(mainWindow)) {
        const items = event.dataTransfer?.items;
        if (items) {
            return extractFileTransferData(accessor, items);
        }
    }
    // Try to extract via `FileList`
    const files = event.dataTransfer?.files;
    if (!files) {
        return [];
    }
    return extractFileListData(accessor, files);
}
async function extractFileTransferData(accessor, items) {
    const fileSystemProvider = accessor.get(IFileService).getProvider(Schemas.file);
    // eslint-disable-next-line no-restricted-syntax
    if (!(fileSystemProvider instanceof HTMLFileSystemProvider)) {
        return []; // only supported when running in web
    }
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const file = items[i];
        if (file) {
            const result = new DeferredPromise();
            results.push(result);
            (async () => {
                try {
                    const handle = await file.getAsFileSystemHandle();
                    if (!handle) {
                        result.complete(undefined);
                        return;
                    }
                    if (WebFileSystemAccess.isFileSystemFileHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerFileHandle(handle),
                            isDirectory: false
                        });
                    }
                    else if (WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerDirectoryHandle(handle),
                            isDirectory: true
                        });
                    }
                    else {
                        result.complete(undefined);
                    }
                }
                catch (error) {
                    result.complete(undefined);
                }
            })();
        }
    }
    return coalesce(await Promise.all(results.map(result => result.p)));
}
export async function extractFileListData(accessor, files) {
    const dialogService = accessor.get(IDialogService);
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
            // Skip for very large files because this operation is unbuffered
            if (file.size > 100 * ByteSize.MB) {
                dialogService.warn(localize('fileTooLarge', "File is too large to open as untitled editor. Please upload it first into the file explorer and then try again."));
                continue;
            }
            const result = new DeferredPromise();
            results.push(result);
            const reader = new FileReader();
            reader.onerror = () => result.complete(undefined);
            reader.onabort = () => result.complete(undefined);
            reader.onload = async (event) => {
                const name = file.name;
                const loadResult = event.target?.result ?? undefined;
                if (typeof name !== 'string' || typeof loadResult === 'undefined') {
                    result.complete(undefined);
                    return;
                }
                result.complete({
                    resource: URI.from({ scheme: Schemas.untitled, path: name }),
                    contents: typeof loadResult === 'string' ? VSBuffer.fromString(loadResult) : VSBuffer.wrap(new Uint8Array(loadResult))
                });
            };
            // Start reading
            reader.readAsArrayBuffer(file);
        }
    }
    return coalesce(await Promise.all(results.map(result => result.p)));
}
//#endregion
export function containsDragType(event, ...dragTypesToFind) {
    if (!event.dataTransfer) {
        return false;
    }
    const dragTypes = event.dataTransfer.types;
    const lowercaseDragTypes = [];
    for (let i = 0; i < dragTypes.length; i++) {
        lowercaseDragTypes.push(dragTypes[i].toLowerCase()); // somehow the types are lowercase
    }
    for (const dragType of dragTypesToFind) {
        if (lowercaseDragTypes.indexOf(dragType.toLowerCase()) >= 0) {
            return true;
        }
    }
    return false;
}
class DragAndDropContributionRegistry {
    constructor() {
        this._contributions = new Map();
    }
    register(contribution) {
        if (this._contributions.has(contribution.dataFormatKey)) {
            throw new Error(`A drag and drop contributiont with key '${contribution.dataFormatKey}' was already registered.`);
        }
        this._contributions.set(contribution.dataFormatKey, contribution);
    }
    getAll() {
        return this._contributions.values();
    }
}
export const Extensions = {
    DragAndDropContribution: 'workbench.contributions.dragAndDrop'
};
Registry.add(Extensions.DragAndDropContribution, new DragAndDropContributionRegistry());
//#endregion
//#region DND Utilities
/**
 * A singleton to store transfer data during drag & drop operations that are only valid within the application.
 */
export class LocalSelectionTransfer {
    static { this.INSTANCE = new LocalSelectionTransfer(); }
    constructor() {
        // protect against external instantiation
    }
    static getInstance() {
        return LocalSelectionTransfer.INSTANCE;
    }
    hasData(proto) {
        return proto && proto === this.proto;
    }
    clearData(proto) {
        if (this.hasData(proto)) {
            this.proto = undefined;
            this.data = undefined;
        }
    }
    getData(proto) {
        if (this.hasData(proto)) {
            return this.data;
        }
        return undefined;
    }
    setData(data, proto) {
        if (proto) {
            this.data = data;
            this.proto = proto;
        }
    }
}
function setDataAsJSON(e, kind, data) {
    e.dataTransfer?.setData(kind, JSON.stringify(data));
}
function getDataAsJSON(e, kind, defaultValue) {
    const rawSymbolsData = e.dataTransfer?.getData(kind);
    if (rawSymbolsData) {
        try {
            return JSON.parse(rawSymbolsData);
        }
        catch (error) {
            // Invalid transfer
        }
    }
    return defaultValue;
}
export function extractSymbolDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.SYMBOLS, []);
}
export function fillInSymbolsDragData(symbolsData, e) {
    setDataAsJSON(e, CodeDataTransfers.SYMBOLS, symbolsData);
}
export function extractMarkerDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.MARKERS, undefined);
}
export function fillInMarkersDragData(markerData, e) {
    setDataAsJSON(e, CodeDataTransfers.MARKERS, markerData);
}
/**
 * A helper to get access to Electrons `webUtils.getPathForFile` function
 * in a safe way without crashing the application when running in the web.
 */
export function getPathForFile(file) {
    if (isNative && typeof globalThis.vscode?.webUtils?.getPathForFile === 'function') {
        return globalThis.vscode.webUtils.getPathForFile(file);
    }
    return undefined;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RuZC9icm93c2VyL2RuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDZDQUE2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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DataTransfers } from '../../base/browser/dnd.js';
import { createFileDataTransferItem, createStringDataTransferItem, UriList, VSDataTransfer } from '../../base/common/dataTransfer.js';
import { Mimes } from '../../base/common/mime.js';
import { URI } from '../../base/common/uri.js';
import { CodeDataTransfers, getPathForFile } from '../../platform/dnd/browser/dnd.js';
export function toVSDataTransfer(dataTransfer) {
    const vsDataTransfer = new VSDataTransfer();
    for (const item of dataTransfer.items) {
        const type = item.type;
        if (item.kind === 'string') {
            const asStringValue = new Promise(resolve => item.getAsString(resolve));
            vsDataTransfer.append(type, createStringDataTransferItem(asStringValue));
        }
        else if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
                vsDataTransfer.append(type, createFileDataTransferItemFromFile(file));
            }
        }
    }
    return vsDataTransfer;
}
function createFileDataTransferItemFromFile(file) {
    const path = getPathForFile(file);
    const uri = path ? URI.parse(path) : undefined;
    return createFileDataTransferItem(file.name, uri, async () => {
        return new Uint8Array(await file.arrayBuffer());
    });
}
const INTERNAL_DND_MIME_TYPES = Object.freeze([
    CodeDataTransfers.EDITORS,
    CodeDataTransfers.FILES,
    DataTransfers.RESOURCES,
    DataTransfers.INTERNAL_URI_LIST,
]);
export function toExternalVSDataTransfer(sourceDataTransfer, overwriteUriList = false) {
    const vsDataTransfer = toVSDataTransfer(sourceDataTransfer);
    // Try to expose the internal uri-list type as the standard type
    const uriList = vsDataTransfer.get(DataTransfers.INTERNAL_URI_LIST);
    if (uriList) {
        vsDataTransfer.replace(Mimes.uriList, uriList);
    }
    else {
        if (overwriteUriList || !vsDataTransfer.has(Mimes.uriList)) {
            // Otherwise, fallback to adding dragged resources to the uri list
            const editorData = [];
            for (const item of sourceDataTransfer.items) {
                const file = item.getAsFile();
                if (file) {
                    const path = getPathForFile(file);
                    try {
                        if (path) {
                            editorData.push(URI.file(path).toString());
                        }
                        else {
                            editorData.push(URI.parse(file.name, true).toString());
                        }
                    }
                    catch {
                        // Parsing failed. Leave out from list
                    }
                }
            }
            if (editorData.length) {
                vsDataTransfer.replace(Mimes.uriList, createStringDataTransferItem(UriList.create(editorData)));
            }
        }
    }
    for (const internal of INTERNAL_DND_MIME_TYPES) {
        vsDataTransfer.delete(internal);
    }
    return vsDataTransfer;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2RuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLDRCQUE0QixFQUFxQixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekosT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHdEYsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFlBQTBCO0lBQzFELE1BQU0sY0FBYyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7SUFDNUMsS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDNUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQVMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEYsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFH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
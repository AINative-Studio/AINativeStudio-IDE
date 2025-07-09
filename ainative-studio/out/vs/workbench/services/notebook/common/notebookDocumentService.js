/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer, decodeBase64, encodeBase64 } from '../../../../base/common/buffer.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const INotebookDocumentService = createDecorator('notebookDocumentService');
const _lengths = ['W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f'];
const _padRegexp = new RegExp(`^[${_lengths.join('')}]+`);
const _radix = 7;
export function parse(cell) {
    if (cell.scheme !== Schemas.vscodeNotebookCell) {
        return undefined;
    }
    const idx = cell.fragment.indexOf('s');
    if (idx < 0) {
        return undefined;
    }
    const handle = parseInt(cell.fragment.substring(0, idx).replace(_padRegexp, ''), _radix);
    const _scheme = decodeBase64(cell.fragment.substring(idx + 1)).toString();
    if (isNaN(handle)) {
        return undefined;
    }
    return {
        handle,
        notebook: cell.with({ scheme: _scheme, fragment: null })
    };
}
export function generate(notebook, handle) {
    const s = handle.toString(_radix);
    const p = s.length < _lengths.length ? _lengths[s.length - 1] : 'z';
    const fragment = `${p}${s}s${encodeBase64(VSBuffer.fromString(notebook.scheme), true, true)}`;
    return notebook.with({ scheme: Schemas.vscodeNotebookCell, fragment });
}
export function parseMetadataUri(metadata) {
    if (metadata.scheme !== Schemas.vscodeNotebookMetadata) {
        return undefined;
    }
    const _scheme = decodeBase64(metadata.fragment).toString();
    return metadata.with({ scheme: _scheme, fragment: null });
}
export function generateMetadataUri(notebook) {
    const fragment = `${encodeBase64(VSBuffer.fromString(notebook.scheme), true, true)}`;
    return notebook.with({ scheme: Schemas.vscodeNotebookMetadata, fragment });
}
export function extractCellOutputDetails(uri) {
    if (uri.scheme !== Schemas.vscodeNotebookCellOutput) {
        return;
    }
    const params = new URLSearchParams(uri.query);
    const openIn = params.get('openIn');
    if (!openIn) {
        return;
    }
    const outputId = params.get('outputId') ?? undefined;
    const parsedCell = parse(uri.with({ scheme: Schemas.vscodeNotebookCell, query: null }));
    const outputIndex = params.get('outputIndex') ? parseInt(params.get('outputIndex') || '', 10) : undefined;
    const notebookUri = parsedCell ? parsedCell.notebook : uri.with({
        scheme: params.get('notebookScheme') || Schemas.file,
        fragment: null,
        query: null,
    });
    return {
        notebook: notebookUri,
        openIn: openIn,
        outputId: outputId,
        outputIndex: outputIndex,
        cellHandle: parsedCell?.handle,
        cellFragment: uri.fragment,
    };
}
export class NotebookDocumentWorkbenchService {
    constructor() {
        this._documents = new ResourceMap();
    }
    getNotebook(uri) {
        if (uri.scheme === Schemas.vscodeNotebookCell) {
            const cellUri = parse(uri);
            if (cellUri) {
                const document = this._documents.get(cellUri.notebook);
                if (document) {
                    return document;
                }
            }
        }
        if (uri.scheme === Schemas.vscodeNotebookCellOutput) {
            const parsedData = extractCellOutputDetails(uri);
            if (parsedData) {
                const document = this._documents.get(parsedData.notebook);
                if (document) {
                    return document;
                }
            }
        }
        return this._documents.get(uri);
    }
    addNotebookDocument(document) {
        this._documents.set(document.uri, document);
    }
    removeNotebookDocument(document) {
        this._documents.delete(document.uri);
    }
}
registerSingleton(INotebookDocumentService, NotebookDocumentWorkbenchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEb2N1bWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0RvY3VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUEyQix5QkFBeUIsQ0FBQyxDQUFDO0FBTzdHLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDcEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxNQUFNLENBQUMsS0FBSyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDakIsTUFBTSxVQUFVLEtBQUssQ0FBQyxJQUFTO0lBQzlCLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNoRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDYixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3pGLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUUxRSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ25CLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxPQUFPO1FBQ04sTUFBTTtRQUNOLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7S0FDeEQsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFDLFFBQWEsRUFBRSxNQUFjO0lBRXJELE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBRXBFLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDOUYsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQ3hFLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsUUFBYTtJQUM3QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDeEQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFFM0QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUMzRCxDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFFBQWE7SUFDaEQsTUFBTSxRQUFRLEdBQUcsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDckYsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQzVFLENBQUM7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsR0FBUTtJQUNoRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDckQsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPO0lBQ1IsQ0FBQztJQUNELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksU0FBUyxDQUFDO0lBQ3JELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQzFHLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztRQUMvRCxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJO1FBQ3BELFFBQVEsRUFBRSxJQUFJO1FBQ2QsS0FBSyxFQUFFLElBQUk7S0FDWCxDQUFDLENBQUM7SUFFSCxPQUFPO1FBQ04sUUFBUSxFQUFFLFdBQVc7UUFDckIsTUFBTSxFQUFFLE1BQU07UUFDZCxRQUFRLEVBQUUsUUFBUTtRQUNsQixXQUFXLEVBQUUsV0FBVztRQUN4QixVQUFVLEVBQUUsVUFBVSxFQUFFLE1BQU07UUFDOUIsWUFBWSxFQUFFLEdBQUcsQ0FBQyxRQUFRO0tBQzFCLENBQUM7QUFDSCxDQUFDO0FBV0QsTUFBTSxPQUFPLGdDQUFnQztJQUE3QztRQUdrQixlQUFVLEdBQUcsSUFBSSxXQUFXLEVBQXFCLENBQUM7SUFpQ3BFLENBQUM7SUEvQkEsV0FBVyxDQUFDLEdBQVE7UUFDbkIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQy9DLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzQixJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxPQUFPLFFBQVEsQ0FBQztnQkFDakIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ3JELE1BQU0sVUFBVSxHQUFHLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxPQUFPLFFBQVEsQ0FBQztnQkFDakIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsUUFBMkI7UUFDOUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsUUFBMkI7UUFDakQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7Q0FFRDtBQUVELGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLGdDQUFnQyxvQ0FBNEIsQ0FBQyJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64, encodeBase64, VSBuffer } from '../../../../../../base/common/buffer.js';
import { filter } from '../../../../../../base/common/objects.js';
import { URI } from '../../../../../../base/common/uri.js';
import { NotebookCellTextModel } from '../../../../notebook/common/model/notebookCellTextModel.js';
import { NotebookSetting } from '../../../../notebook/common/notebookCommon.js';
const BufferMarker = 'ArrayBuffer-4f56482b-5a03-49ba-8356-210d3b0c1c3d';
export const ChatEditingNotebookSnapshotScheme = 'chat-editing-notebook-snapshot-model';
export function getNotebookSnapshotFileURI(chatSessionId, requestId, undoStop, path, viewType) {
    return URI.from({
        scheme: ChatEditingNotebookSnapshotScheme,
        path,
        query: JSON.stringify({ sessionId: chatSessionId, requestId: requestId ?? '', undoStop: undoStop ?? '', viewType }),
    });
}
export function parseNotebookSnapshotFileURI(resource) {
    const data = JSON.parse(resource.query);
    return { sessionId: data.sessionId ?? '', requestId: data.requestId ?? '', undoStop: data.undoStop ?? '', viewType: data.viewType };
}
export function createSnapshot(notebook, transientOptions, outputSizeConfig) {
    const outputSizeLimit = (typeof outputSizeConfig === 'number' ? outputSizeConfig : outputSizeConfig.getValue(NotebookSetting.outputBackupSizeLimit)) * 1024;
    return serializeSnapshot(notebook.createSnapshot({ context: 2 /* SnapshotContext.Backup */, outputSizeLimit, transientOptions }), transientOptions);
}
export function restoreSnapshot(notebook, snapshot) {
    try {
        const { transientOptions, data } = deserializeSnapshot(snapshot);
        notebook.restoreSnapshot(data, transientOptions);
        const edits = [];
        data.cells.forEach((cell, index) => {
            const internalId = cell.internalMetadata?.internalId;
            if (internalId) {
                edits.push({ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } });
            }
        });
        notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
    }
    catch (ex) {
        console.error('Error restoring Notebook snapshot', ex);
    }
}
export class SnapshotComparer {
    constructor(initialCotent) {
        this.transientOptions = deserializeSnapshot(initialCotent).transientOptions;
        this.data = deserializeSnapshot(initialCotent).data;
    }
    isEqual(notebook) {
        if (notebook.cells.length !== this.data.cells.length) {
            return false;
        }
        const transientDocumentMetadata = this.transientOptions?.transientDocumentMetadata || {};
        const notebookMetadata = filter(notebook.metadata || {}, key => !transientDocumentMetadata[key]);
        const comparerMetadata = filter(this.data.metadata || {}, key => !transientDocumentMetadata[key]);
        // When comparing ignore transient items.
        if (JSON.stringify(notebookMetadata) !== JSON.stringify(comparerMetadata)) {
            return false;
        }
        const transientCellMetadata = this.transientOptions?.transientCellMetadata || {};
        for (let i = 0; i < notebook.cells.length; i++) {
            const notebookCell = notebook.cells[i];
            const comparerCell = this.data.cells[i];
            if (notebookCell instanceof NotebookCellTextModel) {
                if (!notebookCell.fastEqual(comparerCell, true)) {
                    return false;
                }
            }
            else {
                if (notebookCell.cellKind !== comparerCell.cellKind) {
                    return false;
                }
                if (notebookCell.language !== comparerCell.language) {
                    return false;
                }
                if (notebookCell.mime !== comparerCell.mime) {
                    return false;
                }
                if (notebookCell.source !== comparerCell.source) {
                    return false;
                }
                if (!this.transientOptions?.transientOutputs && notebookCell.outputs.length !== comparerCell.outputs.length) {
                    return false;
                }
                // When comparing ignore transient items.
                const cellMetadata = filter(notebookCell.metadata || {}, key => !transientCellMetadata[key]);
                const comparerCellMetadata = filter(comparerCell.metadata || {}, key => !transientCellMetadata[key]);
                if (JSON.stringify(cellMetadata) !== JSON.stringify(comparerCellMetadata)) {
                    return false;
                }
                // When comparing ignore transient items.
                if (JSON.stringify(sanitizeCellDto2(notebookCell, true, this.transientOptions)) !== JSON.stringify(sanitizeCellDto2(comparerCell, true, this.transientOptions))) {
                    return false;
                }
            }
        }
        return true;
    }
}
function sanitizeCellDto2(cell, ignoreInternalMetadata, transientOptions) {
    const transientCellMetadata = transientOptions?.transientCellMetadata || {};
    const outputs = transientOptions?.transientOutputs ? [] : cell.outputs.map(output => {
        // Ensure we're in full control of the data being stored.
        // Possible we have classes instead of plain objects.
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            outputs: output.outputs.map(item => {
                return {
                    data: item.data,
                    mime: item.mime,
                };
            }),
        };
    });
    // Ensure we're in full control of the data being stored.
    // Possible we have classes instead of plain objects.
    return {
        cellKind: cell.cellKind,
        language: cell.language,
        metadata: cell.metadata ? filter(cell.metadata, key => !transientCellMetadata[key]) : cell.metadata,
        outputs,
        mime: cell.mime,
        source: cell.source,
        collapseState: cell.collapseState,
        internalMetadata: ignoreInternalMetadata ? undefined : cell.internalMetadata
    };
}
function serializeSnapshot(data, transientOptions) {
    const dataDto = {
        // Never pass transient options, as we're after a backup here.
        // Else we end up stripping outputs from backups.
        // Whether its persisted or not is up to the serializer.
        // However when reloading/restoring we need to preserve outputs.
        cells: data.cells.map(cell => sanitizeCellDto2(cell)),
        metadata: data.metadata,
    };
    return JSON.stringify([
        JSON.stringify(transientOptions),
        JSON.stringify(dataDto, (_key, value) => {
            if (value instanceof VSBuffer) {
                return {
                    type: BufferMarker,
                    data: encodeBase64(value)
                };
            }
            return value;
        })
    ]);
}
export function deserializeSnapshot(snapshot) {
    const [transientOptionsStr, dataStr] = JSON.parse(snapshot);
    const transientOptions = transientOptionsStr ? JSON.parse(transientOptionsStr) : undefined;
    const data = JSON.parse(dataStr, (_key, value) => {
        if (value && value.type === BufferMarker) {
            return decodeBase64(value.data);
        }
        return value;
    });
    return { transientOptions, data };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rU25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvbm90ZWJvb2svY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rU25hcHNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUczRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQTZFLGVBQWUsRUFBb0IsTUFBTSwrQ0FBK0MsQ0FBQztBQUU3SyxNQUFNLFlBQVksR0FBRyxrREFBa0QsQ0FBQztBQUd4RSxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxzQ0FBc0MsQ0FBQztBQUV4RixNQUFNLFVBQVUsMEJBQTBCLENBQUMsYUFBcUIsRUFBRSxTQUE2QixFQUFFLFFBQTRCLEVBQUUsSUFBWSxFQUFFLFFBQWdCO0lBQzVKLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNmLE1BQU0sRUFBRSxpQ0FBaUM7UUFDekMsSUFBSTtRQUNKLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsU0FBUyxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQXdELENBQUM7S0FDekssQ0FBQyxDQUFDO0FBQ0os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
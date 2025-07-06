/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LcsDiff } from '../../../../../base/common/diff/diff.js';
import { doHash, hash, numberHash } from '../../../../../base/common/hash.js';
import { URI } from '../../../../../base/common/uri.js';
import { PieceTreeTextBufferBuilder } from '../../../../../editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { CellKind, NotebookCellsChangeType } from '../notebookCommon.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { SearchParams } from '../../../../../editor/common/model/textModelSearch.js';
import { MirrorModel } from '../../../../../editor/common/services/textModelSync/textModelSync.impl.js';
import { filter } from '../../../../../base/common/objects.js';
import { matchCellBasedOnSimilarties } from './notebookCellMatching.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { DiffChange } from '../../../../../base/common/diff/diffChange.js';
import { computeDiff } from '../notebookDiff.js';
const PREFIX_FOR_UNMATCHED_ORIGINAL_CELLS = `unmatchedOriginalCell`;
class MirrorCell {
    get eol() {
        return this._eol === '\r\n' ? 2 /* DefaultEndOfLine.CRLF */ : 1 /* DefaultEndOfLine.LF */;
    }
    constructor(handle, uri, source, _eol, versionId, language, cellKind, outputs, metadata, internalMetadata) {
        this.handle = handle;
        this._eol = _eol;
        this.language = language;
        this.cellKind = cellKind;
        this.outputs = outputs;
        this.metadata = metadata;
        this.internalMetadata = internalMetadata;
        this.textModel = new MirrorModel(uri, source, _eol, versionId);
    }
    onEvents(e) {
        this.textModel.onEvents(e);
        this._hash = undefined;
    }
    getValue() {
        return this.textModel.getValue();
    }
    getLinesContent() {
        return this.textModel.getLinesContent();
    }
    getComparisonValue() {
        return this._hash ??= this._getHash();
    }
    _getHash() {
        let hashValue = numberHash(104579, 0);
        hashValue = doHash(this.language, hashValue);
        hashValue = doHash(this.getValue(), hashValue);
        hashValue = doHash(this.metadata, hashValue);
        // For purpose of diffing only cellId matters, rest do not
        hashValue = doHash(this.internalMetadata?.internalId || '', hashValue);
        for (const op of this.outputs) {
            hashValue = doHash(op.metadata, hashValue);
            for (const output of op.outputs) {
                hashValue = doHash(output.mime, hashValue);
            }
        }
        const digests = this.outputs.flatMap(op => op.outputs.map(o => hash(Array.from(o.data.buffer))));
        for (const digest of digests) {
            hashValue = numberHash(digest, hashValue);
        }
        return hashValue;
    }
}
class MirrorNotebookDocument {
    constructor(uri, cells, metadata, transientDocumentMetadata) {
        this.uri = uri;
        this.cells = cells;
        this.metadata = metadata;
        this.transientDocumentMetadata = transientDocumentMetadata;
    }
    acceptModelChanged(event) {
        // note that the cell content change is not applied to the MirrorCell
        // but it's fine as if a cell content is modified after the first diff, its position will not change any more
        // TODO@rebornix, but it might lead to interesting bugs in the future.
        event.rawEvents.forEach(e => {
            if (e.kind === NotebookCellsChangeType.ModelChange) {
                this._spliceNotebookCells(e.changes);
            }
            else if (e.kind === NotebookCellsChangeType.Move) {
                const cells = this.cells.splice(e.index, 1);
                this.cells.splice(e.newIdx, 0, ...cells);
            }
            else if (e.kind === NotebookCellsChangeType.Output) {
                const cell = this.cells[e.index];
                cell.outputs = e.outputs;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeCellLanguage) {
                this._assertIndex(e.index);
                const cell = this.cells[e.index];
                cell.language = e.language;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeCellMetadata) {
                this._assertIndex(e.index);
                const cell = this.cells[e.index];
                cell.metadata = e.metadata;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeCellInternalMetadata) {
                this._assertIndex(e.index);
                const cell = this.cells[e.index];
                cell.internalMetadata = e.internalMetadata;
            }
            else if (e.kind === NotebookCellsChangeType.ChangeDocumentMetadata) {
                this.metadata = e.metadata;
            }
        });
    }
    _assertIndex(index) {
        if (index < 0 || index >= this.cells.length) {
            throw new Error(`Illegal index ${index}. Cells length: ${this.cells.length}`);
        }
    }
    _spliceNotebookCells(splices) {
        splices.reverse().forEach(splice => {
            const cellDtos = splice[2];
            const newCells = cellDtos.map(cell => {
                return new MirrorCell(cell.handle, URI.parse(cell.url), cell.source, cell.eol, cell.versionId, cell.language, cell.cellKind, cell.outputs, cell.metadata);
            });
            this.cells.splice(splice[0], splice[1], ...newCells);
        });
    }
}
class CellSequence {
    static create(textModel) {
        const hashValue = textModel.cells.map(c => c.getComparisonValue());
        return new CellSequence(hashValue);
    }
    static createWithCellId(cells, includeCellContents) {
        const hashValue = cells.map((c) => {
            if (includeCellContents) {
                return `${doHash(c.internalMetadata?.internalId, numberHash(104579, 0))}#${c.getComparisonValue()}`;
            }
            else {
                return `${doHash(c.internalMetadata?.internalId, numberHash(104579, 0))}}`;
            }
        });
        return new CellSequence(hashValue);
    }
    constructor(hashValue) {
        this.hashValue = hashValue;
    }
    getElements() {
        return this.hashValue;
    }
}
export class NotebookWorker {
    constructor() {
        this._models = Object.create(null);
    }
    dispose() {
    }
    $acceptNewModel(uri, metadata, transientDocumentMetadata, cells) {
        this._models[uri] = new MirrorNotebookDocument(URI.parse(uri), cells.map(dto => new MirrorCell(dto.handle, URI.parse(dto.url), dto.source, dto.eol, dto.versionId, dto.language, dto.cellKind, dto.outputs, dto.metadata, dto.internalMetadata)), metadata, transientDocumentMetadata);
    }
    $acceptModelChanged(strURL, event) {
        const model = this._models[strURL];
        model?.acceptModelChanged(event);
    }
    $acceptCellModelChanged(strURL, handle, event) {
        const model = this._models[strURL];
        model.cells.find(cell => cell.handle === handle)?.onEvents(event);
    }
    $acceptRemovedModel(strURL) {
        if (!this._models[strURL]) {
            return;
        }
        delete this._models[strURL];
    }
    async $computeDiff(originalUrl, modifiedUrl) {
        const original = this._getModel(originalUrl);
        const modified = this._getModel(modifiedUrl);
        const originalModel = new NotebookTextModelFacade(original);
        const modifiedModel = new NotebookTextModelFacade(modified);
        const originalMetadata = filter(original.metadata, key => !original.transientDocumentMetadata[key]);
        const modifiedMetadata = filter(modified.metadata, key => !modified.transientDocumentMetadata[key]);
        const metadataChanged = JSON.stringify(originalMetadata) !== JSON.stringify(modifiedMetadata);
        // TODO@DonJayamanne
        // In the future we might want to avoid computing LCS of outputs
        // That will make this faster.
        const originalDiff = new LcsDiff(CellSequence.create(original), CellSequence.create(modified)).ComputeDiff(false);
        if (originalDiff.changes.length === 0) {
            return {
                metadataChanged,
                cellsDiff: originalDiff
            };
        }
        // This will return the mapping of the cells and what cells were inserted/deleted.
        // We do not care much about accuracy of the diff, but care about the mapping of unmodified cells.
        // That can be used as anchor points to find the cells that have changed.
        // And on cells that have changed, we can use similarity algorithms to find the mapping.
        // Eg as mentioned earlier, its possible after similarity algorithms we find that cells weren't inserted/deleted but were just modified.
        const cellMapping = computeDiff(originalModel, modifiedModel, { cellsDiff: { changes: originalDiff.changes, quitEarly: false }, metadataChanged: false, }).cellDiffInfo;
        // If we have no insertions/deletions, then this is a good diffing.
        if (cellMapping.every(c => c.type === 'modified')) {
            return {
                metadataChanged,
                cellsDiff: originalDiff
            };
        }
        let diffUsingCellIds = this.canComputeDiffWithCellIds(original, modified);
        if (!diffUsingCellIds) {
            /**
             * Assume we have cells as follows
             * Original   Modified
             * A	  		A
             * B			B
             * C			e
             * D			F
             * E
             * F
             *
             * Using LCS we know easily that A, B cells match.
             * Using LCS it would look like C changed to e
             * Using LCS D & E were removed.
             *
             * A human would be able to tell that cell C, D were removed.
             * A human can tell that E changed to e because the code in the cells are very similar.
             * Note the words `similar`, humans try to match cells based on certain heuristics.
             * & the most obvious one is the similarity of the code in the cells.
             *
             * LCS has no notion of similarity, it only knows about equality.
             * We can use other algorithms to find similarity.
             * So if we eliminate A, B, we are left with C, D, E, F and we need to find what they map to in `e, F` in modifed document.
             * We can use a similarity algorithm to find that.
             *
             * The purpose of using LCS first is to find the cells that have not changed.
             * This avoids the need to use similarity algorithms on all cells.
             *
             * At the end of the day what we need is as follows
             * A <=> A
             * B <=> B
             * C => Deleted
             * D => Deleted
             * E => e
             * F => F
             */
            // Note, if cells are swapped, then this compilicates things
            // Trying to solve diff manually is not easy.
            // Lets instead use LCS find the cells that haven't changed,
            // & the cells that have.
            // For the range of cells that have change, lets see if we can get better results using similarity algorithms.
            // Assume we have
            // Code Cell = print("Hello World")
            // Code Cell = print("Foo Bar")
            // We now change this to
            // MD Cell = # Description
            // Code Cell = print("Hello WorldZ")
            // Code Cell = print("Foo BarZ")
            // LCS will tell us that everything changed.
            // But using similarity algorithms we can tell that the first cell is new and last 2 changed.
            // Lets try the similarity algorithms on all cells.
            // We might fare better.
            const result = matchCellBasedOnSimilarties(modified.cells, original.cells);
            // If we have at least one match, then great.
            if (result.some(c => c.original !== -1)) {
                // We have managed to find similarities between cells.
                // Now we can definitely find what cell is new/removed.
                this.updateCellIdsBasedOnMappings(result, original.cells, modified.cells);
                diffUsingCellIds = true;
            }
        }
        if (!diffUsingCellIds) {
            return {
                metadataChanged,
                cellsDiff: originalDiff
            };
        }
        // At this stage we can use internalMetadata.cellId for tracking changes.
        // I.e. we compute LCS diff and the hashes of some cells from original will be equal to that in modified as we're using cellId.
        // Thus we can find what cells are new/deleted.
        // After that we can find whether the contents of the cells changed.
        const cellsInsertedOrDeletedDiff = new LcsDiff(CellSequence.createWithCellId(original.cells), CellSequence.createWithCellId(modified.cells)).ComputeDiff(false);
        const cellDiffInfo = computeDiff(originalModel, modifiedModel, { cellsDiff: { changes: cellsInsertedOrDeletedDiff.changes, quitEarly: false }, metadataChanged: false, }).cellDiffInfo;
        let processedIndex = 0;
        const changes = [];
        cellsInsertedOrDeletedDiff.changes.forEach(change => {
            if (!change.originalLength && change.modifiedLength) {
                // Inserted.
                // Find all modified cells before this.
                const changeIndex = cellDiffInfo.findIndex(c => c.type === 'insert' && c.modifiedCellIndex === change.modifiedStart);
                cellDiffInfo.slice(processedIndex, changeIndex).forEach(c => {
                    if (c.type === 'unchanged' || c.type === 'modified') {
                        const originalCell = original.cells[c.originalCellIndex];
                        const modifiedCell = modified.cells[c.modifiedCellIndex];
                        const changed = c.type === 'modified' || originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                        if (changed) {
                            changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                        }
                    }
                });
                changes.push(change);
                processedIndex = changeIndex + 1;
            }
            else if (change.originalLength && !change.modifiedLength) {
                // Deleted.
                // Find all modified cells before this.
                const changeIndex = cellDiffInfo.findIndex(c => c.type === 'delete' && c.originalCellIndex === change.originalStart);
                cellDiffInfo.slice(processedIndex, changeIndex).forEach(c => {
                    if (c.type === 'unchanged' || c.type === 'modified') {
                        const originalCell = original.cells[c.originalCellIndex];
                        const modifiedCell = modified.cells[c.modifiedCellIndex];
                        const changed = c.type === 'modified' || originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                        if (changed) {
                            changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                        }
                    }
                });
                changes.push(change);
                processedIndex = changeIndex + 1;
            }
            else {
                // This could be a situation where a cell has been deleted on left and inserted on the right.
                // E.g. markdown cell deleted and code cell inserted.
                // But LCS shows them as a modification.
                const changeIndex = cellDiffInfo.findIndex(c => (c.type === 'delete' && c.originalCellIndex === change.originalStart) || (c.type === 'insert' && c.modifiedCellIndex === change.modifiedStart));
                cellDiffInfo.slice(processedIndex, changeIndex).forEach(c => {
                    if (c.type === 'unchanged' || c.type === 'modified') {
                        const originalCell = original.cells[c.originalCellIndex];
                        const modifiedCell = modified.cells[c.modifiedCellIndex];
                        const changed = c.type === 'modified' || originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                        if (changed) {
                            changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                        }
                    }
                });
                changes.push(change);
                processedIndex = changeIndex + 1;
            }
        });
        cellDiffInfo.slice(processedIndex).forEach(c => {
            if (c.type === 'unchanged' || c.type === 'modified') {
                const originalCell = original.cells[c.originalCellIndex];
                const modifiedCell = modified.cells[c.modifiedCellIndex];
                const changed = c.type === 'modified' || originalCell.getComparisonValue() !== modifiedCell.getComparisonValue();
                if (changed) {
                    changes.push(new DiffChange(c.originalCellIndex, 1, c.modifiedCellIndex, 1));
                }
            }
        });
        return {
            metadataChanged,
            cellsDiff: {
                changes,
                quitEarly: false
            }
        };
    }
    canComputeDiffWithCellIds(original, modified) {
        return this.canComputeDiffWithCellInternalIds(original, modified) || this.canComputeDiffWithCellMetadataIds(original, modified);
    }
    canComputeDiffWithCellInternalIds(original, modified) {
        const originalCellIndexIds = original.cells.map((cell, index) => ({ index, id: (cell.internalMetadata?.internalId || '') }));
        const modifiedCellIndexIds = modified.cells.map((cell, index) => ({ index, id: (cell.internalMetadata?.internalId || '') }));
        // If we have a cell without an id, do not use metadata.id for diffing.
        if (originalCellIndexIds.some(c => !c.id) || modifiedCellIndexIds.some(c => !c.id)) {
            return false;
        }
        // If none of the ids in original can be found in modified, then we can't use metadata.id for diffing.
        // I.e. everything is new, no point trying.
        return originalCellIndexIds.some(c => modifiedCellIndexIds.find(m => m.id === c.id));
    }
    canComputeDiffWithCellMetadataIds(original, modified) {
        const originalCellIndexIds = original.cells.map((cell, index) => ({ index, id: (cell.metadata?.id || '') }));
        const modifiedCellIndexIds = modified.cells.map((cell, index) => ({ index, id: (cell.metadata?.id || '') }));
        // If we have a cell without an id, do not use metadata.id for diffing.
        if (originalCellIndexIds.some(c => !c.id) || modifiedCellIndexIds.some(c => !c.id)) {
            return false;
        }
        // If none of the ids in original can be found in modified, then we can't use metadata.id for diffing.
        // I.e. everything is new, no point trying.
        if (originalCellIndexIds.every(c => !modifiedCellIndexIds.find(m => m.id === c.id))) {
            return false;
        }
        // Internally we use internalMetadata.cellId for diffing, hence update the internalMetadata.cellId
        original.cells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || {};
            cell.internalMetadata.internalId = cell.metadata?.id || '';
        });
        modified.cells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || {};
            cell.internalMetadata.internalId = cell.metadata?.id || '';
        });
        return true;
    }
    isOriginalCellMatchedWithModifiedCell(originalCell) {
        return (originalCell.internalMetadata?.internalId || '').startsWith(PREFIX_FOR_UNMATCHED_ORIGINAL_CELLS);
    }
    updateCellIdsBasedOnMappings(mappings, originalCells, modifiedCells) {
        const uuids = new Map();
        originalCells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || { internalId: '' };
            cell.internalMetadata.internalId = `${PREFIX_FOR_UNMATCHED_ORIGINAL_CELLS}${generateUuid()}`;
            const found = mappings.find(r => r.original === index);
            if (found) {
                // Do not use the indexes as ids.
                // If we do, then the hashes will be very similar except for last digit.
                cell.internalMetadata.internalId = generateUuid();
                uuids.set(found.modified, cell.internalMetadata.internalId);
            }
        });
        modifiedCells.map((cell, index) => {
            cell.internalMetadata = cell.internalMetadata || { internalId: '' };
            cell.internalMetadata.internalId = uuids.get(index) ?? generateUuid();
        });
        return true;
    }
    $canPromptRecommendation(modelUrl) {
        const model = this._getModel(modelUrl);
        const cells = model.cells;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell.cellKind === CellKind.Markup) {
                continue;
            }
            if (cell.language !== 'python') {
                continue;
            }
            const searchParams = new SearchParams('import\\s*pandas|from\\s*pandas', true, false, null);
            const searchData = searchParams.parseSearchRequest();
            if (!searchData) {
                continue;
            }
            const builder = new PieceTreeTextBufferBuilder();
            builder.acceptChunk(cell.getValue());
            const bufferFactory = builder.finish(true);
            const textBuffer = bufferFactory.create(cell.eol).textBuffer;
            const lineCount = textBuffer.getLineCount();
            const maxLineCount = Math.min(lineCount, 20);
            const range = new Range(1, 1, maxLineCount, textBuffer.getLineLength(maxLineCount) + 1);
            const cellMatches = textBuffer.findMatchesLineByLine(range, searchData, true, 1);
            if (cellMatches.length > 0) {
                return true;
            }
        }
        return false;
    }
    _getModel(uri) {
        return this._models[uri];
    }
}
export function create() {
    return new NotebookWorker();
}
class NotebookTextModelFacade {
    constructor(notebook) {
        this.notebook = notebook;
        this.cells = notebook.cells.map(cell => new NotebookCellTextModelFacade(cell));
    }
}
class NotebookCellTextModelFacade {
    get cellKind() {
        return this.cell.cellKind;
    }
    constructor(cell) {
        this.cell = cell;
    }
    getHashValue() {
        return this.cell.getComparisonValue();
    }
    equal(cell) {
        if (cell.cellKind !== this.cellKind) {
            return false;
        }
        return this.getHashValue() === cell.getHashValue();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tXZWJXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vc2VydmljZXMvbm90ZWJvb2tXZWJXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUEwQixPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0ZBQXNGLENBQUM7QUFDbEksT0FBTyxFQUFFLFFBQVEsRUFBbUksdUJBQXVCLEVBQW9GLE1BQU0sc0JBQXNCLENBQUM7QUFDNVIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFHeEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRWpELE1BQU0sbUNBQW1DLEdBQUcsdUJBQXVCLENBQUM7QUFFcEUsTUFBTSxVQUFVO0lBR2YsSUFBVyxH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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { computeLevenshteinDistance } from '../../../../../base/common/diff/diff.js';
/**
 * Given a set of modified cells and original cells, this function will attempt to match the modified cells with the original cells.
 * E.g. Assume you have (original on left and modified on right):
 * =================
 * Cell A  | Cell a
 * Cell B  | Cell b
 * Cell C  | Cell d
 * Cell D  | Cell e
 * =================
 * Here we know that `Cell C` has been removed and `Cell e` has been added.
 * The mapping from modified to original will be as follows:
 * Cell a => Cell A
 * Cell b => Cell B
 * Cell d => Cell D
 * Cell e => <Does not match anything in original, hence a new Cell>
 * Cell C in original was not matched, hence it was deleted.
 *
 * Thus the return value is as follows:
 * [
 * { modified: 0, original: 0 },
 * { modified: 1, original: 1 },
 * { modified: 2, original: 3 },
 * { modified: 3, original: -1 },
 * ]
 * @returns
 */
export function matchCellBasedOnSimilarties(modifiedCells, originalCells) {
    const cache = {
        modifiedToOriginal: new Map(),
        originalToModified: new Map(),
    };
    const results = [];
    const mappedOriginalCellToModifiedCell = new Map();
    const mappedModifiedIndexes = new Set();
    const originalIndexWithMostEdits = new Map();
    const canOriginalIndexBeMappedToModifiedIndex = (originalIndex, value) => {
        if (mappedOriginalCellToModifiedCell.has(originalIndex)) {
            return false;
        }
        const existingEdits = originalIndexWithMostEdits.get(originalIndex)?.dist ?? Number.MAX_SAFE_INTEGER;
        return value.editCount < existingEdits;
    };
    const trackMappedIndexes = (modifiedIndex, originalIndex) => {
        mappedOriginalCellToModifiedCell.set(originalIndex, modifiedIndex);
        mappedModifiedIndexes.add(modifiedIndex);
    };
    for (let i = 0; i < modifiedCells.length; i++) {
        const modifiedCell = modifiedCells[i];
        const { index, editCount: dist, percentage } = computeClosestCell({ cell: modifiedCell, index: i }, originalCells, true, cache, canOriginalIndexBeMappedToModifiedIndex);
        if (index >= 0 && dist === 0) {
            trackMappedIndexes(i, index);
            results.push({ modified: i, original: index, dist, percentage, possibleOriginal: index });
        }
        else {
            originalIndexWithMostEdits.set(index, { dist: dist, modifiedIndex: i });
            results.push({ modified: i, original: -1, dist: dist, percentage, possibleOriginal: index });
        }
    }
    results.forEach((result, i) => {
        if (result.original >= 0) {
            return;
        }
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched>
         * C c <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * Just match A => a, B => b, C => c
         */
        // Find the next cell that has been matched.
        const previousMatchedCell = i > 0 ? results.slice(0, i).reverse().find(r => r.original >= 0) : undefined;
        const previousMatchedOriginalIndex = previousMatchedCell?.original ?? -1;
        const previousMatchedModifiedIndex = previousMatchedCell?.modified ?? -1;
        const matchedCell = results.slice(i + 1).find(r => r.original >= 0);
        const unavailableIndexes = new Set();
        const nextMatchedModifiedIndex = results.findIndex((item, idx) => idx > i && item.original >= 0);
        const nextMatchedOriginalIndex = nextMatchedModifiedIndex >= 0 ? results[nextMatchedModifiedIndex].original : -1;
        // Find the available indexes that we can match with.
        // We are only interested in b and c (anything after d is of no use).
        originalCells.forEach((_, i) => {
            if (mappedOriginalCellToModifiedCell.has(i)) {
                unavailableIndexes.add(i);
                return;
            }
            if (matchedCell && i >= matchedCell.original) {
                unavailableIndexes.add(i);
            }
            if (nextMatchedOriginalIndex >= 0 && i > nextMatchedOriginalIndex) {
                unavailableIndexes.add(i);
            }
        });
        const modifiedCell = modifiedCells[i];
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched because the % of change is too high, but we do have a probable match>
         * C c <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * Given that we have a probable match for B => b, we can match it.
         */
        if (result.original === -1 && result.possibleOriginal >= 0 && !unavailableIndexes.has(result.possibleOriginal) && canOriginalIndexBeMappedToModifiedIndex(result.possibleOriginal, { editCount: result.dist })) {
            trackMappedIndexes(i, result.possibleOriginal);
            result.original = result.possibleOriginal;
            return;
        }
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched>
         * C c <not matched>
         * D d (these two have been matched)
         * =================
         * Its possible that B matches better with c and C matches better with b.
         * However given the fact that we have matched A => a and D => d.
         * & if the indexes are an exact match.
         * I.e. index of D in Modified === index of d in Original, and index of A in Modified === index of a in Original.
         * Then this means there are absolutely no modifications.
         * Hence we can just assign the indexes as is.
         *
         * NOTE: For this, we must ensure we have exactly the same number of items on either side.
         * I.e. we have B, C remaining in Modified, and b, c remaining in Original.
         * Thats 2 Modified items === 2 Original Items.
         * If its not the same, then this means something has been deleted/inserted, and we cannot blindly map the indexes.
        */
        if (previousMatchedOriginalIndex > 0 && previousMatchedModifiedIndex > 0 && previousMatchedOriginalIndex === previousMatchedModifiedIndex) {
            if ((nextMatchedModifiedIndex >= 0 ? nextMatchedModifiedIndex : modifiedCells.length - 1) === (nextMatchedOriginalIndex >= 0 ? nextMatchedOriginalIndex : originalCells.length - 1) && !unavailableIndexes.has(i) && i < originalCells.length) {
                const remainingModifiedItems = (nextMatchedModifiedIndex >= 0 ? nextMatchedModifiedIndex : modifiedCells.length) - previousMatchedModifiedIndex;
                const remainingOriginalItems = (nextMatchedOriginalIndex >= 0 ? nextMatchedOriginalIndex : originalCells.length) - previousMatchedOriginalIndex;
                if (remainingModifiedItems === remainingOriginalItems && modifiedCell.cellKind === originalCells[i].cellKind) {
                    trackMappedIndexes(i, i);
                    result.original = i;
                    return;
                }
            }
        }
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B b <not matched>
         * C c <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * We can now try to match B with b and c and figure out which is best.
         * RULE 1. Its possible that B will match best with c, howevber C matches better with c, meaning we should match B with b.
         * To do this, we need to see if c has a better match with something else.
        */
        // RULE 1
        // Try to find the next best match, but exclucde items that have a better match.
        const { index, percentage } = computeClosestCell({ cell: modifiedCell, index: i }, originalCells, false, cache, (originalIndex, originalValue) => {
            if (unavailableIndexes.has(originalIndex)) {
                return false;
            }
            if (nextMatchedModifiedIndex > 0 || previousMatchedOriginalIndex > 0) {
                // See if we have a beter match for this.
                const matchesForThisOriginalIndex = cache.originalToModified.get(originalIndex);
                if (matchesForThisOriginalIndex && previousMatchedOriginalIndex < originalIndex) {
                    const betterMatch = Array.from(matchesForThisOriginalIndex).find(([modifiedIndex, value]) => {
                        if (modifiedIndex === i) {
                            // This is the same modifeid entry.
                            return false;
                        }
                        if (modifiedIndex >= nextMatchedModifiedIndex) {
                            // We're only interested in matches that are before the next matched index.
                            return false;
                        }
                        if (mappedModifiedIndexes.has(i)) {
                            // This has already been matched.
                            return false;
                        }
                        return value.editCount < originalValue.editCount;
                    });
                    if (betterMatch) {
                        // We do have a better match for this, hence do not use this.
                        return false;
                    }
                }
            }
            return !unavailableIndexes.has(originalIndex);
        });
        /**
         * I.e. Assume you have the following
         * =================
         * A a (this has ben matched)
         * B bbbbbbbbbbbbbb <not matched>
         * C cccccccccccccc <not matched>
         * D d (these two have been matched)
         * e e
         * f f
         * =================
         * RULE 1 . Now when attempting to match `bbbbbbbbbbbb` with B, the number of edits is very high and the percentage is also very high.
         * Basically majority of the text needs to be changed.
         * However if the indexes line up perfectly well, and this is the best match, then use it.
        *
         * Similarly its possible we're trying to match b with `BBBBBBBBBBBB` and the number of edits is very high, but the indexes line up perfectly well.
        *
        * RULE 2. However it is also possible that there's a better match with another cell
        * Assume we have
         * =================
         * AAAA     a (this has been matched)
         * bbbbbbbb b <not matched>
         * bbbb     c <not matched>
         * dddd     d (these two have been matched)
         * =================
         * In this case if we use the algorithm of (1) above, we'll end up matching bbbb with b, and bbbbbbbb with c.
         * But we're not really sure if this is the best match.
         * In such cases try to match with the same cell index.
         *
        */
        // RULE 1 (got a match and the indexes line up perfectly well, use it regardless of the number of edits).
        if (index >= 0 && i > 0 && results[i - 1].original === index - 1) {
            trackMappedIndexes(i, index);
            results[i].original = index;
            return;
        }
        // RULE 2
        // Here we know that `AAAA => a`
        // Check if the previous cell has been matched.
        // And if the next modified and next original cells are a match.
        const nextOriginalCell = (i > 0 && originalCells.length > results[i - 1].original) ? results[i - 1].original + 1 : -1;
        const nextOriginalCellValue = i > 0 && nextOriginalCell >= 0 && nextOriginalCell < originalCells.length ? originalCells[nextOriginalCell].getValue() : undefined;
        if (index >= 0 && i > 0 && typeof nextOriginalCellValue === 'string' && !mappedOriginalCellToModifiedCell.has(nextOriginalCell)) {
            if (modifiedCell.getValue().includes(nextOriginalCellValue) || nextOriginalCellValue.includes(modifiedCell.getValue())) {
                trackMappedIndexes(i, nextOriginalCell);
                results[i].original = nextOriginalCell;
                return;
            }
        }
        if (percentage < 90 || (i === 0 && results.length === 1)) {
            trackMappedIndexes(i, index);
            results[i].original = index;
            return;
        }
    });
    return results;
}
function computeClosestCell({ cell, index: cellIndex }, arr, ignoreEmptyCells, cache, canOriginalIndexBeMappedToModifiedIndex) {
    let min_edits = Infinity;
    let min_index = -1;
    // Always give preference to internal Cell Id if found.
    const internalId = cell.internalMetadata?.internalId;
    if (internalId) {
        const internalIdIndex = arr.findIndex(cell => cell.internalMetadata?.internalId === internalId);
        if (internalIdIndex >= 0) {
            return { index: internalIdIndex, editCount: 0, percentage: Number.MAX_SAFE_INTEGER };
        }
    }
    for (let i = 0; i < arr.length; i++) {
        // Skip cells that are not of the same kind.
        if (arr[i].cellKind !== cell.cellKind) {
            continue;
        }
        const str = arr[i].getValue();
        const cacheEntry = cache.modifiedToOriginal.get(cellIndex) ?? new Map();
        const value = cacheEntry.get(i) ?? { editCount: computeNumberOfEdits(cell, arr[i]), };
        cacheEntry.set(i, value);
        cache.modifiedToOriginal.set(cellIndex, cacheEntry);
        const originalCacheEntry = cache.originalToModified.get(i) ?? new Map();
        originalCacheEntry.set(cellIndex, value);
        cache.originalToModified.set(i, originalCacheEntry);
        if (!canOriginalIndexBeMappedToModifiedIndex(i, value)) {
            continue;
        }
        if (str.length === 0 && ignoreEmptyCells) {
            continue;
        }
        if (str === cell.getValue() && cell.getValue().length > 0) {
            return { index: i, editCount: 0, percentage: 0 };
        }
        if (value.editCount < min_edits) {
            min_edits = value.editCount;
            min_index = i;
        }
    }
    if (min_index === -1) {
        return { index: -1, editCount: Number.MAX_SAFE_INTEGER, percentage: Number.MAX_SAFE_INTEGER };
    }
    const percentage = !cell.getValue().length && !arr[min_index].getValue().length ? 0 : (cell.getValue().length ? (min_edits * 100 / cell.getValue().length) : Number.MAX_SAFE_INTEGER);
    return { index: min_index, editCount: min_edits, percentage };
}
function computeNumberOfEdits(modified, original) {
    if (modified.getValue() === original.getValue()) {
        return 0;
    }
    return computeLevenshteinDistance(modified.getValue(), original.getValue());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTWF0Y2hpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9zZXJ2aWNlcy9ub3RlYm9va0NlbGxNYXRjaGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQXFCckY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F5Qkc7QUFDSCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsYUFBc0IsRUFBRSxhQUFzQjtJQUN6RixNQUFNLEtBQUssR0FBdUI7UUFDakMsa0JBQWtCLEVBQUUsSUFBSSxHQUFHLEVBQStEO1FBQzFGLGtCQUFrQixFQUFFLElBQUksR0FBRyxFQUErRDtLQUMxRixDQUFDO0lBQ0YsTUFBTSxPQUFPLEdBQXlHLEVBQUUsQ0FBQztJQUN6SCxNQUFNLGdDQUFnQyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBQ25FLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUNoRCxNQUFNLDBCQUEwQixHQUFHLElBQUksR0FBRyxFQUFtRCxDQUFDO0lBQzlGLE1BQU0sdUNBQXVDLEdBQUcsQ0FBQyxhQUFxQixFQUFFLEtBQStCLEVBQUUsRUFBRTtRQUMxRyxJQUFJLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3pELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE1BQU0sYUFBYSxHQUFHLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLElBQUksTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQ3JHLE9BQU8sS0FBSyxDQUFDLFNBQVMsR0FBRyxh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
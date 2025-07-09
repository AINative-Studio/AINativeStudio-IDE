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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTWF0Y2hpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL3NlcnZpY2VzL25vdGVib29rQ2VsbE1hdGNoaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBcUJyRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXlCRztBQUNILE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxhQUFzQixFQUFFLGFBQXNCO0lBQ3pGLE1BQU0sS0FBSyxHQUF1QjtRQUNqQyxrQkFBa0IsRUFBRSxJQUFJLEdBQUcsRUFBK0Q7UUFDMUYsa0JBQWtCLEVBQUUsSUFBSSxHQUFHLEVBQStEO0tBQzFGLENBQUM7SUFDRixNQUFNLE9BQU8sR0FBeUcsRUFBRSxDQUFDO0lBQ3pILE1BQU0sZ0NBQWdDLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFDbkUsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQ2hELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxHQUFHLEVBQW1ELENBQUM7SUFDOUYsTUFBTSx1Q0FBdUMsR0FBRyxDQUFDLGFBQXFCLEVBQUUsS0FBK0IsRUFBRSxFQUFFO1FBQzFHLElBQUksZ0NBQWdDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDekQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsMEJBQTBCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLElBQUksSUFBSSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDckcsT0FBTyxLQUFLLENBQUMsU0FBUyxHQUFHLGFBQWEs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
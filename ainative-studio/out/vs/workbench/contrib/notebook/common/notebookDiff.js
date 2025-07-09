/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// interface INotebookDiffResult {
// 	cellsDiff: IDiffResult;
// 	metadataChanged: boolean;
// }
export function computeDiff(originalModel, modifiedModel, diffResult) {
    const cellChanges = diffResult.cellsDiff.changes;
    const cellDiffInfo = [];
    let originalCellIndex = 0;
    let modifiedCellIndex = 0;
    let firstChangeIndex = -1;
    for (let i = 0; i < cellChanges.length; i++) {
        const change = cellChanges[i];
        // common cells
        for (let j = 0; j < change.originalStart - originalCellIndex; j++) {
            const originalCell = originalModel.cells[originalCellIndex + j];
            const modifiedCell = modifiedModel.cells[modifiedCellIndex + j];
            if (originalCell.getHashValue() === modifiedCell.getHashValue()) {
                cellDiffInfo.push({
                    originalCellIndex: originalCellIndex + j,
                    modifiedCellIndex: modifiedCellIndex + j,
                    type: 'unchanged'
                });
            }
            else {
                if (firstChangeIndex === -1) {
                    firstChangeIndex = cellDiffInfo.length;
                }
                cellDiffInfo.push({
                    originalCellIndex: originalCellIndex + j,
                    modifiedCellIndex: modifiedCellIndex + j,
                    type: 'modified'
                });
            }
        }
        const modifiedLCS = computeModifiedLCS(change, originalModel, modifiedModel);
        if (modifiedLCS.length && firstChangeIndex === -1) {
            firstChangeIndex = cellDiffInfo.length;
        }
        cellDiffInfo.push(...modifiedLCS);
        originalCellIndex = change.originalStart + change.originalLength;
        modifiedCellIndex = change.modifiedStart + change.modifiedLength;
    }
    for (let i = originalCellIndex; i < originalModel.cells.length; i++) {
        cellDiffInfo.push({
            originalCellIndex: i,
            modifiedCellIndex: i - originalCellIndex + modifiedCellIndex,
            type: 'unchanged'
        });
    }
    return {
        cellDiffInfo,
        firstChangeIndex
    };
}
function computeModifiedLCS(change, originalModel, modifiedModel) {
    const result = [];
    // modified cells
    const modifiedLen = Math.min(change.originalLength, change.modifiedLength);
    for (let j = 0; j < modifiedLen; j++) {
        const originalCell = originalModel.cells[change.originalStart + j];
        const modifiedCell = modifiedModel.cells[change.modifiedStart + j];
        if (originalCell.cellKind !== modifiedCell.cellKind) {
            result.push({
                originalCellIndex: change.originalStart + j,
                type: 'delete'
            });
            result.push({
                modifiedCellIndex: change.modifiedStart + j,
                type: 'insert'
            });
        }
        else {
            const isTheSame = originalCell.equal(modifiedCell);
            result.push({
                originalCellIndex: change.originalStart + j,
                modifiedCellIndex: change.modifiedStart + j,
                type: isTheSame ? 'unchanged' : 'modified'
            });
        }
    }
    for (let j = modifiedLen; j < change.originalLength; j++) {
        // deletion
        result.push({
            originalCellIndex: change.originalStart + j,
            type: 'delete'
        });
    }
    for (let j = modifiedLen; j < change.modifiedLength; j++) {
        result.push({
            modifiedCellIndex: change.modifiedStart + j,
            type: 'insert'
        });
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUF3QmhHLGtDQUFrQztBQUNsQywyQkFBMkI7QUFDM0IsNkJBQTZCO0FBQzdCLElBQUk7QUFFSixNQUFNLFVBQVUsV0FBVyxDQUFDLGFBQW1ELEVBQUUsYUFBbUQsRUFBRSxVQUErQjtJQUNwSyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztJQUNqRCxNQUFNLFlBQVksR0FBbUIsRUFBRSxDQUFDO0lBQ3hDLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3QyxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsZUFBZTtRQUVmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsYUFBYSxHQUFHLGlCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkUsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNoRSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQUks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
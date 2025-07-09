/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SingleCursorState } from '../cursorCommon.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
export class ColumnSelection {
    static columnSelect(config, model, fromLineNumber, fromVisibleColumn, toLineNumber, toVisibleColumn) {
        const lineCount = Math.abs(toLineNumber - fromLineNumber) + 1;
        const reversed = (fromLineNumber > toLineNumber);
        const isRTL = (fromVisibleColumn > toVisibleColumn);
        const isLTR = (fromVisibleColumn < toVisibleColumn);
        const result = [];
        // console.log(`fromVisibleColumn: ${fromVisibleColumn}, toVisibleColumn: ${toVisibleColumn}`);
        for (let i = 0; i < lineCount; i++) {
            const lineNumber = fromLineNumber + (reversed ? -i : i);
            const startColumn = config.columnFromVisibleColumn(model, lineNumber, fromVisibleColumn);
            const endColumn = config.columnFromVisibleColumn(model, lineNumber, toVisibleColumn);
            const visibleStartColumn = config.visibleColumnFromColumn(model, new Position(lineNumber, startColumn));
            const visibleEndColumn = config.visibleColumnFromColumn(model, new Position(lineNumber, endColumn));
            // console.log(`lineNumber: ${lineNumber}: visibleStartColumn: ${visibleStartColumn}, visibleEndColumn: ${visibleEndColumn}`);
            if (isLTR) {
                if (visibleStartColumn > toVisibleColumn) {
                    continue;
                }
                if (visibleEndColumn < fromVisibleColumn) {
                    continue;
                }
            }
            if (isRTL) {
                if (visibleEndColumn > fromVisibleColumn) {
                    continue;
                }
                if (visibleStartColumn < toVisibleColumn) {
                    continue;
                }
            }
            result.push(new SingleCursorState(new Range(lineNumber, startColumn, lineNumber, startColumn), 0 /* SelectionStartKind.Simple */, 0, new Position(lineNumber, endColumn), 0));
        }
        if (result.length === 0) {
            // We are after all the lines, so add cursor at the end of each line
            for (let i = 0; i < lineCount; i++) {
                const lineNumber = fromLineNumber + (reversed ? -i : i);
                const maxColumn = model.getLineMaxColumn(lineNumber);
                result.push(new SingleCursorState(new Range(lineNumber, maxColumn, lineNumber, maxColumn), 0 /* SelectionStartKind.Simple */, 0, new Position(lineNumber, maxColumn), 0));
            }
        }
        return {
            viewStates: result,
            reversed: reversed,
            fromLineNumber: fromLineNumber,
            fromVisualColumn: fromVisibleColumn,
            toLineNumber: toLineNumber,
            toVisualColumn: toVisibleColumn
        };
    }
    static columnSelectLeft(config, model, prevColumnSelectData) {
        let toViewVisualColumn = prevColumnSelectData.toViewVisualColumn;
        if (toViewVisualColumn > 0) {
            toViewVisualColumn--;
        }
        return ColumnSelection.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, prevColumnSelectData.toViewLineNumber, toViewVisualColumn);
    }
    static columnSelectRight(config, model, prevColumnSelectData) {
        let maxVisualViewColumn = 0;
        const minViewLineNumber = Math.min(prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.toViewLineNumber);
        const maxViewLineNumber = Math.max(prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.toViewLineNumber);
        for (let lineNumber = minViewLineNumber; lineNumber <= maxViewLineNumber; lineNumber++) {
            const lineMaxViewColumn = model.getLineMaxColumn(lineNumber);
            const lineMaxVisualViewColumn = config.visibleColumnFromColumn(model, new Position(lineNumber, lineMaxViewColumn));
            maxVisualViewColumn = Math.max(maxVisualViewColumn, lineMaxVisualViewColumn);
        }
        let toViewVisualColumn = prevColumnSelectData.toViewVisualColumn;
        if (toViewVisualColumn < maxVisualViewColumn) {
            toViewVisualColumn++;
        }
        return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, prevColumnSelectData.toViewLineNumber, toViewVisualColumn);
    }
    static columnSelectUp(config, model, prevColumnSelectData, isPaged) {
        const linesCount = isPaged ? config.pageSize : 1;
        const toViewLineNumber = Math.max(1, prevColumnSelectData.toViewLineNumber - linesCount);
        return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, toViewLineNumber, prevColumnSelectData.toViewVisualColumn);
    }
    static columnSelectDown(config, model, prevColumnSelectData, isPaged) {
        const linesCount = isPaged ? config.pageSize : 1;
        const toViewLineNumber = Math.min(model.getLineCount(), prevColumnSelectData.toViewLineNumber + linesCount);
        return this.columnSelect(config, model, prevColumnSelectData.fromViewLineNumber, prevColumnSelectData.fromViewVisualColumn, toViewLineNumber, prevColumnSelectData.toViewVisualColumn);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29sdW1uU2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvckNvbHVtblNlbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQTJDLGlCQUFpQixFQUF5QyxNQUFNLG9CQUFvQixDQUFDO0FBQ3ZJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFekMsTUFBTSxPQUFPLGVBQWU7SUFFcEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUEyQixFQUFFLEtBQXlCLEVBQUUsY0FBc0IsRUFBRSxpQkFBeUIsRUFBRSxZQUFvQixFQUFFLGVBQXVCO1FBQ2xMLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5RCxNQUFNLFFBQVEsR0FBRyxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUNqRCxNQUFNLEtBQUssR0FBRyxDQUFDLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sS0FBSyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsZUFBZSxDQUFDLENBQUM7UUFFcEQsTUFBTSxNQUFNLEdBQXdCLEVBQUUsQ0FBQztRQUV2QywrRkFBK0Y7UUFFL0YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLGNBQWMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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
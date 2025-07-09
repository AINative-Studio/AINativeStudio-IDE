/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CursorColumns } from '../core/cursorColumns.js';
export var Direction;
(function (Direction) {
    Direction[Direction["Left"] = 0] = "Left";
    Direction[Direction["Right"] = 1] = "Right";
    Direction[Direction["Nearest"] = 2] = "Nearest";
})(Direction || (Direction = {}));
export class AtomicTabMoveOperations {
    /**
     * Get the visible column at the position. If we get to a non-whitespace character first
     * or past the end of string then return -1.
     *
     * **Note** `position` and the return value are 0-based.
     */
    static whitespaceVisibleColumn(lineContent, position, tabSize) {
        const lineLength = lineContent.length;
        let visibleColumn = 0;
        let prevTabStopPosition = -1;
        let prevTabStopVisibleColumn = -1;
        for (let i = 0; i < lineLength; i++) {
            if (i === position) {
                return [prevTabStopPosition, prevTabStopVisibleColumn, visibleColumn];
            }
            if (visibleColumn % tabSize === 0) {
                prevTabStopPosition = i;
                prevTabStopVisibleColumn = visibleColumn;
            }
            const chCode = lineContent.charCodeAt(i);
            switch (chCode) {
                case 32 /* CharCode.Space */:
                    visibleColumn += 1;
                    break;
                case 9 /* CharCode.Tab */:
                    // Skip to the next multiple of tabSize.
                    visibleColumn = CursorColumns.nextRenderTabStop(visibleColumn, tabSize);
                    break;
                default:
                    return [-1, -1, -1];
            }
        }
        if (position === lineLength) {
            return [prevTabStopPosition, prevTabStopVisibleColumn, visibleColumn];
        }
        return [-1, -1, -1];
    }
    /**
     * Return the position that should result from a move left, right or to the
     * nearest tab, if atomic tabs are enabled. Left and right are used for the
     * arrow key movements, nearest is used for mouse selection. It returns
     * -1 if atomic tabs are not relevant and you should fall back to normal
     * behaviour.
     *
     * **Note**: `position` and the return value are 0-based.
     */
    static atomicPosition(lineContent, position, tabSize, direction) {
        const lineLength = lineContent.length;
        // Get the 0-based visible column corresponding to the position, or return
        // -1 if it is not in the initial whitespace.
        const [prevTabStopPosition, prevTabStopVisibleColumn, visibleColumn] = AtomicTabMoveOperations.whitespaceVisibleColumn(lineContent, position, tabSize);
        if (visibleColumn === -1) {
            return -1;
        }
        // Is the output left or right of the current position. The case for nearest
        // where it is the same as the current position is handled in the switch.
        let left;
        switch (direction) {
            case 0 /* Direction.Left */:
                left = true;
                break;
            case 1 /* Direction.Right */:
                left = false;
                break;
            case 2 /* Direction.Nearest */:
                // The code below assumes the output position is either left or right
                // of the input position. If it is the same, return immediately.
                if (visibleColumn % tabSize === 0) {
                    return position;
                }
                // Go to the nearest indentation.
                left = visibleColumn % tabSize <= (tabSize / 2);
                break;
        }
        // If going left, we can just use the info about the last tab stop position and
        // last tab stop visible column that we computed in the first walk over the whitespace.
        if (left) {
            if (prevTabStopPosition === -1) {
                return -1;
            }
            // If the direction is left, we need to keep scanning right to ensure
            // that targetVisibleColumn + tabSize is before non-whitespace.
            // This is so that when we press left at the end of a partial
            // indentation it only goes one character. For example '      foo' with
            // tabSize 4, should jump from position 6 to position 5, not 4.
            let currentVisibleColumn = prevTabStopVisibleColumn;
            for (let i = prevTabStopPosition; i < lineLength; ++i) {
                if (currentVisibleColumn === prevTabStopVisibleColumn + tabSize) {
                    // It is a full indentation.
                    return prevTabStopPosition;
                }
                const chCode = lineContent.charCodeAt(i);
                switch (chCode) {
                    case 32 /* CharCode.Space */:
                        currentVisibleColumn += 1;
                        break;
                    case 9 /* CharCode.Tab */:
                        currentVisibleColumn = CursorColumns.nextRenderTabStop(currentVisibleColumn, tabSize);
                        break;
                    default:
                        return -1;
                }
            }
            if (currentVisibleColumn === prevTabStopVisibleColumn + tabSize) {
                return prevTabStopPosition;
            }
            // It must have been a partial indentation.
            return -1;
        }
        // We are going right.
        const targetVisibleColumn = CursorColumns.nextRenderTabStop(visibleColumn, tabSize);
        // We can just continue from where whitespaceVisibleColumn got to.
        let currentVisibleColumn = visibleColumn;
        for (let i = position; i < lineLength; i++) {
            if (currentVisibleColumn === targetVisibleColumn) {
                return i;
            }
            const chCode = lineContent.charCodeAt(i);
            switch (chCode) {
                case 32 /* CharCode.Space */:
                    currentVisibleColumn += 1;
                    break;
                case 9 /* CharCode.Tab */:
                    currentVisibleColumn = CursorColumns.nextRenderTabStop(currentVisibleColumn, tabSize);
                    break;
                default:
                    return -1;
            }
        }
        // This condition handles when the target column is at the end of the line.
        if (currentVisibleColumn === targetVisibleColumn) {
            return lineLength;
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQXRvbWljTW92ZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yQXRvbWljTW92ZU9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXpELE1BQU0sQ0FBTixJQUFrQixTQUlqQjtBQUpELFdBQWtCLFNBQVM7SUFDMUIseUNBQUksQ0FBQTtJQUNKLDJDQUFLLENBQUE7SUFDTCwrQ0FBTyxDQUFBO0FBQ1IsQ0FBQyxFQUppQixTQUFTLEtBQVQsU0FBUyxRQUkxQjtBQUVELE1BQU0sT0FBTyx1QkFBdUI7SUFDbkM7Ozs7O09BS0c7SUFDSSxNQUFNLENBQUMsdUJBQXVCLENBQUMsV0FBbUIsRUFBRSxRQUFnQixFQUFFLE9BQWU7UUFDM0YsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztRQUN0QyxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3QixJQUFJLHdCQUF3QixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7WUFDRCxJQUFJLGFBQWEsR0FBRyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLG1CQUFtQixHQUFHLENBQUMsQ0FBQztnQkFDeEIsd0JBQXdCLEdBQUcsYUFBYSxDQUFDO1lBQzFDLENBQUM7WUFDRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLFFBQVEsTUFBTSxFQUFFLENBQUM7Z0JBQ2hCO29CQUNDLGFBQWEsSUFBSSxDQUFDLENBQUM7b0JBQ25CLE1BQU07Z0JBQ1A7b0JBQ0Msd0NBQXdDO29CQUN4QyxhQUFhLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDeEUsTUFBTTtnQkFDUDtvQkFDQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksUUFBUSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0ksTUFBTSxDQUFDLGNBQWMsQ0FBQyxXQUFtQixFQUFFLFFBQWdCLEVBQUUsT0FBZSxFQUFFLFNBQW9CO1FBQ3hHLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7UUFFdEMsMEVBQTBFO1FBQzFFLDZDQUE2QztRQUM3QyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsYUFBYSxDQUFDLEdBQUcsdUJBQXVCLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV2SixJQUFJLGFBQWEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBRUQsNEVBQTRFO1FBQzVFLHlFQUF5RTtRQUN6RSxJQUFJLElBQWEsQ0FBQztRQUNsQixRQUFRLFNBQVMsRUFBRSxDQUFDO1lBQ25CO2dCQUNDLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ1osTUFBTTtZQUNQO2dCQUNDLElBQUksR0FBRyxLQUFLLENBQUM7Z0JBQ2IsTUFBTTtZQUNQO2dCQUNDLHFFQUFxRTtnQkFDckUsZ0VBQWdFO2dCQUNoRSxJQUFJLGFBQWEsR0FBRyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25DLE9BQU8sUUFBUSxDQUFDO2dCQUNqQixDQUFDO2dCQUNELGlDQUFpQztnQkFDakMsSUFBSSxHQUFHLGFBQWEsR0FBRyxPQUFPLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hELE1BQU07UUFDUixDQUFDO1FBRUQsK0VBQStFO1FBQy9FLHVGQUF1RjtRQUN2RixJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxtQkFBbUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQztZQUNELHFFQUFxRTtZQUNyRSwrREFBK0Q7WUFDL0QsNkRBQTZEO1lBQzdELHVFQUF1RTtZQUN2RSwrREFBK0Q7WUFDL0QsSUFBSSxvQkFBb0IsR0FBRyx3QkFBd0IsQ0FBQztZQUNwRCxLQUFLLElBQUksQ0FBQyxHQUFHLG1CQUFtQixFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDdkQsSUFBSSxvQkFBb0IsS0FBSyx3QkFBd0IsR0FBRyxPQUFPLEVBQUUsQ0FBQztvQkFDakUsNEJBQTRCO29CQUM1QixPQUFPLG1CQUFtQixDQUFDO2dCQUM1QixDQUFDO2dCQUVELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pDLFFBQVEsTUFBTSxFQUFFLENBQUM7b0JBQ2hCO3dCQUNDLG9CQUFvQixJQUFJLENBQUMsQ0FBQzt3QkFDMUIsTUFBTTtvQkFDUDt3QkFDQyxvQkFBb0IsR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUM7d0JBQ3RGLE1BQU07b0JBQ1A7d0JBQ0MsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDWixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksb0JBQW9CLEtBQUssd0JBQXdCLEdBQUcsT0FBTyxFQUFFLENBQUM7Z0JBQ2pFLE9BQU8sbUJBQW1CLENBQUM7WUFDNUIsQ0FBQztZQUNELDJDQUEyQztZQUMzQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUVELHNCQUFzQjtRQUN0QixNQUFNLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEYsa0VBQWtFO1FBQ2xFLElBQUksb0JBQW9CLEdBQUcsYUFBYSxDQUFDO1FBQ3pDLEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxJQUFJLG9CQUFvQixLQUFLLG1CQUFtQixFQUFFLENBQUM7Z0JBQ2xELE9BQU8sQ0FBQyxDQUFDO1lBQ1YsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekMsUUFBUSxNQUFNLEVBQUUsQ0FBQztnQkFDaEI7b0JBQ0Msb0JBQW9CLElBQUksQ0FBQyxDQUFDO29CQUMxQixNQUFNO2dCQUNQO29CQUNDLG9CQUFvQixHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDdEYsTUFBTTtnQkFDUDtvQkFDQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFDRCwyRUFBMkU7UUFDM0UsSUFBSSxvQkFBb0IsS0FBSyxtQkFBbUIsRUFBRSxDQUFDO1lBQ2xELE9BQU8sVUFBVSxDQUFDO1FBQ25CLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNEIn0=
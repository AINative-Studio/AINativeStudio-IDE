/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray } from '../../../../base/common/arrays.js';
import { isEmptyMarkdownString } from '../../../../base/common/htmlContent.js';
import { GlyphMarginLane } from '../../../common/model.js';
export class GlyphHoverComputer {
    constructor(_editor) {
        this._editor = _editor;
    }
    computeSync(opts) {
        const toHoverMessage = (contents) => {
            return {
                value: contents
            };
        };
        const lineDecorations = this._editor.getLineDecorations(opts.lineNumber);
        const result = [];
        const isLineHover = opts.laneOrLine === 'lineNo';
        if (!lineDecorations) {
            return result;
        }
        for (const d of lineDecorations) {
            const lane = d.options.glyphMargin?.position ?? GlyphMarginLane.Center;
            if (!isLineHover && lane !== opts.laneOrLine) {
                continue;
            }
            const hoverMessage = isLineHover ? d.options.lineNumberHoverMessage : d.options.glyphMarginHoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            result.push(...asArray(hoverMessage).map(toHoverMessage));
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhIb3ZlckNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvZ2x5cGhIb3ZlckNvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBYTNELE1BQU0sT0FBTyxrQkFBa0I7SUFFOUIsWUFDa0IsT0FBb0I7UUFBcEIsWUFBTyxHQUFQLE9BQU8sQ0FBYTtJQUV0QyxDQUFDO0lBRU0sV0FBVyxDQUFDLElBQStCO1FBRWpELE1BQU0sY0FBYyxHQUFHLENBQUMsUUFBeUIsRUFBaUIsRUFBRTtZQUNuRSxPQUFPO2dCQUNOLEtBQUssRUFBRSxRQUFRO2FBQ2YsQ0FBQztRQUNILENBQUMsQ0FBQztRQUVGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sTUFBTSxHQUFvQixFQUFFLENBQUM7UUFDbkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUM7UUFDakQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQztRQUVELEtBQUssTUFBTSxDQUFDLElBQUksZUFBZSxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsUUFBUSxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUM7WUFDdkUsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM5QyxTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztZQUN4RyxJQUFJLENBQUMsWUFBWSxJQUFJLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7Z0JBQzFELFNBQVM7WUFDVixDQUFDO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0NBQ0QifQ==
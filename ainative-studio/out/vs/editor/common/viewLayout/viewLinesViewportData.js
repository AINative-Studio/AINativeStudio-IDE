/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
/**
 * Contains all data needed to render at a specific viewport.
 */
export class ViewportData {
    constructor(selections, partialData, whitespaceViewportData, model) {
        this.selections = selections;
        this.startLineNumber = partialData.startLineNumber | 0;
        this.endLineNumber = partialData.endLineNumber | 0;
        this.relativeVerticalOffset = partialData.relativeVerticalOffset;
        this.bigNumbersDelta = partialData.bigNumbersDelta | 0;
        this.lineHeight = partialData.lineHeight | 0;
        this.whitespaceViewportData = whitespaceViewportData;
        this._model = model;
        this.visibleRange = new Range(partialData.startLineNumber, this._model.getLineMinColumn(partialData.startLineNumber), partialData.endLineNumber, this._model.getLineMaxColumn(partialData.endLineNumber));
    }
    getViewLineRenderingData(lineNumber) {
        return this._model.getViewportViewLineRenderingData(this.visibleRange, lineNumber);
    }
    getDecorationsInViewport() {
        return this._model.getDecorationsInViewport(this.visibleRange);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVzVmlld3BvcnREYXRhLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0xheW91dC92aWV3TGluZXNWaWV3cG9ydERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSXpDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFzQ3hCLFlBQ0MsVUFBdUIsRUFDdkIsV0FBMEMsRUFDMUMsc0JBQXFELEVBQ3JELEtBQWlCO1FBRWpCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxlQUFlLEdBQUcsV0FBVyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLGFBQWEsR0FBRyxXQUFXLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsV0FBVyxDQUFDLHNCQUFzQixDQUFDO1FBQ2pFLElBQUksQ0FBQyxlQUFlLEdBQUcsV0FBVyxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsc0JBQXNCLENBQUM7UUFFckQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFcEIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEtBQUssQ0FDNUIsV0FBVyxDQUFDLGVBQWUsRUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEVBQ3pELFdBQVcsQ0FBQyxhQUFhLEVBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUN2RCxDQUFDO0lBQ0gsQ0FBQztJQUVNLHdCQUF3QixDQUFDLFVBQWtCO1FBQ2pELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFTSx3QkFBd0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNoRSxDQUFDO0NBQ0QifQ==
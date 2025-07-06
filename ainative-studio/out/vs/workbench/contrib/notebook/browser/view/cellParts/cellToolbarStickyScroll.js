/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { combinedDisposable } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
export function registerCellToolbarStickyScroll(notebookEditor, cell, element, opts) {
    const extraOffset = opts?.extraOffset ?? 0;
    const min = opts?.min ?? 0;
    const updateForScroll = () => {
        if (cell.isInputCollapsed) {
            element.style.top = '';
        }
        else {
            const scrollTop = notebookEditor.scrollTop;
            const elementTop = notebookEditor.getAbsoluteTopOfElement(cell);
            const diff = scrollTop - elementTop + extraOffset;
            const maxTop = cell.layoutInfo.editorHeight + cell.layoutInfo.statusBarHeight - 45; // subtract roughly the height of the execution order label plus padding
            const top = maxTop > 20 ? // Don't move the run button if it can only move a very short distance
                clamp(min, diff, maxTop) :
                min;
            element.style.top = `${top}px`;
        }
    };
    updateForScroll();
    const disposables = [];
    disposables.push(notebookEditor.onDidScroll(() => updateForScroll()), notebookEditor.onDidChangeLayout(() => updateForScroll()));
    return combinedDisposable(...disposables);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFRvb2xiYXJTdGlja3lTY3JvbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbFRvb2xiYXJTdGlja3lTY3JvbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFlLE1BQU0sNENBQTRDLENBQUM7QUFDN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR2pFLE1BQU0sVUFBVSwrQkFBK0IsQ0FBQyxjQUErQixFQUFFLElBQW9CLEVBQUUsT0FBb0IsRUFBRSxJQUE2QztJQUN6SyxNQUFNLFdBQVcsR0FBRyxJQUFJLEVBQUUsV0FBVyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUUzQixNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUU7UUFDNUIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDeEIsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO1lBQzNDLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoRSxNQUFNLElBQUksR0FBRyxTQUFTLEdBQUcsVUFBVSxHQUFHLFdBQVcsQ0FBQztZQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQyx3RUFBd0U7WUFDNUosTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsc0VBQXNFO2dCQUMvRixLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixHQUFHLENBQUM7WUFDTCxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDLENBQUM7SUFFRixlQUFlLEVBQUUsQ0FBQztJQUNsQixNQUFNLFdBQVcsR0FBa0IsRUFBRSxDQUFDO0lBQ3RDLFdBQVcsQ0FBQyxJQUFJLENBQ2YsY0FBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUNuRCxjQUFjLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FDekQsQ0FBQztJQUVGLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQztBQUMzQyxDQUFDIn0=
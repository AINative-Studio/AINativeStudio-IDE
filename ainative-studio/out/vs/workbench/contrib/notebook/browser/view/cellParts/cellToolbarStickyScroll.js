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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFRvb2xiYXJTdGlja3lTY3JvbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsVG9vbGJhclN0aWNreVNjcm9sbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHakUsTUFBTSxVQUFVLCtCQUErQixDQUFDLGNBQStCLEVBQUUsSUFBb0IsRUFBRSxPQUFvQixFQUFFLElBQTZDO0lBQ3pLLE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sR0FBRyxHQUFHLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBRTNCLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtRQUM1QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUN4QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7WUFDM0MsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sSUFBSSxHQUFHLFNBQVMsR0FBRyxVQUFVLEdBQUcsV0FBVyxDQUFDO1lBQ2xELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHdFQUF3RTtZQUM1SixNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxzRUFBc0U7Z0JBQy9GLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLEdBQUcsQ0FBQztZQUNMLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7UUFDaEMsQ0FBQztJQUNGLENBQUMsQ0FBQztJQUVGLGVBQWUsRUFBRSxDQUFDO0lBQ2xCLE1BQU0sV0FBVyxHQUFrQixFQUFFLENBQUM7SUFDdEMsV0FBVyxDQUFDLElBQUksQ0FDZixjQUFjLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQ25ELGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUN6RCxDQUFDO0lBRUYsT0FBTyxrQkFBa0IsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDO0FBQzNDLENBQUMifQ==
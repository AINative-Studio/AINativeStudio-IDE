/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../dom.js';
import './dnd.css';
export function applyDragImage(event, container, label, extraClasses = []) {
    if (!event.dataTransfer) {
        return;
    }
    const dragImage = $('.monaco-drag-image');
    dragImage.textContent = label;
    dragImage.classList.add(...extraClasses);
    const getDragImageContainer = (e) => {
        while (e && !e.classList.contains('monaco-workbench')) {
            e = e.parentElement;
        }
        return e || container.ownerDocument.body;
    };
    const dragContainer = getDragImageContainer(container);
    dragContainer.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, -10, -10);
    // Removes the element when the DND operation is done
    setTimeout(() => dragImage.remove(), 0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9kbmQvZG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDakMsT0FBTyxXQUFXLENBQUM7QUFFbkIsTUFBTSxVQUFVLGNBQWMsQ0FBQyxLQUFnQixFQUFFLFNBQXNCLEVBQUUsS0FBYSxFQUFFLGVBQXlCLEVBQUU7SUFDbEgsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN6QixPQUFPO0lBQ1IsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0lBQzlCLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFFekMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQXFCLEVBQUUsRUFBRTtRQUN2RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUN2RCxDQUFDLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQztRQUNyQixDQUFDO1FBQ0QsT0FBTyxDQUFDLElBQUksU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7SUFDMUMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxhQUFhLEdBQUcscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkQsYUFBYSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyQyxLQUFLLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVyRCxxREFBcUQ7SUFDckQsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN6QyxDQUFDIn0=
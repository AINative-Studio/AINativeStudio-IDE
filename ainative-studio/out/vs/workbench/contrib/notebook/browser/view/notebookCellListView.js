/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ListView } from '../../../../../base/browser/ui/list/listView.js';
import { ConstantTimePrefixSumComputer } from '../../../../../editor/common/model/prefixSumComputer.js';
export class NotebookCellsLayout {
    get paddingTop() {
        return this._paddingTop;
    }
    set paddingTop(paddingTop) {
        this._size = this._size + paddingTop - this._paddingTop;
        this._paddingTop = paddingTop;
    }
    get count() {
        return this._items.length;
    }
    /**
     * Returns the sum of the sizes of all items in the range map.
     */
    get size() {
        return this._size;
    }
    constructor(topPadding) {
        this._items = [];
        this._whitespace = [];
        this._prefixSumComputer = new ConstantTimePrefixSumComputer([]);
        this._size = 0;
        this._paddingTop = 0;
        this._paddingTop = topPadding ?? 0;
        this._size = this._paddingTop;
    }
    getWhitespaces() {
        return this._whitespace;
    }
    restoreWhitespace(items) {
        this._whitespace = items;
        this._size = this._paddingTop + this._items.reduce((total, item) => total + item.size, 0) + this._whitespace.reduce((total, ws) => total + ws.size, 0);
    }
    /**
     */
    splice(index, deleteCount, items) {
        const inserts = items ?? [];
        // Perform the splice operation on the items array.
        this._items.splice(index, deleteCount, ...inserts);
        this._size = this._paddingTop + this._items.reduce((total, item) => total + item.size, 0) + this._whitespace.reduce((total, ws) => total + ws.size, 0);
        this._prefixSumComputer.removeValues(index, deleteCount);
        // inserts should also include whitespaces
        const newSizes = [];
        for (let i = 0; i < inserts.length; i++) {
            const insertIndex = i + index;
            const existingWhitespaces = this._whitespace.filter(ws => ws.afterPosition === insertIndex + 1);
            if (existingWhitespaces.length > 0) {
                newSizes.push(inserts[i].size + existingWhitespaces.reduce((acc, ws) => acc + ws.size, 0));
            }
            else {
                newSizes.push(inserts[i].size);
            }
        }
        this._prefixSumComputer.insertValues(index, newSizes);
        // Now that the items array has been updated, and the whitespaces are updated elsewhere, if an item is removed/inserted, the accumlated size of the items are all updated.
        // Loop through all items from the index where the splice started, to the end
        for (let i = index; i < this._items.length; i++) {
            const existingWhitespaces = this._whitespace.filter(ws => ws.afterPosition === i + 1);
            if (existingWhitespaces.length > 0) {
                this._prefixSumComputer.setValue(i, this._items[i].size + existingWhitespaces.reduce((acc, ws) => acc + ws.size, 0));
            }
            else {
                this._prefixSumComputer.setValue(i, this._items[i].size);
            }
        }
    }
    insertWhitespace(id, afterPosition, size) {
        let priority = 0;
        const existingWhitespaces = this._whitespace.filter(ws => ws.afterPosition === afterPosition);
        if (existingWhitespaces.length > 0) {
            priority = Math.max(...existingWhitespaces.map(ws => ws.priority)) + 1;
        }
        this._whitespace.push({ id, afterPosition: afterPosition, size, priority });
        this._size += size; // Update the total size to include the whitespace
        this._whitespace.sort((a, b) => {
            if (a.afterPosition === b.afterPosition) {
                return a.priority - b.priority;
            }
            return a.afterPosition - b.afterPosition;
        });
        // find item size of index
        if (afterPosition > 0) {
            const index = afterPosition - 1;
            const itemSize = this._items[index].size;
            const accSize = itemSize + size;
            this._prefixSumComputer.setValue(index, accSize);
        }
    }
    changeOneWhitespace(id, afterPosition, size) {
        const whitespaceIndex = this._whitespace.findIndex(ws => ws.id === id);
        if (whitespaceIndex !== -1) {
            const whitespace = this._whitespace[whitespaceIndex];
            const oldAfterPosition = whitespace.afterPosition;
            whitespace.afterPosition = afterPosition;
            const oldSize = whitespace.size;
            const delta = size - oldSize;
            whitespace.size = size;
            this._size += delta;
            if (oldAfterPosition > 0 && oldAfterPosition <= this._items.length) {
                const index = oldAfterPosition - 1;
                const itemSize = this._items[index].size;
                const accSize = itemSize;
                this._prefixSumComputer.setValue(index, accSize);
            }
            if (afterPosition > 0 && afterPosition <= this._items.length) {
                const index = afterPosition - 1;
                const itemSize = this._items[index].size;
                const accSize = itemSize + size;
                this._prefixSumComputer.setValue(index, accSize);
            }
        }
    }
    removeWhitespace(id) {
        const whitespaceIndex = this._whitespace.findIndex(ws => ws.id === id);
        if (whitespaceIndex !== -1) {
            const whitespace = this._whitespace[whitespaceIndex];
            this._whitespace.splice(whitespaceIndex, 1);
            this._size -= whitespace.size; // Reduce the total size by the size of the removed whitespace
            if (whitespace.afterPosition > 0) {
                const index = whitespace.afterPosition - 1;
                const itemSize = this._items[index].size;
                const remainingWhitespaces = this._whitespace.filter(ws => ws.afterPosition === whitespace.afterPosition);
                const accSize = itemSize + remainingWhitespaces.reduce((acc, ws) => acc + ws.size, 0);
                this._prefixSumComputer.setValue(index, accSize);
            }
        }
    }
    /**
     * find position of whitespace
     * @param id: id of the whitespace
     * @returns: position in the list view
     */
    getWhitespacePosition(id) {
        const whitespace = this._whitespace.find(ws => ws.id === id);
        if (!whitespace) {
            throw new Error('Whitespace not found');
        }
        const afterPosition = whitespace.afterPosition;
        if (afterPosition === 0) {
            // find all whitespaces at the same position but with higher priority (smaller number)
            const whitespaces = this._whitespace.filter(ws => ws.afterPosition === afterPosition && ws.priority < whitespace.priority);
            return whitespaces.reduce((acc, ws) => acc + ws.size, 0) + this.paddingTop;
        }
        const whitespaceBeforeFirstItem = this._whitespace.filter(ws => ws.afterPosition === 0).reduce((acc, ws) => acc + ws.size, 0);
        // previous item index
        const index = afterPosition - 1;
        const previousItemPosition = this._prefixSumComputer.getPrefixSum(index);
        const previousItemSize = this._items[index].size;
        return previousItemPosition + previousItemSize + whitespaceBeforeFirstItem + this.paddingTop;
    }
    indexAt(position) {
        if (position < 0) {
            return -1;
        }
        const whitespaceBeforeFirstItem = this._whitespace.filter(ws => ws.afterPosition === 0).reduce((acc, ws) => acc + ws.size, 0);
        const offset = position - (this._paddingTop + whitespaceBeforeFirstItem);
        if (offset <= 0) {
            return 0;
        }
        if (offset >= (this._size - this._paddingTop - whitespaceBeforeFirstItem)) {
            return this.count;
        }
        return this._prefixSumComputer.getIndexOf(Math.trunc(offset)).index;
    }
    indexAfter(position) {
        const index = this.indexAt(position);
        return Math.min(index + 1, this._items.length);
    }
    positionAt(index) {
        if (index < 0) {
            return -1;
        }
        if (this.count === 0) {
            return -1;
        }
        // index is zero based, if index+1 > this.count, then it points to the fictitious element after the last element of this array.
        if (index >= this.count) {
            return -1;
        }
        const whitespaceBeforeFirstItem = this._whitespace.filter(ws => ws.afterPosition === 0).reduce((acc, ws) => acc + ws.size, 0);
        return this._prefixSumComputer.getPrefixSum(index /** count */) + this._paddingTop + whitespaceBeforeFirstItem;
    }
}
export class NotebookCellListView extends ListView {
    constructor() {
        super(...arguments);
        this._lastWhitespaceId = 0;
        this._renderingStack = 0;
    }
    get inRenderingTransaction() {
        return this._renderingStack > 0;
    }
    get notebookRangeMap() {
        return this.rangeMap;
    }
    render(previousRenderRange, renderTop, renderHeight, renderLeft, scrollWidth, updateItemsInDOM) {
        this._renderingStack++;
        super.render(previousRenderRange, renderTop, renderHeight, renderLeft, scrollWidth, updateItemsInDOM);
        this._renderingStack--;
    }
    _rerender(renderTop, renderHeight, inSmoothScrolling) {
        this._renderingStack++;
        super._rerender(renderTop, renderHeight, inSmoothScrolling);
        this._renderingStack--;
    }
    createRangeMap(paddingTop) {
        const existingMap = this.rangeMap;
        if (existingMap) {
            const layout = new NotebookCellsLayout(paddingTop);
            layout.restoreWhitespace(existingMap.getWhitespaces());
            return layout;
        }
        else {
            return new NotebookCellsLayout(paddingTop);
        }
    }
    insertWhitespace(afterPosition, size) {
        const scrollTop = this.scrollTop;
        const id = `${++this._lastWhitespaceId}`;
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const elementPosition = this.elementTop(afterPosition);
        const aboveScrollTop = scrollTop > elementPosition;
        this.notebookRangeMap.insertWhitespace(id, afterPosition, size);
        const newScrolltop = aboveScrollTop ? scrollTop + size : scrollTop;
        this.render(previousRenderRange, newScrolltop, this.lastRenderHeight, undefined, undefined, false);
        this._rerender(newScrolltop, this.renderHeight, false);
        this.eventuallyUpdateScrollDimensions();
        return id;
    }
    changeOneWhitespace(id, newAfterPosition, newSize) {
        const scrollTop = this.scrollTop;
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const currentPosition = this.notebookRangeMap.getWhitespacePosition(id);
        if (currentPosition > scrollTop) {
            this.notebookRangeMap.changeOneWhitespace(id, newAfterPosition, newSize);
            this.render(previousRenderRange, scrollTop, this.lastRenderHeight, undefined, undefined, false);
            this._rerender(scrollTop, this.renderHeight, false);
            this.eventuallyUpdateScrollDimensions();
        }
        else {
            this.notebookRangeMap.changeOneWhitespace(id, newAfterPosition, newSize);
            this.eventuallyUpdateScrollDimensions();
        }
    }
    removeWhitespace(id) {
        const scrollTop = this.scrollTop;
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        this.notebookRangeMap.removeWhitespace(id);
        this.render(previousRenderRange, scrollTop, this.lastRenderHeight, undefined, undefined, false);
        this._rerender(scrollTop, this.renderHeight, false);
        this.eventuallyUpdateScrollDimensions();
    }
    getWhitespacePosition(id) {
        return this.notebookRangeMap.getWhitespacePosition(id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGlzdFZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L25vdGVib29rQ2VsbExpc3RWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUUzRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQVl4RyxNQUFNLE9BQU8sbUJBQW1CO0lBTy9CLElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBRUQsSUFBSSxVQUFVLENBQUMsVUFBa0I7UUFDaEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3hELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO0lBQy9CLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNuQixDQUFDO0lBRUQsWUFBWSxVQUFtQjtRQTFCdkIsV0FBTSxHQUFZLEVBQUUsQ0FBQztRQUNyQixnQkFBVyxHQUFrQixFQUFFLENBQUM7UUFDOUIsdUJBQWtCLEdBQWtDLElBQUksNkJBQTZCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUYsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBdUJ2QixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQy9CLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxLQUFvQjtRQUNyQyxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN6QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3hKLENBQUM7SUFFRDtPQUNHO0lBQ0gsTUFBTSxDQUFDLEtBQWEsRUFBRSxXQUFtQixFQUFFLEtBQTJCO1FBQ3JFLE1BQU0sT0FBTyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDNUIsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZKLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRXpELDBDQUEwQztRQUMxQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQzlCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsYUFBYSxLQUFLLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUdoRyxJQUFJLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFdEQsMEtBQTBLO1FBQzFLLDZFQUE2RTtRQUM3RSxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqRCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGFBQWEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEYsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEgsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsRUFBVSxFQUFFLGFBQXFCLEVBQUUsSUFBWTtRQUMvRCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEtBQUssYUFBYSxDQUFDLENBQUM7UUFDOUYsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxrREFBa0Q7UUFDdEUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxDQUFDLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDekMsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDaEMsQ0FBQztZQUNELE9BQU8sQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLElBQUksYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUM7WUFDaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDekMsTUFBTSxPQUFPLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQztZQUNoQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVELG1CQUFtQixDQUFDLEVBQVUsRUFBRSxhQUFxQixFQUFFLElBQVk7UUFDbEUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksZUFBZSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRCxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUM7WUFDbEQsVUFBVSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7WUFDekMsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDO1lBQzdCLFVBQVUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDO1lBRXBCLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BFLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixHQUFHLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ3pDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQztnQkFDekIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUVELElBQUksYUFBYSxHQUFHLENBQUMsSUFBSSxhQUFhLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDOUQsTUFBTSxLQUFLLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ3pDLE1BQU0sT0FBTyxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELGdCQUFnQixDQUFDLEVBQVU7UUFDMUIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksZUFBZSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLEtBQUssSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsOERBQThEO1lBRTdGLElBQUksVUFBVSxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUN6QyxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGFBQWEsS0FBSyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzFHLE1BQU0sT0FBTyxHQUFHLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdEYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILHFCQUFxQixDQUFDLEVBQVU7UUFDL0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUM7UUFDL0MsSUFBSSxhQUFhLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsc0ZBQXNGO1lBQ3RGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGFBQWEsS0FBSyxhQUFhLElBQUksRUFBRSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0gsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUM1RSxDQUFDO1FBRUQsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUgsc0JBQXNCO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDaEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDakQsT0FBTyxvQkFBb0IsR0FBRyxnQkFBZ0IsR0FBRyx5QkFBeUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQzlGLENBQUM7SUFFRCxPQUFPLENBQUMsUUFBZ0I7UUFDdkIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGFBQWEsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5SCxNQUFNLE1BQU0sR0FBRyxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLHlCQUF5QixDQUFDLENBQUM7UUFDekUsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRUQsSUFBSSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcseUJBQXlCLENBQUMsRUFBRSxDQUFDO1lBQzNFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNuQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDckUsQ0FBQztJQUVELFVBQVUsQ0FBQyxRQUFnQjtRQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELFVBQVUsQ0FBQyxLQUFhO1FBQ3ZCLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7UUFFRCwrSEFBK0g7UUFDL0gsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pCLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBRUQsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUgsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQSxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxHQUFHLHlCQUF5QixDQUFDO0lBQy9HLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxvQkFBd0IsU0FBUSxRQUFXO0lBQXhEOztRQUNTLHNCQUFpQixHQUFXLENBQUMsQ0FBQztRQUM5QixvQkFBZSxHQUFHLENBQUMsQ0FBQztJQStFN0IsQ0FBQztJQTdFQSxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxRQUErQixDQUFDO0lBQzdDLENBQUM7SUFFa0IsTUFBTSxDQUFDLG1CQUEyQixFQUFFLFNBQWlCLEVBQUUsWUFBb0IsRUFBRSxVQUE4QixFQUFFLFdBQStCLEVBQUUsZ0JBQTBCO1FBQzFMLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRWtCLFNBQVMsQ0FBQyxTQUFpQixFQUFFLFlBQW9CLEVBQUUsaUJBQXVDO1FBQzVHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN2QixLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVrQixjQUFjLENBQUMsVUFBa0I7UUFDbkQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQTJDLENBQUM7UUFDckUsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUN2RCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFFRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsYUFBcUIsRUFBRSxJQUFZO1FBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDakMsTUFBTSxFQUFFLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzNGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkQsTUFBTSxjQUFjLEdBQUcsU0FBUyxHQUFHLGVBQWUsQ0FBQztRQUNuRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVoRSxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNuRSxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO1FBRXhDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELG1CQUFtQixDQUFDLEVBQVUsRUFBRSxnQkFBd0IsRUFBRSxPQUFlO1FBQ3hFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDakMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDM0YsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXhFLElBQUksZUFBZSxHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDekUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztRQUN6QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDekUsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUM7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxFQUFVO1FBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDakMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFM0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2hHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELHFCQUFxQixDQUFDLEVBQVU7UUFDL0IsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQztDQUNEIn0=
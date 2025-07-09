/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
function rangesEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i].start !== b[i].start || a[i].end !== b[i].end) {
            return false;
        }
    }
    return true;
}
// Challenge is List View talks about `element`, which needs extra work to convert to ICellRange as we support Folding and Cell Move
export class NotebookCellSelectionCollection extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeSelection = this._register(new Emitter());
        this._primary = null;
        this._selections = [];
    }
    get onDidChangeSelection() { return this._onDidChangeSelection.event; }
    get selections() {
        return this._selections;
    }
    get focus() {
        return this._primary ?? { start: 0, end: 0 };
    }
    setState(primary, selections, forceEventEmit, source) {
        const changed = primary !== this._primary || !rangesEqual(this._selections, selections);
        this._primary = primary;
        this._selections = selections;
        if (changed || forceEventEmit) {
            this._onDidChangeSelection.fire(source);
        }
    }
    setSelections(selections, forceEventEmit, source) {
        this.setState(this._primary, selections, forceEventEmit, source);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFNlbGVjdGlvbkNvbGxlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvY2VsbFNlbGVjdGlvbkNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdyRSxTQUFTLFdBQVcsQ0FBQyxDQUFlLEVBQUUsQ0FBZTtJQUNwRCxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDeEQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELG9JQUFvSTtBQUNwSSxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsVUFBVTtJQUEvRDs7UUFFa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUM7UUFHdkUsYUFBUSxHQUFzQixJQUFJLENBQUM7UUFFbkMsZ0JBQVcsR0FBaUIsRUFBRSxDQUFDO0lBdUJ4QyxDQUFDO0lBM0JBLElBQUksb0JBQW9CLEtBQW9CLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFNdEYsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0lBRUQsUUFBUSxDQUFDLE9BQTBCLEVBQUUsVUFBd0IsRUFBRSxjQUF1QixFQUFFLE1BQXdCO1FBQy9HLE1BQU0sT0FBTyxHQUFHLE9BQU8sS0FBSyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFeEYsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFDOUIsSUFBSSxPQUFPLElBQUksY0FBYyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDO0lBQ0YsQ0FBQztJQUVELGFBQWEsQ0FBQyxVQUF3QixFQUFFLGNBQXVCLEVBQUUsTUFBd0I7UUFDeEYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEUsQ0FBQztDQUNEIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
const someEvent = new Emitter().event;
/**
 * Add stub methods as needed
 */
export class MockObjectTree {
    get onDidChangeFocus() { return someEvent; }
    get onDidChangeSelection() { return someEvent; }
    get onDidOpen() { return someEvent; }
    get onMouseClick() { return someEvent; }
    get onMouseDblClick() { return someEvent; }
    get onContextMenu() { return someEvent; }
    get onKeyDown() { return someEvent; }
    get onKeyUp() { return someEvent; }
    get onKeyPress() { return someEvent; }
    get onDidFocus() { return someEvent; }
    get onDidBlur() { return someEvent; }
    get onDidChangeCollapseState() { return someEvent; }
    get onDidChangeRenderNodeCount() { return someEvent; }
    get onDidDispose() { return someEvent; }
    get lastVisibleElement() { return this.elements[this.elements.length - 1]; }
    constructor(elements) {
        this.elements = elements;
    }
    domFocus() { }
    collapse(location, recursive = false) {
        return true;
    }
    expand(location, recursive = false) {
        return true;
    }
    navigate(start) {
        const startIdx = start ? this.elements.indexOf(start) :
            undefined;
        return new ArrayNavigator(this.elements, startIdx);
    }
    getParentElement(elem) {
        return elem.parent();
    }
    dispose() {
    }
}
class ArrayNavigator {
    constructor(elements, index = 0) {
        this.elements = elements;
        this.index = index;
    }
    current() {
        return this.elements[this.index];
    }
    previous() {
        return this.elements[--this.index];
    }
    first() {
        this.index = 0;
        return this.elements[this.index];
    }
    last() {
        this.index = this.elements.length - 1;
        return this.elements[this.index];
    }
    next() {
        return this.elements[++this.index];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1NlYXJjaFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvYnJvd3Nlci9tb2NrU2VhcmNoVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFJOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFFdEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBYztJQUUxQixJQUFJLGdCQUFnQixLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUM1QyxJQUFJLG9CQUFvQixLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNoRCxJQUFJLFNBQVMsS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFFckMsSUFBSSxZQUFZLEtBQUssT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLElBQUksZUFBZSxLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMzQyxJQUFJLGFBQWEsS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFFekMsSUFBSSxTQUFTLEtBQUssT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLElBQUksT0FBTyxLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNuQyxJQUFJLFVBQVUsS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFFdEMsSUFBSSxVQUFVLEtBQUssT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLElBQUksU0FBUyxLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUVyQyxJQUFJLHdCQUF3QixLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNwRCxJQUFJLDBCQUEwQixLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUV0RCxJQUFJLFlBQVksS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDeEMsSUFBSSxrQkFBa0IsS0FBSyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVFLFlBQW9CLFFBQWU7UUFBZixhQUFRLEdBQVIsUUFBUSxDQUFPO0lBQUksQ0FBQztJQUV4QyxRQUFRLEtBQVcsQ0FBQztJQUVwQixRQUFRLENBQUMsUUFBYyxFQUFFLFlBQXFCLEtBQUs7UUFDbEQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQWMsRUFBRSxZQUFxQixLQUFLO1FBQ2hELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFZO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN0RCxTQUFTLENBQUM7UUFFWCxPQUFPLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQXFCO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxPQUFPO0lBQ1AsQ0FBQztDQUNEO0FBRUQsTUFBTSxjQUFjO0lBQ25CLFlBQW9CLFFBQWEsRUFBVSxRQUFRLENBQUM7UUFBaEMsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUFVLFVBQUssR0FBTCxLQUFLLENBQUk7SUFBSSxDQUFDO0lBRXpELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDdEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSTtRQUNILE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwQyxDQUFDO0NBQ0QifQ==
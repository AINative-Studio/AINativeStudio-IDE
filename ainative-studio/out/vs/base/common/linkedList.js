/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class Node {
    static { this.Undefined = new Node(undefined); }
    constructor(element) {
        this.element = element;
        this.next = Node.Undefined;
        this.prev = Node.Undefined;
    }
}
export class LinkedList {
    constructor() {
        this._first = Node.Undefined;
        this._last = Node.Undefined;
        this._size = 0;
    }
    get size() {
        return this._size;
    }
    isEmpty() {
        return this._first === Node.Undefined;
    }
    clear() {
        let node = this._first;
        while (node !== Node.Undefined) {
            const next = node.next;
            node.prev = Node.Undefined;
            node.next = Node.Undefined;
            node = next;
        }
        this._first = Node.Undefined;
        this._last = Node.Undefined;
        this._size = 0;
    }
    unshift(element) {
        return this._insert(element, false);
    }
    push(element) {
        return this._insert(element, true);
    }
    _insert(element, atTheEnd) {
        const newNode = new Node(element);
        if (this._first === Node.Undefined) {
            this._first = newNode;
            this._last = newNode;
        }
        else if (atTheEnd) {
            // push
            const oldLast = this._last;
            this._last = newNode;
            newNode.prev = oldLast;
            oldLast.next = newNode;
        }
        else {
            // unshift
            const oldFirst = this._first;
            this._first = newNode;
            newNode.next = oldFirst;
            oldFirst.prev = newNode;
        }
        this._size += 1;
        let didRemove = false;
        return () => {
            if (!didRemove) {
                didRemove = true;
                this._remove(newNode);
            }
        };
    }
    shift() {
        if (this._first === Node.Undefined) {
            return undefined;
        }
        else {
            const res = this._first.element;
            this._remove(this._first);
            return res;
        }
    }
    pop() {
        if (this._last === Node.Undefined) {
            return undefined;
        }
        else {
            const res = this._last.element;
            this._remove(this._last);
            return res;
        }
    }
    _remove(node) {
        if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
            // middle
            const anchor = node.prev;
            anchor.next = node.next;
            node.next.prev = anchor;
        }
        else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
            // only node
            this._first = Node.Undefined;
            this._last = Node.Undefined;
        }
        else if (node.next === Node.Undefined) {
            // last
            this._last = this._last.prev;
            this._last.next = Node.Undefined;
        }
        else if (node.prev === Node.Undefined) {
            // first
            this._first = this._first.next;
            this._first.prev = Node.Undefined;
        }
        // done
        this._size -= 1;
    }
    *[Symbol.iterator]() {
        let node = this._first;
        while (node !== Node.Undefined) {
            yield node.element;
            node = node.next;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9saW5rZWRMaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sSUFBSTthQUVPLGNBQVMsR0FBRyxJQUFJLElBQUksQ0FBTSxTQUFTLENBQUMsQ0FBQztJQU1yRCxZQUFZLE9BQVU7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUM1QixDQUFDOztBQUdGLE1BQU0sT0FBTyxVQUFVO0lBQXZCO1FBRVMsV0FBTSxHQUFZLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDakMsVUFBSyxHQUFZLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDaEMsVUFBSyxHQUFXLENBQUMsQ0FBQztJQXFIM0IsQ0FBQztJQW5IQSxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDdkIsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUMzQixJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDNUIsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUVELE9BQU8sQ0FBQyxPQUFVO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFVO1FBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRU8sT0FBTyxDQUFDLE9BQVUsRUFBRSxRQUFpQjtRQUM1QyxNQUFNLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBRXRCLENBQUM7YUFBTSxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLE9BQU87WUFDUCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzNCLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1FBRXhCLENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFBVTtZQUNWLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7WUFDdEIsT0FBTyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7WUFDeEIsUUFBUSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7UUFDekIsQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO1FBRWhCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN0QixPQUFPLEdBQUcsRUFBRTtZQUNYLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUIsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUVELEdBQUc7UUFDRixJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekIsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUVPLE9BQU8sQ0FBQyxJQUFhO1FBQzVCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xFLFNBQVM7WUFDVCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztZQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7UUFFekIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pFLFlBQVk7WUFDWixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBRTdCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLE9BQU87WUFDUCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSyxDQUFDO1lBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFFbEMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDekMsUUFBUTtZQUNSLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFLLENBQUM7WUFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsT0FBTztRQUNQLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNqQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDbkIsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9
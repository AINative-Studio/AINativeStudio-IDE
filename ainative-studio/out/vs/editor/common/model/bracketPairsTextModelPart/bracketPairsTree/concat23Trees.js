/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ListAstNode } from './ast.js';
/**
 * Concatenates a list of (2,3) AstNode's into a single (2,3) AstNode.
 * This mutates the items of the input array!
 * If all items have the same height, this method has runtime O(items.length).
 * Otherwise, it has runtime O(items.length * max(log(items.length), items.max(i => i.height))).
*/
export function concat23Trees(items) {
    if (items.length === 0) {
        return null;
    }
    if (items.length === 1) {
        return items[0];
    }
    let i = 0;
    /**
     * Reads nodes of same height and concatenates them to a single node.
    */
    function readNode() {
        if (i >= items.length) {
            return null;
        }
        const start = i;
        const height = items[start].listHeight;
        i++;
        while (i < items.length && items[i].listHeight === height) {
            i++;
        }
        if (i - start >= 2) {
            return concat23TreesOfSameHeight(start === 0 && i === items.length ? items : items.slice(start, i), false);
        }
        else {
            return items[start];
        }
    }
    // The items might not have the same height.
    // We merge all items by using a binary concat operator.
    let first = readNode(); // There must be a first item
    let second = readNode();
    if (!second) {
        return first;
    }
    for (let item = readNode(); item; item = readNode()) {
        // Prefer concatenating smaller trees, as the runtime of concat depends on the tree height.
        if (heightDiff(first, second) <= heightDiff(second, item)) {
            first = concat(first, second);
            second = item;
        }
        else {
            second = concat(second, item);
        }
    }
    const result = concat(first, second);
    return result;
}
export function concat23TreesOfSameHeight(items, createImmutableLists = false) {
    if (items.length === 0) {
        return null;
    }
    if (items.length === 1) {
        return items[0];
    }
    let length = items.length;
    // All trees have same height, just create parent nodes.
    while (length > 3) {
        const newLength = length >> 1;
        for (let i = 0; i < newLength; i++) {
            const j = i << 1;
            items[i] = ListAstNode.create23(items[j], items[j + 1], j + 3 === length ? items[j + 2] : null, createImmutableLists);
        }
        length = newLength;
    }
    return ListAstNode.create23(items[0], items[1], length >= 3 ? items[2] : null, createImmutableLists);
}
function heightDiff(node1, node2) {
    return Math.abs(node1.listHeight - node2.listHeight);
}
function concat(node1, node2) {
    if (node1.listHeight === node2.listHeight) {
        return ListAstNode.create23(node1, node2, null, false);
    }
    else if (node1.listHeight > node2.listHeight) {
        // node1 is the tree we want to insert into
        return append(node1, node2);
    }
    else {
        return prepend(node2, node1);
    }
}
/**
 * Appends the given node to the end of this (2,3) tree.
 * Returns the new root.
*/
function append(list, nodeToAppend) {
    list = list.toMutable();
    let curNode = list;
    const parents = [];
    let nodeToAppendOfCorrectHeight;
    while (true) {
        // assert nodeToInsert.listHeight <= curNode.listHeight
        if (nodeToAppend.listHeight === curNode.listHeight) {
            nodeToAppendOfCorrectHeight = nodeToAppend;
            break;
        }
        // assert 0 <= nodeToInsert.listHeight < curNode.listHeight
        if (curNode.kind !== 4 /* AstNodeKind.List */) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        // assert 2 <= curNode.childrenLength <= 3
        curNode = curNode.makeLastElementMutable();
    }
    // assert nodeToAppendOfCorrectHeight!.listHeight === curNode.listHeight
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToAppendOfCorrectHeight) {
            // Can we take the element?
            if (parent.childrenLength >= 3) {
                // assert parent.childrenLength === 3 && parent.listHeight === nodeToAppendOfCorrectHeight.listHeight + 1
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                nodeToAppendOfCorrectHeight = ListAstNode.create23(parent.unappendChild(), nodeToAppendOfCorrectHeight, null, false);
            }
            else {
                parent.appendChildOfSameHeight(nodeToAppendOfCorrectHeight);
                nodeToAppendOfCorrectHeight = undefined;
            }
        }
        else {
            parent.handleChildrenChanged();
        }
    }
    if (nodeToAppendOfCorrectHeight) {
        return ListAstNode.create23(list, nodeToAppendOfCorrectHeight, null, false);
    }
    else {
        return list;
    }
}
/**
 * Prepends the given node to the end of this (2,3) tree.
 * Returns the new root.
*/
function prepend(list, nodeToAppend) {
    list = list.toMutable();
    let curNode = list;
    const parents = [];
    // assert nodeToInsert.listHeight <= curNode.listHeight
    while (nodeToAppend.listHeight !== curNode.listHeight) {
        // assert 0 <= nodeToInsert.listHeight < curNode.listHeight
        if (curNode.kind !== 4 /* AstNodeKind.List */) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        // assert 2 <= curNode.childrenFast.length <= 3
        curNode = curNode.makeFirstElementMutable();
    }
    let nodeToPrependOfCorrectHeight = nodeToAppend;
    // assert nodeToAppendOfCorrectHeight!.listHeight === curNode.listHeight
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToPrependOfCorrectHeight) {
            // Can we take the element?
            if (parent.childrenLength >= 3) {
                // assert parent.childrenLength === 3 && parent.listHeight === nodeToAppendOfCorrectHeight.listHeight + 1
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                nodeToPrependOfCorrectHeight = ListAstNode.create23(nodeToPrependOfCorrectHeight, parent.unprependChild(), null, false);
            }
            else {
                parent.prependChildOfSameHeight(nodeToPrependOfCorrectHeight);
                nodeToPrependOfCorrectHeight = undefined;
            }
        }
        else {
            parent.handleChildrenChanged();
        }
    }
    if (nodeToPrependOfCorrectHeight) {
        return ListAstNode.create23(nodeToPrependOfCorrectHeight, list, null, false);
    }
    else {
        return list;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uY2F0MjNUcmVlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9jb25jYXQyM1RyZWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBd0IsV0FBVyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRTdEOzs7OztFQUtFO0FBQ0YsTUFBTSxVQUFVLGFBQWEsQ0FBQyxLQUFnQjtJQUM3QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDVjs7TUFFRTtJQUNGLFNBQVMsUUFBUTtRQUNoQixJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFFdkMsQ0FBQyxFQUFFLENBQUM7UUFDSixPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDM0QsQ0FBQyxFQUFFLENBQUM7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8seUJBQXlCLENBQUMsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQsNENBQTRDO0lBQzVDLHdEQUF3RDtJQUN4RCxJQUFJLEtBQUssR0FBRyxRQUFRLEVBQUcsQ0FBQyxDQUFDLDZCQUE2QjtJQUN0RCxJQUFJLE1BQU0sR0FBRyxRQUFRLEVBQUUsQ0FBQztJQUN4QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLElBQUksSUFBSSxHQUFHLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEdBQUcsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNyRCwyRkFBMkY7UUFDM0YsSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMzRCxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM5QixNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ2YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDckMsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLEtBQWdCLEVBQUUsdUJBQWdDLEtBQUs7SUFDaEcsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN4QixPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUMxQix3REFBd0Q7SUFDeEQsT0FBTyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbkIsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQztRQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqQixLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdkgsQ0FBQztRQUNELE1BQU0sR0FBRyxTQUFTLENBQUM7SUFDcEIsQ0FBQztJQUNELE9BQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7QUFDdEcsQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQWMsRUFBRSxLQUFjO0lBQ2pELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN0RCxDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsS0FBYyxFQUFFLEtBQWM7SUFDN0MsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMzQyxPQUFPLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDeEQsQ0FBQztTQUNJLElBQUksS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sTUFBTSxDQUFDLEtBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLE9BQU8sQ0FBQyxLQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdDLENBQUM7QUFDRixDQUFDO0FBRUQ7OztFQUdFO0FBQ0YsU0FBUyxNQUFNLENBQUMsSUFBaUIsRUFBRSxZQUFxQjtJQUN2RCxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBaUIsQ0FBQztJQUN2QyxJQUFJLE9BQU8sR0FBWSxJQUFJLENBQUM7SUFDNUIsTUFBTSxPQUFPLEdBQWtCLEVBQUUsQ0FBQztJQUNsQyxJQUFJLDJCQUFnRCxDQUFDO0lBQ3JELE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDYix1REFBdUQ7UUFDdkQsSUFBSSxZQUFZLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNwRCwyQkFBMkIsR0FBRyxZQUFZLENBQUM7WUFDM0MsTUFBTTtRQUNQLENBQUM7UUFDRCwyREFBMkQ7UUFDM0QsSUFBSSxPQUFPLENBQUMsSUFBSSw2QkFBcUIsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEIsMENBQTBDO1FBQzFDLE9BQU8sR0FBRyxPQUFPLENBQUMsc0JBQXNCLEVBQUcsQ0FBQztJQUM3QyxDQUFDO0lBQ0Qsd0VBQXdFO0lBQ3hFLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixJQUFJLDJCQUEyQixFQUFFLENBQUM7WUFDakMsMkJBQTJCO1lBQzNCLElBQUksTUFBTSxDQUFDLGNBQWMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDaEMseUdBQXlHO2dCQUV6RyxvREFBb0Q7Z0JBQ3BELDBEQUEwRDtnQkFDMUQsMkJBQTJCLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFHLEVBQUUsMkJBQTJCLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3ZILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsdUJBQXVCLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDNUQsMkJBQTJCLEdBQUcsU0FBUyxDQUFDO1lBQ3pDLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBQ0QsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdFLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0FBQ0YsQ0FBQztBQUVEOzs7RUFHRTtBQUNGLFNBQVMsT0FBTyxDQUFDLElBQWlCLEVBQUUsWUFBcUI7SUFDeEQsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQWlCLENBQUM7SUFDdkMsSUFBSSxPQUFPLEdBQVksSUFBSSxDQUFDO0lBQzVCLE1BQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7SUFDbEMsdURBQXVEO0lBQ3ZELE9BQU8sWUFBWSxDQUFDLFVBQVUsS0FBSyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDdkQsMkRBQTJEO1FBQzNELElBQUksT0FBTyxDQUFDLElBQUksNkJBQXFCLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RCLCtDQUErQztRQUMvQyxPQUFPLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixFQUFHLENBQUM7SUFDOUMsQ0FBQztJQUNELElBQUksNEJBQTRCLEdBQXdCLFlBQVksQ0FBQztJQUNyRSx3RUFBd0U7SUFDeEUsS0FBSyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDOUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLElBQUksNEJBQTRCLEVBQUUsQ0FBQztZQUNsQywyQkFBMkI7WUFDM0IsSUFBSSxNQUFNLENBQUMsY0FBYyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoQyx5R0FBeUc7Z0JBRXpHLG9EQUFvRDtnQkFDcEQsMERBQTBEO2dCQUMxRCw0QkFBNEIsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUgsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO2dCQUM5RCw0QkFBNEIsR0FBRyxTQUFTLENBQUM7WUFDMUMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLDRCQUE0QixFQUFFLENBQUM7UUFDbEMsT0FBTyxXQUFXLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUUsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7QUFDRixDQUFDIn0=
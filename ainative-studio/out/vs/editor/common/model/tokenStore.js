/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class ListNode {
    get children() { return this._children; }
    get length() { return this._length; }
    constructor(height) {
        this.height = height;
        this._children = [];
        this._length = 0;
    }
    static create(node1, node2) {
        const list = new ListNode(node1.height + 1);
        list.appendChild(node1);
        list.appendChild(node2);
        return list;
    }
    canAppendChild() {
        return this._children.length < 3;
    }
    appendChild(node) {
        if (!this.canAppendChild()) {
            throw new Error('Cannot insert more than 3 children in a ListNode');
        }
        this._children.push(node);
        this._length += node.length;
        this._updateParentLength(node.length);
        if (!isLeaf(node)) {
            node.parent = this;
        }
    }
    _updateParentLength(delta) {
        let updateParent = this.parent;
        while (updateParent) {
            updateParent._length += delta;
            updateParent = updateParent.parent;
        }
    }
    unappendChild() {
        const child = this._children.pop();
        this._length -= child.length;
        this._updateParentLength(-child.length);
        return child;
    }
    prependChild(node) {
        if (this._children.length >= 3) {
            throw new Error('Cannot prepend more than 3 children in a ListNode');
        }
        this._children.unshift(node);
        this._length += node.length;
        this._updateParentLength(node.length);
        if (!isLeaf(node)) {
            node.parent = this;
        }
    }
    unprependChild() {
        const child = this._children.shift();
        this._length -= child.length;
        this._updateParentLength(-child.length);
        return child;
    }
    lastChild() {
        return this._children[this._children.length - 1];
    }
    dispose() {
        this._children.splice(0, this._children.length);
    }
}
export var TokenQuality;
(function (TokenQuality) {
    TokenQuality[TokenQuality["None"] = 0] = "None";
    TokenQuality[TokenQuality["ViewportGuess"] = 1] = "ViewportGuess";
    TokenQuality[TokenQuality["EditGuess"] = 2] = "EditGuess";
    TokenQuality[TokenQuality["Accurate"] = 3] = "Accurate";
})(TokenQuality || (TokenQuality = {}));
function isLeaf(node) {
    return node.token !== undefined;
}
// Heavily inspired by https://github.com/microsoft/vscode/blob/4eb2658d592cb6114a7a393655574176cc790c5b/src/vs/editor/common/model/bracketPairsTextModelPart/bracketPairsTree/concat23Trees.ts#L108-L109
function append(node, nodeToAppend) {
    let curNode = node;
    const parents = [];
    let nodeToAppendOfCorrectHeight;
    while (true) {
        if (nodeToAppend.height === curNode.height) {
            nodeToAppendOfCorrectHeight = nodeToAppend;
            break;
        }
        if (isLeaf(curNode)) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        curNode = curNode.lastChild();
    }
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToAppendOfCorrectHeight) {
            // Can we take the element?
            if (parent.children.length >= 3) {
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                const newList = ListNode.create(parent.unappendChild(), nodeToAppendOfCorrectHeight);
                nodeToAppendOfCorrectHeight = newList;
            }
            else {
                parent.appendChild(nodeToAppendOfCorrectHeight);
                nodeToAppendOfCorrectHeight = undefined;
            }
        }
    }
    if (nodeToAppendOfCorrectHeight) {
        const newList = new ListNode(nodeToAppendOfCorrectHeight.height + 1);
        newList.appendChild(node);
        newList.appendChild(nodeToAppendOfCorrectHeight);
        return newList;
    }
    else {
        return node;
    }
}
function prepend(list, nodeToAppend) {
    let curNode = list;
    const parents = [];
    while (nodeToAppend.height !== curNode.height) {
        if (isLeaf(curNode)) {
            throw new Error('unexpected');
        }
        parents.push(curNode);
        // assert 2 <= curNode.childrenFast.length <= 3
        curNode = curNode.children[0];
    }
    let nodeToPrependOfCorrectHeight = nodeToAppend;
    // assert nodeToAppendOfCorrectHeight!.listHeight === curNode.listHeight
    for (let i = parents.length - 1; i >= 0; i--) {
        const parent = parents[i];
        if (nodeToPrependOfCorrectHeight) {
            // Can we take the element?
            if (parent.children.length >= 3) {
                // we need to split to maintain (2,3)-tree property.
                // Send the third element + the new element to the parent.
                nodeToPrependOfCorrectHeight = ListNode.create(nodeToPrependOfCorrectHeight, parent.unprependChild());
            }
            else {
                parent.prependChild(nodeToPrependOfCorrectHeight);
                nodeToPrependOfCorrectHeight = undefined;
            }
        }
    }
    if (nodeToPrependOfCorrectHeight) {
        return ListNode.create(nodeToPrependOfCorrectHeight, list);
    }
    else {
        return list;
    }
}
function concat(node1, node2) {
    if (node1.height === node2.height) {
        return ListNode.create(node1, node2);
    }
    else if (node1.height > node2.height) {
        // node1 is the tree we want to insert into
        return append(node1, node2);
    }
    else {
        return prepend(node2, node1);
    }
}
export class TokenStore {
    get root() {
        return this._root;
    }
    constructor(_textModel) {
        this._textModel = _textModel;
        this._root = this.createEmptyRoot();
    }
    createEmptyRoot() {
        return {
            length: this._textModel.getValueLength(),
            token: 0,
            height: 0,
            tokenQuality: TokenQuality.None
        };
    }
    /**
     *
     * @param update all the tokens for the document in sequence
     */
    buildStore(tokens, tokenQuality) {
        this._root = this.createFromUpdates(tokens, tokenQuality);
    }
    createFromUpdates(tokens, tokenQuality) {
        if (tokens.length === 0) {
            return this.createEmptyRoot();
        }
        let newRoot = {
            length: tokens[0].length,
            token: tokens[0].token,
            height: 0,
            tokenQuality
        };
        for (let j = 1; j < tokens.length; j++) {
            newRoot = append(newRoot, { length: tokens[j].length, token: tokens[j].token, height: 0, tokenQuality });
        }
        return newRoot;
    }
    /**
     *
     * @param tokens tokens are in sequence in the document.
     */
    update(length, tokens, tokenQuality) {
        if (tokens.length === 0) {
            return;
        }
        this.replace(length, tokens[0].startOffsetInclusive, tokens, tokenQuality);
    }
    delete(length, startOffset) {
        this.replace(length, startOffset, [], TokenQuality.EditGuess);
    }
    /**
     *
     * @param tokens tokens are in sequence in the document.
     */
    replace(length, updateOffsetStart, tokens, tokenQuality) {
        const firstUnchangedOffsetAfterUpdate = updateOffsetStart + length;
        // Find the last unchanged node preceding the update
        const precedingNodes = [];
        // Find the first unchanged node after the update
        const postcedingNodes = [];
        const stack = [{ node: this._root, offset: 0 }];
        while (stack.length > 0) {
            const node = stack.pop();
            const currentOffset = node.offset;
            if (currentOffset < updateOffsetStart && currentOffset + node.node.length <= updateOffsetStart) {
                if (!isLeaf(node.node)) {
                    node.node.parent = undefined;
                }
                precedingNodes.push(node.node);
                continue;
            }
            else if (isLeaf(node.node) && (currentOffset < updateOffsetStart)) {
                // We have a partial preceding node
                precedingNodes.push({ length: updateOffsetStart - currentOffset, token: node.node.token, height: 0, tokenQuality: node.node.tokenQuality });
                // Node could also be postceeding, so don't continue
            }
            if ((updateOffsetStart <= currentOffset) && (currentOffset + node.node.length <= firstUnchangedOffsetAfterUpdate)) {
                continue;
            }
            if (currentOffset >= firstUnchangedOffsetAfterUpdate) {
                if (!isLeaf(node.node)) {
                    node.node.parent = undefined;
                }
                postcedingNodes.push(node.node);
                continue;
            }
            else if (isLeaf(node.node) && (currentOffset + node.node.length > firstUnchangedOffsetAfterUpdate)) {
                // we have a partial postceeding node
                postcedingNodes.push({ length: currentOffset + node.node.length - firstUnchangedOffsetAfterUpdate, token: node.node.token, height: 0, tokenQuality: node.node.tokenQuality });
                continue;
            }
            if (!isLeaf(node.node)) {
                // Push children in reverse order to process them left-to-right when popping
                let childOffset = currentOffset + node.node.length;
                for (let i = node.node.children.length - 1; i >= 0; i--) {
                    childOffset -= node.node.children[i].length;
                    stack.push({ node: node.node.children[i], offset: childOffset });
                }
            }
        }
        let allNodes;
        if (tokens.length > 0) {
            allNodes = precedingNodes.concat(this.createFromUpdates(tokens, tokenQuality), postcedingNodes);
        }
        else {
            allNodes = precedingNodes.concat(postcedingNodes);
        }
        let newRoot = allNodes[0];
        for (let i = 1; i < allNodes.length; i++) {
            newRoot = concat(newRoot, allNodes[i]);
        }
        this._root = newRoot ?? this.createEmptyRoot();
    }
    /**
     *
     * @param startOffsetInclusive
     * @param endOffsetExclusive
     * @param visitor Return true from visitor to exit early
     * @returns
     */
    traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, visitor) {
        const stack = [{ node: this._root, offset: 0 }];
        while (stack.length > 0) {
            const { node, offset } = stack.pop();
            const nodeEnd = offset + node.length;
            // Skip nodes that are completely before or after the range
            if (nodeEnd <= startOffsetInclusive || offset >= endOffsetExclusive) {
                continue;
            }
            if (visitor(node, offset)) {
                return;
            }
            if (!isLeaf(node)) {
                // Push children in reverse order to process them left-to-right when popping
                let childOffset = offset + node.length;
                for (let i = node.children.length - 1; i >= 0; i--) {
                    childOffset -= node.children[i].length;
                    stack.push({ node: node.children[i], offset: childOffset });
                }
            }
        }
    }
    getTokenAt(offset) {
        let result;
        this.traverseInOrderInRange(offset, this._root.length, (node, offset) => {
            if (isLeaf(node)) {
                result = { token: node.token, startOffsetInclusive: offset, length: node.length };
                return true;
            }
            return false;
        });
        return result;
    }
    getTokensInRange(startOffsetInclusive, endOffsetExclusive) {
        const result = [];
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node, offset) => {
            if (isLeaf(node)) {
                let clippedLength = node.length;
                let clippedOffset = offset;
                if ((offset < startOffsetInclusive) && (offset + node.length > endOffsetExclusive)) {
                    clippedOffset = startOffsetInclusive;
                    clippedLength = endOffsetExclusive - startOffsetInclusive;
                }
                else if (offset < startOffsetInclusive) {
                    clippedLength -= (startOffsetInclusive - offset);
                    clippedOffset = startOffsetInclusive;
                }
                else if (offset + node.length > endOffsetExclusive) {
                    clippedLength -= (offset + node.length - endOffsetExclusive);
                }
                result.push({ token: node.token, startOffsetInclusive: clippedOffset, length: clippedLength });
            }
            return false;
        });
        return result;
    }
    markForRefresh(startOffsetInclusive, endOffsetExclusive) {
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node) => {
            if (isLeaf(node)) {
                node.tokenQuality = TokenQuality.None;
            }
            return false;
        });
    }
    rangeHasTokens(startOffsetInclusive, endOffsetExclusive, minimumTokenQuality) {
        let hasAny = true;
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node) => {
            if (isLeaf(node) && (node.tokenQuality < minimumTokenQuality)) {
                hasAny = false;
            }
            return false;
        });
        return hasAny;
    }
    rangeNeedsRefresh(startOffsetInclusive, endOffsetExclusive) {
        let needsRefresh = false;
        this.traverseInOrderInRange(startOffsetInclusive, endOffsetExclusive, (node) => {
            if (isLeaf(node) && (node.tokenQuality !== TokenQuality.Accurate)) {
                needsRefresh = true;
            }
            return false;
        });
        return needsRefresh;
    }
    getNeedsRefresh() {
        const result = [];
        this.traverseInOrderInRange(0, this._textModel.getValueLength(), (node, offset) => {
            if (isLeaf(node) && (node.tokenQuality !== TokenQuality.Accurate)) {
                if ((result.length > 0) && (result[result.length - 1].endOffset === offset)) {
                    result[result.length - 1].endOffset += node.length;
                }
                else {
                    result.push({ startOffset: offset, endOffset: offset + node.length });
                }
            }
            return false;
        });
        return result;
    }
    deepCopy() {
        const newStore = new TokenStore(this._textModel);
        newStore._root = this._copyNodeIterative(this._root);
        return newStore;
    }
    _copyNodeIterative(root) {
        const newRoot = isLeaf(root)
            ? { length: root.length, token: root.token, tokenQuality: root.tokenQuality, height: root.height }
            : new ListNode(root.height);
        const stack = [[root, newRoot]];
        while (stack.length > 0) {
            const [oldNode, clonedNode] = stack.pop();
            if (!isLeaf(oldNode)) {
                for (const child of oldNode.children) {
                    const childCopy = isLeaf(child)
                        ? { length: child.length, token: child.token, tokenQuality: child.tokenQuality, height: child.height }
                        : new ListNode(child.height);
                    clonedNode.appendChild(childCopy);
                    stack.push([child, childCopy]);
                }
            }
        }
        return newRoot;
    }
    /**
     * Returns a string representation of the token tree using an iterative approach
     */
    printTree(root = this._root) {
        const result = [];
        const stack = [[root, 0]];
        while (stack.length > 0) {
            const [node, depth] = stack.pop();
            const indent = '  '.repeat(depth);
            if (isLeaf(node)) {
                result.push(`${indent}Leaf(length: ${node.length}, token: ${node.token}, refresh: ${node.tokenQuality})\n`);
            }
            else {
                result.push(`${indent}List(length: ${node.length})\n`);
                // Push children in reverse order so they get processed left-to-right
                for (let i = node.children.length - 1; i >= 0; i--) {
                    stack.push([node.children[i], depth + 1]);
                }
            }
        }
        return result.join('');
    }
    dispose() {
        const stack = [[this._root, false]];
        while (stack.length > 0) {
            const [node, visited] = stack.pop();
            if (isLeaf(node)) {
                // leaf node does not need to be disposed
            }
            else if (!visited) {
                stack.push([node, true]);
                for (let i = node.children.length - 1; i >= 0; i--) {
                    stack.push([node.children[i], false]);
                }
            }
            else {
                node.dispose();
                node.parent = undefined;
            }
        }
        this._root = undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5TdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLFFBQVE7SUFHYixJQUFJLFFBQVEsS0FBMEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUc5RCxJQUFJLE1BQU0sS0FBYSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRTdDLFlBQTRCLE1BQWM7UUFBZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBTnpCLGNBQVMsR0FBVyxFQUFFLENBQUM7UUFHaEMsWUFBTyxHQUFXLENBQUMsQ0FBQztJQUdrQixDQUFDO0lBRS9DLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBVyxFQUFFLEtBQVc7UUFDckMsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBVTtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7WUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FB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
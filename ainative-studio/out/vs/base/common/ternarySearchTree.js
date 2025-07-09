/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { shuffle } from './arrays.js';
import { compare, compareIgnoreCase, compareSubstring, compareSubstringIgnoreCase } from './strings.js';
export class StringIterator {
    constructor() {
        this._value = '';
        this._pos = 0;
    }
    reset(key) {
        this._value = key;
        this._pos = 0;
        return this;
    }
    next() {
        this._pos += 1;
        return this;
    }
    hasNext() {
        return this._pos < this._value.length - 1;
    }
    cmp(a) {
        const aCode = a.charCodeAt(0);
        const thisCode = this._value.charCodeAt(this._pos);
        return aCode - thisCode;
    }
    value() {
        return this._value[this._pos];
    }
}
export class ConfigKeysIterator {
    constructor(_caseSensitive = true) {
        this._caseSensitive = _caseSensitive;
    }
    reset(key) {
        this._value = key;
        this._from = 0;
        this._to = 0;
        return this.next();
    }
    hasNext() {
        return this._to < this._value.length;
    }
    next() {
        // this._data = key.split(/[\\/]/).filter(s => !!s);
        this._from = this._to;
        let justSeps = true;
        for (; this._to < this._value.length; this._to++) {
            const ch = this._value.charCodeAt(this._to);
            if (ch === 46 /* CharCode.Period */) {
                if (justSeps) {
                    this._from++;
                }
                else {
                    break;
                }
            }
            else {
                justSeps = false;
            }
        }
        return this;
    }
    cmp(a) {
        return this._caseSensitive
            ? compareSubstring(a, this._value, 0, a.length, this._from, this._to)
            : compareSubstringIgnoreCase(a, this._value, 0, a.length, this._from, this._to);
    }
    value() {
        return this._value.substring(this._from, this._to);
    }
}
export class PathIterator {
    constructor(_splitOnBackslash = true, _caseSensitive = true) {
        this._splitOnBackslash = _splitOnBackslash;
        this._caseSensitive = _caseSensitive;
    }
    reset(key) {
        this._from = 0;
        this._to = 0;
        this._value = key;
        this._valueLen = key.length;
        for (let pos = key.length - 1; pos >= 0; pos--, this._valueLen--) {
            const ch = this._value.charCodeAt(pos);
            if (!(ch === 47 /* CharCode.Slash */ || this._splitOnBackslash && ch === 92 /* CharCode.Backslash */)) {
                break;
            }
        }
        return this.next();
    }
    hasNext() {
        return this._to < this._valueLen;
    }
    next() {
        // this._data = key.split(/[\\/]/).filter(s => !!s);
        this._from = this._to;
        let justSeps = true;
        for (; this._to < this._valueLen; this._to++) {
            const ch = this._value.charCodeAt(this._to);
            if (ch === 47 /* CharCode.Slash */ || this._splitOnBackslash && ch === 92 /* CharCode.Backslash */) {
                if (justSeps) {
                    this._from++;
                }
                else {
                    break;
                }
            }
            else {
                justSeps = false;
            }
        }
        return this;
    }
    cmp(a) {
        return this._caseSensitive
            ? compareSubstring(a, this._value, 0, a.length, this._from, this._to)
            : compareSubstringIgnoreCase(a, this._value, 0, a.length, this._from, this._to);
    }
    value() {
        return this._value.substring(this._from, this._to);
    }
}
var UriIteratorState;
(function (UriIteratorState) {
    UriIteratorState[UriIteratorState["Scheme"] = 1] = "Scheme";
    UriIteratorState[UriIteratorState["Authority"] = 2] = "Authority";
    UriIteratorState[UriIteratorState["Path"] = 3] = "Path";
    UriIteratorState[UriIteratorState["Query"] = 4] = "Query";
    UriIteratorState[UriIteratorState["Fragment"] = 5] = "Fragment";
})(UriIteratorState || (UriIteratorState = {}));
export class UriIterator {
    constructor(_ignorePathCasing, _ignoreQueryAndFragment) {
        this._ignorePathCasing = _ignorePathCasing;
        this._ignoreQueryAndFragment = _ignoreQueryAndFragment;
        this._states = [];
        this._stateIdx = 0;
    }
    reset(key) {
        this._value = key;
        this._states = [];
        if (this._value.scheme) {
            this._states.push(1 /* UriIteratorState.Scheme */);
        }
        if (this._value.authority) {
            this._states.push(2 /* UriIteratorState.Authority */);
        }
        if (this._value.path) {
            this._pathIterator = new PathIterator(false, !this._ignorePathCasing(key));
            this._pathIterator.reset(key.path);
            if (this._pathIterator.value()) {
                this._states.push(3 /* UriIteratorState.Path */);
            }
        }
        if (!this._ignoreQueryAndFragment(key)) {
            if (this._value.query) {
                this._states.push(4 /* UriIteratorState.Query */);
            }
            if (this._value.fragment) {
                this._states.push(5 /* UriIteratorState.Fragment */);
            }
        }
        this._stateIdx = 0;
        return this;
    }
    next() {
        if (this._states[this._stateIdx] === 3 /* UriIteratorState.Path */ && this._pathIterator.hasNext()) {
            this._pathIterator.next();
        }
        else {
            this._stateIdx += 1;
        }
        return this;
    }
    hasNext() {
        return (this._states[this._stateIdx] === 3 /* UriIteratorState.Path */ && this._pathIterator.hasNext())
            || this._stateIdx < this._states.length - 1;
    }
    cmp(a) {
        if (this._states[this._stateIdx] === 1 /* UriIteratorState.Scheme */) {
            return compareIgnoreCase(a, this._value.scheme);
        }
        else if (this._states[this._stateIdx] === 2 /* UriIteratorState.Authority */) {
            return compareIgnoreCase(a, this._value.authority);
        }
        else if (this._states[this._stateIdx] === 3 /* UriIteratorState.Path */) {
            return this._pathIterator.cmp(a);
        }
        else if (this._states[this._stateIdx] === 4 /* UriIteratorState.Query */) {
            return compare(a, this._value.query);
        }
        else if (this._states[this._stateIdx] === 5 /* UriIteratorState.Fragment */) {
            return compare(a, this._value.fragment);
        }
        throw new Error();
    }
    value() {
        if (this._states[this._stateIdx] === 1 /* UriIteratorState.Scheme */) {
            return this._value.scheme;
        }
        else if (this._states[this._stateIdx] === 2 /* UriIteratorState.Authority */) {
            return this._value.authority;
        }
        else if (this._states[this._stateIdx] === 3 /* UriIteratorState.Path */) {
            return this._pathIterator.value();
        }
        else if (this._states[this._stateIdx] === 4 /* UriIteratorState.Query */) {
            return this._value.query;
        }
        else if (this._states[this._stateIdx] === 5 /* UriIteratorState.Fragment */) {
            return this._value.fragment;
        }
        throw new Error();
    }
}
class Undef {
    static { this.Val = Symbol('undefined_placeholder'); }
    static wrap(value) {
        return value === undefined ? Undef.Val : value;
    }
    static unwrap(value) {
        return value === Undef.Val ? undefined : value;
    }
}
class TernarySearchTreeNode {
    constructor() {
        this.height = 1;
    }
    isEmpty() {
        return !this.left && !this.mid && !this.right && this.value === undefined;
    }
    rotateLeft() {
        const tmp = this.right;
        this.right = tmp.left;
        tmp.left = this;
        this.updateHeight();
        tmp.updateHeight();
        return tmp;
    }
    rotateRight() {
        const tmp = this.left;
        this.left = tmp.right;
        tmp.right = this;
        this.updateHeight();
        tmp.updateHeight();
        return tmp;
    }
    updateHeight() {
        this.height = 1 + Math.max(this.heightLeft, this.heightRight);
    }
    balanceFactor() {
        return this.heightRight - this.heightLeft;
    }
    get heightLeft() {
        return this.left?.height ?? 0;
    }
    get heightRight() {
        return this.right?.height ?? 0;
    }
}
var Dir;
(function (Dir) {
    Dir[Dir["Left"] = -1] = "Left";
    Dir[Dir["Mid"] = 0] = "Mid";
    Dir[Dir["Right"] = 1] = "Right";
})(Dir || (Dir = {}));
export class TernarySearchTree {
    static forUris(ignorePathCasing = () => false, ignoreQueryAndFragment = () => false) {
        return new TernarySearchTree(new UriIterator(ignorePathCasing, ignoreQueryAndFragment));
    }
    static forPaths(ignorePathCasing = false) {
        return new TernarySearchTree(new PathIterator(undefined, !ignorePathCasing));
    }
    static forStrings() {
        return new TernarySearchTree(new StringIterator());
    }
    static forConfigKeys() {
        return new TernarySearchTree(new ConfigKeysIterator());
    }
    constructor(segments) {
        this._iter = segments;
    }
    clear() {
        this._root = undefined;
    }
    fill(values, keys) {
        if (keys) {
            const arr = keys.slice(0);
            shuffle(arr);
            for (const k of arr) {
                this.set(k, values);
            }
        }
        else {
            const arr = values.slice(0);
            shuffle(arr);
            for (const entry of arr) {
                this.set(entry[0], entry[1]);
            }
        }
    }
    set(key, element) {
        const iter = this._iter.reset(key);
        let node;
        if (!this._root) {
            this._root = new TernarySearchTreeNode();
            this._root.segment = iter.value();
        }
        const stack = [];
        // find insert_node
        node = this._root;
        while (true) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                if (!node.left) {
                    node.left = new TernarySearchTreeNode();
                    node.left.segment = iter.value();
                }
                stack.push([-1 /* Dir.Left */, node]);
                node = node.left;
            }
            else if (val < 0) {
                // right
                if (!node.right) {
                    node.right = new TernarySearchTreeNode();
                    node.right.segment = iter.value();
                }
                stack.push([1 /* Dir.Right */, node]);
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                if (!node.mid) {
                    node.mid = new TernarySearchTreeNode();
                    node.mid.segment = iter.value();
                }
                stack.push([0 /* Dir.Mid */, node]);
                node = node.mid;
            }
            else {
                break;
            }
        }
        // set value
        const oldElement = Undef.unwrap(node.value);
        node.value = Undef.wrap(element);
        node.key = key;
        // balance
        for (let i = stack.length - 1; i >= 0; i--) {
            const node = stack[i][1];
            node.updateHeight();
            const bf = node.balanceFactor();
            if (bf < -1 || bf > 1) {
                // needs rotate
                const d1 = stack[i][0];
                const d2 = stack[i + 1][0];
                if (d1 === 1 /* Dir.Right */ && d2 === 1 /* Dir.Right */) {
                    //right, right -> rotate left
                    stack[i][1] = node.rotateLeft();
                }
                else if (d1 === -1 /* Dir.Left */ && d2 === -1 /* Dir.Left */) {
                    // left, left -> rotate right
                    stack[i][1] = node.rotateRight();
                }
                else if (d1 === 1 /* Dir.Right */ && d2 === -1 /* Dir.Left */) {
                    // right, left -> double rotate right, left
                    node.right = stack[i + 1][1] = stack[i + 1][1].rotateRight();
                    stack[i][1] = node.rotateLeft();
                }
                else if (d1 === -1 /* Dir.Left */ && d2 === 1 /* Dir.Right */) {
                    // left, right -> double rotate left, right
                    node.left = stack[i + 1][1] = stack[i + 1][1].rotateLeft();
                    stack[i][1] = node.rotateRight();
                }
                else {
                    throw new Error();
                }
                // patch path to parent
                if (i > 0) {
                    switch (stack[i - 1][0]) {
                        case -1 /* Dir.Left */:
                            stack[i - 1][1].left = stack[i][1];
                            break;
                        case 1 /* Dir.Right */:
                            stack[i - 1][1].right = stack[i][1];
                            break;
                        case 0 /* Dir.Mid */:
                            stack[i - 1][1].mid = stack[i][1];
                            break;
                    }
                }
                else {
                    this._root = stack[0][1];
                }
            }
        }
        return oldElement;
    }
    get(key) {
        return Undef.unwrap(this._getNode(key)?.value);
    }
    _getNode(key) {
        const iter = this._iter.reset(key);
        let node = this._root;
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                node = node.left;
            }
            else if (val < 0) {
                // right
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                node = node.mid;
            }
            else {
                break;
            }
        }
        return node;
    }
    has(key) {
        const node = this._getNode(key);
        return !(node?.value === undefined && node?.mid === undefined);
    }
    delete(key) {
        return this._delete(key, false);
    }
    deleteSuperstr(key) {
        return this._delete(key, true);
    }
    _delete(key, superStr) {
        const iter = this._iter.reset(key);
        const stack = [];
        let node = this._root;
        // find node
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                stack.push([-1 /* Dir.Left */, node]);
                node = node.left;
            }
            else if (val < 0) {
                // right
                stack.push([1 /* Dir.Right */, node]);
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                stack.push([0 /* Dir.Mid */, node]);
                node = node.mid;
            }
            else {
                break;
            }
        }
        if (!node) {
            // node not found
            return;
        }
        if (superStr) {
            // removing children, reset height
            node.left = undefined;
            node.mid = undefined;
            node.right = undefined;
            node.height = 1;
        }
        else {
            // removing element
            node.key = undefined;
            node.value = undefined;
        }
        // BST node removal
        if (!node.mid && !node.value) {
            if (node.left && node.right) {
                // full node
                // replace deleted-node with the min-node of the right branch.
                // If there is no true min-node leave things as they are
                const min = this._min(node.right);
                if (min.key) {
                    const { key, value, segment } = min;
                    this._delete(min.key, false);
                    node.key = key;
                    node.value = value;
                    node.segment = segment;
                }
            }
            else {
                // empty or half empty
                const newChild = node.left ?? node.right;
                if (stack.length > 0) {
                    const [dir, parent] = stack[stack.length - 1];
                    switch (dir) {
                        case -1 /* Dir.Left */:
                            parent.left = newChild;
                            break;
                        case 0 /* Dir.Mid */:
                            parent.mid = newChild;
                            break;
                        case 1 /* Dir.Right */:
                            parent.right = newChild;
                            break;
                    }
                }
                else {
                    this._root = newChild;
                }
            }
        }
        // AVL balance
        for (let i = stack.length - 1; i >= 0; i--) {
            const node = stack[i][1];
            node.updateHeight();
            const bf = node.balanceFactor();
            if (bf > 1) {
                // right heavy
                if (node.right.balanceFactor() >= 0) {
                    // right, right -> rotate left
                    stack[i][1] = node.rotateLeft();
                }
                else {
                    // right, left -> double rotate
                    node.right = node.right.rotateRight();
                    stack[i][1] = node.rotateLeft();
                }
            }
            else if (bf < -1) {
                // left heavy
                if (node.left.balanceFactor() <= 0) {
                    // left, left -> rotate right
                    stack[i][1] = node.rotateRight();
                }
                else {
                    // left, right -> double rotate
                    node.left = node.left.rotateLeft();
                    stack[i][1] = node.rotateRight();
                }
            }
            // patch path to parent
            if (i > 0) {
                switch (stack[i - 1][0]) {
                    case -1 /* Dir.Left */:
                        stack[i - 1][1].left = stack[i][1];
                        break;
                    case 1 /* Dir.Right */:
                        stack[i - 1][1].right = stack[i][1];
                        break;
                    case 0 /* Dir.Mid */:
                        stack[i - 1][1].mid = stack[i][1];
                        break;
                }
            }
            else {
                this._root = stack[0][1];
            }
        }
    }
    _min(node) {
        while (node.left) {
            node = node.left;
        }
        return node;
    }
    findSubstr(key) {
        const iter = this._iter.reset(key);
        let node = this._root;
        let candidate = undefined;
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                node = node.left;
            }
            else if (val < 0) {
                // right
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                candidate = Undef.unwrap(node.value) || candidate;
                node = node.mid;
            }
            else {
                break;
            }
        }
        return node && Undef.unwrap(node.value) || candidate;
    }
    findSuperstr(key) {
        return this._findSuperstrOrElement(key, false);
    }
    _findSuperstrOrElement(key, allowValue) {
        const iter = this._iter.reset(key);
        let node = this._root;
        while (node) {
            const val = iter.cmp(node.segment);
            if (val > 0) {
                // left
                node = node.left;
            }
            else if (val < 0) {
                // right
                node = node.right;
            }
            else if (iter.hasNext()) {
                // mid
                iter.next();
                node = node.mid;
            }
            else {
                // collect
                if (!node.mid) {
                    if (allowValue) {
                        return Undef.unwrap(node.value);
                    }
                    else {
                        return undefined;
                    }
                }
                else {
                    return this._entries(node.mid);
                }
            }
        }
        return undefined;
    }
    hasElementOrSubtree(key) {
        return this._findSuperstrOrElement(key, true) !== undefined;
    }
    forEach(callback) {
        for (const [key, value] of this) {
            callback(value, key);
        }
    }
    *[Symbol.iterator]() {
        yield* this._entries(this._root);
    }
    _entries(node) {
        const result = [];
        this._dfsEntries(node, result);
        return result[Symbol.iterator]();
    }
    _dfsEntries(node, bucket) {
        // DFS
        if (!node) {
            return;
        }
        if (node.left) {
            this._dfsEntries(node.left, bucket);
        }
        if (node.value !== undefined) {
            bucket.push([node.key, Undef.unwrap(node.value)]);
        }
        if (node.mid) {
            this._dfsEntries(node.mid, bucket);
        }
        if (node.right) {
            this._dfsEntries(node.right, bucket);
        }
    }
    // for debug/testing
    _isBalanced() {
        const nodeIsBalanced = (node) => {
            if (!node) {
                return true;
            }
            const bf = node.balanceFactor();
            if (bf < -1 || bf > 1) {
                return false;
            }
            return nodeIsBalanced(node.left) && nodeIsBalanced(node.right);
        };
        return nodeIsBalanced(this._root);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybmFyeVNlYXJjaFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdGVybmFyeVNlYXJjaFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUV0QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBWXhHLE1BQU0sT0FBTyxjQUFjO0lBQTNCO1FBRVMsV0FBTSxHQUFXLEVBQUUsQ0FBQztRQUNwQixTQUFJLEdBQVcsQ0FBQyxDQUFDO0lBMEIxQixDQUFDO0lBeEJBLEtBQUssQ0FBQyxHQUFXO1FBQ2hCLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ2YsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELEdBQUcsQ0FBQyxDQUFTO1FBQ1osTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsT0FBTyxLQUFLLEdBQUcsUUFBUSxDQUFDO0lBQ3pCLENBQUM7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
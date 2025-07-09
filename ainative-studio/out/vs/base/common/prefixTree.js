/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from './iterator.js';
const unset = Symbol('unset');
/**
 * A simple prefix tree implementation where a value is stored based on
 * well-defined prefix segments.
 */
export class WellDefinedPrefixTree {
    constructor() {
        this.root = new Node();
        this._size = 0;
    }
    /** Tree size, not including the root. */
    get size() {
        return this._size;
    }
    /** Gets the top-level nodes of the tree */
    get nodes() {
        return this.root.children?.values() || Iterable.empty();
    }
    /** Gets the top-level nodes of the tree */
    get entries() {
        return this.root.children?.entries() || Iterable.empty();
    }
    /**
     * Inserts a new value in the prefix tree.
     * @param onNode - called for each node as we descend to the insertion point,
     * including the insertion point itself.
     */
    insert(key, value, onNode) {
        this.opNode(key, n => n._value = value, onNode);
    }
    /** Mutates a value in the prefix tree. */
    mutate(key, mutate) {
        this.opNode(key, n => n._value = mutate(n._value === unset ? undefined : n._value));
    }
    /** Mutates nodes along the path in the prefix tree. */
    mutatePath(key, mutate) {
        this.opNode(key, () => { }, n => mutate(n));
    }
    /** Deletes a node from the prefix tree, returning the value it contained. */
    delete(key) {
        const path = this.getPathToKey(key);
        if (!path) {
            return;
        }
        let i = path.length - 1;
        const value = path[i].node._value;
        if (value === unset) {
            return; // not actually a real node
        }
        this._size--;
        path[i].node._value = unset;
        for (; i > 0; i--) {
            const { node, part } = path[i];
            if (node.children?.size || node._value !== unset) {
                break;
            }
            path[i - 1].node.children.delete(part);
        }
        return value;
    }
    /** Deletes a subtree from the prefix tree, returning the values they contained. */
    *deleteRecursive(key) {
        const path = this.getPathToKey(key);
        if (!path) {
            return;
        }
        const subtree = path[path.length - 1].node;
        // important: run the deletion before we start to yield results, so that
        // it still runs even if the caller doesn't consumer the iterator
        for (let i = path.length - 1; i > 0; i--) {
            const parent = path[i - 1];
            parent.node.children.delete(path[i].part);
            if (parent.node.children.size > 0 || parent.node._value !== unset) {
                break;
            }
        }
        for (const node of bfsIterate(subtree)) {
            if (node._value !== unset) {
                this._size--;
                yield node._value;
            }
        }
        // special case for the root note
        if (subtree === this.root) {
            this.root._value = unset;
            this.root.children = undefined;
        }
    }
    /** Gets a value from the tree. */
    find(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return undefined;
            }
            node = next;
        }
        return node._value === unset ? undefined : node._value;
    }
    /** Gets whether the tree has the key, or a parent of the key, already inserted. */
    hasKeyOrParent(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return false;
            }
            if (next._value !== unset) {
                return true;
            }
            node = next;
        }
        return false;
    }
    /** Gets whether the tree has the given key or any children. */
    hasKeyOrChildren(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return false;
            }
            node = next;
        }
        return true;
    }
    /** Gets whether the tree has the given key. */
    hasKey(key) {
        let node = this.root;
        for (const segment of key) {
            const next = node.children?.get(segment);
            if (!next) {
                return false;
            }
            node = next;
        }
        return node._value !== unset;
    }
    getPathToKey(key) {
        const path = [{ part: '', node: this.root }];
        let i = 0;
        for (const part of key) {
            const node = path[i].node.children?.get(part);
            if (!node) {
                return; // node not in tree
            }
            path.push({ part, node });
            i++;
        }
        return path;
    }
    opNode(key, fn, onDescend) {
        let node = this.root;
        for (const part of key) {
            if (!node.children) {
                const next = new Node();
                node.children = new Map([[part, next]]);
                node = next;
            }
            else if (!node.children.has(part)) {
                const next = new Node();
                node.children.set(part, next);
                node = next;
            }
            else {
                node = node.children.get(part);
            }
            onDescend?.(node);
        }
        const sizeBefore = node._value === unset ? 0 : 1;
        fn(node);
        const sizeAfter = node._value === unset ? 0 : 1;
        this._size += sizeAfter - sizeBefore;
    }
    /** Returns an iterable of the tree values in no defined order. */
    *values() {
        for (const { _value } of bfsIterate(this.root)) {
            if (_value !== unset) {
                yield _value;
            }
        }
    }
}
function* bfsIterate(root) {
    const stack = [root];
    while (stack.length > 0) {
        const node = stack.pop();
        yield node;
        if (node.children) {
            for (const child of node.children.values()) {
                stack.push(child);
            }
        }
    }
}
class Node {
    constructor() {
        this._value = unset;
    }
    get value() {
        return this._value === unset ? undefined : this._value;
    }
    set value(value) {
        this._value = value === undefined ? unset : value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZml4VHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wcmVmaXhUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFekMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBVTlCOzs7R0FHRztBQUNILE1BQU0sT0FBTyxxQkFBcUI7SUFBbEM7UUFDaUIsU0FBSSxHQUFHLElBQUksSUFBSSxFQUFLLENBQUM7UUFDN0IsVUFBSyxHQUFHLENBQUMsQ0FBQztJQStNbkIsQ0FBQztJQTdNQSx5Q0FBeUM7SUFDekMsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekQsQ0FBQztJQUVELDJDQUEyQztJQUMzQyxJQUFXLE9BQU87UUFDakIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDMUQsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsR0FBcUIsRUFBRSxLQUFRLEVBQUUsTUFBd0M7UUFDL0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsMENBQTBDO0lBQzFDLE1BQU0sQ0FB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { memoize } from './decorators.js';
import { PathIterator } from './ternarySearchTree.js';
import * as paths from './path.js';
import { extUri as defaultExtUri } from './resources.js';
import { URI } from './uri.js';
class Node {
    get childrenCount() {
        return this._children.size;
    }
    get children() {
        return this._children.values();
    }
    get name() {
        return paths.posix.basename(this.relativePath);
    }
    constructor(uri, relativePath, context, element = undefined, parent = undefined) {
        this.uri = uri;
        this.relativePath = relativePath;
        this.context = context;
        this.element = element;
        this.parent = parent;
        this._children = new Map();
    }
    get(path) {
        return this._children.get(path);
    }
    set(path, child) {
        this._children.set(path, child);
    }
    delete(path) {
        this._children.delete(path);
    }
    clear() {
        this._children.clear();
    }
}
__decorate([
    memoize
], Node.prototype, "name", null);
function collect(node, result) {
    if (typeof node.element !== 'undefined') {
        result.push(node.element);
    }
    for (const child of node.children) {
        collect(child, result);
    }
    return result;
}
export class ResourceTree {
    static getRoot(node) {
        while (node.parent) {
            node = node.parent;
        }
        return node;
    }
    static collect(node) {
        return collect(node, []);
    }
    static isResourceNode(obj) {
        return obj instanceof Node;
    }
    constructor(context, rootURI = URI.file('/'), extUri = defaultExtUri) {
        this.extUri = extUri;
        this.root = new Node(rootURI, '', context);
    }
    add(uri, element) {
        const key = this.extUri.relativePath(this.root.uri, uri) || uri.path;
        const iterator = new PathIterator(false).reset(key);
        let node = this.root;
        let path = '';
        while (true) {
            const name = iterator.value();
            path = path + '/' + name;
            let child = node.get(name);
            if (!child) {
                child = new Node(this.extUri.joinPath(this.root.uri, path), path, this.root.context, iterator.hasNext() ? undefined : element, node);
                node.set(name, child);
            }
            else if (!iterator.hasNext()) {
                child.element = element;
            }
            node = child;
            if (!iterator.hasNext()) {
                return;
            }
            iterator.next();
        }
    }
    delete(uri) {
        const key = this.extUri.relativePath(this.root.uri, uri) || uri.path;
        const iterator = new PathIterator(false).reset(key);
        return this._delete(this.root, iterator);
    }
    _delete(node, iterator) {
        const name = iterator.value();
        const child = node.get(name);
        if (!child) {
            return undefined;
        }
        if (iterator.hasNext()) {
            const result = this._delete(child, iterator.next());
            if (typeof result !== 'undefined' && child.childrenCount === 0) {
                node.delete(name);
            }
            return result;
        }
        node.delete(name);
        return child.element;
    }
    clear() {
        this.root.clear();
    }
    getNode(uri) {
        const key = this.extUri.relativePath(this.root.uri, uri) || uri.path;
        const iterator = new PathIterator(false).reset(key);
        let node = this.root;
        while (true) {
            const name = iterator.value();
            const child = node.get(name);
            if (!child || !iterator.hasNext()) {
                return child;
            }
            node = child;
            iterator.next();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3Jlc291cmNlVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDMUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sS0FBSyxLQUFLLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sRUFBRSxNQUFNLElBQUksYUFBYSxFQUFXLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQWMvQixNQUFNLElBQUk7SUFJVCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFHRCxJQUFJLElBQUk7UUFDUCxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsWUFDVSxHQUFRLEVBQ1IsWUFBb0IsRUFDcEIsT0FBVSxFQUNaLFVBQXlCLFNBQVMsRUFDaEMsU0FBMEMsU0FBUztRQUpuRCxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsWUFBTyxHQUFQLE9BQU8sQ0FBRztRQUNaLFlBQU8sR0FBUCxPQUFPLENBQTJCO1FBQ2hDLFdBQU0sR0FBTixNQUFNLENBQTZDO1FBcEJyRCxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXNC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
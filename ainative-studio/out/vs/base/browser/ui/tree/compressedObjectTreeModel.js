/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getVisibleState, isFilterResult } from './indexTreeModel.js';
import { ObjectTreeModel } from './objectTreeModel.js';
import { TreeError, WeakMapper } from './tree.js';
import { equals } from '../../../common/arrays.js';
import { Event } from '../../../common/event.js';
import { Iterable } from '../../../common/iterator.js';
function noCompress(element) {
    const elements = [element.element];
    const incompressible = element.incompressible || false;
    return {
        element: { elements, incompressible },
        children: Iterable.map(Iterable.from(element.children), noCompress),
        collapsible: element.collapsible,
        collapsed: element.collapsed
    };
}
// Exported only for test reasons, do not use directly
export function compress(element) {
    const elements = [element.element];
    const incompressible = element.incompressible || false;
    let childrenIterator;
    let children;
    while (true) {
        [children, childrenIterator] = Iterable.consume(Iterable.from(element.children), 2);
        if (children.length !== 1) {
            break;
        }
        if (children[0].incompressible) {
            break;
        }
        element = children[0];
        elements.push(element.element);
    }
    return {
        element: { elements, incompressible },
        children: Iterable.map(Iterable.concat(children, childrenIterator), compress),
        collapsible: element.collapsible,
        collapsed: element.collapsed
    };
}
function _decompress(element, index = 0) {
    let children;
    if (index < element.element.elements.length - 1) {
        children = [_decompress(element, index + 1)];
    }
    else {
        children = Iterable.map(Iterable.from(element.children), el => _decompress(el, 0));
    }
    if (index === 0 && element.element.incompressible) {
        return {
            element: element.element.elements[index],
            children,
            incompressible: true,
            collapsible: element.collapsible,
            collapsed: element.collapsed
        };
    }
    return {
        element: element.element.elements[index],
        children,
        collapsible: element.collapsible,
        collapsed: element.collapsed
    };
}
// Exported only for test reasons, do not use directly
export function decompress(element) {
    return _decompress(element, 0);
}
function splice(treeElement, element, children) {
    if (treeElement.element === element) {
        return { ...treeElement, children };
    }
    return { ...treeElement, children: Iterable.map(Iterable.from(treeElement.children), e => splice(e, element, children)) };
}
const wrapIdentityProvider = (base) => ({
    getId(node) {
        return node.elements.map(e => base.getId(e).toString()).join('\0');
    }
});
// Exported only for test reasons, do not use directly
export class CompressedObjectTreeModel {
    get onDidSpliceRenderedNodes() { return this.model.onDidSpliceRenderedNodes; }
    get onDidSpliceModel() { return this.model.onDidSpliceModel; }
    get onDidChangeCollapseState() { return this.model.onDidChangeCollapseState; }
    get onDidChangeRenderNodeCount() { return this.model.onDidChangeRenderNodeCount; }
    get size() { return this.nodes.size; }
    constructor(user, options = {}) {
        this.user = user;
        this.rootRef = null;
        this.nodes = new Map();
        this.model = new ObjectTreeModel(user, options);
        this.enabled = typeof options.compressionEnabled === 'undefined' ? true : options.compressionEnabled;
        this.identityProvider = options.identityProvider;
    }
    setChildren(element, children = Iterable.empty(), options) {
        // Diffs must be deep, since the compression can affect nested elements.
        // @see https://github.com/microsoft/vscode/pull/114237#issuecomment-759425034
        const diffIdentityProvider = options.diffIdentityProvider && wrapIdentityProvider(options.diffIdentityProvider);
        if (element === null) {
            const compressedChildren = Iterable.map(children, this.enabled ? compress : noCompress);
            this._setChildren(null, compressedChildren, { diffIdentityProvider, diffDepth: Infinity });
            return;
        }
        const compressedNode = this.nodes.get(element);
        if (!compressedNode) {
            throw new TreeError(this.user, 'Unknown compressed tree node');
        }
        const node = this.model.getNode(compressedNode);
        const compressedParentNode = this.model.getParentNodeLocation(compressedNode);
        const parent = this.model.getNode(compressedParentNode);
        const decompressedElement = decompress(node);
        const splicedElement = splice(decompressedElement, element, children);
        const recompressedElement = (this.enabled ? compress : noCompress)(splicedElement);
        // If the recompressed node is identical to the original, just set its children.
        // Saves work and churn diffing the parent element.
        const elementComparator = options.diffIdentityProvider
            ? ((a, b) => options.diffIdentityProvider.getId(a) === options.diffIdentityProvider.getId(b))
            : undefined;
        if (equals(recompressedElement.element.elements, node.element.elements, elementComparator)) {
            this._setChildren(compressedNode, recompressedElement.children || Iterable.empty(), { diffIdentityProvider, diffDepth: 1 });
            return;
        }
        const parentChildren = parent.children
            .map(child => child === node ? recompressedElement : child);
        this._setChildren(parent.element, parentChildren, {
            diffIdentityProvider,
            diffDepth: node.depth - parent.depth,
        });
    }
    isCompressionEnabled() {
        return this.enabled;
    }
    setCompressionEnabled(enabled) {
        if (enabled === this.enabled) {
            return;
        }
        this.enabled = enabled;
        const root = this.model.getNode();
        const rootChildren = root.children;
        const decompressedRootChildren = Iterable.map(rootChildren, decompress);
        const recompressedRootChildren = Iterable.map(decompressedRootChildren, enabled ? compress : noCompress);
        // it should be safe to always use deep diff mode here if an identity
        // provider is available, since we know the raw nodes are unchanged.
        this._setChildren(null, recompressedRootChildren, {
            diffIdentityProvider: this.identityProvider,
            diffDepth: Infinity,
        });
    }
    _setChildren(node, children, options) {
        const insertedElements = new Set();
        const onDidCreateNode = (node) => {
            for (const element of node.element.elements) {
                insertedElements.add(element);
                this.nodes.set(element, node.element);
            }
        };
        const onDidDeleteNode = (node) => {
            for (const element of node.element.elements) {
                if (!insertedElements.has(element)) {
                    this.nodes.delete(element);
                }
            }
        };
        this.model.setChildren(node, children, { ...options, onDidCreateNode, onDidDeleteNode });
    }
    has(element) {
        return this.nodes.has(element);
    }
    getListIndex(location) {
        const node = this.getCompressedNode(location);
        return this.model.getListIndex(node);
    }
    getListRenderCount(location) {
        const node = this.getCompressedNode(location);
        return this.model.getListRenderCount(node);
    }
    getNode(location) {
        if (typeof location === 'undefined') {
            return this.model.getNode();
        }
        const node = this.getCompressedNode(location);
        return this.model.getNode(node);
    }
    // TODO: review this
    getNodeLocation(node) {
        const compressedNode = this.model.getNodeLocation(node);
        if (compressedNode === null) {
            return null;
        }
        return compressedNode.elements[compressedNode.elements.length - 1];
    }
    // TODO: review this
    getParentNodeLocation(location) {
        const compressedNode = this.getCompressedNode(location);
        const parentNode = this.model.getParentNodeLocation(compressedNode);
        if (parentNode === null) {
            return null;
        }
        return parentNode.elements[parentNode.elements.length - 1];
    }
    getFirstElementChild(location) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.getFirstElementChild(compressedNode);
    }
    getLastElementAncestor(location) {
        const compressedNode = typeof location === 'undefined' ? undefined : this.getCompressedNode(location);
        return this.model.getLastElementAncestor(compressedNode);
    }
    isCollapsible(location) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.isCollapsible(compressedNode);
    }
    setCollapsible(location, collapsible) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.setCollapsible(compressedNode, collapsible);
    }
    isCollapsed(location) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.isCollapsed(compressedNode);
    }
    setCollapsed(location, collapsed, recursive) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.setCollapsed(compressedNode, collapsed, recursive);
    }
    expandTo(location) {
        const compressedNode = this.getCompressedNode(location);
        this.model.expandTo(compressedNode);
    }
    rerender(location) {
        const compressedNode = this.getCompressedNode(location);
        this.model.rerender(compressedNode);
    }
    refilter() {
        this.model.refilter();
    }
    resort(location = null, recursive = true) {
        const compressedNode = this.getCompressedNode(location);
        this.model.resort(compressedNode, recursive);
    }
    getCompressedNode(element) {
        if (element === null) {
            return null;
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        return node;
    }
}
export const DefaultElementMapper = elements => elements[elements.length - 1];
class CompressedTreeNodeWrapper {
    get element() { return this.node.element === null ? null : this.unwrapper(this.node.element); }
    get children() { return this.node.children.map(node => new CompressedTreeNodeWrapper(this.unwrapper, node)); }
    get depth() { return this.node.depth; }
    get visibleChildrenCount() { return this.node.visibleChildrenCount; }
    get visibleChildIndex() { return this.node.visibleChildIndex; }
    get collapsible() { return this.node.collapsible; }
    get collapsed() { return this.node.collapsed; }
    get visible() { return this.node.visible; }
    get filterData() { return this.node.filterData; }
    constructor(unwrapper, node) {
        this.unwrapper = unwrapper;
        this.node = node;
    }
}
function mapOptions(compressedNodeUnwrapper, options) {
    return {
        ...options,
        identityProvider: options.identityProvider && {
            getId(node) {
                return options.identityProvider.getId(compressedNodeUnwrapper(node));
            }
        },
        sorter: options.sorter && {
            compare(node, otherNode) {
                return options.sorter.compare(node.elements[0], otherNode.elements[0]);
            }
        },
        filter: options.filter && {
            filter(node, parentVisibility) {
                const elements = node.elements;
                for (let i = 0; i < elements.length - 1; i++) {
                    const result = options.filter.filter(elements[i], parentVisibility);
                    parentVisibility = getVisibleState(isFilterResult(result) ? result.visibility : result);
                }
                return options.filter.filter(elements[elements.length - 1], parentVisibility);
            }
        }
    };
}
export class CompressibleObjectTreeModel {
    get onDidSpliceModel() {
        return Event.map(this.model.onDidSpliceModel, ({ insertedNodes, deletedNodes }) => ({
            insertedNodes: insertedNodes.map(node => this.nodeMapper.map(node)),
            deletedNodes: deletedNodes.map(node => this.nodeMapper.map(node)),
        }));
    }
    get onDidSpliceRenderedNodes() {
        return Event.map(this.model.onDidSpliceRenderedNodes, ({ start, deleteCount, elements }) => ({
            start,
            deleteCount,
            elements: elements.map(node => this.nodeMapper.map(node))
        }));
    }
    get onDidChangeCollapseState() {
        return Event.map(this.model.onDidChangeCollapseState, ({ node, deep }) => ({
            node: this.nodeMapper.map(node),
            deep
        }));
    }
    get onDidChangeRenderNodeCount() {
        return Event.map(this.model.onDidChangeRenderNodeCount, node => this.nodeMapper.map(node));
    }
    constructor(user, options = {}) {
        this.rootRef = null;
        this.elementMapper = options.elementMapper || DefaultElementMapper;
        const compressedNodeUnwrapper = node => this.elementMapper(node.elements);
        this.nodeMapper = new WeakMapper(node => new CompressedTreeNodeWrapper(compressedNodeUnwrapper, node));
        this.model = new CompressedObjectTreeModel(user, mapOptions(compressedNodeUnwrapper, options));
    }
    setChildren(element, children = Iterable.empty(), options = {}) {
        this.model.setChildren(element, children, options);
    }
    isCompressionEnabled() {
        return this.model.isCompressionEnabled();
    }
    setCompressionEnabled(enabled) {
        this.model.setCompressionEnabled(enabled);
    }
    has(location) {
        return this.model.has(location);
    }
    getListIndex(location) {
        return this.model.getListIndex(location);
    }
    getListRenderCount(location) {
        return this.model.getListRenderCount(location);
    }
    getNode(location) {
        return this.nodeMapper.map(this.model.getNode(location));
    }
    getNodeLocation(node) {
        return node.element;
    }
    getParentNodeLocation(location) {
        return this.model.getParentNodeLocation(location);
    }
    getFirstElementChild(location) {
        const result = this.model.getFirstElementChild(location);
        if (result === null || typeof result === 'undefined') {
            return result;
        }
        return this.elementMapper(result.elements);
    }
    getLastElementAncestor(location) {
        const result = this.model.getLastElementAncestor(location);
        if (result === null || typeof result === 'undefined') {
            return result;
        }
        return this.elementMapper(result.elements);
    }
    isCollapsible(location) {
        return this.model.isCollapsible(location);
    }
    setCollapsible(location, collapsed) {
        return this.model.setCollapsible(location, collapsed);
    }
    isCollapsed(location) {
        return this.model.isCollapsed(location);
    }
    setCollapsed(location, collapsed, recursive) {
        return this.model.setCollapsed(location, collapsed, recursive);
    }
    expandTo(location) {
        return this.model.expandTo(location);
    }
    rerender(location) {
        return this.model.rerender(location);
    }
    refilter() {
        return this.model.refilter();
    }
    resort(element = null, recursive = true) {
        return this.model.resort(element, recursive);
    }
    getCompressedTreeNode(location = null) {
        return this.model.getNode(location);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3NlZE9iamVjdFRyZWVNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL2NvbXByZXNzZWRPYmplY3RUcmVlTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBZ0MsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDcEcsT0FBTyxFQUFpRixlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN0SSxPQUFPLEVBQW9ILFNBQVMsRUFBb0MsVUFBVSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3RNLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBY3ZELFNBQVMsVUFBVSxDQUFJLE9BQWtDO0lBQ3hELE1BQU0sUUFBUSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDO0lBRXZELE9BQU87UUFDTixPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFO1FBQ3JDLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFVBQVUsQ0FBQztRQUNuRSxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7UUFDaEMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO0tBQzVCLENBQUM7QUFDSCxDQUFDO0FBRUQsc0RBQXNEO0FBQ3RELE1BQU0sVUFBVSxRQUFR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
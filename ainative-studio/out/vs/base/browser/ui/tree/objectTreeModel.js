/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IndexTreeModel } from './indexTreeModel.js';
import { ObjectTreeElementCollapseState, TreeError } from './tree.js';
import { Iterable } from '../../../common/iterator.js';
export class ObjectTreeModel {
    get size() { return this.nodes.size; }
    constructor(user, options = {}) {
        this.user = user;
        this.rootRef = null;
        this.nodes = new Map();
        this.nodesByIdentity = new Map();
        this.model = new IndexTreeModel(user, null, options);
        this.onDidSpliceModel = this.model.onDidSpliceModel;
        this.onDidSpliceRenderedNodes = this.model.onDidSpliceRenderedNodes;
        this.onDidChangeCollapseState = this.model.onDidChangeCollapseState;
        this.onDidChangeRenderNodeCount = this.model.onDidChangeRenderNodeCount;
        if (options.sorter) {
            this.sorter = {
                compare(a, b) {
                    return options.sorter.compare(a.element, b.element);
                }
            };
        }
        this.identityProvider = options.identityProvider;
    }
    setChildren(element, children = Iterable.empty(), options = {}) {
        const location = this.getElementLocation(element);
        this._setChildren(location, this.preserveCollapseState(children), options);
    }
    _setChildren(location, children = Iterable.empty(), options) {
        const insertedElements = new Set();
        const insertedElementIds = new Set();
        const onDidCreateNode = (node) => {
            if (node.element === null) {
                return;
            }
            const tnode = node;
            insertedElements.add(tnode.element);
            this.nodes.set(tnode.element, tnode);
            if (this.identityProvider) {
                const id = this.identityProvider.getId(tnode.element).toString();
                insertedElementIds.add(id);
                this.nodesByIdentity.set(id, tnode);
            }
            options.onDidCreateNode?.(tnode);
        };
        const onDidDeleteNode = (node) => {
            if (node.element === null) {
                return;
            }
            const tnode = node;
            if (!insertedElements.has(tnode.element)) {
                this.nodes.delete(tnode.element);
            }
            if (this.identityProvider) {
                const id = this.identityProvider.getId(tnode.element).toString();
                if (!insertedElementIds.has(id)) {
                    this.nodesByIdentity.delete(id);
                }
            }
            options.onDidDeleteNode?.(tnode);
        };
        this.model.splice([...location, 0], Number.MAX_VALUE, children, { ...options, onDidCreateNode, onDidDeleteNode });
    }
    preserveCollapseState(elements = Iterable.empty()) {
        if (this.sorter) {
            elements = [...elements].sort(this.sorter.compare.bind(this.sorter));
        }
        return Iterable.map(elements, treeElement => {
            let node = this.nodes.get(treeElement.element);
            if (!node && this.identityProvider) {
                const id = this.identityProvider.getId(treeElement.element).toString();
                node = this.nodesByIdentity.get(id);
            }
            if (!node) {
                let collapsed;
                if (typeof treeElement.collapsed === 'undefined') {
                    collapsed = undefined;
                }
                else if (treeElement.collapsed === ObjectTreeElementCollapseState.Collapsed || treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrCollapsed) {
                    collapsed = true;
                }
                else if (treeElement.collapsed === ObjectTreeElementCollapseState.Expanded || treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrExpanded) {
                    collapsed = false;
                }
                else {
                    collapsed = Boolean(treeElement.collapsed);
                }
                return {
                    ...treeElement,
                    children: this.preserveCollapseState(treeElement.children),
                    collapsed
                };
            }
            const collapsible = typeof treeElement.collapsible === 'boolean' ? treeElement.collapsible : node.collapsible;
            let collapsed;
            if (typeof treeElement.collapsed === 'undefined' || treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrCollapsed || treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrExpanded) {
                collapsed = node.collapsed;
            }
            else if (treeElement.collapsed === ObjectTreeElementCollapseState.Collapsed) {
                collapsed = true;
            }
            else if (treeElement.collapsed === ObjectTreeElementCollapseState.Expanded) {
                collapsed = false;
            }
            else {
                collapsed = Boolean(treeElement.collapsed);
            }
            return {
                ...treeElement,
                collapsible,
                collapsed,
                children: this.preserveCollapseState(treeElement.children)
            };
        });
    }
    rerender(element) {
        const location = this.getElementLocation(element);
        this.model.rerender(location);
    }
    resort(element = null, recursive = true) {
        if (!this.sorter) {
            return;
        }
        const location = this.getElementLocation(element);
        const node = this.model.getNode(location);
        this._setChildren(location, this.resortChildren(node, recursive), {});
    }
    resortChildren(node, recursive, first = true) {
        let childrenNodes = [...node.children];
        if (recursive || first) {
            childrenNodes = childrenNodes.sort(this.sorter.compare.bind(this.sorter));
        }
        return Iterable.map(childrenNodes, node => ({
            element: node.element,
            collapsible: node.collapsible,
            collapsed: node.collapsed,
            children: this.resortChildren(node, recursive, false)
        }));
    }
    getFirstElementChild(ref = null) {
        const location = this.getElementLocation(ref);
        return this.model.getFirstElementChild(location);
    }
    getLastElementAncestor(ref = null) {
        const location = this.getElementLocation(ref);
        return this.model.getLastElementAncestor(location);
    }
    has(element) {
        return this.nodes.has(element);
    }
    getListIndex(element) {
        const location = this.getElementLocation(element);
        return this.model.getListIndex(location);
    }
    getListRenderCount(element) {
        const location = this.getElementLocation(element);
        return this.model.getListRenderCount(location);
    }
    isCollapsible(element) {
        const location = this.getElementLocation(element);
        return this.model.isCollapsible(location);
    }
    setCollapsible(element, collapsible) {
        const location = this.getElementLocation(element);
        return this.model.setCollapsible(location, collapsible);
    }
    isCollapsed(element) {
        const location = this.getElementLocation(element);
        return this.model.isCollapsed(location);
    }
    setCollapsed(element, collapsed, recursive) {
        const location = this.getElementLocation(element);
        return this.model.setCollapsed(location, collapsed, recursive);
    }
    expandTo(element) {
        const location = this.getElementLocation(element);
        this.model.expandTo(location);
    }
    refilter() {
        this.model.refilter();
    }
    getNode(element = null) {
        if (element === null) {
            return this.model.getNode(this.model.rootRef);
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        return node;
    }
    getNodeLocation(node) {
        return node.element;
    }
    getParentNodeLocation(element) {
        if (element === null) {
            throw new TreeError(this.user, `Invalid getParentNodeLocation call`);
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        const location = this.model.getNodeLocation(node);
        const parentLocation = this.model.getParentNodeLocation(location);
        const parent = this.model.getNode(parentLocation);
        return parent.element;
    }
    getElementLocation(element) {
        if (element === null) {
            return [];
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        return this.model.getNodeLocation(node);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0VHJlZU1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL29iamVjdFRyZWVNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQXdELGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNHLE9BQU8sRUFBK0ksOEJBQThCLEVBQUUsU0FBUyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRW5OLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQWlCdkQsTUFBTSxPQUFPLGVBQWU7SUFlM0IsSUFBSSxJQUFJLEtBQWEsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFOUMsWUFDUyxJQUFZLEVBQ3BCLFVBQW1ELEVBQUU7UUFEN0MsU0FBSSxHQUFKLElBQUksQ0FBUTtRQWhCWixZQUFPLEdBQUcsSUFBSSxDQUFDO1FBR2hCLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBdUMsQ0FBQztRQUM5QyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1FBZS9FLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztRQUNwRCxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQztRQUNwRSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBNEUsQ0FBQztRQUN4SCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLEtB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
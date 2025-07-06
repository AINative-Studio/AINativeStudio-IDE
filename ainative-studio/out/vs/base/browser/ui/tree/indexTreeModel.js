/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TreeError } from './tree.js';
import { splice, tail } from '../../../common/arrays.js';
import { Delayer } from '../../../common/async.js';
import { MicrotaskDelay } from '../../../common/symbols.js';
import { LcsDiff } from '../../../common/diff/diff.js';
import { Emitter, EventBufferer } from '../../../common/event.js';
import { Iterable } from '../../../common/iterator.js';
export function isFilterResult(obj) {
    return typeof obj === 'object' && 'visibility' in obj && 'data' in obj;
}
export function getVisibleState(visibility) {
    switch (visibility) {
        case true: return 1 /* TreeVisibility.Visible */;
        case false: return 0 /* TreeVisibility.Hidden */;
        default: return visibility;
    }
}
function isCollapsibleStateUpdate(update) {
    return typeof update.collapsible === 'boolean';
}
export class IndexTreeModel {
    constructor(user, rootElement, options = {}) {
        this.user = user;
        this.rootRef = [];
        this.eventBufferer = new EventBufferer();
        this._onDidSpliceModel = new Emitter();
        this.onDidSpliceModel = this._onDidSpliceModel.event;
        this._onDidSpliceRenderedNodes = new Emitter();
        this.onDidSpliceRenderedNodes = this._onDidSpliceRenderedNodes.event;
        this._onDidChangeCollapseState = new Emitter();
        this.onDidChangeCollapseState = this.eventBufferer.wrapEvent(this._onDidChangeCollapseState.event);
        this._onDidChangeRenderNodeCount = new Emitter();
        this.onDidChangeRenderNodeCount = this.eventBufferer.wrapEvent(this._onDidChangeRenderNodeCount.event);
        this.refilterDelayer = new Delayer(MicrotaskDelay);
        this.collapseByDefault = typeof options.collapseByDefault === 'undefined' ? false : options.collapseByDefault;
        this.allowNonCollapsibleParents = options.allowNonCollapsibleParents ?? false;
        this.filter = options.filter;
        this.autoExpandSingleChildren = typeof options.autoExpandSingleChildren === 'undefined' ? false : options.autoExpandSingleChildren;
        this.root = {
            parent: undefined,
            element: rootElement,
            children: [],
            depth: 0,
            visibleChildrenCount: 0,
            visibleChildIndex: -1,
            collapsible: false,
            collapsed: false,
            renderNodeCount: 0,
            visibility: 1 /* TreeVisibility.Visible */,
            visible: true,
            filterData: undefined
        };
    }
    splice(location, deleteCount, toInsert = Iterable.empty(), options = {}) {
        if (location.length === 0) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        if (options.diffIdentityProvider) {
            this.spliceSmart(options.diffIdentityProvider, location, deleteCount, toInsert, options);
        }
        else {
            this.spliceSimple(location, deleteCount, toInsert, options);
        }
    }
    spliceSmart(identity, location, deleteCount, toInsertIterable = Iterable.empty(), options, recurseLevels = options.diffDepth ?? 0) {
        const { parentNode } = this.getParentNodeWithListIndex(location);
        if (!parentNode.lastDiffIds) {
            return this.spliceSimple(location, deleteCount, toInsertIterable, options);
        }
        const toInsert = [...toInsertIterable];
        const index = location[location.length - 1];
        const diff = new LcsDiff({ getElements: () => parentNode.lastDiffIds }, {
            getElements: () => [
                ...parentNode.children.slice(0, index),
                ...toInsert,
                ...parentNode.children.slice(index + deleteCount),
            ].map(e => identity.getId(e.element).toString())
        }).ComputeDiff(false);
        // if we were given a 'best effort' diff, use default behavior
        if (diff.quitEarly) {
            parentNode.lastDiffIds = undefined;
            return this.spliceSimple(location, deleteCount, toInsert, options);
        }
        const locationPrefix = location.slice(0, -1);
        const recurseSplice = (fromOriginal, fromModified, count) => {
            if (recurseLevels > 0) {
                for (let i = 0; i < count; i++) {
                    fromOriginal--;
                    fromModified--;
                    this.spliceSmart(identity, [...locationPrefix, fromOriginal, 0], Number.MAX_SAFE_INTEGER, toInsert[fromModified].children, options, recurseLevels - 1);
                }
            }
        };
        let lastStartO = Math.min(parentNode.children.length, index + deleteCount);
        let lastStartM = toInsert.length;
        for (const change of diff.changes.sort((a, b) => b.originalStart - a.originalStart)) {
            recurseSplice(lastStartO, lastStartM, lastStartO - (change.originalStart + change.originalLength));
            lastStartO = change.originalStart;
            lastStartM = change.modifiedStart - index;
            this.spliceSimple([...locationPrefix, lastStartO], change.originalLength, Iterable.slice(toInsert, lastStartM, lastStartM + change.modifiedLength), options);
        }
        // at this point, startO === startM === count since any remaining prefix should match
        recurseSplice(lastStartO, lastStartM, lastStartO);
    }
    spliceSimple(location, deleteCount, toInsert = Iterable.empty(), { onDidCreateNode, onDidDeleteNode, diffIdentityProvider }) {
        const { parentNode, listIndex, revealed, visible } = this.getParentNodeWithListIndex(location);
        const treeListElementsToInsert = [];
        const nodesToInsertIterator = Iterable.map(toInsert, el => this.createTreeNode(el, parentNode, parentNode.visible ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */, revealed, treeListElementsToInsert, onDidCreateNode));
        const lastIndex = location[location.length - 1];
        // figure out what's the visible child start index right before the
        // splice point
        let visibleChildStartIndex = 0;
        for (let i = lastIndex; i >= 0 && i < parentNode.children.length; i--) {
            const child = parentNode.children[i];
            if (child.visible) {
                visibleChildStartIndex = child.visibleChildIndex;
                break;
            }
        }
        const nodesToInsert = [];
        let insertedVisibleChildrenCount = 0;
        let renderNodeCount = 0;
        for (const child of nodesToInsertIterator) {
            nodesToInsert.push(child);
            renderNodeCount += child.renderNodeCount;
            if (child.visible) {
                child.visibleChildIndex = visibleChildStartIndex + insertedVisibleChildrenCount++;
            }
        }
        const deletedNodes = splice(parentNode.children, lastIndex, deleteCount, nodesToInsert);
        if (!diffIdentityProvider) {
            parentNode.lastDiffIds = undefined;
        }
        else if (parentNode.lastDiffIds) {
            splice(parentNode.lastDiffIds, lastIndex, deleteCount, nodesToInsert.map(n => diffIdentityProvider.getId(n.element).toString()));
        }
        else {
            parentNode.lastDiffIds = parentNode.children.map(n => diffIdentityProvider.getId(n.element).toString());
        }
        // figure out what is the count of deleted visible children
        let deletedVisibleChildrenCount = 0;
        for (const child of deletedNodes) {
            if (child.visible) {
                deletedVisibleChildrenCount++;
            }
        }
        // and adjust for all visible children after the splice point
        if (deletedVisibleChildrenCount !== 0) {
            for (let i = lastIndex + nodesToInsert.length; i < parentNode.children.length; i++) {
                const child = parentNode.children[i];
                if (child.visible) {
                    child.visibleChildIndex -= deletedVisibleChildrenCount;
                }
            }
        }
        // update parent's visible children count
        parentNode.visibleChildrenCount += insertedVisibleChildrenCount - deletedVisibleChildrenCount;
        if (deletedNodes.length > 0 && onDidDeleteNode) {
            const visit = (node) => {
                onDidDeleteNode(node);
                node.children.forEach(visit);
            };
            deletedNodes.forEach(visit);
        }
        if (revealed && visible) {
            const visibleDeleteCount = deletedNodes.reduce((r, node) => r + (node.visible ? node.renderNodeCount : 0), 0);
            this._updateAncestorsRenderNodeCount(parentNode, renderNodeCount - visibleDeleteCount);
            this._onDidSpliceRenderedNodes.fire({ start: listIndex, deleteCount: visibleDeleteCount, elements: treeListElementsToInsert });
        }
        this._onDidSpliceModel.fire({ insertedNodes: nodesToInsert, deletedNodes });
        let node = parentNode;
        while (node) {
            if (node.visibility === 2 /* TreeVisibility.Recurse */) {
                // delayed to avoid excessive refiltering, see #135941
                this.refilterDelayer.trigger(() => this.refilter());
                break;
            }
            node = node.parent;
        }
    }
    rerender(location) {
        if (location.length === 0) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        const { node, listIndex, revealed } = this.getTreeNodeWithListIndex(location);
        if (node.visible && revealed) {
            this._onDidSpliceRenderedNodes.fire({ start: listIndex, deleteCount: 1, elements: [node] });
        }
    }
    has(location) {
        return this.hasTreeNode(location);
    }
    getListIndex(location) {
        const { listIndex, visible, revealed } = this.getTreeNodeWithListIndex(location);
        return visible && revealed ? listIndex : -1;
    }
    getListRenderCount(location) {
        return this.getTreeNode(location).renderNodeCount;
    }
    isCollapsible(location) {
        return this.getTreeNode(location).collapsible;
    }
    setCollapsible(location, collapsible) {
        const node = this.getTreeNode(location);
        if (typeof collapsible === 'undefined') {
            collapsible = !node.collapsible;
        }
        const update = { collapsible };
        return this.eventBufferer.bufferEvents(() => this._setCollapseState(location, update));
    }
    isCollapsed(location) {
        return this.getTreeNode(location).collapsed;
    }
    setCollapsed(location, collapsed, recursive) {
        const node = this.getTreeNode(location);
        if (typeof collapsed === 'undefined') {
            collapsed = !node.collapsed;
        }
        const update = { collapsed, recursive: recursive || false };
        return this.eventBufferer.bufferEvents(() => this._setCollapseState(location, update));
    }
    _setCollapseState(location, update) {
        const { node, listIndex, revealed } = this.getTreeNodeWithListIndex(location);
        const result = this._setListNodeCollapseState(node, listIndex, revealed, update);
        if (node !== this.root && this.autoExpandSingleChildren && result && !isCollapsibleStateUpdate(update) && node.collapsible && !node.collapsed && !update.recursive) {
            let onlyVisibleChildIndex = -1;
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                if (child.visible) {
                    if (onlyVisibleChildIndex > -1) {
                        onlyVisibleChildIndex = -1;
                        break;
                    }
                    else {
                        onlyVisibleChildIndex = i;
                    }
                }
            }
            if (onlyVisibleChildIndex > -1) {
                this._setCollapseState([...location, onlyVisibleChildIndex], update);
            }
        }
        return result;
    }
    _setListNodeCollapseState(node, listIndex, revealed, update) {
        const result = this._setNodeCollapseState(node, update, false);
        if (!revealed || !node.visible || !result) {
            return result;
        }
        const previousRenderNodeCount = node.renderNodeCount;
        const toInsert = this.updateNodeAfterCollapseChange(node);
        const deleteCount = previousRenderNodeCount - (listIndex === -1 ? 0 : 1);
        this._onDidSpliceRenderedNodes.fire({ start: listIndex + 1, deleteCount: deleteCount, elements: toInsert.slice(1) });
        return result;
    }
    _setNodeCollapseState(node, update, deep) {
        let result;
        if (node === this.root) {
            result = false;
        }
        else {
            if (isCollapsibleStateUpdate(update)) {
                result = node.collapsible !== update.collapsible;
                node.collapsible = update.collapsible;
            }
            else if (!node.collapsible) {
                result = false;
            }
            else {
                result = node.collapsed !== update.collapsed;
                node.collapsed = update.collapsed;
            }
            if (result) {
                this._onDidChangeCollapseState.fire({ node, deep });
            }
        }
        if (!isCollapsibleStateUpdate(update) && update.recursive) {
            for (const child of node.children) {
                result = this._setNodeCollapseState(child, update, true) || result;
            }
        }
        return result;
    }
    expandTo(location) {
        this.eventBufferer.bufferEvents(() => {
            let node = this.getTreeNode(location);
            while (node.parent) {
                node = node.parent;
                location = location.slice(0, location.length - 1);
                if (node.collapsed) {
                    this._setCollapseState(location, { collapsed: false, recursive: false });
                }
            }
        });
    }
    refilter() {
        const previousRenderNodeCount = this.root.renderNodeCount;
        const toInsert = this.updateNodeAfterFilterChange(this.root);
        this._onDidSpliceRenderedNodes.fire({ start: 0, deleteCount: previousRenderNodeCount, elements: toInsert });
        this.refilterDelayer.cancel();
    }
    createTreeNode(treeElement, parent, parentVisibility, revealed, treeListElements, onDidCreateNode) {
        const node = {
            parent,
            element: treeElement.element,
            children: [],
            depth: parent.depth + 1,
            visibleChildrenCount: 0,
            visibleChildIndex: -1,
            collapsible: typeof treeElement.collapsible === 'boolean' ? treeElement.collapsible : (typeof treeElement.collapsed !== 'undefined'),
            collapsed: typeof treeElement.collapsed === 'undefined' ? this.collapseByDefault : treeElement.collapsed,
            renderNodeCount: 1,
            visibility: 1 /* TreeVisibility.Visible */,
            visible: true,
            filterData: undefined
        };
        const visibility = this._filterNode(node, parentVisibility);
        node.visibility = visibility;
        if (revealed) {
            treeListElements.push(node);
        }
        const childElements = treeElement.children || Iterable.empty();
        const childRevealed = revealed && visibility !== 0 /* TreeVisibility.Hidden */ && !node.collapsed;
        let visibleChildrenCount = 0;
        let renderNodeCount = 1;
        for (const el of childElements) {
            const child = this.createTreeNode(el, node, visibility, childRevealed, treeListElements, onDidCreateNode);
            node.children.push(child);
            renderNodeCount += child.renderNodeCount;
            if (child.visible) {
                child.visibleChildIndex = visibleChildrenCount++;
            }
        }
        if (!this.allowNonCollapsibleParents) {
            node.collapsible = node.collapsible || node.children.length > 0;
        }
        node.visibleChildrenCount = visibleChildrenCount;
        node.visible = visibility === 2 /* TreeVisibility.Recurse */ ? visibleChildrenCount > 0 : (visibility === 1 /* TreeVisibility.Visible */);
        if (!node.visible) {
            node.renderNodeCount = 0;
            if (revealed) {
                treeListElements.pop();
            }
        }
        else if (!node.collapsed) {
            node.renderNodeCount = renderNodeCount;
        }
        onDidCreateNode?.(node);
        return node;
    }
    updateNodeAfterCollapseChange(node) {
        const previousRenderNodeCount = node.renderNodeCount;
        const result = [];
        this._updateNodeAfterCollapseChange(node, result);
        this._updateAncestorsRenderNodeCount(node.parent, result.length - previousRenderNodeCount);
        return result;
    }
    _updateNodeAfterCollapseChange(node, result) {
        if (node.visible === false) {
            return 0;
        }
        result.push(node);
        node.renderNodeCount = 1;
        if (!node.collapsed) {
            for (const child of node.children) {
                node.renderNodeCount += this._updateNodeAfterCollapseChange(child, result);
            }
        }
        this._onDidChangeRenderNodeCount.fire(node);
        return node.renderNodeCount;
    }
    updateNodeAfterFilterChange(node) {
        const previousRenderNodeCount = node.renderNodeCount;
        const result = [];
        this._updateNodeAfterFilterChange(node, node.visible ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */, result);
        this._updateAncestorsRenderNodeCount(node.parent, result.length - previousRenderNodeCount);
        return result;
    }
    _updateNodeAfterFilterChange(node, parentVisibility, result, revealed = true) {
        let visibility;
        if (node !== this.root) {
            visibility = this._filterNode(node, parentVisibility);
            if (visibility === 0 /* TreeVisibility.Hidden */) {
                node.visible = false;
                node.renderNodeCount = 0;
                return false;
            }
            if (revealed) {
                result.push(node);
            }
        }
        const resultStartLength = result.length;
        node.renderNodeCount = node === this.root ? 0 : 1;
        let hasVisibleDescendants = false;
        if (!node.collapsed || visibility !== 0 /* TreeVisibility.Hidden */) {
            let visibleChildIndex = 0;
            for (const child of node.children) {
                hasVisibleDescendants = this._updateNodeAfterFilterChange(child, visibility, result, revealed && !node.collapsed) || hasVisibleDescendants;
                if (child.visible) {
                    child.visibleChildIndex = visibleChildIndex++;
                }
            }
            node.visibleChildrenCount = visibleChildIndex;
        }
        else {
            node.visibleChildrenCount = 0;
        }
        if (node !== this.root) {
            node.visible = visibility === 2 /* TreeVisibility.Recurse */ ? hasVisibleDescendants : (visibility === 1 /* TreeVisibility.Visible */);
            node.visibility = visibility;
        }
        if (!node.visible) {
            node.renderNodeCount = 0;
            if (revealed) {
                result.pop();
            }
        }
        else if (!node.collapsed) {
            node.renderNodeCount += result.length - resultStartLength;
        }
        this._onDidChangeRenderNodeCount.fire(node);
        return node.visible;
    }
    _updateAncestorsRenderNodeCount(node, diff) {
        if (diff === 0) {
            return;
        }
        while (node) {
            node.renderNodeCount += diff;
            this._onDidChangeRenderNodeCount.fire(node);
            node = node.parent;
        }
    }
    _filterNode(node, parentVisibility) {
        const result = this.filter ? this.filter.filter(node.element, parentVisibility) : 1 /* TreeVisibility.Visible */;
        if (typeof result === 'boolean') {
            node.filterData = undefined;
            return result ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
        }
        else if (isFilterResult(result)) {
            node.filterData = result.data;
            return getVisibleState(result.visibility);
        }
        else {
            node.filterData = undefined;
            return getVisibleState(result);
        }
    }
    // cheap
    hasTreeNode(location, node = this.root) {
        if (!location || location.length === 0) {
            return true;
        }
        const [index, ...rest] = location;
        if (index < 0 || index > node.children.length) {
            return false;
        }
        return this.hasTreeNode(rest, node.children[index]);
    }
    // cheap
    getTreeNode(location, node = this.root) {
        if (!location || location.length === 0) {
            return node;
        }
        const [index, ...rest] = location;
        if (index < 0 || index > node.children.length) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        return this.getTreeNode(rest, node.children[index]);
    }
    // expensive
    getTreeNodeWithListIndex(location) {
        if (location.length === 0) {
            return { node: this.root, listIndex: -1, revealed: true, visible: false };
        }
        const { parentNode, listIndex, revealed, visible } = this.getParentNodeWithListIndex(location);
        const index = location[location.length - 1];
        if (index < 0 || index > parentNode.children.length) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        const node = parentNode.children[index];
        return { node, listIndex, revealed, visible: visible && node.visible };
    }
    getParentNodeWithListIndex(location, node = this.root, listIndex = 0, revealed = true, visible = true) {
        const [index, ...rest] = location;
        if (index < 0 || index > node.children.length) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        // TODO@joao perf!
        for (let i = 0; i < index; i++) {
            listIndex += node.children[i].renderNodeCount;
        }
        revealed = revealed && !node.collapsed;
        visible = visible && node.visible;
        if (rest.length === 0) {
            return { parentNode: node, listIndex, revealed, visible };
        }
        return this.getParentNodeWithListIndex(rest, node.children[index], listIndex + 1, revealed, visible);
    }
    getNode(location = []) {
        return this.getTreeNode(location);
    }
    // TODO@joao perf!
    getNodeLocation(node) {
        const location = [];
        let indexTreeNode = node; // typing woes
        while (indexTreeNode.parent) {
            location.push(indexTreeNode.parent.children.indexOf(indexTreeNode));
            indexTreeNode = indexTreeNode.parent;
        }
        return location.reverse();
    }
    getParentNodeLocation(location) {
        if (location.length === 0) {
            return undefined;
        }
        else if (location.length === 1) {
            return [];
        }
        else {
            return tail(location)[0];
        }
    }
    getFirstElementChild(location) {
        const node = this.getTreeNode(location);
        if (node.children.length === 0) {
            return undefined;
        }
        return node.children[0].element;
    }
    getLastElementAncestor(location = []) {
        const node = this.getTreeNode(location);
        if (node.children.length === 0) {
            return undefined;
        }
        return this._getLastElementAncestor(node);
    }
    _getLastElementAncestor(node) {
        if (node.children.length === 0) {
            return node.element;
        }
        return this._getLastElementAncestor(node.children[node.children.length - 1]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmVlTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdHJlZS9pbmRleFRyZWVNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWtKLFNBQVMsRUFBa0IsTUFBTSxXQUFXLENBQUM7QUFDdE0sT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFTLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQWlCdkQsTUFBTSxVQUFVLGNBQWMsQ0FBSSxHQUFRO0lBQ3pDLE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLFlBQVksSUFBSSxHQUFHLElBQUksTUFBTSxJQUFJLEdBQUcsQ0FBQztBQUN4RSxDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxVQUFvQztJQUNuRSxRQUFRLFVBQVUsRUFBRSxDQUFDO1FBQ3BCLEtBQUssSUFBSSxDQUFDLENBQUMsc0NBQThCO1FBQ3pDLEtBQUssS0FBSyxDQUFDLENBQUMscUNBQTZCO1FBQ3pDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sVUFBVSxDQUFDO0lBQzVCLENBQUM7QUFDRixDQUFDO0FBZ0RELFNBQVMsd0JBQXdCLENBQUMsTUFBMkI7SUFDNUQsT0FBTyxPQUFRLE1BQWMsQ0FBQyxXQUFXLEtBQUssU0FB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
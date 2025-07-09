/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { basename } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { NoTreeViewError } from '../../common/views.js';
import { asPromise } from '../../../base/common/async.js';
import * as extHostTypes from './extHostTypes.js';
import { isUndefinedOrNull, isString } from '../../../base/common/types.js';
import { equals, coalesce } from '../../../base/common/arrays.js';
import { MarkdownString, ViewBadge, DataTransfer } from './extHostTypeConverters.js';
import { isMarkdownString } from '../../../base/common/htmlContent.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { TreeViewsDnDService } from '../../../editor/common/services/treeViewsDnd.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
function toTreeItemLabel(label, extension) {
    if (isString(label)) {
        return { label };
    }
    if (label
        && typeof label === 'object'
        && typeof label.label === 'string') {
        let highlights = undefined;
        if (Array.isArray(label.highlights)) {
            highlights = label.highlights.filter((highlight => highlight.length === 2 && typeof highlight[0] === 'number' && typeof highlight[1] === 'number'));
            highlights = highlights.length ? highlights : undefined;
        }
        return { label: label.label, highlights };
    }
    return undefined;
}
export class ExtHostTreeViews extends Disposable {
    constructor(_proxy, commands, logService) {
        super();
        this._proxy = _proxy;
        this.commands = commands;
        this.logService = logService;
        this.treeViews = new Map();
        this.treeDragAndDropService = new TreeViewsDnDService();
        function isTreeViewConvertableItem(arg) {
            return arg && arg.$treeViewId && (arg.$treeItemHandle || arg.$selectedTreeItems || arg.$focusedTreeItem);
        }
        commands.registerArgumentProcessor({
            processArgument: arg => {
                if (isTreeViewConvertableItem(arg)) {
                    return this.convertArgument(arg);
                }
                else if (Array.isArray(arg) && (arg.length > 0)) {
                    return arg.map(item => {
                        if (isTreeViewConvertableItem(item)) {
                            return this.convertArgument(item);
                        }
                        return item;
                    });
                }
                return arg;
            }
        });
    }
    registerTreeDataProvider(id, treeDataProvider, extension) {
        const treeView = this.createTreeView(id, { treeDataProvider }, extension);
        return { dispose: () => treeView.dispose() };
    }
    createTreeView(viewId, options, extension) {
        if (!options || !options.treeDataProvider) {
            throw new Error('Options with treeDataProvider is mandatory');
        }
        const dropMimeTypes = options.dragAndDropController?.dropMimeTypes ?? [];
        const dragMimeTypes = options.dragAndDropController?.dragMimeTypes ?? [];
        const hasHandleDrag = !!options.dragAndDropController?.handleDrag;
        const hasHandleDrop = !!options.dragAndDropController?.handleDrop;
        const treeView = this.createExtHostTreeView(viewId, options, extension);
        const proxyOptions = { showCollapseAll: !!options.showCollapseAll, canSelectMany: !!options.canSelectMany, dropMimeTypes, dragMimeTypes, hasHandleDrag, hasHandleDrop, manuallyManageCheckboxes: !!options.manageCheckboxStateManually };
        const registerPromise = this._proxy.$registerTreeViewDataProvider(viewId, proxyOptions);
        const view = {
            get onDidCollapseElement() { return treeView.onDidCollapseElement; },
            get onDidExpandElement() { return treeView.onDidExpandElement; },
            get selection() { return treeView.selectedElements; },
            get onDidChangeSelection() { return treeView.onDidChangeSelection; },
            get activeItem() {
                checkProposedApiEnabled(extension, 'treeViewActiveItem');
                return treeView.focusedElement;
            },
            get onDidChangeActiveItem() {
                checkProposedApiEnabled(extension, 'treeViewActiveItem');
                return treeView.onDidChangeActiveItem;
            },
            get visible() { return treeView.visible; },
            get onDidChangeVisibility() { return treeView.onDidChangeVisibility; },
            get onDidChangeCheckboxState() {
                return treeView.onDidChangeCheckboxState;
            },
            get message() { return treeView.message; },
            set message(message) {
                if (isMarkdownString(message)) {
                    checkProposedApiEnabled(extension, 'treeViewMarkdownMessage');
                }
                treeView.message = message;
            },
            get title() { return treeView.title; },
            set title(title) {
                treeView.title = title;
            },
            get description() {
                return treeView.description;
            },
            set description(description) {
                treeView.description = description;
            },
            get badge() {
                return treeView.badge;
            },
            set badge(badge) {
                if ((badge !== undefined) && extHostTypes.ViewBadge.isViewBadge(badge)) {
                    treeView.badge = {
                        value: Math.floor(Math.abs(badge.value)),
                        tooltip: badge.tooltip
                    };
                }
                else if (badge === undefined) {
                    treeView.badge = undefined;
                }
            },
            reveal: (element, options) => {
                return treeView.reveal(element, options);
            },
            dispose: async () => {
                // Wait for the registration promise to finish before doing the dispose.
                await registerPromise;
                this.treeViews.delete(viewId);
                treeView.dispose();
            }
        };
        this._register(view);
        return view;
    }
    async $getChildren(treeViewId, treeItemHandles) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            return Promise.reject(new NoTreeViewError(treeViewId));
        }
        if (!treeItemHandles) {
            const children = await treeView.getChildren();
            return children ? [[0, ...children]] : undefined;
        }
        // Keep order of treeItemHandles in case extension trees already depend on this
        const result = [];
        for (let i = 0; i < treeItemHandles.length; i++) {
            const treeItemHandle = treeItemHandles[i];
            const children = await treeView.getChildren(treeItemHandle);
            if (children) {
                result.push([i, ...children]);
            }
        }
        return result;
    }
    async $handleDrop(destinationViewId, requestId, treeDataTransferDTO, targetItemHandle, token, operationUuid, sourceViewId, sourceTreeItemHandles) {
        const treeView = this.treeViews.get(destinationViewId);
        if (!treeView) {
            return Promise.reject(new NoTreeViewError(destinationViewId));
        }
        const treeDataTransfer = DataTransfer.toDataTransfer(treeDataTransferDTO, async (dataItemIndex) => {
            return (await this._proxy.$resolveDropFileData(destinationViewId, requestId, dataItemIndex)).buffer;
        });
        if ((sourceViewId === destinationViewId) && sourceTreeItemHandles) {
            await this.addAdditionalTransferItems(treeDataTransfer, treeView, sourceTreeItemHandles, token, operationUuid);
        }
        return treeView.onDrop(treeDataTransfer, targetItemHandle, token);
    }
    async addAdditionalTransferItems(treeDataTransfer, treeView, sourceTreeItemHandles, token, operationUuid) {
        const existingTransferOperation = this.treeDragAndDropService.removeDragOperationTransfer(operationUuid);
        if (existingTransferOperation) {
            (await existingTransferOperation)?.forEach((value, key) => {
                if (value) {
                    treeDataTransfer.set(key, value);
                }
            });
        }
        else if (operationUuid && treeView.handleDrag) {
            const willDropPromise = treeView.handleDrag(sourceTreeItemHandles, treeDataTransfer, token);
            this.treeDragAndDropService.addDragOperationTransfer(operationUuid, willDropPromise);
            await willDropPromise;
        }
        return treeDataTransfer;
    }
    async $handleDrag(sourceViewId, sourceTreeItemHandles, operationUuid, token) {
        const treeView = this.treeViews.get(sourceViewId);
        if (!treeView) {
            return Promise.reject(new NoTreeViewError(sourceViewId));
        }
        const treeDataTransfer = await this.addAdditionalTransferItems(new extHostTypes.DataTransfer(), treeView, sourceTreeItemHandles, token, operationUuid);
        if (!treeDataTransfer || token.isCancellationRequested) {
            return;
        }
        return DataTransfer.from(treeDataTransfer);
    }
    async $hasResolve(treeViewId) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        return treeView.hasResolve;
    }
    $resolve(treeViewId, treeItemHandle, token) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        return treeView.resolveTreeItem(treeItemHandle, token);
    }
    $setExpanded(treeViewId, treeItemHandle, expanded) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setExpanded(treeItemHandle, expanded);
    }
    $setSelectionAndFocus(treeViewId, selectedHandles, focusedHandle) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setSelectionAndFocus(selectedHandles, focusedHandle);
    }
    $setVisible(treeViewId, isVisible) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            if (!isVisible) {
                return;
            }
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setVisible(isVisible);
    }
    $changeCheckboxState(treeViewId, checkboxUpdate) {
        const treeView = this.treeViews.get(treeViewId);
        if (!treeView) {
            throw new NoTreeViewError(treeViewId);
        }
        treeView.setCheckboxState(checkboxUpdate);
    }
    createExtHostTreeView(id, options, extension) {
        const treeView = this._register(new ExtHostTreeView(id, options, this._proxy, this.commands.converter, this.logService, extension));
        this.treeViews.set(id, treeView);
        return treeView;
    }
    convertArgument(arg) {
        const treeView = this.treeViews.get(arg.$treeViewId);
        if (treeView && '$treeItemHandle' in arg) {
            return treeView.getExtensionElement(arg.$treeItemHandle);
        }
        if (treeView && '$focusedTreeItem' in arg && arg.$focusedTreeItem) {
            return treeView.focusedElement;
        }
        return null;
    }
}
class ExtHostTreeView extends Disposable {
    static { this.LABEL_HANDLE_PREFIX = '0'; }
    static { this.ID_HANDLE_PREFIX = '1'; }
    get visible() { return this._visible; }
    get selectedElements() { return this._selectedHandles.map(handle => this.getExtensionElement(handle)).filter(element => !isUndefinedOrNull(element)); }
    get focusedElement() { return (this._focusedHandle ? this.getExtensionElement(this._focusedHandle) : undefined); }
    constructor(viewId, options, proxy, commands, logService, extension) {
        super();
        this.viewId = viewId;
        this.proxy = proxy;
        this.commands = commands;
        this.logService = logService;
        this.extension = extension;
        this.roots = undefined;
        this.elements = new Map();
        this.nodes = new Map();
        this._visible = false;
        this._selectedHandles = [];
        this._focusedHandle = undefined;
        this._onDidExpandElement = this._register(new Emitter());
        this.onDidExpandElement = this._onDidExpandElement.event;
        this._onDidCollapseElement = this._register(new Emitter());
        this.onDidCollapseElement = this._onDidCollapseElement.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeActiveItem = this._register(new Emitter());
        this.onDidChangeActiveItem = this._onDidChangeActiveItem.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
        this._onDidChangeData = this._register(new Emitter());
        this.refreshPromise = Promise.resolve();
        this.refreshQueue = Promise.resolve();
        this._message = '';
        this._title = '';
        this._refreshCancellationSource = new CancellationTokenSource();
        if (extension.contributes && extension.contributes.views) {
            for (const location in extension.contributes.views) {
                for (const view of extension.contributes.views[location]) {
                    if (view.id === viewId) {
                        this._title = view.name;
                    }
                }
            }
        }
        this.dataProvider = options.treeDataProvider;
        this.dndController = options.dragAndDropController;
        if (this.dataProvider.onDidChangeTreeData) {
            this._register(this.dataProvider.onDidChangeTreeData(elementOrElements => {
                if (Array.isArray(elementOrElements) && elementOrElements.length === 0) {
                    return;
                }
                this._onDidChangeData.fire({ message: false, element: elementOrElements });
            }));
        }
        let refreshingPromise;
        let promiseCallback;
        const onDidChangeData = Event.debounce(this._onDidChangeData.event, (result, current) => {
            if (!result) {
                result = { message: false, elements: [] };
            }
            if (current.element !== false) {
                if (!refreshingPromise) {
                    // New refresh has started
                    refreshingPromise = new Promise(c => promiseCallback = c);
                    this.refreshPromise = this.refreshPromise.then(() => refreshingPromise);
                }
                if (Array.isArray(current.element)) {
                    result.elements.push(...current.element);
                }
                else {
                    result.elements.push(current.element);
                }
            }
            if (current.message) {
                result.message = true;
            }
            return result;
        }, 200, true);
        this._register(onDidChangeData(({ message, elements }) => {
            if (elements.length) {
                this.refreshQueue = this.refreshQueue.then(() => {
                    const _promiseCallback = promiseCallback;
                    refreshingPromise = null;
                    return this.refresh(elements).then(() => _promiseCallback());
                });
            }
            if (message) {
                this.proxy.$setMessage(this.viewId, MarkdownString.fromStrict(this._message) ?? '');
            }
        }));
    }
    async getChildren(parentHandle) {
        const parentElement = parentHandle ? this.getExtensionElement(parentHandle) : undefined;
        if (parentHandle && !parentElement) {
            this.logService.error(`No tree item with id \'${parentHandle}\' found.`);
            return Promise.resolve([]);
        }
        let childrenNodes = this.getChildrenNodes(parentHandle); // Get it from cache
        if (!childrenNodes) {
            childrenNodes = await this.fetchChildrenNodes(parentElement);
        }
        return childrenNodes ? childrenNodes.map(n => n.item) : undefined;
    }
    getExtensionElement(treeItemHandle) {
        return this.elements.get(treeItemHandle);
    }
    reveal(element, options) {
        options = options ? options : { select: true, focus: false };
        const select = isUndefinedOrNull(options.select) ? true : options.select;
        const focus = isUndefinedOrNull(options.focus) ? false : options.focus;
        const expand = isUndefinedOrNull(options.expand) ? false : options.expand;
        if (typeof this.dataProvider.getParent !== 'function') {
            return Promise.reject(new Error(`Required registered TreeDataProvider to implement 'getParent' method to access 'reveal' method`));
        }
        if (element) {
            return this.refreshPromise
                .then(() => this.resolveUnknownParentChain(element))
                .then(parentChain => this.resolveTreeNode(element, parentChain[parentChain.length - 1])
                .then(treeNode => this.proxy.$reveal(this.viewId, { item: treeNode.item, parentChain: parentChain.map(p => p.item) }, { select, focus, expand })), error => this.logService.error(error));
        }
        else {
            return this.proxy.$reveal(this.viewId, undefined, { select, focus, expand });
        }
    }
    get message() {
        return this._message;
    }
    set message(message) {
        this._message = message;
        this._onDidChangeData.fire({ message: true, element: false });
    }
    get title() {
        return this._title;
    }
    set title(title) {
        this._title = title;
        this.proxy.$setTitle(this.viewId, title, this._description);
    }
    get description() {
        return this._description;
    }
    set description(description) {
        this._description = description;
        this.proxy.$setTitle(this.viewId, this._title, description);
    }
    get badge() {
        return this._badge;
    }
    set badge(badge) {
        if (this._badge?.value === badge?.value &&
            this._badge?.tooltip === badge?.tooltip) {
            return;
        }
        this._badge = ViewBadge.from(badge);
        this.proxy.$setBadge(this.viewId, badge);
    }
    setExpanded(treeItemHandle, expanded) {
        const element = this.getExtensionElement(treeItemHandle);
        if (element) {
            if (expanded) {
                this._onDidExpandElement.fire(Object.freeze({ element }));
            }
            else {
                this._onDidCollapseElement.fire(Object.freeze({ element }));
            }
        }
    }
    setSelectionAndFocus(selectedHandles, focusedHandle) {
        const changedSelection = !equals(this._selectedHandles, selectedHandles);
        this._selectedHandles = selectedHandles;
        const changedFocus = this._focusedHandle !== focusedHandle;
        this._focusedHandle = focusedHandle;
        if (changedSelection) {
            this._onDidChangeSelection.fire(Object.freeze({ selection: this.selectedElements }));
        }
        if (changedFocus) {
            this._onDidChangeActiveItem.fire(Object.freeze({ activeItem: this.focusedElement }));
        }
    }
    setVisible(visible) {
        if (visible !== this._visible) {
            this._visible = visible;
            this._onDidChangeVisibility.fire(Object.freeze({ visible: this._visible }));
        }
    }
    async setCheckboxState(checkboxUpdates) {
        const items = (await Promise.all(checkboxUpdates.map(async (checkboxUpdate) => {
            const extensionItem = this.getExtensionElement(checkboxUpdate.treeItemHandle);
            if (extensionItem) {
                return {
                    extensionItem: extensionItem,
                    treeItem: await this.dataProvider.getTreeItem(extensionItem),
                    newState: checkboxUpdate.newState ? extHostTypes.TreeItemCheckboxState.Checked : extHostTypes.TreeItemCheckboxState.Unchecked
                };
            }
            return Promise.resolve(undefined);
        }))).filter((item) => item !== undefined);
        items.forEach(item => {
            item.treeItem.checkboxState = item.newState ? extHostTypes.TreeItemCheckboxState.Checked : extHostTypes.TreeItemCheckboxState.Unchecked;
        });
        this._onDidChangeCheckboxState.fire({ items: items.map(item => [item.extensionItem, item.newState]) });
    }
    async handleDrag(sourceTreeItemHandles, treeDataTransfer, token) {
        const extensionTreeItems = [];
        for (const sourceHandle of sourceTreeItemHandles) {
            const extensionItem = this.getExtensionElement(sourceHandle);
            if (extensionItem) {
                extensionTreeItems.push(extensionItem);
            }
        }
        if (!this.dndController?.handleDrag || (extensionTreeItems.length === 0)) {
            return;
        }
        await this.dndController.handleDrag(extensionTreeItems, treeDataTransfer, token);
        return treeDataTransfer;
    }
    get hasHandleDrag() {
        return !!this.dndController?.handleDrag;
    }
    async onDrop(treeDataTransfer, targetHandleOrNode, token) {
        const target = targetHandleOrNode ? this.getExtensionElement(targetHandleOrNode) : undefined;
        if ((!target && targetHandleOrNode) || !this.dndController?.handleDrop) {
            return;
        }
        return asPromise(() => this.dndController?.handleDrop
            ? this.dndController.handleDrop(target, treeDataTransfer, token)
            : undefined);
    }
    get hasResolve() {
        return !!this.dataProvider.resolveTreeItem;
    }
    async resolveTreeItem(treeItemHandle, token) {
        if (!this.dataProvider.resolveTreeItem) {
            return;
        }
        const element = this.elements.get(treeItemHandle);
        if (element) {
            const node = this.nodes.get(element);
            if (node) {
                const resolve = await this.dataProvider.resolveTreeItem(node.extensionItem, element, token) ?? node.extensionItem;
                this.validateTreeItem(resolve);
                // Resolvable elements. Currently only tooltip and command.
                node.item.tooltip = this.getTooltip(resolve.tooltip);
                node.item.command = this.getCommand(node.disposableStore, resolve.command);
                return node.item;
            }
        }
        return;
    }
    resolveUnknownParentChain(element) {
        return this.resolveParent(element)
            .then((parent) => {
            if (!parent) {
                return Promise.resolve([]);
            }
            return this.resolveUnknownParentChain(parent)
                .then(result => this.resolveTreeNode(parent, result[result.length - 1])
                .then(parentNode => {
                result.push(parentNode);
                return result;
            }));
        });
    }
    resolveParent(element) {
        const node = this.nodes.get(element);
        if (node) {
            return Promise.resolve(node.parent ? this.elements.get(node.parent.item.handle) : undefined);
        }
        return asPromise(() => this.dataProvider.getParent(element));
    }
    resolveTreeNode(element, parent) {
        const node = this.nodes.get(element);
        if (node) {
            return Promise.resolve(node);
        }
        return asPromise(() => this.dataProvider.getTreeItem(element))
            .then(extTreeItem => this.createHandle(element, extTreeItem, parent, true))
            .then(handle => this.getChildren(parent ? parent.item.handle : undefined)
            .then(() => {
            const cachedElement = this.getExtensionElement(handle);
            if (cachedElement) {
                const node = this.nodes.get(cachedElement);
                if (node) {
                    return Promise.resolve(node);
                }
            }
            throw new Error(`Cannot resolve tree item for element ${handle} from extension ${this.extension.identifier.value}`);
        }));
    }
    getChildrenNodes(parentNodeOrHandle) {
        if (parentNodeOrHandle) {
            let parentNode;
            if (typeof parentNodeOrHandle === 'string') {
                const parentElement = this.getExtensionElement(parentNodeOrHandle);
                parentNode = parentElement ? this.nodes.get(parentElement) : undefined;
            }
            else {
                parentNode = parentNodeOrHandle;
            }
            return parentNode ? parentNode.children || undefined : undefined;
        }
        return this.roots;
    }
    async fetchChildrenNodes(parentElement) {
        // clear children cache
        this.clearChildren(parentElement);
        const cts = new CancellationTokenSource(this._refreshCancellationSource.token);
        try {
            const parentNode = parentElement ? this.nodes.get(parentElement) : undefined;
            const elements = await this.dataProvider.getChildren(parentElement);
            if (cts.token.isCancellationRequested) {
                return undefined;
            }
            const coalescedElements = coalesce(elements || []);
            const treeItems = await Promise.all(coalesce(coalescedElements).map(element => {
                return this.dataProvider.getTreeItem(element);
            }));
            if (cts.token.isCancellationRequested) {
                return undefined;
            }
            // createAndRegisterTreeNodes adds the nodes to a cache. This must be done sync so that they get added in the correct order.
            const items = treeItems.map((item, index) => item ? this.createAndRegisterTreeNode(coalescedElements[index], item, parentNode) : null);
            return coalesce(items);
        }
        finally {
            cts.dispose();
        }
    }
    refresh(elements) {
        const hasRoot = elements.some(element => !element);
        if (hasRoot) {
            // Cancel any pending children fetches
            this._refreshCancellationSource.dispose(true);
            this._refreshCancellationSource = new CancellationTokenSource();
            this.clearAll(); // clear cache
            return this.proxy.$refresh(this.viewId);
        }
        else {
            const handlesToRefresh = this.getHandlesToRefresh(elements);
            if (handlesToRefresh.length) {
                return this.refreshHandles(handlesToRefresh);
            }
        }
        return Promise.resolve(undefined);
    }
    getHandlesToRefresh(elements) {
        const elementsToUpdate = new Set();
        const elementNodes = elements.map(element => this.nodes.get(element));
        for (const elementNode of elementNodes) {
            if (elementNode && !elementsToUpdate.has(elementNode.item.handle)) {
                // check if an ancestor of extElement is already in the elements list
                let currentNode = elementNode;
                while (currentNode && currentNode.parent && elementNodes.findIndex(node => currentNode && currentNode.parent && node && node.item.handle === currentNode.parent.item.handle) === -1) {
                    const parentElement = this.elements.get(currentNode.parent.item.handle);
                    currentNode = parentElement ? this.nodes.get(parentElement) : undefined;
                }
                if (currentNode && !currentNode.parent) {
                    elementsToUpdate.add(elementNode.item.handle);
                }
            }
        }
        const handlesToUpdate = [];
        // Take only top level elements
        elementsToUpdate.forEach((handle) => {
            const element = this.elements.get(handle);
            if (element) {
                const node = this.nodes.get(element);
                if (node && (!node.parent || !elementsToUpdate.has(node.parent.item.handle))) {
                    handlesToUpdate.push(handle);
                }
            }
        });
        return handlesToUpdate;
    }
    refreshHandles(itemHandles) {
        const itemsToRefresh = {};
        return Promise.all(itemHandles.map(treeItemHandle => this.refreshNode(treeItemHandle)
            .then(node => {
            if (node) {
                itemsToRefresh[treeItemHandle] = node.item;
            }
        })))
            .then(() => Object.keys(itemsToRefresh).length ? this.proxy.$refresh(this.viewId, itemsToRefresh) : undefined);
    }
    refreshNode(treeItemHandle) {
        const extElement = this.getExtensionElement(treeItemHandle);
        if (extElement) {
            const existing = this.nodes.get(extElement);
            if (existing) {
                this.clearChildren(extElement); // clear children cache
                return asPromise(() => this.dataProvider.getTreeItem(extElement))
                    .then(extTreeItem => {
                    if (extTreeItem) {
                        const newNode = this.createTreeNode(extElement, extTreeItem, existing.parent);
                        this.updateNodeCache(extElement, newNode, existing, existing.parent);
                        existing.dispose();
                        return newNode;
                    }
                    return null;
                });
            }
        }
        return Promise.resolve(null);
    }
    createAndRegisterTreeNode(element, extTreeItem, parentNode) {
        const node = this.createTreeNode(element, extTreeItem, parentNode);
        if (extTreeItem.id && this.elements.has(node.item.handle)) {
            throw new Error(localize('treeView.duplicateElement', 'Element with id {0} is already registered', extTreeItem.id));
        }
        this.addNodeToCache(element, node);
        this.addNodeToParentCache(node, parentNode);
        return node;
    }
    getTooltip(tooltip) {
        if (extHostTypes.MarkdownString.isMarkdownString(tooltip)) {
            return MarkdownString.from(tooltip);
        }
        return tooltip;
    }
    getCommand(disposable, command) {
        return command ? { ...this.commands.toInternal(command, disposable), originalId: command.command } : undefined;
    }
    getCheckbox(extensionTreeItem) {
        if (extensionTreeItem.checkboxState === undefined) {
            return undefined;
        }
        let checkboxState;
        let tooltip = undefined;
        let accessibilityInformation = undefined;
        if (typeof extensionTreeItem.checkboxState === 'number') {
            checkboxState = extensionTreeItem.checkboxState;
        }
        else {
            checkboxState = extensionTreeItem.checkboxState.state;
            tooltip = extensionTreeItem.checkboxState.tooltip;
            accessibilityInformation = extensionTreeItem.checkboxState.accessibilityInformation;
        }
        return { isChecked: checkboxState === extHostTypes.TreeItemCheckboxState.Checked, tooltip, accessibilityInformation };
    }
    validateTreeItem(extensionTreeItem) {
        if (!extHostTypes.TreeItem.isTreeItem(extensionTreeItem, this.extension)) {
            throw new Error(`Extension ${this.extension.identifier.value} has provided an invalid tree item.`);
        }
    }
    createTreeNode(element, extensionTreeItem, parent) {
        this.validateTreeItem(extensionTreeItem);
        const disposableStore = this._register(new DisposableStore());
        const handle = this.createHandle(element, extensionTreeItem, parent);
        const icon = this.getLightIconPath(extensionTreeItem);
        const item = {
            handle,
            parentHandle: parent ? parent.item.handle : undefined,
            label: toTreeItemLabel(extensionTreeItem.label, this.extension),
            description: extensionTreeItem.description,
            resourceUri: extensionTreeItem.resourceUri,
            tooltip: this.getTooltip(extensionTreeItem.tooltip),
            command: this.getCommand(disposableStore, extensionTreeItem.command),
            contextValue: extensionTreeItem.contextValue,
            icon,
            iconDark: this.getDarkIconPath(extensionTreeItem) || icon,
            themeIcon: this.getThemeIcon(extensionTreeItem),
            collapsibleState: isUndefinedOrNull(extensionTreeItem.collapsibleState) ? extHostTypes.TreeItemCollapsibleState.None : extensionTreeItem.collapsibleState,
            accessibilityInformation: extensionTreeItem.accessibilityInformation,
            checkbox: this.getCheckbox(extensionTreeItem),
        };
        return {
            item,
            extensionItem: extensionTreeItem,
            parent,
            children: undefined,
            disposableStore,
            dispose() { disposableStore.dispose(); }
        };
    }
    getThemeIcon(extensionTreeItem) {
        return extensionTreeItem.iconPath instanceof extHostTypes.ThemeIcon ? extensionTreeItem.iconPath : undefined;
    }
    createHandle(element, { id, label, resourceUri }, parent, returnFirst) {
        if (id) {
            return `${ExtHostTreeView.ID_HANDLE_PREFIX}/${id}`;
        }
        const treeItemLabel = toTreeItemLabel(label, this.extension);
        const prefix = parent ? parent.item.handle : ExtHostTreeView.LABEL_HANDLE_PREFIX;
        let elementId = treeItemLabel ? treeItemLabel.label : resourceUri ? basename(resourceUri) : '';
        elementId = elementId.indexOf('/') !== -1 ? elementId.replace('/', '//') : elementId;
        const existingHandle = this.nodes.has(element) ? this.nodes.get(element).item.handle : undefined;
        const childrenNodes = (this.getChildrenNodes(parent) || []);
        let handle;
        let counter = 0;
        do {
            handle = `${prefix}/${counter}:${elementId}`;
            if (returnFirst || !this.elements.has(handle) || existingHandle === handle) {
                // Return first if asked for or
                // Return if handle does not exist or
                // Return if handle is being reused
                break;
            }
            counter++;
        } while (counter <= childrenNodes.length);
        return handle;
    }
    getLightIconPath(extensionTreeItem) {
        if (extensionTreeItem.iconPath && !(extensionTreeItem.iconPath instanceof extHostTypes.ThemeIcon)) {
            if (typeof extensionTreeItem.iconPath === 'string'
                || URI.isUri(extensionTreeItem.iconPath)) {
                return this.getIconPath(extensionTreeItem.iconPath);
            }
            return this.getIconPath(extensionTreeItem.iconPath.light);
        }
        return undefined;
    }
    getDarkIconPath(extensionTreeItem) {
        if (extensionTreeItem.iconPath && !(extensionTreeItem.iconPath instanceof extHostTypes.ThemeIcon) && extensionTreeItem.iconPath.dark) {
            return this.getIconPath(extensionTreeItem.iconPath.dark);
        }
        return undefined;
    }
    getIconPath(iconPath) {
        if (URI.isUri(iconPath)) {
            return iconPath;
        }
        return URI.file(iconPath);
    }
    addNodeToCache(element, node) {
        this.elements.set(node.item.handle, element);
        this.nodes.set(element, node);
    }
    updateNodeCache(element, newNode, existing, parentNode) {
        // Remove from the cache
        this.elements.delete(newNode.item.handle);
        this.nodes.delete(element);
        if (newNode.item.handle !== existing.item.handle) {
            this.elements.delete(existing.item.handle);
        }
        // Add the new node to the cache
        this.addNodeToCache(element, newNode);
        // Replace the node in parent's children nodes
        const childrenNodes = (this.getChildrenNodes(parentNode) || []);
        const childNode = childrenNodes.filter(c => c.item.handle === existing.item.handle)[0];
        if (childNode) {
            childrenNodes.splice(childrenNodes.indexOf(childNode), 1, newNode);
        }
    }
    addNodeToParentCache(node, parentNode) {
        if (parentNode) {
            if (!parentNode.children) {
                parentNode.children = [];
            }
            parentNode.children.push(node);
        }
        else {
            if (!this.roots) {
                this.roots = [];
            }
            this.roots.push(node);
        }
    }
    clearChildren(parentElement) {
        if (parentElement) {
            const node = this.nodes.get(parentElement);
            if (node) {
                if (node.children) {
                    for (const child of node.children) {
                        const childElement = this.elements.get(child.item.handle);
                        if (childElement) {
                            this.clear(childElement);
                        }
                    }
                }
                node.children = undefined;
            }
        }
        else {
            this.clearAll();
        }
    }
    clear(element) {
        const node = this.nodes.get(element);
        if (node) {
            if (node.children) {
                for (const child of node.children) {
                    const childElement = this.elements.get(child.item.handle);
                    if (childElement) {
                        this.clear(childElement);
                    }
                }
            }
            this.nodes.delete(element);
            this.elements.delete(node.item.handle);
            node.dispose();
        }
    }
    clearAll() {
        this.roots = undefined;
        this.elements.clear();
        this.nodes.forEach(node => node.dispose());
        this.nodes.clear();
    }
    dispose() {
        super.dispose();
        this._refreshCancellationSource.dispose();
        this.clearAll();
        this.proxy.$disposeTree(this.viewId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRyZWVWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VHJlZVZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RixPQUFPLEVBQWdJLGVBQWUsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXRMLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JGLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUF3QixtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRTVHLE9BQU8sRUFB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
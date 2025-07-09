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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { Extensions, ResolvableTreeItem, NoTreeViewError } from '../../common/views.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { distinct } from '../../../base/common/arrays.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { isUndefinedOrNull, isNumber } from '../../../base/common/types.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { createStringDataTransferItem, VSDataTransfer } from '../../../base/common/dataTransfer.js';
import { DataTransferFileCache } from '../common/shared/dataTransferCache.js';
import * as typeConvert from '../common/extHostTypeConverters.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
let MainThreadTreeViews = class MainThreadTreeViews extends Disposable {
    constructor(extHostContext, viewsService, notificationService, extensionService, logService) {
        super();
        this.viewsService = viewsService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.logService = logService;
        this._dataProviders = this._register(new DisposableMap());
        this._dndControllers = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTreeViews);
    }
    async $registerTreeViewDataProvider(treeViewId, options) {
        this.logService.trace('MainThreadTreeViews#$registerTreeViewDataProvider', treeViewId, options);
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            const dataProvider = new TreeViewDataProvider(treeViewId, this._proxy, this.notificationService);
            const disposables = new DisposableStore();
            this._dataProviders.set(treeViewId, { dataProvider, dispose: () => disposables.dispose() });
            const dndController = (options.hasHandleDrag || options.hasHandleDrop)
                ? new TreeViewDragAndDropController(treeViewId, options.dropMimeTypes, options.dragMimeTypes, options.hasHandleDrag, this._proxy) : undefined;
            const viewer = this.getTreeView(treeViewId);
            if (viewer) {
                // Order is important here. The internal tree isn't created until the dataProvider is set.
                // Set all other properties first!
                viewer.showCollapseAllAction = options.showCollapseAll;
                viewer.canSelectMany = options.canSelectMany;
                viewer.manuallyManageCheckboxes = options.manuallyManageCheckboxes;
                viewer.dragAndDropController = dndController;
                if (dndController) {
                    this._dndControllers.set(treeViewId, dndController);
                }
                viewer.dataProvider = dataProvider;
                this.registerListeners(treeViewId, viewer, disposables);
                this._proxy.$setVisible(treeViewId, viewer.visible);
            }
            else {
                this.notificationService.error('No view is registered with id: ' + treeViewId);
            }
        });
    }
    $reveal(treeViewId, itemInfo, options) {
        this.logService.trace('MainThreadTreeViews#$reveal', treeViewId, itemInfo?.item, itemInfo?.parentChain, options);
        return this.viewsService.openView(treeViewId, options.focus)
            .then(() => {
            const viewer = this.getTreeView(treeViewId);
            if (viewer && itemInfo) {
                return this.reveal(viewer, this._dataProviders.get(treeViewId).dataProvider, itemInfo.item, itemInfo.parentChain, options);
            }
            return undefined;
        });
    }
    $refresh(treeViewId, itemsToRefreshByHandle) {
        this.logService.trace('MainThreadTreeViews#$refresh', treeViewId, itemsToRefreshByHandle);
        const viewer = this.getTreeView(treeViewId);
        const dataProvider = this._dataProviders.get(treeViewId);
        if (viewer && dataProvider) {
            const itemsToRefresh = dataProvider.dataProvider.getItemsToRefresh(itemsToRefreshByHandle);
            return viewer.refresh(itemsToRefresh.items.length ? itemsToRefresh.items : undefined, itemsToRefresh.checkboxes.length ? itemsToRefresh.checkboxes : undefined);
        }
        return Promise.resolve();
    }
    $setMessage(treeViewId, message) {
        this.logService.trace('MainThreadTreeViews#$setMessage', treeViewId, message.toString());
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.message = message;
        }
    }
    $setTitle(treeViewId, title, description) {
        this.logService.trace('MainThreadTreeViews#$setTitle', treeViewId, title, description);
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.title = title;
            viewer.description = description;
        }
    }
    $setBadge(treeViewId, badge) {
        this.logService.trace('MainThreadTreeViews#$setBadge', treeViewId, badge?.value, badge?.tooltip);
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.badge = badge;
        }
    }
    $resolveDropFileData(destinationViewId, requestId, dataItemId) {
        const controller = this._dndControllers.get(destinationViewId);
        if (!controller) {
            throw new Error('Unknown tree');
        }
        return controller.resolveDropFileData(requestId, dataItemId);
    }
    async $disposeTree(treeViewId) {
        const viewer = this.getTreeView(treeViewId);
        if (viewer) {
            viewer.dataProvider = undefined;
        }
        this._dataProviders.deleteAndDispose(treeViewId);
    }
    async reveal(treeView, dataProvider, itemIn, parentChain, options) {
        options = options ? options : { select: false, focus: false };
        const select = isUndefinedOrNull(options.select) ? false : options.select;
        const focus = isUndefinedOrNull(options.focus) ? false : options.focus;
        let expand = Math.min(isNumber(options.expand) ? options.expand : options.expand === true ? 1 : 0, 3);
        if (dataProvider.isEmpty()) {
            // Refresh if empty
            await treeView.refresh();
        }
        for (const parent of parentChain) {
            const parentItem = dataProvider.getItem(parent.handle);
            if (parentItem) {
                await treeView.expand(parentItem);
            }
        }
        const item = dataProvider.getItem(itemIn.handle);
        if (item) {
            await treeView.reveal(item);
            if (select) {
                treeView.setSelection([item]);
            }
            if (focus === false) {
                treeView.setFocus();
            }
            else if (focus) {
                treeView.setFocus(item);
            }
            let itemsToExpand = [item];
            for (; itemsToExpand.length > 0 && expand > 0; expand--) {
                await treeView.expand(itemsToExpand);
                itemsToExpand = itemsToExpand.reduce((result, itemValue) => {
                    const item = dataProvider.getItem(itemValue.handle);
                    if (item && item.children && item.children.length) {
                        result.push(...item.children);
                    }
                    return result;
                }, []);
            }
        }
    }
    registerListeners(treeViewId, treeView, disposables) {
        disposables.add(treeView.onDidExpandItem(item => this._proxy.$setExpanded(treeViewId, item.handle, true)));
        disposables.add(treeView.onDidCollapseItem(item => this._proxy.$setExpanded(treeViewId, item.handle, false)));
        disposables.add(treeView.onDidChangeSelectionAndFocus(items => this._proxy.$setSelectionAndFocus(treeViewId, items.selection.map(({ handle }) => handle), items.focus.handle)));
        disposables.add(treeView.onDidChangeVisibility(isVisible => this._proxy.$setVisible(treeViewId, isVisible)));
        disposables.add(treeView.onDidChangeCheckboxState(items => {
            this._proxy.$changeCheckboxState(treeViewId, items.map(item => {
                return { treeItemHandle: item.handle, newState: item.checkbox?.isChecked ?? false };
            }));
        }));
    }
    getTreeView(treeViewId) {
        const viewDescriptor = Registry.as(Extensions.ViewsRegistry).getView(treeViewId);
        return viewDescriptor ? viewDescriptor.treeView : null;
    }
    dispose() {
        for (const dataprovider of this._dataProviders) {
            const treeView = this.getTreeView(dataprovider[0]);
            if (treeView) {
                treeView.dataProvider = undefined;
            }
        }
        this._dataProviders.dispose();
        this._dndControllers.clear();
        super.dispose();
    }
};
MainThreadTreeViews = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTreeViews),
    __param(1, IViewsService),
    __param(2, INotificationService),
    __param(3, IExtensionService),
    __param(4, ILogService)
], MainThreadTreeViews);
export { MainThreadTreeViews };
class TreeViewDragAndDropController {
    constructor(treeViewId, dropMimeTypes, dragMimeTypes, hasWillDrop, _proxy) {
        this.treeViewId = treeViewId;
        this.dropMimeTypes = dropMimeTypes;
        this.dragMimeTypes = dragMimeTypes;
        this.hasWillDrop = hasWillDrop;
        this._proxy = _proxy;
        this.dataTransfersCache = new DataTransferFileCache();
    }
    async handleDrop(dataTransfer, targetTreeItem, token, operationUuid, sourceTreeId, sourceTreeItemHandles) {
        const request = this.dataTransfersCache.add(dataTransfer);
        try {
            const dataTransferDto = await typeConvert.DataTransfer.fromList(dataTransfer);
            if (token.isCancellationRequested) {
                return;
            }
            return await this._proxy.$handleDrop(this.treeViewId, request.id, dataTransferDto, targetTreeItem?.handle, token, operationUuid, sourceTreeId, sourceTreeItemHandles);
        }
        finally {
            request.dispose();
        }
    }
    async handleDrag(sourceTreeItemHandles, operationUuid, token) {
        if (!this.hasWillDrop) {
            return;
        }
        const additionalDataTransferDTO = await this._proxy.$handleDrag(this.treeViewId, sourceTreeItemHandles, operationUuid, token);
        if (!additionalDataTransferDTO) {
            return;
        }
        const additionalDataTransfer = new VSDataTransfer();
        additionalDataTransferDTO.items.forEach(([type, item]) => {
            additionalDataTransfer.replace(type, createStringDataTransferItem(item.asString));
        });
        return additionalDataTransfer;
    }
    resolveDropFileData(requestId, dataItemId) {
        return this.dataTransfersCache.resolveFileData(requestId, dataItemId);
    }
}
class TreeViewDataProvider {
    constructor(treeViewId, _proxy, notificationService) {
        this.treeViewId = treeViewId;
        this._proxy = _proxy;
        this.notificationService = notificationService;
        this.itemsMap = new Map();
        this.hasResolve = this._proxy.$hasResolve(this.treeViewId);
    }
    async getChildren(treeItem) {
        const batches = await this.getChildrenBatch(treeItem ? [treeItem] : undefined);
        return batches?.[0];
    }
    getChildrenBatch(treeItems) {
        if (!treeItems) {
            this.itemsMap.clear();
        }
        return this._proxy.$getChildren(this.treeViewId, treeItems ? treeItems.map(item => item.handle) : undefined)
            .then(children => {
            const convertedChildren = this.convertTransferChildren(treeItems ?? [], children);
            return this.postGetChildren(convertedChildren);
        }, err => {
            // It can happen that a tree view is disposed right as `getChildren` is called. This results in an error because the data provider gets removed.
            // The tree will shortly get cleaned up in this case. We just need to handle the error here.
            if (!NoTreeViewError.is(err)) {
                this.notificationService.error(err);
            }
            return [];
        });
    }
    convertTransferChildren(parents, children) {
        const convertedChildren = Array(parents.length);
        if (children) {
            for (const childGroup of children) {
                const childGroupIndex = childGroup[0];
                convertedChildren[childGroupIndex] = childGroup.slice(1);
            }
        }
        return convertedChildren;
    }
    getItemsToRefresh(itemsToRefreshByHandle) {
        const itemsToRefresh = [];
        const checkboxesToRefresh = [];
        if (itemsToRefreshByHandle) {
            for (const newTreeItemHandle of Object.keys(itemsToRefreshByHandle)) {
                const currentTreeItem = this.getItem(newTreeItemHandle);
                if (currentTreeItem) { // Refresh only if the item exists
                    const newTreeItem = itemsToRefreshByHandle[newTreeItemHandle];
                    if (currentTreeItem.checkbox?.isChecked !== newTreeItem.checkbox?.isChecked) {
                        checkboxesToRefresh.push(currentTreeItem);
                    }
                    // Update the current item with refreshed item
                    this.updateTreeItem(currentTreeItem, newTreeItem);
                    if (newTreeItemHandle === newTreeItem.handle) {
                        itemsToRefresh.push(currentTreeItem);
                    }
                    else {
                        // Update maps when handle is changed and refresh parent
                        this.itemsMap.delete(newTreeItemHandle);
                        this.itemsMap.set(currentTreeItem.handle, currentTreeItem);
                        const parent = newTreeItem.parentHandle ? this.itemsMap.get(newTreeItem.parentHandle) : null;
                        if (parent) {
                            itemsToRefresh.push(parent);
                        }
                    }
                }
            }
        }
        return { items: itemsToRefresh, checkboxes: checkboxesToRefresh };
    }
    getItem(treeItemHandle) {
        return this.itemsMap.get(treeItemHandle);
    }
    isEmpty() {
        return this.itemsMap.size === 0;
    }
    async postGetChildren(elementGroups) {
        if (elementGroups === undefined) {
            return undefined;
        }
        const resultGroups = [];
        const hasResolve = await this.hasResolve;
        if (elementGroups) {
            for (const elements of elementGroups) {
                const result = [];
                resultGroups.push(result);
                if (!elements) {
                    continue;
                }
                for (const element of elements) {
                    const resolvable = new ResolvableTreeItem(element, hasResolve ? (token) => {
                        return this._proxy.$resolve(this.treeViewId, element.handle, token);
                    } : undefined);
                    this.itemsMap.set(element.handle, resolvable);
                    result.push(resolvable);
                }
            }
        }
        return resultGroups;
    }
    updateTreeItem(current, treeItem) {
        treeItem.children = treeItem.children ? treeItem.children : undefined;
        if (current) {
            const properties = distinct([...Object.keys(current instanceof ResolvableTreeItem ? current.asTreeItem() : current),
                ...Object.keys(treeItem)]);
            for (const property of properties) {
                current[property] = treeItem[property];
            }
            if (current instanceof ResolvableTreeItem) {
                current.resetResolve();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRyZWVWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFRyZWVWaWV3cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFtRCxXQUFXLEVBQWtCLE1BQU0sK0JBQStCLENBQUM7QUFDN0ksT0FBTyxFQUE2RSxVQUFVLEVBQUUsa0JBQWtCLEVBQThDLGVBQWUsRUFBeUIsTUFBTSx1QkFBdUIsQ0FBQztBQUN0TyxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM5RSxPQUFPLEtBQUssV0FBVyxNQUFNLG9DQUFvQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxhQUFhLEVB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
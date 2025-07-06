/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
import { localize } from '../../nls.js';
import { createDecorator } from '../../platform/instantiation/common/instantiation.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
import { getOrSet, SetMap } from '../../base/common/map.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { mixin } from '../../base/common/objects.js';
import { Codicon } from '../../base/common/codicons.js';
import { registerIcon } from '../../platform/theme/common/iconRegistry.js';
export const VIEWS_LOG_ID = 'views';
export const VIEWS_LOG_NAME = localize('views log', "Views");
export const defaultViewIcon = registerIcon('default-view-icon', Codicon.window, localize('defaultViewIcon', 'Default view icon.'));
export var Extensions;
(function (Extensions) {
    Extensions.ViewContainersRegistry = 'workbench.registry.view.containers';
    Extensions.ViewsRegistry = 'workbench.registry.view';
})(Extensions || (Extensions = {}));
export var ViewContainerLocation;
(function (ViewContainerLocation) {
    ViewContainerLocation[ViewContainerLocation["Sidebar"] = 0] = "Sidebar";
    ViewContainerLocation[ViewContainerLocation["Panel"] = 1] = "Panel";
    ViewContainerLocation[ViewContainerLocation["AuxiliaryBar"] = 2] = "AuxiliaryBar";
})(ViewContainerLocation || (ViewContainerLocation = {}));
export const ViewContainerLocations = [0 /* ViewContainerLocation.Sidebar */, 1 /* ViewContainerLocation.Panel */, 2 /* ViewContainerLocation.AuxiliaryBar */];
export function ViewContainerLocationToString(viewContainerLocation) {
    switch (viewContainerLocation) {
        case 0 /* ViewContainerLocation.Sidebar */: return 'sidebar';
        case 1 /* ViewContainerLocation.Panel */: return 'panel';
        case 2 /* ViewContainerLocation.AuxiliaryBar */: return 'auxiliarybar';
    }
}
class ViewContainersRegistryImpl extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidRegister = this._register(new Emitter());
        this.onDidRegister = this._onDidRegister.event;
        this._onDidDeregister = this._register(new Emitter());
        this.onDidDeregister = this._onDidDeregister.event;
        this.viewContainers = new Map();
        this.defaultViewContainers = [];
    }
    get all() {
        return [...this.viewContainers.values()].flat();
    }
    registerViewContainer(viewContainerDescriptor, viewContainerLocation, options) {
        const existing = this.get(viewContainerDescriptor.id);
        if (existing) {
            return existing;
        }
        const viewContainer = viewContainerDescriptor;
        viewContainer.openCommandActionDescriptor = options?.doNotRegisterOpenCommand ? undefined : (viewContainer.openCommandActionDescriptor ?? { id: viewContainer.id });
        const viewContainers = getOrSet(this.viewContainers, viewContainerLocation, []);
        viewContainers.push(viewContainer);
        if (options?.isDefault) {
            this.defaultViewContainers.push(viewContainer);
        }
        this._onDidRegister.fire({ viewContainer, viewContainerLocation });
        return viewContainer;
    }
    deregisterViewContainer(viewContainer) {
        for (const viewContainerLocation of this.viewContainers.keys()) {
            const viewContainers = this.viewContainers.get(viewContainerLocation);
            const index = viewContainers?.indexOf(viewContainer);
            if (index !== -1) {
                viewContainers?.splice(index, 1);
                if (viewContainers.length === 0) {
                    this.viewContainers.delete(viewContainerLocation);
                }
                this._onDidDeregister.fire({ viewContainer, viewContainerLocation });
                return;
            }
        }
    }
    get(id) {
        return this.all.filter(viewContainer => viewContainer.id === id)[0];
    }
    getViewContainers(location) {
        return [...(this.viewContainers.get(location) || [])];
    }
    getViewContainerLocation(container) {
        return [...this.viewContainers.keys()].filter(location => this.getViewContainers(location).filter(viewContainer => viewContainer?.id === container.id).length > 0)[0];
    }
    getDefaultViewContainer(location) {
        return this.defaultViewContainers.find(viewContainer => this.getViewContainerLocation(viewContainer) === location);
    }
}
Registry.add(Extensions.ViewContainersRegistry, new ViewContainersRegistryImpl());
export var ViewContentGroups;
(function (ViewContentGroups) {
    ViewContentGroups["Open"] = "2_open";
    ViewContentGroups["Debug"] = "4_debug";
    ViewContentGroups["SCM"] = "5_scm";
    ViewContentGroups["More"] = "9_more";
})(ViewContentGroups || (ViewContentGroups = {}));
function compareViewContentDescriptors(a, b) {
    const aGroup = a.group ?? ViewContentGroups.More;
    const bGroup = b.group ?? ViewContentGroups.More;
    if (aGroup !== bGroup) {
        return aGroup.localeCompare(bGroup);
    }
    return (a.order ?? 5) - (b.order ?? 5);
}
class ViewsRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this._onViewsRegistered = this._register(new Emitter());
        this.onViewsRegistered = this._onViewsRegistered.event;
        this._onViewsDeregistered = this._register(new Emitter());
        this.onViewsDeregistered = this._onViewsDeregistered.event;
        this._onDidChangeContainer = this._register(new Emitter());
        this.onDidChangeContainer = this._onDidChangeContainer.event;
        this._onDidChangeViewWelcomeContent = this._register(new Emitter());
        this.onDidChangeViewWelcomeContent = this._onDidChangeViewWelcomeContent.event;
        this._viewContainers = [];
        this._views = new Map();
        this._viewWelcomeContents = new SetMap();
    }
    registerViews(views, viewContainer) {
        this.registerViews2([{ views, viewContainer }]);
    }
    registerViews2(views) {
        views.forEach(({ views, viewContainer }) => this.addViews(views, viewContainer));
        this._onViewsRegistered.fire(views);
    }
    deregisterViews(viewDescriptors, viewContainer) {
        const views = this.removeViews(viewDescriptors, viewContainer);
        if (views.length) {
            this._onViewsDeregistered.fire({ views, viewContainer });
        }
    }
    moveViews(viewsToMove, viewContainer) {
        for (const container of this._views.keys()) {
            if (container !== viewContainer) {
                const views = this.removeViews(viewsToMove, container);
                if (views.length) {
                    this.addViews(views, viewContainer);
                    this._onDidChangeContainer.fire({ views, from: container, to: viewContainer });
                }
            }
        }
    }
    getViews(loc) {
        return this._views.get(loc) || [];
    }
    getView(id) {
        for (const viewContainer of this._viewContainers) {
            const viewDescriptor = (this._views.get(viewContainer) || []).filter(v => v.id === id)[0];
            if (viewDescriptor) {
                return viewDescriptor;
            }
        }
        return null;
    }
    getViewContainer(viewId) {
        for (const viewContainer of this._viewContainers) {
            const viewDescriptor = (this._views.get(viewContainer) || []).filter(v => v.id === viewId)[0];
            if (viewDescriptor) {
                return viewContainer;
            }
        }
        return null;
    }
    registerViewWelcomeContent(id, viewContent) {
        this._viewWelcomeContents.add(id, viewContent);
        this._onDidChangeViewWelcomeContent.fire(id);
        return toDisposable(() => {
            this._viewWelcomeContents.delete(id, viewContent);
            this._onDidChangeViewWelcomeContent.fire(id);
        });
    }
    registerViewWelcomeContent2(id, viewContentMap) {
        const disposables = new Map();
        for (const [key, content] of viewContentMap) {
            this._viewWelcomeContents.add(id, content);
            disposables.set(key, toDisposable(() => {
                this._viewWelcomeContents.delete(id, content);
                this._onDidChangeViewWelcomeContent.fire(id);
            }));
        }
        this._onDidChangeViewWelcomeContent.fire(id);
        return disposables;
    }
    getViewWelcomeContent(id) {
        const result = [];
        this._viewWelcomeContents.forEach(id, descriptor => result.push(descriptor));
        return result.sort(compareViewContentDescriptors);
    }
    addViews(viewDescriptors, viewContainer) {
        let views = this._views.get(viewContainer);
        if (!views) {
            views = [];
            this._views.set(viewContainer, views);
            this._viewContainers.push(viewContainer);
        }
        for (const viewDescriptor of viewDescriptors) {
            if (this.getView(viewDescriptor.id) !== null) {
                throw new Error(localize('duplicateId', "A view with id '{0}' is already registered", viewDescriptor.id));
            }
            views.push(viewDescriptor);
        }
    }
    removeViews(viewDescriptors, viewContainer) {
        const views = this._views.get(viewContainer);
        if (!views) {
            return [];
        }
        const viewsToDeregister = [];
        const remaningViews = [];
        for (const view of views) {
            if (!viewDescriptors.includes(view)) {
                remaningViews.push(view);
            }
            else {
                viewsToDeregister.push(view);
            }
        }
        if (viewsToDeregister.length) {
            if (remaningViews.length) {
                this._views.set(viewContainer, remaningViews);
            }
            else {
                this._views.delete(viewContainer);
                this._viewContainers.splice(this._viewContainers.indexOf(viewContainer), 1);
            }
        }
        return viewsToDeregister;
    }
}
Registry.add(Extensions.ViewsRegistry, new ViewsRegistry());
export const IViewDescriptorService = createDecorator('viewDescriptorService');
export var ViewVisibilityState;
(function (ViewVisibilityState) {
    ViewVisibilityState[ViewVisibilityState["Default"] = 0] = "Default";
    ViewVisibilityState[ViewVisibilityState["Expand"] = 1] = "Expand";
})(ViewVisibilityState || (ViewVisibilityState = {}));
export var TreeItemCollapsibleState;
(function (TreeItemCollapsibleState) {
    TreeItemCollapsibleState[TreeItemCollapsibleState["None"] = 0] = "None";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(TreeItemCollapsibleState || (TreeItemCollapsibleState = {}));
export class ResolvableTreeItem {
    constructor(treeItem, resolve) {
        this.resolved = false;
        this._hasResolve = false;
        mixin(this, treeItem);
        this._hasResolve = !!resolve;
        this.resolve = async (token) => {
            if (resolve && !this.resolved) {
                const resolvedItem = await resolve(token);
                if (resolvedItem) {
                    // Resolvable elements. Currently tooltip and command.
                    this.tooltip = this.tooltip ?? resolvedItem.tooltip;
                    this.command = this.command ?? resolvedItem.command;
                }
            }
            if (!token.isCancellationRequested) {
                this.resolved = true;
            }
        };
    }
    get hasResolve() {
        return this._hasResolve;
    }
    resetResolve() {
        this.resolved = false;
    }
    asTreeItem() {
        return {
            handle: this.handle,
            parentHandle: this.parentHandle,
            collapsibleState: this.collapsibleState,
            label: this.label,
            description: this.description,
            icon: this.icon,
            iconDark: this.iconDark,
            themeIcon: this.themeIcon,
            resourceUri: this.resourceUri,
            tooltip: this.tooltip,
            contextValue: this.contextValue,
            command: this.command,
            children: this.children,
            accessibilityInformation: this.accessibilityInformation
        };
    }
}
export class NoTreeViewError extends Error {
    constructor(treeViewId) {
        super(localize('treeView.notRegistered', 'No tree view with id \'{0}\' registered.', treeViewId));
        this.name = 'NoTreeViewError';
    }
    static is(err) {
        return !!err && err.name === 'NoTreeViewError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL3ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RixPQUFPLEVBQWUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBUXRFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBSzNFLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUM7QUFDcEMsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0QsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFFcEksTUFBTSxLQUFXLFVBQVUsQ0FHMUI7QUFIRCxXQUFpQixVQUFVO0lBQ2IsaUNBQXNCLEdBQUcsb0NBQW9DLENBQUM7SUFDOUQsd0JB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
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
import { Registry } from '../../platform/registry/common/platform.js';
import { Composite, CompositeDescriptor, CompositeRegistry } from './composite.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { Separator } from '../../base/common/actions.js';
import { SubmenuItemAction } from '../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../platform/contextview/browser/contextView.js';
import { IStorageService } from '../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { ViewsSubMenu } from './parts/views/viewPaneContainer.js';
import { IExtensionService } from '../services/extensions/common/extensions.js';
import { VIEWPANE_FILTER_ACTION } from './parts/views/viewPane.js';
let PaneComposite = class PaneComposite extends Composite {
    constructor(id, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService) {
        super(id, telemetryService, themeService, storageService);
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.extensionService = extensionService;
        this.contextService = contextService;
    }
    create(parent) {
        super.create(parent);
        this.viewPaneContainer = this._register(this.createViewPaneContainer(parent));
        this._register(this.viewPaneContainer.onTitleAreaUpdate(() => this.updateTitleArea()));
        this.viewPaneContainer.create(parent);
    }
    setVisible(visible) {
        super.setVisible(visible);
        this.viewPaneContainer?.setVisible(visible);
    }
    layout(dimension) {
        this.viewPaneContainer?.layout(dimension);
    }
    setBoundarySashes(sashes) {
        this.viewPaneContainer?.setBoundarySashes(sashes);
    }
    getOptimalWidth() {
        return this.viewPaneContainer?.getOptimalWidth() ?? 0;
    }
    openView(id, focus) {
        return this.viewPaneContainer?.openView(id, focus);
    }
    getViewPaneContainer() {
        return this.viewPaneContainer;
    }
    getActionsContext() {
        return this.getViewPaneContainer()?.getActionsContext();
    }
    getContextMenuActions() {
        return this.viewPaneContainer?.menuActions?.getContextMenuActions() ?? [];
    }
    getMenuIds() {
        const result = [];
        if (this.viewPaneContainer?.menuActions) {
            result.push(this.viewPaneContainer.menuActions.menuId);
            if (this.viewPaneContainer.isViewMergedWithContainer()) {
                result.push(this.viewPaneContainer.panes[0].menuActions.menuId);
            }
        }
        return result;
    }
    getActions() {
        const result = [];
        if (this.viewPaneContainer?.menuActions) {
            result.push(...this.viewPaneContainer.menuActions.getPrimaryActions());
            if (this.viewPaneContainer.isViewMergedWithContainer()) {
                const viewPane = this.viewPaneContainer.panes[0];
                if (viewPane.shouldShowFilterInHeader()) {
                    result.push(VIEWPANE_FILTER_ACTION);
                }
                result.push(...viewPane.menuActions.getPrimaryActions());
            }
        }
        return result;
    }
    getSecondaryActions() {
        if (!this.viewPaneContainer?.menuActions) {
            return [];
        }
        const viewPaneActions = this.viewPaneContainer.isViewMergedWithContainer() ? this.viewPaneContainer.panes[0].menuActions.getSecondaryActions() : [];
        let menuActions = this.viewPaneContainer.menuActions.getSecondaryActions();
        const viewsSubmenuActionIndex = menuActions.findIndex(action => action instanceof SubmenuItemAction && action.item.submenu === ViewsSubMenu);
        if (viewsSubmenuActionIndex !== -1) {
            const viewsSubmenuAction = menuActions[viewsSubmenuActionIndex];
            if (viewsSubmenuAction.actions.some(({ enabled }) => enabled)) {
                if (menuActions.length === 1 && viewPaneActions.length === 0) {
                    menuActions = viewsSubmenuAction.actions.slice();
                }
                else if (viewsSubmenuActionIndex !== 0) {
                    menuActions = [viewsSubmenuAction, ...menuActions.slice(0, viewsSubmenuActionIndex), ...menuActions.slice(viewsSubmenuActionIndex + 1)];
                }
            }
            else {
                // Remove views submenu if none of the actions are enabled
                menuActions.splice(viewsSubmenuActionIndex, 1);
            }
        }
        if (menuActions.length && viewPaneActions.length) {
            return [
                ...menuActions,
                new Separator(),
                ...viewPaneActions
            ];
        }
        return menuActions.length ? menuActions : viewPaneActions;
    }
    getActionViewItem(action, options) {
        return this.viewPaneContainer?.getActionViewItem(action, options);
    }
    getTitle() {
        return this.viewPaneContainer?.getTitle() ?? '';
    }
    focus() {
        super.focus();
        this.viewPaneContainer?.focus();
    }
};
PaneComposite = __decorate([
    __param(1, ITelemetryService),
    __param(2, IStorageService),
    __param(3, IInstantiationService),
    __param(4, IThemeService),
    __param(5, IContextMenuService),
    __param(6, IExtensionService),
    __param(7, IWorkspaceContextService)
], PaneComposite);
export { PaneComposite };
/**
 * A Pane Composite descriptor is a lightweight descriptor of a Pane Composite in the workbench.
 */
export class PaneCompositeDescriptor extends CompositeDescriptor {
    static create(ctor, id, name, cssClass, order, requestedIndex, iconUrl) {
        return new PaneCompositeDescriptor(ctor, id, name, cssClass, order, requestedIndex, iconUrl);
    }
    constructor(ctor, id, name, cssClass, order, requestedIndex, iconUrl) {
        super(ctor, id, name, cssClass, order, requestedIndex);
        this.iconUrl = iconUrl;
    }
}
export const Extensions = {
    Viewlets: 'workbench.contributions.viewlets',
    Panels: 'workbench.contributions.panels',
    Auxiliary: 'workbench.contributions.auxiliary',
};
export class PaneCompositeRegistry extends CompositeRegistry {
    /**
     * Registers a viewlet to the platform.
     */
    registerPaneComposite(descriptor) {
        super.registerComposite(descriptor);
    }
    /**
     * Deregisters a viewlet to the platform.
     */
    deregisterPaneComposite(id) {
        super.deregisterComposite(id);
    }
    /**
     * Returns the viewlet descriptor for the given id or null if none.
     */
    getPaneComposite(id) {
        return this.getComposite(id);
    }
    /**
     * Returns an array of registered viewlets known to the platform.
     */
    getPaneComposites() {
        return this.getComposites();
    }
}
Registry.add(Extensions.Viewlets, new PaneCompositeRegistry());
Registry.add(Extensions.Panels, new PaneCompositeRegistry());
Registry.add(Extensions.Auxiliary, new PaneCompositeRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWNvbXBvc2l0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYW5lY29tcG9zaXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkYsT0FBTyxFQUF5QyxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBSXBJLE9BQU8sRUFBVyxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNsRSxPQUFPLEVBQVUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hGLE9BQU8sRUFBcUIsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFJNUQsSUFBZSxhQUFhLEdBQTVCLE1BQWUsYUFBYyxTQUFRLFNBQVM7SUFJcEQsWUFDQyxFQUFVLEVBQ1MsZ0JBQW1DLEVBQzNCLGNBQStCLEVB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
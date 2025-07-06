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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWNvbXBvc2l0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhbmVjb21wb3NpdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNuRixPQUFPLEVBQXlDLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFJcEksT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2xFLE9BQU8sRUFBVSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFxQixZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUdyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUk1RCxJQUFlLGFBQWEsR0FBNUIsTUFBZSxhQUFjLFNBQVEsU0FBUztJQUlwRCxZQUNDLEVBQVUsRUFDUyxnQkFBbUMsRUFDM0IsY0FBK0IsRUFD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
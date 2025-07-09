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
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ViewPaneContainer } from './viewPaneContainer.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let FilterViewPaneContainer = class FilterViewPaneContainer extends ViewPaneContainer {
    constructor(viewletId, onDidChangeFilterValue, configurationService, layoutService, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService, viewDescriptorService, logService) {
        super(viewletId, { mergeViewWithContainerWhenSingleView: false }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.constantViewDescriptors = new Map();
        this.allViews = new Map();
        this._register(onDidChangeFilterValue(newFilterValue => {
            this.filterValue = newFilterValue;
            this.onFilterChanged(newFilterValue);
        }));
        this._register(this.viewContainerModel.onDidChangeActiveViewDescriptors(() => {
            this.updateAllViews(this.viewContainerModel.activeViewDescriptors);
        }));
    }
    updateAllViews(viewDescriptors) {
        viewDescriptors.forEach(descriptor => {
            const filterOnValue = this.getFilterOn(descriptor);
            if (!filterOnValue) {
                return;
            }
            if (!this.allViews.has(filterOnValue)) {
                this.allViews.set(filterOnValue, new Map());
            }
            this.allViews.get(filterOnValue).set(descriptor.id, descriptor);
            if (this.filterValue && !this.filterValue.includes(filterOnValue) && this.panes.find(pane => pane.id === descriptor.id)) {
                this.viewContainerModel.setVisible(descriptor.id, false);
            }
        });
    }
    addConstantViewDescriptors(constantViewDescriptors) {
        constantViewDescriptors.forEach(viewDescriptor => this.constantViewDescriptors.set(viewDescriptor.id, viewDescriptor));
    }
    onFilterChanged(newFilterValue) {
        if (this.allViews.size === 0) {
            this.updateAllViews(this.viewContainerModel.activeViewDescriptors);
        }
        this.getViewsNotForTarget(newFilterValue).forEach(item => this.viewContainerModel.setVisible(item.id, false));
        this.getViewsForTarget(newFilterValue).forEach(item => this.viewContainerModel.setVisible(item.id, true));
    }
    getViewsForTarget(target) {
        const views = [];
        for (let i = 0; i < target.length; i++) {
            if (this.allViews.has(target[i])) {
                views.push(...Array.from(this.allViews.get(target[i]).values()));
            }
        }
        return views;
    }
    getViewsNotForTarget(target) {
        const iterable = this.allViews.keys();
        let key = iterable.next();
        let views = [];
        while (!key.done) {
            let isForTarget = false;
            target.forEach(value => {
                if (key.value === value) {
                    isForTarget = true;
                }
            });
            if (!isForTarget) {
                views = views.concat(this.getViewsForTarget([key.value]));
            }
            key = iterable.next();
        }
        return views;
    }
    onDidAddViewDescriptors(added) {
        const panes = super.onDidAddViewDescriptors(added);
        for (let i = 0; i < added.length; i++) {
            if (this.constantViewDescriptors.has(added[i].viewDescriptor.id)) {
                panes[i].setExpanded(false);
            }
        }
        // Check that allViews is ready
        if (this.allViews.size === 0) {
            this.updateAllViews(this.viewContainerModel.activeViewDescriptors);
        }
        return panes;
    }
    openView(id, focus) {
        const result = super.openView(id, focus);
        if (result) {
            const descriptorMap = Array.from(this.allViews.entries()).find(entry => entry[1].has(id));
            if (descriptorMap && !this.filterValue?.includes(descriptorMap[0])) {
                this.setFilter(descriptorMap[1].get(id));
            }
        }
        return result;
    }
};
FilterViewPaneContainer = __decorate([
    __param(2, IConfigurationService),
    __param(3, IWorkbenchLayoutService),
    __param(4, ITelemetryService),
    __param(5, IStorageService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IContextMenuService),
    __param(9, IExtensionService),
    __param(10, IWorkspaceContextService),
    __param(11, IViewDescriptorService),
    __param(12, ILogService)
], FilterViewPaneContainer);
export { FilterViewPaneContainer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NWaWV3bGV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3ZpZXdzL3ZpZXdzVmlld2xldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQW1CLHNCQUFzQixFQUFrQyxNQUFNLDBCQUEwQixDQUFDO0FBQ25ILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFHM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBTTlELElBQWUsdUJBQXVCLEdBQXRDLE1BQWUsdUJBQXdCLFNBQVEsaUJBQWlCO0lBS3RFLFlBQ0MsU0FBaUIsRUFDakIsc0JBQXVDLEVBQ2hCLG9CQUEyQyxFQUN6QyxhQUFzQyxFQUM1QyxnQkFBbUMsRUFDckMsY0FBK0IsRUFDekIsb0JB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
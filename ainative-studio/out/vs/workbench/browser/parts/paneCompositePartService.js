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
import { Event } from '../../../base/common/event.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { AuxiliaryBarPart } from './auxiliarybar/auxiliaryBarPart.js';
import { PanelPart } from './panel/panelPart.js';
import { SidebarPart } from './sidebar/sidebarPart.js';
import { ViewContainerLocations } from '../../common/views.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
let PaneCompositePartService = class PaneCompositePartService extends Disposable {
    constructor(instantiationService) {
        super();
        this.paneCompositeParts = new Map();
        const panelPart = instantiationService.createInstance(PanelPart);
        const sideBarPart = instantiationService.createInstance(SidebarPart);
        const auxiliaryBarPart = instantiationService.createInstance(AuxiliaryBarPart);
        this.paneCompositeParts.set(1 /* ViewContainerLocation.Panel */, panelPart);
        this.paneCompositeParts.set(0 /* ViewContainerLocation.Sidebar */, sideBarPart);
        this.paneCompositeParts.set(2 /* ViewContainerLocation.AuxiliaryBar */, auxiliaryBarPart);
        const eventDisposables = this._register(new DisposableStore());
        this.onDidPaneCompositeOpen = Event.any(...ViewContainerLocations.map(loc => Event.map(this.paneCompositeParts.get(loc).onDidPaneCompositeOpen, composite => { return { composite, viewContainerLocation: loc }; }, eventDisposables)));
        this.onDidPaneCompositeClose = Event.any(...ViewContainerLocations.map(loc => Event.map(this.paneCompositeParts.get(loc).onDidPaneCompositeClose, composite => { return { composite, viewContainerLocation: loc }; }, eventDisposables)));
    }
    openPaneComposite(id, viewContainerLocation, focus) {
        return this.getPartByLocation(viewContainerLocation).openPaneComposite(id, focus);
    }
    getActivePaneComposite(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getActivePaneComposite();
    }
    getPaneComposite(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposite(id);
    }
    getPaneComposites(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposites();
    }
    getPinnedPaneCompositeIds(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPinnedPaneCompositeIds();
    }
    getVisiblePaneCompositeIds(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getVisiblePaneCompositeIds();
    }
    getPaneCompositeIds(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneCompositeIds();
    }
    getProgressIndicator(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getProgressIndicator(id);
    }
    hideActivePaneComposite(viewContainerLocation) {
        this.getPartByLocation(viewContainerLocation).hideActivePaneComposite();
    }
    getLastActivePaneCompositeId(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getLastActivePaneCompositeId();
    }
    getPartByLocation(viewContainerLocation) {
        return assertIsDefined(this.paneCompositeParts.get(viewContainerLocation));
    }
};
PaneCompositePartService = __decorate([
    __param(0, IInstantiationService)
], PaneCompositePartService);
export { PaneCompositePartService };
registerSingleton(IPaneCompositePartService, PaneCompositePartService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZVBhcnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3BhbmVDb21wb3NpdGVQYXJ0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDakQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXZELE9BQU8sRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN0RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR3pFLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQVN2RCxZQUN3QixvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFMUSx1QkFBa0IsR0FBRyxJQUFJLEdBQUcsRUFBNkMsQ0FBQztRQU8xRixNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakUsTUFBTSxXQUFXLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFL0UsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsc0NBQThCLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLHdDQUFnQyxXQUFXLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyw2Q0FBcUMsZ0JBQWdCLENBQUMsQ0FBQztRQUVsRixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDLHNCQUFzQixFQUFFLFNBQVMsQ0FBQyxFQUFFLEdBQUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6TyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsRUFBRSxHQUFHLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNU8sQ0FBQztJQUVELGlCQUFpQixDQUFDLEVBQXNCLEVBQUUscUJBQTRDLEVBQUUsS0FBZTtRQUN0RyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRUQsc0JBQXNCLENBQUMscUJBQTRDO1FBQ2xFLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztJQUMvRSxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsRUFBVSxFQUFFLHFCQUE0QztRQUN4RSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxxQkFBNEM7UUFDN0QsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFFLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxxQkFBNEM7UUFDckUsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO0lBQ2xGLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxxQkFBNEM7UUFDdEUsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBQ25GLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxxQkFBNEM7UUFDL0QsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVFLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxFQUFVLEVBQUUscUJBQTRDO1FBQzVFLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVELHVCQUF1QixDQUFDLHFCQUE0QztRQUNuRSxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ3pFLENBQUM7SUFFRCw0QkFBNEIsQ0FBQyxxQkFBNEM7UUFDeEUsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO0lBQ3JGLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxxQkFBNEM7UUFDckUsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUVELENBQUE7QUF2RVksd0JBQXdCO0lBVWxDLFdBQUEscUJBQXFCLENBQUE7R0FWWCx3QkFBd0IsQ0F1RXBDOztBQUVELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQyJ9
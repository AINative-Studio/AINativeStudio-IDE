/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewContainerExtensions, Extensions as ViewExtensions, IViewDescriptorService, } from '../../../common/views.js';
import * as nls from '../../../../nls.js';
// import { Codicon } from '../../../../base/common/codicons.js';
// import { localize } from '../../../../nls.js';
// import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
// import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
// import { IDisposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { mountSidebar } from './react/out/sidebar-tsx/index.js';
import { Codicon } from '../../../../base/common/codicons.js';
// import { IDisposable } from '../../../../base/common/lifecycle.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
// compare against search.contribution.ts and debug.contribution.ts, scm.contribution.ts (source control)
// ---------- Define viewpane ----------
let SidebarViewPane = class SidebarViewPane extends ViewPane {
    constructor(options, instantiationService, viewDescriptorService, configurationService, contextKeyService, themeService, contextMenuService, keybindingService, openerService, telemetryService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
    }
    renderBody(parent) {
        super.renderBody(parent);
        // parent.style.overflow = 'auto'
        parent.style.userSelect = 'text';
        // gets set immediately
        this.instantiationService.invokeFunction(accessor => {
            // mount react
            const disposeFn = mountSidebar(parent, accessor)?.dispose;
            this._register(toDisposable(() => disposeFn?.()));
        });
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
    }
};
SidebarViewPane = __decorate([
    __param(1, IInstantiationService),
    __param(2, IViewDescriptorService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IThemeService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, IOpenerService),
    __param(9, ITelemetryService),
    __param(10, IHoverService)
], SidebarViewPane);
// ---------- Register viewpane inside the void container ----------
// const voidThemeIcon = Codicon.symbolObject;
// const voidViewIcon = registerIcon('void-view-icon', voidThemeIcon, localize('voidViewIcon', 'View icon of the Void chat view.'));
// called VIEWLET_ID in other places for some reason
export const VOID_VIEW_CONTAINER_ID = 'workbench.view.void';
export const VOID_VIEW_ID = VOID_VIEW_CONTAINER_ID;
// Register view container
const viewContainerRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer({
    id: VOID_VIEW_CONTAINER_ID,
    title: nls.localize2('voidContainer', 'Chat'), // this is used to say "Void" (Ctrl + L)
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VOID_VIEW_CONTAINER_ID, {
            mergeViewWithContainerWhenSingleView: true,
            orientation: 1 /* Orientation.HORIZONTAL */,
        }]),
    hideIfEmpty: false,
    order: 1,
    rejectAddedViews: true,
    icon: Codicon.symbolMethod,
}, 2 /* ViewContainerLocation.AuxiliaryBar */, { doNotRegisterOpenCommand: true, isDefault: true });
// Register search default location to the container (sidebar)
const viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
        id: VOID_VIEW_ID,
        hideByDefault: false, // start open
        // containerIcon: voidViewIcon,
        name: nls.localize2('voidChat', ''), // this says ... : CHAT
        ctorDescriptor: new SyncDescriptor(SidebarViewPane),
        canToggleVisibility: false,
        canMoveView: false, // can't move this out of its container
        weight: 80,
        order: 1,
        // singleViewPaneContainerTitle: 'hi',
        // openCommandActionDescriptor: {
        // 	id: VOID_VIEW_CONTAINER_ID,
        // 	keybindings: {
        // 		primary: KeyMod.CtrlCmd | KeyCode.KeyL,
        // 	},
        // 	order: 1
        // },
    }], container);
// open sidebar
export const VOID_OPEN_SIDEBAR_ACTION_ID = 'void.openSidebar';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_OPEN_SIDEBAR_ACTION_ID,
            title: 'Open Void Sidebar',
        });
    }
    run(accessor) {
        const viewsService = accessor.get(IViewsService);
        viewsService.openViewContainer(VOID_VIEW_CONTAINER_ID);
    }
});
let SidebarStartContribution = class SidebarStartContribution {
    static { this.ID = 'workbench.contrib.startupVoidSidebar'; }
    constructor(commandService) {
        this.commandService = commandService;
        this.commandService.executeCommand(VOID_OPEN_SIDEBAR_ACTION_ID);
    }
};
SidebarStartContribution = __decorate([
    __param(0, ICommandService)
], SidebarStartContribution);
export { SidebarStartContribution };
registerWorkbenchContribution2(SidebarStartContribution.ID, SidebarStartContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvc2lkZWJhclBhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEVBQ0UsVUFBVSxJQUFJLGNBQWMsRUFDbkUsc0JBQXNCLEdBQ3RCLE1BQU0sMEJBQTBCLENBQUM7QUFFbEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxpRUFBaUU7QUFDakUsaURBQWlEO0FBQ2pELG9GQUFvRjtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUV0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYseUVBQXlFO0FBR3pFLE9BQU8sRUFBb0IsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsc0VBQXNFO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENB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
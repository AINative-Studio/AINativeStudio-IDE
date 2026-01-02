/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
// TEMP: React build needed
// import { mountSidebar } from './react/out/sidebar-tsx/index.js';
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
export const AINATIVE_VIEW_CONTAINER_ID = 'workbench.view.void';
export const AINATIVE_VIEW_ID = AINATIVE_VIEW_CONTAINER_ID;
// Register view container
const viewContainerRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
const container = viewContainerRegistry.registerViewContainer({
    id: AINATIVE_VIEW_CONTAINER_ID,
    title: nls.localize2('voidContainer', 'Cody'), // this is used to say "AINative Studio" (Ctrl + L)
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [AINATIVE_VIEW_CONTAINER_ID, {
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
        id: AINATIVE_VIEW_ID,
        hideByDefault: false, // start open
        // containerIcon: voidViewIcon,
        name: nls.localize2('voidChat', 'Cody'), // this says ... : Cody
        ctorDescriptor: new SyncDescriptor(SidebarViewPane),
        canToggleVisibility: false,
        canMoveView: false, // can't move this out of its container
        weight: 80,
        order: 1,
        // singleViewPaneContainerTitle: 'hi',
        // openCommandActionDescriptor: {
        // 	id: AINATIVE_VIEW_CONTAINER_ID,
        // 	keybindings: {
        // 		primary: KeyMod.CtrlCmd | KeyCode.KeyL,
        // 	},
        // 	order: 1
        // },
    }], container);
// open sidebar
export const AINATIVE_OPEN_SIDEBAR_ACTION_ID = 'void.openSidebar';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_OPEN_SIDEBAR_ACTION_ID,
            title: 'Open AINative Studio Sidebar',
        });
    }
    run(accessor) {
        const viewsService = accessor.get(IViewsService);
        viewsService.openViewContainer(AINATIVE_VIEW_CONTAINER_ID);
    }
});
let SidebarStartContribution = class SidebarStartContribution {
    static { this.ID = 'workbench.contrib.startupVoidSidebar'; }
    constructor(commandService) {
        this.commandService = commandService;
        this.commandService.executeCommand(AINATIVE_OPEN_SIDEBAR_ACTION_ID);
    }
};
SidebarStartContribution = __decorate([
    __param(0, ICommandService)
], SidebarStartContribution);
export { SidebarStartContribution };
registerWorkbenchContribution2(SidebarStartContribution.ID, SidebarStartContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvc2lkZWJhclBhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEVBQ0UsVUFBVSxJQUFJLGNBQWMsRUFDbkUsc0JBQXNCLEdBQ3RCLE1BQU0sMEJBQTBCLENBQUM7QUFFbEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxpRUFBaUU7QUFDakUsaURBQWlEO0FBQ2pELG9GQUFvRjtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUV0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYseUVBQXlFO0FBR3pFLE9BQU8sRUFBb0IsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsc0VBQXNFO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENB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
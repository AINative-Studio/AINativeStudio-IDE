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
    title: nls.localize2('voidContainer', 'Chat'), // this is used to say "AINative Studio" (Ctrl + L)
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
            title: 'Open AINative Studio Sidebar',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3NpZGViYXJQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixFQUNFLFVBQVUsSUFBSSxjQUFjLEVBQ25FLHNCQUFzQixHQUN0QixNQUFNLDBCQUEwQixDQUFDO0FBRWxDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsaUVBQWlFO0FBQ2pFLGlEQUFpRDtBQUNqRCxvRkFBb0Y7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLHlFQUF5RTtBQUd6RSxPQUFPLEVBQW9CLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLHNFQUFzRTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxD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
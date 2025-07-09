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
var SidebarPart_1;
import './media/sidebarpart.css';
import './sidebarActions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { SidebarFocusContext, ActiveViewletContext } from '../../../common/contextkeys.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { SIDE_BAR_TITLE_FOREGROUND, SIDE_BAR_TITLE_BORDER, SIDE_BAR_BACKGROUND, SIDE_BAR_FOREGROUND, SIDE_BAR_BORDER, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_TOP_FOREGROUND, ACTIVITY_BAR_TOP_ACTIVE_BORDER, ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND, ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER } from '../../../common/theme.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../paneCompositePart.js';
import { ActivityBarCompositeBar, ActivitybarPart } from '../activitybar/activitybarPart.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Action2, IMenuService, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Separator } from '../../../../base/common/actions.js';
import { ToggleActivityBarVisibilityActionId } from '../../actions/layoutActions.js';
import { localize2 } from '../../../../nls.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let SidebarPart = class SidebarPart extends AbstractPaneCompositePart {
    static { SidebarPart_1 = this; }
    static { this.activeViewletSettingsKey = 'workbench.sidebar.activeviewletid'; }
    get snap() { return true; }
    get preferredWidth() {
        const viewlet = this.getActivePaneComposite();
        if (!viewlet) {
            return;
        }
        const width = viewlet.getOptimalWidth();
        if (typeof width !== 'number') {
            return;
        }
        return Math.max(width, 300);
    }
    //#endregion
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, configurationService, menuService) {
        super("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, { hasTitle: true, borderWidth: () => (this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder)) ? 1 : 0 }, SidebarPart_1.activeViewletSettingsKey, ActiveViewletContext.bindTo(contextKeyService), SidebarFocusContext.bindTo(contextKeyService), 'sideBar', 'viewlet', SIDE_BAR_TITLE_FOREGROUND, SIDE_BAR_TITLE_BORDER, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        this.configurationService = configurationService;
        //#region IView
        this.minimumWidth = 170;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this.priority = 1 /* LayoutPriority.Low */;
        this.activityBarPart = this._register(this.instantiationService.createInstance(ActivitybarPart, this));
        this.rememberActivityBarVisiblePosition();
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                this.onDidChangeActivityBarLocation();
            }
        }));
        this.registerActions();
    }
    onDidChangeActivityBarLocation() {
        this.activityBarPart.hide();
        this.updateCompositeBar();
        const id = this.getActiveComposite()?.getId();
        if (id) {
            this.onTitleAreaUpdate(id);
        }
        if (this.shouldShowActivityBar()) {
            this.activityBarPart.show();
        }
        this.rememberActivityBarVisiblePosition();
    }
    updateStyles() {
        super.updateStyles();
        const container = assertIsDefined(this.getContainer());
        container.style.backgroundColor = this.getColor(SIDE_BAR_BACKGROUND) || '';
        container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';
        const borderColor = this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder);
        const isPositionLeft = this.layoutService.getSideBarPosition() === 0 /* SideBarPosition.LEFT */;
        container.style.borderRightWidth = borderColor && isPositionLeft ? '1px' : '';
        container.style.borderRightStyle = borderColor && isPositionLeft ? 'solid' : '';
        container.style.borderRightColor = isPositionLeft ? borderColor || '' : '';
        container.style.borderLeftWidth = borderColor && !isPositionLeft ? '1px' : '';
        container.style.borderLeftStyle = borderColor && !isPositionLeft ? 'solid' : '';
        container.style.borderLeftColor = !isPositionLeft ? borderColor || '' : '';
        container.style.outlineColor = this.getColor(SIDE_BAR_DRAG_AND_DROP_BACKGROUND) ?? '';
    }
    layout(width, height, top, left) {
        if (!this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            return;
        }
        super.layout(width, height, top, left);
    }
    getTitleAreaDropDownAnchorAlignment() {
        return this.layoutService.getSideBarPosition() === 0 /* SideBarPosition.LEFT */ ? 0 /* AnchorAlignment.LEFT */ : 1 /* AnchorAlignment.RIGHT */;
    }
    createCompositeBar() {
        return this.instantiationService.createInstance(ActivityBarCompositeBar, this.getCompositeBarOptions(), this.partId, this, false);
    }
    getCompositeBarOptions() {
        return {
            partContainerClass: 'sidebar',
            pinnedViewContainersKey: ActivitybarPart.pinnedViewContainersKey,
            placeholderViewContainersKey: ActivitybarPart.placeholderViewContainersKey,
            viewContainersWorkspaceStateKey: ActivitybarPart.viewContainersWorkspaceStateKey,
            icon: true,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.getCompositeBarPosition() === CompositeBarPosition.BOTTOM ? 3 /* HoverPosition.ABOVE */ : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: actions => {
                if (this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
                    const viewsSubmenuAction = this.getViewsSubmenuAction();
                    if (viewsSubmenuAction) {
                        actions.push(new Separator());
                        actions.push(viewsSubmenuAction);
                    }
                }
            },
            compositeSize: 0,
            iconSize: 16,
            overflowActionSize: 30,
            colors: theme => ({
                activeBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                inactiveBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                activeBorderBottomColor: theme.getColor(ACTIVITY_BAR_TOP_ACTIVE_BORDER),
                activeForegroundColor: theme.getColor(ACTIVITY_BAR_TOP_FOREGROUND),
                inactiveForegroundColor: theme.getColor(ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND),
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                dragAndDropBorder: theme.getColor(ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER)
            }),
            compact: true
        };
    }
    shouldShowCompositeBar() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        return activityBarPosition === "top" /* ActivityBarPosition.TOP */ || activityBarPosition === "bottom" /* ActivityBarPosition.BOTTOM */;
    }
    shouldShowActivityBar() {
        if (this.shouldShowCompositeBar()) {
            return false;
        }
        return this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) !== "hidden" /* ActivityBarPosition.HIDDEN */;
    }
    getCompositeBarPosition() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        switch (activityBarPosition) {
            case "top" /* ActivityBarPosition.TOP */: return CompositeBarPosition.TOP;
            case "bottom" /* ActivityBarPosition.BOTTOM */: return CompositeBarPosition.BOTTOM;
            case "hidden" /* ActivityBarPosition.HIDDEN */:
            case "default" /* ActivityBarPosition.DEFAULT */: // noop
            default: return CompositeBarPosition.TITLE;
        }
    }
    rememberActivityBarVisiblePosition() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        if (activityBarPosition !== "hidden" /* ActivityBarPosition.HIDDEN */) {
            this.storageService.store("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, activityBarPosition, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
    getRememberedActivityBarVisiblePosition() {
        const activityBarPosition = this.storageService.get("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, 0 /* StorageScope.PROFILE */);
        switch (activityBarPosition) {
            case "top" /* ActivityBarPosition.TOP */: return "top" /* ActivityBarPosition.TOP */;
            case "bottom" /* ActivityBarPosition.BOTTOM */: return "bottom" /* ActivityBarPosition.BOTTOM */;
            default: return "default" /* ActivityBarPosition.DEFAULT */;
        }
    }
    getPinnedPaneCompositeIds() {
        return this.shouldShowCompositeBar() ? super.getPinnedPaneCompositeIds() : this.activityBarPart.getPinnedPaneCompositeIds();
    }
    getVisiblePaneCompositeIds() {
        return this.shouldShowCompositeBar() ? super.getVisiblePaneCompositeIds() : this.activityBarPart.getVisiblePaneCompositeIds();
    }
    getPaneCompositeIds() {
        return this.shouldShowCompositeBar() ? super.getPaneCompositeIds() : this.activityBarPart.getPaneCompositeIds();
    }
    async focusActivityBar() {
        if (this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) === "hidden" /* ActivityBarPosition.HIDDEN */) {
            await this.configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, this.getRememberedActivityBarVisiblePosition());
            this.onDidChangeActivityBarLocation();
        }
        if (this.shouldShowCompositeBar()) {
            this.focusCompositeBar();
        }
        else {
            if (!this.layoutService.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)) {
                this.layoutService.setPartHidden(false, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */);
            }
            this.activityBarPart.show(true);
        }
    }
    registerActions() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: ToggleActivityBarVisibilityActionId,
                    title: localize2('toggleActivityBar', "Toggle Activity Bar Visibility"),
                });
            }
            run() {
                const value = that.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */) === "hidden" /* ActivityBarPosition.HIDDEN */ ? that.getRememberedActivityBarVisiblePosition() : "hidden" /* ActivityBarPosition.HIDDEN */;
                return that.configurationService.updateValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */, value);
            }
        }));
    }
    toJSON() {
        return {
            type: "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */
        };
    }
};
SidebarPart = SidebarPart_1 = __decorate([
    __param(0, INotificationService),
    __param(1, IStorageService),
    __param(2, IContextMenuService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IKeybindingService),
    __param(5, IHoverService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IViewDescriptorService),
    __param(9, IContextKeyService),
    __param(10, IExtensionService),
    __param(11, IConfigurationService),
    __param(12, IMenuService)
], SidebarPart);
export { SidebarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvc2lkZWJhci9zaWRlYmFyUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLHFCQUFxQixDQUFDO0FBQzdCLE9BQU8sRUFBdUIsdUJBQXVCLEVBQXNELE1BQU0sbURBQW1ELENBQUM7QUFDckssT0FBTyxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsaUNBQWlDLEVBQUUsNkJBQTZCLEVBQUUsNkJBQTZCLEVBQUUsMkJBQTJCLEVBQUUsOEJBQThCLEVBQUUsb0NBQW9DLEVBQUUscUNBQXFDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsWSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFB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
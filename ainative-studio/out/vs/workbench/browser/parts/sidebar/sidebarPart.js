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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhclBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9zaWRlYmFyL3NpZGViYXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8scUJBQXFCLENBQUM7QUFDN0IsT0FBTyxFQUF1Qix1QkFBdUIsRUFBc0QsTUFBTSxtREFBbUQsQ0FBQztBQUNySyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxpQ0FBaUMsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSwyQkFBMkIsRUFBRSw4QkFBOEIsRUFBRSxvQ0FBb0MsRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2xZLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFz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
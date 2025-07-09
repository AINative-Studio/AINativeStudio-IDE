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
var AuxiliaryBarPart_1;
import './media/auxiliaryBarPart.css';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ActiveAuxiliaryContext, AuxiliaryBarFocusContext } from '../../../common/contextkeys.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND, ACTIVITY_BAR_BADGE_FOREGROUND, ACTIVITY_BAR_TOP_ACTIVE_BORDER, ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER, ACTIVITY_BAR_TOP_FOREGROUND, ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_DRAG_AND_DROP_BORDER, PANEL_INACTIVE_TITLE_FOREGROUND, SIDE_BAR_BACKGROUND, SIDE_BAR_BORDER, SIDE_BAR_TITLE_BORDER, SIDE_BAR_FOREGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Separator, SubmenuAction, toAction } from '../../../../base/common/actions.js';
import { ToggleAuxiliaryBarAction } from './auxiliaryBarActions.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { ToggleSidebarPositionAction } from '../../actions/layoutActions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { AbstractPaneCompositePart, CompositeBarPosition } from '../paneCompositePart.js';
import { prepareActions } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { $ } from '../../../../base/browser/dom.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { CompositeMenuActions } from '../../actions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let AuxiliaryBarPart = class AuxiliaryBarPart extends AbstractPaneCompositePart {
    static { AuxiliaryBarPart_1 = this; }
    static { this.activeViewSettingsKey = 'workbench.auxiliarybar.activepanelid'; }
    static { this.pinnedViewsKey = 'workbench.auxiliarybar.pinnedPanels'; }
    static { this.placeholdeViewContainersKey = 'workbench.auxiliarybar.placeholderPanels'; }
    static { this.viewContainersWorkspaceStateKey = 'workbench.auxiliarybar.viewContainersWorkspaceState'; }
    get preferredHeight() {
        // Don't worry about titlebar or statusbar visibility
        // The difference is minimal and keeps this function clean
        return this.layoutService.mainContainerDimension.height * 0.4;
    }
    get preferredWidth() {
        const activeComposite = this.getActivePaneComposite();
        if (!activeComposite) {
            return;
        }
        const width = activeComposite.getOptimalWidth();
        if (typeof width !== 'number') {
            return;
        }
        return Math.max(width, 300);
    }
    constructor(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, commandService, menuService, configurationService) {
        super("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, {
            hasTitle: true,
            borderWidth: () => (this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder)) ? 1 : 0,
        }, AuxiliaryBarPart_1.activeViewSettingsKey, ActiveAuxiliaryContext.bindTo(contextKeyService), AuxiliaryBarFocusContext.bindTo(contextKeyService), 'auxiliarybar', 'auxiliarybar', undefined, SIDE_BAR_TITLE_BORDER, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService);
        this.commandService = commandService;
        this.configurationService = configurationService;
        // Use the side bar dimensions
        this.minimumWidth = 280; // Void changed this (was 170)
        this.maximumWidth = Number.POSITIVE_INFINITY;
        this.minimumHeight = 0;
        this.maximumHeight = Number.POSITIVE_INFINITY;
        this.priority = 1 /* LayoutPriority.Low */;
        this.configuration = this.resolveConfiguration();
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                this.configuration = this.resolveConfiguration();
                this.onDidChangeActivityBarLocation();
            }
            else if (e.affectsConfiguration('workbench.secondarySideBar.showLabels')) {
                this.configuration = this.resolveConfiguration();
                this.updateCompositeBar(true);
            }
        }));
    }
    resolveConfiguration() {
        const position = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        const canShowLabels = position !== "top" /* ActivityBarPosition.TOP */; // otherwise labels would repeat vertically
        const showLabels = canShowLabels && this.configurationService.getValue('workbench.secondarySideBar.showLabels') !== false;
        return { position, canShowLabels, showLabels };
    }
    onDidChangeActivityBarLocation() {
        this.updateCompositeBar();
        const id = this.getActiveComposite()?.getId();
        if (id) {
            this.onTitleAreaUpdate(id);
        }
    }
    updateStyles() {
        super.updateStyles();
        const container = assertIsDefined(this.getContainer());
        container.style.backgroundColor = this.getColor(SIDE_BAR_BACKGROUND) || '';
        const borderColor = this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder);
        const isPositionLeft = this.layoutService.getSideBarPosition() === 1 /* Position.RIGHT */;
        container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';
        container.style.borderLeftColor = borderColor ?? '';
        container.style.borderRightColor = borderColor ?? '';
        container.style.borderLeftStyle = borderColor && !isPositionLeft ? 'solid' : 'none';
        container.style.borderRightStyle = borderColor && isPositionLeft ? 'solid' : 'none';
        container.style.borderLeftWidth = borderColor && !isPositionLeft ? '1px' : '0px';
        container.style.borderRightWidth = borderColor && isPositionLeft ? '1px' : '0px';
    }
    getCompositeBarOptions() {
        const $this = this;
        return {
            partContainerClass: 'auxiliarybar',
            pinnedViewContainersKey: AuxiliaryBarPart_1.pinnedViewsKey,
            placeholderViewContainersKey: AuxiliaryBarPart_1.placeholdeViewContainersKey,
            viewContainersWorkspaceStateKey: AuxiliaryBarPart_1.viewContainersWorkspaceStateKey,
            icon: !this.configuration.showLabels,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            recomputeSizes: true,
            activityHoverOptions: {
                position: () => this.getCompositeBarPosition() === CompositeBarPosition.BOTTOM ? 3 /* HoverPosition.ABOVE */ : 2 /* HoverPosition.BELOW */,
            },
            fillExtraContextMenuActions: actions => this.fillExtraContextMenuActions(actions),
            compositeSize: 0,
            iconSize: 16,
            // Add 10px spacing if the overflow action is visible to no confuse the user with ... between the toolbars
            get overflowActionSize() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? 40 : 30; },
            colors: theme => ({
                activeBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                inactiveBackgroundColor: theme.getColor(SIDE_BAR_BACKGROUND),
                get activeBorderBottomColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_ACTIVE_TITLE_BORDER) : theme.getColor(ACTIVITY_BAR_TOP_ACTIVE_BORDER); },
                get activeForegroundColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND) : theme.getColor(ACTIVITY_BAR_TOP_FOREGROUND); },
                get inactiveForegroundColor() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND) : theme.getColor(ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND); },
                badgeBackground: theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND),
                badgeForeground: theme.getColor(ACTIVITY_BAR_BADGE_FOREGROUND),
                get dragAndDropBorder() { return $this.getCompositeBarPosition() === CompositeBarPosition.TITLE ? theme.getColor(PANEL_DRAG_AND_DROP_BORDER) : theme.getColor(ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER); }
            }),
            compact: true
        };
    }
    fillExtraContextMenuActions(actions) {
        const currentPositionRight = this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */;
        if (this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
            const viewsSubmenuAction = this.getViewsSubmenuAction();
            if (viewsSubmenuAction) {
                actions.push(new Separator());
                actions.push(viewsSubmenuAction);
            }
        }
        const activityBarPositionMenu = this.menuService.getMenuActions(MenuId.ActivityBarPositionMenu, this.contextKeyService, { shouldForwardArgs: true, renderShortTitle: true });
        const positionActions = getContextMenuActions(activityBarPositionMenu).secondary;
        const toggleShowLabelsAction = toAction({
            id: 'workbench.action.auxiliarybar.toggleShowLabels',
            label: this.configuration.showLabels ? localize('showIcons', "Show Icons") : localize('showLabels', "Show Labels"),
            enabled: this.configuration.canShowLabels,
            run: () => this.configurationService.updateValue('workbench.secondarySideBar.showLabels', !this.configuration.showLabels)
        });
        actions.push(...[
            new Separator(),
            new SubmenuAction('workbench.action.panel.position', localize('activity bar position', "Activity Bar Position"), positionActions),
            toAction({ id: ToggleSidebarPositionAction.ID, label: currentPositionRight ? localize('move second side bar left', "Move Void Side Bar Left") : localize('move second side bar right', "Move Void Side Bar Right"), run: () => this.commandService.executeCommand(ToggleSidebarPositionAction.ID) }),
            toggleShowLabelsAction,
            toAction({ id: ToggleAuxiliaryBarAction.ID, label: localize('hide second side bar', "Hide Void Side Bar"), run: () => this.commandService.executeCommand(ToggleAuxiliaryBarAction.ID) })
        ]);
    }
    shouldShowCompositeBar() {
        return this.configuration.position !== "hidden" /* ActivityBarPosition.HIDDEN */;
    }
    getCompositeBarPosition() {
        switch (this.configuration.position) {
            case "top" /* ActivityBarPosition.TOP */: return CompositeBarPosition.TOP;
            case "bottom" /* ActivityBarPosition.BOTTOM */: return CompositeBarPosition.BOTTOM;
            case "hidden" /* ActivityBarPosition.HIDDEN */: return CompositeBarPosition.TITLE;
            case "default" /* ActivityBarPosition.DEFAULT */: return CompositeBarPosition.TITLE;
            default: return CompositeBarPosition.TITLE;
        }
    }
    createHeaderArea() {
        const headerArea = super.createHeaderArea();
        const globalHeaderContainer = $('.auxiliary-bar-global-header');
        // Add auxillary header action
        const menu = this.headerFooterCompositeBarDispoables.add(this.instantiationService.createInstance(CompositeMenuActions, MenuId.AuxiliaryBarHeader, undefined, undefined));
        const toolBar = this.headerFooterCompositeBarDispoables.add(this.instantiationService.createInstance(WorkbenchToolBar, globalHeaderContainer, {
            actionViewItemProvider: (action, options) => this.headerActionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id),
        }));
        toolBar.setActions(prepareActions(menu.getPrimaryActions()));
        this.headerFooterCompositeBarDispoables.add(menu.onDidChange(() => toolBar.setActions(prepareActions(menu.getPrimaryActions()))));
        headerArea.appendChild(globalHeaderContainer);
        return headerArea;
    }
    headerActionViewItemProvider(action, options) {
        if (action.id === ToggleAuxiliaryBarAction.ID) {
            return this.instantiationService.createInstance(ActionViewItem, undefined, action, options);
        }
        return undefined;
    }
    toJSON() {
        return {
            type: "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */
        };
    }
};
AuxiliaryBarPart = AuxiliaryBarPart_1 = __decorate([
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
    __param(11, ICommandService),
    __param(12, IMenuService),
    __param(13, IConfigurationService)
], AuxiliaryBarPart);
export { AuxiliaryBarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5QmFyUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9hdXhpbGlhcnliYXIvYXV4aWxpYXJ5QmFyUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixFQUFFLDhCQUE4QixFQUFFLHFDQUFxQyxFQUFFLDJCQUEyQixFQUFFLG9DQUFvQyxFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLDBCQUEwQixFQUFFLCtCQUErQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFB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
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
import { localize } from '../../../nls.js';
import { Action, Separator } from '../../../base/common/actions.js';
import { $, addDisposableListener, append, clearNode, EventHelper, EventType, getDomNodePagePosition, hide, show } from '../../../base/browser/dom.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { toDisposable, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { NumberBadge, ProgressBadge, IconBadge } from '../../services/activity/common/activity.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { DelayedDragHandler } from '../../../base/browser/dnd.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { CompositeDragAndDropObserver, toggleDropEffect } from '../dnd.js';
import { BaseActionViewItem } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { badgeBackground, badgeForeground, contrastBorder } from '../../../platform/theme/common/colorRegistry.js';
import { Action2 } from '../../../platform/actions/common/actions.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { createConfigureKeybindingAction } from '../../../platform/actions/common/menuService.js';
export class CompositeBarAction extends Action {
    constructor(item) {
        super(item.id, item.name, item.classNames?.join(' '), true);
        this.item = item;
        this._onDidChangeCompositeBarActionItem = this._register(new Emitter());
        this.onDidChangeCompositeBarActionItem = this._onDidChangeCompositeBarActionItem.event;
        this._onDidChangeActivity = this._register(new Emitter());
        this.onDidChangeActivity = this._onDidChangeActivity.event;
        this._activities = [];
    }
    get compositeBarActionItem() {
        return this.item;
    }
    set compositeBarActionItem(item) {
        this._label = item.name;
        this.item = item;
        this._onDidChangeCompositeBarActionItem.fire(this);
    }
    get activities() {
        return this._activities;
    }
    set activities(activities) {
        this._activities = activities;
        this._onDidChangeActivity.fire(activities);
    }
    activate() {
        if (!this.checked) {
            this._setChecked(true);
        }
    }
    deactivate() {
        if (this.checked) {
            this._setChecked(false);
        }
    }
}
let CompositeBarActionViewItem = class CompositeBarActionViewItem extends BaseActionViewItem {
    constructor(action, options, badgesEnabled, themeService, hoverService, configurationService, keybindingService) {
        super(null, action, options);
        this.badgesEnabled = badgesEnabled;
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.badgeDisposable = this._register(new MutableDisposable());
        this.options = options;
        this._register(this.themeService.onDidColorThemeChange(this.onThemeChange, this));
        this._register(action.onDidChangeCompositeBarActionItem(() => this.update()));
        this._register(Event.filter(keybindingService.onDidUpdateKeybindings, () => this.keybindingLabel !== this.computeKeybindingLabel())(() => this.updateTitle()));
        this._register(action.onDidChangeActivity(() => this.updateActivity()));
    }
    get compositeBarActionItem() {
        return this._action.compositeBarActionItem;
    }
    updateStyles() {
        const theme = this.themeService.getColorTheme();
        const colors = this.options.colors(theme);
        if (this.label) {
            if (this.options.icon) {
                const foreground = this._action.checked ? colors.activeForegroundColor : colors.inactiveForegroundColor;
                if (this.compositeBarActionItem.iconUrl) {
                    // Apply background color to activity bar item provided with iconUrls
                    this.label.style.backgroundColor = foreground ? foreground.toString() : '';
                    this.label.style.color = '';
                }
                else {
                    // Apply foreground color to activity bar items provided with codicons
                    this.label.style.color = foreground ? foreground.toString() : '';
                    this.label.style.backgroundColor = '';
                }
            }
            else {
                const foreground = this._action.checked ? colors.activeForegroundColor : colors.inactiveForegroundColor;
                const borderBottomColor = this._action.checked ? colors.activeBorderBottomColor : null;
                this.label.style.color = foreground ? foreground.toString() : '';
                this.label.style.borderBottomColor = borderBottomColor ? borderBottomColor.toString() : '';
            }
            this.container.style.setProperty('--insert-border-color', colors.dragAndDropBorder ? colors.dragAndDropBorder.toString() : '');
        }
        // Badge
        if (this.badgeContent) {
            const badgeStyles = this.getActivities()[0]?.badge.getColors(theme);
            const badgeFg = badgeStyles?.badgeForeground ?? colors.badgeForeground ?? theme.getColor(badgeForeground);
            const badgeBg = badgeStyles?.badgeBackground ?? colors.badgeBackground ?? theme.getColor(badgeBackground);
            const contrastBorderColor = badgeStyles?.badgeBorder ?? theme.getColor(contrastBorder);
            this.badgeContent.style.color = badgeFg ? badgeFg.toString() : '';
            this.badgeContent.style.backgroundColor = badgeBg ? badgeBg.toString() : '';
            this.badgeContent.style.borderStyle = contrastBorderColor && !this.options.compact ? 'solid' : '';
            this.badgeContent.style.borderWidth = contrastBorderColor ? '1px' : '';
            this.badgeContent.style.borderColor = contrastBorderColor ? contrastBorderColor.toString() : '';
        }
    }
    render(container) {
        super.render(container);
        this.container = container;
        if (this.options.icon) {
            this.container.classList.add('icon');
        }
        if (this.options.hasPopup) {
            this.container.setAttribute('role', 'button');
            this.container.setAttribute('aria-haspopup', 'true');
        }
        else {
            this.container.setAttribute('role', 'tab');
        }
        // Try hard to prevent keyboard only focus feedback when using mouse
        this._register(addDisposableListener(this.container, EventType.MOUSE_DOWN, () => {
            this.container.classList.add('clicked');
        }));
        this._register(addDisposableListener(this.container, EventType.MOUSE_UP, () => {
            if (this.mouseUpTimeout) {
                clearTimeout(this.mouseUpTimeout);
            }
            this.mouseUpTimeout = setTimeout(() => {
                this.container.classList.remove('clicked');
            }, 800); // delayed to prevent focus feedback from showing on mouse up
        }));
        this._register(this.hoverService.setupDelayedHover(this.container, () => ({
            content: this.computeTitle(),
            position: {
                hoverPosition: this.options.hoverOptions.position(),
            },
            persistence: {
                hideOnKeyDown: true,
            },
            appearance: {
                showPointer: true,
                compact: true,
            }
        }), { groupId: 'composite-bar-actions' }));
        // Label
        this.label = append(container, $('a'));
        // Badge
        this.badge = append(container, $('.badge'));
        this.badgeContent = append(this.badge, $('.badge-content'));
        // pane composite bar active border + background
        append(container, $('.active-item-indicator'));
        hide(this.badge);
        this.update();
        this.updateStyles();
        this.updateTitle();
    }
    onThemeChange(theme) {
        this.updateStyles();
    }
    update() {
        this.updateLabel();
        this.updateActivity();
        this.updateTitle();
        this.updateStyles();
    }
    getActivities() {
        if (this._action instanceof CompositeBarAction) {
            return this._action.activities;
        }
        return [];
    }
    updateActivity() {
        if (!this.badge || !this.badgeContent || !(this._action instanceof CompositeBarAction)) {
            return;
        }
        const { badges, type } = this.getVisibleBadges(this.getActivities());
        this.badgeDisposable.value = new DisposableStore();
        clearNode(this.badgeContent);
        hide(this.badge);
        const shouldRenderBadges = this.badgesEnabled(this.compositeBarActionItem.id);
        if (badges.length > 0 && shouldRenderBadges) {
            const classes = [];
            if (this.options.compact) {
                classes.push('compact');
            }
            // Progress
            if (type === 'progress') {
                show(this.badge);
                classes.push('progress-badge');
            }
            // Number
            else if (type === 'number') {
                const total = badges.reduce((r, b) => r + (b instanceof NumberBadge ? b.number : 0), 0);
                if (total > 0) {
                    let badgeNumber = total.toString();
                    if (total > 999) {
                        const noOfThousands = total / 1000;
                        const floor = Math.floor(noOfThousands);
                        badgeNumber = noOfThousands > floor ? `${floor}K+` : `${noOfThousands}K`;
                    }
                    if (this.options.compact && badgeNumber.length >= 3) {
                        classes.push('compact-content');
                    }
                    this.badgeContent.textContent = badgeNumber;
                    show(this.badge);
                }
            }
            // Icon
            else if (type === 'icon') {
                classes.push('icon-badge');
                const badgeContentClassess = ['icon-overlay', ...ThemeIcon.asClassNameArray(badges[0].icon)];
                this.badgeContent.classList.add(...badgeContentClassess);
                this.badgeDisposable.value.add(toDisposable(() => this.badgeContent?.classList.remove(...badgeContentClassess)));
                show(this.badge);
            }
            if (classes.length) {
                this.badge.classList.add(...classes);
                this.badgeDisposable.value.add(toDisposable(() => this.badge.classList.remove(...classes)));
            }
        }
        this.updateTitle();
        this.updateStyles();
    }
    getVisibleBadges(activities) {
        const progressBadges = activities.filter(activity => activity.badge instanceof ProgressBadge).map(activity => activity.badge);
        if (progressBadges.length > 0) {
            return { badges: progressBadges, type: 'progress' };
        }
        const iconBadges = activities.filter(activity => activity.badge instanceof IconBadge).map(activity => activity.badge);
        if (iconBadges.length > 0) {
            return { badges: iconBadges, type: 'icon' };
        }
        const numberBadges = activities.filter(activity => activity.badge instanceof NumberBadge).map(activity => activity.badge);
        if (numberBadges.length > 0) {
            return { badges: numberBadges, type: 'number' };
        }
        return { badges: [], type: undefined };
    }
    updateLabel() {
        this.label.className = 'action-label';
        if (this.compositeBarActionItem.classNames) {
            this.label.classList.add(...this.compositeBarActionItem.classNames);
        }
        if (!this.options.icon) {
            this.label.textContent = this.action.label;
        }
    }
    updateTitle() {
        const title = this.computeTitle();
        [this.label, this.badge, this.container].forEach(element => {
            if (element) {
                element.setAttribute('aria-label', title);
                element.setAttribute('title', '');
                element.removeAttribute('title');
            }
        });
    }
    computeTitle() {
        this.keybindingLabel = this.computeKeybindingLabel();
        let title = this.keybindingLabel ? localize('titleKeybinding', "{0} ({1})", this.compositeBarActionItem.name, this.keybindingLabel) : this.compositeBarActionItem.name;
        const badges = this.getVisibleBadges(this.action.activities).badges;
        for (const badge of badges) {
            const description = badge.getDescription();
            if (!description) {
                continue;
            }
            title = `${title} - ${badge.getDescription()}`;
        }
        return title;
    }
    computeKeybindingLabel() {
        const keybinding = this.compositeBarActionItem.keybindingId ? this.keybindingService.lookupKeybinding(this.compositeBarActionItem.keybindingId) : null;
        return keybinding?.getLabel();
    }
    dispose() {
        super.dispose();
        if (this.mouseUpTimeout) {
            clearTimeout(this.mouseUpTimeout);
        }
        this.badge.remove();
    }
};
CompositeBarActionViewItem = __decorate([
    __param(3, IThemeService),
    __param(4, IHoverService),
    __param(5, IConfigurationService),
    __param(6, IKeybindingService)
], CompositeBarActionViewItem);
export { CompositeBarActionViewItem };
export class CompositeOverflowActivityAction extends CompositeBarAction {
    constructor(showMenu) {
        super({
            id: 'additionalComposites.action',
            name: localize('additionalViews', "Additional Views"),
            classNames: ThemeIcon.asClassNameArray(Codicon.more)
        });
        this.showMenu = showMenu;
    }
    async run() {
        this.showMenu();
    }
}
let CompositeOverflowActivityActionViewItem = class CompositeOverflowActivityActionViewItem extends CompositeBarActionViewItem {
    constructor(action, getOverflowingComposites, getActiveCompositeId, getBadge, getCompositeOpenAction, colors, hoverOptions, contextMenuService, themeService, hoverService, configurationService, keybindingService) {
        super(action, { icon: true, colors, hasPopup: true, hoverOptions }, () => true, themeService, hoverService, configurationService, keybindingService);
        this.getOverflowingComposites = getOverflowingComposites;
        this.getActiveCompositeId = getActiveCompositeId;
        this.getBadge = getBadge;
        this.getCompositeOpenAction = getCompositeOpenAction;
        this.contextMenuService = contextMenuService;
    }
    showMenu() {
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.container,
            getActions: () => this.getActions(),
            getCheckedActionsRepresentation: () => 'radio',
        });
    }
    getActions() {
        return this.getOverflowingComposites().map(composite => {
            const action = this.getCompositeOpenAction(composite.id);
            action.checked = this.getActiveCompositeId() === action.id;
            const badge = this.getBadge(composite.id);
            let suffix;
            if (badge instanceof NumberBadge) {
                suffix = badge.number;
            }
            if (suffix) {
                action.label = localize('numberBadge', "{0} ({1})", composite.name, suffix);
            }
            else {
                action.label = composite.name || '';
            }
            return action;
        });
    }
};
CompositeOverflowActivityActionViewItem = __decorate([
    __param(7, IContextMenuService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IConfigurationService),
    __param(11, IKeybindingService)
], CompositeOverflowActivityActionViewItem);
export { CompositeOverflowActivityActionViewItem };
let CompositeActionViewItem = class CompositeActionViewItem extends CompositeBarActionViewItem {
    constructor(options, compositeActivityAction, toggleCompositePinnedAction, toggleCompositeBadgeAction, compositeContextMenuActionsProvider, contextMenuActionsProvider, dndHandler, compositeBar, contextMenuService, keybindingService, instantiationService, themeService, hoverService, configurationService, commandService) {
        super(compositeActivityAction, options, compositeBar.areBadgesEnabled.bind(compositeBar), themeService, hoverService, configurationService, keybindingService);
        this.toggleCompositePinnedAction = toggleCompositePinnedAction;
        this.toggleCompositeBadgeAction = toggleCompositeBadgeAction;
        this.compositeContextMenuActionsProvider = compositeContextMenuActionsProvider;
        this.contextMenuActionsProvider = contextMenuActionsProvider;
        this.dndHandler = dndHandler;
        this.compositeBar = compositeBar;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
    }
    render(container) {
        super.render(container);
        this.updateChecked();
        this.updateEnabled();
        this._register(addDisposableListener(this.container, EventType.CONTEXT_MENU, e => {
            EventHelper.stop(e, true);
            this.showContextMenu(container);
        }));
        // Allow to drag
        let insertDropBefore = undefined;
        this._register(CompositeDragAndDropObserver.INSTANCE.registerDraggable(this.container, () => { return { type: 'composite', id: this.compositeBarActionItem.id }; }, {
            onDragOver: e => {
                const isValidMove = e.dragAndDropData.getData().id !== this.compositeBarActionItem.id && this.dndHandler.onDragOver(e.dragAndDropData, this.compositeBarActionItem.id, e.eventData);
                toggleDropEffect(e.eventData.dataTransfer, 'move', isValidMove);
                insertDropBefore = this.updateFromDragging(container, isValidMove, e.eventData);
            },
            onDragLeave: e => {
                insertDropBefore = this.updateFromDragging(container, false, e.eventData);
            },
            onDragEnd: e => {
                insertDropBefore = this.updateFromDragging(container, false, e.eventData);
            },
            onDrop: e => {
                EventHelper.stop(e.eventData, true);
                this.dndHandler.drop(e.dragAndDropData, this.compositeBarActionItem.id, e.eventData, insertDropBefore);
                insertDropBefore = this.updateFromDragging(container, false, e.eventData);
            },
            onDragStart: e => {
                if (e.dragAndDropData.getData().id !== this.compositeBarActionItem.id) {
                    return;
                }
                if (e.eventData.dataTransfer) {
                    e.eventData.dataTransfer.effectAllowed = 'move';
                }
                this.blur(); // Remove focus indicator when dragging
            }
        }));
        // Activate on drag over to reveal targets
        [this.badge, this.label].forEach(element => this._register(new DelayedDragHandler(element, () => {
            if (!this.action.checked) {
                this.action.run();
            }
        })));
        this.updateStyles();
    }
    updateFromDragging(element, showFeedback, event) {
        const rect = element.getBoundingClientRect();
        const posX = event.clientX;
        const posY = event.clientY;
        const height = rect.bottom - rect.top;
        const width = rect.right - rect.left;
        const forceTop = posY <= rect.top + height * 0.4;
        const forceBottom = posY > rect.bottom - height * 0.4;
        const preferTop = posY <= rect.top + height * 0.5;
        const forceLeft = posX <= rect.left + width * 0.4;
        const forceRight = posX > rect.right - width * 0.4;
        const preferLeft = posX <= rect.left + width * 0.5;
        const classes = element.classList;
        const lastClasses = {
            vertical: classes.contains('top') ? 'top' : (classes.contains('bottom') ? 'bottom' : undefined),
            horizontal: classes.contains('left') ? 'left' : (classes.contains('right') ? 'right' : undefined)
        };
        const top = forceTop || (preferTop && !lastClasses.vertical) || (!forceBottom && lastClasses.vertical === 'top');
        const bottom = forceBottom || (!preferTop && !lastClasses.vertical) || (!forceTop && lastClasses.vertical === 'bottom');
        const left = forceLeft || (preferLeft && !lastClasses.horizontal) || (!forceRight && lastClasses.horizontal === 'left');
        const right = forceRight || (!preferLeft && !lastClasses.horizontal) || (!forceLeft && lastClasses.horizontal === 'right');
        element.classList.toggle('top', showFeedback && top);
        element.classList.toggle('bottom', showFeedback && bottom);
        element.classList.toggle('left', showFeedback && left);
        element.classList.toggle('right', showFeedback && right);
        if (!showFeedback) {
            return undefined;
        }
        return { verticallyBefore: top, horizontallyBefore: left };
    }
    showContextMenu(container) {
        const actions = [];
        if (this.compositeBarActionItem.keybindingId) {
            actions.push(createConfigureKeybindingAction(this.commandService, this.keybindingService, this.compositeBarActionItem.keybindingId));
        }
        actions.push(this.toggleCompositePinnedAction, this.toggleCompositeBadgeAction);
        const compositeContextMenuActions = this.compositeContextMenuActionsProvider(this.compositeBarActionItem.id);
        if (compositeContextMenuActions.length) {
            actions.push(...compositeContextMenuActions);
        }
        const isPinned = this.compositeBar.isPinned(this.compositeBarActionItem.id);
        if (isPinned) {
            this.toggleCompositePinnedAction.label = localize('hide', "Hide '{0}'", this.compositeBarActionItem.name);
            this.toggleCompositePinnedAction.checked = false;
            this.toggleCompositePinnedAction.enabled = this.compositeBar.getPinnedCompositeIds().length > 1;
        }
        else {
            this.toggleCompositePinnedAction.label = localize('keep', "Keep '{0}'", this.compositeBarActionItem.name);
            this.toggleCompositePinnedAction.enabled = true;
        }
        const isBadgeEnabled = this.compositeBar.areBadgesEnabled(this.compositeBarActionItem.id);
        if (isBadgeEnabled) {
            this.toggleCompositeBadgeAction.label = localize('hideBadge', "Hide Badge");
        }
        else {
            this.toggleCompositeBadgeAction.label = localize('showBadge', "Show Badge");
        }
        const otherActions = this.contextMenuActionsProvider();
        if (otherActions.length) {
            actions.push(new Separator());
            actions.push(...otherActions);
        }
        const elementPosition = getDomNodePagePosition(container);
        const anchor = {
            x: Math.floor(elementPosition.left + (elementPosition.width / 2)),
            y: elementPosition.top + elementPosition.height
        };
        this.contextMenuService.showContextMenu({
            getAnchor: () => anchor,
            getActions: () => actions,
            getActionsContext: () => this.compositeBarActionItem.id
        });
    }
    updateChecked() {
        if (this.action.checked) {
            this.container.classList.add('checked');
            this.container.setAttribute('aria-label', this.getTooltip() ?? this.container.title);
            this.container.setAttribute('aria-expanded', 'true');
            this.container.setAttribute('aria-selected', 'true');
        }
        else {
            this.container.classList.remove('checked');
            this.container.setAttribute('aria-label', this.getTooltip() ?? this.container.title);
            this.container.setAttribute('aria-expanded', 'false');
            this.container.setAttribute('aria-selected', 'false');
        }
        this.updateStyles();
    }
    updateEnabled() {
        if (!this.element) {
            return;
        }
        if (this.action.enabled) {
            this.element.classList.remove('disabled');
        }
        else {
            this.element.classList.add('disabled');
        }
    }
    dispose() {
        super.dispose();
        this.label.remove();
    }
};
CompositeActionViewItem = __decorate([
    __param(8, IContextMenuService),
    __param(9, IKeybindingService),
    __param(10, IInstantiationService),
    __param(11, IThemeService),
    __param(12, IHoverService),
    __param(13, IConfigurationService),
    __param(14, ICommandService)
], CompositeActionViewItem);
export { CompositeActionViewItem };
export class ToggleCompositePinnedAction extends Action {
    constructor(activity, compositeBar) {
        super('show.toggleCompositePinned', activity ? activity.name : localize('toggle', "Toggle View Pinned"));
        this.activity = activity;
        this.compositeBar = compositeBar;
        this.checked = !!this.activity && this.compositeBar.isPinned(this.activity.id);
    }
    async run(context) {
        const id = this.activity ? this.activity.id : context;
        if (this.compositeBar.isPinned(id)) {
            this.compositeBar.unpin(id);
        }
        else {
            this.compositeBar.pin(id);
        }
    }
}
export class ToggleCompositeBadgeAction extends Action {
    constructor(compositeBarActionItem, compositeBar) {
        super('show.toggleCompositeBadge', compositeBarActionItem ? compositeBarActionItem.name : localize('toggleBadge', "Toggle View Badge"));
        this.compositeBarActionItem = compositeBarActionItem;
        this.compositeBar = compositeBar;
        this.checked = false;
    }
    async run(context) {
        const id = this.compositeBarActionItem ? this.compositeBarActionItem.id : context;
        this.compositeBar.toggleBadgeEnablement(id);
    }
}
export class SwitchCompositeViewAction extends Action2 {
    constructor(desc, location, offset) {
        super(desc);
        this.location = location;
        this.offset = offset;
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const activeComposite = paneCompositeService.getActivePaneComposite(this.location);
        if (!activeComposite) {
            return;
        }
        let targetCompositeId;
        const visibleCompositeIds = paneCompositeService.getVisiblePaneCompositeIds(this.location);
        for (let i = 0; i < visibleCompositeIds.length; i++) {
            if (visibleCompositeIds[i] === activeComposite.getId()) {
                targetCompositeId = visibleCompositeIds[(i + visibleCompositeIds.length + this.offset) % visibleCompositeIds.length];
                break;
            }
        }
        if (typeof targetCompositeId !== 'undefined') {
            await paneCompositeService.openPaneComposite(targetCompositeId, this.location, true);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlQmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9jb21wb3NpdGVCYXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2SixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sZ0RBQWdELENBQUM7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBcUIsYUFBYSxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSx5REFBeUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUEr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
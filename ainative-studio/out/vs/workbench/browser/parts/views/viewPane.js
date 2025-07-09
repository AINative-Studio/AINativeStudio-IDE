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
var ViewPane_1;
import './media/paneviewlet.css';
import * as nls from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { asCssVariable, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { after, append, $, trackFocus, EventType, addDisposableListener, Dimension, reset, isAncestorOfActiveElement, isActiveElement } from '../../../../base/browser/dom.js';
import { createCSSRule } from '../../../../base/browser/domStylesheets.js';
import { asCssValueWithDefault, asCSSUrl } from '../../../../base/browser/cssValue.js';
import { DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Action } from '../../../../base/common/actions.js';
import { prepareActions } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Pane } from '../../../../base/browser/ui/splitview/paneview.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ViewContainerExtensions, IViewDescriptorService, defaultViewIcon, ViewContainerLocationToString } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuId, Action2, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { AbstractProgressScope, ScopedProgressIndicator } from '../../../services/progress/browser/progressIndicator.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { URI } from '../../../../base/common/uri.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { CompositeMenuActions } from '../../actions.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { FilterWidget } from './viewFilter.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { defaultButtonStyles, defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { PANEL_BACKGROUND, PANEL_SECTION_DRAG_AND_DROP_BACKGROUND, PANEL_STICKY_SCROLL_BACKGROUND, PANEL_STICKY_SCROLL_BORDER, PANEL_STICKY_SCROLL_SHADOW, SIDE_BAR_BACKGROUND, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, SIDE_BAR_STICKY_SCROLL_BACKGROUND, SIDE_BAR_STICKY_SCROLL_BORDER, SIDE_BAR_STICKY_SCROLL_SHADOW } from '../../../common/theme.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
export var ViewPaneShowActions;
(function (ViewPaneShowActions) {
    /** Show the actions when the view is hovered. This is the default behavior. */
    ViewPaneShowActions[ViewPaneShowActions["Default"] = 0] = "Default";
    /** Always shows the actions when the view is expanded */
    ViewPaneShowActions[ViewPaneShowActions["WhenExpanded"] = 1] = "WhenExpanded";
    /** Always shows the actions */
    ViewPaneShowActions[ViewPaneShowActions["Always"] = 2] = "Always";
})(ViewPaneShowActions || (ViewPaneShowActions = {}));
export const VIEWPANE_FILTER_ACTION = new Action('viewpane.action.filter');
const viewPaneContainerExpandedIcon = registerIcon('view-pane-container-expanded', Codicon.chevronDown, nls.localize('viewPaneContainerExpandedIcon', 'Icon for an expanded view pane container.'));
const viewPaneContainerCollapsedIcon = registerIcon('view-pane-container-collapsed', Codicon.chevronRight, nls.localize('viewPaneContainerCollapsedIcon', 'Icon for a collapsed view pane container.'));
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
let ViewWelcomeController = class ViewWelcomeController {
    get enabled() { return this._enabled; }
    constructor(container, delegate, instantiationService, openerService, contextKeyService, lifecycleService) {
        this.container = container;
        this.delegate = delegate;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.contextKeyService = contextKeyService;
        this.items = [];
        this._enabled = false;
        this.disposables = new DisposableStore();
        this.enabledDisposables = this.disposables.add(new DisposableStore());
        this.renderDisposables = this.disposables.add(new DisposableStore());
        this.disposables.add(Event.runAndSubscribe(this.delegate.onDidChangeViewWelcomeState, () => this.onDidChangeViewWelcomeState()));
        this.disposables.add(lifecycleService.onWillShutdown(() => this.dispose())); // Fixes https://github.com/microsoft/vscode/issues/208878
    }
    layout(height, width) {
        if (!this._enabled) {
            return;
        }
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
        this.element.classList.toggle('wide', width > 640);
        this.scrollableElement.scanDomNode();
    }
    focus() {
        if (!this._enabled) {
            return;
        }
        this.element.focus();
    }
    onDidChangeViewWelcomeState() {
        const enabled = this.delegate.shouldShowWelcome();
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        if (!enabled) {
            this.enabledDisposables.clear();
            return;
        }
        this.container.classList.add('welcome');
        const viewWelcomeContainer = append(this.container, $('.welcome-view'));
        this.element = $('.welcome-view-content', { tabIndex: 0 });
        this.scrollableElement = new DomScrollableElement(this.element, { alwaysConsumeMouseWheel: true, horizontal: 2 /* ScrollbarVisibility.Hidden */, vertical: 3 /* ScrollbarVisibility.Visible */, });
        append(viewWelcomeContainer, this.scrollableElement.getDomNode());
        this.enabledDisposables.add(toDisposable(() => {
            this.container.classList.remove('welcome');
            this.scrollableElement.dispose();
            viewWelcomeContainer.remove();
            this.scrollableElement = undefined;
            this.element = undefined;
        }));
        this.contextKeyService.onDidChangeContext(this.onDidChangeContext, this, this.enabledDisposables);
        Event.chain(viewsRegistry.onDidChangeViewWelcomeContent, $ => $.filter(id => id === this.delegate.id))(this.onDidChangeViewWelcomeContent, this, this.enabledDisposables);
        this.onDidChangeViewWelcomeContent();
    }
    onDidChangeViewWelcomeContent() {
        const descriptors = viewsRegistry.getViewWelcomeContent(this.delegate.id);
        this.items = [];
        for (const descriptor of descriptors) {
            if (descriptor.when === 'default') {
                this.defaultItem = { descriptor, visible: true };
            }
            else {
                const visible = descriptor.when ? this.contextKeyService.contextMatchesRules(descriptor.when) : true;
                this.items.push({ descriptor, visible });
            }
        }
        this.render();
    }
    onDidChangeContext() {
        let didChange = false;
        for (const item of this.items) {
            if (!item.descriptor.when || item.descriptor.when === 'default') {
                continue;
            }
            const visible = this.contextKeyService.contextMatchesRules(item.descriptor.when);
            if (item.visible === visible) {
                continue;
            }
            item.visible = visible;
            didChange = true;
        }
        if (didChange) {
            this.render();
        }
    }
    render() {
        this.renderDisposables.clear();
        this.element.innerText = '';
        const contents = this.getContentDescriptors();
        if (contents.length === 0) {
            this.container.classList.remove('welcome');
            this.scrollableElement.scanDomNode();
            return;
        }
        let buttonsCount = 0;
        for (const { content, precondition, renderSecondaryButtons } of contents) {
            const lines = content.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (!line) {
                    continue;
                }
                const linkedText = parseLinkedText(line);
                if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                    const node = linkedText.nodes[0];
                    const buttonContainer = append(this.element, $('.button-container'));
                    const button = new Button(buttonContainer, { title: node.title, supportIcons: true, secondary: renderSecondaryButtons && buttonsCount > 0 ? true : false, ...defaultButtonStyles, });
                    button.label = node.label;
                    button.onDidClick(_ => {
                        this.openerService.open(node.href, { allowCommands: true });
                    }, null, this.renderDisposables);
                    this.renderDisposables.add(button);
                    buttonsCount++;
                    if (precondition) {
                        const updateEnablement = () => button.enabled = this.contextKeyService.contextMatchesRules(precondition);
                        updateEnablement();
                        const keys = new Set(precondition.keys());
                        const onDidChangeContext = Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(keys));
                        onDidChangeContext(updateEnablement, null, this.renderDisposables);
                    }
                }
                else {
                    const p = append(this.element, $('p'));
                    for (const node of linkedText.nodes) {
                        if (typeof node === 'string') {
                            append(p, ...renderLabelWithIcons(node));
                        }
                        else {
                            const link = this.renderDisposables.add(this.instantiationService.createInstance(Link, p, node, {}));
                            if (precondition && node.href.startsWith('command:')) {
                                const updateEnablement = () => link.enabled = this.contextKeyService.contextMatchesRules(precondition);
                                updateEnablement();
                                const keys = new Set(precondition.keys());
                                const onDidChangeContext = Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(keys));
                                onDidChangeContext(updateEnablement, null, this.renderDisposables);
                            }
                        }
                    }
                }
            }
        }
        this.container.classList.add('welcome');
        this.scrollableElement.scanDomNode();
    }
    getContentDescriptors() {
        const visibleItems = this.items.filter(v => v.visible);
        if (visibleItems.length === 0 && this.defaultItem) {
            return [this.defaultItem.descriptor];
        }
        return visibleItems.map(v => v.descriptor);
    }
    dispose() {
        this.disposables.dispose();
    }
};
ViewWelcomeController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IOpenerService),
    __param(4, IContextKeyService),
    __param(5, ILifecycleService)
], ViewWelcomeController);
let ViewPane = class ViewPane extends Pane {
    static { ViewPane_1 = this; }
    static { this.AlwaysShowActionsConfig = 'workbench.view.alwaysShowHeaderActions'; }
    get title() {
        return this._title;
    }
    get titleDescription() {
        return this._titleDescription;
    }
    get singleViewPaneContainerTitle() {
        return this._singleViewPaneContainerTitle;
    }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewInformationService) {
        super({ ...options, ...{ orientation: viewDescriptorService.getViewLocationById(options.id) === 1 /* ViewContainerLocation.Panel */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */ } });
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.viewDescriptorService = viewDescriptorService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.accessibleViewInformationService = accessibleViewInformationService;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidChangeBodyVisibility = this._register(new Emitter());
        this.onDidChangeBodyVisibility = this._onDidChangeBodyVisibility.event;
        this._onDidChangeTitleArea = this._register(new Emitter());
        this.onDidChangeTitleArea = this._onDidChangeTitleArea.event;
        this._onDidChangeViewWelcomeState = this._register(new Emitter());
        this.onDidChangeViewWelcomeState = this._onDidChangeViewWelcomeState.event;
        this._isVisible = false;
        this.headerActionViewItems = this._register(new DisposableMap());
        this.id = options.id;
        this._title = options.title;
        this._titleDescription = options.titleDescription;
        this._singleViewPaneContainerTitle = options.singleViewPaneContainerTitle;
        this.showActions = options.showActions ?? ViewPaneShowActions.Default;
        this.scopedContextKeyService = this._register(contextKeyService.createScoped(this.element));
        this.scopedContextKeyService.createKey('view', this.id);
        const viewLocationKey = this.scopedContextKeyService.createKey('viewLocation', ViewContainerLocationToString(viewDescriptorService.getViewLocationById(this.id)));
        this._register(Event.filter(viewDescriptorService.onDidChangeLocation, e => e.views.some(view => view.id === this.id))(() => viewLocationKey.set(ViewContainerLocationToString(viewDescriptorService.getViewLocationById(this.id)))));
        const childInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.menuActions = this._register(childInstantiationService.createInstance(CompositeMenuActions, options.titleMenuId ?? MenuId.ViewTitle, MenuId.ViewTitleContext, { shouldForwardArgs: !options.donotForwardArgs, renderShortTitle: true }));
        this._register(this.menuActions.onDidChange(() => this.updateActions()));
    }
    get headerVisible() {
        return super.headerVisible;
    }
    set headerVisible(visible) {
        super.headerVisible = visible;
        this.element.classList.toggle('merged-header', !visible);
    }
    setVisible(visible) {
        if (this._isVisible !== visible) {
            this._isVisible = visible;
            if (this.isExpanded()) {
                this._onDidChangeBodyVisibility.fire(visible);
            }
        }
    }
    isVisible() {
        return this._isVisible;
    }
    isBodyVisible() {
        return this._isVisible && this.isExpanded();
    }
    setExpanded(expanded) {
        const changed = super.setExpanded(expanded);
        if (changed) {
            this._onDidChangeBodyVisibility.fire(expanded);
        }
        this.updateTwistyIcon();
        return changed;
    }
    render() {
        super.render();
        const focusTracker = trackFocus(this.element);
        this._register(focusTracker);
        this._register(focusTracker.onDidFocus(() => this._onDidFocus.fire()));
        this._register(focusTracker.onDidBlur(() => this._onDidBlur.fire()));
    }
    renderHeader(container) {
        this.headerContainer = container;
        this.twistiesContainer = append(container, $(`.twisty-container${ThemeIcon.asCSSSelector(this.getTwistyIcon(this.isExpanded()))}`));
        this.renderHeaderTitle(container, this.title);
        const actions = append(container, $('.actions'));
        actions.classList.toggle('show-always', this.showActions === ViewPaneShowActions.Always);
        actions.classList.toggle('show-expanded', this.showActions === ViewPaneShowActions.WhenExpanded);
        this.toolbar = this.instantiationService.createInstance(WorkbenchToolBar, actions, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            actionViewItemProvider: (action, options) => {
                const item = this.createActionViewItem(action, options);
                if (item) {
                    this.headerActionViewItems.set(item.action.id, item);
                }
                return item;
            },
            ariaLabel: nls.localize('viewToolbarAriaLabel', "{0} actions", this.title),
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id),
            renderDropdownAsChildElement: true,
            actionRunner: this.getActionRunner(),
            resetMenu: this.menuActions.menuId
        });
        this._register(this.toolbar);
        this.setActions();
        this._register(addDisposableListener(actions, EventType.CLICK, e => e.preventDefault()));
        const viewContainerModel = this.viewDescriptorService.getViewContainerByViewId(this.id);
        if (viewContainerModel) {
            this._register(this.viewDescriptorService.getViewContainerModel(viewContainerModel).onDidChangeContainerInfo(({ title }) => this.updateTitle(this.title)));
        }
        else {
            console.error(`View container model not found for view ${this.id}`);
        }
        const onDidRelevantConfigurationChange = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ViewPane_1.AlwaysShowActionsConfig));
        this._register(onDidRelevantConfigurationChange(this.updateActionsVisibility, this));
        this.updateActionsVisibility();
    }
    updateHeader() {
        super.updateHeader();
        this.updateTwistyIcon();
    }
    updateTwistyIcon() {
        if (this.twistiesContainer) {
            this.twistiesContainer.classList.remove(...ThemeIcon.asClassNameArray(this.getTwistyIcon(!this._expanded)));
            this.twistiesContainer.classList.add(...ThemeIcon.asClassNameArray(this.getTwistyIcon(this._expanded)));
        }
    }
    getTwistyIcon(expanded) {
        return expanded ? viewPaneContainerExpandedIcon : viewPaneContainerCollapsedIcon;
    }
    style(styles) {
        super.style(styles);
        const icon = this.getIcon();
        if (this.iconContainer) {
            const fgColor = asCssValueWithDefault(styles.headerForeground, asCssVariable(foreground));
            if (URI.isUri(icon)) {
                // Apply background color to activity bar item provided with iconUrls
                this.iconContainer.style.backgroundColor = fgColor;
                this.iconContainer.style.color = '';
            }
            else {
                // Apply foreground color to activity bar items provided with codicons
                this.iconContainer.style.color = fgColor;
                this.iconContainer.style.backgroundColor = '';
            }
        }
    }
    getIcon() {
        return this.viewDescriptorService.getViewDescriptorById(this.id)?.containerIcon || defaultViewIcon;
    }
    renderHeaderTitle(container, title) {
        this.iconContainer = append(container, $('.icon', undefined));
        const icon = this.getIcon();
        let cssClass = undefined;
        if (URI.isUri(icon)) {
            cssClass = `view-${this.id.replace(/[\.\:]/g, '-')}`;
            const iconClass = `.pane-header .icon.${cssClass}`;
            createCSSRule(iconClass, `
				mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				mask-size: 24px;
				-webkit-mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				-webkit-mask-size: 16px;
			`);
        }
        else if (ThemeIcon.isThemeIcon(icon)) {
            cssClass = ThemeIcon.asClassName(icon);
        }
        if (cssClass) {
            this.iconContainer.classList.add(...cssClass.split(' '));
        }
        const calculatedTitle = this.calculateTitle(title);
        this.titleContainer = append(container, $('h3.title', {}, calculatedTitle));
        this.titleContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.titleContainer, calculatedTitle));
        if (this._titleDescription) {
            this.setTitleDescription(this._titleDescription);
        }
        this.iconContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.iconContainer, calculatedTitle));
        this.iconContainer.setAttribute('aria-label', this._getAriaLabel(calculatedTitle, this._titleDescription));
    }
    _getAriaLabel(title, description) {
        const viewHasAccessibilityHelpContent = this.viewDescriptorService.getViewDescriptorById(this.id)?.accessibilityHelpContent;
        const accessibleViewHasShownForView = this.accessibleViewInformationService?.hasShownAccessibleView(this.id);
        if (!viewHasAccessibilityHelpContent || accessibleViewHasShownForView) {
            if (description) {
                return `${title} - ${description}`;
            }
            else {
                return title;
            }
        }
        return nls.localize('viewAccessibilityHelp', 'Use Alt+F1 for accessibility help {0}', title);
    }
    updateTitle(title) {
        const calculatedTitle = this.calculateTitle(title);
        if (this.titleContainer) {
            this.titleContainer.textContent = calculatedTitle;
            this.titleContainerHover?.update(calculatedTitle);
        }
        this.updateAriaHeaderLabel(calculatedTitle, this._titleDescription);
        this._title = title;
        this._onDidChangeTitleArea.fire();
    }
    updateAriaHeaderLabel(title, description) {
        const ariaLabel = this._getAriaLabel(title, description);
        if (this.iconContainer) {
            this.iconContainerHover?.update(title);
            this.iconContainer.setAttribute('aria-label', ariaLabel);
        }
        this.ariaHeaderLabel = this.getAriaHeaderLabel(ariaLabel);
    }
    setTitleDescription(description) {
        if (this.titleDescriptionContainer) {
            this.titleDescriptionContainer.textContent = description ?? '';
            this.titleDescriptionContainerHover?.update(description ?? '');
        }
        else if (description && this.titleContainer) {
            this.titleDescriptionContainer = after(this.titleContainer, $('span.description', {}, description));
            this.titleDescriptionContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.titleDescriptionContainer, description));
        }
    }
    updateTitleDescription(description) {
        this.setTitleDescription(description);
        this.updateAriaHeaderLabel(this._title, description);
        this._titleDescription = description;
        this._onDidChangeTitleArea.fire();
    }
    calculateTitle(title) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(this.id);
        const model = this.viewDescriptorService.getViewContainerModel(viewContainer);
        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(this.id);
        const isDefault = this.viewDescriptorService.getDefaultContainerById(this.id) === viewContainer;
        if (!isDefault && viewDescriptor?.containerTitle && model.title !== viewDescriptor.containerTitle) {
            return `${viewDescriptor.containerTitle}: ${title}`;
        }
        return title;
    }
    renderBody(container) {
        this.viewWelcomeController = this._register(this.instantiationService.createInstance(ViewWelcomeController, container, this));
    }
    layoutBody(height, width) {
        this.viewWelcomeController.layout(height, width);
    }
    onDidScrollRoot() {
        // noop
    }
    getProgressIndicator() {
        if (this.progressBar === undefined) {
            // Progress bar
            this.progressBar = this._register(new ProgressBar(this.element, defaultProgressBarStyles));
            this.progressBar.hide();
        }
        if (this.progressIndicator === undefined) {
            const that = this;
            this.progressIndicator = this._register(new ScopedProgressIndicator(assertIsDefined(this.progressBar), new class extends AbstractProgressScope {
                constructor() {
                    super(that.id, that.isBodyVisible());
                    this._register(that.onDidChangeBodyVisibility(isVisible => isVisible ? this.onScopeOpened(that.id) : this.onScopeClosed(that.id)));
                }
            }()));
        }
        return this.progressIndicator;
    }
    getProgressLocation() {
        return this.viewDescriptorService.getViewContainerByViewId(this.id).id;
    }
    getLocationBasedColors() {
        return getLocationBasedViewColors(this.viewDescriptorService.getViewLocationById(this.id));
    }
    focus() {
        if (this.viewWelcomeController.enabled) {
            this.viewWelcomeController.focus();
        }
        else if (this.element) {
            this.element.focus();
        }
        if (isActiveElement(this.element) || isAncestorOfActiveElement(this.element)) {
            this._onDidFocus.fire();
        }
    }
    setActions() {
        if (this.toolbar) {
            const primaryActions = [...this.menuActions.getPrimaryActions()];
            if (this.shouldShowFilterInHeader()) {
                primaryActions.unshift(VIEWPANE_FILTER_ACTION);
            }
            this.toolbar.setActions(prepareActions(primaryActions), prepareActions(this.menuActions.getSecondaryActions()));
            this.toolbar.context = this.getActionsContext();
        }
    }
    updateActionsVisibility() {
        if (!this.headerContainer) {
            return;
        }
        const shouldAlwaysShowActions = this.configurationService.getValue('workbench.view.alwaysShowHeaderActions');
        this.headerContainer.classList.toggle('actions-always-visible', shouldAlwaysShowActions);
    }
    updateActions() {
        this.setActions();
        this._onDidChangeTitleArea.fire();
    }
    createActionViewItem(action, options) {
        if (action.id === VIEWPANE_FILTER_ACTION.id) {
            const that = this;
            return new class extends BaseActionViewItem {
                constructor() { super(null, action); }
                setFocusable() { }
                get trapsArrowNavigation() { return true; }
                render(container) {
                    container.classList.add('viewpane-filter-container');
                    const filter = that.getFilterWidget();
                    append(container, filter.element);
                    filter.relayout();
                }
            };
        }
        return createActionViewItem(this.instantiationService, action, { ...options, ...{ menuAsChild: action instanceof SubmenuItemAction } });
    }
    getActionsContext() {
        return undefined;
    }
    getActionRunner() {
        return undefined;
    }
    getOptimalWidth() {
        return 0;
    }
    saveState() {
        // Subclasses to implement for saving state
    }
    shouldShowWelcome() {
        return false;
    }
    getFilterWidget() {
        return undefined;
    }
    shouldShowFilterInHeader() {
        return false;
    }
};
ViewPane = ViewPane_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], ViewPane);
export { ViewPane };
let FilterViewPane = class FilterViewPane extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService);
        const childInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.filterWidget = this._register(childInstantiationService.createInstance(FilterWidget, options.filterOptions));
    }
    getFilterWidget() {
        return this.filterWidget;
    }
    renderBody(container) {
        super.renderBody(container);
        this.filterContainer = append(container, $('.viewpane-filter-container'));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.dimension = new Dimension(width, height);
        const wasFilterShownInHeader = !this.filterContainer?.hasChildNodes();
        const shouldShowFilterInHeader = this.shouldShowFilterInHeader();
        if (wasFilterShownInHeader !== shouldShowFilterInHeader) {
            if (shouldShowFilterInHeader) {
                reset(this.filterContainer);
            }
            this.updateActions();
            if (!shouldShowFilterInHeader) {
                append(this.filterContainer, this.filterWidget.element);
            }
        }
        if (!shouldShowFilterInHeader) {
            height = height - 44;
        }
        this.filterWidget.layout(width);
        this.layoutBodyContent(height, width);
    }
    shouldShowFilterInHeader() {
        return !(this.dimension && this.dimension.width < 600 && this.dimension.height > 100);
    }
};
FilterViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], FilterViewPane);
export { FilterViewPane };
export function getLocationBasedViewColors(location) {
    let background, overlayBackground, stickyScrollBackground, stickyScrollBorder, stickyScrollShadow;
    switch (location) {
        case 1 /* ViewContainerLocation.Panel */:
            background = PANEL_BACKGROUND;
            overlayBackground = PANEL_SECTION_DRAG_AND_DROP_BACKGROUND;
            stickyScrollBackground = PANEL_STICKY_SCROLL_BACKGROUND;
            stickyScrollBorder = PANEL_STICKY_SCROLL_BORDER;
            stickyScrollShadow = PANEL_STICKY_SCROLL_SHADOW;
            break;
        case 0 /* ViewContainerLocation.Sidebar */:
        case 2 /* ViewContainerLocation.AuxiliaryBar */:
        default:
            background = SIDE_BAR_BACKGROUND;
            overlayBackground = SIDE_BAR_DRAG_AND_DROP_BACKGROUND;
            stickyScrollBackground = SIDE_BAR_STICKY_SCROLL_BACKGROUND;
            stickyScrollBorder = SIDE_BAR_STICKY_SCROLL_BORDER;
            stickyScrollShadow = SIDE_BAR_STICKY_SCROLL_SHADOW;
    }
    return {
        background,
        overlayBackground,
        listOverrideStyles: {
            listBackground: background,
            treeStickyScrollBackground: stickyScrollBackground,
            treeStickyScrollBorder: stickyScrollBorder,
            treeStickyScrollShadow: stickyScrollShadow
        }
    };
}
export class ViewAction extends Action2 {
    constructor(desc) {
        super(desc);
        this.desc = desc;
    }
    run(accessor, ...args) {
        const view = accessor.get(IViewsService).getActiveViewWithId(this.desc.viewId);
        if (view) {
            return this.runInView(accessor, view, ...args);
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdmlld3Mvdmlld1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvSyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxNQUFNLEVBQTBCLE1BQU0sb0NBQW9DLENBQUM7QUFDcEYsT0FBTyxFQUF1QyxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN6SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlE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
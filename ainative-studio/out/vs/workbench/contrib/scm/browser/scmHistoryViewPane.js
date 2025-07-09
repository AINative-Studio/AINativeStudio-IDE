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
var HistoryItemRenderer_1, HistoryItemLoadMoreRenderer_1;
import './media/scm.css';
import * as platform from '../../../../base/common/platform.js';
import { $, append, h, reset } from '../../../../base/browser/dom.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { fromNow, safeIntl } from '../../../../base/common/date.js';
import { createMatches } from '../../../../base/common/filters.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableValue, waitForState, constObservable, latestChangedValue, observableFromEvent, runOnChange, observableSignal } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { asCssVariable, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane, ViewPaneShowActions } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { renderSCMHistoryItemGraph, toISCMHistoryItemViewModelArray, SWIMLANE_WIDTH, renderSCMHistoryGraphPlaceholder, historyItemHoverDeletionsForeground, historyItemHoverLabelForeground, historyItemHoverAdditionsForeground, historyItemHoverDefaultLabelForeground, historyItemHoverDefaultLabelBackground } from './scmHistory.js';
import { getHistoryItemEditorTitle, getProviderKey, isSCMHistoryItemLoadMoreTreeElement, isSCMHistoryItemViewModelTreeElement, isSCMRepository } from './util.js';
import { HISTORY_VIEW_PANE_ID, ISCMService, ISCMViewService } from '../common/scm.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Action2, IMenuService, isIMenuItem, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Sequencer, Throttler } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { delta, groupBy } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { ContextKeys } from './scmViewPane.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Event } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { clamp } from '../../../../base/common/numbers.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { compare } from '../../../../base/common/strings.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { groupBy as groupBy2 } from '../../../../base/common/collections.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
const PICK_REPOSITORY_ACTION_ID = 'workbench.scm.action.graph.pickRepository';
const PICK_HISTORY_ITEM_REFS_ACTION_ID = 'workbench.scm.action.graph.pickHistoryItemRefs';
class SCMRepositoryActionViewItem extends ActionViewItem {
    constructor(_repository, action, options) {
        super(null, action, { ...options, icon: false, label: true });
        this._repository = _repository;
    }
    updateLabel() {
        if (this.options.label && this.label) {
            this.label.classList.add('scm-graph-repository-picker');
            const icon = $('.icon');
            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.repo));
            const name = $('.name');
            name.textContent = this._repository.provider.name;
            reset(this.label, icon, name);
        }
    }
    getTooltip() {
        return this._repository.provider.name;
    }
}
class SCMHistoryItemRefsActionViewItem extends ActionViewItem {
    constructor(_repository, _historyItemsFilter, action, options) {
        super(null, action, { ...options, icon: false, label: true });
        this._repository = _repository;
        this._historyItemsFilter = _historyItemsFilter;
    }
    updateLabel() {
        if (this.options.label && this.label) {
            this.label.classList.add('scm-graph-history-item-picker');
            const icon = $('.icon');
            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.gitBranch));
            const name = $('.name');
            if (this._historyItemsFilter === 'all') {
                name.textContent = localize('all', "All");
            }
            else if (this._historyItemsFilter === 'auto') {
                name.textContent = localize('auto', "Auto");
            }
            else if (this._historyItemsFilter.length === 1) {
                name.textContent = this._historyItemsFilter[0].name;
            }
            else {
                name.textContent = localize('items', "{0} Items", this._historyItemsFilter.length);
            }
            reset(this.label, icon, name);
        }
    }
    getTooltip() {
        if (this._historyItemsFilter === 'all') {
            return localize('allHistoryItemRefs', "All history item references");
        }
        else if (this._historyItemsFilter === 'auto') {
            const historyProvider = this._repository.provider.historyProvider.get();
            return [
                historyProvider?.historyItemRef.get()?.name,
                historyProvider?.historyItemRemoteRef.get()?.name,
                historyProvider?.historyItemBaseRef.get()?.name
            ].filter(ref => !!ref).join(', ');
        }
        else if (this._historyItemsFilter.length === 1) {
            return this._historyItemsFilter[0].name;
        }
        else {
            return this._historyItemsFilter.map(ref => ref.name).join(', ');
        }
    }
}
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: PICK_REPOSITORY_ACTION_ID,
            title: localize('repositoryPicker', "Repository Picker"),
            viewId: HISTORY_VIEW_PANE_ID,
            f1: false,
            menu: {
                id: MenuId.SCMHistoryTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.has('scm.providerCount'), ContextKeyExpr.greater('scm.providerCount', 1)),
                group: 'navigation',
                order: 0
            }
        });
    }
    async runInView(_, view) {
        view.pickRepository();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: PICK_HISTORY_ITEM_REFS_ACTION_ID,
            title: localize('referencePicker', "History Item Reference Picker"),
            icon: Codicon.gitBranch,
            viewId: HISTORY_VIEW_PANE_ID,
            precondition: ContextKeys.SCMHistoryItemCount.notEqualsTo(0),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryTitle,
                group: 'navigation',
                order: 1
            }
        });
    }
    async runInView(_, view) {
        view.pickHistoryItemRef();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.revealCurrentHistoryItem',
            title: localize('goToCurrentHistoryItem', "Go to Current History Item"),
            icon: Codicon.target,
            viewId: HISTORY_VIEW_PANE_ID,
            precondition: ContextKeyExpr.and(ContextKeys.SCMHistoryItemCount.notEqualsTo(0), ContextKeys.SCMCurrentHistoryItemRefInFilter.isEqualTo(true)),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryTitle,
                group: 'navigation',
                order: 2
            }
        });
    }
    async runInView(_, view) {
        view.revealCurrentHistoryItem();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.refresh',
            title: localize('refreshGraph', "Refresh"),
            viewId: HISTORY_VIEW_PANE_ID,
            f1: false,
            icon: Codicon.refresh,
            menu: {
                id: MenuId.SCMHistoryTitle,
                group: 'navigation',
                order: 1000
            }
        });
    }
    async runInView(_, view) {
        view.refresh();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.viewChanges',
            title: localize('openChanges', "Open Changes"),
            f1: false,
            menu: [
                {
                    id: MenuId.SCMHistoryItemContext,
                    when: ContextKeyExpr.equals('config.multiDiffEditor.experimental.enabled', true),
                    group: '0_view',
                    order: 1
                }
            ]
        });
    }
    async run(accessor, provider, ...historyItems) {
        const commandService = accessor.get(ICommandService);
        if (!provider || historyItems.length === 0) {
            return;
        }
        const historyItem = historyItems[0];
        const historyItemLast = historyItems[historyItems.length - 1];
        const historyProvider = provider.historyProvider.get();
        if (historyItems.length > 1) {
            const ancestor = await historyProvider?.resolveHistoryItemRefsCommonAncestor([historyItem.id, historyItemLast.id]);
            if (!ancestor || (ancestor !== historyItem.id && ancestor !== historyItemLast.id)) {
                return;
            }
        }
        const historyItemParentId = historyItemLast.parentIds.length > 0 ? historyItemLast.parentIds[0] : undefined;
        const historyItemChanges = await historyProvider?.provideHistoryItemChanges(historyItem.id, historyItemParentId);
        if (!historyItemChanges?.length) {
            return;
        }
        const title = historyItems.length === 1 ?
            getHistoryItemEditorTitle(historyItem) :
            localize('historyItemChangesEditorTitle', "All Changes ({0} ↔ {1})", historyItemLast.displayId ?? historyItemLast.id, historyItem.displayId ?? historyItem.id);
        const rootUri = provider.rootUri;
        const path = rootUri ? rootUri.path : provider.label;
        const multiDiffSourceUri = URI.from({ scheme: 'scm-history-item', path: `${path}/${historyItemParentId}..${historyItem.id}` }, true);
        commandService.executeCommand('_workbench.openMultiDiffEditor', { title, multiDiffSourceUri, resources: historyItemChanges });
    }
});
class ListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId(element) {
        if (isSCMHistoryItemViewModelTreeElement(element)) {
            return HistoryItemRenderer.TEMPLATE_ID;
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(element)) {
            return HistoryItemLoadMoreRenderer.TEMPLATE_ID;
        }
        else {
            throw new Error('Unknown element');
        }
    }
}
let HistoryItemRenderer = class HistoryItemRenderer {
    static { HistoryItemRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'history-item'; }
    get templateId() { return HistoryItemRenderer_1.TEMPLATE_ID; }
    constructor(hoverDelegate, _clipboardService, _configurationService, _contextKeyService, _hoverService, _menuService, _themeService) {
        this.hoverDelegate = hoverDelegate;
        this._clipboardService = _clipboardService;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this._hoverService = _hoverService;
        this._menuService = _menuService;
        this._themeService = _themeService;
        this._badgesConfig = observableConfigValue('scm.graph.badges', 'filter', this._configurationService);
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        const element = append(container, $('.history-item'));
        const graphContainer = append(element, $('.graph-container'));
        const iconLabel = new IconLabel(element, { supportIcons: true, supportHighlights: true, supportDescriptionHighlights: true });
        const labelContainer = append(element, $('.label-container'));
        element.appendChild(labelContainer);
        return { element, graphContainer, label: iconLabel, labelContainer, elementDisposables: new DisposableStore(), disposables: new DisposableStore() };
    }
    renderElement(node, index, templateData, height) {
        const provider = node.element.repository.provider;
        const historyItemViewModel = node.element.historyItemViewModel;
        const historyItem = historyItemViewModel.historyItem;
        const historyItemHover = this._hoverService.setupManagedHover(this.hoverDelegate, templateData.element, this._getHoverContent(node.element), {
            actions: this._getHoverActions(provider, historyItem),
        });
        templateData.elementDisposables.add(historyItemHover);
        templateData.graphContainer.textContent = '';
        templateData.graphContainer.classList.toggle('current', historyItemViewModel.isCurrent);
        templateData.graphContainer.appendChild(renderSCMHistoryItemGraph(historyItemViewModel));
        const historyItemRef = provider.historyProvider.get()?.historyItemRef?.get();
        const extraClasses = historyItemRef?.revision === historyItem.id ? ['history-item-current'] : [];
        const [matches, descriptionMatches] = this._processMatches(historyItemViewModel, node.filterData);
        templateData.label.setLabel(historyItem.subject, historyItem.author, { matches, descriptionMatches, extraClasses });
        this._renderBadges(historyItem, templateData);
    }
    _renderBadges(historyItem, templateData) {
        templateData.elementDisposables.add(autorun(reader => {
            const labelConfig = this._badgesConfig.read(reader);
            templateData.labelContainer.textContent = '';
            const references = historyItem.references ?
                historyItem.references.slice(0) : [];
            // If the first reference is colored, we render it
            // separately since we have to show the description
            // for the first colored reference.
            if (references.length > 0 && references[0].color) {
                this._renderBadge([references[0]], true, templateData);
                // Remove the rendered reference from the collection
                references.splice(0, 1);
            }
            // Group history item references by color
            const historyItemRefsByColor = groupBy2(references, ref => ref.color ? ref.color : '');
            for (const [key, historyItemRefs] of Object.entries(historyItemRefsByColor)) {
                // If needed skip badges without a color
                if (key === '' && labelConfig !== 'all') {
                    continue;
                }
                // Group history item references by icon
                const historyItemRefByIconId = groupBy2(historyItemRefs, ref => ThemeIcon.isThemeIcon(ref.icon) ? ref.icon.id : '');
                for (const [key, historyItemRefs] of Object.entries(historyItemRefByIconId)) {
                    // Skip badges without an icon
                    if (key === '') {
                        continue;
                    }
                    this._renderBadge(historyItemRefs, false, templateData);
                }
            }
        }));
    }
    _renderBadge(historyItemRefs, showDescription, templateData) {
        if (historyItemRefs.length === 0 || !ThemeIcon.isThemeIcon(historyItemRefs[0].icon)) {
            return;
        }
        const elements = h('div.label', {
            style: {
                color: historyItemRefs[0].color ? asCssVariable(historyItemHoverLabelForeground) : asCssVariable(foreground),
                backgroundColor: historyItemRefs[0].color ? asCssVariable(historyItemRefs[0].color) : asCssVariable(historyItemHoverDefaultLabelBackground)
            }
        }, [
            h('div.count@count', {
                style: {
                    display: historyItemRefs.length > 1 ? '' : 'none'
                }
            }),
            h('div.icon@icon'),
            h('div.description@description', {
                style: {
                    display: showDescription ? '' : 'none'
                }
            })
        ]);
        elements.count.textContent = historyItemRefs.length > 1 ? historyItemRefs.length.toString() : '';
        elements.icon.classList.add(...ThemeIcon.asClassNameArray(historyItemRefs[0].icon));
        elements.description.textContent = showDescription ? historyItemRefs[0].name : '';
        append(templateData.labelContainer, elements.root);
    }
    _getHoverActions(provider, historyItem) {
        const actions = this._menuService.getMenuActions(MenuId.SCMHistoryItemHover, this._contextKeyService, {
            arg: provider,
            shouldForwardArgs: true
        }).flatMap(item => item[1]);
        return [
            {
                commandId: 'workbench.scm.action.graph.copyHistoryItemId',
                iconClass: 'codicon.codicon-copy',
                label: historyItem.displayId ?? historyItem.id,
                run: () => this._clipboardService.writeText(historyItem.id)
            },
            ...actions.map(action => {
                const iconClass = ThemeIcon.isThemeIcon(action.item.icon)
                    ? ThemeIcon.asClassNameArray(action.item.icon).join('.')
                    : undefined;
                return {
                    commandId: action.id,
                    label: action.label,
                    iconClass,
                    run: () => action.run(historyItem)
                };
            })
        ];
    }
    _getHoverContent(element) {
        const colorTheme = this._themeService.getColorTheme();
        const historyItem = element.historyItemViewModel.historyItem;
        const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
        if (historyItem.author) {
            const icon = URI.isUri(historyItem.authorIcon)
                ? `![${historyItem.author}](${historyItem.authorIcon.toString()}|width=20,height=20)`
                : ThemeIcon.isThemeIcon(historyItem.authorIcon)
                    ? `$(${historyItem.authorIcon.id})`
                    : '$(account)';
            if (historyItem.authorEmail) {
                const emailTitle = localize('emailLinkTitle', "Email");
                markdown.appendMarkdown(`${icon} [**${historyItem.author}**](mailto:${historyItem.authorEmail} "${emailTitle} ${historyItem.author}")`);
            }
            else {
                markdown.appendMarkdown(`${icon} **${historyItem.author}**`);
            }
            if (historyItem.timestamp) {
                const dateFormatter = safeIntl.DateTimeFormat(platform.language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                markdown.appendMarkdown(`, $(history) ${fromNow(historyItem.timestamp, true, true)} (${dateFormatter.format(historyItem.timestamp)})`);
            }
            markdown.appendMarkdown('\n\n');
        }
        markdown.appendMarkdown(`${historyItem.message}\n\n`);
        if (historyItem.statistics) {
            markdown.appendMarkdown(`---\n\n`);
            markdown.appendMarkdown(`<span>${historyItem.statistics.files === 1 ?
                localize('fileChanged', "{0} file changed", historyItem.statistics.files) :
                localize('filesChanged', "{0} files changed", historyItem.statistics.files)}</span>`);
            if (historyItem.statistics.insertions) {
                const additionsForegroundColor = colorTheme.getColor(historyItemHoverAdditionsForeground);
                markdown.appendMarkdown(`,&nbsp;<span style="color:${additionsForegroundColor};">${historyItem.statistics.insertions === 1 ?
                    localize('insertion', "{0} insertion{1}", historyItem.statistics.insertions, '(+)') :
                    localize('insertions', "{0} insertions{1}", historyItem.statistics.insertions, '(+)')}</span>`);
            }
            if (historyItem.statistics.deletions) {
                const deletionsForegroundColor = colorTheme.getColor(historyItemHoverDeletionsForeground);
                markdown.appendMarkdown(`,&nbsp;<span style="color:${deletionsForegroundColor};">${historyItem.statistics.deletions === 1 ?
                    localize('deletion', "{0} deletion{1}", historyItem.statistics.deletions, '(-)') :
                    localize('deletions', "{0} deletions{1}", historyItem.statistics.deletions, '(-)')}</span>`);
            }
        }
        if ((historyItem.references ?? []).length > 0) {
            markdown.appendMarkdown(`\n\n---\n\n`);
            markdown.appendMarkdown((historyItem.references ?? []).map(ref => {
                const labelIconId = ThemeIcon.isThemeIcon(ref.icon) ? ref.icon.id : '';
                const labelBackgroundColor = ref.color ? asCssVariable(ref.color) : asCssVariable(historyItemHoverDefaultLabelBackground);
                const labelForegroundColor = ref.color ? asCssVariable(historyItemHoverLabelForeground) : asCssVariable(historyItemHoverDefaultLabelForeground);
                return `<span style="color:${labelForegroundColor};background-color:${labelBackgroundColor};border-radius:10px;">&nbsp;$(${labelIconId})&nbsp;${ref.name}&nbsp;&nbsp;</span>`;
            }).join('&nbsp;&nbsp;'));
        }
        return { markdown, markdownNotSupportedFallback: historyItem.message };
    }
    _processMatches(historyItemViewModel, filterData) {
        if (!filterData) {
            return [undefined, undefined];
        }
        return [
            historyItemViewModel.historyItem.message === filterData.label ? createMatches(filterData.score) : undefined,
            historyItemViewModel.historyItem.author === filterData.label ? createMatches(filterData.score) : undefined
        ];
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
HistoryItemRenderer = HistoryItemRenderer_1 = __decorate([
    __param(1, IClipboardService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IHoverService),
    __param(5, IMenuService),
    __param(6, IThemeService)
], HistoryItemRenderer);
let HistoryItemLoadMoreRenderer = class HistoryItemLoadMoreRenderer {
    static { HistoryItemLoadMoreRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'historyItemLoadMore'; }
    get templateId() { return HistoryItemLoadMoreRenderer_1.TEMPLATE_ID; }
    constructor(_isLoadingMore, _loadMoreCallback, _configurationService) {
        this._isLoadingMore = _isLoadingMore;
        this._loadMoreCallback = _loadMoreCallback;
        this._configurationService = _configurationService;
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        const element = append(container, $('.history-item-load-more'));
        const graphPlaceholder = append(element, $('.graph-placeholder'));
        const historyItemPlaceholderContainer = append(element, $('.history-item-placeholder'));
        const historyItemPlaceholderLabel = new IconLabel(historyItemPlaceholderContainer, { supportIcons: true });
        return { element, graphPlaceholder, historyItemPlaceholderContainer, historyItemPlaceholderLabel, elementDisposables: new DisposableStore(), disposables: new DisposableStore() };
    }
    renderElement(element, index, templateData, height) {
        templateData.graphPlaceholder.textContent = '';
        templateData.graphPlaceholder.style.width = `${SWIMLANE_WIDTH * (element.element.graphColumns.length + 1)}px`;
        templateData.graphPlaceholder.appendChild(renderSCMHistoryGraphPlaceholder(element.element.graphColumns));
        const pageOnScroll = this._configurationService.getValue('scm.graph.pageOnScroll') === true;
        templateData.historyItemPlaceholderContainer.classList.toggle('shimmer', pageOnScroll);
        if (pageOnScroll) {
            templateData.historyItemPlaceholderLabel.setLabel('');
            this._loadMoreCallback();
        }
        else {
            templateData.elementDisposables.add(autorun(reader => {
                const isLoadingMore = this._isLoadingMore.read(reader);
                const icon = `$(${isLoadingMore ? 'loading~spin' : 'fold-down'})`;
                templateData.historyItemPlaceholderLabel.setLabel(localize('loadMore', "{0} Load More...", icon));
            }));
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
HistoryItemLoadMoreRenderer = HistoryItemLoadMoreRenderer_1 = __decorate([
    __param(2, IConfigurationService)
], HistoryItemLoadMoreRenderer);
let HistoryItemHoverDelegate = class HistoryItemHoverDelegate extends WorkbenchHoverDelegate {
    constructor(_viewContainerLocation, layoutService, configurationService, hoverService) {
        super('element', { instantHover: true }, () => this.getHoverOptions(), configurationService, hoverService);
        this._viewContainerLocation = _viewContainerLocation;
        this.layoutService = layoutService;
    }
    getHoverOptions() {
        const sideBarPosition = this.layoutService.getSideBarPosition();
        let hoverPosition;
        if (this._viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
            hoverPosition = sideBarPosition === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */;
        }
        else if (this._viewContainerLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
            hoverPosition = sideBarPosition === 0 /* Position.LEFT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
        }
        else {
            hoverPosition = 1 /* HoverPosition.RIGHT */;
        }
        return { additionalClasses: ['history-item-hover'], position: { hoverPosition, forcePosition: true } };
    }
};
HistoryItemHoverDelegate = __decorate([
    __param(1, IWorkbenchLayoutService),
    __param(2, IConfigurationService),
    __param(3, IHoverService)
], HistoryItemHoverDelegate);
let SCMHistoryViewPaneActionRunner = class SCMHistoryViewPaneActionRunner extends ActionRunner {
    constructor(_progressService) {
        super();
        this._progressService = _progressService;
    }
    runAction(action, context) {
        return this._progressService.withProgress({ location: HISTORY_VIEW_PANE_ID }, async () => await super.runAction(action, context));
    }
};
SCMHistoryViewPaneActionRunner = __decorate([
    __param(0, IProgressService)
], SCMHistoryViewPaneActionRunner);
class SCMHistoryTreeAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('scm history', "Source Control History");
    }
    getAriaLabel(element) {
        if (isSCMRepository(element)) {
            return `${element.provider.name} ${element.provider.label}`;
        }
        else if (isSCMHistoryItemViewModelTreeElement(element)) {
            const historyItem = element.historyItemViewModel.historyItem;
            return `${stripIcons(historyItem.message).trim()}${historyItem.author ? `, ${historyItem.author}` : ''}`;
        }
        else {
            return '';
        }
    }
}
class SCMHistoryTreeIdentityProvider {
    getId(element) {
        if (isSCMRepository(element)) {
            const provider = element.provider;
            return `repo:${provider.id}`;
        }
        else if (isSCMHistoryItemViewModelTreeElement(element)) {
            const provider = element.repository.provider;
            const historyItem = element.historyItemViewModel.historyItem;
            return `historyItem:${provider.id}/${historyItem.id}/${historyItem.parentIds.join(',')}`;
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(element)) {
            const provider = element.repository.provider;
            return `historyItemLoadMore:${provider.id}}`;
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
class SCMHistoryTreeKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (isSCMRepository(element)) {
            return undefined;
        }
        else if (isSCMHistoryItemViewModelTreeElement(element)) {
            // For a history item we want to match both the message and
            // the author. A match in the message takes precedence over
            // a match in the author.
            return [element.historyItemViewModel.historyItem.message, element.historyItemViewModel.historyItem.author];
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(element)) {
            // We don't want to match the load more element
            return '';
        }
        else {
            throw new Error('Invalid tree element');
        }
    }
}
class SCMHistoryTreeDataSource extends Disposable {
    async getChildren(inputOrElement) {
        if (!(inputOrElement instanceof SCMHistoryViewModel)) {
            return [];
        }
        // History items
        const children = [];
        const historyItems = await inputOrElement.getHistoryItems();
        children.push(...historyItems);
        // Load More element
        const repository = inputOrElement.repository.get();
        const lastHistoryItem = historyItems.at(-1);
        if (repository && lastHistoryItem && lastHistoryItem.historyItemViewModel.outputSwimlanes.length > 0) {
            children.push({
                repository,
                graphColumns: lastHistoryItem.historyItemViewModel.outputSwimlanes,
                type: 'historyItemLoadMore'
            });
        }
        return children;
    }
    hasChildren(inputOrElement) {
        return inputOrElement instanceof SCMHistoryViewModel;
    }
}
let SCMHistoryViewModel = class SCMHistoryViewModel extends Disposable {
    constructor(_configurationService, _contextKeyService, _extensionService, _scmService, _scmViewService, _storageService) {
        super();
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this._extensionService = _extensionService;
        this._scmService = _scmService;
        this._scmViewService = _scmViewService;
        this._storageService = _storageService;
        this._selectedRepository = observableValue(this, 'auto');
        this.onDidChangeHistoryItemsFilter = observableSignal(this);
        this.isViewModelEmpty = observableValue(this, false);
        this._repositoryState = new Map();
        this._repositoryFilterState = new Map();
        this._repositoryFilterState = this._loadHistoryItemsFilterState();
        this._extensionService.onWillStop(this._saveHistoryItemsFilterState, this, this._store);
        this._storageService.onWillSaveState(this._saveHistoryItemsFilterState, this, this._store);
        this._scmHistoryItemCountCtx = ContextKeys.SCMHistoryItemCount.bindTo(this._contextKeyService);
        const firstRepository = this._scmService.repositoryCount > 0
            ? constObservable(Iterable.first(this._scmService.repositories))
            : observableFromEvent(this, Event.once(this._scmService.onDidAddRepository), repository => repository);
        const graphRepository = derived(reader => {
            const selectedRepository = this._selectedRepository.read(reader);
            if (selectedRepository !== 'auto') {
                return selectedRepository;
            }
            return this._scmViewService.activeRepository.read(reader);
        });
        this.repository = latestChangedValue(this, [firstRepository, graphRepository]);
        const closedRepository = observableFromEvent(this, this._scmService.onDidRemoveRepository, repository => repository);
        // Closed repository cleanup
        this._register(autorun(reader => {
            const repository = closedRepository.read(reader);
            if (!repository) {
                return;
            }
            if (this.repository.get() === repository) {
                this._selectedRepository.set(Iterable.first(this._scmService.repositories) ?? 'auto', undefined);
            }
            this._repositoryState.delete(repository);
        }));
    }
    clearRepositoryState() {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        this._repositoryState.delete(repository);
    }
    getHistoryItemsFilter() {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        const filterState = this._repositoryFilterState.get(getProviderKey(repository.provider)) ?? 'auto';
        if (filterState === 'all' || filterState === 'auto') {
            return filterState;
        }
        const repositoryState = this._repositoryState.get(repository);
        return repositoryState?.historyItemsFilter;
    }
    getCurrentHistoryItemTreeElement() {
        const repository = this.repository.get();
        if (!repository) {
            return undefined;
        }
        const state = this._repositoryState.get(repository);
        if (!state) {
            return undefined;
        }
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemRef = historyProvider?.historyItemRef.get();
        return state.viewModels
            .find(viewModel => viewModel.historyItemViewModel.historyItem.id === historyItemRef?.revision);
    }
    loadMore(cursor) {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        const state = this._repositoryState.get(repository);
        if (!state) {
            return;
        }
        this._repositoryState.set(repository, { ...state, loadMore: cursor ?? true });
    }
    async getHistoryItems() {
        const repository = this.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        if (!repository || !historyProvider) {
            this._scmHistoryItemCountCtx.set(0);
            this.isViewModelEmpty.set(true, undefined);
            return [];
        }
        let state = this._repositoryState.get(repository);
        if (!state || state.loadMore !== false) {
            const historyItems = state?.viewModels
                .map(vm => vm.historyItemViewModel.historyItem) ?? [];
            const historyItemRefs = state?.historyItemsFilter ??
                await this._resolveHistoryItemFilter(repository, historyProvider);
            const limit = clamp(this._configurationService.getValue('scm.graph.pageSize'), 1, 1000);
            const historyItemRefIds = historyItemRefs.map(ref => ref.revision ?? ref.id);
            do {
                // Fetch the next page of history items
                historyItems.push(...(await historyProvider.provideHistoryItems({
                    historyItemRefs: historyItemRefIds, limit, skip: historyItems.length
                }) ?? []));
            } while (typeof state?.loadMore === 'string' && !historyItems.find(item => item.id === state?.loadMore));
            // Create the color map
            const colorMap = this._getGraphColorMap(historyItemRefs);
            const viewModels = toISCMHistoryItemViewModelArray(historyItems, colorMap, historyProvider.historyItemRef.get())
                .map(historyItemViewModel => ({
                repository,
                historyItemViewModel,
                type: 'historyItemViewModel'
            }));
            state = { historyItemsFilter: historyItemRefs, viewModels, loadMore: false };
            this._repositoryState.set(repository, state);
            this._scmHistoryItemCountCtx.set(viewModels.length);
            this.isViewModelEmpty.set(viewModels.length === 0, undefined);
        }
        return state.viewModels;
    }
    setRepository(repository) {
        this._selectedRepository.set(repository, undefined);
    }
    setHistoryItemsFilter(filter) {
        const repository = this.repository.get();
        if (!repository) {
            return;
        }
        if (filter !== 'auto') {
            this._repositoryFilterState.set(getProviderKey(repository.provider), filter);
        }
        else {
            this._repositoryFilterState.delete(getProviderKey(repository.provider));
        }
        this._saveHistoryItemsFilterState();
        this.onDidChangeHistoryItemsFilter.trigger(undefined);
    }
    _getGraphColorMap(historyItemRefs) {
        const repository = this.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemRef = historyProvider?.historyItemRef.get();
        const historyItemRemoteRef = historyProvider?.historyItemRemoteRef.get();
        const historyItemBaseRef = historyProvider?.historyItemBaseRef.get();
        const colorMap = new Map();
        if (historyItemRef) {
            colorMap.set(historyItemRef.id, historyItemRef.color);
            if (historyItemRemoteRef) {
                colorMap.set(historyItemRemoteRef.id, historyItemRemoteRef.color);
            }
            if (historyItemBaseRef) {
                colorMap.set(historyItemBaseRef.id, historyItemBaseRef.color);
            }
        }
        // Add the remaining history item references to the color map
        // if not already present. These history item references will
        // be colored using the color of the history item to which they
        // point to.
        for (const ref of historyItemRefs) {
            if (!colorMap.has(ref.id)) {
                colorMap.set(ref.id, undefined);
            }
        }
        return colorMap;
    }
    async _resolveHistoryItemFilter(repository, historyProvider) {
        const historyItemRefs = [];
        const historyItemsFilter = this._repositoryFilterState.get(getProviderKey(repository.provider)) ?? 'auto';
        switch (historyItemsFilter) {
            case 'all':
                historyItemRefs.push(...(await historyProvider.provideHistoryItemRefs() ?? []));
                break;
            case 'auto':
                historyItemRefs.push(...[
                    historyProvider.historyItemRef.get(),
                    historyProvider.historyItemRemoteRef.get(),
                    historyProvider.historyItemBaseRef.get(),
                ].filter(ref => !!ref));
                break;
            default: {
                // Get the latest revisions for the history items references in the filer
                const refs = (await historyProvider.provideHistoryItemRefs(historyItemsFilter) ?? [])
                    .filter(ref => historyItemsFilter.some(filter => filter === ref.id));
                if (refs.length === 0) {
                    // Reset the filter
                    historyItemRefs.push(...[
                        historyProvider.historyItemRef.get(),
                        historyProvider.historyItemRemoteRef.get(),
                        historyProvider.historyItemBaseRef.get(),
                    ].filter(ref => !!ref));
                    this._repositoryFilterState.delete(getProviderKey(repository.provider));
                }
                else {
                    // Update filter
                    historyItemRefs.push(...refs);
                    this._repositoryFilterState.set(getProviderKey(repository.provider), refs.map(ref => ref.id));
                }
                this._saveHistoryItemsFilterState();
                break;
            }
        }
        return historyItemRefs;
    }
    _loadHistoryItemsFilterState() {
        try {
            const filterData = this._storageService.get('scm.graphView.referencesFilter', 1 /* StorageScope.WORKSPACE */);
            if (filterData) {
                return new Map(JSON.parse(filterData));
            }
        }
        catch { }
        return new Map();
    }
    _saveHistoryItemsFilterState() {
        const filter = Array.from(this._repositoryFilterState.entries());
        this._storageService.store('scm.graphView.referencesFilter', JSON.stringify(filter), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    dispose() {
        this._repositoryState.clear();
        super.dispose();
    }
};
SCMHistoryViewModel = __decorate([
    __param(0, IConfigurationService),
    __param(1, IContextKeyService),
    __param(2, IExtensionService),
    __param(3, ISCMService),
    __param(4, ISCMViewService),
    __param(5, IStorageService)
], SCMHistoryViewModel);
let RepositoryPicker = class RepositoryPicker {
    constructor(_quickInputService, _scmViewService) {
        this._quickInputService = _quickInputService;
        this._scmViewService = _scmViewService;
        this._autoQuickPickItem = {
            label: localize('auto', "Auto"),
            description: localize('activeRepository', "Show the source control graph for the active repository"),
            repository: 'auto'
        };
    }
    async pickRepository() {
        const picks = [
            this._autoQuickPickItem,
            { type: 'separator' }
        ];
        picks.push(...this._scmViewService.repositories.map(r => ({
            label: r.provider.name,
            description: r.provider.rootUri?.fsPath,
            iconClass: ThemeIcon.asClassName(Codicon.repo),
            repository: r
        })));
        return this._quickInputService.pick(picks, {
            placeHolder: localize('scmGraphRepository', "Select the repository to view, type to filter all repositories")
        });
    }
};
RepositoryPicker = __decorate([
    __param(0, IQuickInputService),
    __param(1, ISCMViewService)
], RepositoryPicker);
let HistoryItemRefPicker = class HistoryItemRefPicker extends Disposable {
    constructor(_historyProvider, _historyItemsFilter, _quickInputService) {
        super();
        this._historyProvider = _historyProvider;
        this._historyItemsFilter = _historyItemsFilter;
        this._quickInputService = _quickInputService;
        this._allQuickPickItem = {
            id: 'all',
            label: localize('all', "All"),
            description: localize('allHistoryItemRefs', "All history item references"),
            historyItemRef: 'all'
        };
        this._autoQuickPickItem = {
            id: 'auto',
            label: localize('auto', "Auto"),
            description: localize('currentHistoryItemRef', "Current history item reference(s)"),
            historyItemRef: 'auto'
        };
    }
    async pickHistoryItemRef() {
        const quickPick = this._quickInputService.createQuickPick({ useSeparators: true });
        this._store.add(quickPick);
        quickPick.placeholder = localize('scmGraphHistoryItemRef', "Select one/more history item references to view, type to filter");
        quickPick.canSelectMany = true;
        quickPick.hideCheckAll = true;
        quickPick.busy = true;
        quickPick.show();
        const items = await this._createQuickPickItems();
        // Set initial selection
        let selectedItems = [];
        if (this._historyItemsFilter === 'all') {
            selectedItems.push(this._allQuickPickItem);
        }
        else if (this._historyItemsFilter === 'auto') {
            selectedItems.push(this._autoQuickPickItem);
        }
        else {
            let index = 0;
            while (index < items.length) {
                if (items[index].type === 'separator') {
                    index++;
                    continue;
                }
                if (this._historyItemsFilter.some(ref => ref.id === items[index].id)) {
                    const item = items.splice(index, 1);
                    selectedItems.push(...item);
                }
                else {
                    index++;
                }
            }
            // Insert the selected items after `All` and `Auto`
            items.splice(2, 0, { type: 'separator' }, ...selectedItems);
        }
        quickPick.items = items;
        quickPick.selectedItems = selectedItems;
        quickPick.busy = false;
        return new Promise(resolve => {
            this._store.add(quickPick.onDidChangeSelection(items => {
                const { added } = delta(selectedItems, items, (a, b) => compare(a.id ?? '', b.id ?? ''));
                if (added.length > 0) {
                    if (added[0].historyItemRef === 'all' || added[0].historyItemRef === 'auto') {
                        quickPick.selectedItems = [added[0]];
                    }
                    else {
                        // Remove 'all' and 'auto' items if present
                        quickPick.selectedItems = [...quickPick.selectedItems
                                .filter(i => i.historyItemRef !== 'all' && i.historyItemRef !== 'auto')];
                    }
                }
                selectedItems = [...quickPick.selectedItems];
            }));
            this._store.add(quickPick.onDidAccept(() => {
                if (selectedItems.length === 0) {
                    resolve(undefined);
                }
                else if (selectedItems.length === 1 && selectedItems[0].historyItemRef === 'all') {
                    resolve('all');
                }
                else if (selectedItems.length === 1 && selectedItems[0].historyItemRef === 'auto') {
                    resolve('auto');
                }
                else {
                    resolve(selectedItems.map(item => item.historyItemRef.id));
                }
                quickPick.hide();
            }));
            this._store.add(quickPick.onDidHide(() => {
                resolve(undefined);
                this.dispose();
            }));
        });
    }
    async _createQuickPickItems() {
        const picks = [
            this._allQuickPickItem, this._autoQuickPickItem
        ];
        const historyItemRefs = await this._historyProvider.provideHistoryItemRefs() ?? [];
        const historyItemRefsByCategory = groupBy(historyItemRefs, (a, b) => compare(a.category ?? '', b.category ?? ''));
        for (const refs of historyItemRefsByCategory) {
            if (refs.length === 0) {
                continue;
            }
            picks.push({ type: 'separator', label: refs[0].category });
            picks.push(...refs.map(ref => {
                return {
                    id: ref.id,
                    label: ref.name,
                    description: ref.description,
                    iconClass: ThemeIcon.isThemeIcon(ref.icon) ?
                        ThemeIcon.asClassName(ref.icon) : undefined,
                    historyItemRef: ref
                };
            }));
        }
        return picks;
    }
};
HistoryItemRefPicker = __decorate([
    __param(2, IQuickInputService)
], HistoryItemRefPicker);
let SCMHistoryViewPane = class SCMHistoryViewPane extends ViewPane {
    constructor(options, _commandService, _instantiationService, _menuService, _progressService, configurationService, contextMenuService, keybindingService, instantiationService, viewDescriptorService, contextKeyService, openerService, themeService, hoverService) {
        super({
            ...options,
            titleMenuId: MenuId.SCMHistoryTitle,
            showActions: ViewPaneShowActions.WhenExpanded
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._menuService = _menuService;
        this._progressService = _progressService;
        this._repositoryIsLoadingMore = observableValue(this, false);
        this._repositoryOutdated = observableValue(this, false);
        this._visibilityDisposables = new DisposableStore();
        this._treeOperationSequencer = new Sequencer();
        this._treeLoadMoreSequencer = new Sequencer();
        this._updateChildrenThrottler = new Throttler();
        this._contextMenuDisposables = new MutableDisposable();
        this._scmProviderCtx = ContextKeys.SCMProvider.bindTo(this.scopedContextKeyService);
        this._scmCurrentHistoryItemRefHasRemote = ContextKeys.SCMCurrentHistoryItemRefHasRemote.bindTo(this.scopedContextKeyService);
        this._scmCurrentHistoryItemRefInFilter = ContextKeys.SCMCurrentHistoryItemRefInFilter.bindTo(this.scopedContextKeyService);
        this._actionRunner = this.instantiationService.createInstance(SCMHistoryViewPaneActionRunner);
        this._register(this._actionRunner);
        this._register(this._updateChildrenThrottler);
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.title);
        const element = h('div.scm-graph-view-badge-container', [
            h('div.scm-graph-view-badge.monaco-count-badge.long@badge')
        ]);
        element.badge.textContent = 'Outdated';
        container.appendChild(element.root);
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), element.root, {
            markdown: {
                value: localize('scmGraphViewOutdated', "Please refresh the graph using the refresh action ($(refresh))."),
                supportThemeIcons: true
            },
            markdownNotSupportedFallback: undefined
        }));
        this._register(autorun(reader => {
            const outdated = this._repositoryOutdated.read(reader);
            element.root.style.display = outdated ? '' : 'none';
        }));
    }
    renderBody(container) {
        super.renderBody(container);
        this._treeContainer = append(container, $('.scm-view.scm-history-view'));
        this._treeContainer.classList.add('file-icon-themable-tree');
        this._createTree(this._treeContainer);
        this.onDidChangeBodyVisibility(async (visible) => {
            if (!visible) {
                this._visibilityDisposables.clear();
                return;
            }
            // Create view model
            this._treeViewModel = this.instantiationService.createInstance(SCMHistoryViewModel);
            this._visibilityDisposables.add(this._treeViewModel);
            // Wait for first repository to be initialized
            const firstRepositoryInitialized = derived(this, reader => {
                const repository = this._treeViewModel.repository.read(reader);
                const historyProvider = repository?.provider.historyProvider.read(reader);
                const historyItemRef = historyProvider?.historyItemRef.read(reader);
                return historyItemRef !== undefined ? true : undefined;
            });
            await waitForState(firstRepositoryInitialized);
            // Initial rendering
            await this._progressService.withProgress({ location: this.id }, async () => {
                await this._treeOperationSequencer.queue(async () => {
                    await this._tree.setInput(this._treeViewModel);
                    this._tree.scrollTop = 0;
                });
            });
            this._visibilityDisposables.add(autorun(reader => {
                this._treeViewModel.isViewModelEmpty.read(reader);
                this._onDidChangeViewWelcomeState.fire();
            }));
            // Repository change
            let isFirstRun = true;
            this._visibilityDisposables.add(autorunWithStore((reader, store) => {
                const repository = this._treeViewModel.repository.read(reader);
                const historyProvider = repository?.provider.historyProvider.read(reader);
                if (!repository || !historyProvider) {
                    return;
                }
                // HistoryItemId changed (checkout)
                const historyItemRefId = derived(reader => {
                    return historyProvider.historyItemRef.read(reader)?.id;
                });
                store.add(runOnChange(historyItemRefId, async (historyItemRefIdValue) => {
                    await this.refresh();
                    // Update context key (needs to be done after the refresh call)
                    this._scmCurrentHistoryItemRefInFilter.set(this._isCurrentHistoryItemInFilter(historyItemRefIdValue));
                }));
                // HistoryItemRefs changed
                store.add(runOnChange(historyProvider.historyItemRefChanges, changes => {
                    if (changes.silent) {
                        // The history item reference changes occurred in the background (ex: Auto Fetch)
                        // If tree is scrolled to the top, we can safely refresh the tree, otherwise we
                        // will show a visual cue that the view is outdated.
                        if (this._tree.scrollTop === 0) {
                            this.refresh();
                            return;
                        }
                        // Show the "Outdated" badge on the view
                        this._repositoryOutdated.set(true, undefined);
                        return;
                    }
                    this.refresh();
                }));
                // HistoryItemRefs filter changed
                store.add(runOnChange(this._treeViewModel.onDidChangeHistoryItemsFilter, async () => {
                    await this.refresh();
                    // Update context key (needs to be done after the refresh call)
                    this._scmCurrentHistoryItemRefInFilter.set(this._isCurrentHistoryItemInFilter(historyItemRefId.get()));
                }));
                // HistoryItemRemoteRef changed
                store.add(autorun(reader => {
                    this._scmCurrentHistoryItemRefHasRemote.set(!!historyProvider.historyItemRemoteRef.read(reader));
                }));
                // Update context
                this._scmProviderCtx.set(repository.provider.contextValue);
                this._scmCurrentHistoryItemRefInFilter.set(this._isCurrentHistoryItemInFilter(historyItemRefId.get()));
                // We skip refreshing the graph on the first execution of the autorun
                // since the graph for the first repository is rendered when the tree
                // input is set.
                if (!isFirstRun) {
                    this.refresh();
                }
                isFirstRun = false;
            }));
        }, this, this._store);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._tree.layout(height, width);
    }
    getActionRunner() {
        return this._actionRunner;
    }
    getActionsContext() {
        return this._treeViewModel?.repository.get()?.provider;
    }
    createActionViewItem(action, options) {
        if (action.id === PICK_REPOSITORY_ACTION_ID) {
            const repository = this._treeViewModel?.repository.get();
            if (repository) {
                return new SCMRepositoryActionViewItem(repository, action, options);
            }
        }
        else if (action.id === PICK_HISTORY_ITEM_REFS_ACTION_ID) {
            const repository = this._treeViewModel?.repository.get();
            const historyItemsFilter = this._treeViewModel?.getHistoryItemsFilter();
            if (repository && historyItemsFilter) {
                return new SCMHistoryItemRefsActionViewItem(repository, historyItemsFilter, action, options);
            }
        }
        return super.createActionViewItem(action, options);
    }
    focus() {
        super.focus();
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        this._tree.focusFirst(fakeKeyboardEvent);
        this._tree.domFocus();
    }
    shouldShowWelcome() {
        return this._treeViewModel?.isViewModelEmpty.get() === true;
    }
    async refresh() {
        this._treeViewModel.clearRepositoryState();
        await this._updateChildren();
        this.updateActions();
        this._repositoryOutdated.set(false, undefined);
        this._tree.scrollTop = 0;
    }
    async pickRepository() {
        const picker = this._instantiationService.createInstance(RepositoryPicker);
        const result = await picker.pickRepository();
        if (result) {
            this._treeViewModel.setRepository(result.repository);
        }
    }
    async pickHistoryItemRef() {
        const repository = this._treeViewModel.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemsFilter = this._treeViewModel.getHistoryItemsFilter();
        if (!historyProvider || !historyItemsFilter) {
            return;
        }
        const picker = this._instantiationService.createInstance(HistoryItemRefPicker, historyProvider, historyItemsFilter);
        const result = await picker.pickHistoryItemRef();
        if (result) {
            this._treeViewModel.setHistoryItemsFilter(result);
        }
    }
    async revealCurrentHistoryItem() {
        const repository = this._treeViewModel.repository.get();
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemRef = historyProvider?.historyItemRef.get();
        if (!repository || !historyItemRef?.id || !historyItemRef?.revision) {
            return;
        }
        if (!this._isCurrentHistoryItemInFilter(historyItemRef.id)) {
            return;
        }
        const revealTreeNode = () => {
            const historyItemTreeElement = this._treeViewModel.getCurrentHistoryItemTreeElement();
            if (historyItemTreeElement && this._tree.hasNode(historyItemTreeElement)) {
                this._tree.reveal(historyItemTreeElement, 0.5);
                this._tree.setSelection([historyItemTreeElement]);
                this._tree.setFocus([historyItemTreeElement]);
                return true;
            }
            return false;
        };
        if (revealTreeNode()) {
            return;
        }
        // Fetch current history item
        await this._loadMore(historyItemRef.revision);
        // Reveal node
        revealTreeNode();
    }
    _createTree(container) {
        this._treeIdentityProvider = new SCMHistoryTreeIdentityProvider();
        const historyItemHoverDelegate = this.instantiationService.createInstance(HistoryItemHoverDelegate, this.viewDescriptorService.getViewLocationById(this.id));
        this._register(historyItemHoverDelegate);
        this._treeDataSource = this.instantiationService.createInstance(SCMHistoryTreeDataSource);
        this._register(this._treeDataSource);
        this._tree = this.instantiationService.createInstance(WorkbenchAsyncDataTree, 'SCM History Tree', container, new ListDelegate(), [
            this.instantiationService.createInstance(HistoryItemRenderer, historyItemHoverDelegate),
            this.instantiationService.createInstance(HistoryItemLoadMoreRenderer, this._repositoryIsLoadingMore, () => this._loadMore()),
        ], this._treeDataSource, {
            accessibilityProvider: new SCMHistoryTreeAccessibilityProvider(),
            identityProvider: this._treeIdentityProvider,
            collapseByDefault: (e) => false,
            keyboardNavigationLabelProvider: new SCMHistoryTreeKeyboardNavigationLabelProvider(),
            horizontalScrolling: false,
            multipleSelectionSupport: false,
        });
        this._register(this._tree);
        this._tree.onDidOpen(this._onDidOpen, this, this._store);
        this._tree.onContextMenu(this._onContextMenu, this, this._store);
    }
    _isCurrentHistoryItemInFilter(historyItemRefId) {
        if (!historyItemRefId) {
            return false;
        }
        const historyItemFilter = this._treeViewModel.getHistoryItemsFilter();
        if (historyItemFilter === 'all' || historyItemFilter === 'auto') {
            return true;
        }
        return Array.isArray(historyItemFilter) && !!historyItemFilter.find(ref => ref.id === historyItemRefId);
    }
    async _onDidOpen(e) {
        if (!e.element) {
            return;
        }
        else if (isSCMHistoryItemViewModelTreeElement(e.element)) {
            const historyItem = e.element.historyItemViewModel.historyItem;
            const historyItemParentId = historyItem.parentIds.length > 0 ? historyItem.parentIds[0] : undefined;
            const historyProvider = e.element.repository.provider.historyProvider.get();
            const historyItemChanges = await historyProvider?.provideHistoryItemChanges(historyItem.id, historyItemParentId);
            if (historyItemChanges) {
                const title = getHistoryItemEditorTitle(historyItem);
                const rootUri = e.element.repository.provider.rootUri;
                const path = rootUri ? rootUri.path : e.element.repository.provider.label;
                const multiDiffSourceUri = URI.from({ scheme: 'scm-history-item', path: `${path}/${historyItemParentId}..${historyItem.id}` }, true);
                await this._commandService.executeCommand('_workbench.openMultiDiffEditor', { title, multiDiffSourceUri, resources: historyItemChanges });
            }
        }
        else if (isSCMHistoryItemLoadMoreTreeElement(e.element)) {
            const pageOnScroll = this.configurationService.getValue('scm.graph.pageOnScroll') === true;
            if (!pageOnScroll) {
                this._loadMore();
                this._tree.setSelection([]);
            }
        }
    }
    _onContextMenu(e) {
        const element = e.element;
        if (!element || !isSCMHistoryItemViewModelTreeElement(element)) {
            return;
        }
        this._contextMenuDisposables.value = new DisposableStore();
        const historyItemRefMenuItems = MenuRegistry.getMenuItems(MenuId.SCMHistoryItemRefContext).filter(item => isIMenuItem(item));
        // If there are any history item references we have to add a submenu item for each orignal action,
        // and a menu item for each history item ref that matches the `when` clause of the original action.
        if (historyItemRefMenuItems.length > 0 && element.historyItemViewModel.historyItem.references?.length) {
            const historyItemRefActions = new Map();
            for (const ref of element.historyItemViewModel.historyItem.references) {
                const contextKeyService = this.scopedContextKeyService.createOverlay([
                    ['scmHistoryItemRef', ref.id]
                ]);
                const menuActions = this._menuService.getMenuActions(MenuId.SCMHistoryItemRefContext, contextKeyService);
                for (const action of menuActions.flatMap(a => a[1])) {
                    if (!historyItemRefActions.has(action.id)) {
                        historyItemRefActions.set(action.id, []);
                    }
                    historyItemRefActions.get(action.id).push(ref);
                }
            }
            // Register submenu, menu items
            for (const historyItemRefMenuItem of historyItemRefMenuItems) {
                const actionId = historyItemRefMenuItem.command.id;
                if (!historyItemRefActions.has(actionId)) {
                    continue;
                }
                // Register the submenu for the original action
                this._contextMenuDisposables.value.add(MenuRegistry.appendMenuItem(MenuId.SCMHistoryItemContext, {
                    title: historyItemRefMenuItem.command.title,
                    submenu: MenuId.for(actionId),
                    group: historyItemRefMenuItem?.group,
                    order: historyItemRefMenuItem?.order
                }));
                // Register the action for the history item ref
                for (const historyItemRef of historyItemRefActions.get(actionId) ?? []) {
                    this._contextMenuDisposables.value.add(registerAction2(class extends Action2 {
                        constructor() {
                            super({
                                id: `${actionId}.${historyItemRef.id}`,
                                title: historyItemRef.name,
                                menu: {
                                    id: MenuId.for(actionId),
                                    group: historyItemRef.category
                                }
                            });
                        }
                        run(accessor, ...args) {
                            const commandService = accessor.get(ICommandService);
                            commandService.executeCommand(actionId, ...args, historyItemRef.id);
                        }
                    }));
                }
            }
        }
        const historyItemMenuActions = this._menuService.getMenuActions(MenuId.SCMHistoryItemContext, this.scopedContextKeyService, {
            arg: element.repository.provider,
            shouldForwardArgs: true
        });
        this.contextMenuService.showContextMenu({
            contextKeyService: this.scopedContextKeyService,
            getAnchor: () => e.anchor,
            getActions: () => getFlatContextMenuActions(historyItemMenuActions),
            getActionsContext: () => element.historyItemViewModel.historyItem
        });
    }
    async _loadMore(cursor) {
        return this._treeLoadMoreSequencer.queue(async () => {
            if (this._repositoryIsLoadingMore.get()) {
                return;
            }
            this._repositoryIsLoadingMore.set(true, undefined);
            this._treeViewModel.loadMore(cursor);
            await this._updateChildren();
            this._repositoryIsLoadingMore.set(false, undefined);
        });
    }
    _updateChildren() {
        return this._updateChildrenThrottler.queue(() => this._treeOperationSequencer.queue(async () => {
            await this._progressService.withProgress({ location: this.id }, async () => {
                await this._tree.updateChildren(undefined, undefined, undefined, {
                // diffIdentityProvider: this._treeIdentityProvider
                });
            });
        }));
    }
    dispose() {
        this._contextMenuDisposables.dispose();
        this._visibilityDisposables.dispose();
        super.dispose();
    }
};
SCMHistoryViewPane = __decorate([
    __param(1, ICommandService),
    __param(2, IInstantiationService),
    __param(3, IMenuService),
    __param(4, IProgressService),
    __param(5, IConfigurationService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IContextKeyService),
    __param(11, IOpenerService),
    __param(12, IThemeService),
    __param(13, IHoverService)
], SCMHistoryViewPane);
export { SCMHistoryViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtSGlzdG9yeVZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3NjbUhpc3RvcnlWaWV3UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQkFBaUIsQ0FBQztBQUN6QixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUd0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFJL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFzQixNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hPLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcs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
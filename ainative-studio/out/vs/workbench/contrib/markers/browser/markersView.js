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
import './media/markers.css';
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Separator } from '../../../../base/common/actions.js';
import { groupBy } from '../../../../base/common/arrays.js';
import { Event, Relay } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { fillInMarkersDragData } from '../../../../platform/dnd/browser/dnd.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IListService, WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IOpenerService, withSelection } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { RangeHighlightDecorations } from '../../../browser/codeeditor.js';
import { ResourceListDnDHandler } from '../../../browser/dnd.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { FilterViewPane } from '../../../browser/parts/views/viewPane.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { Memento } from '../../../common/memento.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { Markers, MarkersContextKeys } from '../common/markers.js';
import { FilterOptions } from './markersFilterOptions.js';
import { compareMarkersByUri, Marker, MarkersModel, MarkerTableItem, RelatedInformation, ResourceMarkers } from './markersModel.js';
import { MarkersTable } from './markersTable.js';
import { Filter, MarkerRenderer, MarkersViewModel, MarkersWidgetAccessibilityProvider, RelatedInformationRenderer, ResourceMarkersRenderer, VirtualDelegate } from './markersTreeViewer.js';
import { MarkersFilters } from './markersViewActions.js';
import Messages from './messages.js';
function createResourceMarkersIterator(resourceMarkers) {
    return Iterable.map(resourceMarkers.markers, m => {
        const relatedInformationIt = Iterable.from(m.relatedInformation);
        const children = Iterable.map(relatedInformationIt, r => ({ element: r }));
        return { element: m, children };
    });
}
let MarkersView = class MarkersView extends FilterViewPane {
    constructor(options, instantiationService, viewDescriptorService, editorService, configurationService, markerService, contextKeyService, workspaceContextService, contextMenuService, uriIdentityService, keybindingService, storageService, openerService, themeService, hoverService) {
        const memento = new Memento(Markers.MARKERS_VIEW_STORAGE_ID, storageService);
        const panelState = memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        super({
            ...options,
            filterOptions: {
                ariaLabel: Messages.MARKERS_PANEL_FILTER_ARIA_LABEL,
                placeholder: Messages.MARKERS_PANEL_FILTER_PLACEHOLDER,
                focusContextKey: MarkersContextKeys.MarkerViewFilterFocusContextKey.key,
                text: panelState['filter'] || '',
                history: panelState['filterHistory'] || []
            }
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.markerService = markerService;
        this.workspaceContextService = workspaceContextService;
        this.uriIdentityService = uriIdentityService;
        this.lastSelectedRelativeTop = 0;
        this.currentActiveResource = null;
        this.onVisibleDisposables = this._register(new DisposableStore());
        this.widgetDisposables = this._register(new DisposableStore());
        this.currentHeight = 0;
        this.currentWidth = 0;
        this.cachedFilterStats = undefined;
        this.currentResourceGotAddedToMarkersData = false;
        this.onDidChangeVisibility = this.onDidChangeBodyVisibility;
        this.memento = memento;
        this.panelState = panelState;
        this.markersModel = this._register(instantiationService.createInstance(MarkersModel));
        this.markersViewModel = this._register(instantiationService.createInstance(MarkersViewModel, this.panelState['multiline'], this.panelState['viewMode'] ?? this.getDefaultViewMode()));
        this._register(this.onDidChangeVisibility(visible => this.onDidChangeMarkersViewVisibility(visible)));
        this._register(this.markersViewModel.onDidChangeViewMode(_ => this.onDidChangeViewMode()));
        this.widgetAccessibilityProvider = instantiationService.createInstance(MarkersWidgetAccessibilityProvider);
        this.widgetIdentityProvider = { getId(element) { return element.id; } };
        this.setCurrentActiveEditor();
        this.filter = new Filter(FilterOptions.EMPTY(uriIdentityService));
        this.rangeHighlightDecorations = this._register(this.instantiationService.createInstance(RangeHighlightDecorations));
        this.filters = this._register(new MarkersFilters({
            filterHistory: this.panelState['filterHistory'] || [],
            showErrors: this.panelState['showErrors'] !== false,
            showWarnings: this.panelState['showWarnings'] !== false,
            showInfos: this.panelState['showInfos'] !== false,
            excludedFiles: !!this.panelState['useFilesExclude'],
            activeFile: !!this.panelState['activeFile'],
        }, this.contextKeyService));
        // Update filter, whenever the "files.exclude" setting is changed
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (this.filters.excludedFiles && e.affectsConfiguration('files.exclude')) {
                this.updateFilter();
            }
        }));
    }
    render() {
        super.render();
        this._register(registerNavigableContainer({
            name: 'markersView',
            focusNotifiers: [this, this.filterWidget],
            focusNextWidget: () => {
                if (this.filterWidget.hasFocus()) {
                    this.focus();
                }
            },
            focusPreviousWidget: () => {
                if (!this.filterWidget.hasFocus()) {
                    this.focusFilter();
                }
            }
        }));
    }
    renderBody(parent) {
        super.renderBody(parent);
        parent.classList.add('markers-panel');
        this._register(dom.addDisposableListener(parent, 'keydown', e => {
            const event = new StandardKeyboardEvent(e);
            if (!this.keybindingService.mightProducePrintableCharacter(event)) {
                return;
            }
            const result = this.keybindingService.softDispatch(event, event.target);
            if (result.kind === 1 /* ResultKind.MoreChordsNeeded */ || result.kind === 2 /* ResultKind.KbFound */) {
                return;
            }
            this.focusFilter();
        }));
        const panelContainer = dom.append(parent, dom.$('.markers-panel-container'));
        this.createArialLabelElement(panelContainer);
        this.createMessageBox(panelContainer);
        this.widgetContainer = dom.append(panelContainer, dom.$('.widget-container'));
        this.createWidget(this.widgetContainer);
        this.updateFilter();
        this.renderContent();
    }
    getTitle() {
        return Messages.MARKERS_PANEL_TITLE_PROBLEMS.value;
    }
    layoutBodyContent(height = this.currentHeight, width = this.currentWidth) {
        if (this.messageBoxContainer) {
            this.messageBoxContainer.style.height = `${height}px`;
        }
        this.widget.layout(height, width);
        this.currentHeight = height;
        this.currentWidth = width;
    }
    focus() {
        super.focus();
        if (dom.isActiveElement(this.widget.getHTMLElement())) {
            return;
        }
        if (this.hasNoProblems()) {
            this.messageBoxContainer.focus();
        }
        else {
            this.widget.domFocus();
            this.widget.setMarkerSelection();
        }
    }
    focusFilter() {
        this.filterWidget.focus();
    }
    updateBadge(total, filtered) {
        this.filterWidget.updateBadge(total === filtered || total === 0 ? undefined : localize('showing filtered problems', "Showing {0} of {1}", filtered, total));
    }
    checkMoreFilters() {
        this.filterWidget.checkMoreFilters(!this.filters.showErrors || !this.filters.showWarnings || !this.filters.showInfos || this.filters.excludedFiles || this.filters.activeFile);
    }
    clearFilterText() {
        this.filterWidget.setFilterText('');
    }
    showQuickFixes(marker) {
        const viewModel = this.markersViewModel.getViewModel(marker);
        if (viewModel) {
            viewModel.quickFixAction.run();
        }
    }
    openFileAtElement(element, preserveFocus, sideByside, pinned) {
        const { resource, selection } = element instanceof Marker ? { resource: element.resource, selection: element.range } :
            element instanceof RelatedInformation ? { resource: element.raw.resource, selection: element.raw } :
                'marker' in element ? { resource: element.marker.resource, selection: element.marker.range } :
                    { resource: null, selection: null };
        if (resource && selection) {
            this.editorService.openEditor({
                resource,
                options: {
                    selection,
                    preserveFocus,
                    pinned,
                    revealIfVisible: true
                },
            }, sideByside ? SIDE_GROUP : ACTIVE_GROUP).then(editor => {
                if (editor && preserveFocus) {
                    this.rangeHighlightDecorations.highlightRange({ resource, range: selection }, editor.getControl());
                }
                else {
                    this.rangeHighlightDecorations.removeHighlightRange();
                }
            });
            return true;
        }
        else {
            this.rangeHighlightDecorations.removeHighlightRange();
        }
        return false;
    }
    refreshPanel(markerOrChange) {
        if (this.isVisible()) {
            const hasSelection = this.widget.getSelection().length > 0;
            if (markerOrChange) {
                if (markerOrChange instanceof Marker) {
                    this.widget.updateMarker(markerOrChange);
                }
                else {
                    if (markerOrChange.added.size || markerOrChange.removed.size) {
                        // Reset complete widget
                        this.resetWidget();
                    }
                    else {
                        // Update resource
                        this.widget.update([...markerOrChange.updated]);
                    }
                }
            }
            else {
                // Reset complete widget
                this.resetWidget();
            }
            if (hasSelection) {
                this.widget.setMarkerSelection();
            }
            this.cachedFilterStats = undefined;
            const { total, filtered } = this.getFilterStats();
            this.toggleVisibility(total === 0 || filtered === 0);
            this.renderMessage();
            this.updateBadge(total, filtered);
            this.checkMoreFilters();
        }
    }
    onDidChangeViewState(marker) {
        this.refreshPanel(marker);
    }
    resetWidget() {
        this.widget.reset(this.getResourceMarkers());
    }
    updateFilter() {
        this.filter.options = new FilterOptions(this.filterWidget.getFilterText(), this.getFilesExcludeExpressions(), this.filters.showWarnings, this.filters.showErrors, this.filters.showInfos, this.uriIdentityService);
        this.widget.filterMarkers(this.getResourceMarkers(), this.filter.options);
        this.cachedFilterStats = undefined;
        const { total, filtered } = this.getFilterStats();
        this.toggleVisibility(total === 0 || filtered === 0);
        this.renderMessage();
        this.updateBadge(total, filtered);
        this.checkMoreFilters();
    }
    getDefaultViewMode() {
        switch (this.configurationService.getValue('problems.defaultViewMode')) {
            case 'table':
                return "table" /* MarkersViewMode.Table */;
            case 'tree':
                return "tree" /* MarkersViewMode.Tree */;
            default:
                return "tree" /* MarkersViewMode.Tree */;
        }
    }
    getFilesExcludeExpressions() {
        if (!this.filters.excludedFiles) {
            return [];
        }
        const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
        return workspaceFolders.length
            ? workspaceFolders.map(workspaceFolder => ({ root: workspaceFolder.uri, expression: this.getFilesExclude(workspaceFolder.uri) }))
            : this.getFilesExclude();
    }
    getFilesExclude(resource) {
        return deepClone(this.configurationService.getValue('files.exclude', { resource })) || {};
    }
    getResourceMarkers() {
        if (!this.filters.activeFile) {
            return this.markersModel.resourceMarkers;
        }
        let resourceMarkers = [];
        if (this.currentActiveResource) {
            const activeResourceMarkers = this.markersModel.getResourceMarkers(this.currentActiveResource);
            if (activeResourceMarkers) {
                resourceMarkers = [activeResourceMarkers];
            }
        }
        return resourceMarkers;
    }
    createMessageBox(parent) {
        this.messageBoxContainer = dom.append(parent, dom.$('.message-box-container'));
        this.messageBoxContainer.setAttribute('aria-labelledby', 'markers-panel-arialabel');
    }
    createArialLabelElement(parent) {
        this.ariaLabelElement = dom.append(parent, dom.$(''));
        this.ariaLabelElement.setAttribute('id', 'markers-panel-arialabel');
    }
    createWidget(parent) {
        this.widget = this.markersViewModel.viewMode === "table" /* MarkersViewMode.Table */ ? this.createTable(parent) : this.createTree(parent);
        this.widgetDisposables.add(this.widget);
        const markerFocusContextKey = MarkersContextKeys.MarkerFocusContextKey.bindTo(this.widget.contextKeyService);
        const relatedInformationFocusContextKey = MarkersContextKeys.RelatedInformationFocusContextKey.bindTo(this.widget.contextKeyService);
        this.widgetDisposables.add(this.widget.onDidChangeFocus(focus => {
            markerFocusContextKey.set(focus.elements.some(e => e instanceof Marker));
            relatedInformationFocusContextKey.set(focus.elements.some(e => e instanceof RelatedInformation));
        }));
        this.widgetDisposables.add(Event.debounce(this.widget.onDidOpen, (last, event) => event, 75, true)(options => {
            this.openFileAtElement(options.element, !!options.editorOptions.preserveFocus, options.sideBySide, !!options.editorOptions.pinned);
        }));
        this.widgetDisposables.add(Event.any(this.widget.onDidChangeSelection, this.widget.onDidChangeFocus)(() => {
            const elements = [...this.widget.getSelection(), ...this.widget.getFocus()];
            for (const element of elements) {
                if (element instanceof Marker) {
                    const viewModel = this.markersViewModel.getViewModel(element);
                    viewModel?.showLightBulb();
                }
            }
        }));
        this.widgetDisposables.add(this.widget.onContextMenu(this.onContextMenu, this));
        this.widgetDisposables.add(this.widget.onDidChangeSelection(this.onSelected, this));
    }
    createTable(parent) {
        const table = this.instantiationService.createInstance(MarkersTable, dom.append(parent, dom.$('.markers-table-container')), this.markersViewModel, this.getResourceMarkers(), this.filter.options, {
            accessibilityProvider: this.widgetAccessibilityProvider,
            dnd: this.instantiationService.createInstance(ResourceListDnDHandler, (element) => {
                if (element instanceof MarkerTableItem) {
                    return withSelection(element.resource, element.range);
                }
                return null;
            }),
            horizontalScrolling: false,
            identityProvider: this.widgetIdentityProvider,
            multipleSelectionSupport: true,
            selectionNavigation: true
        });
        return table;
    }
    createTree(parent) {
        const onDidChangeRenderNodeCount = new Relay();
        const treeLabels = this.instantiationService.createInstance(ResourceLabels, this);
        const virtualDelegate = new VirtualDelegate(this.markersViewModel);
        const renderers = [
            this.instantiationService.createInstance(ResourceMarkersRenderer, treeLabels, onDidChangeRenderNodeCount.event),
            this.instantiationService.createInstance(MarkerRenderer, this.markersViewModel),
            this.instantiationService.createInstance(RelatedInformationRenderer)
        ];
        const tree = this.instantiationService.createInstance(MarkersTree, 'MarkersView', dom.append(parent, dom.$('.tree-container.show-file-icons')), virtualDelegate, renderers, {
            filter: this.filter,
            accessibilityProvider: this.widgetAccessibilityProvider,
            identityProvider: this.widgetIdentityProvider,
            dnd: this.instantiationService.createInstance(MarkersListDnDHandler),
            expandOnlyOnTwistieClick: (e) => e instanceof Marker && e.relatedInformation.length > 0,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            selectionNavigation: true,
            multipleSelectionSupport: true,
        });
        onDidChangeRenderNodeCount.input = tree.onDidChangeRenderNodeCount;
        return tree;
    }
    collapseAll() {
        this.widget.collapseMarkers();
    }
    setMultiline(multiline) {
        this.markersViewModel.multiline = multiline;
    }
    setViewMode(viewMode) {
        this.markersViewModel.viewMode = viewMode;
    }
    onDidChangeMarkersViewVisibility(visible) {
        this.onVisibleDisposables.clear();
        if (visible) {
            for (const disposable of this.reInitialize()) {
                this.onVisibleDisposables.add(disposable);
            }
            this.refreshPanel();
        }
    }
    reInitialize() {
        const disposables = [];
        // Markers Model
        const readMarkers = (resource) => this.markerService.read({ resource, severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info });
        this.markersModel.setResourceMarkers(groupBy(readMarkers(), compareMarkersByUri).map(group => [group[0].resource, group]));
        disposables.push(Event.debounce(this.markerService.onMarkerChanged, (resourcesMap, resources) => {
            resourcesMap = resourcesMap || new ResourceMap();
            resources.forEach(resource => resourcesMap.set(resource, resource));
            return resourcesMap;
        }, 64)(resourcesMap => {
            this.markersModel.setResourceMarkers([...resourcesMap.values()].map(resource => [resource, readMarkers(resource)]));
        }));
        disposables.push(Event.any(this.markersModel.onDidChange, this.editorService.onDidActiveEditorChange)(changes => {
            if (changes) {
                this.onDidChangeModel(changes);
            }
            else {
                this.onActiveEditorChanged();
            }
        }));
        disposables.push(toDisposable(() => this.markersModel.reset()));
        // Markers View Model
        this.markersModel.resourceMarkers.forEach(resourceMarker => resourceMarker.markers.forEach(marker => this.markersViewModel.add(marker)));
        disposables.push(this.markersViewModel.onDidChange(marker => this.onDidChangeViewState(marker)));
        disposables.push(toDisposable(() => this.markersModel.resourceMarkers.forEach(resourceMarker => this.markersViewModel.remove(resourceMarker.resource))));
        // Markers Filters
        disposables.push(this.filters.onDidChange((event) => {
            if (event.activeFile) {
                this.refreshPanel();
            }
            else if (event.excludedFiles || event.showWarnings || event.showErrors || event.showInfos) {
                this.updateFilter();
            }
        }));
        disposables.push(this.filterWidget.onDidChangeFilterText(e => this.updateFilter()));
        disposables.push(toDisposable(() => { this.cachedFilterStats = undefined; }));
        disposables.push(toDisposable(() => this.rangeHighlightDecorations.removeHighlightRange()));
        return disposables;
    }
    onDidChangeModel(change) {
        const resourceMarkers = [...change.added, ...change.removed, ...change.updated];
        const resources = [];
        for (const { resource } of resourceMarkers) {
            this.markersViewModel.remove(resource);
            const resourceMarkers = this.markersModel.getResourceMarkers(resource);
            if (resourceMarkers) {
                for (const marker of resourceMarkers.markers) {
                    this.markersViewModel.add(marker);
                }
            }
            resources.push(resource);
        }
        this.currentResourceGotAddedToMarkersData = this.currentResourceGotAddedToMarkersData || this.isCurrentResourceGotAddedToMarkersData(resources);
        this.refreshPanel(change);
        this.updateRangeHighlights();
        if (this.currentResourceGotAddedToMarkersData) {
            this.autoReveal();
            this.currentResourceGotAddedToMarkersData = false;
        }
    }
    onDidChangeViewMode() {
        if (this.widgetContainer && this.widget) {
            this.widgetContainer.textContent = '';
            this.widgetDisposables.clear();
        }
        // Save selection
        const selection = new Set();
        for (const marker of this.widget.getSelection()) {
            if (marker instanceof ResourceMarkers) {
                marker.markers.forEach(m => selection.add(m));
            }
            else if (marker instanceof Marker || marker instanceof MarkerTableItem) {
                selection.add(marker);
            }
        }
        // Save focus
        const focus = new Set();
        for (const marker of this.widget.getFocus()) {
            if (marker instanceof Marker || marker instanceof MarkerTableItem) {
                focus.add(marker);
            }
        }
        // Create new widget
        this.createWidget(this.widgetContainer);
        this.refreshPanel();
        // Restore selection
        if (selection.size > 0) {
            this.widget.setMarkerSelection(Array.from(selection), Array.from(focus));
            this.widget.domFocus();
        }
    }
    isCurrentResourceGotAddedToMarkersData(changedResources) {
        const currentlyActiveResource = this.currentActiveResource;
        if (!currentlyActiveResource) {
            return false;
        }
        const resourceForCurrentActiveResource = this.getResourceForCurrentActiveResource();
        if (resourceForCurrentActiveResource) {
            return false;
        }
        return changedResources.some(r => r.toString() === currentlyActiveResource.toString());
    }
    onActiveEditorChanged() {
        this.setCurrentActiveEditor();
        if (this.filters.activeFile) {
            this.refreshPanel();
        }
        this.autoReveal();
    }
    setCurrentActiveEditor() {
        const activeEditor = this.editorService.activeEditor;
        this.currentActiveResource = activeEditor ? EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY }) ?? null : null;
    }
    onSelected() {
        const selection = this.widget.getSelection();
        if (selection && selection.length > 0) {
            this.lastSelectedRelativeTop = this.widget.getRelativeTop(selection[0]) || 0;
        }
    }
    hasNoProblems() {
        const { total, filtered } = this.getFilterStats();
        return total === 0 || filtered === 0;
    }
    renderContent() {
        this.cachedFilterStats = undefined;
        this.resetWidget();
        this.toggleVisibility(this.hasNoProblems());
        this.renderMessage();
    }
    renderMessage() {
        if (!this.messageBoxContainer || !this.ariaLabelElement) {
            return;
        }
        dom.clearNode(this.messageBoxContainer);
        const { total, filtered } = this.getFilterStats();
        if (filtered === 0) {
            this.messageBoxContainer.style.display = 'block';
            this.messageBoxContainer.setAttribute('tabIndex', '0');
            if (this.filters.activeFile) {
                this.renderFilterMessageForActiveFile(this.messageBoxContainer);
            }
            else {
                if (total > 0) {
                    this.renderFilteredByFilterMessage(this.messageBoxContainer);
                }
                else {
                    this.renderNoProblemsMessage(this.messageBoxContainer);
                }
            }
        }
        else {
            this.messageBoxContainer.style.display = 'none';
            if (filtered === total) {
                this.setAriaLabel(localize('No problems filtered', "Showing {0} problems", total));
            }
            else {
                this.setAriaLabel(localize('problems filtered', "Showing {0} of {1} problems", filtered, total));
            }
            this.messageBoxContainer.removeAttribute('tabIndex');
        }
    }
    renderFilterMessageForActiveFile(container) {
        if (this.currentActiveResource && this.markersModel.getResourceMarkers(this.currentActiveResource)) {
            this.renderFilteredByFilterMessage(container);
        }
        else {
            this.renderNoProblemsMessageForActiveFile(container);
        }
    }
    renderFilteredByFilterMessage(container) {
        const span1 = dom.append(container, dom.$('span'));
        span1.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_FILTERS;
        const link = dom.append(container, dom.$('a.messageAction'));
        link.textContent = localize('clearFilter', "Clear Filters");
        link.setAttribute('tabIndex', '0');
        const span2 = dom.append(container, dom.$('span'));
        span2.textContent = '.';
        dom.addStandardDisposableListener(link, dom.EventType.CLICK, () => this.clearFilters());
        dom.addStandardDisposableListener(link, dom.EventType.KEY_DOWN, (e) => {
            if (e.equals(3 /* KeyCode.Enter */) || e.equals(10 /* KeyCode.Space */)) {
                this.clearFilters();
                e.stopPropagation();
            }
        });
        this.setAriaLabel(Messages.MARKERS_PANEL_NO_PROBLEMS_FILTERS);
    }
    renderNoProblemsMessageForActiveFile(container) {
        const span = dom.append(container, dom.$('span'));
        span.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT;
        this.setAriaLabel(Messages.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT);
    }
    renderNoProblemsMessage(container) {
        const span = dom.append(container, dom.$('span'));
        span.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_BUILT;
        this.setAriaLabel(Messages.MARKERS_PANEL_NO_PROBLEMS_BUILT);
    }
    setAriaLabel(label) {
        this.widget.setAriaLabel(label);
        this.ariaLabelElement.setAttribute('aria-label', label);
    }
    clearFilters() {
        this.filterWidget.setFilterText('');
        this.filters.excludedFiles = false;
        this.filters.showErrors = true;
        this.filters.showWarnings = true;
        this.filters.showInfos = true;
    }
    autoReveal(focus = false) {
        // No need to auto reveal if active file filter is on
        if (this.filters.activeFile) {
            return;
        }
        const autoReveal = this.configurationService.getValue('problems.autoReveal');
        if (typeof autoReveal === 'boolean' && autoReveal) {
            const currentActiveResource = this.getResourceForCurrentActiveResource();
            this.widget.revealMarkers(currentActiveResource, focus, this.lastSelectedRelativeTop);
        }
    }
    getResourceForCurrentActiveResource() {
        return this.currentActiveResource ? this.markersModel.getResourceMarkers(this.currentActiveResource) : null;
    }
    updateRangeHighlights() {
        this.rangeHighlightDecorations.removeHighlightRange();
        if (dom.isActiveElement(this.widget.getHTMLElement())) {
            this.highlightCurrentSelectedMarkerRange();
        }
    }
    highlightCurrentSelectedMarkerRange() {
        const selections = this.widget.getSelection() ?? [];
        if (selections.length !== 1) {
            return;
        }
        const selection = selections[0];
        if (!(selection instanceof Marker)) {
            return;
        }
        this.rangeHighlightDecorations.highlightRange(selection);
    }
    onContextMenu(e) {
        const element = e.element;
        if (!element) {
            return;
        }
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            menuId: MenuId.ProblemsPanelContext,
            contextKeyService: this.widget.contextKeyService,
            getActions: () => this.getMenuActions(element),
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, { label: true, keybinding: keybinding.getLabel() });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.widget.domFocus();
                }
            }
        });
    }
    getMenuActions(element) {
        const result = [];
        if (element instanceof Marker) {
            const viewModel = this.markersViewModel.getViewModel(element);
            if (viewModel) {
                const quickFixActions = viewModel.quickFixAction.quickFixes;
                if (quickFixActions.length) {
                    result.push(...quickFixActions);
                    result.push(new Separator());
                }
            }
        }
        return result;
    }
    getFocusElement() {
        return this.widget.getFocus()[0] ?? undefined;
    }
    getFocusedSelectedElements() {
        const focus = this.getFocusElement();
        if (!focus) {
            return null;
        }
        const selection = this.widget.getSelection();
        if (selection.includes(focus)) {
            const result = [];
            for (const selected of selection) {
                if (selected) {
                    result.push(selected);
                }
            }
            return result;
        }
        else {
            return [focus];
        }
    }
    getAllResourceMarkers() {
        return this.markersModel.resourceMarkers;
    }
    getFilterStats() {
        if (!this.cachedFilterStats) {
            this.cachedFilterStats = {
                total: this.markersModel.total,
                filtered: this.widget?.getVisibleItemCount() ?? 0
            };
        }
        return this.cachedFilterStats;
    }
    toggleVisibility(hide) {
        this.widget.toggleVisibility(hide);
        this.layoutBodyContent();
    }
    saveState() {
        this.panelState['filter'] = this.filterWidget.getFilterText();
        this.panelState['filterHistory'] = this.filters.filterHistory;
        this.panelState['showErrors'] = this.filters.showErrors;
        this.panelState['showWarnings'] = this.filters.showWarnings;
        this.panelState['showInfos'] = this.filters.showInfos;
        this.panelState['useFilesExclude'] = this.filters.excludedFiles;
        this.panelState['activeFile'] = this.filters.activeFile;
        this.panelState['multiline'] = this.markersViewModel.multiline;
        this.panelState['viewMode'] = this.markersViewModel.viewMode;
        this.memento.saveMemento();
        super.saveState();
    }
    dispose() {
        super.dispose();
    }
};
MarkersView = __decorate([
    __param(1, IInstantiationService),
    __param(2, IViewDescriptorService),
    __param(3, IEditorService),
    __param(4, IConfigurationService),
    __param(5, IMarkerService),
    __param(6, IContextKeyService),
    __param(7, IWorkspaceContextService),
    __param(8, IContextMenuService),
    __param(9, IUriIdentityService),
    __param(10, IKeybindingService),
    __param(11, IStorageService),
    __param(12, IOpenerService),
    __param(13, IThemeService),
    __param(14, IHoverService)
], MarkersView);
export { MarkersView };
let MarkersTree = class MarkersTree extends WorkbenchObjectTree {
    constructor(user, container, delegate, renderers, options, instantiationService, contextKeyService, listService, themeService, configurationService) {
        super(user, container, delegate, renderers, options, instantiationService, contextKeyService, listService, configurationService);
        this.container = container;
        this.visibilityContextKey = MarkersContextKeys.MarkersTreeVisibilityContextKey.bindTo(contextKeyService);
    }
    collapseMarkers() {
        this.collapseAll();
        this.setSelection([]);
        this.setFocus([]);
        this.getHTMLElement().focus();
        this.focusFirst();
    }
    filterMarkers() {
        this.refilter();
    }
    getVisibleItemCount() {
        let filtered = 0;
        const root = this.getNode();
        for (const resourceMarkerNode of root.children) {
            for (const markerNode of resourceMarkerNode.children) {
                if (resourceMarkerNode.visible && markerNode.visible) {
                    filtered++;
                }
            }
        }
        return filtered;
    }
    isVisible() {
        return !this.container.classList.contains('hidden');
    }
    toggleVisibility(hide) {
        this.visibilityContextKey.set(!hide);
        this.container.classList.toggle('hidden', hide);
    }
    reset(resourceMarkers) {
        this.setChildren(null, Iterable.map(resourceMarkers, m => ({ element: m, children: createResourceMarkersIterator(m) })));
    }
    revealMarkers(activeResource, focus, lastSelectedRelativeTop) {
        if (activeResource) {
            if (this.hasElement(activeResource)) {
                if (!this.isCollapsed(activeResource) && this.hasSelectedMarkerFor(activeResource)) {
                    this.reveal(this.getSelection()[0], lastSelectedRelativeTop);
                    if (focus) {
                        this.setFocus(this.getSelection());
                    }
                }
                else {
                    this.expand(activeResource);
                    this.reveal(activeResource, 0);
                    if (focus) {
                        this.setFocus([activeResource]);
                        this.setSelection([activeResource]);
                    }
                }
            }
        }
        else if (focus) {
            this.setSelection([]);
            this.focusFirst();
        }
    }
    setAriaLabel(label) {
        this.ariaLabel = label;
    }
    setMarkerSelection(selection, focus) {
        if (this.isVisible()) {
            if (selection && selection.length > 0) {
                this.setSelection(selection.map(m => this.findMarkerNode(m)));
                if (focus && focus.length > 0) {
                    this.setFocus(focus.map(f => this.findMarkerNode(f)));
                }
                else {
                    this.setFocus([this.findMarkerNode(selection[0])]);
                }
                this.reveal(this.findMarkerNode(selection[0]));
            }
            else if (this.getSelection().length === 0) {
                const firstVisibleElement = this.firstVisibleElement;
                const marker = firstVisibleElement ?
                    firstVisibleElement instanceof ResourceMarkers ? firstVisibleElement.markers[0] :
                        firstVisibleElement instanceof Marker ? firstVisibleElement : undefined
                    : undefined;
                if (marker) {
                    this.setSelection([marker]);
                    this.setFocus([marker]);
                    this.reveal(marker);
                }
            }
        }
    }
    update(resourceMarkers) {
        for (const resourceMarker of resourceMarkers) {
            if (this.hasElement(resourceMarker)) {
                this.setChildren(resourceMarker, createResourceMarkersIterator(resourceMarker));
                this.rerender(resourceMarker);
            }
        }
    }
    updateMarker(marker) {
        this.rerender(marker);
    }
    findMarkerNode(marker) {
        for (const resourceNode of this.getNode().children) {
            for (const markerNode of resourceNode.children) {
                if (markerNode.element instanceof Marker && markerNode.element.marker === marker.marker) {
                    return markerNode.element;
                }
            }
        }
        return null;
    }
    hasSelectedMarkerFor(resource) {
        const selectedElement = this.getSelection();
        if (selectedElement && selectedElement.length > 0) {
            if (selectedElement[0] instanceof Marker) {
                if (resource.has(selectedElement[0].marker.resource)) {
                    return true;
                }
            }
        }
        return false;
    }
    dispose() {
        super.dispose();
    }
    layout(height, width) {
        this.container.style.height = `${height}px`;
        super.layout(height, width);
    }
};
MarkersTree = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextKeyService),
    __param(7, IListService),
    __param(8, IThemeService),
    __param(9, IConfigurationService)
], MarkersTree);
let MarkersListDnDHandler = class MarkersListDnDHandler extends ResourceListDnDHandler {
    constructor(instantiationService) {
        super(element => {
            if (element instanceof MarkerTableItem) {
                return withSelection(element.resource, element.range);
            }
            else if (element instanceof ResourceMarkers) {
                return element.resource;
            }
            else if (element instanceof Marker) {
                return withSelection(element.resource, element.range);
            }
            else if (element instanceof RelatedInformation) {
                return withSelection(element.raw.resource, element.raw);
            }
            return null;
        }, instantiationService);
    }
    onWillDragElements(elements, originalEvent) {
        const data = elements.map((e) => {
            if (e instanceof RelatedInformation || e instanceof Marker) {
                return e.marker;
            }
            if (e instanceof ResourceMarkers) {
                return { uri: e.resource };
            }
            return undefined;
        }).filter(isDefined);
        if (!data.length) {
            return;
        }
        fillInMarkersDragData(data, originalEvent);
    }
};
MarkersListDnDHandler = __decorate([
    __param(0, IInstantiationService)
], MarkersListDnDHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9icm93c2VyL21hcmtlcnNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8scUJBQXFCLENBQUM7QUFFN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBSTFGLE9BQU8sRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUc3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBZSxrQkFBa0IsRUFB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
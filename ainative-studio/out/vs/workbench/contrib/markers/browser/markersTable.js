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
var MarkerSeverityColumnRenderer_1, MarkerCodeColumnRenderer_1, MarkerFileColumnRenderer_1;
import { localize } from '../../../../nls.js';
import * as DOM from '../../../../base/browser/dom.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { compareMarkersByUri, Marker, MarkerTableItem } from './markersModel.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { FilterOptions } from './markersFilterOptions.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { QuickFixAction, QuickFixActionViewItem } from './markersViewActions.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import Messages from './messages.js';
import { isUndefinedOrNull } from '../../../../base/common/types.js';
import { Range } from '../../../../editor/common/core/range.js';
import { unsupportedSchemas } from '../../../../platform/markers/common/markerService.js';
import Severity from '../../../../base/common/severity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = DOM.$;
let MarkerSeverityColumnRenderer = class MarkerSeverityColumnRenderer {
    static { MarkerSeverityColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'severity'; }
    constructor(markersViewModel, instantiationService) {
        this.markersViewModel = markersViewModel;
        this.instantiationService = instantiationService;
        this.templateId = MarkerSeverityColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const severityColumn = DOM.append(container, $('.severity'));
        const icon = DOM.append(severityColumn, $(''));
        const actionBarColumn = DOM.append(container, $('.actions'));
        const actionBar = new ActionBar(actionBarColumn, {
            actionViewItemProvider: (action, options) => action.id === QuickFixAction.ID ? this.instantiationService.createInstance(QuickFixActionViewItem, action, options) : undefined
        });
        return { actionBar, icon };
    }
    renderElement(element, index, templateData, height) {
        const toggleQuickFix = (enabled) => {
            if (!isUndefinedOrNull(enabled)) {
                const container = DOM.findParentWithClass(templateData.icon, 'monaco-table-td');
                container.classList.toggle('quickFix', enabled);
            }
        };
        templateData.icon.title = MarkerSeverity.toString(element.marker.severity);
        templateData.icon.className = `marker-icon ${Severity.toString(MarkerSeverity.toSeverity(element.marker.severity))} codicon ${SeverityIcon.className(MarkerSeverity.toSeverity(element.marker.severity))}`;
        templateData.actionBar.clear();
        const viewModel = this.markersViewModel.getViewModel(element);
        if (viewModel) {
            const quickFixAction = viewModel.quickFixAction;
            templateData.actionBar.push([quickFixAction], { icon: true, label: false });
            toggleQuickFix(viewModel.quickFixAction.enabled);
            quickFixAction.onDidChange(({ enabled }) => toggleQuickFix(enabled));
            quickFixAction.onShowQuickFixes(() => {
                const quickFixActionViewItem = templateData.actionBar.viewItems[0];
                if (quickFixActionViewItem) {
                    quickFixActionViewItem.showQuickFixes();
                }
            });
        }
    }
    disposeTemplate(templateData) { }
};
MarkerSeverityColumnRenderer = MarkerSeverityColumnRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], MarkerSeverityColumnRenderer);
let MarkerCodeColumnRenderer = class MarkerCodeColumnRenderer {
    static { MarkerCodeColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'code'; }
    constructor(hoverService, openerService) {
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.templateId = MarkerCodeColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposable = new DisposableStore();
        const codeColumn = DOM.append(container, $('.code'));
        const sourceLabel = templateDisposable.add(new HighlightedLabel(codeColumn));
        sourceLabel.element.classList.add('source-label');
        const codeLabel = templateDisposable.add(new HighlightedLabel(codeColumn));
        codeLabel.element.classList.add('code-label');
        const codeLink = templateDisposable.add(new Link(codeColumn, { href: '', label: '' }, {}, this.hoverService, this.openerService));
        return { codeColumn, sourceLabel, codeLabel, codeLink, templateDisposable };
    }
    renderElement(element, index, templateData, height) {
        templateData.codeColumn.classList.remove('code-label');
        templateData.codeColumn.classList.remove('code-link');
        if (element.marker.source && element.marker.code) {
            if (typeof element.marker.code === 'string') {
                templateData.codeColumn.classList.add('code-label');
                templateData.codeColumn.title = `${element.marker.source} (${element.marker.code})`;
                templateData.sourceLabel.set(element.marker.source, element.sourceMatches);
                templateData.codeLabel.set(element.marker.code, element.codeMatches);
            }
            else {
                templateData.codeColumn.classList.add('code-link');
                templateData.codeColumn.title = `${element.marker.source} (${element.marker.code.value})`;
                templateData.sourceLabel.set(element.marker.source, element.sourceMatches);
                const codeLinkLabel = templateData.templateDisposable.add(new HighlightedLabel($('.code-link-label')));
                codeLinkLabel.set(element.marker.code.value, element.codeMatches);
                templateData.codeLink.link = {
                    href: element.marker.code.target.toString(true),
                    title: element.marker.code.target.toString(true),
                    label: codeLinkLabel.element,
                };
            }
        }
        else {
            templateData.codeColumn.title = '';
            templateData.sourceLabel.set('-');
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
};
MarkerCodeColumnRenderer = MarkerCodeColumnRenderer_1 = __decorate([
    __param(0, IHoverService),
    __param(1, IOpenerService)
], MarkerCodeColumnRenderer);
class MarkerMessageColumnRenderer {
    constructor() {
        this.templateId = MarkerMessageColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'message'; }
    renderTemplate(container) {
        const columnElement = DOM.append(container, $('.message'));
        const highlightedLabel = new HighlightedLabel(columnElement);
        return { columnElement, highlightedLabel };
    }
    renderElement(element, index, templateData, height) {
        templateData.columnElement.title = element.marker.message;
        templateData.highlightedLabel.set(element.marker.message, element.messageMatches);
    }
    disposeTemplate(templateData) {
        templateData.highlightedLabel.dispose();
    }
}
let MarkerFileColumnRenderer = class MarkerFileColumnRenderer {
    static { MarkerFileColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'file'; }
    constructor(labelService) {
        this.labelService = labelService;
        this.templateId = MarkerFileColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const columnElement = DOM.append(container, $('.file'));
        const fileLabel = new HighlightedLabel(columnElement);
        fileLabel.element.classList.add('file-label');
        const positionLabel = new HighlightedLabel(columnElement);
        positionLabel.element.classList.add('file-position');
        return { columnElement, fileLabel, positionLabel };
    }
    renderElement(element, index, templateData, height) {
        const positionLabel = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(element.marker.startLineNumber, element.marker.startColumn);
        templateData.columnElement.title = `${this.labelService.getUriLabel(element.marker.resource, { relative: false })} ${positionLabel}`;
        templateData.fileLabel.set(this.labelService.getUriLabel(element.marker.resource, { relative: true }), element.fileMatches);
        templateData.positionLabel.set(positionLabel, undefined);
    }
    disposeTemplate(templateData) {
        templateData.fileLabel.dispose();
        templateData.positionLabel.dispose();
    }
};
MarkerFileColumnRenderer = MarkerFileColumnRenderer_1 = __decorate([
    __param(0, ILabelService)
], MarkerFileColumnRenderer);
class MarkerSourceColumnRenderer {
    constructor() {
        this.templateId = MarkerSourceColumnRenderer.TEMPLATE_ID;
    }
    static { this.TEMPLATE_ID = 'source'; }
    renderTemplate(container) {
        const columnElement = DOM.append(container, $('.source'));
        const highlightedLabel = new HighlightedLabel(columnElement);
        return { columnElement, highlightedLabel };
    }
    renderElement(element, index, templateData, height) {
        templateData.columnElement.title = element.marker.source ?? '';
        templateData.highlightedLabel.set(element.marker.source ?? '', element.sourceMatches);
    }
    disposeTemplate(templateData) {
        templateData.highlightedLabel.dispose();
    }
}
class MarkersTableVirtualDelegate {
    constructor() {
        this.headerRowHeight = MarkersTableVirtualDelegate.HEADER_ROW_HEIGHT;
    }
    static { this.HEADER_ROW_HEIGHT = 24; }
    static { this.ROW_HEIGHT = 24; }
    getHeight(item) {
        return MarkersTableVirtualDelegate.ROW_HEIGHT;
    }
}
let MarkersTable = class MarkersTable extends Disposable {
    constructor(container, markersViewModel, resourceMarkers, filterOptions, options, instantiationService, labelService) {
        super();
        this.container = container;
        this.markersViewModel = markersViewModel;
        this.resourceMarkers = resourceMarkers;
        this.filterOptions = filterOptions;
        this.instantiationService = instantiationService;
        this.labelService = labelService;
        this._itemCount = 0;
        this.table = this.instantiationService.createInstance(WorkbenchTable, 'Markers', this.container, new MarkersTableVirtualDelegate(), [
            {
                label: '',
                tooltip: '',
                weight: 0,
                minimumWidth: 36,
                maximumWidth: 36,
                templateId: MarkerSeverityColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('codeColumnLabel', "Code"),
                tooltip: '',
                weight: 1,
                minimumWidth: 100,
                maximumWidth: 300,
                templateId: MarkerCodeColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('messageColumnLabel', "Message"),
                tooltip: '',
                weight: 4,
                templateId: MarkerMessageColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('fileColumnLabel', "File"),
                tooltip: '',
                weight: 2,
                templateId: MarkerFileColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('sourceColumnLabel', "Source"),
                tooltip: '',
                weight: 1,
                minimumWidth: 100,
                maximumWidth: 300,
                templateId: MarkerSourceColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            }
        ], [
            this.instantiationService.createInstance(MarkerSeverityColumnRenderer, this.markersViewModel),
            this.instantiationService.createInstance(MarkerCodeColumnRenderer),
            this.instantiationService.createInstance(MarkerMessageColumnRenderer),
            this.instantiationService.createInstance(MarkerFileColumnRenderer),
            this.instantiationService.createInstance(MarkerSourceColumnRenderer),
        ], options);
        const list = this.table.domNode.querySelector('.monaco-list-rows');
        // mouseover/mouseleave event handlers
        const onRowHover = Event.chain(this._register(new DomEmitter(list, 'mouseover')).event, $ => $.map(e => DOM.findParentWithClass(e.target, 'monaco-list-row', 'monaco-list-rows'))
            .filter(((e) => !!e))
            .map(e => parseInt(e.getAttribute('data-index'))));
        const onListLeave = Event.map(this._register(new DomEmitter(list, 'mouseleave')).event, () => -1);
        const onRowHoverOrLeave = Event.latch(Event.any(onRowHover, onListLeave));
        const onRowPermanentHover = Event.debounce(onRowHoverOrLeave, (_, e) => e, 500);
        this._register(onRowPermanentHover(e => {
            if (e !== -1 && this.table.row(e)) {
                this.markersViewModel.onMarkerMouseHover(this.table.row(e));
            }
        }));
    }
    get contextKeyService() {
        return this.table.contextKeyService;
    }
    get onContextMenu() {
        return this.table.onContextMenu;
    }
    get onDidOpen() {
        return this.table.onDidOpen;
    }
    get onDidChangeFocus() {
        return this.table.onDidChangeFocus;
    }
    get onDidChangeSelection() {
        return this.table.onDidChangeSelection;
    }
    collapseMarkers() { }
    domFocus() {
        this.table.domFocus();
    }
    filterMarkers(resourceMarkers, filterOptions) {
        this.filterOptions = filterOptions;
        this.reset(resourceMarkers);
    }
    getFocus() {
        const focus = this.table.getFocus();
        return focus.length > 0 ? [...focus.map(f => this.table.row(f))] : [];
    }
    getHTMLElement() {
        return this.table.getHTMLElement();
    }
    getRelativeTop(marker) {
        return marker ? this.table.getRelativeTop(this.table.indexOf(marker)) : null;
    }
    getSelection() {
        const selection = this.table.getSelection();
        return selection.length > 0 ? [...selection.map(i => this.table.row(i))] : [];
    }
    getVisibleItemCount() {
        return this._itemCount;
    }
    isVisible() {
        return !this.container.classList.contains('hidden');
    }
    layout(height, width) {
        this.container.style.height = `${height}px`;
        this.table.layout(height, width);
    }
    reset(resourceMarkers) {
        this.resourceMarkers = resourceMarkers;
        const items = [];
        for (const resourceMarker of this.resourceMarkers) {
            for (const marker of resourceMarker.markers) {
                if (unsupportedSchemas.has(marker.resource.scheme)) {
                    continue;
                }
                // Exclude pattern
                if (this.filterOptions.excludesMatcher.matches(marker.resource)) {
                    continue;
                }
                // Include pattern
                if (this.filterOptions.includesMatcher.matches(marker.resource)) {
                    items.push(new MarkerTableItem(marker));
                    continue;
                }
                // Severity filter
                const matchesSeverity = this.filterOptions.showErrors && MarkerSeverity.Error === marker.marker.severity ||
                    this.filterOptions.showWarnings && MarkerSeverity.Warning === marker.marker.severity ||
                    this.filterOptions.showInfos && MarkerSeverity.Info === marker.marker.severity;
                if (!matchesSeverity) {
                    continue;
                }
                // Text filter
                if (this.filterOptions.textFilter.text) {
                    const sourceMatches = marker.marker.source ? FilterOptions._filter(this.filterOptions.textFilter.text, marker.marker.source) ?? undefined : undefined;
                    const codeMatches = marker.marker.code ? FilterOptions._filter(this.filterOptions.textFilter.text, typeof marker.marker.code === 'string' ? marker.marker.code : marker.marker.code.value) ?? undefined : undefined;
                    const messageMatches = FilterOptions._messageFilter(this.filterOptions.textFilter.text, marker.marker.message) ?? undefined;
                    const fileMatches = FilterOptions._messageFilter(this.filterOptions.textFilter.text, this.labelService.getUriLabel(marker.resource, { relative: true })) ?? undefined;
                    const matched = sourceMatches || codeMatches || messageMatches || fileMatches;
                    if ((matched && !this.filterOptions.textFilter.negate) || (!matched && this.filterOptions.textFilter.negate)) {
                        items.push(new MarkerTableItem(marker, sourceMatches, codeMatches, messageMatches, fileMatches));
                    }
                    continue;
                }
                items.push(new MarkerTableItem(marker));
            }
        }
        this._itemCount = items.length;
        this.table.splice(0, Number.POSITIVE_INFINITY, items.sort((a, b) => {
            let result = MarkerSeverity.compare(a.marker.severity, b.marker.severity);
            if (result === 0) {
                result = compareMarkersByUri(a.marker, b.marker);
            }
            if (result === 0) {
                result = Range.compareRangesUsingStarts(a.marker, b.marker);
            }
            return result;
        }));
    }
    revealMarkers(activeResource, focus, lastSelectedRelativeTop) {
        if (activeResource) {
            const activeResourceIndex = this.resourceMarkers.indexOf(activeResource);
            if (activeResourceIndex !== -1) {
                if (this.hasSelectedMarkerFor(activeResource)) {
                    const tableSelection = this.table.getSelection();
                    this.table.reveal(tableSelection[0], lastSelectedRelativeTop);
                    if (focus) {
                        this.table.setFocus(tableSelection);
                    }
                }
                else {
                    this.table.reveal(activeResourceIndex, 0);
                    if (focus) {
                        this.table.setFocus([activeResourceIndex]);
                        this.table.setSelection([activeResourceIndex]);
                    }
                }
            }
        }
        else if (focus) {
            this.table.setSelection([]);
            this.table.focusFirst();
        }
    }
    setAriaLabel(label) {
        this.table.domNode.ariaLabel = label;
    }
    setMarkerSelection(selection, focus) {
        if (this.isVisible()) {
            if (selection && selection.length > 0) {
                this.table.setSelection(selection.map(m => this.findMarkerIndex(m)));
                if (focus && focus.length > 0) {
                    this.table.setFocus(focus.map(f => this.findMarkerIndex(f)));
                }
                else {
                    this.table.setFocus([this.findMarkerIndex(selection[0])]);
                }
                this.table.reveal(this.findMarkerIndex(selection[0]));
            }
            else if (this.getSelection().length === 0 && this.getVisibleItemCount() > 0) {
                this.table.setSelection([0]);
                this.table.setFocus([0]);
                this.table.reveal(0);
            }
        }
    }
    toggleVisibility(hide) {
        this.container.classList.toggle('hidden', hide);
    }
    update(resourceMarkers) {
        for (const resourceMarker of resourceMarkers) {
            const index = this.resourceMarkers.indexOf(resourceMarker);
            this.resourceMarkers.splice(index, 1, resourceMarker);
        }
        this.reset(this.resourceMarkers);
    }
    updateMarker(marker) {
        this.table.rerender();
    }
    findMarkerIndex(marker) {
        for (let index = 0; index < this.table.length; index++) {
            if (this.table.row(index).marker === marker.marker) {
                return index;
            }
        }
        return -1;
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
};
MarkersTable = __decorate([
    __param(5, IInstantiationService),
    __param(6, ILabelService)
], MarkersTable);
export { MarkersTable };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1RhYmxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtlcnMvYnJvd3Nlci9tYXJrZXJzVGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBc0MsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDcEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQW1CLE1BQU0sbUJBQW1CLENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhD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
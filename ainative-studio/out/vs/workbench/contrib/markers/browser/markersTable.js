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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1RhYmxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9icm93c2VyL21hcmtlcnNUYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFzQyxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNwRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBbUIsTUFBTSxtQkFBbUIsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENB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
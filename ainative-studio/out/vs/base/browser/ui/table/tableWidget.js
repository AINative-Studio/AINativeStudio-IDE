/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, append, clearNode, getContentHeight, getContentWidth } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { List, unthemedListStyles } from '../list/listWidget.js';
import { SplitView } from '../splitview/splitview.js';
import { Emitter, Event } from '../../../common/event.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import './table.css';
class TableListRenderer {
    static { this.TemplateId = 'row'; }
    constructor(columns, renderers, getColumnSize) {
        this.columns = columns;
        this.getColumnSize = getColumnSize;
        this.templateId = TableListRenderer.TemplateId;
        this.renderedTemplates = new Set();
        const rendererMap = new Map(renderers.map(r => [r.templateId, r]));
        this.renderers = [];
        for (const column of columns) {
            const renderer = rendererMap.get(column.templateId);
            if (!renderer) {
                throw new Error(`Table cell renderer for template id ${column.templateId} not found.`);
            }
            this.renderers.push(renderer);
        }
    }
    renderTemplate(container) {
        const rowContainer = append(container, $('.monaco-table-tr'));
        const cellContainers = [];
        const cellTemplateData = [];
        for (let i = 0; i < this.columns.length; i++) {
            const renderer = this.renderers[i];
            const cellContainer = append(rowContainer, $('.monaco-table-td', { 'data-col-index': i }));
            cellContainer.style.width = `${this.getColumnSize(i)}px`;
            cellContainers.push(cellContainer);
            cellTemplateData.push(renderer.renderTemplate(cellContainer));
        }
        const result = { container, cellContainers, cellTemplateData };
        this.renderedTemplates.add(result);
        return result;
    }
    renderElement(element, index, templateData, height) {
        for (let i = 0; i < this.columns.length; i++) {
            const column = this.columns[i];
            const cell = column.project(element);
            const renderer = this.renderers[i];
            renderer.renderElement(cell, index, templateData.cellTemplateData[i], height);
        }
    }
    disposeElement(element, index, templateData, height) {
        for (let i = 0; i < this.columns.length; i++) {
            const renderer = this.renderers[i];
            if (renderer.disposeElement) {
                const column = this.columns[i];
                const cell = column.project(element);
                renderer.disposeElement(cell, index, templateData.cellTemplateData[i], height);
            }
        }
    }
    disposeTemplate(templateData) {
        for (let i = 0; i < this.columns.length; i++) {
            const renderer = this.renderers[i];
            renderer.disposeTemplate(templateData.cellTemplateData[i]);
        }
        clearNode(templateData.container);
        this.renderedTemplates.delete(templateData);
    }
    layoutColumn(index, size) {
        for (const { cellContainers } of this.renderedTemplates) {
            cellContainers[index].style.width = `${size}px`;
        }
    }
}
function asListVirtualDelegate(delegate) {
    return {
        getHeight(row) { return delegate.getHeight(row); },
        getTemplateId() { return TableListRenderer.TemplateId; },
    };
}
class ColumnHeader extends Disposable {
    get minimumSize() { return this.column.minimumWidth ?? 120; }
    get maximumSize() { return this.column.maximumWidth ?? Number.POSITIVE_INFINITY; }
    get onDidChange() { return this.column.onDidChangeWidthConstraints ?? Event.None; }
    constructor(column, index) {
        super();
        this.column = column;
        this.index = index;
        this._onDidLayout = new Emitter();
        this.onDidLayout = this._onDidLayout.event;
        this.element = $('.monaco-table-th', { 'data-col-index': index }, column.label);
        if (column.tooltip) {
            this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, column.tooltip));
        }
    }
    layout(size) {
        this._onDidLayout.fire([this.index, size]);
    }
}
export class Table {
    static { this.InstanceCount = 0; }
    get onDidChangeFocus() { return this.list.onDidChangeFocus; }
    get onDidChangeSelection() { return this.list.onDidChangeSelection; }
    get onDidScroll() { return this.list.onDidScroll; }
    get onMouseClick() { return this.list.onMouseClick; }
    get onMouseDblClick() { return this.list.onMouseDblClick; }
    get onMouseMiddleClick() { return this.list.onMouseMiddleClick; }
    get onPointer() { return this.list.onPointer; }
    get onMouseUp() { return this.list.onMouseUp; }
    get onMouseDown() { return this.list.onMouseDown; }
    get onMouseOver() { return this.list.onMouseOver; }
    get onMouseMove() { return this.list.onMouseMove; }
    get onMouseOut() { return this.list.onMouseOut; }
    get onTouchStart() { return this.list.onTouchStart; }
    get onTap() { return this.list.onTap; }
    get onContextMenu() { return this.list.onContextMenu; }
    get onDidFocus() { return this.list.onDidFocus; }
    get onDidBlur() { return this.list.onDidBlur; }
    get scrollTop() { return this.list.scrollTop; }
    set scrollTop(scrollTop) { this.list.scrollTop = scrollTop; }
    get scrollLeft() { return this.list.scrollLeft; }
    set scrollLeft(scrollLeft) { this.list.scrollLeft = scrollLeft; }
    get scrollHeight() { return this.list.scrollHeight; }
    get renderHeight() { return this.list.renderHeight; }
    get onDidDispose() { return this.list.onDidDispose; }
    constructor(user, container, virtualDelegate, columns, renderers, _options) {
        this.virtualDelegate = virtualDelegate;
        this.columns = columns;
        this.domId = `table_id_${++Table.InstanceCount}`;
        this.disposables = new DisposableStore();
        this.cachedWidth = 0;
        this.cachedHeight = 0;
        this.domNode = append(container, $(`.monaco-table.${this.domId}`));
        const headers = columns.map((c, i) => this.disposables.add(new ColumnHeader(c, i)));
        const descriptor = {
            size: headers.reduce((a, b) => a + b.column.weight, 0),
            views: headers.map(view => ({ size: view.column.weight, view }))
        };
        this.splitview = this.disposables.add(new SplitView(this.domNode, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            scrollbarVisibility: 2 /* ScrollbarVisibility.Hidden */,
            getSashOrthogonalSize: () => this.cachedHeight,
            descriptor
        }));
        this.splitview.el.style.height = `${virtualDelegate.headerRowHeight}px`;
        this.splitview.el.style.lineHeight = `${virtualDelegate.headerRowHeight}px`;
        const renderer = new TableListRenderer(columns, renderers, i => this.splitview.getViewSize(i));
        this.list = this.disposables.add(new List(user, this.domNode, asListVirtualDelegate(virtualDelegate), [renderer], _options));
        Event.any(...headers.map(h => h.onDidLayout))(([index, size]) => renderer.layoutColumn(index, size), null, this.disposables);
        this.splitview.onDidSashReset(index => {
            const totalWeight = columns.reduce((r, c) => r + c.weight, 0);
            const size = columns[index].weight / totalWeight * this.cachedWidth;
            this.splitview.resizeView(index, size);
        }, null, this.disposables);
        this.styleElement = createStyleSheet(this.domNode);
        this.style(unthemedListStyles);
    }
    getColumnLabels() {
        return this.columns.map(c => c.label);
    }
    resizeColumn(index, percentage) {
        const size = Math.round((percentage / 100.00) * this.cachedWidth);
        this.splitview.resizeView(index, size);
    }
    updateOptions(options) {
        this.list.updateOptions(options);
    }
    splice(start, deleteCount, elements = []) {
        this.list.splice(start, deleteCount, elements);
    }
    rerender() {
        this.list.rerender();
    }
    row(index) {
        return this.list.element(index);
    }
    indexOf(element) {
        return this.list.indexOf(element);
    }
    get length() {
        return this.list.length;
    }
    getHTMLElement() {
        return this.domNode;
    }
    layout(height, width) {
        height = height ?? getContentHeight(this.domNode);
        width = width ?? getContentWidth(this.domNode);
        this.cachedWidth = width;
        this.cachedHeight = height;
        this.splitview.layout(width);
        const listHeight = height - this.virtualDelegate.headerRowHeight;
        this.list.getHTMLElement().style.height = `${listHeight}px`;
        this.list.layout(listHeight, width);
    }
    triggerTypeNavigation() {
        this.list.triggerTypeNavigation();
    }
    style(styles) {
        const content = [];
        content.push(`.monaco-table.${this.domId} > .monaco-split-view2 .monaco-sash.vertical::before {
			top: ${this.virtualDelegate.headerRowHeight + 1}px;
			height: calc(100% - ${this.virtualDelegate.headerRowHeight}px);
		}`);
        this.styleElement.textContent = content.join('\n');
        this.list.style(styles);
    }
    domFocus() {
        this.list.domFocus();
    }
    setAnchor(index) {
        this.list.setAnchor(index);
    }
    getAnchor() {
        return this.list.getAnchor();
    }
    getSelectedElements() {
        return this.list.getSelectedElements();
    }
    setSelection(indexes, browserEvent) {
        this.list.setSelection(indexes, browserEvent);
    }
    getSelection() {
        return this.list.getSelection();
    }
    setFocus(indexes, browserEvent) {
        this.list.setFocus(indexes, browserEvent);
    }
    focusNext(n = 1, loop = false, browserEvent) {
        this.list.focusNext(n, loop, browserEvent);
    }
    focusPrevious(n = 1, loop = false, browserEvent) {
        this.list.focusPrevious(n, loop, browserEvent);
    }
    focusNextPage(browserEvent) {
        return this.list.focusNextPage(browserEvent);
    }
    focusPreviousPage(browserEvent) {
        return this.list.focusPreviousPage(browserEvent);
    }
    focusFirst(browserEvent) {
        this.list.focusFirst(browserEvent);
    }
    focusLast(browserEvent) {
        this.list.focusLast(browserEvent);
    }
    getFocus() {
        return this.list.getFocus();
    }
    getFocusedElements() {
        return this.list.getFocusedElements();
    }
    getRelativeTop(index) {
        return this.list.getRelativeTop(index);
    }
    reveal(index, relativeTop) {
        this.list.reveal(index, relativeTop);
    }
    dispose() {
        this.disposables.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdGFibGUvdGFibGVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRSxPQUFPLEVBQWlELElBQUksRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hILE9BQU8sRUFBNEMsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBR3hGLE9BQU8sYUFBYSxDQUFDO0FBV3JCLE1BQU0saUJBQWlCO2FBRWYsZUFBVSxHQUFHLEtBQUssQUFBUixDQUFTO0lBSzFCLFlBQ1MsT0FBb0MsRUFDNUMsU0FBMkMsRUFDbkMsYUFBd0M7UUFGeEMsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFFcEMsa0JBQWEsR0FBYixhQUFhLENBQTJCO1FBUHhDLGVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLENBQUM7UUFFM0Msc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUM7UUFPdEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxH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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import * as domStylesheetsJs from '../../domStylesheets.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { commonPrefixLength } from '../../../common/arrays.js';
import { ThemeIcon } from '../../../common/themables.js';
import { Emitter } from '../../../common/event.js';
import { DisposableStore, dispose } from '../../../common/lifecycle.js';
import './breadcrumbsWidget.css';
export class BreadcrumbsItem {
}
export class BreadcrumbsWidget {
    constructor(container, horizontalScrollbarSize, separatorIcon, styles) {
        this._disposables = new DisposableStore();
        this._onDidSelectItem = new Emitter();
        this._onDidFocusItem = new Emitter();
        this._onDidChangeFocus = new Emitter();
        this.onDidSelectItem = this._onDidSelectItem.event;
        this.onDidFocusItem = this._onDidFocusItem.event;
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._items = new Array();
        this._nodes = new Array();
        this._freeNodes = new Array();
        this._enabled = true;
        this._focusedItemIdx = -1;
        this._selectedItemIdx = -1;
        this._domNode = document.createElement('div');
        this._domNode.className = 'monaco-breadcrumbs';
        this._domNode.tabIndex = 0;
        this._domNode.setAttribute('role', 'list');
        this._scrollable = new DomScrollableElement(this._domNode, {
            vertical: 2 /* ScrollbarVisibility.Hidden */,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            horizontalScrollbarSize,
            useShadows: false,
            scrollYToX: true
        });
        this._separatorIcon = separatorIcon;
        this._disposables.add(this._scrollable);
        this._disposables.add(dom.addStandardDisposableListener(this._domNode, 'click', e => this._onClick(e)));
        container.appendChild(this._scrollable.getDomNode());
        const styleElement = domStylesheetsJs.createStyleSheet(this._domNode);
        this._style(styleElement, styles);
        const focusTracker = dom.trackFocus(this._domNode);
        this._disposables.add(focusTracker);
        this._disposables.add(focusTracker.onDidBlur(_ => this._onDidChangeFocus.fire(false)));
        this._disposables.add(focusTracker.onDidFocus(_ => this._onDidChangeFocus.fire(true)));
    }
    setHorizontalScrollbarSize(size) {
        this._scrollable.updateOptions({
            horizontalScrollbarSize: size
        });
    }
    dispose() {
        this._disposables.dispose();
        this._pendingLayout?.dispose();
        this._pendingDimLayout?.dispose();
        this._onDidSelectItem.dispose();
        this._onDidFocusItem.dispose();
        this._onDidChangeFocus.dispose();
        this._domNode.remove();
        this._nodes.length = 0;
        this._freeNodes.length = 0;
    }
    layout(dim) {
        if (dim && dom.Dimension.equals(dim, this._dimension)) {
            return;
        }
        if (dim) {
            // only measure
            this._pendingDimLayout?.dispose();
            this._pendingDimLayout = this._updateDimensions(dim);
        }
        else {
            this._pendingLayout?.dispose();
            this._pendingLayout = this._updateScrollbar();
        }
    }
    _updateDimensions(dim) {
        const disposables = new DisposableStore();
        disposables.add(dom.modify(dom.getWindow(this._domNode), () => {
            this._dimension = dim;
            this._domNode.style.width = `${dim.width}px`;
            this._domNode.style.height = `${dim.height}px`;
            disposables.add(this._updateScrollbar());
        }));
        return disposables;
    }
    _updateScrollbar() {
        return dom.measure(dom.getWindow(this._domNode), () => {
            dom.measure(dom.getWindow(this._domNode), () => {
                this._scrollable.setRevealOnScroll(false);
                this._scrollable.scanDomNode();
                this._scrollable.setRevealOnScroll(true);
            });
        });
    }
    _style(styleElement, style) {
        let content = '';
        if (style.breadcrumbsBackground) {
            content += `.monaco-breadcrumbs { background-color: ${style.breadcrumbsBackground}}`;
        }
        if (style.breadcrumbsForeground) {
            content += `.monaco-breadcrumbs .monaco-breadcrumb-item { color: ${style.breadcrumbsForeground}}\n`;
        }
        if (style.breadcrumbsFocusForeground) {
            content += `.monaco-breadcrumbs .monaco-breadcrumb-item.focused { color: ${style.breadcrumbsFocusForeground}}\n`;
        }
        if (style.breadcrumbsFocusAndSelectionForeground) {
            content += `.monaco-breadcrumbs .monaco-breadcrumb-item.focused.selected { color: ${style.breadcrumbsFocusAndSelectionForeground}}\n`;
        }
        if (style.breadcrumbsHoverForeground) {
            content += `.monaco-breadcrumbs:not(.disabled	) .monaco-breadcrumb-item:hover:not(.focused):not(.selected) { color: ${style.breadcrumbsHoverForeground}}\n`;
        }
        styleElement.innerText = content;
    }
    setEnabled(value) {
        this._enabled = value;
        this._domNode.classList.toggle('disabled', !this._enabled);
    }
    domFocus() {
        const idx = this._focusedItemIdx >= 0 ? this._focusedItemIdx : this._items.length - 1;
        if (idx >= 0 && idx < this._items.length) {
            this._focus(idx, undefined);
        }
        else {
            this._domNode.focus();
        }
    }
    isDOMFocused() {
        return dom.isAncestorOfActiveElement(this._domNode);
    }
    getFocused() {
        return this._items[this._focusedItemIdx];
    }
    setFocused(item, payload) {
        this._focus(this._items.indexOf(item), payload);
    }
    focusPrev(payload) {
        if (this._focusedItemIdx > 0) {
            this._focus(this._focusedItemIdx - 1, payload);
        }
    }
    focusNext(payload) {
        if (this._focusedItemIdx + 1 < this._nodes.length) {
            this._focus(this._focusedItemIdx + 1, payload);
        }
    }
    _focus(nth, payload) {
        this._focusedItemIdx = -1;
        for (let i = 0; i < this._nodes.length; i++) {
            const node = this._nodes[i];
            if (i !== nth) {
                node.classList.remove('focused');
            }
            else {
                this._focusedItemIdx = i;
                node.classList.add('focused');
                node.focus();
            }
        }
        this._reveal(this._focusedItemIdx, true);
        this._onDidFocusItem.fire({ type: 'focus', item: this._items[this._focusedItemIdx], node: this._nodes[this._focusedItemIdx], payload });
    }
    reveal(item) {
        const idx = this._items.indexOf(item);
        if (idx >= 0) {
            this._reveal(idx, false);
        }
    }
    revealLast() {
        this._reveal(this._items.length - 1, false);
    }
    _reveal(nth, minimal) {
        if (nth < 0 || nth >= this._nodes.length) {
            return;
        }
        const node = this._nodes[nth];
        if (!node) {
            return;
        }
        const { width } = this._scrollable.getScrollDimensions();
        const { scrollLeft } = this._scrollable.getScrollPosition();
        if (!minimal || node.offsetLeft > scrollLeft + width || node.offsetLeft < scrollLeft) {
            this._scrollable.setRevealOnScroll(false);
            this._scrollable.setScrollPosition({ scrollLeft: node.offsetLeft });
            this._scrollable.setRevealOnScroll(true);
        }
    }
    getSelection() {
        return this._items[this._selectedItemIdx];
    }
    setSelection(item, payload) {
        this._select(this._items.indexOf(item), payload);
    }
    _select(nth, payload) {
        this._selectedItemIdx = -1;
        for (let i = 0; i < this._nodes.length; i++) {
            const node = this._nodes[i];
            if (i !== nth) {
                node.classList.remove('selected');
            }
            else {
                this._selectedItemIdx = i;
                node.classList.add('selected');
            }
        }
        this._onDidSelectItem.fire({ type: 'select', item: this._items[this._selectedItemIdx], node: this._nodes[this._selectedItemIdx], payload });
    }
    getItems() {
        return this._items;
    }
    setItems(items) {
        let prefix;
        let removed = [];
        try {
            prefix = commonPrefixLength(this._items, items, (a, b) => a.equals(b));
            removed = this._items.splice(prefix, this._items.length - prefix, ...items.slice(prefix));
            this._render(prefix);
            dispose(removed);
            dispose(items.slice(0, prefix));
            this._focus(-1, undefined);
        }
        catch (e) {
            const newError = new Error(`BreadcrumbsItem#setItems: newItems: ${items.length}, prefix: ${prefix}, removed: ${removed.length}`);
            newError.name = e.name;
            newError.stack = e.stack;
            throw newError;
        }
    }
    _render(start) {
        let didChange = false;
        for (; start < this._items.length && start < this._nodes.length; start++) {
            const item = this._items[start];
            const node = this._nodes[start];
            this._renderItem(item, node);
            didChange = true;
        }
        // case a: more nodes -> remove them
        while (start < this._nodes.length) {
            const free = this._nodes.pop();
            if (free) {
                this._freeNodes.push(free);
                free.remove();
                didChange = true;
            }
        }
        // case b: more items -> render them
        for (; start < this._items.length; start++) {
            const item = this._items[start];
            const node = this._freeNodes.length > 0 ? this._freeNodes.pop() : document.createElement('div');
            if (node) {
                this._renderItem(item, node);
                this._domNode.appendChild(node);
                this._nodes.push(node);
                didChange = true;
            }
        }
        if (didChange) {
            this.layout(undefined);
        }
    }
    _renderItem(item, container) {
        dom.clearNode(container);
        container.className = '';
        try {
            item.render(container);
        }
        catch (err) {
            container.innerText = '<<RENDER ERROR>>';
            console.error(err);
        }
        container.tabIndex = -1;
        container.setAttribute('role', 'listitem');
        container.classList.add('monaco-breadcrumb-item');
        const iconContainer = dom.$(ThemeIcon.asCSSSelector(this._separatorIcon));
        container.appendChild(iconContainer);
    }
    _onClick(event) {
        if (!this._enabled) {
            return;
        }
        for (let el = event.target; el; el = el.parentElement) {
            const idx = this._nodes.indexOf(el);
            if (idx >= 0) {
                this._focus(idx, event);
                this._select(idx, event);
                break;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvYnJlYWRjcnVtYnMvYnJlYWRjcnVtYnNXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUM7QUFDcEMsT0FBTyxLQUFLLGdCQUFnQixNQUFNLHlCQUF5QixDQUFDO0FBRTVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQztBQUVyRixPQUFPLHlCQUF5QixDQUFDO0FBRWpDLE1BQU0sT0FBZ0IsZUFBZTtDQUlwQztBQWlCRCxNQUFNLE9BQU8saUJBQWlCO0lBMkI3QixZQUNDLFNBQXNCLEVBQ3RCLHVCQUErQixFQUMvQixhQUF3QixFQUN4QixNQUFnQztRQTdCaEIsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBSXJDLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUF5QixDQUFDO1FBQ3hELG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXlCLENBQUM7UUFDdkQsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQVcsQ0FBQztRQUVuRCxvQkFBZSxHQUFpQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBQzVFLG1CQUFjLEdBQWlDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1FBQzFFLHFCQUFnQixHQUFtQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBRXhELFdBQU0sR0FBRyxJQUFJLEtBQUssRUFBbUIsQ0FBQztRQUN0QyxXQUFNLEdBQUcsSUFBSSxLQUFLLEVBQWtCLENBQUM7UUFDckMsZUFBVSxHQUFHLElBQUksS0FBSyxFQUFrQixDQUFDO1FBR2xELGFBQVEsR0FBWSxJQUFJLENBQUM7UUFDekIsb0JBQWUsR0FBVyxDQUFDLENBQUMsQ0FBQztRQUM3QixxQkFBZ0IsR0FBVyxDQUFDLENBQUMsQ0FBQztRQVlyQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLENBQUM7UUFDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUMxRCxRQUFRLG9DQUE0QjtZQUNwQyxVQUFVLGtDQUEwQjtZQUNwQyx1QkFBdUI7WUFDdkIsVUFBVSxFQUFFLEtBQUs7WUFDakIsVUFBVSxFQUFFLElBQUk7U0FDaEIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDcEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRXJELE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxJQUFZO1FBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDO1lBQzlCLHVCQUF1QixFQUFFLElBQUk7U0FDN0IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUE4QjtRQUNwQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDdkQsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsZUFBZTtZQUNmLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQUMsR0FBa0I7UUFDM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQzdELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQztZQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUM7WUFDL0MsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUU7WUFDckQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUU7Z0JBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxNQUFNLENBQUMsWUFBOEIsRUFBRSxLQUErQjtRQUM3RSxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksMkNBQTJDLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxDQUFDO1FBQ3RGLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSx3REFBd0QsS0FBSyxDQUFDLHFCQUFxQixLQUFLLENBQUM7UUFDckcsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLGdFQUFnRSxLQUFLLENBQUMsMEJBQTBCLEtBQUssQ0FBQztRQUNsSCxDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsc0NBQXNDLEVBQUUsQ0FBQztZQUNsRCxPQUFPLElBQUkseUVBQXlFLEtBQUssQ0FBQyxzQ0FBc0MsS0FBSyxDQUFDO1FBQ3ZJLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sSUFBSSwyR0FBMkcsS0FBSyxDQUFDLDBCQUEwQixLQUFLLENBQUM7UUFDN0osQ0FBQztRQUNELFlBQVksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBYztRQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxRQUFRO1FBQ1AsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUN0RixJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0IsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtRQUNYLE9BQU8sR0FBRyxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFpQyxFQUFFLE9BQWE7UUFDMUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsU0FBUyxDQUFDLE9BQWE7UUFDdEIsSUFBSSxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDaEQsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLENBQUMsT0FBYTtRQUN0QixJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxHQUFXLEVBQUUsT0FBWTtRQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUN6SSxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQXFCO1FBQzNCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVPLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBZ0I7UUFDNUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFDLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDekQsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUM1RCxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQ3RGLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUNwRSxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRUQsWUFBWSxDQUFDLElBQWlDLEVBQUUsT0FBYTtRQUM1RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFTyxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQVk7UUFDeEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUM3SSxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQXdCO1FBQ2hDLElBQUksTUFBMEIsQ0FBQztRQUMvQixJQUFJLE9BQU8sR0FBc0IsRUFBRSxDQUFDO1FBQ3BDLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMxRixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osTUFBTSxRQUFRLEdBQUcsSUFBSSxLQUFLLENBQUMsdUNBQXVDLEtBQUssQ0FBQyxNQUFNLGFBQWEsTUFBTSxjQUFjLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ2pJLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN2QixRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDekIsTUFBTSxRQUFRLENBQUM7UUFDaEIsQ0FBQztJQUNGLENBQUM7SUFFTyxPQUFPLENBQUMsS0FBYTtRQUM1QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdEIsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDMUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzdCLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDbEIsQ0FBQztRQUNELG9DQUFvQztRQUNwQyxPQUFPLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDL0IsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNkLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7UUFFRCxvQ0FBb0M7UUFDcEMsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoRyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM3QixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZCLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FBQyxJQUFxQixFQUFFLFNBQXlCO1FBQ25FLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekIsU0FBUyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLFNBQVMsQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLENBQUM7WUFDekMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixDQUFDO1FBQ0QsU0FBUyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4QixTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMzQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUMxRSxTQUFTLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFTyxRQUFRLENBQUMsS0FBa0I7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixPQUFPO1FBQ1IsQ0FBQztRQUNELEtBQUssSUFBSSxFQUFFLEdBQXVCLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDM0UsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBb0IsQ0FBQyxDQUFDO1lBQ3RELElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDekIsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=
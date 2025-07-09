/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './iconSelectBox.css';
import * as dom from '../../dom.js';
import { alert } from '../aria/aria.js';
import { InputBox } from '../inputbox/inputBox.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { Emitter } from '../../../common/event.js';
import { DisposableStore, Disposable, MutableDisposable } from '../../../common/lifecycle.js';
import { ThemeIcon } from '../../../common/themables.js';
import { localize } from '../../../../nls.js';
import { HighlightedLabel } from '../highlightedlabel/highlightedLabel.js';
export class IconSelectBox extends Disposable {
    static { this.InstanceCount = 0; }
    constructor(options) {
        super();
        this.options = options;
        this.domId = `icon_select_box_id_${++IconSelectBox.InstanceCount}`;
        this._onDidSelect = this._register(new Emitter());
        this.onDidSelect = this._onDidSelect.event;
        this.renderedIcons = [];
        this.focusedItemIndex = 0;
        this.numberOfElementsPerRow = 1;
        this.iconContainerWidth = 36;
        this.iconContainerHeight = 36;
        this.domNode = dom.$('.icon-select-box');
        this._register(this.create());
    }
    create() {
        const disposables = new DisposableStore();
        const iconSelectBoxContainer = dom.append(this.domNode, dom.$('.icon-select-box-container'));
        iconSelectBoxContainer.style.margin = '10px 15px';
        const iconSelectInputContainer = dom.append(iconSelectBoxContainer, dom.$('.icon-select-input-container'));
        iconSelectInputContainer.style.paddingBottom = '10px';
        this.inputBox = disposables.add(new InputBox(iconSelectInputContainer, undefined, {
            placeholder: localize('iconSelect.placeholder', "Search icons"),
            inputBoxStyles: this.options.inputBoxStyles,
        }));
        const iconsContainer = this.iconsContainer = dom.$('.icon-select-icons-container', { id: `${this.domId}_icons` });
        iconsContainer.role = 'listbox';
        iconsContainer.tabIndex = 0;
        this.scrollableElement = disposables.add(new DomScrollableElement(iconsContainer, {
            useShadows: false,
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
        }));
        dom.append(iconSelectBoxContainer, this.scrollableElement.getDomNode());
        if (this.options.showIconInfo) {
            this.iconIdElement = this._register(new HighlightedLabel(dom.append(dom.append(iconSelectBoxContainer, dom.$('.icon-select-id-container')), dom.$('.icon-select-id-label'))));
        }
        const iconsDisposables = disposables.add(new MutableDisposable());
        iconsDisposables.value = this.renderIcons(this.options.icons, [], iconsContainer);
        this.scrollableElement.scanDomNode();
        disposables.add(this.inputBox.onDidChange(value => {
            const icons = [], matches = [];
            for (const icon of this.options.icons) {
                const match = this.matchesContiguous(value, icon.id);
                if (match) {
                    icons.push(icon);
                    matches.push(match);
                }
            }
            if (icons.length) {
                iconsDisposables.value = this.renderIcons(icons, matches, iconsContainer);
                this.scrollableElement?.scanDomNode();
            }
        }));
        this.inputBox.inputElement.role = 'combobox';
        this.inputBox.inputElement.ariaHasPopup = 'menu';
        this.inputBox.inputElement.ariaAutoComplete = 'list';
        this.inputBox.inputElement.ariaExpanded = 'true';
        this.inputBox.inputElement.setAttribute('aria-controls', iconsContainer.id);
        return disposables;
    }
    renderIcons(icons, matches, container) {
        const disposables = new DisposableStore();
        dom.clearNode(container);
        const focusedIcon = this.renderedIcons[this.focusedItemIndex]?.icon;
        let focusedIconIndex = 0;
        const renderedIcons = [];
        if (icons.length) {
            for (let index = 0; index < icons.length; index++) {
                const icon = icons[index];
                const iconContainer = dom.append(container, dom.$('.icon-container', { id: `${this.domId}_icons_${index}` }));
                iconContainer.style.width = `${this.iconContainerWidth}px`;
                iconContainer.style.height = `${this.iconContainerHeight}px`;
                iconContainer.title = icon.id;
                iconContainer.role = 'button';
                iconContainer.setAttribute('aria-setsize', `${icons.length}`);
                iconContainer.setAttribute('aria-posinset', `${index + 1}`);
                dom.append(iconContainer, dom.$(ThemeIcon.asCSSSelector(icon)));
                renderedIcons.push({ icon, element: iconContainer, highlightMatches: matches[index] });
                disposables.add(dom.addDisposableListener(iconContainer, dom.EventType.CLICK, (e) => {
                    e.stopPropagation();
                    this.setSelection(index);
                }));
                if (icon === focusedIcon) {
                    focusedIconIndex = index;
                }
            }
        }
        else {
            const noResults = localize('iconSelect.noResults', "No results");
            dom.append(container, dom.$('.icon-no-results', undefined, noResults));
            alert(noResults);
        }
        this.renderedIcons.splice(0, this.renderedIcons.length, ...renderedIcons);
        this.focusIcon(focusedIconIndex);
        return disposables;
    }
    focusIcon(index) {
        const existing = this.renderedIcons[this.focusedItemIndex];
        if (existing) {
            existing.element.classList.remove('focused');
        }
        this.focusedItemIndex = index;
        const renderedItem = this.renderedIcons[index];
        if (renderedItem) {
            renderedItem.element.classList.add('focused');
        }
        if (this.inputBox) {
            if (renderedItem) {
                this.inputBox.inputElement.setAttribute('aria-activedescendant', renderedItem.element.id);
            }
            else {
                this.inputBox.inputElement.removeAttribute('aria-activedescendant');
            }
        }
        if (this.iconIdElement) {
            if (renderedItem) {
                this.iconIdElement.set(renderedItem.icon.id, renderedItem.highlightMatches);
            }
            else {
                this.iconIdElement.set('');
            }
        }
        this.reveal(index);
    }
    reveal(index) {
        if (!this.scrollableElement) {
            return;
        }
        if (index < 0 || index >= this.renderedIcons.length) {
            return;
        }
        const element = this.renderedIcons[index].element;
        if (!element) {
            return;
        }
        const { height } = this.scrollableElement.getScrollDimensions();
        const { scrollTop } = this.scrollableElement.getScrollPosition();
        if (element.offsetTop + this.iconContainerHeight > scrollTop + height) {
            this.scrollableElement.setScrollPosition({ scrollTop: element.offsetTop + this.iconContainerHeight - height });
        }
        else if (element.offsetTop < scrollTop) {
            this.scrollableElement.setScrollPosition({ scrollTop: element.offsetTop });
        }
    }
    matchesContiguous(word, wordToMatchAgainst) {
        const matchIndex = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
        if (matchIndex !== -1) {
            return [{ start: matchIndex, end: matchIndex + word.length }];
        }
        return null;
    }
    layout(dimension) {
        this.domNode.style.width = `${dimension.width}px`;
        this.domNode.style.height = `${dimension.height}px`;
        const iconsContainerWidth = dimension.width - 30;
        this.numberOfElementsPerRow = Math.floor(iconsContainerWidth / this.iconContainerWidth);
        if (this.numberOfElementsPerRow === 0) {
            throw new Error('Insufficient width');
        }
        const extraSpace = iconsContainerWidth % this.iconContainerWidth;
        const iconElementMargin = Math.floor(extraSpace / this.numberOfElementsPerRow);
        for (const { element } of this.renderedIcons) {
            element.style.marginRight = `${iconElementMargin}px`;
        }
        const containerPadding = extraSpace % this.numberOfElementsPerRow;
        if (this.iconsContainer) {
            this.iconsContainer.style.paddingLeft = `${Math.floor(containerPadding / 2)}px`;
            this.iconsContainer.style.paddingRight = `${Math.ceil(containerPadding / 2)}px`;
        }
        if (this.scrollableElement) {
            this.scrollableElement.getDomNode().style.height = `${this.iconIdElement ? dimension.height - 80 : dimension.height - 40}px`;
            this.scrollableElement.scanDomNode();
        }
    }
    getFocus() {
        return [this.focusedItemIndex];
    }
    setSelection(index) {
        if (index < 0 || index >= this.renderedIcons.length) {
            throw new Error(`Invalid index ${index}`);
        }
        this.focusIcon(index);
        this._onDidSelect.fire(this.renderedIcons[index].icon);
    }
    clearInput() {
        if (this.inputBox) {
            this.inputBox.value = '';
        }
    }
    focus() {
        this.inputBox?.focus();
        this.focusIcon(0);
    }
    focusNext() {
        this.focusIcon((this.focusedItemIndex + 1) % this.renderedIcons.length);
    }
    focusPrevious() {
        this.focusIcon((this.focusedItemIndex - 1 + this.renderedIcons.length) % this.renderedIcons.length);
    }
    focusNextRow() {
        let nextRowIndex = this.focusedItemIndex + this.numberOfElementsPerRow;
        if (nextRowIndex >= this.renderedIcons.length) {
            nextRowIndex = (nextRowIndex + 1) % this.numberOfElementsPerRow;
            nextRowIndex = nextRowIndex >= this.renderedIcons.length ? 0 : nextRowIndex;
        }
        this.focusIcon(nextRowIndex);
    }
    focusPreviousRow() {
        let previousRowIndex = this.focusedItemIndex - this.numberOfElementsPerRow;
        if (previousRowIndex < 0) {
            const numberOfRows = Math.floor(this.renderedIcons.length / this.numberOfElementsPerRow);
            previousRowIndex = this.focusedItemIndex + (this.numberOfElementsPerRow * numberOfRows) - 1;
            previousRowIndex = previousRowIndex < 0
                ? this.renderedIcons.length - 1
                : previousRowIndex >= this.renderedIcons.length
                    ? previousRowIndex - this.numberOfElementsPerRow
                    : previousRowIndex;
        }
        this.focusIcon(previousRowIndex);
    }
    getFocusedIcon() {
        return this.renderedIcons[this.focusedItemIndex].icon;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblNlbGVjdEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaWNvbnMvaWNvblNlbGVjdEJveC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHFCQUFxQixDQUFDO0FBQzdCLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN4QyxPQUFPLEVBQW1CLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNuRCxPQUFPLEVBQWUsZUFBZSxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHOUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFjM0UsTUFBTSxPQUFPLGFBQWMsU0FBUSxVQUFVO2FBRTdCLGtCQUFhLEdBQUcsQ0FBQyxBQUFKLENBQUs7SUFvQmpDLFlBQ2tCLE9BQThCO1FBRS9DLEtBQUssRUFBRSxDQUFDO1FBRlMsWUFBTyxHQUFQLE9BQU8sQ0FBdUI7UUFwQnZDLFVBQUssR0FBRyxzQkFBc0IsRUFBRSxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7UUFJL0QsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFhLENBQUMsQ0FBQztRQUN2RCxnQkFBVyxH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
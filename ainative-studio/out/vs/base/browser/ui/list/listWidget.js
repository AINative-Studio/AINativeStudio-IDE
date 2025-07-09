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
import { EventHelper, getActiveElement, getWindow, isActiveElement, isEditableElement, isHTMLElement, isMouseEvent } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { asCssValueWithDefault } from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { Gesture } from '../../touch.js';
import { alert } from '../aria/aria.js';
import { CombinedSpliceable } from './splice.js';
import { binarySearch, range } from '../../../common/arrays.js';
import { timeout } from '../../../common/async.js';
import { Color } from '../../../common/color.js';
import { memoize } from '../../../common/decorators.js';
import { Emitter, Event, EventBufferer } from '../../../common/event.js';
import { matchesFuzzy2, matchesPrefix } from '../../../common/filters.js';
import { DisposableStore, dispose } from '../../../common/lifecycle.js';
import { clamp } from '../../../common/numbers.js';
import * as platform from '../../../common/platform.js';
import { isNumber } from '../../../common/types.js';
import './list.css';
import { ListError } from './list.js';
import { ListView } from './listView.js';
import { StandardMouseEvent } from '../../mouseEvent.js';
import { autorun, constObservable } from '../../../common/observable.js';
class TraitRenderer {
    constructor(trait) {
        this.trait = trait;
        this.renderedElements = [];
    }
    get templateId() {
        return `template:${this.trait.name}`;
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(element, index, templateData) {
        const renderedElementIndex = this.renderedElements.findIndex(el => el.templateData === templateData);
        if (renderedElementIndex >= 0) {
            const rendered = this.renderedElements[renderedElementIndex];
            this.trait.unrender(templateData);
            rendered.index = index;
        }
        else {
            const rendered = { index, templateData };
            this.renderedElements.push(rendered);
        }
        this.trait.renderIndex(index, templateData);
    }
    splice(start, deleteCount, insertCount) {
        const rendered = [];
        for (const renderedElement of this.renderedElements) {
            if (renderedElement.index < start) {
                rendered.push(renderedElement);
            }
            else if (renderedElement.index >= start + deleteCount) {
                rendered.push({
                    index: renderedElement.index + insertCount - deleteCount,
                    templateData: renderedElement.templateData
                });
            }
        }
        this.renderedElements = rendered;
    }
    renderIndexes(indexes) {
        for (const { index, templateData } of this.renderedElements) {
            if (indexes.indexOf(index) > -1) {
                this.trait.renderIndex(index, templateData);
            }
        }
    }
    disposeTemplate(templateData) {
        const index = this.renderedElements.findIndex(el => el.templateData === templateData);
        if (index < 0) {
            return;
        }
        this.renderedElements.splice(index, 1);
    }
}
class Trait {
    get name() { return this._trait; }
    get renderer() {
        return new TraitRenderer(this);
    }
    constructor(_trait) {
        this._trait = _trait;
        this.indexes = [];
        this.sortedIndexes = [];
        this._onChange = new Emitter();
        this.onChange = this._onChange.event;
    }
    splice(start, deleteCount, elements) {
        const diff = elements.length - deleteCount;
        const end = start + deleteCount;
        const sortedIndexes = [];
        let i = 0;
        while (i < this.sortedIndexes.length && this.sortedIndexes[i] < start) {
            sortedIndexes.push(this.sortedIndexes[i++]);
        }
        for (let j = 0; j < elements.length; j++) {
            if (elements[j]) {
                sortedIndexes.push(j + start);
            }
        }
        while (i < this.sortedIndexes.length && this.sortedIndexes[i] >= end) {
            sortedIndexes.push(this.sortedIndexes[i++] + diff);
        }
        this.renderer.splice(start, deleteCount, elements.length);
        this._set(sortedIndexes, sortedIndexes);
    }
    renderIndex(index, container) {
        container.classList.toggle(this._trait, this.contains(index));
    }
    unrender(container) {
        container.classList.remove(this._trait);
    }
    /**
     * Sets the indexes which should have this trait.
     *
     * @param indexes Indexes which should have this trait.
     * @return The old indexes which had this trait.
     */
    set(indexes, browserEvent) {
        return this._set(indexes, [...indexes].sort(numericSort), browserEvent);
    }
    _set(indexes, sortedIndexes, browserEvent) {
        const result = this.indexes;
        const sortedResult = this.sortedIndexes;
        this.indexes = indexes;
        this.sortedIndexes = sortedIndexes;
        const toRender = disjunction(sortedResult, indexes);
        this.renderer.renderIndexes(toRender);
        this._onChange.fire({ indexes, browserEvent });
        return result;
    }
    get() {
        return this.indexes;
    }
    contains(index) {
        return binarySearch(this.sortedIndexes, index, numericSort) >= 0;
    }
    dispose() {
        dispose(this._onChange);
    }
}
__decorate([
    memoize
], Trait.prototype, "renderer", null);
class SelectionTrait extends Trait {
    constructor(setAriaSelected) {
        super('selected');
        this.setAriaSelected = setAriaSelected;
    }
    renderIndex(index, container) {
        super.renderIndex(index, container);
        if (this.setAriaSelected) {
            if (this.contains(index)) {
                container.setAttribute('aria-selected', 'true');
            }
            else {
                container.setAttribute('aria-selected', 'false');
            }
        }
    }
}
/**
 * The TraitSpliceable is used as a util class to be able
 * to preserve traits across splice calls, given an identity
 * provider.
 */
class TraitSpliceable {
    constructor(trait, view, identityProvider) {
        this.trait = trait;
        this.view = view;
        this.identityProvider = identityProvider;
    }
    splice(start, deleteCount, elements) {
        if (!this.identityProvider) {
            return this.trait.splice(start, deleteCount, new Array(elements.length).fill(false));
        }
        const pastElementsWithTrait = this.trait.get().map(i => this.identityProvider.getId(this.view.element(i)).toString());
        if (pastElementsWithTrait.length === 0) {
            return this.trait.splice(start, deleteCount, new Array(elements.length).fill(false));
        }
        const pastElementsWithTraitSet = new Set(pastElementsWithTrait);
        const elementsWithTrait = elements.map(e => pastElementsWithTraitSet.has(this.identityProvider.getId(e).toString()));
        this.trait.splice(start, deleteCount, elementsWithTrait);
    }
}
function isListElementDescendantOfClass(e, className) {
    if (e.classList.contains(className)) {
        return true;
    }
    if (e.classList.contains('monaco-list')) {
        return false;
    }
    if (!e.parentElement) {
        return false;
    }
    return isListElementDescendantOfClass(e.parentElement, className);
}
export function isMonacoEditor(e) {
    return isListElementDescendantOfClass(e, 'monaco-editor');
}
export function isMonacoCustomToggle(e) {
    return isListElementDescendantOfClass(e, 'monaco-custom-toggle');
}
export function isActionItem(e) {
    return isListElementDescendantOfClass(e, 'action-item');
}
export function isMonacoTwistie(e) {
    return isListElementDescendantOfClass(e, 'monaco-tl-twistie');
}
export function isStickyScrollElement(e) {
    return isListElementDescendantOfClass(e, 'monaco-tree-sticky-row');
}
export function isStickyScrollContainer(e) {
    return e.classList.contains('monaco-tree-sticky-container');
}
export function isButton(e) {
    if ((e.tagName === 'A' && e.classList.contains('monaco-button')) ||
        (e.tagName === 'DIV' && e.classList.contains('monaco-button-dropdown'))) {
        return true;
    }
    if (e.classList.contains('monaco-list')) {
        return false;
    }
    if (!e.parentElement) {
        return false;
    }
    return isButton(e.parentElement);
}
class KeyboardController {
    get onKeyDown() {
        return Event.chain(this.disposables.add(new DomEmitter(this.view.domNode, 'keydown')).event, $ => $.filter(e => !isEditableElement(e.target))
            .map(e => new StandardKeyboardEvent(e)));
    }
    constructor(list, view, options) {
        this.list = list;
        this.view = view;
        this.disposables = new DisposableStore();
        this.multipleSelectionDisposables = new DisposableStore();
        this.multipleSelectionSupport = options.multipleSelectionSupport;
        this.disposables.add(this.onKeyDown(e => {
            switch (e.keyCode) {
                case 3 /* KeyCode.Enter */:
                    return this.onEnter(e);
                case 16 /* KeyCode.UpArrow */:
                    return this.onUpArrow(e);
                case 18 /* KeyCode.DownArrow */:
                    return this.onDownArrow(e);
                case 11 /* KeyCode.PageUp */:
                    return this.onPageUpArrow(e);
                case 12 /* KeyCode.PageDown */:
                    return this.onPageDownArrow(e);
                case 9 /* KeyCode.Escape */:
                    return this.onEscape(e);
                case 31 /* KeyCode.KeyA */:
                    if (this.multipleSelectionSupport && (platform.isMacintosh ? e.metaKey : e.ctrlKey)) {
                        this.onCtrlA(e);
                    }
            }
        }));
    }
    updateOptions(optionsUpdate) {
        if (optionsUpdate.multipleSelectionSupport !== undefined) {
            this.multipleSelectionSupport = optionsUpdate.multipleSelectionSupport;
        }
    }
    onEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.setSelection(this.list.getFocus(), e.browserEvent);
    }
    onUpArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusPrevious(1, false, e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onDownArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusNext(1, false, e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onPageUpArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusPreviousPage(e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onPageDownArrow(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.focusNextPage(e.browserEvent);
        const el = this.list.getFocus()[0];
        this.list.setAnchor(el);
        this.list.reveal(el);
        this.view.domNode.focus();
    }
    onCtrlA(e) {
        e.preventDefault();
        e.stopPropagation();
        this.list.setSelection(range(this.list.length), e.browserEvent);
        this.list.setAnchor(undefined);
        this.view.domNode.focus();
    }
    onEscape(e) {
        if (this.list.getSelection().length) {
            e.preventDefault();
            e.stopPropagation();
            this.list.setSelection([], e.browserEvent);
            this.list.setAnchor(undefined);
            this.view.domNode.focus();
        }
    }
    dispose() {
        this.disposables.dispose();
        this.multipleSelectionDisposables.dispose();
    }
}
__decorate([
    memoize
], KeyboardController.prototype, "onKeyDown", null);
export var TypeNavigationMode;
(function (TypeNavigationMode) {
    TypeNavigationMode[TypeNavigationMode["Automatic"] = 0] = "Automatic";
    TypeNavigationMode[TypeNavigationMode["Trigger"] = 1] = "Trigger";
})(TypeNavigationMode || (TypeNavigationMode = {}));
var TypeNavigationControllerState;
(function (TypeNavigationControllerState) {
    TypeNavigationControllerState[TypeNavigationControllerState["Idle"] = 0] = "Idle";
    TypeNavigationControllerState[TypeNavigationControllerState["Typing"] = 1] = "Typing";
})(TypeNavigationControllerState || (TypeNavigationControllerState = {}));
export const DefaultKeyboardNavigationDelegate = new class {
    mightProducePrintableCharacter(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return false;
        }
        return (event.keyCode >= 31 /* KeyCode.KeyA */ && event.keyCode <= 56 /* KeyCode.KeyZ */)
            || (event.keyCode >= 21 /* KeyCode.Digit0 */ && event.keyCode <= 30 /* KeyCode.Digit9 */)
            || (event.keyCode >= 98 /* KeyCode.Numpad0 */ && event.keyCode <= 107 /* KeyCode.Numpad9 */)
            || (event.keyCode >= 85 /* KeyCode.Semicolon */ && event.keyCode <= 95 /* KeyCode.Quote */);
    }
};
class TypeNavigationController {
    constructor(list, view, keyboardNavigationLabelProvider, keyboardNavigationEventFilter, delegate) {
        this.list = list;
        this.view = view;
        this.keyboardNavigationLabelProvider = keyboardNavigationLabelProvider;
        this.keyboardNavigationEventFilter = keyboardNavigationEventFilter;
        this.delegate = delegate;
        this.enabled = false;
        this.state = TypeNavigationControllerState.Idle;
        this.mode = TypeNavigationMode.Automatic;
        this.triggered = false;
        this.previouslyFocused = -1;
        this.enabledDisposables = new DisposableStore();
        this.disposables = new DisposableStore();
        this.updateOptions(list.options);
    }
    updateOptions(options) {
        if (options.typeNavigationEnabled ?? true) {
            this.enable();
        }
        else {
            this.disable();
        }
        this.mode = options.typeNavigationMode ?? TypeNavigationMode.Automatic;
    }
    trigger() {
        this.triggered = !this.triggered;
    }
    enable() {
        if (this.enabled) {
            return;
        }
        let typing = false;
        const onChar = Event.chain(this.enabledDisposables.add(new DomEmitter(this.view.domNode, 'keydown')).event, $ => $.filter(e => !isEditableElement(e.target))
            .filter(() => this.mode === TypeNavigationMode.Automatic || this.triggered)
            .map(event => new StandardKeyboardEvent(event))
            .filter(e => typing || this.keyboardNavigationEventFilter(e))
            .filter(e => this.delegate.mightProducePrintableCharacter(e))
            .forEach(e => EventHelper.stop(e, true))
            .map(event => event.browserEvent.key));
        const onClear = Event.debounce(onChar, () => null, 800, undefined, undefined, undefined, this.enabledDisposables);
        const onInput = Event.reduce(Event.any(onChar, onClear), (r, i) => i === null ? null : ((r || '') + i), undefined, this.enabledDisposables);
        onInput(this.onInput, this, this.enabledDisposables);
        onClear(this.onClear, this, this.enabledDisposables);
        onChar(() => typing = true, undefined, this.enabledDisposables);
        onClear(() => typing = false, undefined, this.enabledDisposables);
        this.enabled = true;
        this.triggered = false;
    }
    disable() {
        if (!this.enabled) {
            return;
        }
        this.enabledDisposables.clear();
        this.enabled = false;
        this.triggered = false;
    }
    onClear() {
        const focus = this.list.getFocus();
        if (focus.length > 0 && focus[0] === this.previouslyFocused) {
            // List: re-announce element on typing end since typed keys will interrupt aria label of focused element
            // Do not announce if there was a focus change at the end to prevent duplication https://github.com/microsoft/vscode/issues/95961
            const ariaLabel = this.list.options.accessibilityProvider?.getAriaLabel(this.list.element(focus[0]));
            if (typeof ariaLabel === 'string') {
                alert(ariaLabel);
            }
            else if (ariaLabel) {
                alert(ariaLabel.get());
            }
        }
        this.previouslyFocused = -1;
    }
    onInput(word) {
        if (!word) {
            this.state = TypeNavigationControllerState.Idle;
            this.triggered = false;
            return;
        }
        const focus = this.list.getFocus();
        const start = focus.length > 0 ? focus[0] : 0;
        const delta = this.state === TypeNavigationControllerState.Idle ? 1 : 0;
        this.state = TypeNavigationControllerState.Typing;
        for (let i = 0; i < this.list.length; i++) {
            const index = (start + i + delta) % this.list.length;
            const label = this.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(this.view.element(index));
            const labelStr = label && label.toString();
            if (this.list.options.typeNavigationEnabled) {
                if (typeof labelStr !== 'undefined') {
                    // If prefix is found, focus and return early
                    if (matchesPrefix(word, labelStr)) {
                        this.previouslyFocused = start;
                        this.list.setFocus([index]);
                        this.list.reveal(index);
                        return;
                    }
                    const fuzzy = matchesFuzzy2(word, labelStr);
                    if (fuzzy) {
                        const fuzzyScore = fuzzy[0].end - fuzzy[0].start;
                        // ensures that when fuzzy matching, doesn't clash with prefix matching (1 input vs 1+ should be prefix and fuzzy respecitvely). Also makes sure that exact matches are prioritized.
                        if (fuzzyScore > 1 && fuzzy.length === 1) {
                            this.previouslyFocused = start;
                            this.list.setFocus([index]);
                            this.list.reveal(index);
                            return;
                        }
                    }
                }
            }
            else if (typeof labelStr === 'undefined' || matchesPrefix(word, labelStr)) {
                this.previouslyFocused = start;
                this.list.setFocus([index]);
                this.list.reveal(index);
                return;
            }
        }
    }
    dispose() {
        this.disable();
        this.enabledDisposables.dispose();
        this.disposables.dispose();
    }
}
class DOMFocusController {
    constructor(list, view) {
        this.list = list;
        this.view = view;
        this.disposables = new DisposableStore();
        const onKeyDown = Event.chain(this.disposables.add(new DomEmitter(view.domNode, 'keydown')).event, $ => $
            .filter(e => !isEditableElement(e.target))
            .map(e => new StandardKeyboardEvent(e)));
        const onTab = Event.chain(onKeyDown, $ => $.filter(e => e.keyCode === 2 /* KeyCode.Tab */ && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey));
        onTab(this.onTab, this, this.disposables);
    }
    onTab(e) {
        if (e.target !== this.view.domNode) {
            return;
        }
        const focus = this.list.getFocus();
        if (focus.length === 0) {
            return;
        }
        const focusedDomElement = this.view.domElement(focus[0]);
        if (!focusedDomElement) {
            return;
        }
        const tabIndexElement = focusedDomElement.querySelector('[tabIndex]');
        if (!tabIndexElement || !(isHTMLElement(tabIndexElement)) || tabIndexElement.tabIndex === -1) {
            return;
        }
        const style = getWindow(tabIndexElement).getComputedStyle(tabIndexElement);
        if (style.visibility === 'hidden' || style.display === 'none') {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        tabIndexElement.focus();
    }
    dispose() {
        this.disposables.dispose();
    }
}
export function isSelectionSingleChangeEvent(event) {
    return platform.isMacintosh ? event.browserEvent.metaKey : event.browserEvent.ctrlKey;
}
export function isSelectionRangeChangeEvent(event) {
    return event.browserEvent.shiftKey;
}
function isMouseRightClick(event) {
    return isMouseEvent(event) && event.button === 2;
}
const DefaultMultipleSelectionController = {
    isSelectionSingleChangeEvent,
    isSelectionRangeChangeEvent
};
export class MouseController {
    constructor(list) {
        this.list = list;
        this.disposables = new DisposableStore();
        this._onPointer = new Emitter();
        this.onPointer = this._onPointer.event;
        if (list.options.multipleSelectionSupport !== false) {
            this.multipleSelectionController = this.list.options.multipleSelectionController || DefaultMultipleSelectionController;
        }
        this.mouseSupport = typeof list.options.mouseSupport === 'undefined' || !!list.options.mouseSupport;
        if (this.mouseSupport) {
            list.onMouseDown(this.onMouseDown, this, this.disposables);
            list.onContextMenu(this.onContextMenu, this, this.disposables);
            list.onMouseDblClick(this.onDoubleClick, this, this.disposables);
            list.onTouchStart(this.onMouseDown, this, this.disposables);
            this.disposables.add(Gesture.addTarget(list.getHTMLElement()));
        }
        Event.any(list.onMouseClick, list.onMouseMiddleClick, list.onTap)(this.onViewPointer, this, this.disposables);
    }
    updateOptions(optionsUpdate) {
        if (optionsUpdate.multipleSelectionSupport !== undefined) {
            this.multipleSelectionController = undefined;
            if (optionsUpdate.multipleSelectionSupport) {
                this.multipleSelectionController = this.list.options.multipleSelectionController || DefaultMultipleSelectionController;
            }
        }
    }
    isSelectionSingleChangeEvent(event) {
        if (!this.multipleSelectionController) {
            return false;
        }
        return this.multipleSelectionController.isSelectionSingleChangeEvent(event);
    }
    isSelectionRangeChangeEvent(event) {
        if (!this.multipleSelectionController) {
            return false;
        }
        return this.multipleSelectionController.isSelectionRangeChangeEvent(event);
    }
    isSelectionChangeEvent(event) {
        return this.isSelectionSingleChangeEvent(event) || this.isSelectionRangeChangeEvent(event);
    }
    onMouseDown(e) {
        if (isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (getActiveElement() !== e.browserEvent.target) {
            this.list.domFocus();
        }
    }
    onContextMenu(e) {
        if (isEditableElement(e.browserEvent.target) || isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        const focus = typeof e.index === 'undefined' ? [] : [e.index];
        this.list.setFocus(focus, e.browserEvent);
    }
    onViewPointer(e) {
        if (!this.mouseSupport) {
            return;
        }
        if (isEditableElement(e.browserEvent.target) || isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        e.browserEvent.isHandledByList = true;
        const focus = e.index;
        if (typeof focus === 'undefined') {
            this.list.setFocus([], e.browserEvent);
            this.list.setSelection([], e.browserEvent);
            this.list.setAnchor(undefined);
            return;
        }
        if (this.isSelectionChangeEvent(e)) {
            return this.changeSelection(e);
        }
        this.list.setFocus([focus], e.browserEvent);
        this.list.setAnchor(focus);
        if (!isMouseRightClick(e.browserEvent)) {
            this.list.setSelection([focus], e.browserEvent);
        }
        this._onPointer.fire(e);
    }
    onDoubleClick(e) {
        if (isEditableElement(e.browserEvent.target) || isMonacoEditor(e.browserEvent.target)) {
            return;
        }
        if (this.isSelectionChangeEvent(e)) {
            return;
        }
        if (e.browserEvent.isHandledByList) {
            return;
        }
        e.browserEvent.isHandledByList = true;
        const focus = this.list.getFocus();
        this.list.setSelection(focus, e.browserEvent);
    }
    changeSelection(e) {
        const focus = e.index;
        let anchor = this.list.getAnchor();
        if (this.isSelectionRangeChangeEvent(e)) {
            if (typeof anchor === 'undefined') {
                const currentFocus = this.list.getFocus()[0];
                anchor = currentFocus ?? focus;
                this.list.setAnchor(anchor);
            }
            const min = Math.min(anchor, focus);
            const max = Math.max(anchor, focus);
            const rangeSelection = range(min, max + 1);
            const selection = this.list.getSelection();
            const contiguousRange = getContiguousRangeContaining(disjunction(selection, [anchor]), anchor);
            if (contiguousRange.length === 0) {
                return;
            }
            const newSelection = disjunction(rangeSelection, relativeComplement(selection, contiguousRange));
            this.list.setSelection(newSelection, e.browserEvent);
            this.list.setFocus([focus], e.browserEvent);
        }
        else if (this.isSelectionSingleChangeEvent(e)) {
            const selection = this.list.getSelection();
            const newSelection = selection.filter(i => i !== focus);
            this.list.setFocus([focus]);
            this.list.setAnchor(focus);
            if (selection.length === newSelection.length) {
                this.list.setSelection([...newSelection, focus], e.browserEvent);
            }
            else {
                this.list.setSelection(newSelection, e.browserEvent);
            }
        }
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class DefaultStyleController {
    constructor(styleElement, selectorSuffix) {
        this.styleElement = styleElement;
        this.selectorSuffix = selectorSuffix;
    }
    style(styles) {
        const suffix = this.selectorSuffix && `.${this.selectorSuffix}`;
        const content = [];
        if (styles.listBackground) {
            content.push(`.monaco-list${suffix} .monaco-list-rows { background: ${styles.listBackground}; }`);
        }
        if (styles.listFocusBackground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused { background-color: ${styles.listFocusBackground}; }`);
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused:hover { background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
        }
        if (styles.listActiveSelectionBackground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected { background-color: ${styles.listActiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected:hover { background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listActiveSelectionForeground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
        }
        if (styles.listActiveSelectionIconForeground) {
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.selected .codicon { color: ${styles.listActiveSelectionIconForeground}; }`);
        }
        if (styles.listFocusAndSelectionBackground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus .monaco-list-row.selected.focused { background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
        }
        if (styles.listFocusAndSelectionForeground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
        }
        if (styles.listInactiveFocusForeground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused { color:  ${styles.listInactiveFocusForeground}; }`);
            content.push(`.monaco-list${suffix} .monaco-list-row.focused:hover { color:  ${styles.listInactiveFocusForeground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionIconForeground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused .codicon { color:  ${styles.listInactiveSelectionIconForeground}; }`);
        }
        if (styles.listInactiveFocusBackground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused { background-color:  ${styles.listInactiveFocusBackground}; }`);
            content.push(`.monaco-list${suffix} .monaco-list-row.focused:hover { background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionBackground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.selected { background-color:  ${styles.listInactiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix} .monaco-list-row.selected:hover { background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionForeground) {
            content.push(`.monaco-list${suffix} .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
        }
        if (styles.listHoverBackground) {
            content.push(`.monaco-list${suffix}:not(.drop-target):not(.dragging) .monaco-list-row:hover:not(.selected):not(.focused) { background-color: ${styles.listHoverBackground}; }`);
        }
        if (styles.listHoverForeground) {
            content.push(`.monaco-list${suffix}:not(.drop-target):not(.dragging) .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
        }
        /**
         * Outlines
         */
        const focusAndSelectionOutline = asCssValueWithDefault(styles.listFocusAndSelectionOutline, asCssValueWithDefault(styles.listSelectionOutline, styles.listFocusOutline ?? ''));
        if (focusAndSelectionOutline) { // default: listFocusOutline
            content.push(`.monaco-list${suffix}:focus .monaco-list-row.focused.selected { outline: 1px solid ${focusAndSelectionOutline}; outline-offset: -1px;}`);
        }
        if (styles.listFocusOutline) { // default: set
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus .monaco-list-row.focused,
				.monaco-workbench.context-menu-visible .monaco-list${suffix}.last-focused .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
        }
        const inactiveFocusAndSelectionOutline = asCssValueWithDefault(styles.listSelectionOutline, styles.listInactiveFocusOutline ?? '');
        if (inactiveFocusAndSelectionOutline) {
            content.push(`.monaco-list${suffix} .monaco-list-row.focused.selected { outline: 1px dotted ${inactiveFocusAndSelectionOutline}; outline-offset: -1px; }`);
        }
        if (styles.listSelectionOutline) { // default: activeContrastBorder
            content.push(`.monaco-list${suffix} .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
        }
        if (styles.listInactiveFocusOutline) { // default: null
            content.push(`.monaco-list${suffix} .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
        }
        if (styles.listHoverOutline) { // default: activeContrastBorder
            content.push(`.monaco-list${suffix} .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
        }
        if (styles.listDropOverBackground) {
            content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} .monaco-list-rows.drop-target,
				.monaco-list${suffix} .monaco-list-row.drop-target { background-color: ${styles.listDropOverBackground} !important; color: inherit !important; }
			`);
        }
        if (styles.listDropBetweenBackground) {
            content.push(`
			.monaco-list${suffix} .monaco-list-rows.drop-target-before .monaco-list-row:first-child::before,
			.monaco-list${suffix} .monaco-list-row.drop-target-before::before {
				content: ""; position: absolute; top: 0px; left: 0px; width: 100%; height: 1px;
				background-color: ${styles.listDropBetweenBackground};
			}`);
            content.push(`
			.monaco-list${suffix} .monaco-list-rows.drop-target-after .monaco-list-row:last-child::after,
			.monaco-list${suffix} .monaco-list-row.drop-target-after::after {
				content: ""; position: absolute; bottom: 0px; left: 0px; width: 100%; height: 1px;
				background-color: ${styles.listDropBetweenBackground};
			}`);
        }
        if (styles.tableColumnsBorder) {
            content.push(`
				.monaco-table > .monaco-split-view2,
				.monaco-table > .monaco-split-view2 .monaco-sash.vertical::before,
				.monaco-workbench:not(.reduce-motion) .monaco-table:hover > .monaco-split-view2,
				.monaco-workbench:not(.reduce-motion) .monaco-table:hover > .monaco-split-view2 .monaco-sash.vertical::before {
					border-color: ${styles.tableColumnsBorder};
				}

				.monaco-workbench:not(.reduce-motion) .monaco-table > .monaco-split-view2,
				.monaco-workbench:not(.reduce-motion) .monaco-table > .monaco-split-view2 .monaco-sash.vertical::before {
					border-color: transparent;
				}
			`);
        }
        if (styles.tableOddRowsBackgroundColor) {
            content.push(`
				.monaco-table .monaco-list-row[data-parity=odd]:not(.focused):not(.selected):not(:hover) .monaco-table-tr,
				.monaco-table .monaco-list:not(:focus) .monaco-list-row[data-parity=odd].focused:not(.selected):not(:hover) .monaco-table-tr,
				.monaco-table .monaco-list:not(.focused) .monaco-list-row[data-parity=odd].focused:not(.selected):not(:hover) .monaco-table-tr {
					background-color: ${styles.tableOddRowsBackgroundColor};
				}
			`);
        }
        this.styleElement.textContent = content.join('\n');
    }
}
export const unthemedListStyles = {
    listFocusBackground: '#7FB0D0',
    listActiveSelectionBackground: '#0E639C',
    listActiveSelectionForeground: '#FFFFFF',
    listActiveSelectionIconForeground: '#FFFFFF',
    listFocusAndSelectionOutline: '#90C2F9',
    listFocusAndSelectionBackground: '#094771',
    listFocusAndSelectionForeground: '#FFFFFF',
    listInactiveSelectionBackground: '#3F3F46',
    listInactiveSelectionIconForeground: '#FFFFFF',
    listHoverBackground: '#2A2D2E',
    listDropOverBackground: '#383B3D',
    listDropBetweenBackground: '#EEEEEE',
    treeIndentGuidesStroke: '#a9a9a9',
    treeInactiveIndentGuidesStroke: Color.fromHex('#a9a9a9').transparent(0.4).toString(),
    tableColumnsBorder: Color.fromHex('#cccccc').transparent(0.2).toString(),
    tableOddRowsBackgroundColor: Color.fromHex('#cccccc').transparent(0.04).toString(),
    listBackground: undefined,
    listFocusForeground: undefined,
    listInactiveSelectionForeground: undefined,
    listInactiveFocusForeground: undefined,
    listInactiveFocusBackground: undefined,
    listHoverForeground: undefined,
    listFocusOutline: undefined,
    listInactiveFocusOutline: undefined,
    listSelectionOutline: undefined,
    listHoverOutline: undefined,
    treeStickyScrollBackground: undefined,
    treeStickyScrollBorder: undefined,
    treeStickyScrollShadow: undefined
};
const DefaultOptions = {
    keyboardSupport: true,
    mouseSupport: true,
    multipleSelectionSupport: true,
    dnd: {
        getDragURI() { return null; },
        onDragStart() { },
        onDragOver() { return false; },
        drop() { },
        dispose() { }
    }
};
// TODO@Joao: move these utils into a SortedArray class
function getContiguousRangeContaining(range, value) {
    const index = range.indexOf(value);
    if (index === -1) {
        return [];
    }
    const result = [];
    let i = index - 1;
    while (i >= 0 && range[i] === value - (index - i)) {
        result.push(range[i--]);
    }
    result.reverse();
    i = index;
    while (i < range.length && range[i] === value + (i - index)) {
        result.push(range[i++]);
    }
    return result;
}
/**
 * Given two sorted collections of numbers, returns the intersection
 * between them (OR).
 */
function disjunction(one, other) {
    const result = [];
    let i = 0, j = 0;
    while (i < one.length || j < other.length) {
        if (i >= one.length) {
            result.push(other[j++]);
        }
        else if (j >= other.length) {
            result.push(one[i++]);
        }
        else if (one[i] === other[j]) {
            result.push(one[i]);
            i++;
            j++;
            continue;
        }
        else if (one[i] < other[j]) {
            result.push(one[i++]);
        }
        else {
            result.push(other[j++]);
        }
    }
    return result;
}
/**
 * Given two sorted collections of numbers, returns the relative
 * complement between them (XOR).
 */
function relativeComplement(one, other) {
    const result = [];
    let i = 0, j = 0;
    while (i < one.length || j < other.length) {
        if (i >= one.length) {
            result.push(other[j++]);
        }
        else if (j >= other.length) {
            result.push(one[i++]);
        }
        else if (one[i] === other[j]) {
            i++;
            j++;
            continue;
        }
        else if (one[i] < other[j]) {
            result.push(one[i++]);
        }
        else {
            j++;
        }
    }
    return result;
}
const numericSort = (a, b) => a - b;
class PipelineRenderer {
    constructor(_templateId, renderers) {
        this._templateId = _templateId;
        this.renderers = renderers;
    }
    get templateId() {
        return this._templateId;
    }
    renderTemplate(container) {
        return this.renderers.map(r => r.renderTemplate(container));
    }
    renderElement(element, index, templateData, height) {
        let i = 0;
        for (const renderer of this.renderers) {
            renderer.renderElement(element, index, templateData[i++], height);
        }
    }
    disposeElement(element, index, templateData, height) {
        let i = 0;
        for (const renderer of this.renderers) {
            renderer.disposeElement?.(element, index, templateData[i], height);
            i += 1;
        }
    }
    disposeTemplate(templateData) {
        let i = 0;
        for (const renderer of this.renderers) {
            renderer.disposeTemplate(templateData[i++]);
        }
    }
}
class AccessibiltyRenderer {
    constructor(accessibilityProvider) {
        this.accessibilityProvider = accessibilityProvider;
        this.templateId = 'a18n';
    }
    renderTemplate(container) {
        return { container, disposables: new DisposableStore() };
    }
    renderElement(element, index, data) {
        const ariaLabel = this.accessibilityProvider.getAriaLabel(element);
        const observable = (ariaLabel && typeof ariaLabel !== 'string') ? ariaLabel : constObservable(ariaLabel);
        data.disposables.add(autorun(reader => {
            this.setAriaLabel(reader.readObservable(observable), data.container);
        }));
        const ariaLevel = this.accessibilityProvider.getAriaLevel && this.accessibilityProvider.getAriaLevel(element);
        if (typeof ariaLevel === 'number') {
            data.container.setAttribute('aria-level', `${ariaLevel}`);
        }
        else {
            data.container.removeAttribute('aria-level');
        }
    }
    setAriaLabel(ariaLabel, element) {
        if (ariaLabel) {
            element.setAttribute('aria-label', ariaLabel);
        }
        else {
            element.removeAttribute('aria-label');
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.disposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
}
class ListViewDragAndDrop {
    constructor(list, dnd) {
        this.list = list;
        this.dnd = dnd;
    }
    getDragElements(element) {
        const selection = this.list.getSelectedElements();
        const elements = selection.indexOf(element) > -1 ? selection : [element];
        return elements;
    }
    getDragURI(element) {
        return this.dnd.getDragURI(element);
    }
    getDragLabel(elements, originalEvent) {
        if (this.dnd.getDragLabel) {
            return this.dnd.getDragLabel(elements, originalEvent);
        }
        return undefined;
    }
    onDragStart(data, originalEvent) {
        this.dnd.onDragStart?.(data, originalEvent);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return this.dnd.onDragOver(data, targetElement, targetIndex, targetSector, originalEvent);
    }
    onDragLeave(data, targetElement, targetIndex, originalEvent) {
        this.dnd.onDragLeave?.(data, targetElement, targetIndex, originalEvent);
    }
    onDragEnd(originalEvent) {
        this.dnd.onDragEnd?.(originalEvent);
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) {
        this.dnd.drop(data, targetElement, targetIndex, targetSector, originalEvent);
    }
    dispose() {
        this.dnd.dispose();
    }
}
/**
 * The {@link List} is a virtual scrolling widget, built on top of the {@link ListView}
 * widget.
 *
 * Features:
 * - Customizable keyboard and mouse support
 * - Element traits: focus, selection, achor
 * - Accessibility support
 * - Touch support
 * - Performant template-based rendering
 * - Horizontal scrolling
 * - Variable element height support
 * - Dynamic element height support
 * - Drag-and-drop support
 */
export class List {
    get onDidChangeFocus() {
        return Event.map(this.eventBufferer.wrapEvent(this.focus.onChange), e => this.toListEvent(e), this.disposables);
    }
    get onDidChangeSelection() {
        return Event.map(this.eventBufferer.wrapEvent(this.selection.onChange), e => this.toListEvent(e), this.disposables);
    }
    get domId() { return this.view.domId; }
    get onDidScroll() { return this.view.onDidScroll; }
    get onMouseClick() { return this.view.onMouseClick; }
    get onMouseDblClick() { return this.view.onMouseDblClick; }
    get onMouseMiddleClick() { return this.view.onMouseMiddleClick; }
    get onPointer() { return this.mouseController.onPointer; }
    get onMouseUp() { return this.view.onMouseUp; }
    get onMouseDown() { return this.view.onMouseDown; }
    get onMouseOver() { return this.view.onMouseOver; }
    get onMouseMove() { return this.view.onMouseMove; }
    get onMouseOut() { return this.view.onMouseOut; }
    get onTouchStart() { return this.view.onTouchStart; }
    get onTap() { return this.view.onTap; }
    /**
     * Possible context menu trigger events:
     * - ContextMenu key
     * - Shift F10
     * - Ctrl Option Shift M (macOS with VoiceOver)
     * - Mouse right click
     */
    get onContextMenu() {
        let didJustPressContextMenuKey = false;
        const fromKeyDown = Event.chain(this.disposables.add(new DomEmitter(this.view.domNode, 'keydown')).event, $ => $.map(e => new StandardKeyboardEvent(e))
            .filter(e => didJustPressContextMenuKey = e.keyCode === 58 /* KeyCode.ContextMenu */ || (e.shiftKey && e.keyCode === 68 /* KeyCode.F10 */))
            .map(e => EventHelper.stop(e, true))
            .filter(() => false));
        const fromKeyUp = Event.chain(this.disposables.add(new DomEmitter(this.view.domNode, 'keyup')).event, $ => $.forEach(() => didJustPressContextMenuKey = false)
            .map(e => new StandardKeyboardEvent(e))
            .filter(e => e.keyCode === 58 /* KeyCode.ContextMenu */ || (e.shiftKey && e.keyCode === 68 /* KeyCode.F10 */))
            .map(e => EventHelper.stop(e, true))
            .map(({ browserEvent }) => {
            const focus = this.getFocus();
            const index = focus.length ? focus[0] : undefined;
            const element = typeof index !== 'undefined' ? this.view.element(index) : undefined;
            const anchor = typeof index !== 'undefined' ? this.view.domElement(index) : this.view.domNode;
            return { index, element, anchor, browserEvent };
        }));
        const fromMouse = Event.chain(this.view.onContextMenu, $ => $.filter(_ => !didJustPressContextMenuKey)
            .map(({ element, index, browserEvent }) => ({ element, index, anchor: new StandardMouseEvent(getWindow(this.view.domNode), browserEvent), browserEvent })));
        return Event.any(fromKeyDown, fromKeyUp, fromMouse);
    }
    get onKeyDown() { return this.disposables.add(new DomEmitter(this.view.domNode, 'keydown')).event; }
    get onKeyUp() { return this.disposables.add(new DomEmitter(this.view.domNode, 'keyup')).event; }
    get onKeyPress() { return this.disposables.add(new DomEmitter(this.view.domNode, 'keypress')).event; }
    get onDidFocus() { return Event.signal(this.disposables.add(new DomEmitter(this.view.domNode, 'focus', true)).event); }
    get onDidBlur() { return Event.signal(this.disposables.add(new DomEmitter(this.view.domNode, 'blur', true)).event); }
    constructor(user, container, virtualDelegate, renderers, _options = DefaultOptions) {
        this.user = user;
        this._options = _options;
        this.focus = new Trait('focused');
        this.anchor = new Trait('anchor');
        this.eventBufferer = new EventBufferer();
        this._ariaLabel = '';
        this.disposables = new DisposableStore();
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        const role = this._options.accessibilityProvider && this._options.accessibilityProvider.getWidgetRole ? this._options.accessibilityProvider?.getWidgetRole() : 'list';
        this.selection = new SelectionTrait(role !== 'listbox');
        const baseRenderers = [this.focus.renderer, this.selection.renderer];
        this.accessibilityProvider = _options.accessibilityProvider;
        if (this.accessibilityProvider) {
            baseRenderers.push(new AccessibiltyRenderer(this.accessibilityProvider));
            this.accessibilityProvider.onDidChangeActiveDescendant?.(this.onDidChangeActiveDescendant, this, this.disposables);
        }
        renderers = renderers.map(r => new PipelineRenderer(r.templateId, [...baseRenderers, r]));
        const viewOptions = {
            ..._options,
            dnd: _options.dnd && new ListViewDragAndDrop(this, _options.dnd)
        };
        this.view = this.createListView(container, virtualDelegate, renderers, viewOptions);
        this.view.domNode.setAttribute('role', role);
        if (_options.styleController) {
            this.styleController = _options.styleController(this.view.domId);
        }
        else {
            const styleElement = createStyleSheet(this.view.domNode);
            this.styleController = new DefaultStyleController(styleElement, this.view.domId);
        }
        this.spliceable = new CombinedSpliceable([
            new TraitSpliceable(this.focus, this.view, _options.identityProvider),
            new TraitSpliceable(this.selection, this.view, _options.identityProvider),
            new TraitSpliceable(this.anchor, this.view, _options.identityProvider),
            this.view
        ]);
        this.disposables.add(this.focus);
        this.disposables.add(this.selection);
        this.disposables.add(this.anchor);
        this.disposables.add(this.view);
        this.disposables.add(this._onDidDispose);
        this.disposables.add(new DOMFocusController(this, this.view));
        if (typeof _options.keyboardSupport !== 'boolean' || _options.keyboardSupport) {
            this.keyboardController = new KeyboardController(this, this.view, _options);
            this.disposables.add(this.keyboardController);
        }
        if (_options.keyboardNavigationLabelProvider) {
            const delegate = _options.keyboardNavigationDelegate || DefaultKeyboardNavigationDelegate;
            this.typeNavigationController = new TypeNavigationController(this, this.view, _options.keyboardNavigationLabelProvider, _options.keyboardNavigationEventFilter ?? (() => true), delegate);
            this.disposables.add(this.typeNavigationController);
        }
        this.mouseController = this.createMouseController(_options);
        this.disposables.add(this.mouseController);
        this.onDidChangeFocus(this._onFocusChange, this, this.disposables);
        this.onDidChangeSelection(this._onSelectionChange, this, this.disposables);
        if (this.accessibilityProvider) {
            this.ariaLabel = this.accessibilityProvider.getWidgetAriaLabel();
        }
        if (this._options.multipleSelectionSupport !== false) {
            this.view.domNode.setAttribute('aria-multiselectable', 'true');
        }
    }
    createListView(container, virtualDelegate, renderers, viewOptions) {
        return new ListView(container, virtualDelegate, renderers, viewOptions);
    }
    createMouseController(options) {
        return new MouseController(this);
    }
    updateOptions(optionsUpdate = {}) {
        this._options = { ...this._options, ...optionsUpdate };
        this.typeNavigationController?.updateOptions(this._options);
        if (this._options.multipleSelectionController !== undefined) {
            if (this._options.multipleSelectionSupport) {
                this.view.domNode.setAttribute('aria-multiselectable', 'true');
            }
            else {
                this.view.domNode.removeAttribute('aria-multiselectable');
            }
        }
        this.mouseController.updateOptions(optionsUpdate);
        this.keyboardController?.updateOptions(optionsUpdate);
        this.view.updateOptions(optionsUpdate);
    }
    get options() {
        return this._options;
    }
    splice(start, deleteCount, elements = []) {
        if (start < 0 || start > this.view.length) {
            throw new ListError(this.user, `Invalid start index: ${start}`);
        }
        if (deleteCount < 0) {
            throw new ListError(this.user, `Invalid delete count: ${deleteCount}`);
        }
        if (deleteCount === 0 && elements.length === 0) {
            return;
        }
        this.eventBufferer.bufferEvents(() => this.spliceable.splice(start, deleteCount, elements));
    }
    updateWidth(index) {
        this.view.updateWidth(index);
    }
    updateElementHeight(index, size) {
        this.view.updateElementHeight(index, size, null);
    }
    rerender() {
        this.view.rerender();
    }
    element(index) {
        return this.view.element(index);
    }
    indexOf(element) {
        return this.view.indexOf(element);
    }
    indexAt(position) {
        return this.view.indexAt(position);
    }
    get length() {
        return this.view.length;
    }
    get contentHeight() {
        return this.view.contentHeight;
    }
    get contentWidth() {
        return this.view.contentWidth;
    }
    get onDidChangeContentHeight() {
        return this.view.onDidChangeContentHeight;
    }
    get onDidChangeContentWidth() {
        return this.view.onDidChangeContentWidth;
    }
    get scrollTop() {
        return this.view.getScrollTop();
    }
    set scrollTop(scrollTop) {
        this.view.setScrollTop(scrollTop);
    }
    get scrollLeft() {
        return this.view.getScrollLeft();
    }
    set scrollLeft(scrollLeft) {
        this.view.setScrollLeft(scrollLeft);
    }
    get scrollHeight() {
        return this.view.scrollHeight;
    }
    get renderHeight() {
        return this.view.renderHeight;
    }
    get firstVisibleIndex() {
        return this.view.firstVisibleIndex;
    }
    get firstMostlyVisibleIndex() {
        return this.view.firstMostlyVisibleIndex;
    }
    get lastVisibleIndex() {
        return this.view.lastVisibleIndex;
    }
    get ariaLabel() {
        return this._ariaLabel;
    }
    set ariaLabel(value) {
        this._ariaLabel = value;
        this.view.domNode.setAttribute('aria-label', value);
    }
    domFocus() {
        this.view.domNode.focus({ preventScroll: true });
    }
    layout(height, width) {
        this.view.layout(height, width);
    }
    triggerTypeNavigation() {
        this.typeNavigationController?.trigger();
    }
    setSelection(indexes, browserEvent) {
        for (const index of indexes) {
            if (index < 0 || index >= this.length) {
                throw new ListError(this.user, `Invalid index ${index}`);
            }
        }
        this.selection.set(indexes, browserEvent);
    }
    getSelection() {
        return this.selection.get();
    }
    getSelectedElements() {
        return this.getSelection().map(i => this.view.element(i));
    }
    setAnchor(index) {
        if (typeof index === 'undefined') {
            this.anchor.set([]);
            return;
        }
        if (index < 0 || index >= this.length) {
            throw new ListError(this.user, `Invalid index ${index}`);
        }
        this.anchor.set([index]);
    }
    getAnchor() {
        return this.anchor.get().at(0);
    }
    getAnchorElement() {
        const anchor = this.getAnchor();
        return typeof anchor === 'undefined' ? undefined : this.element(anchor);
    }
    setFocus(indexes, browserEvent) {
        for (const index of indexes) {
            if (index < 0 || index >= this.length) {
                throw new ListError(this.user, `Invalid index ${index}`);
            }
        }
        this.focus.set(indexes, browserEvent);
    }
    focusNext(n = 1, loop = false, browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const focus = this.focus.get();
        const index = this.findNextIndex(focus.length > 0 ? focus[0] + n : 0, loop, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    focusPrevious(n = 1, loop = false, browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const focus = this.focus.get();
        const index = this.findPreviousIndex(focus.length > 0 ? focus[0] - n : 0, loop, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    async focusNextPage(browserEvent, filter) {
        let lastPageIndex = this.view.indexAt(this.view.getScrollTop() + this.view.renderHeight);
        lastPageIndex = lastPageIndex === 0 ? 0 : lastPageIndex - 1;
        const currentlyFocusedElementIndex = this.getFocus()[0];
        if (currentlyFocusedElementIndex !== lastPageIndex && (currentlyFocusedElementIndex === undefined || lastPageIndex > currentlyFocusedElementIndex)) {
            const lastGoodPageIndex = this.findPreviousIndex(lastPageIndex, false, filter);
            if (lastGoodPageIndex > -1 && currentlyFocusedElementIndex !== lastGoodPageIndex) {
                this.setFocus([lastGoodPageIndex], browserEvent);
            }
            else {
                this.setFocus([lastPageIndex], browserEvent);
            }
        }
        else {
            const previousScrollTop = this.view.getScrollTop();
            let nextpageScrollTop = previousScrollTop + this.view.renderHeight;
            if (lastPageIndex > currentlyFocusedElementIndex) {
                // scroll last page element to the top only if the last page element is below the focused element
                nextpageScrollTop -= this.view.elementHeight(lastPageIndex);
            }
            this.view.setScrollTop(nextpageScrollTop);
            if (this.view.getScrollTop() !== previousScrollTop) {
                this.setFocus([]);
                // Let the scroll event listener run
                await timeout(0);
                await this.focusNextPage(browserEvent, filter);
            }
        }
    }
    async focusPreviousPage(browserEvent, filter, getPaddingTop = () => 0) {
        let firstPageIndex;
        const paddingTop = getPaddingTop();
        const scrollTop = this.view.getScrollTop() + paddingTop;
        if (scrollTop === 0) {
            firstPageIndex = this.view.indexAt(scrollTop);
        }
        else {
            firstPageIndex = this.view.indexAfter(scrollTop - 1);
        }
        const currentlyFocusedElementIndex = this.getFocus()[0];
        if (currentlyFocusedElementIndex !== firstPageIndex && (currentlyFocusedElementIndex === undefined || currentlyFocusedElementIndex >= firstPageIndex)) {
            const firstGoodPageIndex = this.findNextIndex(firstPageIndex, false, filter);
            if (firstGoodPageIndex > -1 && currentlyFocusedElementIndex !== firstGoodPageIndex) {
                this.setFocus([firstGoodPageIndex], browserEvent);
            }
            else {
                this.setFocus([firstPageIndex], browserEvent);
            }
        }
        else {
            const previousScrollTop = scrollTop;
            this.view.setScrollTop(scrollTop - this.view.renderHeight - paddingTop);
            if (this.view.getScrollTop() + getPaddingTop() !== previousScrollTop) {
                this.setFocus([]);
                // Let the scroll event listener run
                await timeout(0);
                await this.focusPreviousPage(browserEvent, filter, getPaddingTop);
            }
        }
    }
    focusLast(browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const index = this.findPreviousIndex(this.length - 1, false, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    focusFirst(browserEvent, filter) {
        this.focusNth(0, browserEvent, filter);
    }
    focusNth(n, browserEvent, filter) {
        if (this.length === 0) {
            return;
        }
        const index = this.findNextIndex(n, false, filter);
        if (index > -1) {
            this.setFocus([index], browserEvent);
        }
    }
    findNextIndex(index, loop = false, filter) {
        for (let i = 0; i < this.length; i++) {
            if (index >= this.length && !loop) {
                return -1;
            }
            index = index % this.length;
            if (!filter || filter(this.element(index))) {
                return index;
            }
            index++;
        }
        return -1;
    }
    findPreviousIndex(index, loop = false, filter) {
        for (let i = 0; i < this.length; i++) {
            if (index < 0 && !loop) {
                return -1;
            }
            index = (this.length + (index % this.length)) % this.length;
            if (!filter || filter(this.element(index))) {
                return index;
            }
            index--;
        }
        return -1;
    }
    getFocus() {
        return this.focus.get();
    }
    getFocusedElements() {
        return this.getFocus().map(i => this.view.element(i));
    }
    reveal(index, relativeTop, paddingTop = 0) {
        if (index < 0 || index >= this.length) {
            throw new ListError(this.user, `Invalid index ${index}`);
        }
        const scrollTop = this.view.getScrollTop();
        const elementTop = this.view.elementTop(index);
        const elementHeight = this.view.elementHeight(index);
        if (isNumber(relativeTop)) {
            // y = mx + b
            const m = elementHeight - this.view.renderHeight + paddingTop;
            this.view.setScrollTop(m * clamp(relativeTop, 0, 1) + elementTop - paddingTop);
        }
        else {
            const viewItemBottom = elementTop + elementHeight;
            const scrollBottom = scrollTop + this.view.renderHeight;
            if (elementTop < scrollTop + paddingTop && viewItemBottom >= scrollBottom) {
                // The element is already overflowing the viewport, no-op
            }
            else if (elementTop < scrollTop + paddingTop || (viewItemBottom >= scrollBottom && elementHeight >= this.view.renderHeight)) {
                this.view.setScrollTop(elementTop - paddingTop);
            }
            else if (viewItemBottom >= scrollBottom) {
                this.view.setScrollTop(viewItemBottom - this.view.renderHeight);
            }
        }
    }
    /**
     * Returns the relative position of an element rendered in the list.
     * Returns `null` if the element isn't *entirely* in the visible viewport.
     */
    getRelativeTop(index, paddingTop = 0) {
        if (index < 0 || index >= this.length) {
            throw new ListError(this.user, `Invalid index ${index}`);
        }
        const scrollTop = this.view.getScrollTop();
        const elementTop = this.view.elementTop(index);
        const elementHeight = this.view.elementHeight(index);
        if (elementTop < scrollTop + paddingTop || elementTop + elementHeight > scrollTop + this.view.renderHeight) {
            return null;
        }
        // y = mx + b
        const m = elementHeight - this.view.renderHeight + paddingTop;
        return Math.abs((scrollTop + paddingTop - elementTop) / m);
    }
    isDOMFocused() {
        return isActiveElement(this.view.domNode);
    }
    getHTMLElement() {
        return this.view.domNode;
    }
    getScrollableElement() {
        return this.view.scrollableElementDomNode;
    }
    getElementID(index) {
        return this.view.getElementDomId(index);
    }
    getElementTop(index) {
        return this.view.elementTop(index);
    }
    style(styles) {
        this.styleController.style(styles);
    }
    toListEvent({ indexes, browserEvent }) {
        return { indexes, elements: indexes.map(i => this.view.element(i)), browserEvent };
    }
    _onFocusChange() {
        const focus = this.focus.get();
        this.view.domNode.classList.toggle('element-focused', focus.length > 0);
        this.onDidChangeActiveDescendant();
    }
    onDidChangeActiveDescendant() {
        const focus = this.focus.get();
        if (focus.length > 0) {
            let id;
            if (this.accessibilityProvider?.getActiveDescendantId) {
                id = this.accessibilityProvider.getActiveDescendantId(this.view.element(focus[0]));
            }
            this.view.domNode.setAttribute('aria-activedescendant', id || this.view.getElementDomId(focus[0]));
        }
        else {
            this.view.domNode.removeAttribute('aria-activedescendant');
        }
    }
    _onSelectionChange() {
        const selection = this.selection.get();
        this.view.domNode.classList.toggle('selection-none', selection.length === 0);
        this.view.domNode.classList.toggle('selection-single', selection.length === 1);
        this.view.domNode.classList.toggle('selection-multiple', selection.length > 1);
    }
    dispose() {
        this._onDidDispose.fire();
        this.disposables.dispose();
        this._onDidDispose.dispose();
    }
}
__decorate([
    memoize
], List.prototype, "onDidChangeFocus", null);
__decorate([
    memoize
], List.prototype, "onDidChangeSelection", null);
__decorate([
    memoize
], List.prototype, "onContextMenu", null);
__decorate([
    memoize
], List.prototype, "onKeyDown", null);
__decorate([
    memoize
], List.prototype, "onKeyUp", null);
__decorate([
    memoize
], List.prototype, "onKeyPress", null);
__decorate([
    memoize
], List.prototype, "onDidFocus", null);
__decorate([
    memoize
], List.prototype, "onDidBlur", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvbGlzdC9saXN0V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBR2hHLE9BQU8sRUFBYSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3BKLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQVksTUFBTSxpQkFBaUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFakQsT0FBTyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEs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
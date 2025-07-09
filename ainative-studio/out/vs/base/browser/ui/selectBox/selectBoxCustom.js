/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import * as domStylesheetsJs from '../../domStylesheets.js';
import * as cssJs from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { renderMarkdown } from '../../markdownRenderer.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { List } from '../list/listWidget.js';
import * as arrays from '../../../common/arrays.js';
import { Emitter, Event } from '../../../common/event.js';
import { KeyCodeUtils } from '../../../common/keyCodes.js';
import { Disposable } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
import './selectBoxCustom.css';
import { localize } from '../../../../nls.js';
const $ = dom.$;
const SELECT_OPTION_ENTRY_TEMPLATE_ID = 'selectOption.entry.template';
class SelectListRenderer {
    get templateId() { return SELECT_OPTION_ENTRY_TEMPLATE_ID; }
    renderTemplate(container) {
        const data = Object.create(null);
        data.root = container;
        data.text = dom.append(container, $('.option-text'));
        data.detail = dom.append(container, $('.option-detail'));
        data.decoratorRight = dom.append(container, $('.option-decorator-right'));
        return data;
    }
    renderElement(element, index, templateData) {
        const data = templateData;
        const text = element.text;
        const detail = element.detail;
        const decoratorRight = element.decoratorRight;
        const isDisabled = element.isDisabled;
        data.text.textContent = text;
        data.detail.textContent = !!detail ? detail : '';
        data.decoratorRight.innerText = !!decoratorRight ? decoratorRight : '';
        // pseudo-select disabled option
        if (isDisabled) {
            data.root.classList.add('option-disabled');
        }
        else {
            // Make sure we do class removal from prior template rendering
            data.root.classList.remove('option-disabled');
        }
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
export class SelectBoxList extends Disposable {
    static { this.DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN = 32; }
    static { this.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN = 2; }
    static { this.DEFAULT_MINIMUM_VISIBLE_OPTIONS = 3; }
    constructor(options, selected, contextViewProvider, styles, selectBoxOptions) {
        super();
        this.options = [];
        this._currentSelection = 0;
        this._hasDetails = false;
        this._skipLayout = false;
        this._sticky = false; // for dev purposes only
        this._isVisible = false;
        this.styles = styles;
        this.selectBoxOptions = selectBoxOptions || Object.create(null);
        if (typeof this.selectBoxOptions.minBottomMargin !== 'number') {
            this.selectBoxOptions.minBottomMargin = SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_BOTTOM_MARGIN;
        }
        else if (this.selectBoxOptions.minBottomMargin < 0) {
            this.selectBoxOptions.minBottomMargin = 0;
        }
        this.selectElement = document.createElement('select');
        // Use custom CSS vars for padding calculation
        this.selectElement.className = 'monaco-select-box monaco-select-box-dropdown-padding';
        if (typeof this.selectBoxOptions.ariaLabel === 'string') {
            this.selectElement.setAttribute('aria-label', this.selectBoxOptions.ariaLabel);
        }
        if (typeof this.selectBoxOptions.ariaDescription === 'string') {
            this.selectElement.setAttribute('aria-description', this.selectBoxOptions.ariaDescription);
        }
        this._onDidSelect = new Emitter();
        this._register(this._onDidSelect);
        this.registerListeners();
        this.constructSelectDropDown(contextViewProvider);
        this.selected = selected || 0;
        if (options) {
            this.setOptions(options, selected);
        }
        this.initStyleSheet();
    }
    setTitle(title) {
        if (!this._hover && title) {
            this._hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this.selectElement, title));
        }
        else if (this._hover) {
            this._hover.update(title);
        }
    }
    // IDelegate - List renderer
    getHeight() {
        return 22;
    }
    getTemplateId() {
        return SELECT_OPTION_ENTRY_TEMPLATE_ID;
    }
    constructSelectDropDown(contextViewProvider) {
        // SetUp ContextView container to hold select Dropdown
        this.contextViewProvider = contextViewProvider;
        this.selectDropDownContainer = dom.$('.monaco-select-box-dropdown-container');
        // Use custom CSS vars for padding calculation (shared with parent select)
        this.selectDropDownContainer.classList.add('monaco-select-box-dropdown-padding');
        // Setup container for select option details
        this.selectionDetailsPane = dom.append(this.selectDropDownContainer, $('.select-box-details-pane'));
        // Create span flex box item/div we can measure and control
        const widthControlOuterDiv = dom.append(this.selectDropDownContainer, $('.select-box-dropdown-container-width-control'));
        const widthControlInnerDiv = dom.append(widthControlOuterDiv, $('.width-control-div'));
        this.widthControlElement = document.createElement('span');
        this.widthControlElement.className = 'option-text-width-control';
        dom.append(widthControlInnerDiv, this.widthControlElement);
        // Always default to below position
        this._dropDownPosition = 0 /* AnchorPosition.BELOW */;
        // Inline stylesheet for themes
        this.styleElement = domStylesheetsJs.createStyleSheet(this.selectDropDownContainer);
        // Prevent dragging of dropdown #114329
        this.selectDropDownContainer.setAttribute('draggable', 'true');
        this._register(dom.addDisposableListener(this.selectDropDownContainer, dom.EventType.DRAG_START, (e) => {
            dom.EventHelper.stop(e, true);
        }));
    }
    registerListeners() {
        // Parent native select keyboard listeners
        this._register(dom.addStandardDisposableListener(this.selectElement, 'change', (e) => {
            this.selected = e.target.selectedIndex;
            this._onDidSelect.fire({
                index: e.target.selectedIndex,
                selected: e.target.value
            });
            if (!!this.options[this.selected] && !!this.options[this.selected].text) {
                this.setTitle(this.options[this.selected].text);
            }
        }));
        // Have to implement both keyboard and mouse controllers to handle disabled options
        // Intercept mouse events to override normal select actions on parents
        this._register(dom.addDisposableListener(this.selectElement, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e);
            if (this._isVisible) {
                this.hideSelectDropDown(true);
            }
            else {
                this.showSelectDropDown();
            }
        }));
        this._register(dom.addDisposableListener(this.selectElement, dom.EventType.MOUSE_DOWN, (e) => {
            dom.EventHelper.stop(e);
        }));
        // Intercept touch events
        // The following implementation is slightly different from the mouse event handlers above.
        // Use the following helper variable, otherwise the list flickers.
        let listIsVisibleOnTouchStart;
        this._register(dom.addDisposableListener(this.selectElement, 'touchstart', (e) => {
            listIsVisibleOnTouchStart = this._isVisible;
        }));
        this._register(dom.addDisposableListener(this.selectElement, 'touchend', (e) => {
            dom.EventHelper.stop(e);
            if (listIsVisibleOnTouchStart) {
                this.hideSelectDropDown(true);
            }
            else {
                this.showSelectDropDown();
            }
        }));
        // Intercept keyboard handling
        this._register(dom.addDisposableListener(this.selectElement, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            let showDropDown = false;
            // Create and drop down select list on keyboard select
            if (isMacintosh) {
                if (event.keyCode === 18 /* KeyCode.DownArrow */ || event.keyCode === 16 /* KeyCode.UpArrow */ || event.keyCode === 10 /* KeyCode.Space */ || event.keyCode === 3 /* KeyCode.Enter */) {
                    showDropDown = true;
                }
            }
            else {
                if (event.keyCode === 18 /* KeyCode.DownArrow */ && event.altKey || event.keyCode === 16 /* KeyCode.UpArrow */ && event.altKey || event.keyCode === 10 /* KeyCode.Space */ || event.keyCode === 3 /* KeyCode.Enter */) {
                    showDropDown = true;
                }
            }
            if (showDropDown) {
                this.showSelectDropDown();
                dom.EventHelper.stop(e, true);
            }
        }));
    }
    get onDidSelect() {
        return this._onDidSelect.event;
    }
    setOptions(options, selected) {
        if (!arrays.equals(this.options, options)) {
            this.options = options;
            this.selectElement.options.length = 0;
            this._hasDetails = false;
            this._cachedMaxDetailsHeight = undefined;
            this.options.forEach((option, index) => {
                this.selectElement.add(this.createOption(option.text, index, option.isDisabled));
                if (typeof option.description === 'string') {
                    this._hasDetails = true;
                }
            });
        }
        if (selected !== undefined) {
            this.select(selected);
            // Set current = selected since this is not necessarily a user exit
            this._currentSelection = this.selected;
        }
    }
    setEnabled(enable) {
        this.selectElement.disabled = !enable;
    }
    setOptionsList() {
        // Mirror options in drop-down
        // Populate select list for non-native select mode
        this.selectList?.splice(0, this.selectList.length, this.options);
    }
    select(index) {
        if (index >= 0 && index < this.options.length) {
            this.selected = index;
        }
        else if (index > this.options.length - 1) {
            // Adjust index to end of list
            // This could make client out of sync with the select
            this.select(this.options.length - 1);
        }
        else if (this.selected < 0) {
            this.selected = 0;
        }
        this.selectElement.selectedIndex = this.selected;
        if (!!this.options[this.selected] && !!this.options[this.selected].text) {
            this.setTitle(this.options[this.selected].text);
        }
    }
    setAriaLabel(label) {
        this.selectBoxOptions.ariaLabel = label;
        this.selectElement.setAttribute('aria-label', this.selectBoxOptions.ariaLabel);
    }
    focus() {
        if (this.selectElement) {
            this.selectElement.tabIndex = 0;
            this.selectElement.focus();
        }
    }
    blur() {
        if (this.selectElement) {
            this.selectElement.tabIndex = -1;
            this.selectElement.blur();
        }
    }
    setFocusable(focusable) {
        this.selectElement.tabIndex = focusable ? 0 : -1;
    }
    render(container) {
        this.container = container;
        container.classList.add('select-container');
        container.appendChild(this.selectElement);
        this.styleSelectElement();
    }
    initStyleSheet() {
        const content = [];
        // Style non-native select mode
        if (this.styles.listFocusBackground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.focused { background-color: ${this.styles.listFocusBackground} !important; }`);
        }
        if (this.styles.listFocusForeground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.focused { color: ${this.styles.listFocusForeground} !important; }`);
        }
        if (this.styles.decoratorRightForeground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.focused) .option-decorator-right { color: ${this.styles.decoratorRightForeground}; }`);
        }
        if (this.styles.selectBackground && this.styles.selectBorder && this.styles.selectBorder !== this.styles.selectBackground) {
            content.push(`.monaco-select-box-dropdown-container { border: 1px solid ${this.styles.selectBorder} } `);
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-top { border-top: 1px solid ${this.styles.selectBorder} } `);
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-bottom { border-bottom: 1px solid ${this.styles.selectBorder} } `);
        }
        else if (this.styles.selectListBorder) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-top { border-top: 1px solid ${this.styles.selectListBorder} } `);
            content.push(`.monaco-select-box-dropdown-container > .select-box-details-pane.border-bottom { border-bottom: 1px solid ${this.styles.selectListBorder} } `);
        }
        // Hover foreground - ignore for disabled options
        if (this.styles.listHoverForeground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.option-disabled):not(.focused):hover { color: ${this.styles.listHoverForeground} !important; }`);
        }
        // Hover background - ignore for disabled options
        if (this.styles.listHoverBackground) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.option-disabled):not(.focused):hover { background-color: ${this.styles.listHoverBackground} !important; }`);
        }
        // Match quick input outline styles - ignore for disabled options
        if (this.styles.listFocusOutline) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.focused { outline: 1.6px dotted ${this.styles.listFocusOutline} !important; outline-offset: -1.6px !important; }`);
        }
        if (this.styles.listHoverOutline) {
            content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row:not(.option-disabled):not(.focused):hover { outline: 1.6px dashed ${this.styles.listHoverOutline} !important; outline-offset: -1.6px !important; }`);
        }
        // Clear list styles on focus and on hover for disabled options
        content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.option-disabled.focused { background-color: transparent !important; color: inherit !important; outline: none !important; }`);
        content.push(`.monaco-select-box-dropdown-container > .select-box-dropdown-list-container .monaco-list .monaco-list-row.option-disabled:hover { background-color: transparent !important; color: inherit !important; outline: none !important; }`);
        this.styleElement.textContent = content.join('\n');
    }
    styleSelectElement() {
        const background = this.styles.selectBackground ?? '';
        const foreground = this.styles.selectForeground ?? '';
        const border = this.styles.selectBorder ?? '';
        this.selectElement.style.backgroundColor = background;
        this.selectElement.style.color = foreground;
        this.selectElement.style.borderColor = border;
    }
    styleList() {
        const background = this.styles.selectBackground ?? '';
        const listBackground = cssJs.asCssValueWithDefault(this.styles.selectListBackground, background);
        this.selectDropDownListContainer.style.backgroundColor = listBackground;
        this.selectionDetailsPane.style.backgroundColor = listBackground;
        const optionsBorder = this.styles.focusBorder ?? '';
        this.selectDropDownContainer.style.outlineColor = optionsBorder;
        this.selectDropDownContainer.style.outlineOffset = '-1px';
        this.selectList.style(this.styles);
    }
    createOption(value, index, disabled) {
        const option = document.createElement('option');
        option.value = value;
        option.text = value;
        option.disabled = !!disabled;
        return option;
    }
    // ContextView dropdown methods
    showSelectDropDown() {
        this.selectionDetailsPane.innerText = '';
        if (!this.contextViewProvider || this._isVisible) {
            return;
        }
        // Lazily create and populate list only at open, moved from constructor
        this.createSelectList(this.selectDropDownContainer);
        this.setOptionsList();
        // This allows us to flip the position based on measurement
        // Set drop-down position above/below from required height and margins
        // If pre-layout cannot fit at least one option do not show drop-down
        this.contextViewProvider.showContextView({
            getAnchor: () => this.selectElement,
            render: (container) => this.renderSelectDropDown(container, true),
            layout: () => {
                this.layoutSelectDropDown();
            },
            onHide: () => {
                this.selectDropDownContainer.classList.remove('visible');
                this.selectElement.classList.remove('synthetic-focus');
            },
            anchorPosition: this._dropDownPosition
        }, this.selectBoxOptions.optionsAsChildren ? this.container : undefined);
        // Hide so we can relay out
        this._isVisible = true;
        this.hideSelectDropDown(false);
        this.contextViewProvider.showContextView({
            getAnchor: () => this.selectElement,
            render: (container) => this.renderSelectDropDown(container),
            layout: () => this.layoutSelectDropDown(),
            onHide: () => {
                this.selectDropDownContainer.classList.remove('visible');
                this.selectElement.classList.remove('synthetic-focus');
            },
            anchorPosition: this._dropDownPosition
        }, this.selectBoxOptions.optionsAsChildren ? this.container : undefined);
        // Track initial selection the case user escape, blur
        this._currentSelection = this.selected;
        this._isVisible = true;
        this.selectElement.setAttribute('aria-expanded', 'true');
    }
    hideSelectDropDown(focusSelect) {
        if (!this.contextViewProvider || !this._isVisible) {
            return;
        }
        this._isVisible = false;
        this.selectElement.setAttribute('aria-expanded', 'false');
        if (focusSelect) {
            this.selectElement.focus();
        }
        this.contextViewProvider.hideContextView();
    }
    renderSelectDropDown(container, preLayoutPosition) {
        container.appendChild(this.selectDropDownContainer);
        // Pre-Layout allows us to change position
        this.layoutSelectDropDown(preLayoutPosition);
        return {
            dispose: () => {
                // contextView will dispose itself if moving from one View to another
                this.selectDropDownContainer.remove(); // remove to take out the CSS rules we add
            }
        };
    }
    // Iterate over detailed descriptions, find max height
    measureMaxDetailsHeight() {
        let maxDetailsPaneHeight = 0;
        this.options.forEach((_option, index) => {
            this.updateDetail(index);
            if (this.selectionDetailsPane.offsetHeight > maxDetailsPaneHeight) {
                maxDetailsPaneHeight = this.selectionDetailsPane.offsetHeight;
            }
        });
        return maxDetailsPaneHeight;
    }
    layoutSelectDropDown(preLayoutPosition) {
        // Avoid recursion from layout called in onListFocus
        if (this._skipLayout) {
            return false;
        }
        // Layout ContextView drop down select list and container
        // Have to manage our vertical overflow, sizing, position below or above
        // Position has to be determined and set prior to contextView instantiation
        if (this.selectList) {
            // Make visible to enable measurements
            this.selectDropDownContainer.classList.add('visible');
            const window = dom.getWindow(this.selectElement);
            const selectPosition = dom.getDomNodePagePosition(this.selectElement);
            const styles = dom.getWindow(this.selectElement).getComputedStyle(this.selectElement);
            const verticalPadding = parseFloat(styles.getPropertyValue('--dropdown-padding-top')) + parseFloat(styles.getPropertyValue('--dropdown-padding-bottom'));
            const maxSelectDropDownHeightBelow = (window.innerHeight - selectPosition.top - selectPosition.height - (this.selectBoxOptions.minBottomMargin || 0));
            const maxSelectDropDownHeightAbove = (selectPosition.top - SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN);
            // Determine optimal width - min(longest option), opt(parent select, excluding margins), max(ContextView controlled)
            const selectWidth = this.selectElement.offsetWidth;
            const selectMinWidth = this.setWidthControlElement(this.widthControlElement);
            const selectOptimalWidth = Math.max(selectMinWidth, Math.round(selectWidth)).toString() + 'px';
            this.selectDropDownContainer.style.width = selectOptimalWidth;
            // Get initial list height and determine space above and below
            this.selectList.getHTMLElement().style.height = '';
            this.selectList.layout();
            let listHeight = this.selectList.contentHeight;
            if (this._hasDetails && this._cachedMaxDetailsHeight === undefined) {
                this._cachedMaxDetailsHeight = this.measureMaxDetailsHeight();
            }
            const maxDetailsPaneHeight = this._hasDetails ? this._cachedMaxDetailsHeight : 0;
            const minRequiredDropDownHeight = listHeight + verticalPadding + maxDetailsPaneHeight;
            const maxVisibleOptionsBelow = ((Math.floor((maxSelectDropDownHeightBelow - verticalPadding - maxDetailsPaneHeight) / this.getHeight())));
            const maxVisibleOptionsAbove = ((Math.floor((maxSelectDropDownHeightAbove - verticalPadding - maxDetailsPaneHeight) / this.getHeight())));
            // If we are only doing pre-layout check/adjust position only
            // Calculate vertical space available, flip up if insufficient
            // Use reflected padding on parent select, ContextView style
            // properties not available before DOM attachment
            if (preLayoutPosition) {
                // Check if select moved out of viewport , do not open
                // If at least one option cannot be shown, don't open the drop-down or hide/remove if open
                if ((selectPosition.top + selectPosition.height) > (window.innerHeight - 22)
                    || selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN
                    || ((maxVisibleOptionsBelow < 1) && (maxVisibleOptionsAbove < 1))) {
                    // Indicate we cannot open
                    return false;
                }
                // Determine if we have to flip up
                // Always show complete list items - never more than Max available vertical height
                if (maxVisibleOptionsBelow < SelectBoxList.DEFAULT_MINIMUM_VISIBLE_OPTIONS
                    && maxVisibleOptionsAbove > maxVisibleOptionsBelow
                    && this.options.length > maxVisibleOptionsBelow) {
                    this._dropDownPosition = 1 /* AnchorPosition.ABOVE */;
                    this.selectDropDownListContainer.remove();
                    this.selectionDetailsPane.remove();
                    this.selectDropDownContainer.appendChild(this.selectionDetailsPane);
                    this.selectDropDownContainer.appendChild(this.selectDropDownListContainer);
                    this.selectionDetailsPane.classList.remove('border-top');
                    this.selectionDetailsPane.classList.add('border-bottom');
                }
                else {
                    this._dropDownPosition = 0 /* AnchorPosition.BELOW */;
                    this.selectDropDownListContainer.remove();
                    this.selectionDetailsPane.remove();
                    this.selectDropDownContainer.appendChild(this.selectDropDownListContainer);
                    this.selectDropDownContainer.appendChild(this.selectionDetailsPane);
                    this.selectionDetailsPane.classList.remove('border-bottom');
                    this.selectionDetailsPane.classList.add('border-top');
                }
                // Do full layout on showSelectDropDown only
                return true;
            }
            // Check if select out of viewport or cutting into status bar
            if ((selectPosition.top + selectPosition.height) > (window.innerHeight - 22)
                || selectPosition.top < SelectBoxList.DEFAULT_DROPDOWN_MINIMUM_TOP_MARGIN
                || (this._dropDownPosition === 0 /* AnchorPosition.BELOW */ && maxVisibleOptionsBelow < 1)
                || (this._dropDownPosition === 1 /* AnchorPosition.ABOVE */ && maxVisibleOptionsAbove < 1)) {
                // Cannot properly layout, close and hide
                this.hideSelectDropDown(true);
                return false;
            }
            // SetUp list dimensions and layout - account for container padding
            // Use position to check above or below available space
            if (this._dropDownPosition === 0 /* AnchorPosition.BELOW */) {
                if (this._isVisible && maxVisibleOptionsBelow + maxVisibleOptionsAbove < 1) {
                    // If drop-down is visible, must be doing a DOM re-layout, hide since we don't fit
                    // Hide drop-down, hide contextview, focus on parent select
                    this.hideSelectDropDown(true);
                    return false;
                }
                // Adjust list height to max from select bottom to margin (default/minBottomMargin)
                if (minRequiredDropDownHeight > maxSelectDropDownHeightBelow) {
                    listHeight = (maxVisibleOptionsBelow * this.getHeight());
                }
            }
            else {
                if (minRequiredDropDownHeight > maxSelectDropDownHeightAbove) {
                    listHeight = (maxVisibleOptionsAbove * this.getHeight());
                }
            }
            // Set adjusted list height and relayout
            this.selectList.layout(listHeight);
            this.selectList.domFocus();
            // Finally set focus on selected item
            if (this.selectList.length > 0) {
                this.selectList.setFocus([this.selected || 0]);
                this.selectList.reveal(this.selectList.getFocus()[0] || 0);
            }
            if (this._hasDetails) {
                // Leave the selectDropDownContainer to size itself according to children (list + details) - #57447
                this.selectList.getHTMLElement().style.height = (listHeight + verticalPadding) + 'px';
                this.selectDropDownContainer.style.height = '';
            }
            else {
                this.selectDropDownContainer.style.height = (listHeight + verticalPadding) + 'px';
            }
            this.updateDetail(this.selected);
            this.selectDropDownContainer.style.width = selectOptimalWidth;
            // Maintain focus outline on parent select as well as list container - tabindex for focus
            this.selectDropDownListContainer.setAttribute('tabindex', '0');
            this.selectElement.classList.add('synthetic-focus');
            this.selectDropDownContainer.classList.add('synthetic-focus');
            return true;
        }
        else {
            return false;
        }
    }
    setWidthControlElement(container) {
        let elementWidth = 0;
        if (container) {
            let longest = 0;
            let longestLength = 0;
            this.options.forEach((option, index) => {
                const detailLength = !!option.detail ? option.detail.length : 0;
                const rightDecoratorLength = !!option.decoratorRight ? option.decoratorRight.length : 0;
                const len = option.text.length + detailLength + rightDecoratorLength;
                if (len > longestLength) {
                    longest = index;
                    longestLength = len;
                }
            });
            container.textContent = this.options[longest].text + (!!this.options[longest].decoratorRight ? (this.options[longest].decoratorRight + ' ') : '');
            elementWidth = dom.getTotalWidth(container);
        }
        return elementWidth;
    }
    createSelectList(parent) {
        // If we have already constructive list on open, skip
        if (this.selectList) {
            return;
        }
        // SetUp container for list
        this.selectDropDownListContainer = dom.append(parent, $('.select-box-dropdown-list-container'));
        this.listRenderer = new SelectListRenderer();
        this.selectList = this._register(new List('SelectBoxCustom', this.selectDropDownListContainer, this, [this.listRenderer], {
            useShadows: false,
            verticalScrollMode: 3 /* ScrollbarVisibility.Visible */,
            keyboardSupport: false,
            mouseSupport: false,
            accessibilityProvider: {
                getAriaLabel: element => {
                    let label = element.text;
                    if (element.detail) {
                        label += `. ${element.detail}`;
                    }
                    if (element.decoratorRight) {
                        label += `. ${element.decoratorRight}`;
                    }
                    if (element.description) {
                        label += `. ${element.description}`;
                    }
                    return label;
                },
                getWidgetAriaLabel: () => localize({ key: 'selectBox', comment: ['Behave like native select dropdown element.'] }, "Select Box"),
                getRole: () => isMacintosh ? '' : 'option',
                getWidgetRole: () => 'listbox'
            }
        }));
        if (this.selectBoxOptions.ariaLabel) {
            this.selectList.ariaLabel = this.selectBoxOptions.ariaLabel;
        }
        // SetUp list keyboard controller - control navigation, disabled items, focus
        const onKeyDown = this._register(new DomEmitter(this.selectDropDownListContainer, 'keydown'));
        const onSelectDropDownKeyDown = Event.chain(onKeyDown.event, $ => $.filter(() => this.selectList.length > 0)
            .map(e => new StandardKeyboardEvent(e)));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 3 /* KeyCode.Enter */))(this.onEnter, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 2 /* KeyCode.Tab */))(this.onEnter, this)); // Tab should behave the same as enter, #79339
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 9 /* KeyCode.Escape */))(this.onEscape, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 16 /* KeyCode.UpArrow */))(this.onUpArrow, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 18 /* KeyCode.DownArrow */))(this.onDownArrow, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 12 /* KeyCode.PageDown */))(this.onPageDown, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 11 /* KeyCode.PageUp */))(this.onPageUp, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 14 /* KeyCode.Home */))(this.onHome, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => e.keyCode === 13 /* KeyCode.End */))(this.onEnd, this));
        this._register(Event.chain(onSelectDropDownKeyDown, $ => $.filter(e => (e.keyCode >= 21 /* KeyCode.Digit0 */ && e.keyCode <= 56 /* KeyCode.KeyZ */) || (e.keyCode >= 85 /* KeyCode.Semicolon */ && e.keyCode <= 113 /* KeyCode.NumpadDivide */)))(this.onCharacter, this));
        // SetUp list mouse controller - control navigation, disabled items, focus
        this._register(dom.addDisposableListener(this.selectList.getHTMLElement(), dom.EventType.POINTER_UP, e => this.onPointerUp(e)));
        this._register(this.selectList.onMouseOver(e => typeof e.index !== 'undefined' && this.selectList.setFocus([e.index])));
        this._register(this.selectList.onDidChangeFocus(e => this.onListFocus(e)));
        this._register(dom.addDisposableListener(this.selectDropDownContainer, dom.EventType.FOCUS_OUT, e => {
            if (!this._isVisible || dom.isAncestor(e.relatedTarget, this.selectDropDownContainer)) {
                return;
            }
            this.onListBlur();
        }));
        this.selectList.getHTMLElement().setAttribute('aria-label', this.selectBoxOptions.ariaLabel || '');
        this.selectList.getHTMLElement().setAttribute('aria-expanded', 'true');
        this.styleList();
    }
    // List methods
    // List mouse controller - active exit, select option, fire onDidSelect if change, return focus to parent select
    // Also takes in touchend events
    onPointerUp(e) {
        if (!this.selectList.length) {
            return;
        }
        dom.EventHelper.stop(e);
        const target = e.target;
        if (!target) {
            return;
        }
        // Check our mouse event is on an option (not scrollbar)
        if (target.classList.contains('slider')) {
            return;
        }
        const listRowElement = target.closest('.monaco-list-row');
        if (!listRowElement) {
            return;
        }
        const index = Number(listRowElement.getAttribute('data-index'));
        const disabled = listRowElement.classList.contains('option-disabled');
        // Ignore mouse selection of disabled options
        if (index >= 0 && index < this.options.length && !disabled) {
            this.selected = index;
            this.select(this.selected);
            this.selectList.setFocus([this.selected]);
            this.selectList.reveal(this.selectList.getFocus()[0]);
            // Only fire if selection change
            if (this.selected !== this._currentSelection) {
                // Set current = selected
                this._currentSelection = this.selected;
                this._onDidSelect.fire({
                    index: this.selectElement.selectedIndex,
                    selected: this.options[this.selected].text
                });
                if (!!this.options[this.selected] && !!this.options[this.selected].text) {
                    this.setTitle(this.options[this.selected].text);
                }
            }
            this.hideSelectDropDown(true);
        }
    }
    // List Exit - passive - implicit no selection change, hide drop-down
    onListBlur() {
        if (this._sticky) {
            return;
        }
        if (this.selected !== this._currentSelection) {
            // Reset selected to current if no change
            this.select(this._currentSelection);
        }
        this.hideSelectDropDown(false);
    }
    renderDescriptionMarkdown(text, actionHandler) {
        const cleanRenderedMarkdown = (element) => {
            for (let i = 0; i < element.childNodes.length; i++) {
                const child = element.childNodes.item(i);
                const tagName = child.tagName && child.tagName.toLowerCase();
                if (tagName === 'img') {
                    child.remove();
                }
                else {
                    cleanRenderedMarkdown(child);
                }
            }
        };
        const rendered = renderMarkdown({ value: text, supportThemeIcons: true }, { actionHandler });
        rendered.element.classList.add('select-box-description-markdown');
        cleanRenderedMarkdown(rendered.element);
        return rendered.element;
    }
    // List Focus Change - passive - update details pane with newly focused element's data
    onListFocus(e) {
        // Skip during initial layout
        if (!this._isVisible || !this._hasDetails) {
            return;
        }
        this.updateDetail(e.indexes[0]);
    }
    updateDetail(selectedIndex) {
        this.selectionDetailsPane.innerText = '';
        const option = this.options[selectedIndex];
        const description = option?.description ?? '';
        const descriptionIsMarkdown = option?.descriptionIsMarkdown ?? false;
        if (description) {
            if (descriptionIsMarkdown) {
                const actionHandler = option.descriptionMarkdownActionHandler;
                this.selectionDetailsPane.appendChild(this.renderDescriptionMarkdown(description, actionHandler));
            }
            else {
                this.selectionDetailsPane.innerText = description;
            }
            this.selectionDetailsPane.style.display = 'block';
        }
        else {
            this.selectionDetailsPane.style.display = 'none';
        }
        // Avoid recursion
        this._skipLayout = true;
        this.contextViewProvider.layout();
        this._skipLayout = false;
    }
    // List keyboard controller
    // List exit - active - hide ContextView dropdown, reset selection, return focus to parent select
    onEscape(e) {
        dom.EventHelper.stop(e);
        // Reset selection to value when opened
        this.select(this._currentSelection);
        this.hideSelectDropDown(true);
    }
    // List exit - active - hide ContextView dropdown, return focus to parent select, fire onDidSelect if change
    onEnter(e) {
        dom.EventHelper.stop(e);
        // Only fire if selection change
        if (this.selected !== this._currentSelection) {
            this._currentSelection = this.selected;
            this._onDidSelect.fire({
                index: this.selectElement.selectedIndex,
                selected: this.options[this.selected].text
            });
            if (!!this.options[this.selected] && !!this.options[this.selected].text) {
                this.setTitle(this.options[this.selected].text);
            }
        }
        this.hideSelectDropDown(true);
    }
    // List navigation - have to handle a disabled option (jump over)
    onDownArrow(e) {
        if (this.selected < this.options.length - 1) {
            dom.EventHelper.stop(e, true);
            // Skip disabled options
            const nextOptionDisabled = this.options[this.selected + 1].isDisabled;
            if (nextOptionDisabled && this.options.length > this.selected + 2) {
                this.selected += 2;
            }
            else if (nextOptionDisabled) {
                return;
            }
            else {
                this.selected++;
            }
            // Set focus/selection - only fire event when closing drop-down or on blur
            this.select(this.selected);
            this.selectList.setFocus([this.selected]);
            this.selectList.reveal(this.selectList.getFocus()[0]);
        }
    }
    onUpArrow(e) {
        if (this.selected > 0) {
            dom.EventHelper.stop(e, true);
            // Skip disabled options
            const previousOptionDisabled = this.options[this.selected - 1].isDisabled;
            if (previousOptionDisabled && this.selected > 1) {
                this.selected -= 2;
            }
            else {
                this.selected--;
            }
            // Set focus/selection - only fire event when closing drop-down or on blur
            this.select(this.selected);
            this.selectList.setFocus([this.selected]);
            this.selectList.reveal(this.selectList.getFocus()[0]);
        }
    }
    onPageUp(e) {
        dom.EventHelper.stop(e);
        this.selectList.focusPreviousPage();
        // Allow scrolling to settle
        setTimeout(() => {
            this.selected = this.selectList.getFocus()[0];
            // Shift selection down if we land on a disabled option
            if (this.options[this.selected].isDisabled && this.selected < this.options.length - 1) {
                this.selected++;
                this.selectList.setFocus([this.selected]);
            }
            this.selectList.reveal(this.selected);
            this.select(this.selected);
        }, 1);
    }
    onPageDown(e) {
        dom.EventHelper.stop(e);
        this.selectList.focusNextPage();
        // Allow scrolling to settle
        setTimeout(() => {
            this.selected = this.selectList.getFocus()[0];
            // Shift selection up if we land on a disabled option
            if (this.options[this.selected].isDisabled && this.selected > 0) {
                this.selected--;
                this.selectList.setFocus([this.selected]);
            }
            this.selectList.reveal(this.selected);
            this.select(this.selected);
        }, 1);
    }
    onHome(e) {
        dom.EventHelper.stop(e);
        if (this.options.length < 2) {
            return;
        }
        this.selected = 0;
        if (this.options[this.selected].isDisabled && this.selected > 1) {
            this.selected++;
        }
        this.selectList.setFocus([this.selected]);
        this.selectList.reveal(this.selected);
        this.select(this.selected);
    }
    onEnd(e) {
        dom.EventHelper.stop(e);
        if (this.options.length < 2) {
            return;
        }
        this.selected = this.options.length - 1;
        if (this.options[this.selected].isDisabled && this.selected > 1) {
            this.selected--;
        }
        this.selectList.setFocus([this.selected]);
        this.selectList.reveal(this.selected);
        this.select(this.selected);
    }
    // Mimic option first character navigation of native select
    onCharacter(e) {
        const ch = KeyCodeUtils.toString(e.keyCode);
        let optionIndex = -1;
        for (let i = 0; i < this.options.length - 1; i++) {
            optionIndex = (i + this.selected + 1) % this.options.length;
            if (this.options[optionIndex].text.charAt(0).toUpperCase() === ch && !this.options[optionIndex].isDisabled) {
                this.select(optionIndex);
                this.selectList.setFocus([optionIndex]);
                this.selectList.reveal(this.selectList.getFocus()[0]);
                dom.EventHelper.stop(e);
                break;
            }
        }
    }
    dispose() {
        this.hideSelectDropDown(false);
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0Qm94Q3VzdG9tLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zZWxlY3RCb3gvc2VsZWN0Qm94Q3VzdG9tLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSx5QkFBeUIsQ0FBQztBQUM1RCxPQUFPLEtBQUssS0FBSyxNQUFNLG1CQUFtQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUU1QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHM0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTdDLE9BQU8sS0FBSyxNQUFNLE1BQU0sMkJBQTJCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQVcsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUxRCxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc5QyxNQUFNLENBQUMs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RixNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUNoRSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzthQUN4QyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3hDLENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sMEJBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxSCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sd0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLDhDQUE4QztRQUN2SyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sMkJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM1SCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sNkJBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5SCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sK0JBQXNCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sOEJBQXFCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sNEJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM1SCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sMEJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMs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
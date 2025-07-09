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
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as DOM from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { Toggle, unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isDefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { defaultButtonStyles, getInputBoxStyle, getSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { settingsSelectBackground, settingsSelectBorder, settingsSelectForeground, settingsSelectListBorder, settingsTextInputBackground, settingsTextInputBorder, settingsTextInputForeground } from '../common/settingsEditorColorRegistry.js';
import './media/settingsWidgets.css';
import { settingsDiscardIcon, settingsEditIcon, settingsRemoveIcon } from './preferencesIcons.js';
const $ = DOM.$;
export class ListSettingListModel {
    get items() {
        const items = this._dataItems.map((item, i) => {
            const editing = typeof this._editKey === 'number' && this._editKey === i;
            return {
                ...item,
                editing,
                selected: i === this._selectedIdx || editing
            };
        });
        if (this._editKey === 'create') {
            items.push({
                editing: true,
                selected: true,
                ...this._newDataItem,
            });
        }
        return items;
    }
    constructor(newItem) {
        this._dataItems = [];
        this._editKey = null;
        this._selectedIdx = null;
        this._newDataItem = newItem;
    }
    setEditKey(key) {
        this._editKey = key;
    }
    setValue(listData) {
        this._dataItems = listData;
    }
    select(idx) {
        this._selectedIdx = idx;
    }
    getSelected() {
        return this._selectedIdx;
    }
    selectNext() {
        if (typeof this._selectedIdx === 'number') {
            this._selectedIdx = Math.min(this._selectedIdx + 1, this._dataItems.length - 1);
        }
        else {
            this._selectedIdx = 0;
        }
    }
    selectPrevious() {
        if (typeof this._selectedIdx === 'number') {
            this._selectedIdx = Math.max(this._selectedIdx - 1, 0);
        }
        else {
            this._selectedIdx = 0;
        }
    }
}
let AbstractListSettingWidget = class AbstractListSettingWidget extends Disposable {
    get domNode() {
        return this.listElement;
    }
    get items() {
        return this.model.items;
    }
    get isReadOnly() {
        return false;
    }
    constructor(container, themeService, contextViewService) {
        super();
        this.container = container;
        this.themeService = themeService;
        this.contextViewService = contextViewService;
        this.rowElements = [];
        this._onDidChangeList = this._register(new Emitter());
        this.model = new ListSettingListModel(this.getEmptyItem());
        this.listDisposables = this._register(new DisposableStore());
        this.onDidChangeList = this._onDidChangeList.event;
        this.listElement = DOM.append(container, $('div'));
        this.listElement.setAttribute('role', 'list');
        this.getContainerClasses().forEach(c => this.listElement.classList.add(c));
        DOM.append(container, this.renderAddButton());
        this.renderList();
        this._register(DOM.addDisposableListener(this.listElement, DOM.EventType.POINTER_DOWN, e => this.onListClick(e)));
        this._register(DOM.addDisposableListener(this.listElement, DOM.EventType.DBLCLICK, e => this.onListDoubleClick(e)));
        this._register(DOM.addStandardDisposableListener(this.listElement, 'keydown', (e) => {
            if (e.equals(16 /* KeyCode.UpArrow */)) {
                this.selectPreviousRow();
            }
            else if (e.equals(18 /* KeyCode.DownArrow */)) {
                this.selectNextRow();
            }
            else {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
        }));
    }
    setValue(listData) {
        this.model.setValue(listData);
        this.renderList();
    }
    renderHeader() {
        return;
    }
    isAddButtonVisible() {
        return true;
    }
    renderList() {
        const focused = DOM.isAncestorOfActiveElement(this.listElement);
        DOM.clearNode(this.listElement);
        this.listDisposables.clear();
        const newMode = this.model.items.some(item => !!(item.editing && this.isItemNew(item)));
        this.container.classList.toggle('setting-list-hide-add-button', !this.isAddButtonVisible() || newMode);
        if (this.model.items.length) {
            this.listElement.tabIndex = 0;
        }
        else {
            this.listElement.removeAttribute('tabIndex');
        }
        const header = this.renderHeader();
        if (header) {
            this.listElement.appendChild(header);
        }
        this.rowElements = this.model.items.map((item, i) => this.renderDataOrEditItem(item, i, focused));
        this.rowElements.forEach(rowElement => this.listElement.appendChild(rowElement));
    }
    createBasicSelectBox(value) {
        const selectBoxOptions = value.options.map(({ value, description }) => ({ text: value, description }));
        const selected = value.options.findIndex(option => value.data === option.value);
        const styles = getSelectBoxStyles({
            selectBackground: settingsSelectBackground,
            selectForeground: settingsSelectForeground,
            selectBorder: settingsSelectBorder,
            selectListBorder: settingsSelectListBorder
        });
        const selectBox = new SelectBox(selectBoxOptions, selected, this.contextViewService, styles, {
            useCustomDrawn: !(isIOS && BrowserFeatures.pointerEvents)
        });
        return selectBox;
    }
    editSetting(idx) {
        this.model.setEditKey(idx);
        this.renderList();
    }
    cancelEdit() {
        this.model.setEditKey('none');
        this.renderList();
    }
    handleItemChange(originalItem, changedItem, idx) {
        this.model.setEditKey('none');
        if (this.isItemNew(originalItem)) {
            this._onDidChangeList.fire({
                type: 'add',
                newItem: changedItem,
                targetIndex: idx,
            });
        }
        else {
            this._onDidChangeList.fire({
                type: 'change',
                originalItem,
                newItem: changedItem,
                targetIndex: idx,
            });
        }
        this.renderList();
    }
    renderDataOrEditItem(item, idx, listFocused) {
        const rowElement = item.editing ?
            this.renderEdit(item, idx) :
            this.renderDataItem(item, idx, listFocused);
        rowElement.setAttribute('role', 'listitem');
        return rowElement;
    }
    renderDataItem(item, idx, listFocused) {
        const rowElementGroup = this.renderItem(item, idx);
        const rowElement = rowElementGroup.rowElement;
        rowElement.setAttribute('data-index', idx + '');
        rowElement.setAttribute('tabindex', item.selected ? '0' : '-1');
        rowElement.classList.toggle('selected', item.selected);
        const actionBar = new ActionBar(rowElement);
        this.listDisposables.add(actionBar);
        actionBar.push(this.getActionsForItem(item, idx), { icon: true, label: true });
        this.addTooltipsToRow(rowElementGroup, item);
        if (item.selected && listFocused) {
            disposableTimeout(() => rowElement.focus(), undefined, this.listDisposables);
        }
        this.listDisposables.add(DOM.addDisposableListener(rowElement, 'click', (e) => {
            // There is a parent list widget, which is the one that holds the list of settings.
            // Prevent the parent widget from trying to interpret this click event.
            e.stopPropagation();
        }));
        return rowElement;
    }
    renderAddButton() {
        const rowElement = $('.setting-list-new-row');
        const startAddButton = this._register(new Button(rowElement, defaultButtonStyles));
        startAddButton.label = this.getLocalizedStrings().addButtonLabel;
        startAddButton.element.classList.add('setting-list-addButton');
        this._register(startAddButton.onDidClick(() => {
            this.model.setEditKey('create');
            this.renderList();
        }));
        return rowElement;
    }
    onListClick(e) {
        const targetIdx = this.getClickedItemIndex(e);
        if (targetIdx < 0) {
            return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (this.model.getSelected() === targetIdx) {
            return;
        }
        this.selectRow(targetIdx);
    }
    onListDoubleClick(e) {
        const targetIdx = this.getClickedItemIndex(e);
        if (targetIdx < 0) {
            return;
        }
        if (this.isReadOnly) {
            return;
        }
        const item = this.model.items[targetIdx];
        if (item) {
            this.editSetting(targetIdx);
            e.preventDefault();
            e.stopPropagation();
        }
    }
    getClickedItemIndex(e) {
        if (!e.target) {
            return -1;
        }
        const actionbar = DOM.findParentWithClass(e.target, 'monaco-action-bar');
        if (actionbar) {
            // Don't handle doubleclicks inside the action bar
            return -1;
        }
        const element = DOM.findParentWithClass(e.target, 'setting-list-row');
        if (!element) {
            return -1;
        }
        const targetIdxStr = element.getAttribute('data-index');
        if (!targetIdxStr) {
            return -1;
        }
        const targetIdx = parseInt(targetIdxStr);
        return targetIdx;
    }
    selectRow(idx) {
        this.model.select(idx);
        this.rowElements.forEach(row => row.classList.remove('selected'));
        const selectedRow = this.rowElements[this.model.getSelected()];
        selectedRow.classList.add('selected');
        selectedRow.focus();
    }
    selectNextRow() {
        this.model.selectNext();
        this.selectRow(this.model.getSelected());
    }
    selectPreviousRow() {
        this.model.selectPrevious();
        this.selectRow(this.model.getSelected());
    }
};
AbstractListSettingWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService)
], AbstractListSettingWidget);
export { AbstractListSettingWidget };
let ListSettingWidget = class ListSettingWidget extends AbstractListSettingWidget {
    setValue(listData, options) {
        this.keyValueSuggester = options?.keySuggester;
        this.showAddButton = options?.showAddButton ?? true;
        super.setValue(listData);
    }
    constructor(container, themeService, contextViewService, hoverService) {
        super(container, themeService, contextViewService);
        this.hoverService = hoverService;
        this.showAddButton = true;
    }
    getEmptyItem() {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            value: {
                type: 'string',
                data: ''
            }
        };
    }
    isAddButtonVisible() {
        return this.showAddButton;
    }
    getContainerClasses() {
        return ['setting-list-widget'];
    }
    getActionsForItem(item, idx) {
        if (this.isReadOnly) {
            return [];
        }
        return [
            {
                class: ThemeIcon.asClassName(settingsEditIcon),
                enabled: true,
                id: 'workbench.action.editListItem',
                tooltip: this.getLocalizedStrings().editActionTooltip,
                run: () => this.editSetting(idx)
            },
            {
                class: ThemeIcon.asClassName(settingsRemoveIcon),
                enabled: true,
                id: 'workbench.action.removeListItem',
                tooltip: this.getLocalizedStrings().deleteActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'remove', originalItem: item, targetIndex: idx })
            }
        ];
    }
    renderItem(item, idx) {
        const rowElement = $('.setting-list-row');
        const valueElement = DOM.append(rowElement, $('.setting-list-value'));
        const siblingElement = DOM.append(rowElement, $('.setting-list-sibling'));
        valueElement.textContent = item.value.data.toString();
        siblingElement.textContent = item.sibling ? `when: ${item.sibling}` : null;
        this.addDragAndDrop(rowElement, item, idx);
        return { rowElement, keyElement: valueElement, valueElement: siblingElement };
    }
    addDragAndDrop(rowElement, item, idx) {
        if (this.model.items.every(item => !item.editing)) {
            rowElement.draggable = true;
            rowElement.classList.add('draggable');
        }
        else {
            rowElement.draggable = false;
            rowElement.classList.remove('draggable');
        }
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_START, (ev) => {
            this.dragDetails = {
                element: rowElement,
                item,
                itemIndex: idx
            };
            applyDragImage(ev, rowElement, item.value.data);
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_OVER, (ev) => {
            if (!this.dragDetails) {
                return false;
            }
            ev.preventDefault();
            if (ev.dataTransfer) {
                ev.dataTransfer.dropEffect = 'move';
            }
            return true;
        }));
        let counter = 0;
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_ENTER, (ev) => {
            counter++;
            rowElement.classList.add('drag-hover');
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_LEAVE, (ev) => {
            counter--;
            if (!counter) {
                rowElement.classList.remove('drag-hover');
            }
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DROP, (ev) => {
            // cancel the op if we dragged to a completely different setting
            if (!this.dragDetails) {
                return false;
            }
            ev.preventDefault();
            counter = 0;
            if (this.dragDetails.element !== rowElement) {
                this._onDidChangeList.fire({
                    type: 'move',
                    originalItem: this.dragDetails.item,
                    sourceIndex: this.dragDetails.itemIndex,
                    newItem: item,
                    targetIndex: idx
                });
            }
            return true;
        }));
        this.listDisposables.add(DOM.addDisposableListener(rowElement, DOM.EventType.DRAG_END, (ev) => {
            counter = 0;
            rowElement.classList.remove('drag-hover');
            ev.dataTransfer?.clearData();
            if (this.dragDetails) {
                this.dragDetails = undefined;
            }
        }));
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row');
        let valueInput;
        let currentDisplayValue;
        let currentEnumOptions;
        if (this.keyValueSuggester) {
            const enumData = this.keyValueSuggester(this.model.items.map(({ value: { data } }) => data), idx);
            item = {
                ...item,
                value: {
                    type: 'enum',
                    data: item.value.data,
                    options: enumData ? enumData.options : []
                }
            };
        }
        switch (item.value.type) {
            case 'string':
                valueInput = this.renderInputBox(item.value, rowElement);
                break;
            case 'enum':
                valueInput = this.renderDropdown(item.value, rowElement);
                currentEnumOptions = item.value.options;
                if (item.value.options.length) {
                    currentDisplayValue = this.isItemNew(item) ?
                        currentEnumOptions[0].value : item.value.data;
                }
                break;
        }
        const updatedInputBoxItem = () => {
            const inputBox = valueInput;
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            return {
                value: {
                    type: 'string',
                    data: inputBox.value
                },
                sibling: siblingInput?.value
            };
        };
        const updatedSelectBoxItem = (selectedValue) => {
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            return {
                value: {
                    type: 'enum',
                    data: selectedValue,
                    options: currentEnumOptions ?? []
                }
            };
        };
        const onKeyDown = (e) => {
            if (e.equals(3 /* KeyCode.Enter */)) {
                this.handleItemChange(item, updatedInputBoxItem(), idx);
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                this.cancelEdit();
                e.preventDefault();
            }
            rowElement?.focus();
        };
        if (item.value.type !== 'string') {
            const selectBox = valueInput;
            this.listDisposables.add(selectBox.onDidSelect(({ selected }) => {
                currentDisplayValue = selected;
            }));
        }
        else {
            const inputBox = valueInput;
            this.listDisposables.add(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        }
        let siblingInput;
        if (!isUndefinedOrNull(item.sibling)) {
            siblingInput = new InputBox(rowElement, this.contextViewService, {
                placeholder: this.getLocalizedStrings().siblingInputPlaceholder,
                inputBoxStyles: getInputBoxStyle({
                    inputBackground: settingsTextInputBackground,
                    inputForeground: settingsTextInputForeground,
                    inputBorder: settingsTextInputBorder
                })
            });
            siblingInput.element.classList.add('setting-list-siblingInput');
            this.listDisposables.add(siblingInput);
            siblingInput.value = item.sibling;
            this.listDisposables.add(DOM.addStandardDisposableListener(siblingInput.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        }
        else if (valueInput instanceof InputBox) {
            valueInput.element.classList.add('no-sibling');
        }
        const okButton = this.listDisposables.add(new Button(rowElement, defaultButtonStyles));
        okButton.label = localize('okButton', "OK");
        okButton.element.classList.add('setting-list-ok-button');
        this.listDisposables.add(okButton.onDidClick(() => {
            if (item.value.type === 'string') {
                this.handleItemChange(item, updatedInputBoxItem(), idx);
            }
            else {
                this.handleItemChange(item, updatedSelectBoxItem(currentDisplayValue), idx);
            }
        }));
        const cancelButton = this.listDisposables.add(new Button(rowElement, { secondary: true, ...defaultButtonStyles }));
        cancelButton.label = localize('cancelButton', "Cancel");
        cancelButton.element.classList.add('setting-list-cancel-button');
        this.listDisposables.add(cancelButton.onDidClick(() => this.cancelEdit()));
        this.listDisposables.add(disposableTimeout(() => {
            valueInput.focus();
            if (valueInput instanceof InputBox) {
                valueInput.select();
            }
        }));
        return rowElement;
    }
    isItemNew(item) {
        return item.value.data === '';
    }
    addTooltipsToRow(rowElementGroup, { value, sibling }) {
        const title = isUndefinedOrNull(sibling)
            ? localize('listValueHintLabel', "List item `{0}`", value.data)
            : localize('listSiblingHintLabel', "List item `{0}` with sibling `${1}`", value.data, sibling);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: title }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', "Remove Item"),
            editActionTooltip: localize('editItem', "Edit Item"),
            addButtonLabel: localize('addItem', "Add Item"),
            inputPlaceholder: localize('itemInputPlaceholder', "Item..."),
            siblingInputPlaceholder: localize('listSiblingInputPlaceholder', "Sibling..."),
        };
    }
    renderInputBox(value, rowElement) {
        const valueInput = new InputBox(rowElement, this.contextViewService, {
            placeholder: this.getLocalizedStrings().inputPlaceholder,
            inputBoxStyles: getInputBoxStyle({
                inputBackground: settingsTextInputBackground,
                inputForeground: settingsTextInputForeground,
                inputBorder: settingsTextInputBorder
            })
        });
        valueInput.element.classList.add('setting-list-valueInput');
        this.listDisposables.add(valueInput);
        valueInput.value = value.data.toString();
        return valueInput;
    }
    renderDropdown(value, rowElement) {
        if (value.type !== 'enum') {
            throw new Error('Valuetype must be enum.');
        }
        const selectBox = this.createBasicSelectBox(value);
        const wrapper = $('.setting-list-object-list-row');
        selectBox.render(wrapper);
        rowElement.appendChild(wrapper);
        return selectBox;
    }
};
ListSettingWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ListSettingWidget);
export { ListSettingWidget };
export class ExcludeSettingWidget extends ListSettingWidget {
    getContainerClasses() {
        return ['setting-list-include-exclude-widget'];
    }
    addDragAndDrop(rowElement, item, idx) {
        return;
    }
    addTooltipsToRow(rowElementGroup, item) {
        let title = isUndefinedOrNull(item.sibling)
            ? localize('excludePatternHintLabel', "Exclude files matching `{0}`", item.value.data)
            : localize('excludeSiblingHintLabel', "Exclude files matching `{0}`, only when a file matching `{1}` is present", item.value.data, item.sibling);
        if (item.source) {
            title += localize('excludeIncludeSource', ". Default value provided by `{0}`", item.source);
        }
        const markdownTitle = new MarkdownString().appendMarkdown(title);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: markdownTitle }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeExcludeItem', "Remove Exclude Item"),
            editActionTooltip: localize('editExcludeItem', "Edit Exclude Item"),
            addButtonLabel: localize('addPattern', "Add Pattern"),
            inputPlaceholder: localize('excludePatternInputPlaceholder', "Exclude Pattern..."),
            siblingInputPlaceholder: localize('excludeSiblingInputPlaceholder', "When Pattern Is Present..."),
        };
    }
}
export class IncludeSettingWidget extends ListSettingWidget {
    getContainerClasses() {
        return ['setting-list-include-exclude-widget'];
    }
    addDragAndDrop(rowElement, item, idx) {
        return;
    }
    addTooltipsToRow(rowElementGroup, item) {
        let title = isUndefinedOrNull(item.sibling)
            ? localize('includePatternHintLabel', "Include files matching `{0}`", item.value.data)
            : localize('includeSiblingHintLabel', "Include files matching `{0}`, only when a file matching `{1}` is present", item.value.data, item.sibling);
        if (item.source) {
            title += localize('excludeIncludeSource', ". Default value provided by `{0}`", item.source);
        }
        const markdownTitle = new MarkdownString().appendMarkdown(title);
        const { rowElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(rowElement, { content: markdownTitle }));
        rowElement.setAttribute('aria-label', title);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeIncludeItem', "Remove Include Item"),
            editActionTooltip: localize('editIncludeItem', "Edit Include Item"),
            addButtonLabel: localize('addPattern', "Add Pattern"),
            inputPlaceholder: localize('includePatternInputPlaceholder', "Include Pattern..."),
            siblingInputPlaceholder: localize('includeSiblingInputPlaceholder', "When Pattern Is Present..."),
        };
    }
}
let ObjectSettingDropdownWidget = class ObjectSettingDropdownWidget extends AbstractListSettingWidget {
    constructor(container, themeService, contextViewService, hoverService) {
        super(container, themeService, contextViewService);
        this.hoverService = hoverService;
        this.editable = true;
        this.currentSettingKey = '';
        this.showAddButton = true;
        this.keySuggester = () => undefined;
        this.valueSuggester = () => undefined;
    }
    setValue(listData, options) {
        this.editable = !options?.isReadOnly;
        this.showAddButton = options?.showAddButton ?? this.showAddButton;
        this.keySuggester = options?.keySuggester ?? this.keySuggester;
        this.valueSuggester = options?.valueSuggester ?? this.valueSuggester;
        if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
            this.model.setEditKey('none');
            this.model.select(null);
            this.currentSettingKey = options.settingKey;
        }
        super.setValue(listData);
    }
    isItemNew(item) {
        return item.key.data === '' && item.value.data === '';
    }
    isAddButtonVisible() {
        return this.showAddButton;
    }
    get isReadOnly() {
        return !this.editable;
    }
    getEmptyItem() {
        return {
            key: { type: 'string', data: '' },
            value: { type: 'string', data: '' },
            removable: true,
            resetable: false
        };
    }
    getContainerClasses() {
        return ['setting-list-object-widget'];
    }
    getActionsForItem(item, idx) {
        if (this.isReadOnly) {
            return [];
        }
        const actions = [
            {
                class: ThemeIcon.asClassName(settingsEditIcon),
                enabled: true,
                id: 'workbench.action.editListItem',
                label: '',
                tooltip: this.getLocalizedStrings().editActionTooltip,
                run: () => this.editSetting(idx)
            },
        ];
        if (item.resetable) {
            actions.push({
                class: ThemeIcon.asClassName(settingsDiscardIcon),
                enabled: true,
                id: 'workbench.action.resetListItem',
                label: '',
                tooltip: this.getLocalizedStrings().resetActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'reset', originalItem: item, targetIndex: idx })
            });
        }
        if (item.removable) {
            actions.push({
                class: ThemeIcon.asClassName(settingsRemoveIcon),
                enabled: true,
                id: 'workbench.action.removeListItem',
                label: '',
                tooltip: this.getLocalizedStrings().deleteActionTooltip,
                run: () => this._onDidChangeList.fire({ type: 'remove', originalItem: item, targetIndex: idx })
            });
        }
        return actions;
    }
    renderHeader() {
        const header = $('.setting-list-row-header');
        const keyHeader = DOM.append(header, $('.setting-list-object-key'));
        const valueHeader = DOM.append(header, $('.setting-list-object-value'));
        const { keyHeaderText, valueHeaderText } = this.getLocalizedStrings();
        keyHeader.textContent = keyHeaderText;
        valueHeader.textContent = valueHeaderText;
        return header;
    }
    renderItem(item, idx) {
        const rowElement = $('.setting-list-row');
        rowElement.classList.add('setting-list-object-row');
        const keyElement = DOM.append(rowElement, $('.setting-list-object-key'));
        const valueElement = DOM.append(rowElement, $('.setting-list-object-value'));
        keyElement.textContent = item.key.data;
        valueElement.textContent = item.value.data.toString();
        return { rowElement, keyElement, valueElement };
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row.setting-list-object-row');
        const changedItem = { ...item };
        const onKeyChange = (key) => {
            changedItem.key = key;
            okButton.enabled = key.data !== '';
            const suggestedValue = this.valueSuggester(key.data) ?? item.value;
            if (this.shouldUseSuggestion(item.value, changedItem.value, suggestedValue)) {
                onValueChange(suggestedValue);
                renderLatestValue();
            }
        };
        const onValueChange = (value) => {
            changedItem.value = value;
        };
        let keyWidget;
        let keyElement;
        if (this.showAddButton) {
            if (this.isItemNew(item)) {
                const suggestedKey = this.keySuggester(this.model.items.map(({ key: { data } }) => data));
                if (isDefined(suggestedKey)) {
                    changedItem.key = suggestedKey;
                    const suggestedValue = this.valueSuggester(changedItem.key.data);
                    onValueChange(suggestedValue ?? changedItem.value);
                }
            }
            const { widget, element } = this.renderEditWidget(changedItem.key, {
                idx,
                isKey: true,
                originalItem: item,
                changedItem,
                update: onKeyChange,
            });
            keyWidget = widget;
            keyElement = element;
        }
        else {
            keyElement = $('.setting-list-object-key');
            keyElement.textContent = item.key.data;
        }
        let valueWidget;
        const valueContainer = $('.setting-list-object-value-container');
        const renderLatestValue = () => {
            const { widget, element } = this.renderEditWidget(changedItem.value, {
                idx,
                isKey: false,
                originalItem: item,
                changedItem,
                update: onValueChange,
            });
            valueWidget = widget;
            DOM.clearNode(valueContainer);
            valueContainer.append(element);
        };
        renderLatestValue();
        rowElement.append(keyElement, valueContainer);
        const okButton = this.listDisposables.add(new Button(rowElement, defaultButtonStyles));
        okButton.enabled = changedItem.key.data !== '';
        okButton.label = localize('okButton', "OK");
        okButton.element.classList.add('setting-list-ok-button');
        this.listDisposables.add(okButton.onDidClick(() => this.handleItemChange(item, changedItem, idx)));
        const cancelButton = this.listDisposables.add(new Button(rowElement, { secondary: true, ...defaultButtonStyles }));
        cancelButton.label = localize('cancelButton', "Cancel");
        cancelButton.element.classList.add('setting-list-cancel-button');
        this.listDisposables.add(cancelButton.onDidClick(() => this.cancelEdit()));
        this.listDisposables.add(disposableTimeout(() => {
            const widget = keyWidget ?? valueWidget;
            widget.focus();
            if (widget instanceof InputBox) {
                widget.select();
            }
        }));
        return rowElement;
    }
    renderEditWidget(keyOrValue, options) {
        switch (keyOrValue.type) {
            case 'string':
                return this.renderStringEditWidget(keyOrValue, options);
            case 'enum':
                return this.renderEnumEditWidget(keyOrValue, options);
            case 'boolean':
                return this.renderEnumEditWidget({
                    type: 'enum',
                    data: keyOrValue.data.toString(),
                    options: [{ value: 'true' }, { value: 'false' }],
                }, options);
        }
    }
    renderStringEditWidget(keyOrValue, { idx, isKey, originalItem, changedItem, update }) {
        const wrapper = $(isKey ? '.setting-list-object-input-key' : '.setting-list-object-input-value');
        const inputBox = new InputBox(wrapper, this.contextViewService, {
            placeholder: isKey
                ? localize('objectKeyInputPlaceholder', "Key")
                : localize('objectValueInputPlaceholder', "Value"),
            inputBoxStyles: getInputBoxStyle({
                inputBackground: settingsTextInputBackground,
                inputForeground: settingsTextInputForeground,
                inputBorder: settingsTextInputBorder
            })
        });
        inputBox.element.classList.add('setting-list-object-input');
        this.listDisposables.add(inputBox);
        inputBox.value = keyOrValue.data;
        this.listDisposables.add(inputBox.onDidChange(value => update({ ...keyOrValue, data: value })));
        const onKeyDown = (e) => {
            if (e.equals(3 /* KeyCode.Enter */)) {
                this.handleItemChange(originalItem, changedItem, idx);
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                this.cancelEdit();
                e.preventDefault();
            }
        };
        this.listDisposables.add(DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, onKeyDown));
        return { widget: inputBox, element: wrapper };
    }
    renderEnumEditWidget(keyOrValue, { isKey, changedItem, update }) {
        const selectBox = this.createBasicSelectBox(keyOrValue);
        const changedKeyOrValue = isKey ? changedItem.key : changedItem.value;
        this.listDisposables.add(selectBox.onDidSelect(({ selected }) => update(changedKeyOrValue.type === 'boolean'
            ? { ...changedKeyOrValue, data: selected === 'true' ? true : false }
            : { ...changedKeyOrValue, data: selected })));
        const wrapper = $('.setting-list-object-input');
        wrapper.classList.add(isKey ? 'setting-list-object-input-key' : 'setting-list-object-input-value');
        selectBox.render(wrapper);
        // Switch to the first item if the user set something invalid in the json
        const selected = keyOrValue.options.findIndex(option => keyOrValue.data === option.value);
        if (selected === -1 && keyOrValue.options.length) {
            update(changedKeyOrValue.type === 'boolean'
                ? { ...changedKeyOrValue, data: true }
                : { ...changedKeyOrValue, data: keyOrValue.options[0].value });
        }
        else if (changedKeyOrValue.type === 'boolean') {
            // https://github.com/microsoft/vscode/issues/129581
            update({ ...changedKeyOrValue, data: keyOrValue.data === 'true' });
        }
        return { widget: selectBox, element: wrapper };
    }
    shouldUseSuggestion(originalValue, previousValue, newValue) {
        // suggestion is exactly the same
        if (newValue.type !== 'enum' && newValue.type === previousValue.type && newValue.data === previousValue.data) {
            return false;
        }
        // item is new, use suggestion
        if (originalValue.data === '') {
            return true;
        }
        if (previousValue.type === newValue.type && newValue.type !== 'enum') {
            return false;
        }
        // check if all enum options are the same
        if (previousValue.type === 'enum' && newValue.type === 'enum') {
            const previousEnums = new Set(previousValue.options.map(({ value }) => value));
            newValue.options.forEach(({ value }) => previousEnums.delete(value));
            // all options are the same
            if (previousEnums.size === 0) {
                return false;
            }
        }
        return true;
    }
    addTooltipsToRow(rowElementGroup, item) {
        const { keyElement, valueElement, rowElement } = rowElementGroup;
        let accessibleDescription;
        if (item.source) {
            accessibleDescription = localize('objectPairHintLabelWithSource', "The property `{0}` is set to `{1}` by `{2}`.", item.key.data, item.value.data, item.source);
        }
        else {
            accessibleDescription = localize('objectPairHintLabel', "The property `{0}` is set to `{1}`.", item.key.data, item.value.data);
        }
        const markdownString = new MarkdownString().appendMarkdown(accessibleDescription);
        const keyDescription = this.getEnumDescription(item.key) ?? item.keyDescription ?? markdownString;
        this.listDisposables.add(this.hoverService.setupDelayedHover(keyElement, { content: keyDescription }));
        const valueDescription = this.getEnumDescription(item.value) ?? markdownString;
        this.listDisposables.add(this.hoverService.setupDelayedHover(valueElement, { content: valueDescription }));
        rowElement.setAttribute('aria-label', accessibleDescription);
    }
    getEnumDescription(keyOrValue) {
        const enumDescription = keyOrValue.type === 'enum'
            ? keyOrValue.options.find(({ value }) => keyOrValue.data === value)?.description
            : undefined;
        return enumDescription;
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', "Remove Item"),
            resetActionTooltip: localize('resetItem', "Reset Item"),
            editActionTooltip: localize('editItem', "Edit Item"),
            addButtonLabel: localize('addItem', "Add Item"),
            keyHeaderText: localize('objectKeyHeader', "Item"),
            valueHeaderText: localize('objectValueHeader', "Value"),
        };
    }
};
ObjectSettingDropdownWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ObjectSettingDropdownWidget);
export { ObjectSettingDropdownWidget };
let ObjectSettingCheckboxWidget = class ObjectSettingCheckboxWidget extends AbstractListSettingWidget {
    constructor(container, themeService, contextViewService, hoverService) {
        super(container, themeService, contextViewService);
        this.hoverService = hoverService;
        this.currentSettingKey = '';
    }
    setValue(listData, options) {
        if (isDefined(options) && options.settingKey !== this.currentSettingKey) {
            this.model.setEditKey('none');
            this.model.select(null);
            this.currentSettingKey = options.settingKey;
        }
        super.setValue(listData);
    }
    isItemNew(item) {
        return !item.key.data && !item.value.data;
    }
    getEmptyItem() {
        return {
            key: { type: 'string', data: '' },
            value: { type: 'boolean', data: false },
            removable: false,
            resetable: true
        };
    }
    getContainerClasses() {
        return ['setting-list-object-widget'];
    }
    getActionsForItem(item, idx) {
        return [];
    }
    isAddButtonVisible() {
        return false;
    }
    renderHeader() {
        return undefined;
    }
    renderDataOrEditItem(item, idx, listFocused) {
        const rowElement = this.renderEdit(item, idx);
        rowElement.setAttribute('role', 'listitem');
        return rowElement;
    }
    renderItem(item, idx) {
        // Return just the containers, since we always render in edit mode anyway
        const rowElement = $('.blank-row');
        const keyElement = $('.blank-row-key');
        return { rowElement, keyElement };
    }
    renderEdit(item, idx) {
        const rowElement = $('.setting-list-edit-row.setting-list-object-row.setting-item-bool');
        const changedItem = { ...item };
        const onValueChange = (newValue) => {
            changedItem.value.data = newValue;
            this.handleItemChange(item, changedItem, idx);
        };
        const checkboxDescription = item.keyDescription ? `${item.keyDescription} (${item.key.data})` : item.key.data;
        const { element, widget: checkbox } = this.renderEditWidget(changedItem.value.data, checkboxDescription, onValueChange);
        rowElement.appendChild(element);
        const valueElement = DOM.append(rowElement, $('.setting-list-object-value'));
        valueElement.textContent = checkboxDescription;
        // We add the tooltips here, because the method is not called by default
        // for widgets in edit mode
        const rowElementGroup = { rowElement, keyElement: valueElement, valueElement: checkbox.domNode };
        this.addTooltipsToRow(rowElementGroup, item);
        this._register(DOM.addDisposableListener(valueElement, DOM.EventType.MOUSE_DOWN, e => {
            const targetElement = e.target;
            if (targetElement.tagName.toLowerCase() !== 'a') {
                checkbox.checked = !checkbox.checked;
                onValueChange(checkbox.checked);
            }
            DOM.EventHelper.stop(e);
        }));
        return rowElement;
    }
    renderEditWidget(value, checkboxDescription, onValueChange) {
        const checkbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'setting-value-checkbox',
            isChecked: value,
            title: checkboxDescription,
            ...unthemedToggleStyles
        });
        this.listDisposables.add(checkbox);
        const wrapper = $('.setting-list-object-input');
        wrapper.classList.add('setting-list-object-input-key-checkbox');
        checkbox.domNode.classList.add('setting-value-checkbox');
        wrapper.appendChild(checkbox.domNode);
        this._register(DOM.addDisposableListener(wrapper, DOM.EventType.MOUSE_DOWN, e => {
            checkbox.checked = !checkbox.checked;
            onValueChange(checkbox.checked);
            // Without this line, the settings editor assumes
            // we lost focus on this setting completely.
            e.stopImmediatePropagation();
        }));
        return { widget: checkbox, element: wrapper };
    }
    addTooltipsToRow(rowElementGroup, item) {
        const accessibleDescription = localize('objectPairHintLabel', "The property `{0}` is set to `{1}`.", item.key.data, item.value.data);
        const title = item.keyDescription ?? accessibleDescription;
        const { rowElement, keyElement, valueElement } = rowElementGroup;
        this.listDisposables.add(this.hoverService.setupDelayedHover(keyElement, { content: title }));
        valueElement.setAttribute('aria-label', accessibleDescription);
        rowElement.setAttribute('aria-label', accessibleDescription);
    }
    getLocalizedStrings() {
        return {
            deleteActionTooltip: localize('removeItem', "Remove Item"),
            resetActionTooltip: localize('resetItem', "Reset Item"),
            editActionTooltip: localize('editItem', "Edit Item"),
            addButtonLabel: localize('addItem', "Add Item"),
            keyHeaderText: localize('objectKeyHeader', "Item"),
            valueHeaderText: localize('objectValueHeader', "Value"),
        };
    }
};
ObjectSettingCheckboxWidget = __decorate([
    __param(1, IThemeService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ObjectSettingCheckboxWidget);
export { ObjectSettingCheckboxWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvc2V0dGluZ3NXaWRnZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0Ms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
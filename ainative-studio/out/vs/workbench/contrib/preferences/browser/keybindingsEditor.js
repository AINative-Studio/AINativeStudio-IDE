/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-dangerous-type-assertions */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var KeybindingsEditor_1, ActionsColumnRenderer_1, CommandColumnRenderer_1, SourceColumnRenderer_1, WhenColumnRenderer_1;
import './media/keybindingsEditor.css';
import { localize } from '../../../../nls.js';
import { Delayer } from '../../../../base/common/async.js';
import * as DOM from '../../../../base/browser/dom.js';
import { isIOS, OS } from '../../../../base/common/platform.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ToggleActionViewItem } from '../../../../base/browser/ui/toggle/toggle.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { KEYBINDING_ENTRY_TEMPLATE_ID } from '../../../services/preferences/browser/keybindingsEditorModel.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { DefineKeybindingWidget, KeybindingsSearchWidget } from './keybindingWidgets.js';
import { CONTEXT_KEYBINDING_FOCUS, CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS, KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, KEYBINDINGS_EDITOR_COMMAND_DEFINE, KEYBINDINGS_EDITOR_COMMAND_REMOVE, KEYBINDINGS_EDITOR_COMMAND_RESET, KEYBINDINGS_EDITOR_COMMAND_COPY, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN, KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR, KEYBINDINGS_EDITOR_COMMAND_ADD, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE, CONTEXT_WHEN_FOCUS } from '../common/preferences.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingEditingService } from '../../../services/keybinding/common/keybindingEditing.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { badgeBackground, contrastBorder, badgeForeground, listActiveSelectionForeground, listInactiveSelectionForeground, listHoverForeground, listFocusForeground, editorBackground, foreground, listActiveSelectionBackground, listInactiveSelectionBackground, listFocusBackground, listHoverBackground, registerColor, tableOddRowsBackgroundColor, asCssVariable } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MenuRegistry, MenuId, isIMenuItem } from '../../../../platform/actions/common/actions.js';
import { WORKBENCH_BACKGROUND } from '../../../common/theme.js';
import { keybindingsRecordKeysIcon, keybindingsSortIcon, keybindingsAddIcon, preferencesClearInputIcon, keybindingsEditIcon } from './preferencesIcons.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { defaultKeybindingLabelStyles, defaultToggleStyles, getInputBoxStyle } from '../../../../platform/theme/browser/defaultStyles.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { isString } from '../../../../base/common/types.js';
import { SuggestEnabledInput } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { settingsTextInputBorder } from '../common/settingsEditorColorRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
const $ = DOM.$;
let KeybindingsEditor = class KeybindingsEditor extends EditorPane {
    static { KeybindingsEditor_1 = this; }
    static { this.ID = 'workbench.editor.keybindings'; }
    constructor(group, telemetryService, themeService, keybindingsService, contextMenuService, keybindingEditingService, contextKeyService, notificationService, clipboardService, instantiationService, editorService, storageService, configurationService, accessibilityService) {
        super(KeybindingsEditor_1.ID, group, telemetryService, themeService, storageService);
        this.keybindingsService = keybindingsService;
        this.contextMenuService = contextMenuService;
        this.keybindingEditingService = keybindingEditingService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.clipboardService = clipboardService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this._onDefineWhenExpression = this._register(new Emitter());
        this.onDefineWhenExpression = this._onDefineWhenExpression.event;
        this._onRejectWhenExpression = this._register(new Emitter());
        this.onRejectWhenExpression = this._onRejectWhenExpression.event;
        this._onAcceptWhenExpression = this._register(new Emitter());
        this.onAcceptWhenExpression = this._onAcceptWhenExpression.event;
        this._onLayout = this._register(new Emitter());
        this.onLayout = this._onLayout.event;
        this.keybindingsEditorModel = null;
        this.unAssignedKeybindingItemToRevealAndFocus = null;
        this.tableEntries = [];
        this.dimension = null;
        this.latestEmptyFilters = [];
        this.delayedFiltering = new Delayer(300);
        this._register(keybindingsService.onDidUpdateKeybindings(() => this.render(!!this.keybindingFocusContextKey.get())));
        this.keybindingsEditorContextKey = CONTEXT_KEYBINDINGS_EDITOR.bindTo(this.contextKeyService);
        this.searchFocusContextKey = CONTEXT_KEYBINDINGS_SEARCH_FOCUS.bindTo(this.contextKeyService);
        this.keybindingFocusContextKey = CONTEXT_KEYBINDING_FOCUS.bindTo(this.contextKeyService);
        this.searchHistoryDelayer = new Delayer(500);
        this.recordKeysAction = new Action(KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, localize('recordKeysLabel', "Record Keys"), ThemeIcon.asClassName(keybindingsRecordKeysIcon));
        this.recordKeysAction.checked = false;
        this.sortByPrecedenceAction = new Action(KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, localize('sortByPrecedeneLabel', "Sort by Precedence (Highest first)"), ThemeIcon.asClassName(keybindingsSortIcon));
        this.sortByPrecedenceAction.checked = false;
        this.overflowWidgetsDomNode = $('.keybindings-overflow-widgets-container.monaco-editor');
    }
    create(parent) {
        super.create(parent);
        this._register(registerNavigableContainer({
            name: 'keybindingsEditor',
            focusNotifiers: [this],
            focusNextWidget: () => {
                if (this.searchWidget.hasFocus()) {
                    this.focusKeybindings();
                }
            },
            focusPreviousWidget: () => {
                if (!this.searchWidget.hasFocus()) {
                    this.focusSearch();
                }
            }
        }));
    }
    createEditor(parent) {
        const keybindingsEditorElement = DOM.append(parent, $('div', { class: 'keybindings-editor' }));
        this.createAriaLabelElement(keybindingsEditorElement);
        this.createOverlayContainer(keybindingsEditorElement);
        this.createHeader(keybindingsEditorElement);
        this.createBody(keybindingsEditorElement);
    }
    setInput(input, options, context, token) {
        this.keybindingsEditorContextKey.set(true);
        return super.setInput(input, options, context, token)
            .then(() => this.render(!!(options && options.preserveFocus)));
    }
    clearInput() {
        super.clearInput();
        this.keybindingsEditorContextKey.reset();
        this.keybindingFocusContextKey.reset();
    }
    layout(dimension) {
        this.dimension = dimension;
        this.layoutSearchWidget(dimension);
        this.overlayContainer.style.width = dimension.width + 'px';
        this.overlayContainer.style.height = dimension.height + 'px';
        this.defineKeybindingWidget.layout(this.dimension);
        this.layoutKeybindingsTable();
        this._onLayout.fire();
    }
    focus() {
        super.focus();
        const activeKeybindingEntry = this.activeKeybindingEntry;
        if (activeKeybindingEntry) {
            this.selectEntry(activeKeybindingEntry);
        }
        else if (!isIOS) {
            this.searchWidget.focus();
        }
    }
    get activeKeybindingEntry() {
        const focusedElement = this.keybindingsTable.getFocusedElements()[0];
        return focusedElement && focusedElement.templateId === KEYBINDING_ENTRY_TEMPLATE_ID ? focusedElement : null;
    }
    async defineKeybinding(keybindingEntry, add) {
        this.selectEntry(keybindingEntry);
        this.showOverlayContainer();
        try {
            const key = await this.defineKeybindingWidget.define();
            if (key) {
                await this.updateKeybinding(keybindingEntry, key, keybindingEntry.keybindingItem.when, add);
            }
        }
        catch (error) {
            this.onKeybindingEditingError(error);
        }
        finally {
            this.hideOverlayContainer();
            this.selectEntry(keybindingEntry);
        }
    }
    defineWhenExpression(keybindingEntry) {
        if (keybindingEntry.keybindingItem.keybinding) {
            this.selectEntry(keybindingEntry);
            this._onDefineWhenExpression.fire(keybindingEntry);
        }
    }
    rejectWhenExpression(keybindingEntry) {
        this._onRejectWhenExpression.fire(keybindingEntry);
    }
    acceptWhenExpression(keybindingEntry) {
        this._onAcceptWhenExpression.fire(keybindingEntry);
    }
    async updateKeybinding(keybindingEntry, key, when, add) {
        const currentKey = keybindingEntry.keybindingItem.keybinding ? keybindingEntry.keybindingItem.keybinding.getUserSettingsLabel() : '';
        if (currentKey !== key || keybindingEntry.keybindingItem.when !== when) {
            if (add) {
                await this.keybindingEditingService.addKeybinding(keybindingEntry.keybindingItem.keybindingItem, key, when || undefined);
            }
            else {
                await this.keybindingEditingService.editKeybinding(keybindingEntry.keybindingItem.keybindingItem, key, when || undefined);
            }
            if (!keybindingEntry.keybindingItem.keybinding) { // reveal only if keybinding was added to unassinged. Because the entry will be placed in different position after rendering
                this.unAssignedKeybindingItemToRevealAndFocus = keybindingEntry;
            }
        }
    }
    async removeKeybinding(keybindingEntry) {
        this.selectEntry(keybindingEntry);
        if (keybindingEntry.keybindingItem.keybinding) { // This should be a pre-condition
            try {
                await this.keybindingEditingService.removeKeybinding(keybindingEntry.keybindingItem.keybindingItem);
                this.focus();
            }
            catch (error) {
                this.onKeybindingEditingError(error);
                this.selectEntry(keybindingEntry);
            }
        }
    }
    async resetKeybinding(keybindingEntry) {
        this.selectEntry(keybindingEntry);
        try {
            await this.keybindingEditingService.resetKeybinding(keybindingEntry.keybindingItem.keybindingItem);
            if (!keybindingEntry.keybindingItem.keybinding) { // reveal only if keybinding was added to unassinged. Because the entry will be placed in different position after rendering
                this.unAssignedKeybindingItemToRevealAndFocus = keybindingEntry;
            }
            this.selectEntry(keybindingEntry);
        }
        catch (error) {
            this.onKeybindingEditingError(error);
            this.selectEntry(keybindingEntry);
        }
    }
    async copyKeybinding(keybinding) {
        this.selectEntry(keybinding);
        const userFriendlyKeybinding = {
            key: keybinding.keybindingItem.keybinding ? keybinding.keybindingItem.keybinding.getUserSettingsLabel() || '' : '',
            command: keybinding.keybindingItem.command
        };
        if (keybinding.keybindingItem.when) {
            userFriendlyKeybinding.when = keybinding.keybindingItem.when;
        }
        await this.clipboardService.writeText(JSON.stringify(userFriendlyKeybinding, null, '  '));
    }
    async copyKeybindingCommand(keybinding) {
        this.selectEntry(keybinding);
        await this.clipboardService.writeText(keybinding.keybindingItem.command);
    }
    async copyKeybindingCommandTitle(keybinding) {
        this.selectEntry(keybinding);
        await this.clipboardService.writeText(keybinding.keybindingItem.commandLabel);
    }
    focusSearch() {
        this.searchWidget.focus();
    }
    search(filter) {
        this.focusSearch();
        this.searchWidget.setValue(filter);
        this.selectEntry(0);
    }
    clearSearchResults() {
        this.searchWidget.clear();
    }
    showSimilarKeybindings(keybindingEntry) {
        const value = `"${keybindingEntry.keybindingItem.keybinding.getAriaLabel()}"`;
        if (value !== this.searchWidget.getValue()) {
            this.searchWidget.setValue(value);
        }
    }
    createAriaLabelElement(parent) {
        this.ariaLabelElement = DOM.append(parent, DOM.$(''));
        this.ariaLabelElement.setAttribute('id', 'keybindings-editor-aria-label-element');
        this.ariaLabelElement.setAttribute('aria-live', 'assertive');
    }
    createOverlayContainer(parent) {
        this.overlayContainer = DOM.append(parent, $('.overlay-container'));
        this.overlayContainer.style.position = 'absolute';
        this.overlayContainer.style.zIndex = '40'; // has to greater than sash z-index which is 35
        this.defineKeybindingWidget = this._register(this.instantiationService.createInstance(DefineKeybindingWidget, this.overlayContainer));
        this._register(this.defineKeybindingWidget.onDidChange(keybindingStr => this.defineKeybindingWidget.printExisting(this.keybindingsEditorModel.fetch(`"${keybindingStr}"`).length)));
        this._register(this.defineKeybindingWidget.onShowExistingKeybidings(keybindingStr => this.searchWidget.setValue(`"${keybindingStr}"`)));
        this.hideOverlayContainer();
    }
    showOverlayContainer() {
        this.overlayContainer.style.display = 'block';
    }
    hideOverlayContainer() {
        this.overlayContainer.style.display = 'none';
    }
    createHeader(parent) {
        this.headerContainer = DOM.append(parent, $('.keybindings-header'));
        const fullTextSearchPlaceholder = localize('SearchKeybindings.FullTextSearchPlaceholder', "Type to search in keybindings");
        const keybindingsSearchPlaceholder = localize('SearchKeybindings.KeybindingsSearchPlaceholder', "Recording Keys. Press Escape to exit");
        const clearInputAction = new Action(KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, localize('clearInput', "Clear Keybindings Search Input"), ThemeIcon.asClassName(preferencesClearInputIcon), false, async () => this.clearSearchResults());
        const searchContainer = DOM.append(this.headerContainer, $('.search-container'));
        this.searchWidget = this._register(this.instantiationService.createInstance(KeybindingsSearchWidget, searchContainer, {
            ariaLabel: fullTextSearchPlaceholder,
            placeholder: fullTextSearchPlaceholder,
            focusKey: this.searchFocusContextKey,
            ariaLabelledBy: 'keybindings-editor-aria-label-element',
            recordEnter: true,
            quoteRecordedKeys: true,
            history: new Set(this.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)['searchHistory'] ?? []),
            inputBoxStyles: getInputBoxStyle({
                inputBorder: settingsTextInputBorder
            })
        }));
        this._register(this.searchWidget.onDidChange(searchValue => {
            clearInputAction.enabled = !!searchValue;
            this.delayedFiltering.trigger(() => this.filterKeybindings());
            this.updateSearchOptions();
        }));
        this._register(this.searchWidget.onEscape(() => this.recordKeysAction.checked = false));
        this.actionsContainer = DOM.append(searchContainer, DOM.$('.keybindings-search-actions-container'));
        const recordingBadge = this.createRecordingBadge(this.actionsContainer);
        this._register(this.sortByPrecedenceAction.onDidChange(e => {
            if (e.checked !== undefined) {
                this.renderKeybindingsEntries(false);
            }
            this.updateSearchOptions();
        }));
        this._register(this.recordKeysAction.onDidChange(e => {
            if (e.checked !== undefined) {
                recordingBadge.classList.toggle('disabled', !e.checked);
                if (e.checked) {
                    this.searchWidget.inputBox.setPlaceHolder(keybindingsSearchPlaceholder);
                    this.searchWidget.inputBox.setAriaLabel(keybindingsSearchPlaceholder);
                    this.searchWidget.startRecordingKeys();
                    this.searchWidget.focus();
                }
                else {
                    this.searchWidget.inputBox.setPlaceHolder(fullTextSearchPlaceholder);
                    this.searchWidget.inputBox.setAriaLabel(fullTextSearchPlaceholder);
                    this.searchWidget.stopRecordingKeys();
                    this.searchWidget.focus();
                }
                this.updateSearchOptions();
            }
        }));
        const actions = [this.recordKeysAction, this.sortByPrecedenceAction, clearInputAction];
        const toolBar = this._register(new ToolBar(this.actionsContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === this.sortByPrecedenceAction.id || action.id === this.recordKeysAction.id) {
                    return new ToggleActionViewItem(null, action, { ...options, keybinding: this.keybindingsService.lookupKeybinding(action.id)?.getLabel(), toggleStyles: defaultToggleStyles });
                }
                return undefined;
            },
            getKeyBinding: action => this.keybindingsService.lookupKeybinding(action.id)
        }));
        toolBar.setActions(actions);
        this._register(this.keybindingsService.onDidUpdateKeybindings(() => toolBar.setActions(actions)));
    }
    updateSearchOptions() {
        const keybindingsEditorInput = this.input;
        if (keybindingsEditorInput) {
            keybindingsEditorInput.searchOptions = {
                searchValue: this.searchWidget.getValue(),
                recordKeybindings: !!this.recordKeysAction.checked,
                sortByPrecedence: !!this.sortByPrecedenceAction.checked
            };
        }
    }
    createRecordingBadge(container) {
        const recordingBadge = DOM.append(container, DOM.$('.recording-badge.monaco-count-badge.long.disabled'));
        recordingBadge.textContent = localize('recording', "Recording Keys");
        recordingBadge.style.backgroundColor = asCssVariable(badgeBackground);
        recordingBadge.style.color = asCssVariable(badgeForeground);
        recordingBadge.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        return recordingBadge;
    }
    layoutSearchWidget(dimension) {
        this.searchWidget.layout(dimension);
        this.headerContainer.classList.toggle('small', dimension.width < 400);
        this.searchWidget.inputBox.inputElement.style.paddingRight = `${DOM.getTotalWidth(this.actionsContainer) + 12}px`;
    }
    createBody(parent) {
        const bodyContainer = DOM.append(parent, $('.keybindings-body'));
        this.createTable(bodyContainer);
    }
    createTable(parent) {
        this.keybindingsTableContainer = DOM.append(parent, $('.keybindings-table-container'));
        this.keybindingsTable = this._register(this.instantiationService.createInstance(WorkbenchTable, 'KeybindingsEditor', this.keybindingsTableContainer, new Delegate(), [
            {
                label: '',
                tooltip: '',
                weight: 0,
                minimumWidth: 40,
                maximumWidth: 40,
                templateId: ActionsColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('command', "Command"),
                tooltip: '',
                weight: 0.3,
                templateId: CommandColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('keybinding', "Keybinding"),
                tooltip: '',
                weight: 0.2,
                templateId: KeybindingColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('when', "When"),
                tooltip: '',
                weight: 0.35,
                templateId: WhenColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
            {
                label: localize('source', "Source"),
                tooltip: '',
                weight: 0.15,
                templateId: SourceColumnRenderer.TEMPLATE_ID,
                project(row) { return row; }
            },
        ], [
            this.instantiationService.createInstance(ActionsColumnRenderer, this),
            this.instantiationService.createInstance(CommandColumnRenderer),
            this.instantiationService.createInstance(KeybindingColumnRenderer),
            this.instantiationService.createInstance(WhenColumnRenderer, this),
            this.instantiationService.createInstance(SourceColumnRenderer),
        ], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            accessibilityProvider: new AccessibilityProvider(this.configurationService),
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => e.keybindingItem.commandLabel || e.keybindingItem.command },
            overrideStyles: {
                listBackground: editorBackground
            },
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            openOnSingleClick: false,
            transformOptimization: false // disable transform optimization as it causes the editor overflow widgets to be mispositioned
        }));
        this._register(this.keybindingsTable.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.keybindingsTable.onDidChangeFocus(e => this.onFocusChange()));
        this._register(this.keybindingsTable.onDidFocus(() => {
            this.keybindingsTable.getHTMLElement().classList.add('focused');
            this.onFocusChange();
        }));
        this._register(this.keybindingsTable.onDidBlur(() => {
            this.keybindingsTable.getHTMLElement().classList.remove('focused');
            this.keybindingFocusContextKey.reset();
        }));
        this._register(this.keybindingsTable.onDidOpen((e) => {
            // stop double click action on the input #148493
            if (e.browserEvent?.defaultPrevented) {
                return;
            }
            const activeKeybindingEntry = this.activeKeybindingEntry;
            if (activeKeybindingEntry) {
                this.defineKeybinding(activeKeybindingEntry, false);
            }
        }));
        DOM.append(this.keybindingsTableContainer, this.overflowWidgetsDomNode);
    }
    async render(preserveFocus) {
        if (this.input) {
            const input = this.input;
            this.keybindingsEditorModel = await input.resolve();
            await this.keybindingsEditorModel.resolve(this.getActionsLabels());
            this.renderKeybindingsEntries(false, preserveFocus);
            if (input.searchOptions) {
                this.recordKeysAction.checked = input.searchOptions.recordKeybindings;
                this.sortByPrecedenceAction.checked = input.searchOptions.sortByPrecedence;
                this.searchWidget.setValue(input.searchOptions.searchValue);
            }
            else {
                this.updateSearchOptions();
            }
        }
    }
    getActionsLabels() {
        const actionsLabels = new Map();
        for (const editorAction of EditorExtensionsRegistry.getEditorActions()) {
            actionsLabels.set(editorAction.id, editorAction.label);
        }
        for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
            if (isIMenuItem(menuItem)) {
                const title = typeof menuItem.command.title === 'string' ? menuItem.command.title : menuItem.command.title.value;
                const category = menuItem.command.category ? typeof menuItem.command.category === 'string' ? menuItem.command.category : menuItem.command.category.value : undefined;
                actionsLabels.set(menuItem.command.id, category ? `${category}: ${title}` : title);
            }
        }
        return actionsLabels;
    }
    filterKeybindings() {
        this.renderKeybindingsEntries(this.searchWidget.hasFocus());
        this.searchHistoryDelayer.trigger(() => {
            this.searchWidget.inputBox.addToHistory();
            this.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)['searchHistory'] = this.searchWidget.inputBox.getHistory();
            this.saveState();
        });
    }
    clearKeyboardShortcutSearchHistory() {
        this.searchWidget.inputBox.clearHistory();
        this.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)['searchHistory'] = this.searchWidget.inputBox.getHistory();
        this.saveState();
    }
    renderKeybindingsEntries(reset, preserveFocus) {
        if (this.keybindingsEditorModel) {
            const filter = this.searchWidget.getValue();
            const keybindingsEntries = this.keybindingsEditorModel.fetch(filter, this.sortByPrecedenceAction.checked);
            this.accessibilityService.alert(localize('foundResults', "{0} results", keybindingsEntries.length));
            this.ariaLabelElement.setAttribute('aria-label', this.getAriaLabel(keybindingsEntries));
            if (keybindingsEntries.length === 0) {
                this.latestEmptyFilters.push(filter);
            }
            const currentSelectedIndex = this.keybindingsTable.getSelection()[0];
            this.tableEntries = keybindingsEntries;
            this.keybindingsTable.splice(0, this.keybindingsTable.length, this.tableEntries);
            this.layoutKeybindingsTable();
            if (reset) {
                this.keybindingsTable.setSelection([]);
                this.keybindingsTable.setFocus([]);
            }
            else {
                if (this.unAssignedKeybindingItemToRevealAndFocus) {
                    const index = this.getNewIndexOfUnassignedKeybinding(this.unAssignedKeybindingItemToRevealAndFocus);
                    if (index !== -1) {
                        this.keybindingsTable.reveal(index, 0.2);
                        this.selectEntry(index);
                    }
                    this.unAssignedKeybindingItemToRevealAndFocus = null;
                }
                else if (currentSelectedIndex !== -1 && currentSelectedIndex < this.tableEntries.length) {
                    this.selectEntry(currentSelectedIndex, preserveFocus);
                }
                else if (this.editorService.activeEditorPane === this && !preserveFocus) {
                    this.focus();
                }
            }
        }
    }
    getAriaLabel(keybindingsEntries) {
        if (this.sortByPrecedenceAction.checked) {
            return localize('show sorted keybindings', "Showing {0} Keybindings in precedence order", keybindingsEntries.length);
        }
        else {
            return localize('show keybindings', "Showing {0} Keybindings in alphabetical order", keybindingsEntries.length);
        }
    }
    layoutKeybindingsTable() {
        if (!this.dimension) {
            return;
        }
        const tableHeight = this.dimension.height - (DOM.getDomNodePagePosition(this.headerContainer).height + 12 /*padding*/);
        this.keybindingsTableContainer.style.height = `${tableHeight}px`;
        this.keybindingsTable.layout(tableHeight);
    }
    getIndexOf(listEntry) {
        const index = this.tableEntries.indexOf(listEntry);
        if (index === -1) {
            for (let i = 0; i < this.tableEntries.length; i++) {
                if (this.tableEntries[i].id === listEntry.id) {
                    return i;
                }
            }
        }
        return index;
    }
    getNewIndexOfUnassignedKeybinding(unassignedKeybinding) {
        for (let index = 0; index < this.tableEntries.length; index++) {
            const entry = this.tableEntries[index];
            if (entry.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
                const keybindingItemEntry = entry;
                if (keybindingItemEntry.keybindingItem.command === unassignedKeybinding.keybindingItem.command) {
                    return index;
                }
            }
        }
        return -1;
    }
    selectEntry(keybindingItemEntry, focus = true) {
        const index = typeof keybindingItemEntry === 'number' ? keybindingItemEntry : this.getIndexOf(keybindingItemEntry);
        if (index !== -1 && index < this.keybindingsTable.length) {
            if (focus) {
                this.keybindingsTable.domFocus();
                this.keybindingsTable.setFocus([index]);
            }
            this.keybindingsTable.setSelection([index]);
        }
    }
    focusKeybindings() {
        this.keybindingsTable.domFocus();
        const currentFocusIndices = this.keybindingsTable.getFocus();
        this.keybindingsTable.setFocus([currentFocusIndices.length ? currentFocusIndices[0] : 0]);
    }
    selectKeybinding(keybindingItemEntry) {
        this.selectEntry(keybindingItemEntry);
    }
    recordSearchKeys() {
        this.recordKeysAction.checked = true;
    }
    toggleSortByPrecedence() {
        this.sortByPrecedenceAction.checked = !this.sortByPrecedenceAction.checked;
    }
    onContextMenu(e) {
        if (!e.element) {
            return;
        }
        if (e.element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
            const keybindingItemEntry = e.element;
            this.selectEntry(keybindingItemEntry);
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => [
                    this.createCopyAction(keybindingItemEntry),
                    this.createCopyCommandAction(keybindingItemEntry),
                    this.createCopyCommandTitleAction(keybindingItemEntry),
                    new Separator(),
                    ...(keybindingItemEntry.keybindingItem.keybinding
                        ? [this.createDefineKeybindingAction(keybindingItemEntry), this.createAddKeybindingAction(keybindingItemEntry)]
                        : [this.createDefineKeybindingAction(keybindingItemEntry)]),
                    new Separator(),
                    this.createRemoveAction(keybindingItemEntry),
                    this.createResetAction(keybindingItemEntry),
                    new Separator(),
                    this.createDefineWhenExpressionAction(keybindingItemEntry),
                    new Separator(),
                    this.createShowConflictsAction(keybindingItemEntry)
                ]
            });
        }
    }
    onFocusChange() {
        this.keybindingFocusContextKey.reset();
        const element = this.keybindingsTable.getFocusedElements()[0];
        if (!element) {
            return;
        }
        if (element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
            this.keybindingFocusContextKey.set(true);
        }
    }
    createDefineKeybindingAction(keybindingItemEntry) {
        return {
            label: keybindingItemEntry.keybindingItem.keybinding ? localize('changeLabel', "Change Keybinding...") : localize('addLabel', "Add Keybinding..."),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_DEFINE,
            run: () => this.defineKeybinding(keybindingItemEntry, false)
        };
    }
    createAddKeybindingAction(keybindingItemEntry) {
        return {
            label: localize('addLabel', "Add Keybinding..."),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_ADD,
            run: () => this.defineKeybinding(keybindingItemEntry, true)
        };
    }
    createDefineWhenExpressionAction(keybindingItemEntry) {
        return {
            label: localize('editWhen', "Change When Expression"),
            enabled: !!keybindingItemEntry.keybindingItem.keybinding,
            id: KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN,
            run: () => this.defineWhenExpression(keybindingItemEntry)
        };
    }
    createRemoveAction(keybindingItem) {
        return {
            label: localize('removeLabel', "Remove Keybinding"),
            enabled: !!keybindingItem.keybindingItem.keybinding,
            id: KEYBINDINGS_EDITOR_COMMAND_REMOVE,
            run: () => this.removeKeybinding(keybindingItem)
        };
    }
    createResetAction(keybindingItem) {
        return {
            label: localize('resetLabel', "Reset Keybinding"),
            enabled: !keybindingItem.keybindingItem.keybindingItem.isDefault,
            id: KEYBINDINGS_EDITOR_COMMAND_RESET,
            run: () => this.resetKeybinding(keybindingItem)
        };
    }
    createShowConflictsAction(keybindingItem) {
        return {
            label: localize('showSameKeybindings', "Show Same Keybindings"),
            enabled: !!keybindingItem.keybindingItem.keybinding,
            id: KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR,
            run: () => this.showSimilarKeybindings(keybindingItem)
        };
    }
    createCopyAction(keybindingItem) {
        return {
            label: localize('copyLabel', "Copy"),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_COPY,
            run: () => this.copyKeybinding(keybindingItem)
        };
    }
    createCopyCommandAction(keybinding) {
        return {
            label: localize('copyCommandLabel', "Copy Command ID"),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND,
            run: () => this.copyKeybindingCommand(keybinding)
        };
    }
    createCopyCommandTitleAction(keybinding) {
        return {
            label: localize('copyCommandTitleLabel', "Copy Command Title"),
            enabled: !!keybinding.keybindingItem.commandLabel,
            id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE,
            run: () => this.copyKeybindingCommandTitle(keybinding)
        };
    }
    onKeybindingEditingError(error) {
        this.notificationService.error(typeof error === 'string' ? error : localize('error', "Error '{0}' while editing the keybinding. Please open 'keybindings.json' file and check for errors.", `${error}`));
    }
};
KeybindingsEditor = KeybindingsEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingEditingService),
    __param(6, IContextKeyService),
    __param(7, INotificationService),
    __param(8, IClipboardService),
    __param(9, IInstantiationService),
    __param(10, IEditorService),
    __param(11, IStorageService),
    __param(12, IConfigurationService),
    __param(13, IAccessibilityService)
], KeybindingsEditor);
export { KeybindingsEditor };
class Delegate {
    constructor() {
        this.headerRowHeight = 30;
    }
    getHeight(element) {
        if (element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
            const commandIdMatched = element.keybindingItem.commandLabel && element.commandIdMatches;
            const commandDefaultLabelMatched = !!element.commandDefaultLabelMatches;
            const extensionIdMatched = !!element.extensionIdMatches;
            if (commandIdMatched && commandDefaultLabelMatched) {
                return 60;
            }
            if (extensionIdMatched || commandIdMatched || commandDefaultLabelMatched) {
                return 40;
            }
        }
        return 24;
    }
}
let ActionsColumnRenderer = class ActionsColumnRenderer {
    static { ActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(keybindingsEditor, keybindingsService) {
        this.keybindingsEditor = keybindingsEditor;
        this.keybindingsService = keybindingsService;
        this.templateId = ActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.actions'));
        const actionBar = new ActionBar(element);
        return { actionBar };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        templateData.actionBar.clear();
        const actions = [];
        if (keybindingItemEntry.keybindingItem.keybinding) {
            actions.push(this.createEditAction(keybindingItemEntry));
        }
        else {
            actions.push(this.createAddAction(keybindingItemEntry));
        }
        templateData.actionBar.push(actions, { icon: true });
    }
    createEditAction(keybindingItemEntry) {
        const keybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
        return {
            class: ThemeIcon.asClassName(keybindingsEditIcon),
            enabled: true,
            id: 'editKeybinding',
            tooltip: keybinding ? localize('editKeybindingLabelWithKey', "Change Keybinding {0}", `(${keybinding.getLabel()})`) : localize('editKeybindingLabel', "Change Keybinding"),
            run: () => this.keybindingsEditor.defineKeybinding(keybindingItemEntry, false)
        };
    }
    createAddAction(keybindingItemEntry) {
        const keybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
        return {
            class: ThemeIcon.asClassName(keybindingsAddIcon),
            enabled: true,
            id: 'addKeybinding',
            tooltip: keybinding ? localize('addKeybindingLabelWithKey', "Add Keybinding {0}", `(${keybinding.getLabel()})`) : localize('addKeybindingLabel', "Add Keybinding"),
            run: () => this.keybindingsEditor.defineKeybinding(keybindingItemEntry, false)
        };
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
};
ActionsColumnRenderer = ActionsColumnRenderer_1 = __decorate([
    __param(1, IKeybindingService)
], ActionsColumnRenderer);
let CommandColumnRenderer = class CommandColumnRenderer {
    static { CommandColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'commands'; }
    constructor(_hoverService) {
        this._hoverService = _hoverService;
        this.templateId = CommandColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const commandColumn = DOM.append(container, $('.command'));
        const commandColumnHover = this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), commandColumn, '');
        const commandLabelContainer = DOM.append(commandColumn, $('.command-label'));
        const commandLabel = new HighlightedLabel(commandLabelContainer);
        const commandDefaultLabelContainer = DOM.append(commandColumn, $('.command-default-label'));
        const commandDefaultLabel = new HighlightedLabel(commandDefaultLabelContainer);
        const commandIdLabelContainer = DOM.append(commandColumn, $('.command-id.code'));
        const commandIdLabel = new HighlightedLabel(commandIdLabelContainer);
        return { commandColumn, commandColumnHover, commandLabelContainer, commandLabel, commandDefaultLabelContainer, commandDefaultLabel, commandIdLabelContainer, commandIdLabel };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        const keybindingItem = keybindingItemEntry.keybindingItem;
        const commandIdMatched = !!(keybindingItem.commandLabel && keybindingItemEntry.commandIdMatches);
        const commandDefaultLabelMatched = !!keybindingItemEntry.commandDefaultLabelMatches;
        templateData.commandColumn.classList.toggle('vertical-align-column', commandIdMatched || commandDefaultLabelMatched);
        const title = keybindingItem.commandLabel ? localize('title', "{0} ({1})", keybindingItem.commandLabel, keybindingItem.command) : keybindingItem.command;
        templateData.commandColumn.setAttribute('aria-label', title);
        templateData.commandColumnHover.update(title);
        if (keybindingItem.commandLabel) {
            templateData.commandLabelContainer.classList.remove('hide');
            templateData.commandLabel.set(keybindingItem.commandLabel, keybindingItemEntry.commandLabelMatches);
        }
        else {
            templateData.commandLabelContainer.classList.add('hide');
            templateData.commandLabel.set(undefined);
        }
        if (keybindingItemEntry.commandDefaultLabelMatches) {
            templateData.commandDefaultLabelContainer.classList.remove('hide');
            templateData.commandDefaultLabel.set(keybindingItem.commandDefaultLabel, keybindingItemEntry.commandDefaultLabelMatches);
        }
        else {
            templateData.commandDefaultLabelContainer.classList.add('hide');
            templateData.commandDefaultLabel.set(undefined);
        }
        if (keybindingItemEntry.commandIdMatches || !keybindingItem.commandLabel) {
            templateData.commandIdLabelContainer.classList.remove('hide');
            templateData.commandIdLabel.set(keybindingItem.command, keybindingItemEntry.commandIdMatches);
        }
        else {
            templateData.commandIdLabelContainer.classList.add('hide');
            templateData.commandIdLabel.set(undefined);
        }
    }
    disposeTemplate(templateData) {
        templateData.commandColumnHover.dispose();
        templateData.commandDefaultLabel.dispose();
        templateData.commandIdLabel.dispose();
        templateData.commandLabel.dispose();
    }
};
CommandColumnRenderer = CommandColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], CommandColumnRenderer);
class KeybindingColumnRenderer {
    static { this.TEMPLATE_ID = 'keybindings'; }
    constructor() {
        this.templateId = KeybindingColumnRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.keybinding'));
        const keybindingLabel = new KeybindingLabel(DOM.append(element, $('div.keybinding-label')), OS, defaultKeybindingLabelStyles);
        return { keybindingLabel };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        if (keybindingItemEntry.keybindingItem.keybinding) {
            templateData.keybindingLabel.set(keybindingItemEntry.keybindingItem.keybinding, keybindingItemEntry.keybindingMatches);
        }
        else {
            templateData.keybindingLabel.set(undefined, undefined);
        }
    }
    disposeTemplate(templateData) {
        templateData.keybindingLabel.dispose();
    }
}
function onClick(element, callback) {
    const disposables = new DisposableStore();
    disposables.add(DOM.addDisposableListener(element, DOM.EventType.CLICK, DOM.finalHandler(callback)));
    disposables.add(DOM.addDisposableListener(element, DOM.EventType.KEY_UP, e => {
        const keyboardEvent = new StandardKeyboardEvent(e);
        if (keyboardEvent.equals(10 /* KeyCode.Space */) || keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            e.preventDefault();
            e.stopPropagation();
            callback();
        }
    }));
    return disposables;
}
let SourceColumnRenderer = class SourceColumnRenderer {
    static { SourceColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'source'; }
    constructor(extensionsWorkbenchService, hoverService) {
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.hoverService = hoverService;
        this.templateId = SourceColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const sourceColumn = DOM.append(container, $('.source'));
        const sourceColumnHover = this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), sourceColumn, '');
        const sourceLabel = new HighlightedLabel(DOM.append(sourceColumn, $('.source-label')));
        const extensionContainer = DOM.append(sourceColumn, $('.extension-container'));
        const extensionLabel = DOM.append(extensionContainer, $('a.extension-label', { tabindex: 0 }));
        const extensionId = new HighlightedLabel(DOM.append(extensionContainer, $('.extension-id-container.code')));
        return { sourceColumn, sourceColumnHover, sourceLabel, extensionLabel, extensionContainer, extensionId, disposables: new DisposableStore() };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        templateData.disposables.clear();
        if (isString(keybindingItemEntry.keybindingItem.source)) {
            templateData.extensionContainer.classList.add('hide');
            templateData.sourceLabel.element.classList.remove('hide');
            templateData.sourceColumnHover.update('');
            templateData.sourceLabel.set(keybindingItemEntry.keybindingItem.source || '-', keybindingItemEntry.sourceMatches);
        }
        else {
            templateData.extensionContainer.classList.remove('hide');
            templateData.sourceLabel.element.classList.add('hide');
            const extension = keybindingItemEntry.keybindingItem.source;
            const extensionLabel = extension.displayName ?? extension.identifier.value;
            templateData.sourceColumnHover.update(localize('extension label', "Extension ({0})", extensionLabel));
            templateData.extensionLabel.textContent = extensionLabel;
            templateData.disposables.add(onClick(templateData.extensionLabel, () => {
                this.extensionsWorkbenchService.open(extension.identifier.value);
            }));
            if (keybindingItemEntry.extensionIdMatches) {
                templateData.extensionId.element.classList.remove('hide');
                templateData.extensionId.set(extension.identifier.value, keybindingItemEntry.extensionIdMatches);
            }
            else {
                templateData.extensionId.element.classList.add('hide');
                templateData.extensionId.set(undefined);
            }
        }
    }
    disposeTemplate(templateData) {
        templateData.sourceColumnHover.dispose();
        templateData.disposables.dispose();
        templateData.sourceLabel.dispose();
        templateData.extensionId.dispose();
    }
};
SourceColumnRenderer = SourceColumnRenderer_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IHoverService)
], SourceColumnRenderer);
let WhenInputWidget = class WhenInputWidget extends Disposable {
    constructor(parent, keybindingsEditor, instantiationService, contextKeyService) {
        super();
        this._onDidAccept = this._register(new Emitter());
        this.onDidAccept = this._onDidAccept.event;
        this._onDidReject = this._register(new Emitter());
        this.onDidReject = this._onDidReject.event;
        const focusContextKey = CONTEXT_WHEN_FOCUS.bindTo(contextKeyService);
        this.input = this._register(instantiationService.createInstance(SuggestEnabledInput, 'keyboardshortcutseditor#wheninput', parent, {
            provideResults: () => {
                const result = [];
                for (const contextKey of RawContextKey.all()) {
                    result.push({ label: contextKey.key, documentation: contextKey.description, detail: contextKey.type, kind: 14 /* CompletionItemKind.Constant */ });
                }
                return result;
            },
            triggerCharacters: ['!', ' '],
            wordDefinition: /[a-zA-Z.]+/,
            alwaysShowSuggestions: true,
        }, '', `keyboardshortcutseditor#wheninput`, { focusContextKey, overflowWidgetsDomNode: keybindingsEditor.overflowWidgetsDomNode }));
        this._register((DOM.addDisposableListener(this.input.element, DOM.EventType.DBLCLICK, e => DOM.EventHelper.stop(e))));
        this._register(toDisposable(() => focusContextKey.reset()));
        this._register(keybindingsEditor.onAcceptWhenExpression(() => this._onDidAccept.fire(this.input.getValue())));
        this._register(Event.any(keybindingsEditor.onRejectWhenExpression, this.input.onDidBlur)(() => this._onDidReject.fire()));
    }
    layout(dimension) {
        this.input.layout(dimension);
    }
    show(value) {
        this.input.setValue(value);
        this.input.focus(true);
    }
};
WhenInputWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextKeyService)
], WhenInputWidget);
let WhenColumnRenderer = class WhenColumnRenderer {
    static { WhenColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'when'; }
    constructor(keybindingsEditor, hoverService, instantiationService) {
        this.keybindingsEditor = keybindingsEditor;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.templateId = WhenColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.when'));
        const whenLabelContainer = DOM.append(element, $('div.when-label'));
        const whenLabel = new HighlightedLabel(whenLabelContainer);
        const whenInputContainer = DOM.append(element, $('div.when-input-container'));
        return {
            element,
            whenLabelContainer,
            whenLabel,
            whenInputContainer,
            disposables: new DisposableStore(),
        };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        templateData.disposables.clear();
        const whenInputDisposables = templateData.disposables.add(new DisposableStore());
        templateData.disposables.add(this.keybindingsEditor.onDefineWhenExpression(e => {
            if (keybindingItemEntry === e) {
                templateData.element.classList.add('input-mode');
                const inputWidget = whenInputDisposables.add(this.instantiationService.createInstance(WhenInputWidget, templateData.whenInputContainer, this.keybindingsEditor));
                inputWidget.layout(new DOM.Dimension(templateData.element.parentElement.clientWidth, 18));
                inputWidget.show(keybindingItemEntry.keybindingItem.when || '');
                const hideInputWidget = () => {
                    whenInputDisposables.clear();
                    templateData.element.classList.remove('input-mode');
                    templateData.element.parentElement.style.paddingLeft = '10px';
                    DOM.clearNode(templateData.whenInputContainer);
                };
                whenInputDisposables.add(inputWidget.onDidAccept(value => {
                    hideInputWidget();
                    this.keybindingsEditor.updateKeybinding(keybindingItemEntry, keybindingItemEntry.keybindingItem.keybinding ? keybindingItemEntry.keybindingItem.keybinding.getUserSettingsLabel() || '' : '', value);
                    this.keybindingsEditor.selectKeybinding(keybindingItemEntry);
                }));
                whenInputDisposables.add(inputWidget.onDidReject(() => {
                    hideInputWidget();
                    this.keybindingsEditor.selectKeybinding(keybindingItemEntry);
                }));
                templateData.element.parentElement.style.paddingLeft = '0px';
            }
        }));
        templateData.whenLabelContainer.classList.toggle('code', !!keybindingItemEntry.keybindingItem.when);
        templateData.whenLabelContainer.classList.toggle('empty', !keybindingItemEntry.keybindingItem.when);
        if (keybindingItemEntry.keybindingItem.when) {
            templateData.whenLabel.set(keybindingItemEntry.keybindingItem.when, keybindingItemEntry.whenMatches, keybindingItemEntry.keybindingItem.when);
            templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.element, keybindingItemEntry.keybindingItem.when));
        }
        else {
            templateData.whenLabel.set('-');
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
        templateData.whenLabel.dispose();
    }
};
WhenColumnRenderer = WhenColumnRenderer_1 = __decorate([
    __param(1, IHoverService),
    __param(2, IInstantiationService)
], WhenColumnRenderer);
class AccessibilityProvider {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getWidgetAriaLabel() {
        return localize('keybindingsLabel', "Keybindings");
    }
    getAriaLabel({ keybindingItem }) {
        const ariaLabel = [
            keybindingItem.commandLabel ? keybindingItem.commandLabel : keybindingItem.command,
            keybindingItem.keybinding?.getAriaLabel() || localize('noKeybinding', "No keybinding assigned"),
            keybindingItem.when ? keybindingItem.when : localize('noWhen', "No when context"),
            isString(keybindingItem.source) ? keybindingItem.source : keybindingItem.source.description ?? keybindingItem.source.identifier.value,
        ];
        if (this.configurationService.getValue("accessibility.verbosity.keybindingsEditor" /* AccessibilityVerbositySettingId.KeybindingsEditor */)) {
            const kbEditorAriaLabel = localize('keyboard shortcuts aria label', "use space or enter to change the keybinding.");
            ariaLabel.push(kbEditorAriaLabel);
        }
        return ariaLabel.join(', ');
    }
}
registerColor('keybindingTable.headerBackground', tableOddRowsBackgroundColor, 'Background color for the keyboard shortcuts table header.');
registerColor('keybindingTable.rowsBackground', tableOddRowsBackgroundColor, 'Background color for the keyboard shortcuts table alternating rows.');
registerThemingParticipant((theme, collector) => {
    const foregroundColor = theme.getColor(foreground);
    if (foregroundColor) {
        const whenForegroundColor = foregroundColor.transparent(.8).makeOpaque(WORKBENCH_BACKGROUND(theme));
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listActiveSelectionForegroundColor = theme.getColor(listActiveSelectionForeground);
    const listActiveSelectionBackgroundColor = theme.getColor(listActiveSelectionBackground);
    if (listActiveSelectionForegroundColor && listActiveSelectionBackgroundColor) {
        const whenForegroundColor = listActiveSelectionForegroundColor.transparent(.8).makeOpaque(listActiveSelectionBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table.focused .monaco-list-row.selected .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listInactiveSelectionForegroundColor = theme.getColor(listInactiveSelectionForeground);
    const listInactiveSelectionBackgroundColor = theme.getColor(listInactiveSelectionBackground);
    if (listInactiveSelectionForegroundColor && listInactiveSelectionBackgroundColor) {
        const whenForegroundColor = listInactiveSelectionForegroundColor.transparent(.8).makeOpaque(listInactiveSelectionBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table .monaco-list-row.selected .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listFocusForegroundColor = theme.getColor(listFocusForeground);
    const listFocusBackgroundColor = theme.getColor(listFocusBackground);
    if (listFocusForegroundColor && listFocusBackgroundColor) {
        const whenForegroundColor = listFocusForegroundColor.transparent(.8).makeOpaque(listFocusBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table.focused .monaco-list-row.focused .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listHoverForegroundColor = theme.getColor(listHoverForeground);
    const listHoverBackgroundColor = theme.getColor(listHoverBackground);
    if (listHoverForegroundColor && listHoverBackgroundColor) {
        const whenForegroundColor = listHoverForegroundColor.transparent(.8).makeOpaque(listHoverBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table.focused .monaco-list-row:hover:not(.focused):not(.selected) .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9rZXliaW5kaW5nc0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyw0REFBNEQ7Ozs7Ozs7Ozs7O0FBRTVELE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2pHLE9BQU8sRUFBVyxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQTBC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
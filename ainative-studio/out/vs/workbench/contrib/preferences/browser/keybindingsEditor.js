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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLDREQUE0RDs7Ozs7Ozs7Ozs7QUFFNUQsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDakcsT0FBTyxFQUFXLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBMEIs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
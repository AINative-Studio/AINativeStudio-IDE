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
var SearchWidget_1;
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Action } from '../../../../base/common/actions.js';
import { Delayer } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { CONTEXT_FIND_WIDGET_NOT_VISIBLE } from '../../../../editor/contrib/find/browser/findModel.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ContextScopedReplaceInput } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { appendKeyBindingLabel, isSearchViewFocused, getSearchView } from './searchActionsBase.js';
import * as Constants from '../common/constants.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { searchReplaceAllIcon, searchHideReplaceIcon, searchShowContextIcon, searchShowReplaceIcon } from './searchIcons.js';
import { ToggleSearchEditorContextLinesCommandId } from '../../searchEditor/browser/constants.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { defaultInputBoxStyles, defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { NotebookFindFilters } from '../../notebook/browser/contrib/find/findFilters.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { NotebookEditorInput } from '../../notebook/common/notebookEditorInput.js';
import { SearchFindInput } from './searchFindInput.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
import { NotebookFindScopeType } from '../../notebook/common/notebookCommon.js';
/** Specified in searchview.css */
const SingleLineInputHeight = 26;
class ReplaceAllAction extends Action {
    static { this.ID = 'search.action.replaceAll'; }
    constructor(_searchWidget) {
        super(ReplaceAllAction.ID, '', ThemeIcon.asClassName(searchReplaceAllIcon), false);
        this._searchWidget = _searchWidget;
    }
    set searchWidget(searchWidget) {
        this._searchWidget = searchWidget;
    }
    run() {
        if (this._searchWidget) {
            return this._searchWidget.triggerReplaceAll();
        }
        return Promise.resolve(null);
    }
}
const ctrlKeyMod = (isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */);
function stopPropagationForMultiLineUpwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea && (isMultiline || textarea.clientHeight > SingleLineInputHeight) && textarea.selectionStart > 0) {
        event.stopPropagation();
        return;
    }
}
function stopPropagationForMultiLineDownwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea && (isMultiline || textarea.clientHeight > SingleLineInputHeight) && textarea.selectionEnd < textarea.value.length) {
        event.stopPropagation();
        return;
    }
}
let SearchWidget = class SearchWidget extends Widget {
    static { SearchWidget_1 = this; }
    static { this.INPUT_MAX_HEIGHT = 134; }
    static { this.REPLACE_ALL_DISABLED_LABEL = nls.localize('search.action.replaceAll.disabled.label', "Replace All (Submit Search to Enable)"); }
    static { this.REPLACE_ALL_ENABLED_LABEL = (keyBindingService2) => {
        const kb = keyBindingService2.lookupKeybinding(ReplaceAllAction.ID);
        return appendKeyBindingLabel(nls.localize('search.action.replaceAll.enabled.label', "Replace All"), kb);
    }; }
    constructor(container, options, contextViewService, contextKeyService, keybindingService, clipboardServce, configurationService, accessibilityService, contextMenuService, instantiationService, editorService) {
        super();
        this.contextViewService = contextViewService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this.clipboardServce = clipboardServce;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.ignoreGlobalFindBufferOnNextFocus = false;
        this.previousGlobalFindBufferValue = null;
        this._onSearchSubmit = this._register(new Emitter());
        this.onSearchSubmit = this._onSearchSubmit.event;
        this._onSearchCancel = this._register(new Emitter());
        this.onSearchCancel = this._onSearchCancel.event;
        this._onReplaceToggled = this._register(new Emitter());
        this.onReplaceToggled = this._onReplaceToggled.event;
        this._onReplaceStateChange = this._register(new Emitter());
        this.onReplaceStateChange = this._onReplaceStateChange.event;
        this._onPreserveCaseChange = this._register(new Emitter());
        this.onPreserveCaseChange = this._onPreserveCaseChange.event;
        this._onReplaceValueChanged = this._register(new Emitter());
        this.onReplaceValueChanged = this._onReplaceValueChanged.event;
        this._onReplaceAll = this._register(new Emitter());
        this.onReplaceAll = this._onReplaceAll.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this._onDidHeightChange = this._register(new Emitter());
        this.onDidHeightChange = this._onDidHeightChange.event;
        this._onDidToggleContext = new Emitter();
        this.onDidToggleContext = this._onDidToggleContext.event;
        this.replaceActive = Constants.SearchContext.ReplaceActiveKey.bindTo(this.contextKeyService);
        this.searchInputBoxFocused = Constants.SearchContext.SearchInputBoxFocusedKey.bindTo(this.contextKeyService);
        this.replaceInputBoxFocused = Constants.SearchContext.ReplaceInputBoxFocusedKey.bindTo(this.contextKeyService);
        const notebookOptions = options.notebookOptions ??
            {
                isInNotebookMarkdownInput: true,
                isInNotebookMarkdownPreview: true,
                isInNotebookCellInput: true,
                isInNotebookCellOutput: true
            };
        this._notebookFilters = this._register(new NotebookFindFilters(notebookOptions.isInNotebookMarkdownInput, notebookOptions.isInNotebookMarkdownPreview, notebookOptions.isInNotebookCellInput, notebookOptions.isInNotebookCellOutput, { findScopeType: NotebookFindScopeType.None }));
        this._register(this._notebookFilters.onDidChange(() => {
            if (this.searchInput) {
                this.searchInput.updateFilterStyles();
            }
        }));
        this._register(this.editorService.onDidEditorsChange((e) => {
            if (this.searchInput &&
                e.event.editor instanceof NotebookEditorInput &&
                (e.event.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */ || e.event.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */)) {
                this.searchInput.filterVisible = this._hasNotebookOpen();
            }
        }));
        this._replaceHistoryDelayer = new Delayer(500);
        this._toggleReplaceButtonListener = this._register(new MutableDisposable());
        this.render(container, options);
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.accessibilitySupport')) {
                this.updateAccessibilitySupport();
            }
        }));
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this.updateAccessibilitySupport()));
        this.updateAccessibilitySupport();
    }
    _hasNotebookOpen() {
        const editors = this.editorService.editors;
        return editors.some(editor => editor instanceof NotebookEditorInput);
    }
    getNotebookFilters() {
        return this._notebookFilters;
    }
    focus(select = true, focusReplace = false, suppressGlobalSearchBuffer = false) {
        this.ignoreGlobalFindBufferOnNextFocus = suppressGlobalSearchBuffer;
        if (focusReplace && this.isReplaceShown()) {
            if (this.replaceInput) {
                this.replaceInput.focus();
                if (select) {
                    this.replaceInput.select();
                }
            }
        }
        else {
            if (this.searchInput) {
                this.searchInput.focus();
                if (select) {
                    this.searchInput.select();
                }
            }
        }
    }
    setWidth(width) {
        this.searchInput?.inputBox.layout();
        if (this.replaceInput) {
            this.replaceInput.width = width - 28;
            this.replaceInput.inputBox.layout();
        }
    }
    clear() {
        this.searchInput?.clear();
        this.replaceInput?.setValue('');
        this.setReplaceAllActionState(false);
    }
    isReplaceShown() {
        return this.replaceContainer ? !this.replaceContainer.classList.contains('disabled') : false;
    }
    isReplaceActive() {
        return !!this.replaceActive.get();
    }
    getReplaceValue() {
        return this.replaceInput?.getValue() ?? '';
    }
    toggleReplace(show) {
        if (show === undefined || show !== this.isReplaceShown()) {
            this.onToggleReplaceButton();
        }
    }
    getSearchHistory() {
        return this.searchInput?.inputBox.getHistory() ?? [];
    }
    getReplaceHistory() {
        return this.replaceInput?.inputBox.getHistory() ?? [];
    }
    prependSearchHistory(history) {
        this.searchInput?.inputBox.prependHistory(history);
    }
    prependReplaceHistory(history) {
        this.replaceInput?.inputBox.prependHistory(history);
    }
    clearHistory() {
        this.searchInput?.inputBox.clearHistory();
        this.replaceInput?.inputBox.clearHistory();
    }
    showNextSearchTerm() {
        this.searchInput?.inputBox.showNextValue();
    }
    showPreviousSearchTerm() {
        this.searchInput?.inputBox.showPreviousValue();
    }
    showNextReplaceTerm() {
        this.replaceInput?.inputBox.showNextValue();
    }
    showPreviousReplaceTerm() {
        this.replaceInput?.inputBox.showPreviousValue();
    }
    searchInputHasFocus() {
        return !!this.searchInputBoxFocused.get();
    }
    replaceInputHasFocus() {
        return !!this.replaceInput?.inputBox.hasFocus();
    }
    focusReplaceAllAction() {
        this.replaceActionBar?.focus(true);
    }
    focusRegexAction() {
        this.searchInput?.focusOnRegex();
    }
    set replaceButtonVisibility(val) {
        if (this.toggleReplaceButton) {
            this.toggleReplaceButton.element.style.display = val ? '' : 'none';
        }
    }
    render(container, options) {
        this.domNode = dom.append(container, dom.$('.search-widget'));
        this.domNode.style.position = 'relative';
        if (!options._hideReplaceToggle) {
            this.renderToggleReplaceButton(this.domNode);
        }
        this.renderSearchInput(this.domNode, options);
        this.renderReplaceInput(this.domNode, options);
    }
    updateAccessibilitySupport() {
        this.searchInput?.setFocusInputOnOptionClick(!this.accessibilityService.isScreenReaderOptimized());
    }
    renderToggleReplaceButton(parent) {
        const opts = {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined,
            title: nls.localize('search.replace.toggle.button.title', "Toggle Replace"),
            hoverDelegate: getDefaultHoverDelegate('element'),
        };
        this.toggleReplaceButton = this._register(new Button(parent, opts));
        this.toggleReplaceButton.element.setAttribute('aria-expanded', 'false');
        this.toggleReplaceButton.element.classList.add('toggle-replace-button');
        this.toggleReplaceButton.icon = searchHideReplaceIcon;
        this._toggleReplaceButtonListener.value = this.toggleReplaceButton.onDidClick(() => this.onToggleReplaceButton());
    }
    renderSearchInput(parent, options) {
        const history = options.searchHistory || [];
        const inputOptions = {
            label: nls.localize('label.Search', 'Search: Type Search Term and press Enter to search'),
            validation: (value) => this.validateSearchInput(value),
            placeholder: nls.localize('search.placeHolder', "Search"),
            appendCaseSensitiveLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchCaseSensitive" /* Constants.SearchCommandIds.ToggleCaseSensitiveCommandId */)),
            appendWholeWordsLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchWholeWord" /* Constants.SearchCommandIds.ToggleWholeWordCommandId */)),
            appendRegexLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchRegex" /* Constants.SearchCommandIds.ToggleRegexCommandId */)),
            history: new Set(history),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            flexibleHeight: true,
            flexibleMaxHeight: SearchWidget_1.INPUT_MAX_HEIGHT,
            showCommonFindToggles: true,
            inputBoxStyles: options.inputBoxStyles,
            toggleStyles: options.toggleStyles
        };
        const searchInputContainer = dom.append(parent, dom.$('.search-container.input-box'));
        this.searchInput = this._register(new SearchFindInput(searchInputContainer, this.contextViewService, inputOptions, this.contextKeyService, this.contextMenuService, this.instantiationService, this._notebookFilters, this._hasNotebookOpen()));
        this._register(this.searchInput.onKeyDown((keyboardEvent) => this.onSearchInputKeyDown(keyboardEvent)));
        this.searchInput.setValue(options.value || '');
        this.searchInput.setRegex(!!options.isRegex);
        this.searchInput.setCaseSensitive(!!options.isCaseSensitive);
        this.searchInput.setWholeWords(!!options.isWholeWords);
        this._register(this.searchInput.onCaseSensitiveKeyDown((keyboardEvent) => this.onCaseSensitiveKeyDown(keyboardEvent)));
        this._register(this.searchInput.onRegexKeyDown((keyboardEvent) => this.onRegexKeyDown(keyboardEvent)));
        this._register(this.searchInput.inputBox.onDidChange(() => this.onSearchInputChanged()));
        this._register(this.searchInput.inputBox.onDidHeightChange(() => this._onDidHeightChange.fire()));
        this._register(this.onReplaceValueChanged(() => {
            this._replaceHistoryDelayer.trigger(() => this.replaceInput?.inputBox.addToHistory());
        }));
        this.searchInputFocusTracker = this._register(dom.trackFocus(this.searchInput.inputBox.inputElement));
        this._register(this.searchInputFocusTracker.onDidFocus(async () => {
            this.searchInputBoxFocused.set(true);
            const useGlobalFindBuffer = this.searchConfiguration.globalFindClipboard;
            if (!this.ignoreGlobalFindBufferOnNextFocus && useGlobalFindBuffer) {
                const globalBufferText = await this.clipboardServce.readFindText();
                if (globalBufferText && this.previousGlobalFindBufferValue !== globalBufferText) {
                    this.searchInput?.inputBox.addToHistory();
                    this.searchInput?.setValue(globalBufferText);
                    this.searchInput?.select();
                }
                this.previousGlobalFindBufferValue = globalBufferText;
            }
            this.ignoreGlobalFindBufferOnNextFocus = false;
        }));
        this._register(this.searchInputFocusTracker.onDidBlur(() => this.searchInputBoxFocused.set(false)));
        this.showContextToggle = new Toggle({
            isChecked: false,
            title: appendKeyBindingLabel(nls.localize('showContext', "Toggle Context Lines"), this.keybindingService.lookupKeybinding(ToggleSearchEditorContextLinesCommandId)),
            icon: searchShowContextIcon,
            hoverDelegate: getDefaultHoverDelegate('element'),
            ...defaultToggleStyles
        });
        this._register(this.showContextToggle.onChange(() => this.onContextLinesChanged()));
        if (options.showContextToggle) {
            this.contextLinesInput = new InputBox(searchInputContainer, this.contextViewService, { type: 'number', inputBoxStyles: defaultInputBoxStyles });
            this.contextLinesInput.element.classList.add('context-lines-input');
            this.contextLinesInput.value = '' + (this.configurationService.getValue('search').searchEditor.defaultNumberOfContextLines ?? 1);
            this._register(this.contextLinesInput.onDidChange((value) => {
                if (value !== '0') {
                    this.showContextToggle.checked = true;
                }
                this.onContextLinesChanged();
            }));
            dom.append(searchInputContainer, this.showContextToggle.domNode);
        }
    }
    onContextLinesChanged() {
        this._onDidToggleContext.fire();
        if (this.contextLinesInput.value.includes('-')) {
            this.contextLinesInput.value = '0';
        }
        this._onDidToggleContext.fire();
    }
    setContextLines(lines) {
        if (!this.contextLinesInput) {
            return;
        }
        if (lines === 0) {
            this.showContextToggle.checked = false;
        }
        else {
            this.showContextToggle.checked = true;
            this.contextLinesInput.value = '' + lines;
        }
    }
    renderReplaceInput(parent, options) {
        this.replaceContainer = dom.append(parent, dom.$('.replace-container.disabled'));
        const replaceBox = dom.append(this.replaceContainer, dom.$('.replace-input'));
        this.replaceInput = this._register(new ContextScopedReplaceInput(replaceBox, this.contextViewService, {
            label: nls.localize('label.Replace', 'Replace: Type replace term and press Enter to preview'),
            placeholder: nls.localize('search.replace.placeHolder', "Replace"),
            appendPreserveCaseLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchPreserveCase" /* Constants.SearchCommandIds.TogglePreserveCaseId */)),
            history: new Set(options.replaceHistory),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            flexibleHeight: true,
            flexibleMaxHeight: SearchWidget_1.INPUT_MAX_HEIGHT,
            inputBoxStyles: options.inputBoxStyles,
            toggleStyles: options.toggleStyles
        }, this.contextKeyService, true));
        this._register(this.replaceInput.onDidOptionChange(viaKeyboard => {
            if (!viaKeyboard) {
                if (this.replaceInput) {
                    this._onPreserveCaseChange.fire(this.replaceInput.getPreserveCase());
                }
            }
        }));
        this._register(this.replaceInput.onKeyDown((keyboardEvent) => this.onReplaceInputKeyDown(keyboardEvent)));
        this.replaceInput.setValue(options.replaceValue || '');
        this._register(this.replaceInput.inputBox.onDidChange(() => this._onReplaceValueChanged.fire()));
        this._register(this.replaceInput.inputBox.onDidHeightChange(() => this._onDidHeightChange.fire()));
        this.replaceAllAction = new ReplaceAllAction(this);
        this.replaceAllAction.label = SearchWidget_1.REPLACE_ALL_DISABLED_LABEL;
        this.replaceActionBar = this._register(new ActionBar(this.replaceContainer));
        this.replaceActionBar.push([this.replaceAllAction], { icon: true, label: false });
        this.onkeydown(this.replaceActionBar.domNode, (keyboardEvent) => this.onReplaceActionbarKeyDown(keyboardEvent));
        this.replaceInputFocusTracker = this._register(dom.trackFocus(this.replaceInput.inputBox.inputElement));
        this._register(this.replaceInputFocusTracker.onDidFocus(() => this.replaceInputBoxFocused.set(true)));
        this._register(this.replaceInputFocusTracker.onDidBlur(() => this.replaceInputBoxFocused.set(false)));
        this._register(this.replaceInput.onPreserveCaseKeyDown((keyboardEvent) => this.onPreserveCaseKeyDown(keyboardEvent)));
    }
    triggerReplaceAll() {
        this._onReplaceAll.fire();
        return Promise.resolve(null);
    }
    onToggleReplaceButton() {
        this.replaceContainer?.classList.toggle('disabled');
        if (this.isReplaceShown()) {
            this.toggleReplaceButton?.element.classList.remove(...ThemeIcon.asClassNameArray(searchHideReplaceIcon));
            this.toggleReplaceButton?.element.classList.add(...ThemeIcon.asClassNameArray(searchShowReplaceIcon));
        }
        else {
            this.toggleReplaceButton?.element.classList.remove(...ThemeIcon.asClassNameArray(searchShowReplaceIcon));
            this.toggleReplaceButton?.element.classList.add(...ThemeIcon.asClassNameArray(searchHideReplaceIcon));
        }
        this.toggleReplaceButton?.element.setAttribute('aria-expanded', this.isReplaceShown() ? 'true' : 'false');
        this.updateReplaceActiveState();
        this._onReplaceToggled.fire();
    }
    setValue(value) {
        this.searchInput?.setValue(value);
    }
    setReplaceAllActionState(enabled) {
        if (this.replaceAllAction && (this.replaceAllAction.enabled !== enabled)) {
            this.replaceAllAction.enabled = enabled;
            this.replaceAllAction.label = enabled ? SearchWidget_1.REPLACE_ALL_ENABLED_LABEL(this.keybindingService) : SearchWidget_1.REPLACE_ALL_DISABLED_LABEL;
            this.updateReplaceActiveState();
        }
    }
    updateReplaceActiveState() {
        const currentState = this.isReplaceActive();
        const newState = this.isReplaceShown() && !!this.replaceAllAction?.enabled;
        if (currentState !== newState) {
            this.replaceActive.set(newState);
            this._onReplaceStateChange.fire(newState);
            this.replaceInput?.inputBox.layout();
        }
    }
    validateSearchInput(value) {
        if (value.length === 0) {
            return null;
        }
        if (!(this.searchInput?.getRegex())) {
            return null;
        }
        try {
            new RegExp(value, 'u');
        }
        catch (e) {
            return { content: e.message };
        }
        return null;
    }
    onSearchInputChanged() {
        this.searchInput?.clearMessage();
        this.setReplaceAllActionState(false);
        if (this.searchConfiguration.searchOnType) {
            if (this.searchInput?.getRegex()) {
                try {
                    const regex = new RegExp(this.searchInput.getValue(), 'ug');
                    const matchienessHeuristic = `
								~!@#$%^&*()_+
								\`1234567890-=
								qwertyuiop[]\\
								QWERTYUIOP{}|
								asdfghjkl;'
								ASDFGHJKL:"
								zxcvbnm,./
								ZXCVBNM<>? `.match(regex)?.length ?? 0;
                    const delayMultiplier = matchienessHeuristic < 50 ? 1 :
                        matchienessHeuristic < 100 ? 5 : // expressions like `.` or `\w`
                            10; // only things matching empty string
                    this.submitSearch(true, this.searchConfiguration.searchOnTypeDebouncePeriod * delayMultiplier);
                }
                catch {
                    // pass
                }
            }
            else {
                this.submitSearch(true, this.searchConfiguration.searchOnTypeDebouncePeriod);
            }
        }
    }
    onSearchInputKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            this.searchInput?.inputBox.insertAtCursor('\n');
            keyboardEvent.preventDefault();
        }
        if (keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            this.searchInput?.onSearchSubmit();
            this.submitSearch();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(9 /* KeyCode.Escape */)) {
            this._onSearchCancel.fire({ focus: true });
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            if (this.isReplaceShown()) {
                this.replaceInput?.focus();
            }
            else {
                this.searchInput?.focusOnCaseSensitive();
            }
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(16 /* KeyCode.UpArrow */)) {
            stopPropagationForMultiLineUpwards(keyboardEvent, this.searchInput?.getValue() ?? '', this.searchInput?.domNode.querySelector('textarea') ?? null);
        }
        else if (keyboardEvent.equals(18 /* KeyCode.DownArrow */)) {
            stopPropagationForMultiLineDownwards(keyboardEvent, this.searchInput?.getValue() ?? '', this.searchInput?.domNode.querySelector('textarea') ?? null);
        }
        else if (keyboardEvent.equals(11 /* KeyCode.PageUp */)) {
            const inputElement = this.searchInput?.inputBox.inputElement;
            if (inputElement) {
                inputElement.setSelectionRange(0, 0);
                inputElement.focus();
                keyboardEvent.preventDefault();
            }
        }
        else if (keyboardEvent.equals(12 /* KeyCode.PageDown */)) {
            const inputElement = this.searchInput?.inputBox.inputElement;
            if (inputElement) {
                const endOfText = inputElement.value.length;
                inputElement.setSelectionRange(endOfText, endOfText);
                inputElement.focus();
                keyboardEvent.preventDefault();
            }
        }
    }
    onCaseSensitiveKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            if (this.isReplaceShown()) {
                this.replaceInput?.focus();
                keyboardEvent.preventDefault();
            }
        }
    }
    onRegexKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            if (this.isReplaceShown()) {
                this.replaceInput?.focusOnPreserve();
                keyboardEvent.preventDefault();
            }
        }
    }
    onPreserveCaseKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            if (this.isReplaceActive()) {
                this.focusReplaceAllAction();
            }
            else {
                this._onBlur.fire();
            }
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this.focusRegexAction();
            keyboardEvent.preventDefault();
        }
    }
    onReplaceInputKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            this.replaceInput?.inputBox.insertAtCursor('\n');
            keyboardEvent.preventDefault();
        }
        if (keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            this.submitSearch();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            this.searchInput?.focusOnCaseSensitive();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this.searchInput?.focus();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(16 /* KeyCode.UpArrow */)) {
            stopPropagationForMultiLineUpwards(keyboardEvent, this.replaceInput?.getValue() ?? '', this.replaceInput?.domNode.querySelector('textarea') ?? null);
        }
        else if (keyboardEvent.equals(18 /* KeyCode.DownArrow */)) {
            stopPropagationForMultiLineDownwards(keyboardEvent, this.replaceInput?.getValue() ?? '', this.replaceInput?.domNode.querySelector('textarea') ?? null);
        }
    }
    onReplaceActionbarKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this.focusRegexAction();
            keyboardEvent.preventDefault();
        }
    }
    async submitSearch(triggeredOnType = false, delay = 0) {
        this.searchInput?.validate();
        if (!this.searchInput?.inputBox.isInputValid()) {
            return;
        }
        const value = this.searchInput.getValue();
        const useGlobalFindBuffer = this.searchConfiguration.globalFindClipboard;
        if (value && useGlobalFindBuffer) {
            await this.clipboardServce.writeFindText(value);
        }
        this._onSearchSubmit.fire({ triggeredOnType, delay });
    }
    getContextLines() {
        return this.showContextToggle.checked ? +this.contextLinesInput.value : 0;
    }
    modifyContextLines(increase) {
        const current = +this.contextLinesInput.value;
        const modified = current + (increase ? 1 : -1);
        this.showContextToggle.checked = modified !== 0;
        this.contextLinesInput.value = '' + modified;
    }
    toggleContextLines() {
        this.showContextToggle.checked = !this.showContextToggle.checked;
        this.onContextLinesChanged();
    }
    dispose() {
        this.setReplaceAllActionState(false);
        super.dispose();
    }
    get searchConfiguration() {
        return this.configurationService.getValue('search');
    }
};
SearchWidget = SearchWidget_1 = __decorate([
    __param(2, IContextViewService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IClipboardService),
    __param(6, IConfigurationService),
    __param(7, IAccessibilityService),
    __param(8, IContextMenuService),
    __param(9, IInstantiationService),
    __param(10, IEditorService)
], SearchWidget);
export { SearchWidget };
export function registerContributions() {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: ReplaceAllAction.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, CONTEXT_FIND_WIDGET_NOT_VISIBLE),
        primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
        handler: accessor => {
            const viewsService = accessor.get(IViewsService);
            if (isSearchViewFocused(viewsService)) {
                const searchView = getSearchView(viewsService);
                if (searchView) {
                    new ReplaceAllAction(searchView.searchAndReplaceWidget).run();
                }
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFFdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxNQUFNLEVBQWtCLE1BQU0sOENBQThDLENBQUM7QUFHdEYsT0FBTyxFQUE2QixRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFD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
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
import * as nls from '../../../../../../nls.js';
import * as dom from '../../../../../../base/browser/dom.js';
import './notebookFindReplaceWidget.css';
import { ActionBar } from '../../../../../../base/browser/ui/actionbar/actionbar.js';
import { DropdownMenuActionViewItem } from '../../../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { FindInput } from '../../../../../../base/browser/ui/findinput/findInput.js';
import { ProgressBar } from '../../../../../../base/browser/ui/progressbar/progressbar.js';
import { Sash } from '../../../../../../base/browser/ui/sash/sash.js';
import { Toggle } from '../../../../../../base/browser/ui/toggle/toggle.js';
import { Widget } from '../../../../../../base/browser/ui/widget.js';
import { Action, ActionRunner, Separator } from '../../../../../../base/common/actions.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { isSafari } from '../../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { FindReplaceState } from '../../../../../../editor/contrib/find/browser/findState.js';
import { findNextMatchIcon, findPreviousMatchIcon, findReplaceAllIcon, findReplaceIcon, findSelectionIcon, SimpleButton } from '../../../../../../editor/contrib/find/browser/findWidget.js';
import { parseReplaceString, ReplacePattern } from '../../../../../../editor/contrib/find/browser/replacePattern.js';
import { getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../../../platform/contextview/browser/contextView.js';
import { ContextScopedReplaceInput, registerAndCreateHistoryNavigationContext } from '../../../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { defaultInputBoxStyles, defaultProgressBarStyles, defaultToggleStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { asCssVariable, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { registerIcon, widgetClose } from '../../../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../../../platform/theme/common/themeService.js';
import { filterIcon } from '../../../../extensions/browser/extensionsIcons.js';
import { NotebookFindFilters } from './findFilters.js';
import { NotebookFindScopeType, NotebookSetting } from '../../../common/notebookCommon.js';
const NLS_FIND_INPUT_LABEL = nls.localize('label.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('label.previousMatchButton', "Previous Match");
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('label.nextMatchButton', "Next Match");
const NLS_TOGGLE_SELECTION_FIND_TITLE = nls.localize('label.toggleSelectionFind', "Find in Selection");
const NLS_CLOSE_BTN_LABEL = nls.localize('label.closeButton', "Close");
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.localize('label.toggleReplaceButton', "Toggle Replace");
const NLS_REPLACE_INPUT_LABEL = nls.localize('label.replace', "Replace");
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.localize('placeholder.replace', "Replace");
const NLS_REPLACE_BTN_LABEL = nls.localize('label.replaceButton', "Replace");
const NLS_REPLACE_ALL_BTN_LABEL = nls.localize('label.replaceAllButton', "Replace All");
export const findFilterButton = registerIcon('find-filter', Codicon.filter, nls.localize('findFilterIcon', 'Icon for Find Filter in find widget.'));
const NOTEBOOK_FIND_FILTERS = nls.localize('notebook.find.filter.filterAction', "Find Filters");
const NOTEBOOK_FIND_IN_MARKUP_INPUT = nls.localize('notebook.find.filter.findInMarkupInput', "Markdown Source");
const NOTEBOOK_FIND_IN_MARKUP_PREVIEW = nls.localize('notebook.find.filter.findInMarkupPreview', "Rendered Markdown");
const NOTEBOOK_FIND_IN_CODE_INPUT = nls.localize('notebook.find.filter.findInCodeInput', "Code Cell Source");
const NOTEBOOK_FIND_IN_CODE_OUTPUT = nls.localize('notebook.find.filter.findInCodeOutput', "Code Cell Output");
const NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH = 419;
const NOTEBOOK_FIND_WIDGET_INITIAL_HORIZONTAL_PADDING = 4;
let NotebookFindFilterActionViewItem = class NotebookFindFilterActionViewItem extends DropdownMenuActionViewItem {
    constructor(filters, action, options, actionRunner, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */
        });
        this.filters = filters;
    }
    render(container) {
        super.render(container);
        this.updateChecked();
    }
    getActions() {
        const markdownInput = {
            checked: this.filters.markupInput,
            class: undefined,
            enabled: true,
            id: 'findInMarkdownInput',
            label: NOTEBOOK_FIND_IN_MARKUP_INPUT,
            run: async () => {
                this.filters.markupInput = !this.filters.markupInput;
            },
            tooltip: ''
        };
        const markdownPreview = {
            checked: this.filters.markupPreview,
            class: undefined,
            enabled: true,
            id: 'findInMarkdownInput',
            label: NOTEBOOK_FIND_IN_MARKUP_PREVIEW,
            run: async () => {
                this.filters.markupPreview = !this.filters.markupPreview;
            },
            tooltip: ''
        };
        const codeInput = {
            checked: this.filters.codeInput,
            class: undefined,
            enabled: true,
            id: 'findInCodeInput',
            label: NOTEBOOK_FIND_IN_CODE_INPUT,
            run: async () => {
                this.filters.codeInput = !this.filters.codeInput;
            },
            tooltip: ''
        };
        const codeOutput = {
            checked: this.filters.codeOutput,
            class: undefined,
            enabled: true,
            id: 'findInCodeOutput',
            label: NOTEBOOK_FIND_IN_CODE_OUTPUT,
            run: async () => {
                this.filters.codeOutput = !this.filters.codeOutput;
            },
            tooltip: '',
            dispose: () => null
        };
        if (isSafari) {
            return [
                markdownInput,
                codeInput
            ];
        }
        else {
            return [
                markdownInput,
                markdownPreview,
                new Separator(),
                codeInput,
                codeOutput,
            ];
        }
    }
    updateChecked() {
        this.element.classList.toggle('checked', this._action.checked);
    }
};
NotebookFindFilterActionViewItem = __decorate([
    __param(4, IContextMenuService)
], NotebookFindFilterActionViewItem);
export class NotebookFindInputFilterButton extends Disposable {
    constructor(filters, contextMenuService, instantiationService, options, tooltip = NOTEBOOK_FIND_FILTERS) {
        super();
        this.filters = filters;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this._actionbar = null;
        this._toggleStyles = options.toggleStyles;
        this._filtersAction = new Action('notebookFindFilterAction', tooltip, 'notebook-filters ' + ThemeIcon.asClassName(filterIcon));
        this._filtersAction.checked = false;
        this._filterButtonContainer = dom.$('.find-filter-button');
        this._filterButtonContainer.classList.add('monaco-custom-toggle');
        this.createFilters(this._filterButtonContainer);
    }
    get container() {
        return this._filterButtonContainer;
    }
    width() {
        return 2 /*margin left*/ + 2 /*border*/ + 2 /*padding*/ + 16 /* icon width */;
    }
    enable() {
        this.container.setAttribute('aria-disabled', String(false));
    }
    disable() {
        this.container.setAttribute('aria-disabled', String(true));
    }
    set visible(visible) {
        this._filterButtonContainer.style.display = visible ? '' : 'none';
    }
    get visible() {
        return this._filterButtonContainer.style.display !== 'none';
    }
    applyStyles(filterChecked) {
        const toggleStyles = this._toggleStyles;
        this._filterButtonContainer.style.border = '1px solid transparent';
        this._filterButtonContainer.style.borderRadius = '3px';
        this._filterButtonContainer.style.borderColor = (filterChecked && toggleStyles.inputActiveOptionBorder) || '';
        this._filterButtonContainer.style.color = (filterChecked && toggleStyles.inputActiveOptionForeground) || 'inherit';
        this._filterButtonContainer.style.backgroundColor = (filterChecked && toggleStyles.inputActiveOptionBackground) || '';
    }
    createFilters(container) {
        this._actionbar = this._register(new ActionBar(container, {
            actionViewItemProvider: (action, options) => {
                if (action.id === this._filtersAction.id) {
                    return this.instantiationService.createInstance(NotebookFindFilterActionViewItem, this.filters, action, options, this._register(new ActionRunner()));
                }
                return undefined;
            }
        }));
        this._actionbar.push(this._filtersAction, { icon: true, label: false });
    }
}
export class NotebookFindInput extends FindInput {
    constructor(filters, contextKeyService, contextMenuService, instantiationService, parent, contextViewProvider, options) {
        super(parent, contextViewProvider, options);
        this.filters = filters;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this._filterChecked = false;
        this._register(registerAndCreateHistoryNavigationContext(contextKeyService, this.inputBox));
        this._findFilter = this._register(new NotebookFindInputFilterButton(filters, contextMenuService, instantiationService, options));
        this.inputBox.paddingRight = (this.caseSensitive?.width() ?? 0) + (this.wholeWords?.width() ?? 0) + (this.regex?.width() ?? 0) + this._findFilter.width();
        this.controls.appendChild(this._findFilter.container);
    }
    setEnabled(enabled) {
        super.setEnabled(enabled);
        if (enabled && !this._filterChecked) {
            this.regex?.enable();
        }
        else {
            this.regex?.disable();
        }
    }
    updateFilterState(changed) {
        this._filterChecked = changed;
        if (this.regex) {
            if (this._filterChecked) {
                this.regex.disable();
                this.regex.domNode.tabIndex = -1;
                this.regex.domNode.classList.toggle('disabled', true);
            }
            else {
                this.regex.enable();
                this.regex.domNode.tabIndex = 0;
                this.regex.domNode.classList.toggle('disabled', false);
            }
        }
        this._findFilter.applyStyles(this._filterChecked);
    }
    getCellToolbarActions(menu) {
        return getActionBarActions(menu.getActions({ shouldForwardArgs: true }), g => /^inline/.test(g));
    }
}
let SimpleFindReplaceWidget = class SimpleFindReplaceWidget extends Widget {
    constructor(_contextViewService, contextKeyService, _configurationService, contextMenuService, instantiationService, hoverService, _state = new FindReplaceState(), _notebookEditor) {
        super();
        this._contextViewService = _contextViewService;
        this._configurationService = _configurationService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this._state = _state;
        this._notebookEditor = _notebookEditor;
        this._resizeOriginalWidth = NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH;
        this._isVisible = false;
        this._isReplaceVisible = false;
        this.foundMatch = false;
        this.cellSelectionDecorationIds = [];
        this.textSelectionDecorationIds = [];
        this._register(this._state);
        const findFilters = this._configurationService.getValue(NotebookSetting.findFilters) ?? { markupSource: true, markupPreview: true, codeSource: true, codeOutput: true };
        this._filters = new NotebookFindFilters(findFilters.markupSource, findFilters.markupPreview, findFilters.codeSource, findFilters.codeOutput, { findScopeType: NotebookFindScopeType.None });
        this._state.change({ filters: this._filters }, false);
        this._filters.onDidChange(() => {
            this._state.change({ filters: this._filters }, false);
        });
        this._domNode = document.createElement('div');
        this._domNode.classList.add('simple-fr-find-part-wrapper');
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration(NotebookSetting.globalToolbar)) {
                if (this._notebookEditor.notebookOptions.getLayoutConfiguration().globalToolbar) {
                    this._domNode.style.top = '26px';
                }
                else {
                    this._domNode.style.top = '0px';
                }
            }
        }));
        this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
        this._scopedContextKeyService = contextKeyService.createScoped(this._domNode);
        const progressContainer = dom.$('.find-replace-progress');
        this._progressBar = new ProgressBar(progressContainer, defaultProgressBarStyles);
        this._domNode.appendChild(progressContainer);
        const isInteractiveWindow = contextKeyService.getContextKeyValue('notebookType') === 'interactive';
        // Toggle replace button
        this._toggleReplaceBtn = this._register(new SimpleButton({
            label: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
            className: 'codicon toggle left',
            onTrigger: isInteractiveWindow ? () => { } :
                () => {
                    this._isReplaceVisible = !this._isReplaceVisible;
                    this._state.change({ isReplaceRevealed: this._isReplaceVisible }, false);
                    this._updateReplaceViewDisplay();
                }
        }, hoverService));
        this._toggleReplaceBtn.setEnabled(!isInteractiveWindow);
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        this._domNode.appendChild(this._toggleReplaceBtn.domNode);
        this._innerFindDomNode = document.createElement('div');
        this._innerFindDomNode.classList.add('simple-fr-find-part');
        this._findInput = this._register(new NotebookFindInput(this._filters, this._scopedContextKeyService, this.contextMenuService, this.instantiationService, null, this._contextViewService, {
            // width:FIND_INPUT_AREA_WIDTH,
            label: NLS_FIND_INPUT_LABEL,
            placeholder: NLS_FIND_INPUT_PLACEHOLDER,
            validation: (value) => {
                if (value.length === 0 || !this._findInput.getRegex()) {
                    return null;
                }
                try {
                    new RegExp(value);
                    return null;
                }
                catch (e) {
                    this.foundMatch = false;
                    this.updateButtons(this.foundMatch);
                    return { content: e.message };
                }
            },
            flexibleWidth: true,
            showCommonFindToggles: true,
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles
        }));
        // Find History with update delayer
        this._updateHistoryDelayer = new Delayer(500);
        this.oninput(this._findInput.domNode, (e) => {
            this.foundMatch = this.onInputChanged();
            this.updateButtons(this.foundMatch);
            this._delayedUpdateHistory();
        });
        this._register(this._findInput.inputBox.onDidChange(() => {
            this._state.change({ searchString: this._findInput.getValue() }, true);
        }));
        this._findInput.setRegex(!!this._state.isRegex);
        this._findInput.setCaseSensitive(!!this._state.matchCase);
        this._findInput.setWholeWords(!!this._state.wholeWord);
        this._register(this._findInput.onDidOptionChange(() => {
            this._state.change({
                isRegex: this._findInput.getRegex(),
                wholeWord: this._findInput.getWholeWords(),
                matchCase: this._findInput.getCaseSensitive()
            }, true);
        }));
        this._register(this._state.onFindReplaceStateChange(() => {
            this._findInput.setRegex(this._state.isRegex);
            this._findInput.setWholeWords(this._state.wholeWord);
            this._findInput.setCaseSensitive(this._state.matchCase);
            this._replaceInput.setPreserveCase(this._state.preserveCase);
        }));
        this._matchesCount = document.createElement('div');
        this._matchesCount.className = 'matchesCount';
        this._updateMatchesCount();
        this.prevBtn = this._register(new SimpleButton({
            label: NLS_PREVIOUS_MATCH_BTN_LABEL,
            icon: findPreviousMatchIcon,
            onTrigger: () => {
                this.find(true);
            }
        }, hoverService));
        this.nextBtn = this._register(new SimpleButton({
            label: NLS_NEXT_MATCH_BTN_LABEL,
            icon: findNextMatchIcon,
            onTrigger: () => {
                this.find(false);
            }
        }, hoverService));
        this.inSelectionToggle = this._register(new Toggle({
            icon: findSelectionIcon,
            title: NLS_TOGGLE_SELECTION_FIND_TITLE,
            isChecked: false,
            inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground),
            inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
            inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
        }));
        this.inSelectionToggle.domNode.style.display = 'inline';
        this.inSelectionToggle.onChange(() => {
            const checked = this.inSelectionToggle.checked;
            if (checked) {
                // selection logic:
                // 1. if there are multiple cells, do that.
                // 2. if there is only one cell, do the following:
                // 		- if there is a multi-line range highlighted, textual in selection
                // 		- if there is no range, cell in selection for that cell
                const cellSelection = this._notebookEditor.getSelections();
                const textSelection = this._notebookEditor.getSelectionViewModels()[0].getSelections();
                if (cellSelection.length > 1 || cellSelection.some(range => range.end - range.start > 1)) {
                    this._filters.findScope = {
                        findScopeType: NotebookFindScopeType.Cells,
                        selectedCellRanges: cellSelection
                    };
                    this.setCellSelectionDecorations();
                }
                else if (textSelection.length > 1 || textSelection.some(range => range.endLineNumber - range.startLineNumber >= 1)) {
                    this._filters.findScope = {
                        findScopeType: NotebookFindScopeType.Text,
                        selectedCellRanges: cellSelection,
                        selectedTextRanges: textSelection
                    };
                    this.setTextSelectionDecorations(textSelection, this._notebookEditor.getSelectionViewModels()[0]);
                }
                else {
                    this._filters.findScope = {
                        findScopeType: NotebookFindScopeType.Cells,
                        selectedCellRanges: cellSelection
                    };
                    this.setCellSelectionDecorations();
                }
            }
            else {
                this._filters.findScope = {
                    findScopeType: NotebookFindScopeType.None
                };
                this.clearCellSelectionDecorations();
                this.clearTextSelectionDecorations();
            }
        });
        const closeBtn = this._register(new SimpleButton({
            label: NLS_CLOSE_BTN_LABEL,
            icon: widgetClose,
            onTrigger: () => {
                this.hide();
            }
        }, hoverService));
        this._innerFindDomNode.appendChild(this._findInput.domNode);
        this._innerFindDomNode.appendChild(this._matchesCount);
        this._innerFindDomNode.appendChild(this.prevBtn.domNode);
        this._innerFindDomNode.appendChild(this.nextBtn.domNode);
        this._innerFindDomNode.appendChild(this.inSelectionToggle.domNode);
        this._innerFindDomNode.appendChild(closeBtn.domNode);
        // _domNode wraps _innerDomNode, ensuring that
        this._domNode.appendChild(this._innerFindDomNode);
        this.onkeyup(this._innerFindDomNode, e => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
                e.preventDefault();
                return;
            }
        });
        this._focusTracker = this._register(dom.trackFocus(this._domNode));
        this._register(this._focusTracker.onDidFocus(this.onFocusTrackerFocus.bind(this)));
        this._register(this._focusTracker.onDidBlur(this.onFocusTrackerBlur.bind(this)));
        this._findInputFocusTracker = this._register(dom.trackFocus(this._findInput.domNode));
        this._register(this._findInputFocusTracker.onDidFocus(this.onFindInputFocusTrackerFocus.bind(this)));
        this._register(this._findInputFocusTracker.onDidBlur(this.onFindInputFocusTrackerBlur.bind(this)));
        this._register(dom.addDisposableListener(this._innerFindDomNode, 'click', (event) => {
            event.stopPropagation();
        }));
        // Replace
        this._innerReplaceDomNode = document.createElement('div');
        this._innerReplaceDomNode.classList.add('simple-fr-replace-part');
        this._replaceInput = this._register(new ContextScopedReplaceInput(null, undefined, {
            label: NLS_REPLACE_INPUT_LABEL,
            placeholder: NLS_REPLACE_INPUT_PLACEHOLDER,
            history: new Set([]),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles
        }, contextKeyService, false));
        this._innerReplaceDomNode.appendChild(this._replaceInput.domNode);
        this._replaceInputFocusTracker = this._register(dom.trackFocus(this._replaceInput.domNode));
        this._register(this._replaceInputFocusTracker.onDidFocus(this.onReplaceInputFocusTrackerFocus.bind(this)));
        this._register(this._replaceInputFocusTracker.onDidBlur(this.onReplaceInputFocusTrackerBlur.bind(this)));
        this._register(this._replaceInput.inputBox.onDidChange(() => {
            this._state.change({ replaceString: this._replaceInput.getValue() }, true);
        }));
        this._domNode.appendChild(this._innerReplaceDomNode);
        this._updateReplaceViewDisplay();
        this._replaceBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_BTN_LABEL,
            icon: findReplaceIcon,
            onTrigger: () => {
                this.replaceOne();
            }
        }, hoverService));
        // Replace all button
        this._replaceAllBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_ALL_BTN_LABEL,
            icon: findReplaceAllIcon,
            onTrigger: () => {
                this.replaceAll();
            }
        }, hoverService));
        this._innerReplaceDomNode.appendChild(this._replaceBtn.domNode);
        this._innerReplaceDomNode.appendChild(this._replaceAllBtn.domNode);
        this._resizeSash = this._register(new Sash(this._domNode, { getVerticalSashLeft: () => 0 }, { orientation: 0 /* Orientation.VERTICAL */, size: 2 }));
        this._register(this._resizeSash.onDidStart(() => {
            this._resizeOriginalWidth = this._getDomWidth();
        }));
        this._register(this._resizeSash.onDidChange((evt) => {
            let width = this._resizeOriginalWidth + evt.startX - evt.currentX;
            if (width < NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH) {
                width = NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH;
            }
            const maxWidth = this._getMaxWidth();
            if (width > maxWidth) {
                width = maxWidth;
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
        }));
        this._register(this._resizeSash.onDidReset(() => {
            // users double click on the sash
            // try to emulate what happens with editor findWidget
            const currentWidth = this._getDomWidth();
            let width = NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH;
            if (currentWidth <= NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH) {
                width = this._getMaxWidth();
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
        }));
    }
    _getMaxWidth() {
        return this._notebookEditor.getLayoutInfo().width - 64;
    }
    _getDomWidth() {
        return dom.getTotalWidth(this._domNode) - (NOTEBOOK_FIND_WIDGET_INITIAL_HORIZONTAL_PADDING * 2);
    }
    getCellToolbarActions(menu) {
        return getActionBarActions(menu.getActions({ shouldForwardArgs: true }), g => /^inline/.test(g));
    }
    get inputValue() {
        return this._findInput.getValue();
    }
    get replaceValue() {
        return this._replaceInput.getValue();
    }
    get replacePattern() {
        if (this._state.isRegex) {
            return parseReplaceString(this.replaceValue);
        }
        return ReplacePattern.fromStaticValue(this.replaceValue);
    }
    get focusTracker() {
        return this._focusTracker;
    }
    get isVisible() {
        return this._isVisible;
    }
    _onStateChanged(e) {
        this._updateButtons();
        this._updateMatchesCount();
    }
    _updateButtons() {
        this._findInput.setEnabled(this._isVisible);
        this._replaceInput.setEnabled(this._isVisible && this._isReplaceVisible);
        const findInputIsNonEmpty = (this._state.searchString.length > 0);
        this._replaceBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._replaceAllBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._domNode.classList.toggle('replaceToggled', this._isReplaceVisible);
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        this.foundMatch = this._state.matchesCount > 0;
        this.updateButtons(this.foundMatch);
    }
    setCellSelectionDecorations() {
        const cellHandles = [];
        this._notebookEditor.getSelectionViewModels().forEach(viewModel => {
            cellHandles.push(viewModel.handle);
        });
        const decorations = [];
        for (const handle of cellHandles) {
            decorations.push({
                handle: handle,
                options: { className: 'nb-multiCellHighlight', outputClassName: 'nb-multiCellHighlight' }
            });
        }
        this.cellSelectionDecorationIds = this._notebookEditor.deltaCellDecorations([], decorations);
    }
    clearCellSelectionDecorations() {
        this._notebookEditor.deltaCellDecorations(this.cellSelectionDecorationIds, []);
    }
    setTextSelectionDecorations(textRanges, cell) {
        this._notebookEditor.changeModelDecorations(changeAccessor => {
            const decorations = [];
            for (const range of textRanges) {
                decorations.push({
                    ownerId: cell.handle,
                    decorations: [{
                            range: range,
                            options: {
                                description: 'text search range for notebook search scope',
                                isWholeLine: true,
                                className: 'nb-findScope'
                            }
                        }]
                });
            }
            this.textSelectionDecorationIds = changeAccessor.deltaDecorations([], decorations);
        });
    }
    clearTextSelectionDecorations() {
        this._notebookEditor.changeModelDecorations(changeAccessor => {
            changeAccessor.deltaDecorations(this.textSelectionDecorationIds, []);
        });
    }
    _updateMatchesCount() {
    }
    dispose() {
        super.dispose();
        this._domNode.remove();
    }
    getDomNode() {
        return this._domNode;
    }
    reveal(initialInput) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        if (this._isVisible) {
            this._findInput.select();
            return;
        }
        this._isVisible = true;
        this.updateButtons(this.foundMatch);
        setTimeout(() => {
            this._domNode.classList.add('visible', 'visible-transition');
            this._domNode.setAttribute('aria-hidden', 'false');
            this._findInput.select();
        }, 0);
    }
    focus() {
        this._findInput.focus();
    }
    show(initialInput, options) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        this._isVisible = true;
        setTimeout(() => {
            this._domNode.classList.add('visible', 'visible-transition');
            this._domNode.setAttribute('aria-hidden', 'false');
            if (options?.focus ?? true) {
                this.focus();
            }
        }, 0);
    }
    showWithReplace(initialInput, replaceInput) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        if (replaceInput) {
            this._replaceInput.setValue(replaceInput);
        }
        this._isVisible = true;
        this._isReplaceVisible = true;
        this._state.change({ isReplaceRevealed: this._isReplaceVisible }, false);
        this._updateReplaceViewDisplay();
        setTimeout(() => {
            this._domNode.classList.add('visible', 'visible-transition');
            this._domNode.setAttribute('aria-hidden', 'false');
            this._updateButtons();
            this._replaceInput.focus();
        }, 0);
    }
    _updateReplaceViewDisplay() {
        if (this._isReplaceVisible) {
            this._innerReplaceDomNode.style.display = 'flex';
        }
        else {
            this._innerReplaceDomNode.style.display = 'none';
        }
        this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
    }
    hide() {
        if (this._isVisible) {
            this.inSelectionToggle.checked = false;
            this._notebookEditor.deltaCellDecorations(this.cellSelectionDecorationIds, []);
            this._notebookEditor.changeModelDecorations(changeAccessor => {
                changeAccessor.deltaDecorations(this.textSelectionDecorationIds, []);
            });
            this._domNode.classList.remove('visible-transition');
            this._domNode.setAttribute('aria-hidden', 'true');
            // Need to delay toggling visibility until after Transition, then visibility hidden - removes from tabIndex list
            setTimeout(() => {
                this._isVisible = false;
                this.updateButtons(this.foundMatch);
                this._domNode.classList.remove('visible');
            }, 200);
        }
    }
    _delayedUpdateHistory() {
        this._updateHistoryDelayer.trigger(this._updateHistory.bind(this));
    }
    _updateHistory() {
        this._findInput.inputBox.addToHistory();
    }
    _getRegexValue() {
        return this._findInput.getRegex();
    }
    _getWholeWordValue() {
        return this._findInput.getWholeWords();
    }
    _getCaseSensitiveValue() {
        return this._findInput.getCaseSensitive();
    }
    updateButtons(foundMatch) {
        const hasInput = this.inputValue.length > 0;
        this.prevBtn.setEnabled(this._isVisible && hasInput && foundMatch);
        this.nextBtn.setEnabled(this._isVisible && hasInput && foundMatch);
    }
};
SimpleFindReplaceWidget = __decorate([
    __param(0, IContextViewService),
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, IHoverService)
], SimpleFindReplaceWidget);
export { SimpleFindReplaceWidget };
// theming
registerThemingParticipant((theme, collector) => {
    collector.addRule(`
	.notebook-editor {
		--notebook-find-width: ${NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH}px;
		--notebook-find-horizontal-padding: ${NOTEBOOK_FIND_WIDGET_INITIAL_HORIZONTAL_PADDING}px;
	}
	`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGaW5kUmVwbGFjZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9maW5kL25vdGVib29rRmluZFJlcGxhY2VXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRCxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBR3JGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxTQUFTLEVBQXFCLE1BQU0sMERBQTBELENBQUM7QUFHeEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzNGLE9BQU8sRUFBMkIsSUFBSSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0YsT0FBTyxFQUFpQixNQUFNLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDckUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQTBCLFNBQVMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0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
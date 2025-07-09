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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGaW5kUmVwbGFjZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZmluZC9ub3RlYm9va0ZpbmRSZXBsYWNlV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sMEJBQTBCLENBQUM7QUFDaEQsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUdyRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUNsSCxPQUFPLEVBQUUsU0FBUyxFQUFxQixNQUFNLDBEQUEwRCxDQUFDO0FBR3hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMzRixPQUFPLEVBQTJCLElBQUksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9GLE9BQU8sRUFBaUIsTUFBTSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDM0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUEwQixTQUFTLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0s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
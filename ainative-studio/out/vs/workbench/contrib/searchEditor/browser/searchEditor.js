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
var SearchEditor_1;
import * as DOM from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { Delayer } from '../../../../base/common/async.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import './media/searchEditor.css';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ReferencesController } from '../../../../editor/contrib/gotoSymbol/browser/peek/referencesController.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IEditorProgressService, LongRunningOperation } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { inputBorder, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { AbstractTextCodeEditor } from '../../../browser/parts/editor/textCodeEditor.js';
import { ExcludePatternInputWidget, IncludePatternInputWidget } from '../../search/browser/patternInputWidget.js';
import { SearchWidget } from '../../search/browser/searchWidget.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { getOutOfWorkspaceEditorResources } from '../../search/common/search.js';
import { SearchModelImpl } from '../../search/browser/searchTreeModel/searchModel.js';
import { InSearchEditor, SearchEditorID, SearchEditorInputTypeId } from './constants.js';
import { serializeSearchResultForEditor } from './searchEditorSerialization.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { searchDetailsIcon } from '../../search/browser/searchIcons.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { renderSearchMessage } from '../../search/browser/searchMessage.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { UnusualLineTerminatorsDetector } from '../../../../editor/contrib/unusualLineTerminators/browser/unusualLineTerminators.js';
import { defaultToggleStyles, getInputBoxStyle } from '../../../../platform/theme/browser/defaultStyles.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { SearchContext } from '../../search/common/constants.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const RESULT_LINE_REGEX = /^(\s+)(\d+)(: |  )(\s*)(.*)$/;
const FILE_LINE_REGEX = /^(\S.*):$/;
let SearchEditor = class SearchEditor extends AbstractTextCodeEditor {
    static { SearchEditor_1 = this; }
    static { this.ID = SearchEditorID; }
    static { this.SEARCH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'searchEditorViewState'; }
    get searchResultEditor() { return this.editorControl; }
    constructor(group, telemetryService, themeService, storageService, modelService, contextService, labelService, instantiationService, contextViewService, commandService, openerService, notificationService, progressService, textResourceService, editorGroupService, editorService, configurationService, fileService, logService, hoverService) {
        super(SearchEditor_1.ID, group, telemetryService, instantiationService, storageService, textResourceService, themeService, editorService, editorGroupService, fileService);
        this.modelService = modelService;
        this.contextService = contextService;
        this.labelService = labelService;
        this.contextViewService = contextViewService;
        this.commandService = commandService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.hoverService = hoverService;
        this.runSearchDelayer = new Delayer(0);
        this.pauseSearching = false;
        this.showingIncludesExcludes = false;
        this.ongoingOperations = 0;
        this.updatingModelForSearch = false;
        this.container = DOM.$('.search-editor');
        this.searchOperation = this._register(new LongRunningOperation(progressService));
        this._register(this.messageDisposables = new DisposableStore());
        this.searchHistoryDelayer = new Delayer(2000);
        this.searchModel = this._register(this.instantiationService.createInstance(SearchModelImpl));
    }
    createEditor(parent) {
        DOM.append(parent, this.container);
        this.queryEditorContainer = DOM.append(this.container, DOM.$('.query-container'));
        const searchResultContainer = DOM.append(this.container, DOM.$('.search-results'));
        super.createEditor(searchResultContainer);
        this.registerEditorListeners();
        const scopedContextKeyService = assertIsDefined(this.scopedContextKeyService);
        InSearchEditor.bindTo(scopedContextKeyService).set(true);
        this.createQueryEditor(this.queryEditorContainer, this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService]))), SearchContext.InputBoxFocusedKey.bindTo(scopedContextKeyService));
    }
    createQueryEditor(container, scopedInstantiationService, inputBoxFocusedContextKey) {
        const searchEditorInputboxStyles = getInputBoxStyle({ inputBorder: searchEditorTextInputBorder });
        this.queryEditorWidget = this._register(scopedInstantiationService.createInstance(SearchWidget, container, { _hideReplaceToggle: true, showContextToggle: true, inputBoxStyles: searchEditorInputboxStyles, toggleStyles: defaultToggleStyles }));
        this._register(this.queryEditorWidget.onReplaceToggled(() => this.reLayout()));
        this._register(this.queryEditorWidget.onDidHeightChange(() => this.reLayout()));
        this._register(this.queryEditorWidget.onSearchSubmit(({ delay }) => this.triggerSearch({ delay })));
        if (this.queryEditorWidget.searchInput) {
            this._register(this.queryEditorWidget.searchInput.onDidOptionChange(() => this.triggerSearch({ resetCursor: false })));
        }
        else {
            this.logService.warn('SearchEditor: SearchWidget.searchInput is undefined, cannot register onDidOptionChange listener');
        }
        this._register(this.queryEditorWidget.onDidToggleContext(() => this.triggerSearch({ resetCursor: false })));
        // Includes/Excludes Dropdown
        this.includesExcludesContainer = DOM.append(container, DOM.$('.includes-excludes'));
        // Toggle query details button
        const toggleQueryDetailsLabel = localize('moreSearch', "Toggle Search Details");
        this.toggleQueryDetailsButton = DOM.append(this.includesExcludesContainer, DOM.$('.expand' + ThemeIcon.asCSSSelector(searchDetailsIcon), { tabindex: 0, role: 'button', 'aria-label': toggleQueryDetailsLabel }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this.toggleQueryDetailsButton, toggleQueryDetailsLabel));
        this._register(DOM.addDisposableListener(this.toggleQueryDetailsButton, DOM.EventType.CLICK, e => {
            DOM.EventHelper.stop(e);
            this.toggleIncludesExcludes();
        }));
        this._register(DOM.addDisposableListener(this.toggleQueryDetailsButton, DOM.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                DOM.EventHelper.stop(e);
                this.toggleIncludesExcludes();
            }
        }));
        this._register(DOM.addDisposableListener(this.toggleQueryDetailsButton, DOM.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                if (this.queryEditorWidget.isReplaceActive()) {
                    this.queryEditorWidget.focusReplaceAllAction();
                }
                else {
                    this.queryEditorWidget.isReplaceShown() ? this.queryEditorWidget.replaceInput?.focusOnPreserve() : this.queryEditorWidget.focusRegexAction();
                }
                DOM.EventHelper.stop(e);
            }
        }));
        // Includes
        const folderIncludesList = DOM.append(this.includesExcludesContainer, DOM.$('.file-types.includes'));
        const filesToIncludeTitle = localize('searchScope.includes', "files to include");
        DOM.append(folderIncludesList, DOM.$('h4', undefined, filesToIncludeTitle));
        this.inputPatternIncludes = this._register(scopedInstantiationService.createInstance(IncludePatternInputWidget, folderIncludesList, this.contextViewService, {
            ariaLabel: localize('label.includes', 'Search Include Patterns'),
            inputBoxStyles: searchEditorInputboxStyles
        }));
        this._register(this.inputPatternIncludes.onSubmit(triggeredOnType => this.triggerSearch({ resetCursor: false, delay: triggeredOnType ? this.searchConfig.searchOnTypeDebouncePeriod : 0 })));
        this._register(this.inputPatternIncludes.onChangeSearchInEditorsBox(() => this.triggerSearch()));
        // Excludes
        const excludesList = DOM.append(this.includesExcludesContainer, DOM.$('.file-types.excludes'));
        const excludesTitle = localize('searchScope.excludes', "files to exclude");
        DOM.append(excludesList, DOM.$('h4', undefined, excludesTitle));
        this.inputPatternExcludes = this._register(scopedInstantiationService.createInstance(ExcludePatternInputWidget, excludesList, this.contextViewService, {
            ariaLabel: localize('label.excludes', 'Search Exclude Patterns'),
            inputBoxStyles: searchEditorInputboxStyles
        }));
        this._register(this.inputPatternExcludes.onSubmit(triggeredOnType => this.triggerSearch({ resetCursor: false, delay: triggeredOnType ? this.searchConfig.searchOnTypeDebouncePeriod : 0 })));
        this._register(this.inputPatternExcludes.onChangeIgnoreBox(() => this.triggerSearch()));
        // Messages
        this.messageBox = DOM.append(container, DOM.$('.messages.text-search-provider-messages'));
        [this.queryEditorWidget.searchInputFocusTracker, this.queryEditorWidget.replaceInputFocusTracker, this.inputPatternExcludes.inputFocusTracker, this.inputPatternIncludes.inputFocusTracker]
            .forEach(tracker => {
            if (!tracker) {
                return;
            }
            this._register(tracker.onDidFocus(() => setTimeout(() => inputBoxFocusedContextKey.set(true), 0)));
            this._register(tracker.onDidBlur(() => inputBoxFocusedContextKey.set(false)));
        });
    }
    toggleRunAgainMessage(show) {
        DOM.clearNode(this.messageBox);
        this.messageDisposables.clear();
        if (show) {
            const runAgainLink = DOM.append(this.messageBox, DOM.$('a.pointer.prominent.message', {}, localize('runSearch', "Run Search")));
            this.messageDisposables.add(DOM.addDisposableListener(runAgainLink, DOM.EventType.CLICK, async () => {
                await this.triggerSearch();
                this.searchResultEditor.focus();
            }));
        }
    }
    _getContributions() {
        const skipContributions = [UnusualLineTerminatorsDetector.ID];
        return EditorExtensionsRegistry.getEditorContributions().filter(c => skipContributions.indexOf(c.id) === -1);
    }
    getCodeEditorWidgetOptions() {
        return { contributions: this._getContributions() };
    }
    registerEditorListeners() {
        this._register(this.searchResultEditor.onMouseUp(e => {
            if (e.event.detail === 1) {
                const behaviour = this.searchConfig.searchEditor.singleClickBehaviour;
                const position = e.target.position;
                if (position && behaviour === 'peekDefinition') {
                    const line = this.searchResultEditor.getModel()?.getLineContent(position.lineNumber) ?? '';
                    if (line.match(FILE_LINE_REGEX) || line.match(RESULT_LINE_REGEX)) {
                        this.searchResultEditor.setSelection(Range.fromPositions(position));
                        this.commandService.executeCommand('editor.action.peekDefinition');
                    }
                }
            }
            else if (e.event.detail === 2) {
                const behaviour = this.searchConfig.searchEditor.doubleClickBehaviour;
                const position = e.target.position;
                if (position && behaviour !== 'selectWord') {
                    const line = this.searchResultEditor.getModel()?.getLineContent(position.lineNumber) ?? '';
                    if (line.match(RESULT_LINE_REGEX)) {
                        this.searchResultEditor.setSelection(Range.fromPositions(position));
                        this.commandService.executeCommand(behaviour === 'goToLocation' ? 'editor.action.goToDeclaration' : 'editor.action.openDeclarationToTheSide');
                    }
                    else if (line.match(FILE_LINE_REGEX)) {
                        this.searchResultEditor.setSelection(Range.fromPositions(position));
                        this.commandService.executeCommand('editor.action.peekDefinition');
                    }
                }
            }
        }));
        this._register(this.searchResultEditor.onDidChangeModelContent(() => {
            if (!this.updatingModelForSearch) {
                this.getInput()?.setDirty(true);
            }
        }));
    }
    getControl() {
        return this.searchResultEditor;
    }
    focus() {
        super.focus();
        const viewState = this.loadEditorViewState(this.getInput());
        if (viewState && viewState.focused === 'editor') {
            this.searchResultEditor.focus();
        }
        else {
            this.queryEditorWidget.focus();
        }
    }
    focusSearchInput() {
        this.queryEditorWidget.searchInput?.focus();
    }
    focusFilesToIncludeInput() {
        if (!this.showingIncludesExcludes) {
            this.toggleIncludesExcludes(true);
        }
        this.inputPatternIncludes.focus();
    }
    focusFilesToExcludeInput() {
        if (!this.showingIncludesExcludes) {
            this.toggleIncludesExcludes(true);
        }
        this.inputPatternExcludes.focus();
    }
    focusNextInput() {
        if (this.queryEditorWidget.searchInputHasFocus()) {
            if (this.showingIncludesExcludes) {
                this.inputPatternIncludes.focus();
            }
            else {
                this.searchResultEditor.focus();
            }
        }
        else if (this.inputPatternIncludes.inputHasFocus()) {
            this.inputPatternExcludes.focus();
        }
        else if (this.inputPatternExcludes.inputHasFocus()) {
            this.searchResultEditor.focus();
        }
        else if (this.searchResultEditor.hasWidgetFocus()) {
            // pass
        }
    }
    focusPrevInput() {
        if (this.queryEditorWidget.searchInputHasFocus()) {
            this.searchResultEditor.focus(); // wrap
        }
        else if (this.inputPatternIncludes.inputHasFocus()) {
            this.queryEditorWidget.searchInput?.focus();
        }
        else if (this.inputPatternExcludes.inputHasFocus()) {
            this.inputPatternIncludes.focus();
        }
        else if (this.searchResultEditor.hasWidgetFocus()) {
            // unreachable.
        }
    }
    setQuery(query) {
        this.queryEditorWidget.searchInput?.setValue(query);
    }
    selectQuery() {
        this.queryEditorWidget.searchInput?.select();
    }
    toggleWholeWords() {
        this.queryEditorWidget.searchInput?.setWholeWords(!this.queryEditorWidget.searchInput.getWholeWords());
        this.triggerSearch({ resetCursor: false });
    }
    toggleRegex() {
        this.queryEditorWidget.searchInput?.setRegex(!this.queryEditorWidget.searchInput.getRegex());
        this.triggerSearch({ resetCursor: false });
    }
    toggleCaseSensitive() {
        this.queryEditorWidget.searchInput?.setCaseSensitive(!this.queryEditorWidget.searchInput.getCaseSensitive());
        this.triggerSearch({ resetCursor: false });
    }
    toggleContextLines() {
        this.queryEditorWidget.toggleContextLines();
    }
    modifyContextLines(increase) {
        this.queryEditorWidget.modifyContextLines(increase);
    }
    toggleQueryDetails(shouldShow) {
        this.toggleIncludesExcludes(shouldShow);
    }
    deleteResultBlock() {
        const linesToDelete = new Set();
        const selections = this.searchResultEditor.getSelections();
        const model = this.searchResultEditor.getModel();
        if (!(selections && model)) {
            return;
        }
        const maxLine = model.getLineCount();
        const minLine = 1;
        const deleteUp = (start) => {
            for (let cursor = start; cursor >= minLine; cursor--) {
                const line = model.getLineContent(cursor);
                linesToDelete.add(cursor);
                if (line[0] !== undefined && line[0] !== ' ') {
                    break;
                }
            }
        };
        const deleteDown = (start) => {
            linesToDelete.add(start);
            for (let cursor = start + 1; cursor <= maxLine; cursor++) {
                const line = model.getLineContent(cursor);
                if (line[0] !== undefined && line[0] !== ' ') {
                    return cursor;
                }
                linesToDelete.add(cursor);
            }
            return;
        };
        const endingCursorLines = [];
        for (const selection of selections) {
            const lineNumber = selection.startLineNumber;
            endingCursorLines.push(deleteDown(lineNumber));
            deleteUp(lineNumber);
            for (let inner = selection.startLineNumber; inner <= selection.endLineNumber; inner++) {
                linesToDelete.add(inner);
            }
        }
        if (endingCursorLines.length === 0) {
            endingCursorLines.push(1);
        }
        const isDefined = (x) => x !== undefined;
        model.pushEditOperations(this.searchResultEditor.getSelections(), [...linesToDelete].map(line => ({ range: new Range(line, 1, line + 1, 1), text: '' })), () => endingCursorLines.filter(isDefined).map(line => new Selection(line, 1, line, 1)));
    }
    cleanState() {
        this.getInput()?.setDirty(false);
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    iterateThroughMatches(reverse) {
        const model = this.searchResultEditor.getModel();
        if (!model) {
            return;
        }
        const lastLine = model.getLineCount() ?? 1;
        const lastColumn = model.getLineLength(lastLine);
        const fallbackStart = reverse ? new Position(lastLine, lastColumn) : new Position(1, 1);
        const currentPosition = this.searchResultEditor.getSelection()?.getStartPosition() ?? fallbackStart;
        const matchRanges = this.getInput()?.getMatchRanges();
        if (!matchRanges) {
            return;
        }
        const matchRange = (reverse ? findPrevRange : findNextRange)(matchRanges, currentPosition);
        if (!matchRange) {
            return;
        }
        this.searchResultEditor.setSelection(matchRange);
        this.searchResultEditor.revealLineInCenterIfOutsideViewport(matchRange.startLineNumber);
        this.searchResultEditor.focus();
        const matchLineText = model.getLineContent(matchRange.startLineNumber);
        const matchText = model.getValueInRange(matchRange);
        let file = '';
        for (let line = matchRange.startLineNumber; line >= 1; line--) {
            const lineText = model.getValueInRange(new Range(line, 1, line, 2));
            if (lineText !== ' ') {
                file = model.getLineContent(line);
                break;
            }
        }
        alert(localize('searchResultItem', "Matched {0} at {1} in file {2}", matchText, matchLineText, file.slice(0, file.length - 1)));
    }
    focusNextResult() {
        this.iterateThroughMatches(false);
    }
    focusPreviousResult() {
        this.iterateThroughMatches(true);
    }
    focusAllResults() {
        this.searchResultEditor
            .setSelections((this.getInput()?.getMatchRanges() ?? []).map(range => new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn)));
        this.searchResultEditor.focus();
    }
    async triggerSearch(_options) {
        const focusResults = this.searchConfig.searchEditor.focusResultsOnSearch;
        // If _options don't define focusResult field, then use the setting
        if (_options === undefined) {
            _options = { focusResults: focusResults };
        }
        else if (_options.focusResults === undefined) {
            _options.focusResults = focusResults;
        }
        const options = { resetCursor: true, delay: 0, ..._options };
        if (!(this.queryEditorWidget.searchInput?.inputBox.isInputValid())) {
            return;
        }
        if (!this.pauseSearching) {
            await this.runSearchDelayer.trigger(async () => {
                this.toggleRunAgainMessage(false);
                await this.doRunSearch();
                if (options.resetCursor) {
                    this.searchResultEditor.setPosition(new Position(1, 1));
                    this.searchResultEditor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
                }
                if (options.focusResults) {
                    this.searchResultEditor.focus();
                }
            }, options.delay);
        }
    }
    readConfigFromWidget() {
        return {
            isCaseSensitive: this.queryEditorWidget.searchInput?.getCaseSensitive() ?? false,
            contextLines: this.queryEditorWidget.getContextLines(),
            filesToExclude: this.inputPatternExcludes.getValue(),
            filesToInclude: this.inputPatternIncludes.getValue(),
            query: this.queryEditorWidget.searchInput?.getValue() ?? '',
            isRegexp: this.queryEditorWidget.searchInput?.getRegex() ?? false,
            matchWholeWord: this.queryEditorWidget.searchInput?.getWholeWords() ?? false,
            useExcludeSettingsAndIgnoreFiles: this.inputPatternExcludes.useExcludesAndIgnoreFiles(),
            onlyOpenEditors: this.inputPatternIncludes.onlySearchInOpenEditors(),
            showIncludesExcludes: this.showingIncludesExcludes,
            notebookSearchConfig: {
                includeMarkupInput: this.queryEditorWidget.getNotebookFilters().markupInput,
                includeMarkupPreview: this.queryEditorWidget.getNotebookFilters().markupPreview,
                includeCodeInput: this.queryEditorWidget.getNotebookFilters().codeInput,
                includeOutput: this.queryEditorWidget.getNotebookFilters().codeOutput,
            }
        };
    }
    async doRunSearch() {
        this.searchModel.cancelSearch(true);
        const startInput = this.getInput();
        if (!startInput) {
            return;
        }
        this.searchHistoryDelayer.trigger(() => {
            this.queryEditorWidget.searchInput?.onSearchSubmit();
            this.inputPatternExcludes.onSearchSubmit();
            this.inputPatternIncludes.onSearchSubmit();
        });
        const config = this.readConfigFromWidget();
        if (!config.query) {
            return;
        }
        const content = {
            pattern: config.query,
            isRegExp: config.isRegexp,
            isCaseSensitive: config.isCaseSensitive,
            isWordMatch: config.matchWholeWord,
        };
        const options = {
            _reason: 'searchEditor',
            extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
            maxResults: this.searchConfig.maxResults ?? undefined,
            disregardIgnoreFiles: !config.useExcludeSettingsAndIgnoreFiles || undefined,
            disregardExcludeSettings: !config.useExcludeSettingsAndIgnoreFiles || undefined,
            excludePattern: [{ pattern: config.filesToExclude }],
            includePattern: config.filesToInclude,
            onlyOpenEditors: config.onlyOpenEditors,
            previewOptions: {
                matchLines: 1,
                charsPerLine: 1000
            },
            surroundingContext: config.contextLines,
            isSmartCase: this.searchConfig.smartCase,
            expandPatterns: true,
            notebookSearchConfig: {
                includeMarkupInput: config.notebookSearchConfig.includeMarkupInput,
                includeMarkupPreview: config.notebookSearchConfig.includeMarkupPreview,
                includeCodeInput: config.notebookSearchConfig.includeCodeInput,
                includeOutput: config.notebookSearchConfig.includeOutput,
            }
        };
        const folderResources = this.contextService.getWorkspace().folders;
        let query;
        try {
            const queryBuilder = this.instantiationService.createInstance(QueryBuilder);
            query = queryBuilder.text(content, folderResources.map(folder => folder.uri), options);
        }
        catch (err) {
            return;
        }
        this.searchOperation.start(500);
        this.ongoingOperations++;
        const { configurationModel } = await startInput.resolveModels();
        configurationModel.updateConfig(config);
        const result = this.searchModel.search(query);
        startInput.ongoingSearchOperation = result.asyncResults.finally(() => {
            this.ongoingOperations--;
            if (this.ongoingOperations === 0) {
                this.searchOperation.stop();
            }
        });
        const searchOperation = await startInput.ongoingSearchOperation;
        await this.onSearchComplete(searchOperation, config, startInput);
    }
    async onSearchComplete(searchOperation, startConfig, startInput) {
        const input = this.getInput();
        if (!input ||
            input !== startInput ||
            JSON.stringify(startConfig) !== JSON.stringify(this.readConfigFromWidget())) {
            return;
        }
        input.ongoingSearchOperation = undefined;
        const sortOrder = this.searchConfig.sortOrder;
        if (sortOrder === "modified" /* SearchSortOrder.Modified */) {
            await this.retrieveFileStats(this.searchModel.searchResult);
        }
        const controller = ReferencesController.get(this.searchResultEditor);
        controller?.closeWidget(false);
        const labelFormatter = (uri) => this.labelService.getUriLabel(uri, { relative: true });
        const results = serializeSearchResultForEditor(this.searchModel.searchResult, startConfig.filesToInclude, startConfig.filesToExclude, startConfig.contextLines, labelFormatter, sortOrder, searchOperation?.limitHit);
        const { resultsModel } = await input.resolveModels();
        this.updatingModelForSearch = true;
        this.modelService.updateModel(resultsModel, results.text);
        this.updatingModelForSearch = false;
        if (searchOperation && searchOperation.messages) {
            for (const message of searchOperation.messages) {
                this.addMessage(message);
            }
        }
        this.reLayout();
        input.setDirty(!input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        input.setMatchRanges(results.matchRanges);
    }
    addMessage(message) {
        let messageBox;
        if (this.messageBox.firstChild) {
            messageBox = this.messageBox.firstChild;
        }
        else {
            messageBox = DOM.append(this.messageBox, DOM.$('.message'));
        }
        DOM.append(messageBox, renderSearchMessage(message, this.instantiationService, this.notificationService, this.openerService, this.commandService, this.messageDisposables, () => this.triggerSearch()));
    }
    async retrieveFileStats(searchResult) {
        const files = searchResult.matches().filter(f => !f.fileStat).map(f => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    layout(dimension) {
        this.dimension = dimension;
        this.reLayout();
    }
    getSelected() {
        const selection = this.searchResultEditor.getSelection();
        if (selection) {
            return this.searchResultEditor.getModel()?.getValueInRange(selection) ?? '';
        }
        return '';
    }
    reLayout() {
        if (this.dimension) {
            this.queryEditorWidget.setWidth(this.dimension.width - 28 /* container margin */);
            this.searchResultEditor.layout({ height: this.dimension.height - DOM.getTotalHeight(this.queryEditorContainer), width: this.dimension.width });
            this.inputPatternExcludes.setWidth(this.dimension.width - 28 /* container margin */);
            this.inputPatternIncludes.setWidth(this.dimension.width - 28 /* container margin */);
        }
    }
    getInput() {
        return this.input;
    }
    setSearchConfig(config) {
        this.priorConfig = config;
        if (config.query !== undefined) {
            this.queryEditorWidget.setValue(config.query);
        }
        if (config.isCaseSensitive !== undefined) {
            this.queryEditorWidget.searchInput?.setCaseSensitive(config.isCaseSensitive);
        }
        if (config.isRegexp !== undefined) {
            this.queryEditorWidget.searchInput?.setRegex(config.isRegexp);
        }
        if (config.matchWholeWord !== undefined) {
            this.queryEditorWidget.searchInput?.setWholeWords(config.matchWholeWord);
        }
        if (config.contextLines !== undefined) {
            this.queryEditorWidget.setContextLines(config.contextLines);
        }
        if (config.filesToExclude !== undefined) {
            this.inputPatternExcludes.setValue(config.filesToExclude);
        }
        if (config.filesToInclude !== undefined) {
            this.inputPatternIncludes.setValue(config.filesToInclude);
        }
        if (config.onlyOpenEditors !== undefined) {
            this.inputPatternIncludes.setOnlySearchInOpenEditors(config.onlyOpenEditors);
        }
        if (config.useExcludeSettingsAndIgnoreFiles !== undefined) {
            this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(config.useExcludeSettingsAndIgnoreFiles);
        }
        if (config.showIncludesExcludes !== undefined) {
            this.toggleIncludesExcludes(config.showIncludesExcludes);
        }
    }
    async setInput(newInput, options, context, token) {
        await super.setInput(newInput, options, context, token);
        if (token.isCancellationRequested) {
            return;
        }
        const { configurationModel, resultsModel } = await newInput.resolveModels();
        if (token.isCancellationRequested) {
            return;
        }
        this.searchResultEditor.setModel(resultsModel);
        this.pauseSearching = true;
        this.toggleRunAgainMessage(!newInput.ongoingSearchOperation && resultsModel.getLineCount() === 1 && resultsModel.getValueLength() === 0 && configurationModel.config.query !== '');
        this.setSearchConfig(configurationModel.config);
        this._register(configurationModel.onConfigDidUpdate(newConfig => {
            if (newConfig !== this.priorConfig) {
                this.pauseSearching = true;
                this.setSearchConfig(newConfig);
                this.pauseSearching = false;
            }
        }));
        this.restoreViewState(context);
        if (!options?.preserveFocus) {
            this.focus();
        }
        this.pauseSearching = false;
        if (newInput.ongoingSearchOperation) {
            const existingConfig = this.readConfigFromWidget();
            newInput.ongoingSearchOperation.then(complete => {
                this.onSearchComplete(complete, existingConfig, newInput);
            });
        }
    }
    toggleIncludesExcludes(_shouldShow) {
        const cls = 'expanded';
        const shouldShow = _shouldShow ?? !this.includesExcludesContainer.classList.contains(cls);
        if (shouldShow) {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'true');
            this.includesExcludesContainer.classList.add(cls);
        }
        else {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'false');
            this.includesExcludesContainer.classList.remove(cls);
        }
        this.showingIncludesExcludes = this.includesExcludesContainer.classList.contains(cls);
        this.reLayout();
    }
    toEditorViewStateResource(input) {
        if (input.typeId === SearchEditorInputTypeId) {
            return input.modelUri;
        }
        return undefined;
    }
    computeEditorViewState(resource) {
        const control = this.getControl();
        const editorViewState = control.saveViewState();
        if (!editorViewState) {
            return undefined;
        }
        if (resource.toString() !== this.getInput()?.modelUri.toString()) {
            return undefined;
        }
        return { ...editorViewState, focused: this.searchResultEditor.hasWidgetFocus() ? 'editor' : 'input' };
    }
    tracksEditorViewState(input) {
        return input.typeId === SearchEditorInputTypeId;
    }
    restoreViewState(context) {
        const viewState = this.loadEditorViewState(this.getInput(), context);
        if (viewState) {
            this.searchResultEditor.restoreViewState(viewState);
        }
    }
    getAriaLabel() {
        return this.getInput()?.getName() ?? localize('searchEditor', "Search");
    }
};
SearchEditor = SearchEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IModelService),
    __param(5, IWorkspaceContextService),
    __param(6, ILabelService),
    __param(7, IInstantiationService),
    __param(8, IContextViewService),
    __param(9, ICommandService),
    __param(10, IOpenerService),
    __param(11, INotificationService),
    __param(12, IEditorProgressService),
    __param(13, ITextResourceConfigurationService),
    __param(14, IEditorGroupsService),
    __param(15, IEditorService),
    __param(16, IConfigurationService),
    __param(17, IFileService),
    __param(18, ILogService),
    __param(19, IHoverService)
], SearchEditor);
export { SearchEditor };
const searchEditorTextInputBorder = registerColor('searchEditor.textInputBorder', inputBorder, localize('textInputBoxBorder', "Search editor text input box border."));
function findNextRange(matchRanges, currentPosition) {
    for (const matchRange of matchRanges) {
        if (Position.isBefore(currentPosition, matchRange.getStartPosition())) {
            return matchRange;
        }
    }
    return matchRanges[0];
}
function findPrevRange(matchRanges, currentPosition) {
    for (let i = matchRanges.length - 1; i >= 0; i--) {
        const matchRange = matchRanges[i];
        if (Position.isBefore(matchRange.getStartPosition(), currentPosition)) {
            {
                return matchRange;
            }
        }
    }
    return matchRanges[matchRanges.length - 1];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaEVkaXRvci9icm93c2VyL3NlYXJjaEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbkUsT0FBTywwQkFBMEIsQ0FBQztBQUVsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDbEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFB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
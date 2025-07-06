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
var SearchView_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { ObjectTreeElementCollapseState } from '../../../../base/browser/ui/tree/tree.js';
import { Delayer, RunOnceScheduler, Throttler } from '../../../../base/common/async.js';
import * as errors from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as env from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import * as network from '../../../../base/common/network.js';
import './media/searchview.css';
import { getCodeEditor, isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { CommonFindController } from '../../../../editor/contrib/find/browser/findController.js';
import { MultiCursorSelectionController } from '../../../../editor/contrib/multicursor/browser/multicursor.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getSelectionKeyboardEvent, WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService, withSelection } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { defaultInputBoxStyles, defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { OpenFileFolderAction, OpenFolderAction } from '../../../browser/actions/workspaceActions.js';
import { ResourceListDnDHandler } from '../../../browser/dnd.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { NotebookEditor } from '../../notebook/browser/notebookEditor.js';
import { ExcludePatternInputWidget, IncludePatternInputWidget } from './patternInputWidget.js';
import { appendKeyBindingLabel } from './searchActionsBase.js';
import { searchDetailsIcon } from './searchIcons.js';
import { renderSearchMessage } from './searchMessage.js';
import { FileMatchRenderer, FolderMatchRenderer, MatchRenderer, SearchAccessibilityProvider, SearchDelegate, TextSearchResultRenderer } from './searchResultsView.js';
import { SearchWidget } from './searchWidget.js';
import * as Constants from '../common/constants.js';
import { IReplaceService } from './replace.js';
import { getOutOfWorkspaceEditorResources, SearchStateKey, SearchUIState } from '../common/search.js';
import { ISearchHistoryService, SearchHistoryService } from '../common/searchHistoryService.js';
import { createEditorFromSearchResult } from '../../searchEditor/browser/searchEditorActions.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { ISearchService, TextSearchCompleteMessageType } from '../../../services/search/common/search.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { isSearchTreeMatch, SearchModelLocation, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchNoRoot, isSearchTreeFolderMatchWithResource, isSearchTreeFolderMatchWorkspaceRoot, isSearchResult, isTextSearchHeading, isSearchHeader } from './searchTreeModel/searchTreeCommon.js';
import { isIMatchInNotebook } from './notebookSearch/notebookSearchModelBase.js';
import { searchMatchComparer } from './searchCompare.js';
import { AIFolderMatchWorkspaceRootImpl } from './AISearch/aiSearchModel.js';
const $ = dom.$;
export var SearchViewPosition;
(function (SearchViewPosition) {
    SearchViewPosition[SearchViewPosition["SideBar"] = 0] = "SideBar";
    SearchViewPosition[SearchViewPosition["Panel"] = 1] = "Panel";
})(SearchViewPosition || (SearchViewPosition = {}));
const SEARCH_CANCELLED_MESSAGE = nls.localize('searchCanceled', "Search was canceled before any results could be found - ");
const DEBOUNCE_DELAY = 75;
let SearchView = class SearchView extends ViewPane {
    static { SearchView_1 = this; }
    static { this.ACTIONS_RIGHT_CLASS_NAME = 'actions-right'; }
    constructor(options, fileService, editorService, codeEditorService, progressService, notificationService, dialogService, commandService, contextViewService, instantiationService, viewDescriptorService, configurationService, contextService, searchViewModelWorkbenchService, contextKeyService, replaceService, textFileService, preferencesService, themeService, searchHistoryService, contextMenuService, accessibilityService, keybindingService, storageService, searchService, openerService, hoverService, notebookService, logService, accessibilitySignalService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.fileService = fileService;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.contextViewService = contextViewService;
        this.contextService = contextService;
        this.searchViewModelWorkbenchService = searchViewModelWorkbenchService;
        this.replaceService = replaceService;
        this.textFileService = textFileService;
        this.preferencesService = preferencesService;
        this.searchHistoryService = searchHistoryService;
        this.accessibilityService = accessibilityService;
        this.storageService = storageService;
        this.searchService = searchService;
        this.notebookService = notebookService;
        this.logService = logService;
        this.accessibilitySignalService = accessibilitySignalService;
        this.isDisposed = false;
        this.lastFocusState = 'input';
        this.messageDisposables = new DisposableStore();
        this.currentSearchQ = Promise.resolve();
        this.pauseSearching = false;
        this._visibleMatches = 0;
        this.container = dom.$('.search-view');
        // globals
        this.viewletVisible = Constants.SearchContext.SearchViewVisibleKey.bindTo(this.contextKeyService);
        this.firstMatchFocused = Constants.SearchContext.FirstMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrMatchFocused = Constants.SearchContext.FileMatchOrMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrFolderMatchFocus = Constants.SearchContext.FileMatchOrFolderMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrFolderMatchWithResourceFocus = Constants.SearchContext.FileMatchOrFolderMatchWithResourceFocusKey.bindTo(this.contextKeyService);
        this.fileMatchFocused = Constants.SearchContext.FileFocusKey.bindTo(this.contextKeyService);
        this.folderMatchFocused = Constants.SearchContext.FolderFocusKey.bindTo(this.contextKeyService);
        this.folderMatchWithResourceFocused = Constants.SearchContext.ResourceFolderFocusKey.bindTo(this.contextKeyService);
        this.searchResultHeaderFocused = Constants.SearchContext.SearchResultHeaderFocused.bindTo(this.contextKeyService);
        this.hasSearchResultsKey = Constants.SearchContext.HasSearchResults.bindTo(this.contextKeyService);
        this.matchFocused = Constants.SearchContext.MatchFocusKey.bindTo(this.contextKeyService);
        this.searchStateKey = SearchStateKey.bindTo(this.contextKeyService);
        this.hasSearchPatternKey = Constants.SearchContext.ViewHasSearchPatternKey.bindTo(this.contextKeyService);
        this.hasReplacePatternKey = Constants.SearchContext.ViewHasReplacePatternKey.bindTo(this.contextKeyService);
        this.hasFilePatternKey = Constants.SearchContext.ViewHasFilePatternKey.bindTo(this.contextKeyService);
        this.hasSomeCollapsibleResultKey = Constants.SearchContext.ViewHasSomeCollapsibleKey.bindTo(this.contextKeyService);
        this.treeViewKey = Constants.SearchContext.InTreeViewKey.bindTo(this.contextKeyService);
        this.refreshTreeController = this._register(this.instantiationService.createInstance(RefreshTreeController, this, () => this.searchConfig));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            const keys = Constants.SearchContext.hasAIResultProvider.keys();
            if (e.affectsSome(new Set(keys))) {
                this.refreshHasAISetting();
            }
        }));
        // scoped
        this.contextKeyService = this._register(this.contextKeyService.createScoped(this.container));
        Constants.SearchContext.SearchViewFocusedKey.bindTo(this.contextKeyService).set(true);
        this.inputBoxFocused = Constants.SearchContext.InputBoxFocusedKey.bindTo(this.contextKeyService);
        this.inputPatternIncludesFocused = Constants.SearchContext.PatternIncludesFocusedKey.bindTo(this.contextKeyService);
        this.inputPatternExclusionsFocused = Constants.SearchContext.PatternExcludesFocusedKey.bindTo(this.contextKeyService);
        this.isEditableItem = Constants.SearchContext.IsEditableItemKey.bindTo(this.contextKeyService);
        this.instantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        this._register(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('search.sortOrder')) {
                if (this.searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                    // If changing away from modified, remove all fileStats
                    // so that updated files are re-retrieved next time.
                    this.removeFileStats();
                }
                await this.refreshTreeController.queue();
            }
        }));
        this.viewModel = this.searchViewModelWorkbenchService.searchModel;
        this.queryBuilder = this.instantiationService.createInstance(QueryBuilder);
        this.memento = new Memento(this.id, storageService);
        this.viewletState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this._register(this.fileService.onDidFilesChange(e => this.onFilesChanged(e)));
        this._register(this.textFileService.untitled.onWillDispose(model => this.onUntitledDidDispose(model.resource)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.onDidChangeWorkbenchState()));
        this._register(this.searchHistoryService.onDidClearHistory(() => this.clearHistory()));
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        this.delayedRefresh = this._register(new Delayer(250));
        this.addToSearchHistoryDelayer = this._register(new Delayer(2000));
        this.toggleCollapseStateDelayer = this._register(new Delayer(100));
        this.triggerQueryDelayer = this._register(new Delayer(0));
        this.treeAccessibilityProvider = this.instantiationService.createInstance(SearchAccessibilityProvider, this);
        this.isTreeLayoutViewVisible = this.viewletState['view.treeLayout'] ?? (this.searchConfig.defaultViewMode === "tree" /* ViewMode.Tree */);
        this._refreshResultsScheduler = this._register(new RunOnceScheduler(this._updateResults.bind(this), 80));
        // storage service listener for for roaming changes
        this._register(this.storageService.onWillSaveState(() => {
            this._saveSearchHistoryService();
        }));
        this._register(this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, SearchHistoryService.SEARCH_HISTORY_KEY, this._store)(() => {
            const restoredHistory = this.searchHistoryService.load();
            if (restoredHistory.include) {
                this.inputPatternIncludes.prependHistory(restoredHistory.include);
            }
            if (restoredHistory.exclude) {
                this.inputPatternExcludes.prependHistory(restoredHistory.exclude);
            }
            if (restoredHistory.search) {
                this.searchWidget.prependSearchHistory(restoredHistory.search);
            }
            if (restoredHistory.replace) {
                this.searchWidget.prependReplaceHistory(restoredHistory.replace);
            }
        }));
        this.changedWhileHidden = this.hasSearchResults();
    }
    async queueRefreshTree() {
        return this.refreshTreeController.queue();
    }
    get isTreeLayoutViewVisible() {
        return this.treeViewKey.get() ?? false;
    }
    set isTreeLayoutViewVisible(visible) {
        this.treeViewKey.set(visible);
    }
    async setTreeView(visible) {
        if (visible === this.isTreeLayoutViewVisible) {
            return;
        }
        this.isTreeLayoutViewVisible = visible;
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        return this.refreshTreeController.queue();
    }
    get state() {
        return this.searchStateKey.get() ?? SearchUIState.Idle;
    }
    set state(v) {
        this.searchStateKey.set(v);
    }
    getContainer() {
        return this.container;
    }
    get searchResult() {
        return this.viewModel && this.viewModel.searchResult;
    }
    get model() {
        return this.viewModel;
    }
    async refreshHasAISetting() {
        const shouldShowAI = this.shouldShowAIResults();
        if (!this.tree.hasNode(this.searchResult)) {
            return;
        }
        if (shouldShowAI && !this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
            if (this.model.searchResult.getCachedSearchComplete(false)) {
                return this.refreshAndUpdateCount();
            }
        }
        else if (!shouldShowAI && this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
            return this.refreshAndUpdateCount();
        }
    }
    onDidChangeWorkbenchState() {
        if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ && this.searchWithoutFolderMessageElement) {
            dom.hide(this.searchWithoutFolderMessageElement);
        }
    }
    refreshInputs() {
        this.pauseSearching = true;
        this.searchWidget.setValue(this.viewModel.searchResult.query?.contentPattern.pattern ?? '');
        this.searchWidget.setReplaceAllActionState(false);
        this.searchWidget.toggleReplace(true);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(this.viewModel.searchResult.query?.onlyOpenEditors || false);
        this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(!this.viewModel.searchResult.query?.userDisabledExcludesAndIgnoreFiles || true);
        this.searchIncludePattern.setValue('');
        this.searchExcludePattern.setValue('');
        this.pauseSearching = false;
    }
    async replaceSearchModel(searchModel, asyncResults) {
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 0 }, _progress => {
            return new Promise(resolve => progressComplete = resolve);
        });
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._refreshResultsScheduler.schedule();
        // remove old model and use the new searchModel
        searchModel.location = SearchModelLocation.PANEL;
        searchModel.replaceActive = this.viewModel.isReplaceActive();
        searchModel.replaceString = this.searchWidget.getReplaceValue();
        this._onSearchResultChangedDisposable?.dispose();
        this._onSearchResultChangedDisposable = this._register(searchModel.onSearchResultChanged(async (event) => this.onSearchResultsChanged(event)));
        // this call will also dispose of the old model
        this.searchViewModelWorkbenchService.searchModel = searchModel;
        this.viewModel = searchModel;
        this.tree.setInput(this.viewModel.searchResult);
        await this.onSearchResultsChanged();
        this.refreshInputs();
        asyncResults.then((complete) => {
            clearTimeout(slowTimer);
            return this.onSearchComplete(progressComplete, undefined, undefined, complete);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, undefined, undefined);
        });
        await this.expandIfSingularResult();
    }
    renderBody(parent) {
        super.renderBody(parent);
        this.container = dom.append(parent, dom.$('.search-view'));
        this.searchWidgetsContainerElement = dom.append(this.container, $('.search-widgets-container'));
        this.createSearchWidget(this.searchWidgetsContainerElement);
        const history = this.searchHistoryService.load();
        const filePatterns = this.viewletState['query.filePatterns'] || '';
        const patternExclusions = this.viewletState['query.folderExclusions'] || '';
        const patternExclusionsHistory = history.exclude || [];
        const patternIncludes = this.viewletState['query.folderIncludes'] || '';
        const patternIncludesHistory = history.include || [];
        const onlyOpenEditors = this.viewletState['query.onlyOpenEditors'] || false;
        const queryDetailsExpanded = this.viewletState['query.queryDetailsExpanded'] || '';
        const useExcludesAndIgnoreFiles = typeof this.viewletState['query.useExcludesAndIgnoreFiles'] === 'boolean' ?
            this.viewletState['query.useExcludesAndIgnoreFiles'] : true;
        this.queryDetails = dom.append(this.searchWidgetsContainerElement, $('.query-details'));
        // Toggle query details button
        const toggleQueryDetailsLabel = nls.localize('moreSearch', "Toggle Search Details");
        this.toggleQueryDetailsButton = dom.append(this.queryDetails, $('.more' + ThemeIcon.asCSSSelector(searchDetailsIcon), { tabindex: 0, role: 'button', 'aria-label': toggleQueryDetailsLabel }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this.toggleQueryDetailsButton, toggleQueryDetailsLabel));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.CLICK, e => {
            dom.EventHelper.stop(e);
            this.toggleQueryDetails(!this.accessibilityService.isScreenReaderOptimized());
        }));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e);
                this.toggleQueryDetails(false);
            }
        }));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                if (this.searchWidget.isReplaceActive()) {
                    this.searchWidget.focusReplaceAllAction();
                }
                else {
                    this.searchWidget.isReplaceShown() ? this.searchWidget.replaceInput?.focusOnPreserve() : this.searchWidget.focusRegexAction();
                }
                dom.EventHelper.stop(e);
            }
        }));
        // folder includes list
        const folderIncludesList = dom.append(this.queryDetails, $('.file-types.includes'));
        const filesToIncludeTitle = nls.localize('searchScope.includes', "files to include");
        dom.append(folderIncludesList, $('h4', undefined, filesToIncludeTitle));
        this.inputPatternIncludes = this._register(this.instantiationService.createInstance(IncludePatternInputWidget, folderIncludesList, this.contextViewService, {
            ariaLabel: filesToIncludeTitle,
            placeholder: nls.localize('placeholder.includes', "e.g. *.ts, src/**/include"),
            showPlaceholderOnFocus: true,
            history: patternIncludesHistory,
            inputBoxStyles: defaultInputBoxStyles
        }));
        this.inputPatternIncludes.setValue(patternIncludes);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(onlyOpenEditors);
        this._register(this.inputPatternIncludes.onCancel(() => this.cancelSearch(false)));
        this._register(this.inputPatternIncludes.onChangeSearchInEditorsBox(() => this.triggerQueryChange()));
        this.trackInputBox(this.inputPatternIncludes.inputFocusTracker, this.inputPatternIncludesFocused);
        // excludes list
        const excludesList = dom.append(this.queryDetails, $('.file-types.excludes'));
        const excludesTitle = nls.localize('searchScope.excludes', "files to exclude");
        dom.append(excludesList, $('h4', undefined, excludesTitle));
        this.inputPatternExcludes = this._register(this.instantiationService.createInstance(ExcludePatternInputWidget, excludesList, this.contextViewService, {
            ariaLabel: excludesTitle,
            placeholder: nls.localize('placeholder.excludes', "e.g. *.ts, src/**/exclude"),
            showPlaceholderOnFocus: true,
            history: patternExclusionsHistory,
            inputBoxStyles: defaultInputBoxStyles
        }));
        this.inputPatternExcludes.setValue(patternExclusions);
        this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(useExcludesAndIgnoreFiles);
        this._register(this.inputPatternExcludes.onCancel(() => this.cancelSearch(false)));
        this._register(this.inputPatternExcludes.onChangeIgnoreBox(() => this.triggerQueryChange()));
        this.trackInputBox(this.inputPatternExcludes.inputFocusTracker, this.inputPatternExclusionsFocused);
        const updateHasFilePatternKey = () => this.hasFilePatternKey.set(this.inputPatternIncludes.getValue().length > 0 || this.inputPatternExcludes.getValue().length > 0);
        updateHasFilePatternKey();
        const onFilePatternSubmit = (triggeredOnType) => {
            this.triggerQueryChange({ triggeredOnType, delay: this.searchConfig.searchOnTypeDebouncePeriod });
            if (triggeredOnType) {
                updateHasFilePatternKey();
            }
        };
        this._register(this.inputPatternIncludes.onSubmit(onFilePatternSubmit));
        this._register(this.inputPatternExcludes.onSubmit(onFilePatternSubmit));
        this.messagesElement = dom.append(this.container, $('.messages.text-search-provider-messages'));
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.showSearchWithoutFolderMessage();
        }
        this.createSearchResultsView(this.container);
        if (filePatterns !== '' || patternExclusions !== '' || patternIncludes !== '' || queryDetailsExpanded !== '' || !useExcludesAndIgnoreFiles) {
            this.toggleQueryDetails(true, true, true);
        }
        this._onSearchResultChangedDisposable = this._register(this.viewModel.onSearchResultChanged(async (event) => await this.onSearchResultsChanged(event)));
        this._register(this.onDidChangeBodyVisibility(visible => this.onVisibilityChanged(visible)));
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        this._register(this.themeService.onDidFileIconThemeChange(this.updateIndentStyles, this));
    }
    updateIndentStyles(theme) {
        this.resultsElement.classList.toggle('hide-arrows', this.isTreeLayoutViewVisible && theme.hidesExplorerArrows);
    }
    async onVisibilityChanged(visible) {
        this.viewletVisible.set(visible);
        if (visible) {
            if (this.changedWhileHidden) {
                // Render if results changed while viewlet was hidden - #37818
                await this.refreshAndUpdateCount();
                this.changedWhileHidden = false;
            }
        }
        else {
            // Reset last focus to input to preserve opening the viewlet always focusing the query editor.
            this.lastFocusState = 'input';
        }
        // Enable highlights if there are searchresults
        this.viewModel?.searchResult.toggleHighlights(visible);
    }
    get searchAndReplaceWidget() {
        return this.searchWidget;
    }
    get searchIncludePattern() {
        return this.inputPatternIncludes;
    }
    get searchExcludePattern() {
        return this.inputPatternExcludes;
    }
    createSearchWidget(container) {
        const contentPattern = this.viewletState['query.contentPattern'] || '';
        const replaceText = this.viewletState['query.replaceText'] || '';
        const isRegex = this.viewletState['query.regex'] === true;
        const isWholeWords = this.viewletState['query.wholeWords'] === true;
        const isCaseSensitive = this.viewletState['query.caseSensitive'] === true;
        const history = this.searchHistoryService.load();
        const searchHistory = history.search || this.viewletState['query.searchHistory'] || [];
        const replaceHistory = history.replace || this.viewletState['query.replaceHistory'] || [];
        const showReplace = typeof this.viewletState['view.showReplace'] === 'boolean' ? this.viewletState['view.showReplace'] : true;
        const preserveCase = this.viewletState['query.preserveCase'] === true;
        const isInNotebookMarkdownInput = this.viewletState['query.isInNotebookMarkdownInput'] ?? true;
        const isInNotebookMarkdownPreview = this.viewletState['query.isInNotebookMarkdownPreview'] ?? true;
        const isInNotebookCellInput = this.viewletState['query.isInNotebookCellInput'] ?? true;
        const isInNotebookCellOutput = this.viewletState['query.isInNotebookCellOutput'] ?? true;
        this.searchWidget = this._register(this.instantiationService.createInstance(SearchWidget, container, {
            value: contentPattern,
            replaceValue: replaceText,
            isRegex: isRegex,
            isCaseSensitive: isCaseSensitive,
            isWholeWords: isWholeWords,
            searchHistory: searchHistory,
            replaceHistory: replaceHistory,
            preserveCase: preserveCase,
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
            notebookOptions: {
                isInNotebookMarkdownInput,
                isInNotebookMarkdownPreview,
                isInNotebookCellInput,
                isInNotebookCellOutput,
            }
        }));
        if (!this.searchWidget.searchInput || !this.searchWidget.replaceInput) {
            this.logService.warn(`Cannot fully create search widget. Search or replace input undefined. SearchInput: ${this.searchWidget.searchInput}, ReplaceInput: ${this.searchWidget.replaceInput}`);
            return;
        }
        if (showReplace) {
            this.searchWidget.toggleReplace(true);
        }
        this._register(this.searchWidget.onSearchSubmit(options => this.triggerQueryChange(options)));
        this._register(this.searchWidget.onSearchCancel(({ focus }) => this.cancelSearch(focus)));
        this._register(this.searchWidget.searchInput.onDidOptionChange(() => {
            this.triggerQueryChange({ shouldKeepAIResults: true });
        }));
        this._register(this.searchWidget.getNotebookFilters().onDidChange(() => this.triggerQueryChange({ shouldKeepAIResults: true })));
        const updateHasPatternKey = () => this.hasSearchPatternKey.set(this.searchWidget.searchInput ? (this.searchWidget.searchInput.getValue().length > 0) : false);
        updateHasPatternKey();
        this._register(this.searchWidget.searchInput.onDidChange(() => updateHasPatternKey()));
        const updateHasReplacePatternKey = () => this.hasReplacePatternKey.set(this.searchWidget.getReplaceValue().length > 0);
        updateHasReplacePatternKey();
        this._register(this.searchWidget.replaceInput.inputBox.onDidChange(() => updateHasReplacePatternKey()));
        this._register(this.searchWidget.onDidHeightChange(() => this.reLayout()));
        this._register(this.searchWidget.onReplaceToggled(() => this.reLayout()));
        this._register(this.searchWidget.onReplaceStateChange(async (state) => {
            this.viewModel.replaceActive = state;
            await this.refreshTreeController.queue();
        }));
        this._register(this.searchWidget.onPreserveCaseChange(async (state) => {
            this.viewModel.preserveCase = state;
            await this.refreshTreeController.queue();
        }));
        this._register(this.searchWidget.onReplaceValueChanged(() => {
            this.viewModel.replaceString = this.searchWidget.getReplaceValue();
            this.delayedRefresh.trigger(async () => this.refreshTreeController.queue());
        }));
        this._register(this.searchWidget.onBlur(() => {
            this.toggleQueryDetailsButton.focus();
        }));
        this._register(this.searchWidget.onReplaceAll(() => this.replaceAll()));
        this.trackInputBox(this.searchWidget.searchInputFocusTracker);
        this.trackInputBox(this.searchWidget.replaceInputFocusTracker);
    }
    shouldShowAIResults() {
        const hasProvider = Constants.SearchContext.hasAIResultProvider.getValue(this.contextKeyService);
        return !!hasProvider;
    }
    async onConfigurationUpdated(event) {
        if (event && (event.affectsConfiguration('search.decorations.colors') || event.affectsConfiguration('search.decorations.badges'))) {
            return this.refreshTreeController.queue();
        }
    }
    trackInputBox(inputFocusTracker, contextKey) {
        if (!inputFocusTracker) {
            return;
        }
        this._register(inputFocusTracker.onDidFocus(() => {
            this.lastFocusState = 'input';
            this.inputBoxFocused.set(true);
            contextKey?.set(true);
        }));
        this._register(inputFocusTracker.onDidBlur(() => {
            this.inputBoxFocused.set(this.searchWidget.searchInputHasFocus()
                || this.searchWidget.replaceInputHasFocus()
                || this.inputPatternIncludes.inputHasFocus()
                || this.inputPatternExcludes.inputHasFocus());
            contextKey?.set(false);
        }));
    }
    async onSearchResultsChanged(event) {
        if (this.isVisible()) {
            return this.refreshAndUpdateCount(event);
        }
        else {
            this.changedWhileHidden = true;
        }
    }
    async refreshAndUpdateCount(event) {
        this.searchWidget.setReplaceAllActionState(!this.viewModel.searchResult.isEmpty());
        this.updateSearchResultCount(this.viewModel.searchResult.query.userDisabledExcludesAndIgnoreFiles, this.viewModel.searchResult.query?.onlyOpenEditors, event?.clearingAll);
        return this.refreshTreeController.queue(event);
    }
    originalShouldCollapse(match) {
        const collapseResults = this.searchConfig.collapseResults;
        return (collapseResults === 'alwaysCollapse' ||
            (!(isSearchTreeMatch(match)) && match.count() > 10 && collapseResults !== 'alwaysExpand')) ?
            ObjectTreeElementCollapseState.PreserveOrCollapsed : ObjectTreeElementCollapseState.PreserveOrExpanded;
    }
    shouldCollapseAccordingToConfig(match) {
        const collapseResults = this.originalShouldCollapse(match);
        if (collapseResults === ObjectTreeElementCollapseState.PreserveOrCollapsed) {
            return true;
        }
        return false;
    }
    replaceAll() {
        if (this.viewModel.searchResult.count() === 0) {
            return;
        }
        const occurrences = this.viewModel.searchResult.count();
        const fileCount = this.viewModel.searchResult.fileCount();
        const replaceValue = this.searchWidget.getReplaceValue() || '';
        const afterReplaceAllMessage = this.buildAfterReplaceAllMessage(occurrences, fileCount, replaceValue);
        let progressComplete;
        let progressReporter;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 100, total: occurrences }, p => {
            progressReporter = p;
            return new Promise(resolve => progressComplete = resolve);
        });
        const confirmation = {
            title: nls.localize('replaceAll.confirmation.title', "Replace All"),
            message: this.buildReplaceAllConfirmationMessage(occurrences, fileCount, replaceValue),
            primaryButton: nls.localize({ key: 'replaceAll.confirm.button', comment: ['&& denotes a mnemonic'] }, "&&Replace")
        };
        this.dialogService.confirm(confirmation).then(res => {
            if (res.confirmed) {
                this.searchWidget.setReplaceAllActionState(false);
                this.viewModel.searchResult.replaceAll(progressReporter).then(() => {
                    progressComplete();
                    const messageEl = this.clearMessage();
                    dom.append(messageEl, afterReplaceAllMessage);
                    this.reLayout();
                }, (error) => {
                    progressComplete();
                    errors.isCancellationError(error);
                    this.notificationService.error(error);
                });
            }
            else {
                progressComplete();
            }
        });
    }
    buildAfterReplaceAllMessage(occurrences, fileCount, replaceValue) {
        if (occurrences === 1) {
            if (fileCount === 1) {
                if (replaceValue) {
                    return nls.localize('replaceAll.occurrence.file.message', "Replaced {0} occurrence across {1} file with '{2}'.", occurrences, fileCount, replaceValue);
                }
                return nls.localize('removeAll.occurrence.file.message', "Replaced {0} occurrence across {1} file.", occurrences, fileCount);
            }
            if (replaceValue) {
                return nls.localize('replaceAll.occurrence.files.message', "Replaced {0} occurrence across {1} files with '{2}'.", occurrences, fileCount, replaceValue);
            }
            return nls.localize('removeAll.occurrence.files.message', "Replaced {0} occurrence across {1} files.", occurrences, fileCount);
        }
        if (fileCount === 1) {
            if (replaceValue) {
                return nls.localize('replaceAll.occurrences.file.message', "Replaced {0} occurrences across {1} file with '{2}'.", occurrences, fileCount, replaceValue);
            }
            return nls.localize('removeAll.occurrences.file.message', "Replaced {0} occurrences across {1} file.", occurrences, fileCount);
        }
        if (replaceValue) {
            return nls.localize('replaceAll.occurrences.files.message', "Replaced {0} occurrences across {1} files with '{2}'.", occurrences, fileCount, replaceValue);
        }
        return nls.localize('removeAll.occurrences.files.message', "Replaced {0} occurrences across {1} files.", occurrences, fileCount);
    }
    buildReplaceAllConfirmationMessage(occurrences, fileCount, replaceValue) {
        if (occurrences === 1) {
            if (fileCount === 1) {
                if (replaceValue) {
                    return nls.localize('removeAll.occurrence.file.confirmation.message', "Replace {0} occurrence across {1} file with '{2}'?", occurrences, fileCount, replaceValue);
                }
                return nls.localize('replaceAll.occurrence.file.confirmation.message', "Replace {0} occurrence across {1} file?", occurrences, fileCount);
            }
            if (replaceValue) {
                return nls.localize('removeAll.occurrence.files.confirmation.message', "Replace {0} occurrence across {1} files with '{2}'?", occurrences, fileCount, replaceValue);
            }
            return nls.localize('replaceAll.occurrence.files.confirmation.message', "Replace {0} occurrence across {1} files?", occurrences, fileCount);
        }
        if (fileCount === 1) {
            if (replaceValue) {
                return nls.localize('removeAll.occurrences.file.confirmation.message', "Replace {0} occurrences across {1} file with '{2}'?", occurrences, fileCount, replaceValue);
            }
            return nls.localize('replaceAll.occurrences.file.confirmation.message', "Replace {0} occurrences across {1} file?", occurrences, fileCount);
        }
        if (replaceValue) {
            return nls.localize('removeAll.occurrences.files.confirmation.message', "Replace {0} occurrences across {1} files with '{2}'?", occurrences, fileCount, replaceValue);
        }
        return nls.localize('replaceAll.occurrences.files.confirmation.message', "Replace {0} occurrences across {1} files?", occurrences, fileCount);
    }
    clearMessage() {
        this.searchWithoutFolderMessageElement = undefined;
        const wasHidden = this.messagesElement.style.display === 'none';
        dom.clearNode(this.messagesElement);
        dom.show(this.messagesElement);
        this.messageDisposables.clear();
        const newMessage = dom.append(this.messagesElement, $('.message'));
        if (wasHidden) {
            this.reLayout();
        }
        return newMessage;
    }
    createSearchResultsView(container) {
        this.resultsElement = dom.append(container, $('.results.show-file-icons.file-icon-themable-tree'));
        const delegate = this.instantiationService.createInstance(SearchDelegate);
        const identityProvider = {
            getId(element) {
                return element.id();
            }
        };
        this.searchDataSource = this.instantiationService.createInstance(SearchViewDataSource, this);
        this.treeLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility }));
        this.tree = this._register(this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'SearchView', this.resultsElement, delegate, {
            isIncompressible: (element) => {
                if (isSearchTreeFolderMatch(element) && !isTextSearchHeading(element.parent()) && !(isSearchTreeFolderMatchWorkspaceRoot(element.parent())) && !(isSearchTreeFolderMatchNoRoot(element.parent()))) {
                    return false;
                }
                return true;
            }
        }, [
            this._register(this.instantiationService.createInstance(FolderMatchRenderer, this, this.treeLabels)),
            this._register(this.instantiationService.createInstance(FileMatchRenderer, this, this.treeLabels)),
            this._register(this.instantiationService.createInstance(TextSearchResultRenderer, this.treeLabels)),
            this._register(this.instantiationService.createInstance(MatchRenderer, this)),
        ], this.searchDataSource, {
            identityProvider,
            accessibilityProvider: this.treeAccessibilityProvider,
            dnd: this.instantiationService.createInstance(ResourceListDnDHandler, element => {
                if (isSearchTreeFileMatch(element)) {
                    return element.resource;
                }
                if (isSearchTreeMatch(element)) {
                    return withSelection(element.parent().resource, element.range());
                }
                return null;
            }),
            multipleSelectionSupport: true,
            selectionNavigation: true,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            paddingBottom: SearchDelegate.ITEM_HEIGHT,
            collapseByDefault: (e) => {
                if (isTextSearchHeading(e)) {
                    // always collapse the ai text search result, but always expand the text result
                    return e.isAIContributed;
                }
                // always expand compressed nodes
                if (isSearchTreeFolderMatch(e) && e.matches().length === 1 && isSearchTreeFolderMatch(e.matches()[0])) {
                    return false;
                }
                return this.shouldCollapseAccordingToConfig(e);
            }
        }));
        Constants.SearchContext.SearchResultListFocusedKey.bindTo(this.tree.contextKeyService);
        this.tree.setInput(this.viewModel.searchResult);
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        const updateHasSomeCollapsible = () => this.toggleCollapseStateDelayer.trigger(() => this.hasSomeCollapsibleResultKey.set(this.hasSomeCollapsible()));
        updateHasSomeCollapsible();
        this._register(this.tree.onDidChangeCollapseState(() => updateHasSomeCollapsible()));
        this._register(this.tree.onDidChangeModel(() => updateHasSomeCollapsible()));
        this._register(Event.debounce(this.tree.onDidOpen, (last, event) => event, DEBOUNCE_DELAY, true)(options => {
            if (isSearchTreeMatch(options.element)) {
                const selectedMatch = options.element;
                this.currentSelectedFileMatch?.setSelectedMatch(null);
                this.currentSelectedFileMatch = selectedMatch.parent();
                this.currentSelectedFileMatch.setSelectedMatch(selectedMatch);
                this.onFocus(selectedMatch, options.editorOptions.preserveFocus, options.sideBySide, options.editorOptions.pinned);
            }
        }));
        this._register(Event.debounce(this.tree.onDidChangeFocus, (last, event) => event, DEBOUNCE_DELAY, true)(() => {
            const selection = this.tree.getSelection();
            const focus = this.tree.getFocus()[0];
            if (selection.length > 1 && isSearchTreeMatch(focus)) {
                this.onFocus(focus, true);
            }
        }));
        this._register(Event.any(this.tree.onDidFocus, this.tree.onDidChangeFocus)(() => {
            const focus = this.tree.getFocus()[0];
            if (this.tree.isDOMFocused()) {
                const firstElem = this.tree.getFirstElementChild(this.tree.getInput());
                this.firstMatchFocused.set(firstElem === focus);
                this.fileMatchOrMatchFocused.set(!!focus);
                this.fileMatchFocused.set(isSearchTreeFileMatch(focus));
                this.folderMatchFocused.set(isSearchTreeFolderMatch(focus));
                this.matchFocused.set(isSearchTreeMatch(focus));
                this.fileMatchOrFolderMatchFocus.set(isSearchTreeFileMatch(focus) || isSearchTreeFolderMatch(focus));
                this.fileMatchOrFolderMatchWithResourceFocus.set(isSearchTreeFileMatch(focus) || isSearchTreeFolderMatchWithResource(focus));
                this.folderMatchWithResourceFocused.set(isSearchTreeFolderMatchWithResource(focus));
                this.searchResultHeaderFocused.set(isSearchHeader(focus));
                this.lastFocusState = 'tree';
            }
            let editable = false;
            if (isSearchTreeMatch(focus)) {
                editable = !focus.isReadonly;
            }
            else if (isSearchTreeFileMatch(focus)) {
                editable = !focus.hasOnlyReadOnlyMatches();
            }
            else if (isSearchTreeFolderMatch(focus)) {
                editable = !focus.hasOnlyReadOnlyMatches();
            }
            this.isEditableItem.set(editable);
        }));
        this._register(this.tree.onDidBlur(() => {
            this.firstMatchFocused.reset();
            this.fileMatchOrMatchFocused.reset();
            this.fileMatchFocused.reset();
            this.folderMatchFocused.reset();
            this.matchFocused.reset();
            this.fileMatchOrFolderMatchFocus.reset();
            this.fileMatchOrFolderMatchWithResourceFocus.reset();
            this.folderMatchWithResourceFocused.reset();
            this.searchResultHeaderFocused.reset();
            this.isEditableItem.reset();
        }));
    }
    onContextMenu(e) {
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        const selection = this.tree.getSelection();
        let arg;
        let context;
        if (selection && selection.length > 0) {
            arg = e.element;
            context = selection;
        }
        else {
            context = e.element;
        }
        this.contextMenuService.showContextMenu({
            menuId: MenuId.SearchContext,
            menuActionOptions: { shouldForwardArgs: true, arg },
            contextKeyService: this.contextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => context,
        });
    }
    hasSomeCollapsible() {
        const viewer = this.getControl();
        const navigator = viewer.navigate();
        let node = navigator.first();
        const shouldShowAI = this.shouldShowAIResults();
        do {
            if (node && !viewer.isCollapsed(node) && (!shouldShowAI || !(isTextSearchHeading(node)))) {
                // ignore the ai text search result id
                return true;
            }
        } while (node = navigator.next());
        return false;
    }
    async selectNextMatch() {
        if (!this.hasSearchResults()) {
            return;
        }
        const [selected] = this.tree.getSelection();
        // Expand the initial selected node, if needed
        if (selected && !(isSearchTreeMatch(selected))) {
            if (this.tree.isCollapsed(selected)) {
                await this.tree.expand(selected);
            }
        }
        const navigator = this.tree.navigate(selected);
        let next = navigator.next();
        if (!next) {
            next = navigator.first();
        }
        // Expand until first child is a Match
        while (next && !(isSearchTreeMatch(next))) {
            if (this.tree.isCollapsed(next)) {
                await this.tree.expand(next);
            }
            // Select the first child
            next = navigator.next();
        }
        // Reveal the newly selected element
        if (next) {
            if (next === selected) {
                this.tree.setFocus([]);
            }
            const event = getSelectionKeyboardEvent(undefined, false, false);
            this.tree.setFocus([next], event);
            this.tree.setSelection([next], event);
            this.tree.reveal(next);
            const ariaLabel = this.treeAccessibilityProvider.getAriaLabel(next);
            if (ariaLabel) {
                aria.status(ariaLabel);
            }
        }
    }
    async selectPreviousMatch() {
        if (!this.hasSearchResults()) {
            return;
        }
        const [selected] = this.tree.getSelection();
        let navigator = this.tree.navigate(selected);
        let prev = navigator.previous();
        // Select previous until find a Match or a collapsed item
        while (!prev || (!(isSearchTreeMatch(prev)) && !this.tree.isCollapsed(prev))) {
            const nextPrev = prev ? navigator.previous() : navigator.last();
            if (!prev && !nextPrev) {
                return;
            }
            prev = nextPrev;
        }
        // Expand until last child is a Match
        while (prev && !(isSearchTreeMatch(prev))) {
            const nextItem = navigator.next();
            if (!nextItem) {
                break;
            }
            await this.tree.expand(prev);
            navigator = this.tree.navigate(nextItem); // recreate navigator because modifying the tree can invalidate it
            prev = nextItem ? navigator.previous() : navigator.last(); // select last child
        }
        // Reveal the newly selected element
        if (prev) {
            if (prev === selected) {
                this.tree.setFocus([]);
            }
            const event = getSelectionKeyboardEvent(undefined, false, false);
            this.tree.setFocus([prev], event);
            this.tree.setSelection([prev], event);
            this.tree.reveal(prev);
            const ariaLabel = this.treeAccessibilityProvider.getAriaLabel(prev);
            if (ariaLabel) {
                aria.status(ariaLabel);
            }
        }
    }
    moveFocusToResults() {
        this.tree.domFocus();
    }
    focus() {
        super.focus();
        if (this.lastFocusState === 'input' || !this.hasSearchResults()) {
            const updatedText = this.searchConfig.seedOnFocus ? this.updateTextFromSelection({ allowSearchOnType: false }) : false;
            this.searchWidget.focus(undefined, undefined, updatedText);
        }
        else {
            this.tree.domFocus();
        }
    }
    updateTextFromFindWidgetOrSelection({ allowUnselectedWord = true, allowSearchOnType = true }) {
        let activeEditor = this.editorService.activeTextEditorControl;
        if (isCodeEditor(activeEditor) && !activeEditor?.hasTextFocus()) {
            const controller = CommonFindController.get(activeEditor);
            if (controller && controller.isFindInputFocused()) {
                return this.updateTextFromFindWidget(controller, { allowSearchOnType });
            }
            const editors = this.codeEditorService.listCodeEditors();
            activeEditor = editors.find(editor => editor instanceof EmbeddedCodeEditorWidget && editor.getParentEditor() === activeEditor && editor.hasTextFocus())
                ?? activeEditor;
        }
        return this.updateTextFromSelection({ allowUnselectedWord, allowSearchOnType }, activeEditor);
    }
    updateTextFromFindWidget(controller, { allowSearchOnType = true }) {
        if (!this.searchConfig.seedWithNearestWord && (dom.getActiveWindow().getSelection()?.toString() ?? '') === '') {
            return false;
        }
        const searchString = controller.getState().searchString;
        if (searchString === '') {
            return false;
        }
        this.searchWidget.searchInput?.setCaseSensitive(controller.getState().matchCase);
        this.searchWidget.searchInput?.setWholeWords(controller.getState().wholeWord);
        this.searchWidget.searchInput?.setRegex(controller.getState().isRegex);
        this.updateText(searchString, allowSearchOnType);
        return true;
    }
    updateTextFromSelection({ allowUnselectedWord = true, allowSearchOnType = true }, editor) {
        const seedSearchStringFromSelection = this.configurationService.getValue('editor').find.seedSearchStringFromSelection;
        if (!seedSearchStringFromSelection || seedSearchStringFromSelection === 'never') {
            return false;
        }
        let selectedText = this.getSearchTextFromEditor(allowUnselectedWord, editor);
        if (selectedText === null) {
            return false;
        }
        if (this.searchWidget.searchInput?.getRegex()) {
            selectedText = strings.escapeRegExpCharacters(selectedText);
        }
        this.updateText(selectedText, allowSearchOnType);
        return true;
    }
    updateText(text, allowSearchOnType = true) {
        if (allowSearchOnType && !this.viewModel.searchResult.isDirty) {
            this.searchWidget.setValue(text);
        }
        else {
            this.pauseSearching = true;
            this.searchWidget.setValue(text);
            this.pauseSearching = false;
        }
    }
    focusNextInputBox() {
        if (this.searchWidget.searchInputHasFocus()) {
            if (this.searchWidget.isReplaceShown()) {
                this.searchWidget.focus(true, true);
            }
            else {
                this.moveFocusFromSearchOrReplace();
            }
            return;
        }
        if (this.searchWidget.replaceInputHasFocus()) {
            this.moveFocusFromSearchOrReplace();
            return;
        }
        if (this.inputPatternIncludes.inputHasFocus()) {
            this.inputPatternExcludes.focus();
            this.inputPatternExcludes.select();
            return;
        }
        if (this.inputPatternExcludes.inputHasFocus()) {
            this.selectTreeIfNotSelected();
            return;
        }
    }
    moveFocusFromSearchOrReplace() {
        if (this.showsFileTypes()) {
            this.toggleQueryDetails(true, this.showsFileTypes());
        }
        else {
            this.selectTreeIfNotSelected();
        }
    }
    focusPreviousInputBox() {
        if (this.searchWidget.searchInputHasFocus()) {
            return;
        }
        if (this.searchWidget.replaceInputHasFocus()) {
            this.searchWidget.focus(true);
            return;
        }
        if (this.inputPatternIncludes.inputHasFocus()) {
            this.searchWidget.focus(true, true);
            return;
        }
        if (this.inputPatternExcludes.inputHasFocus()) {
            this.inputPatternIncludes.focus();
            this.inputPatternIncludes.select();
            return;
        }
        if (this.tree.isDOMFocused()) {
            this.moveFocusFromResults();
            return;
        }
    }
    moveFocusFromResults() {
        if (this.showsFileTypes()) {
            this.toggleQueryDetails(true, true, false, true);
        }
        else {
            this.searchWidget.focus(true, true);
        }
    }
    reLayout() {
        if (this.isDisposed || !this.size) {
            return;
        }
        const actionsPosition = this.searchConfig.actionsPosition;
        this.getContainer().classList.toggle(SearchView_1.ACTIONS_RIGHT_CLASS_NAME, actionsPosition === 'right');
        this.searchWidget.setWidth(this.size.width - 28 /* container margin */);
        this.inputPatternExcludes.setWidth(this.size.width - 28 /* container margin */);
        this.inputPatternIncludes.setWidth(this.size.width - 28 /* container margin */);
        const widgetHeight = dom.getTotalHeight(this.searchWidgetsContainerElement);
        const messagesHeight = dom.getTotalHeight(this.messagesElement);
        this.tree.layout(this.size.height - widgetHeight - messagesHeight, this.size.width - 28);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.size = new dom.Dimension(width, height);
        this.reLayout();
    }
    getControl() {
        return this.tree;
    }
    allSearchFieldsClear() {
        return this.searchWidget.getReplaceValue() === '' &&
            (!this.searchWidget.searchInput || this.searchWidget.searchInput.getValue() === '');
    }
    allFilePatternFieldsClear() {
        return this.searchExcludePattern.getValue() === '' &&
            this.searchIncludePattern.getValue() === '';
    }
    hasSearchResults() {
        return !this.viewModel.searchResult.isEmpty();
    }
    clearSearchResults(clearInput = true) {
        this.viewModel.searchResult.clear();
        this.showEmptyStage(true);
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.showSearchWithoutFolderMessage();
        }
        if (clearInput) {
            if (this.allSearchFieldsClear()) {
                this.clearFilePatternFields();
            }
            this.searchWidget.clear();
        }
        this.viewModel.cancelSearch();
        this.tree.ariaLabel = nls.localize('emptySearch', "Empty Search");
        this.accessibilitySignalService.playSignal(AccessibilitySignal.clear);
        this.reLayout();
    }
    clearFilePatternFields() {
        this.searchExcludePattern.clear();
        this.searchIncludePattern.clear();
    }
    cancelSearch(focus = true) {
        if (this.viewModel.cancelSearch() && this.viewModel.cancelAISearch()) {
            if (focus) {
                this.searchWidget.focus();
            }
            return true;
        }
        return false;
    }
    selectTreeIfNotSelected() {
        if (this.tree.getNode(undefined)) {
            this.tree.domFocus();
            const selection = this.tree.getSelection();
            if (selection.length === 0) {
                const event = getSelectionKeyboardEvent();
                this.tree.focusNext(undefined, undefined, event);
                this.tree.setSelection(this.tree.getFocus(), event);
            }
        }
    }
    getSearchTextFromEditor(allowUnselectedWord, editor) {
        if (dom.isAncestorOfActiveElement(this.getContainer())) {
            return null;
        }
        editor = editor ?? this.editorService.activeTextEditorControl;
        if (!editor) {
            return null;
        }
        const allowUnselected = this.searchConfig.seedWithNearestWord && allowUnselectedWord;
        return getSelectionTextFromEditor(allowUnselected, editor);
    }
    showsFileTypes() {
        return this.queryDetails.classList.contains('more');
    }
    toggleCaseSensitive() {
        this.searchWidget.searchInput?.setCaseSensitive(!this.searchWidget.searchInput.getCaseSensitive());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    toggleWholeWords() {
        this.searchWidget.searchInput?.setWholeWords(!this.searchWidget.searchInput.getWholeWords());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    toggleRegex() {
        this.searchWidget.searchInput?.setRegex(!this.searchWidget.searchInput.getRegex());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    togglePreserveCase() {
        this.searchWidget.replaceInput?.setPreserveCase(!this.searchWidget.replaceInput.getPreserveCase());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    setSearchParameters(args = {}) {
        if (typeof args.isCaseSensitive === 'boolean') {
            this.searchWidget.searchInput?.setCaseSensitive(args.isCaseSensitive);
        }
        if (typeof args.matchWholeWord === 'boolean') {
            this.searchWidget.searchInput?.setWholeWords(args.matchWholeWord);
        }
        if (typeof args.isRegex === 'boolean') {
            this.searchWidget.searchInput?.setRegex(args.isRegex);
        }
        if (typeof args.filesToInclude === 'string') {
            this.searchIncludePattern.setValue(String(args.filesToInclude));
        }
        if (typeof args.filesToExclude === 'string') {
            this.searchExcludePattern.setValue(String(args.filesToExclude));
        }
        if (typeof args.query === 'string') {
            this.searchWidget.searchInput?.setValue(args.query);
        }
        if (typeof args.replace === 'string') {
            this.searchWidget.replaceInput?.setValue(args.replace);
        }
        else {
            if (this.searchWidget.replaceInput && this.searchWidget.replaceInput.getValue() !== '') {
                this.searchWidget.replaceInput.setValue('');
            }
        }
        if (typeof args.triggerSearch === 'boolean' && args.triggerSearch) {
            this.triggerQueryChange();
        }
        if (typeof args.preserveCase === 'boolean') {
            this.searchWidget.replaceInput?.setPreserveCase(args.preserveCase);
        }
        if (typeof args.useExcludeSettingsAndIgnoreFiles === 'boolean') {
            this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(args.useExcludeSettingsAndIgnoreFiles);
        }
        if (typeof args.onlyOpenEditors === 'boolean') {
            this.searchIncludePattern.setOnlySearchInOpenEditors(args.onlyOpenEditors);
        }
    }
    toggleQueryDetails(moveFocus = true, show, skipLayout, reverse) {
        const cls = 'more';
        show = typeof show === 'undefined' ? !this.queryDetails.classList.contains(cls) : Boolean(show);
        this.viewletState['query.queryDetailsExpanded'] = show;
        skipLayout = Boolean(skipLayout);
        if (show) {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'true');
            this.queryDetails.classList.add(cls);
            if (moveFocus) {
                if (reverse) {
                    this.inputPatternExcludes.focus();
                    this.inputPatternExcludes.select();
                }
                else {
                    this.inputPatternIncludes.focus();
                    this.inputPatternIncludes.select();
                }
            }
        }
        else {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'false');
            this.queryDetails.classList.remove(cls);
            if (moveFocus) {
                this.searchWidget.focus();
            }
        }
        if (!skipLayout && this.size) {
            this.reLayout();
        }
    }
    searchInFolders(folderPaths = []) {
        this._searchWithIncludeOrExclude(true, folderPaths);
    }
    searchOutsideOfFolders(folderPaths = []) {
        this._searchWithIncludeOrExclude(false, folderPaths);
    }
    _searchWithIncludeOrExclude(include, folderPaths) {
        if (!folderPaths.length || folderPaths.some(folderPath => folderPath === '.')) {
            this.inputPatternIncludes.setValue('');
            this.searchWidget.focus();
            return;
        }
        // Show 'files to include' box
        if (!this.showsFileTypes()) {
            this.toggleQueryDetails(true, true);
        }
        (include ? this.inputPatternIncludes : this.inputPatternExcludes).setValue(folderPaths.join(', '));
        this.searchWidget.focus(false);
    }
    triggerQueryChange(_options) {
        const options = { preserveFocus: true, triggeredOnType: false, delay: 0, ..._options };
        if (options.triggeredOnType && !this.searchConfig.searchOnType) {
            return;
        }
        if (!this.pauseSearching) {
            const delay = options.triggeredOnType ? options.delay : 0;
            this.triggerQueryDelayer.trigger(() => {
                this._onQueryChanged(options.preserveFocus, options.triggeredOnType, options.shouldKeepAIResults, options.shouldUpdateAISearch);
            }, delay);
        }
    }
    _getExcludePattern() {
        return this.inputPatternExcludes.getValue().trim();
    }
    _getIncludePattern() {
        return this.inputPatternIncludes.getValue().trim();
    }
    _onQueryChanged(preserveFocus, triggeredOnType = false, shouldKeepAIResults = false, shouldUpdateAISearch = false) {
        if (!(this.searchWidget.searchInput?.inputBox.isInputValid())) {
            return;
        }
        const isRegex = this.searchWidget.searchInput.getRegex();
        const isInNotebookMarkdownInput = this.searchWidget.getNotebookFilters().markupInput;
        const isInNotebookMarkdownPreview = this.searchWidget.getNotebookFilters().markupPreview;
        const isInNotebookCellInput = this.searchWidget.getNotebookFilters().codeInput;
        const isInNotebookCellOutput = this.searchWidget.getNotebookFilters().codeOutput;
        const isWholeWords = this.searchWidget.searchInput.getWholeWords();
        const isCaseSensitive = this.searchWidget.searchInput.getCaseSensitive();
        const contentPattern = this.searchWidget.searchInput.getValue();
        const excludePatternText = this._getExcludePattern();
        const includePatternText = this._getIncludePattern();
        const useExcludesAndIgnoreFiles = this.inputPatternExcludes.useExcludesAndIgnoreFiles();
        const onlySearchInOpenEditors = this.inputPatternIncludes.onlySearchInOpenEditors();
        if (contentPattern.length === 0) {
            this.clearSearchResults(false);
            this.clearMessage();
            return;
        }
        const content = {
            pattern: contentPattern,
            isRegExp: isRegex,
            isCaseSensitive: isCaseSensitive,
            isWordMatch: isWholeWords,
            notebookInfo: {
                isInNotebookMarkdownInput,
                isInNotebookMarkdownPreview,
                isInNotebookCellInput,
                isInNotebookCellOutput
            }
        };
        const excludePattern = [{ pattern: this.inputPatternExcludes.getValue() }];
        const includePattern = this.inputPatternIncludes.getValue();
        // Need the full match line to correctly calculate replace text, if this is a search/replace with regex group references ($1, $2, ...).
        // 10000 chars is enough to avoid sending huge amounts of text around, if you do a replace with a longer match, it may or may not resolve the group refs correctly.
        // https://github.com/microsoft/vscode/issues/58374
        const charsPerLine = content.isRegExp ? 10000 : 1000;
        const options = {
            _reason: 'searchView',
            extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
            maxResults: this.searchConfig.maxResults ?? undefined,
            disregardIgnoreFiles: !useExcludesAndIgnoreFiles || undefined,
            disregardExcludeSettings: !useExcludesAndIgnoreFiles || undefined,
            onlyOpenEditors: onlySearchInOpenEditors,
            excludePattern,
            includePattern,
            previewOptions: {
                matchLines: 1,
                charsPerLine
            },
            isSmartCase: this.searchConfig.smartCase,
            expandPatterns: true
        };
        const folderResources = this.contextService.getWorkspace().folders;
        const onQueryValidationError = (err) => {
            this.searchWidget.searchInput?.showMessage({ content: err.message, type: 3 /* MessageType.ERROR */ });
            this.viewModel.searchResult.clear();
        };
        let query;
        try {
            query = this.queryBuilder.text(content, folderResources.map(folder => folder.uri), options);
        }
        catch (err) {
            onQueryValidationError(err);
            return;
        }
        this.validateQuery(query).then(() => {
            // ensure that the node is closed when a new search is triggered
            if (!shouldKeepAIResults && !shouldUpdateAISearch && this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
                this.tree.collapse(this.searchResult.aiTextSearchResult);
            }
            this.onQueryTriggered(query, options, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch);
            if (!preserveFocus) {
                this.searchWidget.focus(false, undefined, true); // focus back to input field
            }
        }, onQueryValidationError);
    }
    validateQuery(query) {
        // Validate folderQueries
        const folderQueriesExistP = query.folderQueries.map(fq => {
            return this.fileService.exists(fq.folder).catch(() => false);
        });
        return Promise.all(folderQueriesExistP).then(existResults => {
            // If no folders exist, show an error message about the first one
            const existingFolderQueries = query.folderQueries.filter((folderQuery, i) => existResults[i]);
            if (!query.folderQueries.length || existingFolderQueries.length) {
                query.folderQueries = existingFolderQueries;
            }
            else {
                const nonExistantPath = query.folderQueries[0].folder.fsPath;
                const searchPathNotFoundError = nls.localize('searchPathNotFoundError', "Search path not found: {0}", nonExistantPath);
                return Promise.reject(new Error(searchPathNotFoundError));
            }
            return undefined;
        });
    }
    onQueryTriggered(query, options, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch) {
        this.addToSearchHistoryDelayer.trigger(() => {
            this.searchWidget.searchInput?.onSearchSubmit();
            this.inputPatternExcludes.onSearchSubmit();
            this.inputPatternIncludes.onSearchSubmit();
        });
        this.viewModel.cancelSearch(true);
        this.viewModel.cancelAISearch(true);
        this.currentSearchQ = this.currentSearchQ
            .then(() => this.doSearch(query, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch))
            .then(() => undefined, () => undefined);
    }
    async _updateResults() {
        if (this.state === SearchUIState.Idle) {
            return;
        }
        try {
            // Search result tree update
            const fileCount = this.viewModel.searchResult.fileCount();
            if (this._visibleMatches !== fileCount) {
                this._visibleMatches = fileCount;
                await this.refreshAndUpdateCount();
            }
        }
        finally {
            // show frequent progress and results by scheduling updates 80 ms after the last one
            this._refreshResultsScheduler.schedule();
        }
    }
    async expandIfSingularResult() {
        // expand if just 1 file with less than 50 matches
        const collapseResults = this.searchConfig.collapseResults;
        if (collapseResults !== 'alwaysCollapse' && this.viewModel.searchResult.matches().length === 1) {
            const onlyMatch = this.viewModel.searchResult.matches()[0];
            await this.tree.expandTo(onlyMatch);
            if (onlyMatch.count() < 50) {
                await this.tree.expand(onlyMatch);
            }
        }
    }
    async onSearchComplete(progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh = true) {
        this.state = SearchUIState.Idle;
        // Complete up to 100% as needed
        progressComplete();
        if (shouldDoFinalRefresh) {
            // anything that gets called from `getChildren` should not do this, since the tree will refresh anyways.
            await this.refreshAndUpdateCount();
        }
        const allResults = !this.viewModel.searchResult.isEmpty();
        const aiResults = this.searchResult.getCachedSearchComplete(true);
        if (completed?.exit === 1 /* SearchCompletionExitCode.NewSearchStarted */) {
            return;
        }
        // Special case for when we have an AI provider registered
        Constants.SearchContext.AIResultsRequested.bindTo(this.contextKeyService).set(this.shouldShowAIResults() && !!aiResults);
        if (this.shouldShowAIResults() && !allResults) {
            const messageEl = this.clearMessage();
            const noResultsMessage = nls.localize('noResultsFallback', "No results found. ");
            dom.append(messageEl, noResultsMessage);
            let aiName = 'Copilot';
            try {
                aiName = (await this.searchService.getAIName()) || aiName;
            }
            catch (e) {
                // ignore
            }
            if (aiName) {
                const searchWithAIButtonTooltip = appendKeyBindingLabel(nls.localize('triggerAISearch.tooltip', "Search with {0}", aiName), this.keybindingService.lookupKeybinding("search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */));
                const searchWithAIButtonText = nls.localize('searchWithAIButtonTooltip', "Search with {0}.", aiName);
                const searchWithAIButton = this.messageDisposables.add(new SearchLinkButton(searchWithAIButtonText, () => {
                    this.commandService.executeCommand("search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */);
                }, this.hoverService, searchWithAIButtonTooltip));
                dom.append(messageEl, searchWithAIButton.element);
            }
            if (!aiResults) {
                return;
            }
        }
        if (!allResults) {
            const hasExcludes = !!excludePatternText;
            const hasIncludes = !!includePatternText;
            let message;
            if (!completed) {
                message = SEARCH_CANCELLED_MESSAGE;
            }
            else if (this.inputPatternIncludes.onlySearchInOpenEditors()) {
                if (hasIncludes && hasExcludes) {
                    message = nls.localize('noOpenEditorResultsIncludesExcludes', "No results found in open editors matching '{0}' excluding '{1}' - ", includePatternText, excludePatternText);
                }
                else if (hasIncludes) {
                    message = nls.localize('noOpenEditorResultsIncludes', "No results found in open editors matching '{0}' - ", includePatternText);
                }
                else if (hasExcludes) {
                    message = nls.localize('noOpenEditorResultsExcludes', "No results found in open editors excluding '{0}' - ", excludePatternText);
                }
                else {
                    message = nls.localize('noOpenEditorResultsFound', "No results found in open editors. Review your settings for configured exclusions and check your gitignore files - ");
                }
            }
            else {
                if (hasIncludes && hasExcludes) {
                    message = nls.localize('noResultsIncludesExcludes', "No results found in '{0}' excluding '{1}' - ", includePatternText, excludePatternText);
                }
                else if (hasIncludes) {
                    message = nls.localize('noResultsIncludes', "No results found in '{0}' - ", includePatternText);
                }
                else if (hasExcludes) {
                    message = nls.localize('noResultsExcludes', "No results found excluding '{0}' - ", excludePatternText);
                }
                else {
                    message = nls.localize('noResultsFound', "No results found. Review your settings for configured exclusions and check your gitignore files - ");
                }
            }
            // Indicate as status to ARIA
            aria.status(message);
            const messageEl = this.clearMessage();
            dom.append(messageEl, message);
            if (!completed) {
                const searchAgainButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('rerunSearch.message', "Search again"), () => this.triggerQueryChange({ preserveFocus: false }), this.hoverService));
                dom.append(messageEl, searchAgainButton.element);
            }
            else if (hasIncludes || hasExcludes) {
                const searchAgainButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('rerunSearchInAll.message', "Search again in all files"), this.onSearchAgain.bind(this), this.hoverService));
                dom.append(messageEl, searchAgainButton.element);
            }
            else {
                const openSettingsButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openSettings.message', "Open Settings"), this.onOpenSettings.bind(this), this.hoverService));
                dom.append(messageEl, openSettingsButton.element);
            }
            if (completed) {
                dom.append(messageEl, $('span', undefined, ' - '));
                const learnMoreButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openSettings.learnMore', "Learn More"), this.onLearnMore.bind(this), this.hoverService));
                dom.append(messageEl, learnMoreButton.element);
            }
            if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                this.showSearchWithoutFolderMessage();
            }
            this.reLayout();
        }
        else {
            this.viewModel.searchResult.toggleHighlights(this.isVisible()); // show highlights
            // Indicate final search result count for ARIA
            aria.status(nls.localize('ariaSearchResultsStatus', "Search returned {0} results in {1} files", this.viewModel.searchResult.count(), this.viewModel.searchResult.fileCount()));
        }
        if (completed && completed.limitHit) {
            completed.messages.push({ type: TextSearchCompleteMessageType.Warning, text: nls.localize('searchMaxResultsWarning', "The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.") });
        }
        if (completed && completed.messages) {
            for (const message of completed.messages) {
                this.addMessage(message);
            }
        }
        this.reLayout();
    }
    async onSearchError(e, progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh = true) {
        this.state = SearchUIState.Idle;
        if (errors.isCancellationError(e)) {
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh);
        }
        else {
            progressComplete();
            this.searchWidget.searchInput?.showMessage({ content: e.message, type: 3 /* MessageType.ERROR */ });
            this.viewModel.searchResult.clear();
            return Promise.resolve();
        }
    }
    async addAIResults() {
        const excludePatternText = this._getExcludePattern();
        const includePatternText = this._getIncludePattern();
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 0 }, _progress => {
            return new Promise(resolve => progressComplete = resolve);
        });
        this.searchWidget.searchInput?.clearMessage();
        this.state = SearchUIState.Searching;
        this.showEmptyStage();
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._visibleMatches = 0;
        this.tree.setSelection([]);
        this.tree.setFocus([]);
        this.viewModel.replaceString = this.searchWidget.getReplaceValue();
        this.viewModel.searchResult.setAIQueryUsingTextQuery();
        const result = this.viewModel.addAIResults();
        return result.then((complete) => {
            clearTimeout(slowTimer);
            this.updateSearchResultCount(this.viewModel.searchResult.query?.userDisabledExcludesAndIgnoreFiles, this.viewModel.searchResult.query?.onlyOpenEditors, false);
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, complete, false);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, excludePatternText, includePatternText, undefined, false);
        });
    }
    doSearch(query, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch) {
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: triggeredOnType ? 300 : 0 }, _progress => {
            return new Promise(resolve => progressComplete = resolve);
        });
        this.searchWidget.searchInput?.clearMessage();
        this.state = SearchUIState.Searching;
        this.showEmptyStage();
        this.model.searchResult.aiTextSearchResult.hidden = !shouldKeepAIResults && !shouldUpdateAISearch;
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._visibleMatches = 0;
        this._refreshResultsScheduler.schedule();
        this.searchWidget.setReplaceAllActionState(false);
        this.tree.setSelection([]);
        this.tree.setFocus([]);
        this.viewModel.replaceString = this.searchWidget.getReplaceValue();
        const result = this.viewModel.search(query);
        if (!shouldKeepAIResults || shouldUpdateAISearch) {
            this.viewModel.searchResult.setAIQueryUsingTextQuery(query);
        }
        if (shouldUpdateAISearch) {
            this.tree.updateChildren(this.searchResult.aiTextSearchResult);
        }
        return result.asyncResults.then((complete) => {
            clearTimeout(slowTimer);
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, complete);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, excludePatternText, includePatternText);
        });
    }
    onOpenSettings(e) {
        dom.EventHelper.stop(e, false);
        this.openSettings('@id:files.exclude,search.exclude,search.useParentIgnoreFiles,search.useGlobalIgnoreFiles,search.useIgnoreFiles');
    }
    openSettings(query) {
        const options = { query };
        return this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ ?
            this.preferencesService.openWorkspaceSettings(options) :
            this.preferencesService.openUserSettings(options);
    }
    onLearnMore() {
        this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=853977'));
    }
    onSearchAgain() {
        this.inputPatternExcludes.setValue('');
        this.inputPatternIncludes.setValue('');
        this.inputPatternIncludes.setOnlySearchInOpenEditors(false);
        this.triggerQueryChange({ preserveFocus: false });
    }
    onEnableExcludes() {
        this.toggleQueryDetails(false, true);
        this.searchExcludePattern.setUseExcludesAndIgnoreFiles(true);
    }
    onDisableSearchInOpenEditors() {
        this.toggleQueryDetails(false, true);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(false);
    }
    updateSearchResultCount(disregardExcludesAndIgnores, onlyOpenEditors, clear = false) {
        const fileCount = this.viewModel.searchResult.fileCount();
        const resultCount = this.viewModel.searchResult.count();
        this.hasSearchResultsKey.set(fileCount > 0);
        const msgWasHidden = this.messagesElement.style.display === 'none';
        const messageEl = this.clearMessage();
        const resultMsg = clear ? '' : this.buildResultCountMessage(resultCount, fileCount);
        this.tree.ariaLabel = resultMsg + nls.localize('forTerm', " - Search: {0}", this.searchResult.query?.contentPattern.pattern ?? '');
        dom.append(messageEl, resultMsg);
        if (fileCount > 0) {
            if (disregardExcludesAndIgnores) {
                const excludesDisabledMessage = ' - ' + nls.localize('useIgnoresAndExcludesDisabled', "exclude settings and ignore files are disabled") + ' ';
                const enableExcludesButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('excludes.enable', "enable"), this.onEnableExcludes.bind(this), this.hoverService, nls.localize('useExcludesAndIgnoreFilesDescription', "Use Exclude Settings and Ignore Files")));
                dom.append(messageEl, $('span', undefined, excludesDisabledMessage, '(', enableExcludesButton.element, ')'));
            }
            if (onlyOpenEditors) {
                const searchingInOpenMessage = ' - ' + nls.localize('onlyOpenEditors', "searching only in open files") + ' ';
                const disableOpenEditorsButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openEditors.disable', "disable"), this.onDisableSearchInOpenEditors.bind(this), this.hoverService, nls.localize('disableOpenEditors', "Search in entire workspace")));
                dom.append(messageEl, $('span', undefined, searchingInOpenMessage, '(', disableOpenEditorsButton.element, ')'));
            }
            dom.append(messageEl, ' - ');
            const openInEditorTooltip = appendKeyBindingLabel(nls.localize('openInEditor.tooltip', "Copy current search results to an editor"), this.keybindingService.lookupKeybinding("search.action.openInEditor" /* Constants.SearchCommandIds.OpenInEditorCommandId */));
            const openInEditorButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openInEditor.message', "Open in editor"), () => this.instantiationService.invokeFunction(createEditorFromSearchResult, this.searchResult, this.searchIncludePattern.getValue(), this.searchExcludePattern.getValue(), this.searchIncludePattern.onlySearchInOpenEditors()), this.hoverService, openInEditorTooltip));
            dom.append(messageEl, openInEditorButton.element);
            this.reLayout();
        }
        else if (!msgWasHidden) {
            dom.hide(this.messagesElement);
        }
    }
    addMessage(message) {
        const messageBox = this.messagesElement.firstChild;
        if (!messageBox) {
            return;
        }
        dom.append(messageBox, renderSearchMessage(message, this.instantiationService, this.notificationService, this.openerService, this.commandService, this.messageDisposables, () => this.triggerQueryChange()));
    }
    buildResultCountMessage(resultCount, fileCount) {
        if (resultCount === 1 && fileCount === 1) {
            return nls.localize('search.file.result', "{0} result in {1} file", resultCount, fileCount);
        }
        else if (resultCount === 1) {
            return nls.localize('search.files.result', "{0} result in {1} files", resultCount, fileCount);
        }
        else if (fileCount === 1) {
            return nls.localize('search.file.results', "{0} results in {1} file", resultCount, fileCount);
        }
        else {
            return nls.localize('search.files.results', "{0} results in {1} files", resultCount, fileCount);
        }
    }
    showSearchWithoutFolderMessage() {
        this.searchWithoutFolderMessageElement = this.clearMessage();
        const textEl = dom.append(this.searchWithoutFolderMessageElement, $('p', undefined, nls.localize('searchWithoutFolder', "You have not opened or specified a folder. Only open files are currently searched - ")));
        const openFolderButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openFolder', "Open Folder"), () => {
            this.commandService.executeCommand(env.isMacintosh && env.isNative ? OpenFileFolderAction.ID : OpenFolderAction.ID).catch(err => errors.onUnexpectedError(err));
        }, this.hoverService));
        dom.append(textEl, openFolderButton.element);
    }
    showEmptyStage(forceHideMessages = false) {
        const showingCancelled = (this.messagesElement.firstChild?.textContent?.indexOf(SEARCH_CANCELLED_MESSAGE) ?? -1) > -1;
        // clean up ui
        // this.replaceService.disposeAllReplacePreviews();
        if (showingCancelled || forceHideMessages || !this.configurationService.getValue().search.searchOnType) {
            // when in search to type, don't preemptively hide, as it causes flickering and shifting of the live results
            dom.hide(this.messagesElement);
        }
        dom.show(this.resultsElement);
        this.currentSelectedFileMatch = undefined;
    }
    shouldOpenInNotebookEditor(match, uri) {
        // Untitled files will return a false positive for getContributedNotebookTypes.
        // Since untitled files are already open, then untitled notebooks should return NotebookMatch results.
        return isIMatchInNotebook(match) || (uri.scheme !== network.Schemas.untitled && this.notebookService.getContributedNotebookTypes(uri).length > 0);
    }
    onFocus(lineMatch, preserveFocus, sideBySide, pinned) {
        const useReplacePreview = this.configurationService.getValue().search.useReplacePreview;
        const resource = isSearchTreeMatch(lineMatch) ? lineMatch.parent().resource : lineMatch.resource;
        return (useReplacePreview && this.viewModel.isReplaceActive() && !!this.viewModel.replaceString && !(this.shouldOpenInNotebookEditor(lineMatch, resource))) ?
            this.replaceService.openReplacePreview(lineMatch, preserveFocus, sideBySide, pinned) :
            this.open(lineMatch, preserveFocus, sideBySide, pinned, resource);
    }
    async open(element, preserveFocus, sideBySide, pinned, resourceInput) {
        const selection = getEditorSelectionFromMatch(element, this.viewModel);
        const oldParentMatches = isSearchTreeMatch(element) ? element.parent().matches() : [];
        const resource = resourceInput ?? (isSearchTreeMatch(element) ? element.parent().resource : element.resource);
        let editor;
        const options = {
            preserveFocus,
            pinned,
            selection,
            revealIfVisible: true,
        };
        try {
            editor = await this.editorService.openEditor({
                resource: resource,
                options,
            }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
            const editorControl = editor?.getControl();
            if (isSearchTreeMatch(element) && preserveFocus && isCodeEditor(editorControl)) {
                this.viewModel.searchResult.getRangeHighlightDecorations().highlightRange(editorControl.getModel(), element.range());
            }
            else {
                this.viewModel.searchResult.getRangeHighlightDecorations().removeHighlightRange();
            }
        }
        catch (err) {
            errors.onUnexpectedError(err);
            return;
        }
        if (editor instanceof NotebookEditor) {
            const elemParent = element.parent();
            if (isSearchTreeMatch(element)) {
                if (isIMatchInNotebook(element)) {
                    element.parent().showMatch(element);
                }
                else {
                    const editorWidget = editor.getControl();
                    if (editorWidget) {
                        // Ensure that the editor widget is binded. If if is, then this should return immediately.
                        // Otherwise, it will bind the widget.
                        elemParent.bindNotebookEditorWidget(editorWidget);
                        await elemParent.updateMatchesForEditorWidget();
                        const matchIndex = oldParentMatches.findIndex(e => e.id() === element.id());
                        const matches = elemParent.matches();
                        const match = matchIndex >= matches.length ? matches[matches.length - 1] : matches[matchIndex];
                        if (isIMatchInNotebook(match)) {
                            elemParent.showMatch(match);
                            if (!this.tree.getFocus().includes(match) || !this.tree.getSelection().includes(match)) {
                                this.tree.setSelection([match], getSelectionKeyboardEvent());
                                this.tree.setFocus([match]);
                            }
                        }
                    }
                }
            }
        }
    }
    openEditorWithMultiCursor(element) {
        const resource = isSearchTreeMatch(element) ? element.parent().resource : element.resource;
        return this.editorService.openEditor({
            resource: resource,
            options: {
                preserveFocus: false,
                pinned: true,
                revealIfVisible: true
            }
        }).then(editor => {
            if (editor) {
                let fileMatch = null;
                if (isSearchTreeFileMatch(element)) {
                    fileMatch = element;
                }
                else if (isSearchTreeMatch(element)) {
                    fileMatch = element.parent();
                }
                if (fileMatch) {
                    const selections = fileMatch.matches().map(m => new Selection(m.range().startLineNumber, m.range().startColumn, m.range().endLineNumber, m.range().endColumn));
                    const codeEditor = getCodeEditor(editor.getControl());
                    if (codeEditor) {
                        const multiCursorController = MultiCursorSelectionController.get(codeEditor);
                        multiCursorController?.selectAllUsingSelections(selections);
                    }
                }
            }
            this.viewModel.searchResult.getRangeHighlightDecorations().removeHighlightRange();
        }, errors.onUnexpectedError);
    }
    onUntitledDidDispose(resource) {
        if (!this.viewModel) {
            return;
        }
        // remove search results from this resource as it got disposed
        let matches = this.viewModel.searchResult.matches();
        for (let i = 0, len = matches.length; i < len; i++) {
            if (resource.toString() === matches[i].resource.toString()) {
                this.viewModel.searchResult.remove(matches[i]);
            }
        }
        matches = this.viewModel.searchResult.matches(true);
        for (let i = 0, len = matches.length; i < len; i++) {
            if (resource.toString() === matches[i].resource.toString()) {
                this.viewModel.searchResult.remove(matches[i]);
            }
        }
    }
    onFilesChanged(e) {
        if (!this.viewModel || (this.searchConfig.sortOrder !== "modified" /* SearchSortOrder.Modified */ && !e.gotDeleted())) {
            return;
        }
        const matches = this.viewModel.searchResult.matches();
        if (e.gotDeleted()) {
            const deletedMatches = matches.filter(m => e.contains(m.resource, 2 /* FileChangeType.DELETED */));
            this.viewModel.searchResult.remove(deletedMatches);
        }
        else {
            // Check if the changed file contained matches
            const changedMatches = matches.filter(m => e.contains(m.resource));
            if (changedMatches.length && this.searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                // No matches need to be removed, but modified files need to have their file stat updated.
                this.updateFileStats(changedMatches).then(async () => this.refreshTreeController.queue());
            }
        }
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    clearHistory() {
        this.searchWidget.clearHistory();
        this.inputPatternExcludes.clearHistory();
        this.inputPatternIncludes.clearHistory();
    }
    saveState() {
        // This can be called before renderBody() method gets called for the first time
        // if we move the searchView inside another viewPaneContainer
        if (!this.searchWidget) {
            return;
        }
        const patternExcludes = this.inputPatternExcludes?.getValue().trim() ?? '';
        const patternIncludes = this.inputPatternIncludes?.getValue().trim() ?? '';
        const onlyOpenEditors = this.inputPatternIncludes?.onlySearchInOpenEditors() ?? false;
        const useExcludesAndIgnoreFiles = this.inputPatternExcludes?.useExcludesAndIgnoreFiles() ?? true;
        const preserveCase = this.viewModel.preserveCase;
        if (this.searchWidget.searchInput) {
            const isRegex = this.searchWidget.searchInput.getRegex();
            const isWholeWords = this.searchWidget.searchInput.getWholeWords();
            const isCaseSensitive = this.searchWidget.searchInput.getCaseSensitive();
            const contentPattern = this.searchWidget.searchInput.getValue();
            const isInNotebookCellInput = this.searchWidget.getNotebookFilters().codeInput;
            const isInNotebookCellOutput = this.searchWidget.getNotebookFilters().codeOutput;
            const isInNotebookMarkdownInput = this.searchWidget.getNotebookFilters().markupInput;
            const isInNotebookMarkdownPreview = this.searchWidget.getNotebookFilters().markupPreview;
            this.viewletState['query.contentPattern'] = contentPattern;
            this.viewletState['query.regex'] = isRegex;
            this.viewletState['query.wholeWords'] = isWholeWords;
            this.viewletState['query.caseSensitive'] = isCaseSensitive;
            this.viewletState['query.isInNotebookMarkdownInput'] = isInNotebookMarkdownInput;
            this.viewletState['query.isInNotebookMarkdownPreview'] = isInNotebookMarkdownPreview;
            this.viewletState['query.isInNotebookCellInput'] = isInNotebookCellInput;
            this.viewletState['query.isInNotebookCellOutput'] = isInNotebookCellOutput;
        }
        this.viewletState['query.folderExclusions'] = patternExcludes;
        this.viewletState['query.folderIncludes'] = patternIncludes;
        this.viewletState['query.useExcludesAndIgnoreFiles'] = useExcludesAndIgnoreFiles;
        this.viewletState['query.preserveCase'] = preserveCase;
        this.viewletState['query.onlyOpenEditors'] = onlyOpenEditors;
        const isReplaceShown = this.searchAndReplaceWidget.isReplaceShown();
        this.viewletState['view.showReplace'] = isReplaceShown;
        this.viewletState['view.treeLayout'] = this.isTreeLayoutViewVisible;
        this.viewletState['query.replaceText'] = isReplaceShown && this.searchWidget.getReplaceValue();
        this._saveSearchHistoryService();
        this.memento.saveMemento();
        super.saveState();
    }
    _saveSearchHistoryService() {
        if (this.searchWidget === undefined) {
            return;
        }
        const history = Object.create(null);
        const searchHistory = this.searchWidget.getSearchHistory();
        if (searchHistory && searchHistory.length) {
            history.search = searchHistory;
        }
        const replaceHistory = this.searchWidget.getReplaceHistory();
        if (replaceHistory && replaceHistory.length) {
            history.replace = replaceHistory;
        }
        const patternExcludesHistory = this.inputPatternExcludes.getHistory();
        if (patternExcludesHistory && patternExcludesHistory.length) {
            history.exclude = patternExcludesHistory;
        }
        const patternIncludesHistory = this.inputPatternIncludes.getHistory();
        if (patternIncludesHistory && patternIncludesHistory.length) {
            history.include = patternIncludesHistory;
        }
        this.searchHistoryService.save(history);
    }
    async updateFileStats(elements) {
        const files = elements.map(f => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    removeFileStats() {
        for (const fileMatch of this.searchResult.matches()) {
            fileMatch.fileStat = undefined;
        }
        for (const fileMatch of this.searchResult.matches(true)) {
            fileMatch.fileStat = undefined;
        }
    }
    dispose() {
        this.isDisposed = true;
        this.saveState();
        super.dispose();
    }
};
SearchView = SearchView_1 = __decorate([
    __param(1, IFileService),
    __param(2, IEditorService),
    __param(3, ICodeEditorService),
    __param(4, IProgressService),
    __param(5, INotificationService),
    __param(6, IDialogService),
    __param(7, ICommandService),
    __param(8, IContextViewService),
    __param(9, IInstantiationService),
    __param(10, IViewDescriptorService),
    __param(11, IConfigurationService),
    __param(12, IWorkspaceContextService),
    __param(13, ISearchViewModelWorkbenchService),
    __param(14, IContextKeyService),
    __param(15, IReplaceService),
    __param(16, ITextFileService),
    __param(17, IPreferencesService),
    __param(18, IThemeService),
    __param(19, ISearchHistoryService),
    __param(20, IContextMenuService),
    __param(21, IAccessibilityService),
    __param(22, IKeybindingService),
    __param(23, IStorageService),
    __param(24, ISearchService),
    __param(25, IOpenerService),
    __param(26, IHoverService),
    __param(27, INotebookService),
    __param(28, ILogService),
    __param(29, IAccessibilitySignalService)
], SearchView);
export { SearchView };
class SearchLinkButton extends Disposable {
    constructor(label, handler, hoverService, tooltip) {
        super();
        this.element = $('a.pointer', { tabindex: 0 }, label);
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, tooltip));
        this.addEventHandlers(handler);
    }
    addEventHandlers(handler) {
        const wrappedHandler = (e) => {
            dom.EventHelper.stop(e, false);
            handler(e);
        };
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, wrappedHandler));
        this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                wrappedHandler(e);
                event.preventDefault();
                event.stopPropagation();
            }
        }));
    }
}
export function getEditorSelectionFromMatch(element, viewModel) {
    let match = null;
    if (isSearchTreeMatch(element)) {
        match = element;
    }
    if (isSearchTreeFileMatch(element) && element.count() > 0) {
        match = element.matches()[element.matches().length - 1];
    }
    if (match) {
        const range = match.range();
        if (viewModel.isReplaceActive() && !!viewModel.replaceString) {
            const replaceString = match.replaceString;
            return {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.startLineNumber,
                endColumn: range.startColumn + replaceString.length
            };
        }
        return range;
    }
    return undefined;
}
export function getSelectionTextFromEditor(allowUnselectedWord, activeEditor) {
    let editor = activeEditor;
    if (isDiffEditor(editor)) {
        if (editor.getOriginalEditor().hasTextFocus()) {
            editor = editor.getOriginalEditor();
        }
        else {
            editor = editor.getModifiedEditor();
        }
    }
    if (!isCodeEditor(editor) || !editor.hasModel()) {
        return null;
    }
    const range = editor.getSelection();
    if (!range) {
        return null;
    }
    if (range.isEmpty()) {
        if (allowUnselectedWord) {
            const wordAtPosition = editor.getModel().getWordAtPosition(range.getStartPosition());
            return wordAtPosition?.word ?? null;
        }
        else {
            return null;
        }
    }
    let searchText = '';
    for (let i = range.startLineNumber; i <= range.endLineNumber; i++) {
        let lineText = editor.getModel().getLineContent(i);
        if (i === range.endLineNumber) {
            lineText = lineText.substring(0, range.endColumn - 1);
        }
        if (i === range.startLineNumber) {
            lineText = lineText.substring(range.startColumn - 1);
        }
        if (i !== range.startLineNumber) {
            lineText = '\n' + lineText;
        }
        searchText += lineText;
    }
    return searchText;
}
let SearchViewDataSource = class SearchViewDataSource {
    constructor(searchView, configurationService) {
        this.searchView = searchView;
        this.configurationService = configurationService;
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    createSearchResultIterator(searchResult) {
        const ret = [];
        if (this.searchView.shouldShowAIResults() && searchResult.searchModel.hasPlainResults && !searchResult.aiTextSearchResult.hidden) {
            // as long as there is a query present, we can load AI results
            ret.push(searchResult.aiTextSearchResult);
        }
        if (!searchResult.plainTextSearchResult.isEmpty()) {
            if (!this.searchView.shouldShowAIResults() || searchResult.aiTextSearchResult.hidden) {
                // only one root, so just return the children
                return this.createTextSearchResultIterator(searchResult.plainTextSearchResult);
            }
            ret.push(searchResult.plainTextSearchResult);
        }
        return ret;
    }
    createTextSearchResultIterator(textSearchResult) {
        const folderMatches = textSearchResult.folderMatches()
            .filter(fm => !fm.isEmpty())
            .sort(searchMatchComparer);
        if (folderMatches.length === 1) {
            return this.createFolderIterator(folderMatches[0]);
        }
        return folderMatches;
    }
    createFolderIterator(folderMatch) {
        const matchArray = this.searchView.isTreeLayoutViewVisible ? folderMatch.matches() : folderMatch.allDownstreamFileMatches();
        let matches = matchArray;
        if (!(folderMatch instanceof AIFolderMatchWorkspaceRootImpl)) {
            matches = matchArray.sort((a, b) => searchMatchComparer(a, b, this.searchConfig.sortOrder));
        }
        return matches;
    }
    createFileIterator(fileMatch) {
        const matches = fileMatch.matches().sort(searchMatchComparer);
        return matches;
    }
    hasChildren(element) {
        if (isSearchTreeMatch(element)) {
            return false;
        }
        if (isTextSearchHeading(element) && element.isAIContributed) {
            return true;
        }
        const hasChildren = element.hasChildren;
        return hasChildren;
    }
    getChildren(element) {
        if (isSearchResult(element)) {
            return this.createSearchResultIterator(element);
        }
        else if (isTextSearchHeading(element)) {
            if (element.isAIContributed && !this.searchView.model.hasAIResults) {
                return this.searchView.addAIResults().then(() => this.createTextSearchResultIterator(element));
            }
            return this.createTextSearchResultIterator(element);
        }
        else if (isSearchTreeFolderMatch(element)) {
            return this.createFolderIterator(element);
        }
        else if (isSearchTreeFileMatch(element)) {
            return this.createFileIterator(element);
        }
        return [];
    }
    getParent(element) {
        const parent = element.parent();
        if (isSearchResult(parent)) {
            throw new Error('Invalid element passed to getParent');
        }
        return parent;
    }
};
SearchViewDataSource = __decorate([
    __param(1, IConfigurationService)
], SearchViewDataSource);
let RefreshTreeController = class RefreshTreeController extends Disposable {
    constructor(searchView, geSearchConfig, fileService) {
        super();
        this.searchView = searchView;
        this.geSearchConfig = geSearchConfig;
        this.fileService = fileService;
        this.queuedIChangeEvents = [];
        this.refreshTreeThrottler = this._register(new Throttler());
    }
    async queue(e) {
        if (e) {
            this.queuedIChangeEvents.push(e);
        }
        return this.refreshTreeThrottler.queue(this.refreshTreeUsingQueue.bind(this));
    }
    async refreshTreeUsingQueue() {
        const aggregateChangeEvent = this.queuedIChangeEvents.length === 0 ? undefined : {
            elements: this.queuedIChangeEvents.map(e => e.elements).flat(),
            added: this.queuedIChangeEvents.some(e => e.added),
            removed: this.queuedIChangeEvents.some(e => e.removed),
            clearingAll: this.queuedIChangeEvents.some(e => e.clearingAll),
        };
        this.queuedIChangeEvents = [];
        return this.refreshTree(aggregateChangeEvent);
    }
    async retrieveFileStats() {
        const files = this.searchView.model.searchResult.matches().filter(f => !f.fileStat).map(f => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    async refreshTree(event) {
        const searchConfig = this.geSearchConfig();
        if (!event || event.added || event.removed) {
            // Refresh whole tree
            if (searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                // Ensure all matches have retrieved their file stat
                await this.retrieveFileStats()
                    .then(() => this.searchView.getControl().updateChildren(undefined));
            }
            else {
                await this.searchView.getControl().updateChildren(undefined);
            }
        }
        else {
            // If updated counts affect our search order, re-sort the view.
            if (searchConfig.sortOrder === "countAscending" /* SearchSortOrder.CountAscending */ ||
                searchConfig.sortOrder === "countDescending" /* SearchSortOrder.CountDescending */) {
                await this.searchView.getControl().updateChildren(undefined);
            }
            else {
                const treeHasAllElements = event.elements.every(elem => this.searchView.getControl().hasNode(elem));
                if (treeHasAllElements) {
                    // IFileMatchInstance modified, refresh those elements
                    await Promise.all(event.elements.map(async (element) => {
                        await this.searchView.getControl().updateChildren(element);
                        this.searchView.getControl().rerender(element);
                    }));
                }
                else {
                    this.searchView.getControl().updateChildren(undefined);
                }
            }
        }
    }
};
RefreshTreeController = __decorate([
    __param(2, IFileService)
], RefreshTreeController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQztBQUdqRSxPQUFPLEVBQTJDLDhCQUE4QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkksT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RixPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx3QkFB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
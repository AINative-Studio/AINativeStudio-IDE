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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFHakUsT0FBTyxFQUEyQyw4QkFBOEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25JLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEYsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsd0JB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
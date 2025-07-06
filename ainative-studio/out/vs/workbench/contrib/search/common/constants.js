/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var SearchCommandIds;
(function (SearchCommandIds) {
    SearchCommandIds["FindInFilesActionId"] = "workbench.action.findInFiles";
    SearchCommandIds["FocusActiveEditorCommandId"] = "search.action.focusActiveEditor";
    SearchCommandIds["FocusSearchFromResults"] = "search.action.focusSearchFromResults";
    SearchCommandIds["OpenMatch"] = "search.action.openResult";
    SearchCommandIds["OpenMatchToSide"] = "search.action.openResultToSide";
    SearchCommandIds["RemoveActionId"] = "search.action.remove";
    SearchCommandIds["CopyPathCommandId"] = "search.action.copyPath";
    SearchCommandIds["CopyMatchCommandId"] = "search.action.copyMatch";
    SearchCommandIds["CopyAllCommandId"] = "search.action.copyAll";
    SearchCommandIds["OpenInEditorCommandId"] = "search.action.openInEditor";
    SearchCommandIds["ClearSearchHistoryCommandId"] = "search.action.clearHistory";
    SearchCommandIds["FocusSearchListCommandID"] = "search.action.focusSearchList";
    SearchCommandIds["ReplaceActionId"] = "search.action.replace";
    SearchCommandIds["ReplaceAllInFileActionId"] = "search.action.replaceAllInFile";
    SearchCommandIds["ReplaceAllInFolderActionId"] = "search.action.replaceAllInFolder";
    SearchCommandIds["CloseReplaceWidgetActionId"] = "closeReplaceInFilesWidget";
    SearchCommandIds["ToggleCaseSensitiveCommandId"] = "toggleSearchCaseSensitive";
    SearchCommandIds["ToggleWholeWordCommandId"] = "toggleSearchWholeWord";
    SearchCommandIds["ToggleRegexCommandId"] = "toggleSearchRegex";
    SearchCommandIds["TogglePreserveCaseId"] = "toggleSearchPreserveCase";
    SearchCommandIds["AddCursorsAtSearchResults"] = "addCursorsAtSearchResults";
    SearchCommandIds["RevealInSideBarForSearchResults"] = "search.action.revealInSideBar";
    SearchCommandIds["ReplaceInFilesActionId"] = "workbench.action.replaceInFiles";
    SearchCommandIds["ShowAllSymbolsActionId"] = "workbench.action.showAllSymbols";
    SearchCommandIds["QuickTextSearchActionId"] = "workbench.action.quickTextSearch";
    SearchCommandIds["CancelSearchActionId"] = "search.action.cancel";
    SearchCommandIds["RefreshSearchResultsActionId"] = "search.action.refreshSearchResults";
    SearchCommandIds["FocusNextSearchResultActionId"] = "search.action.focusNextSearchResult";
    SearchCommandIds["FocusPreviousSearchResultActionId"] = "search.action.focusPreviousSearchResult";
    SearchCommandIds["ToggleSearchOnTypeActionId"] = "workbench.action.toggleSearchOnType";
    SearchCommandIds["CollapseSearchResultsActionId"] = "search.action.collapseSearchResults";
    SearchCommandIds["ExpandSearchResultsActionId"] = "search.action.expandSearchResults";
    SearchCommandIds["ExpandRecursivelyCommandId"] = "search.action.expandRecursively";
    SearchCommandIds["ClearSearchResultsActionId"] = "search.action.clearSearchResults";
    SearchCommandIds["GetSearchResultsActionId"] = "search.action.getSearchResults";
    SearchCommandIds["ViewAsTreeActionId"] = "search.action.viewAsTree";
    SearchCommandIds["ViewAsListActionId"] = "search.action.viewAsList";
    SearchCommandIds["ShowAIResultsActionId"] = "search.action.showAIResults";
    SearchCommandIds["HideAIResultsActionId"] = "search.action.hideAIResults";
    SearchCommandIds["SearchWithAIActionId"] = "search.action.searchWithAI";
    SearchCommandIds["ToggleQueryDetailsActionId"] = "workbench.action.search.toggleQueryDetails";
    SearchCommandIds["ExcludeFolderFromSearchId"] = "search.action.excludeFromSearch";
    SearchCommandIds["FocusNextInputActionId"] = "search.focus.nextInputBox";
    SearchCommandIds["FocusPreviousInputActionId"] = "search.focus.previousInputBox";
    SearchCommandIds["RestrictSearchToFolderId"] = "search.action.restrictSearchToFolder";
    SearchCommandIds["FindInFolderId"] = "filesExplorer.findInFolder";
    SearchCommandIds["FindInWorkspaceId"] = "filesExplorer.findInWorkspace";
})(SearchCommandIds || (SearchCommandIds = {}));
export const SearchContext = {
    SearchViewVisibleKey: new RawContextKey('searchViewletVisible', true),
    SearchViewFocusedKey: new RawContextKey('searchViewletFocus', false),
    SearchResultListFocusedKey: new RawContextKey('searchResultListFocused', true),
    InputBoxFocusedKey: new RawContextKey('inputBoxFocus', false),
    SearchInputBoxFocusedKey: new RawContextKey('searchInputBoxFocus', false),
    ReplaceInputBoxFocusedKey: new RawContextKey('replaceInputBoxFocus', false),
    PatternIncludesFocusedKey: new RawContextKey('patternIncludesInputBoxFocus', false),
    PatternExcludesFocusedKey: new RawContextKey('patternExcludesInputBoxFocus', false),
    ReplaceActiveKey: new RawContextKey('replaceActive', false),
    HasSearchResults: new RawContextKey('hasSearchResult', false),
    FirstMatchFocusKey: new RawContextKey('firstMatchFocus', false),
    FileMatchOrMatchFocusKey: new RawContextKey('fileMatchOrMatchFocus', false), // This is actually, Match or File or Folder
    FileMatchOrFolderMatchFocusKey: new RawContextKey('fileMatchOrFolderMatchFocus', false),
    FileMatchOrFolderMatchWithResourceFocusKey: new RawContextKey('fileMatchOrFolderMatchWithResourceFocus', false), // Excludes "Other files"
    FileFocusKey: new RawContextKey('fileMatchFocus', false),
    FolderFocusKey: new RawContextKey('folderMatchFocus', false),
    ResourceFolderFocusKey: new RawContextKey('folderMatchWithResourceFocus', false),
    IsEditableItemKey: new RawContextKey('isEditableItem', true),
    MatchFocusKey: new RawContextKey('matchFocus', false),
    SearchResultHeaderFocused: new RawContextKey('searchResultHeaderFocused', false),
    ViewHasSearchPatternKey: new RawContextKey('viewHasSearchPattern', false),
    ViewHasReplacePatternKey: new RawContextKey('viewHasReplacePattern', false),
    ViewHasFilePatternKey: new RawContextKey('viewHasFilePattern', false),
    ViewHasSomeCollapsibleKey: new RawContextKey('viewHasSomeCollapsibleResult', false),
    InTreeViewKey: new RawContextKey('inTreeView', false),
    hasAIResultProvider: new RawContextKey('hasAIResultProviderKey', false),
    AIResultsTitle: new RawContextKey('aiResultsTitle', false),
    AIResultsRequested: new RawContextKey('aiResultsRequested', false),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvY29tbW9uL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckYsTUFBTSxDQUFOLElBQWtCLGdCQWdEakI7QUFoREQsV0FBa0IsZ0JBQWdCO0lBQ2pDLHdFQUFvRCxDQUFBO0lBQ3BELGtGQUE4RCxDQUFBO0lBQzlELG1GQUErRCxDQUFBO0lBQy9ELDBEQUFzQyxDQUFBO0lBQ3RDLHNFQUFrRCxDQUFBO0lBQ2xELDJEQUF1QyxDQUFBO0lBQ3ZDLGdFQUE0QyxDQUFBO0lBQzVDLGtFQUE4QyxDQUFBO0lBQzlDLDhEQUEwQyxDQUFBO0lBQzFDLHdFQUFvRCxDQUFBO0lBQ3BELDhFQUEwRCxDQUFBO0lBQzFELDhFQUEwRCxDQUFBO0lBQzFELDZEQUF5QyxDQUFBO0lBQ3pDLCtFQUEyRCxDQUFBO0lBQzNELG1GQUErRCxDQUFBO0lBQy9ELDRFQUF3RCxDQUFBO0lBQ3hELDhFQUEwRCxDQUFBO0lBQzFELHNFQUFrRCxDQUFBO0lBQ2xELDhEQUEwQyxDQUFBO0lBQzFDLHFFQUFpRCxDQUFBO0lBQ2pELDJFQUF1RCxDQUFBO0lBQ3ZELHFGQUFpRSxDQUFBO0lBQ2pFLDhFQUEwRCxDQUFBO0lBQzFELDhFQUEwRCxDQUFBO0lBQzFELGdGQUE0RCxDQUFBO0lBQzVELGlFQUE2QyxDQUFBO0lBQzdDLHVGQUFtRSxDQUFBO0lBQ25FLHlGQUFxRSxDQUFBO0lBQ3JFLGlHQUE2RSxDQUFBO0lBQzdFLHNGQUFrRSxDQUFBO0lBQ2xFLHlGQUFxRSxDQUFBO0lBQ3JFLHFGQUFpRSxDQUFBO0lBQ2pFLGtGQUE4RCxD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
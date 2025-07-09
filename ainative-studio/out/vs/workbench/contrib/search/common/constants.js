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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9jb21tb24vY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRixNQUFNLENBQU4sSUFBa0IsZ0JBZ0RqQjtBQWhERCxXQUFrQixnQkFBZ0I7SUFDakMsd0VBQW9ELENBQUE7SUFDcEQsa0ZBQThELENBQUE7SUFDOUQsbUZBQStELENBQUE7SUFDL0QsMERBQXNDLENBQUE7SUFDdEMsc0VBQWtELENBQUE7SUFDbEQsMkRBQXVDLENBQUE7SUFDdkMsZ0VBQTRDLENBQUE7SUFDNUMsa0VBQThDLENBQUE7SUFDOUMsOERBQTBDLENBQUE7SUFDMUMsd0VBQW9ELENBQUE7SUFDcEQsOEVBQTBELENBQUE7SUFDMUQsOEVBQTBELENBQUE7SUFDMUQsNkRBQXlDLENBQUE7SUFDekMsK0VBQTJELENBQUE7SUFDM0QsbUZBQStELENBQUE7SUFDL0QsNEVBQXdELENBQUE7SUFDeEQsOEVBQTBELENBQUE7SUFDMUQsc0VBQWtELENBQUE7SUFDbEQsOERBQTBDLENBQUE7SUFDMUMscUVBQWlELENBQUE7SUFDakQsMkVBQXVELENBQUE7SUFDdkQscUZBQWlFLENBQUE7SUFDakUsOEVBQTBELENBQUE7SUFDMUQsOEVBQTBELENBQUE7SUFDMUQsZ0ZBQTRELENBQUE7SUFDNUQsaUVBQTZDLENBQUE7SUFDN0MsdUZBQW1FLENBQUE7SUFDbkUseUZBQXFFLENBQUE7SUFDckUsaUdBQTZFLENBQUE7SUFDN0Usc0ZBQWtFLENBQUE7SUFDbEUseUZBQXFFLENBQUE7SUFDckUscUZBQWlFLENBQUE7SUFDakUsa0ZBQThELENBQUE7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
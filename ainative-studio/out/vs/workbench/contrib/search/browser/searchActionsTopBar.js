/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { WorkbenchListFocusContextKey } from '../../../../platform/list/browser/listService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { searchClearIcon, searchCollapseAllIcon, searchExpandAllIcon, searchRefreshIcon, searchShowAsList, searchShowAsTree, searchStopIcon } from './searchIcons.js';
import * as Constants from '../common/constants.js';
import { ISearchHistoryService } from '../common/searchHistoryService.js';
import { VIEW_ID } from '../../../services/search/common/search.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SearchStateKey, SearchUIState } from '../common/search.js';
import { category, getSearchView } from './searchActionsBase.js';
import { isSearchTreeMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchNoRoot, isSearchTreeFolderMatchWorkspaceRoot, isSearchResult, isTextSearchHeading, isSearchTreeFileMatch } from './searchTreeModel/searchTreeCommon.js';
//#region Actions
registerAction2(class ClearSearchHistoryCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.clearHistory" /* Constants.SearchCommandIds.ClearSearchHistoryCommandId */,
            title: nls.localize2('clearSearchHistoryLabel', "Clear Search History"),
            category,
            f1: true
        });
    }
    async run(accessor) {
        clearHistoryCommand(accessor);
    }
});
registerAction2(class CancelSearchAction extends Action2 {
    constructor() {
        super({
            id: "search.action.cancel" /* Constants.SearchCommandIds.CancelSearchActionId */,
            title: nls.localize2('CancelSearchAction.label', "Cancel Search"),
            icon: searchStopIcon,
            category,
            f1: true,
            precondition: SearchStateKey.isEqualTo(SearchUIState.Idle).negate(),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, WorkbenchListFocusContextKey),
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), SearchStateKey.isEqualTo(SearchUIState.SlowSearch)),
                }]
        });
    }
    run(accessor) {
        return cancelSearch(accessor);
    }
});
registerAction2(class RefreshAction extends Action2 {
    constructor() {
        super({
            id: "search.action.refreshSearchResults" /* Constants.SearchCommandIds.RefreshSearchResultsActionId */,
            title: nls.localize2('RefreshAction.label', "Refresh"),
            icon: searchRefreshIcon,
            precondition: Constants.SearchContext.ViewHasSearchPatternKey,
            category,
            f1: true,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), SearchStateKey.isEqualTo(SearchUIState.SlowSearch).negate()),
                }]
        });
    }
    run(accessor, ...args) {
        return refreshSearch(accessor);
    }
});
registerAction2(class CollapseDeepestExpandedLevelAction extends Action2 {
    constructor() {
        super({
            id: "search.action.collapseSearchResults" /* Constants.SearchCommandIds.CollapseSearchResultsActionId */,
            title: nls.localize2('CollapseDeepestExpandedLevelAction.label', "Collapse All"),
            category,
            icon: searchCollapseAllIcon,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSomeCollapsibleKey),
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), ContextKeyExpr.or(Constants.SearchContext.HasSearchResults.negate(), Constants.SearchContext.ViewHasSomeCollapsibleKey)),
                }]
        });
    }
    run(accessor, ...args) {
        return collapseDeepestExpandedLevel(accessor);
    }
});
registerAction2(class ExpandAllAction extends Action2 {
    constructor() {
        super({
            id: "search.action.expandSearchResults" /* Constants.SearchCommandIds.ExpandSearchResultsActionId */,
            title: nls.localize2('ExpandAllAction.label', "Expand All"),
            category,
            icon: searchExpandAllIcon,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSomeCollapsibleKey.toNegated()),
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSomeCollapsibleKey.toNegated()),
                }]
        });
    }
    async run(accessor, ...args) {
        return expandAll(accessor);
    }
});
registerAction2(class ClearSearchResultsAction extends Action2 {
    constructor() {
        super({
            id: "search.action.clearSearchResults" /* Constants.SearchCommandIds.ClearSearchResultsActionId */,
            title: nls.localize2('ClearSearchResultsAction.label', "Clear Search Results"),
            category,
            icon: searchClearIcon,
            f1: true,
            precondition: ContextKeyExpr.or(Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSearchPatternKey, Constants.SearchContext.ViewHasReplacePatternKey, Constants.SearchContext.ViewHasFilePatternKey),
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 1,
                    when: ContextKeyExpr.equals('view', VIEW_ID),
                }]
        });
    }
    run(accessor, ...args) {
        return clearSearchResults(accessor);
    }
});
registerAction2(class ViewAsTreeAction extends Action2 {
    constructor() {
        super({
            id: "search.action.viewAsTree" /* Constants.SearchCommandIds.ViewAsTreeActionId */,
            title: nls.localize2('ViewAsTreeAction.label', "View as Tree"),
            category,
            icon: searchShowAsList,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.InTreeViewKey.toNegated()),
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), Constants.SearchContext.InTreeViewKey.toNegated()),
                }]
        });
    }
    async run(accessor, ...args) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            await searchView.setTreeView(true);
        }
    }
});
registerAction2(class ViewAsListAction extends Action2 {
    constructor() {
        super({
            id: "search.action.viewAsList" /* Constants.SearchCommandIds.ViewAsListActionId */,
            title: nls.localize2('ViewAsListAction.label', "View as List"),
            category,
            icon: searchShowAsTree,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.InTreeViewKey),
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), Constants.SearchContext.InTreeViewKey),
                }]
        });
    }
    async run(accessor, ...args) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            await searchView.setTreeView(false);
        }
    }
});
registerAction2(class SearchWithAIAction extends Action2 {
    constructor() {
        super({
            id: "search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */,
            title: nls.localize2('SearchWithAIAction.label', "Search with AI"),
            category,
            f1: true,
            precondition: Constants.SearchContext.hasAIResultProvider,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.hasAIResultProvider, Constants.SearchContext.SearchViewFocusedKey),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            }
        });
    }
    async run(accessor, ...args) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            const viewer = searchView.getControl();
            searchView.model.searchResult.aiTextSearchResult.hidden = false;
            searchView.model.cancelAISearch(true);
            searchView.model.clearAiSearchResults();
            await searchView.queueRefreshTree();
            await forcedExpandRecursively(viewer, searchView.model.searchResult.aiTextSearchResult);
        }
    }
});
//#endregion
//#region Helpers
const clearHistoryCommand = accessor => {
    const searchHistoryService = accessor.get(ISearchHistoryService);
    searchHistoryService.clearHistory();
};
async function expandAll(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const viewer = searchView.getControl();
        if (searchView.shouldShowAIResults()) {
            if (searchView.model.hasAIResults) {
                await forcedExpandRecursively(viewer, undefined);
            }
            else {
                await forcedExpandRecursively(viewer, searchView.model.searchResult.plainTextSearchResult);
            }
        }
        else {
            await forcedExpandRecursively(viewer, undefined);
        }
    }
}
/**
 * Recursively expand all nodes in the search results tree that are a child of `element`
 * If `element` is not provided, it is the root node.
 */
export async function forcedExpandRecursively(viewer, element) {
    if (element) {
        if (!viewer.hasNode(element)) {
            return;
        }
        await viewer.expand(element, true);
    }
    const children = viewer.getNode(element)?.children;
    if (children) {
        for (const child of children) {
            if (isSearchResult(child.element)) {
                throw Error('SearchResult should not be a child of a RenderableMatch');
            }
            forcedExpandRecursively(viewer, child.element);
        }
    }
}
function clearSearchResults(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    searchView?.clearSearchResults();
}
function cancelSearch(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    searchView?.cancelSearch();
}
function refreshSearch(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    searchView?.triggerQueryChange({ preserveFocus: false, shouldUpdateAISearch: !searchView.model.searchResult.aiTextSearchResult.hidden });
}
function collapseDeepestExpandedLevel(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const viewer = searchView.getControl();
        /**
         * one level to collapse so collapse everything. If FolderMatch, check if there are visible grandchildren,
         * i.e. if Matches are returned by the navigator, and if so, collapse to them, otherwise collapse all levels.
         */
        const navigator = viewer.navigate();
        let node = navigator.first();
        let canCollapseFileMatchLevel = false;
        let canCollapseFirstLevel = false;
        do {
            node = navigator.next();
        } while (isTextSearchHeading(node));
        // go to the first non-TextSearchResult node
        if (isSearchTreeFolderMatchWorkspaceRoot(node) || searchView.isTreeLayoutViewVisible) {
            while (node = navigator.next()) {
                if (isTextSearchHeading(node)) {
                    continue;
                }
                if (isSearchTreeMatch(node)) {
                    canCollapseFileMatchLevel = true;
                    break;
                }
                if (searchView.isTreeLayoutViewVisible && !canCollapseFirstLevel) {
                    let nodeToTest = node;
                    if (isSearchTreeFolderMatch(node)) {
                        const compressionStartNode = viewer.getCompressedTreeNode(node)?.elements[0].element;
                        // Match elements should never be compressed, so `!(compressionStartNode instanceof Match)` should always be true here. Same with `!(compressionStartNode instanceof TextSearchResult)`
                        nodeToTest = compressionStartNode && !(isSearchTreeMatch(compressionStartNode)) && !isTextSearchHeading(compressionStartNode) && !(isSearchResult(compressionStartNode)) ? compressionStartNode : node;
                    }
                    const immediateParent = nodeToTest.parent();
                    if (!(isTextSearchHeading(immediateParent) || isSearchTreeFolderMatchWorkspaceRoot(immediateParent) || isSearchTreeFolderMatchNoRoot(immediateParent) || isSearchResult(immediateParent))) {
                        canCollapseFirstLevel = true;
                    }
                }
            }
        }
        if (canCollapseFileMatchLevel) {
            node = navigator.first();
            do {
                if (isSearchTreeFileMatch(node)) {
                    viewer.collapse(node);
                }
            } while (node = navigator.next());
        }
        else if (canCollapseFirstLevel) {
            node = navigator.first();
            if (node) {
                do {
                    let nodeToTest = node;
                    if (isSearchTreeFolderMatch(node)) {
                        const compressionStartNode = viewer.getCompressedTreeNode(node)?.elements[0].element;
                        // Match elements should never be compressed, so !(compressionStartNode instanceof Match) should always be true here
                        nodeToTest = (compressionStartNode && !(isSearchTreeMatch(compressionStartNode)) && !(isSearchResult(compressionStartNode)) ? compressionStartNode : node);
                    }
                    const immediateParent = nodeToTest.parent();
                    if (isSearchTreeFolderMatchWorkspaceRoot(immediateParent) || isSearchTreeFolderMatchNoRoot(immediateParent)) {
                        if (viewer.hasNode(node)) {
                            viewer.collapse(node, true);
                        }
                        else {
                            viewer.collapseAll();
                        }
                    }
                } while (node = navigator.next());
            }
        }
        else if (isTextSearchHeading(navigator.first())) {
            // if AI results are visible, just collapse everything under the TextSearchResult.
            node = navigator.first();
            do {
                if (!node) {
                    break;
                }
                if (isTextSearchHeading(viewer.getParentElement(node))) {
                    viewer.collapse(node);
                }
            } while (node = navigator.next());
        }
        else {
            viewer.collapseAll();
        }
        const firstFocusParent = viewer.getFocus()[0]?.parent();
        if (firstFocusParent && (isSearchTreeFolderMatch(firstFocusParent) || isSearchTreeFileMatch(firstFocusParent)) &&
            viewer.hasNode(firstFocusParent) && viewer.isCollapsed(firstFocusParent)) {
            viewer.domFocus();
            viewer.focusFirst();
            viewer.setSelection(viewer.getFocus());
        }
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1RvcEJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hBY3Rpb25zVG9wQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFHMUMsT0FBTyxFQUFzQyw0QkFBNEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3RLLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUdsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFrQyx1QkFBdUIsRUFBRSw2QkFBNkIsRUFBRSxvQ0FBb0MsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVwUSxpQkFBaUI7QUFDakIsZUFBZSxDQUFDLE1BQU0sK0JBQWdDLFNBQVEsT0FBTztJQUVwRTtRQUVDLEtBQUssQ0FBQztZQUNMLEVBQUUsMkZBQXdEO1lBQzFELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDO1lBQ3ZFLFFBQVE7WUFDUixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUVKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQzVDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9CLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsTUFBTSxrQkFBbUIsU0FBUSxPQUFPO0lBQ3ZEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSw4RUFBaUQ7WUFDbkQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsZUFBZSxDQUFDO1lBQ2pFLElBQUksRUFBRSxjQUFjO1lBQ3BCLFFBQVE7WUFDUixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDbkUsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUFFLDRCQUE0QixDQUFDO2dCQUNwRyxPQUFPLHdCQUFnQjthQUN2QjtZQUNELElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztvQkFDcEIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2lCQUNwSCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMvQixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0sYUFBYyxTQUFRLE9BQU87SUFDbEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLG9HQUF5RDtZQUMzRCxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLENBQUM7WUFDdEQsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixZQUFZLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyx1QkFBdUI7WUFDN0QsUUFBUTtZQUNSLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO29CQUNwQixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7aUJBQzdILENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzdDLE9BQU8sYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsTUFBTSxrQ0FBbUMsU0FBUSxPQUFPO0lBQ3ZFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxzR0FBMEQ7WUFDNUQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsMENBQTBDLEVBQUUsY0FBYyxDQUFDO1lBQ2hGLFFBQVE7WUFDUixJQUFJLEVBQUUscUJBQXFCO1lBQzNCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLHlCQUF5QixDQUFDO1lBQzdILElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztvQkFDcEIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLEtBQUssRUFBRSxDQUFDO29CQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLHlCQUF5QixDQUFDLENBQUM7aUJBQ3pMLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzdDLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLGVBQWdCLFNBQVEsT0FBTztJQUNwRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsa0dBQXdEO1lBQzFELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLFlBQVksQ0FBQztZQUMzRCxRQUFRO1lBQ1IsSUFBSSxFQUFFLG1CQUFtQjtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN6SSxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7b0JBQ3BCLEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMseUJBQXlCLENBQUMsU0FBUyxFQUFFLENBQUM7aUJBQ3pLLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUNuRCxPQUFPLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM1QixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0sd0JBQXlCLFNBQVEsT0FBTztJQUM3RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsZ0dBQXVEO1lBQ3pELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxFQUFFLHNCQUFzQixDQUFDO1lBQzlFLFFBQVE7WUFDUixJQUFJLEVBQUUsZUFBZTtZQUNyQixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLHdCQUF3QixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUM7WUFDM04sSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO29CQUNwQixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztpQkFDNUMsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDN0MsT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBR0gsZUFBZSxDQUFDLE1BQU0sZ0JBQWlCLFNBQVEsT0FBTztJQUNyRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsZ0ZBQStDO1lBQ2pELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLGNBQWMsQ0FBQztZQUM5RCxRQUFRO1lBQ1IsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDN0gsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO29CQUNwQixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUM7aUJBQ25ILENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUNuRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0sZ0JBQWlCLFNBQVEsT0FBTztJQUNyRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsZ0ZBQStDO1lBQ2pELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLGNBQWMsQ0FBQztZQUM5RCxRQUFRO1lBQ1IsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUM7WUFDakgsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO29CQUNwQixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUM7aUJBQ3ZHLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUNuRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0sa0JBQW1CLFNBQVEsT0FBTztJQUN2RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsb0ZBQWlEO1lBQ25ELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLGdCQUFnQixDQUFDO1lBQ2xFLFFBQVE7WUFDUixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLG1CQUFtQjtZQUN6RCxVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQztnQkFDbkgsT0FBTyxFQUFFLGlEQUE2QjthQUN0QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQ25ELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDOUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdkMsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztZQUNoRSxVQUFVLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QyxVQUFVLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDeEMsTUFBTSxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNwQyxNQUFNLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsWUFBWTtBQUVaLGlCQUFpQjtBQUNqQixNQUFNLG1CQUFtQixHQUFvQixRQUFRLENBQUMsRUFBRTtJQUN2RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNqRSxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUNyQyxDQUFDLENBQUM7QUFFRixLQUFLLFVBQVUsU0FBUyxDQUFDLFFBQTBCO0lBQ2xELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakQsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQy9DLElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEIsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRXZDLElBQUksVUFBVSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUN0QyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzVGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sdUJBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsdUJBQXVCLENBQzVDLE1BQWdGLEVBQ2hGLE9BQW9DO0lBRXBDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLENBQUM7SUFFbkQsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNkLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxFQUFFLENBQUM7WUFDOUIsSUFBSSxjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7WUFDeEUsQ0FBQztZQUNELHVCQUF1QixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEQsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxRQUEwQjtJQUNyRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMvQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztBQUNsQyxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsUUFBMEI7SUFDL0MsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNqRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDL0MsVUFBVSxFQUFFLFlBQVksRUFBRSxDQUFDO0FBQzVCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxRQUEwQjtJQUNoRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMvQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMxSSxDQUFDO0FBRUQsU0FBUyw0QkFBNEIsQ0FBQyxRQUEwQjtJQUUvRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMvQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUV2Qzs7O1dBR0c7UUFDSCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzdCLElBQUkseUJBQXlCLEdBQUcsS0FBSyxDQUFDO1FBQ3RDLElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBRWxDLEdBQUcsQ0FBQztZQUNILElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekIsQ0FBQyxRQUFRLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3BDLDRDQUE0QztRQUU1QyxJQUFJLG9DQUFvQyxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ3RGLE9BQU8sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQy9CLFNBQVM7Z0JBQ1YsQ0FBQztnQkFDRCxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzdCLHlCQUF5QixHQUFHLElBQUksQ0FBQztvQkFDakMsTUFBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksVUFBVSxDQUFDLHVCQUF1QixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQkFDbEUsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDO29CQUV0QixJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ25DLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7d0JBQ3JGLHVMQUF1TDt3QkFDdkwsVUFBVSxHQUFHLG9CQUFvQixJQUFJLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUN4TSxDQUFDO29CQUVELE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFFNUMsSUFBSSxDQUFDLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLElBQUksb0NBQW9DLENBQUMsZUFBZSxDQUFDLElBQUksNkJBQTZCLENBQUMsZUFBZSxDQUFDLElBQUksY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDM0wscUJBQXFCLEdBQUcsSUFBSSxDQUFDO29CQUM5QixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUkseUJBQXlCLEVBQUUsQ0FBQztZQUMvQixJQUFJLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pCLEdBQUcsQ0FBQztnQkFDSCxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ2pDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDLFFBQVEsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNuQyxDQUFDO2FBQU0sSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQ2xDLElBQUksR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDekIsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixHQUFHLENBQUM7b0JBRUgsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDO29CQUV0QixJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQ25DLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7d0JBQ3JGLG9IQUFvSDt3QkFDcEgsVUFBVSxHQUFHLENBQUMsb0JBQW9CLElBQUksQ0FBQyxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM1SixDQUFDO29CQUNELE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFFNUMsSUFBSSxvQ0FBb0MsQ0FBQyxlQUFlLENBQUMsSUFBSSw2QkFBNkIsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO3dCQUM3RyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDMUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQzdCLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ3RCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDLFFBQVEsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksbUJBQW1CLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNuRCxrRkFBa0Y7WUFDbEYsSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6QixHQUFHLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNYLE1BQU07Z0JBRVAsQ0FBQztnQkFFRCxJQUFJLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3hELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDLFFBQVEsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUVuQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFFeEQsSUFBSSxnQkFBZ0IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLElBQUkscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUM3RyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDM0UsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNwQixNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFlBQVkifQ==
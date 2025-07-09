/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getSelectionKeyboardEvent } from '../../../../platform/list/browser/listService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { searchRemoveIcon, searchReplaceIcon } from './searchIcons.js';
import * as Constants from '../common/constants.js';
import { IReplaceService } from './replace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { category, getElementsToOperateOn, getSearchView, shouldRefocus } from './searchActionsBase.js';
import { equals } from '../../../../base/common/arrays.js';
import { arrayContainsElementOrParent, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeMatch, isSearchResult, isTextSearchHeading } from './searchTreeModel/searchTreeCommon.js';
import { MatchInNotebook } from './notebookSearch/notebookSearchModel.js';
import { AITextSearchHeadingImpl } from './AISearch/aiSearchModel.js';
//#endregion
//#region Actions
registerAction2(class RemoveAction extends Action2 {
    constructor() {
        super({
            id: "search.action.remove" /* Constants.SearchCommandIds.RemoveActionId */,
            title: nls.localize2('RemoveAction.label', "Dismiss"),
            category,
            icon: searchRemoveIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.FileMatchOrMatchFocusKey),
                primary: 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                },
            },
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'search',
                    order: 2,
                },
                {
                    id: MenuId.SearchActionMenu,
                    group: 'inline',
                    when: ContextKeyExpr.or(Constants.SearchContext.FileFocusKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.FolderFocusKey),
                    order: 2,
                },
            ]
        });
    }
    async run(accessor, context) {
        const viewsService = accessor.get(IViewsService);
        const configurationService = accessor.get(IConfigurationService);
        const searchView = getSearchView(viewsService);
        if (!searchView) {
            return;
        }
        let element = context?.element;
        let viewer = context?.viewer;
        if (!viewer) {
            viewer = searchView.getControl();
        }
        if (!element) {
            element = viewer.getFocus()[0] ?? undefined;
        }
        const elementsToRemove = getElementsToOperateOn(viewer, element, configurationService.getValue('search'));
        let focusElement = viewer.getFocus()[0] ?? undefined;
        if (elementsToRemove.length === 0) {
            return;
        }
        if (!focusElement || (isSearchResult(focusElement))) {
            focusElement = element;
        }
        let nextFocusElement;
        const shouldRefocusMatch = shouldRefocus(elementsToRemove, focusElement);
        if (focusElement && shouldRefocusMatch) {
            nextFocusElement = await getElementToFocusAfterRemoved(viewer, focusElement, elementsToRemove);
        }
        const searchResult = searchView.searchResult;
        if (searchResult) {
            searchResult.batchRemove(elementsToRemove);
        }
        await searchView.queueRefreshTree(); // wait for refreshTree to finish
        if (focusElement && shouldRefocusMatch) {
            if (!nextFocusElement) {
                nextFocusElement = await getLastNodeFromSameType(viewer, focusElement);
            }
            if (nextFocusElement && !arrayContainsElementOrParent(nextFocusElement, elementsToRemove)) {
                viewer.reveal(nextFocusElement);
                viewer.setFocus([nextFocusElement], getSelectionKeyboardEvent());
                viewer.setSelection([nextFocusElement], getSelectionKeyboardEvent());
            }
        }
        else if (!equals(viewer.getFocus(), viewer.getSelection())) {
            viewer.setSelection(viewer.getFocus());
        }
        viewer.domFocus();
        return;
    }
});
registerAction2(class ReplaceAction extends Action2 {
    constructor() {
        super({
            id: "search.action.replace" /* Constants.SearchCommandIds.ReplaceActionId */,
            title: nls.localize2('match.replace.label', "Replace"),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.IsEditableItemKey),
                primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */,
            },
            icon: searchReplaceIcon,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'search',
                    order: 1
                },
                {
                    id: MenuId.SearchActionMenu,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'inline',
                    order: 1
                }
            ]
        });
    }
    async run(accessor, context) {
        return performReplace(accessor, context);
    }
});
registerAction2(class ReplaceAllAction extends Action2 {
    constructor() {
        super({
            id: "search.action.replaceAllInFile" /* Constants.SearchCommandIds.ReplaceAllInFileActionId */,
            title: nls.localize2('file.replaceAll.label', "Replace All"),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FileFocusKey, Constants.SearchContext.IsEditableItemKey),
                primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */],
            },
            icon: searchReplaceIcon,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FileFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'search',
                    order: 1
                },
                {
                    id: MenuId.SearchActionMenu,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FileFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'inline',
                    order: 1
                }
            ]
        });
    }
    async run(accessor, context) {
        return performReplace(accessor, context);
    }
});
registerAction2(class ReplaceAllInFolderAction extends Action2 {
    constructor() {
        super({
            id: "search.action.replaceAllInFolder" /* Constants.SearchCommandIds.ReplaceAllInFolderActionId */,
            title: nls.localize2('file.replaceAll.label', "Replace All"),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FolderFocusKey, Constants.SearchContext.IsEditableItemKey),
                primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */],
            },
            icon: searchReplaceIcon,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FolderFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'search',
                    order: 1
                },
                {
                    id: MenuId.SearchActionMenu,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FolderFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'inline',
                    order: 1
                }
            ]
        });
    }
    async run(accessor, context) {
        return performReplace(accessor, context);
    }
});
//#endregion
//#region Helpers
async function performReplace(accessor, context) {
    const configurationService = accessor.get(IConfigurationService);
    const viewsService = accessor.get(IViewsService);
    const viewlet = getSearchView(viewsService);
    const viewer = context?.viewer ?? viewlet?.getControl();
    if (!viewer) {
        return;
    }
    const element = context?.element ?? viewer.getFocus()[0];
    // since multiple elements can be selected, we need to check the type of the FolderMatch/FileMatch/Match before we perform the replace.
    const elementsToReplace = getElementsToOperateOn(viewer, element ?? undefined, configurationService.getValue('search'));
    let focusElement = viewer.getFocus()[0];
    if (!focusElement || (focusElement && !arrayContainsElementOrParent(focusElement, elementsToReplace)) || (isSearchResult(focusElement))) {
        focusElement = element;
    }
    if (elementsToReplace.length === 0) {
        return;
    }
    let nextFocusElement;
    if (focusElement) {
        nextFocusElement = await getElementToFocusAfterRemoved(viewer, focusElement, elementsToReplace);
    }
    const searchResult = viewlet?.searchResult;
    if (searchResult) {
        await searchResult.batchReplace(elementsToReplace);
    }
    await viewlet?.queueRefreshTree(); // wait for refreshTree to finish
    if (focusElement) {
        if (!nextFocusElement) {
            nextFocusElement = await getLastNodeFromSameType(viewer, focusElement);
        }
        if (nextFocusElement) {
            viewer.reveal(nextFocusElement);
            viewer.setFocus([nextFocusElement], getSelectionKeyboardEvent());
            viewer.setSelection([nextFocusElement], getSelectionKeyboardEvent());
            if (isSearchTreeMatch(nextFocusElement)) {
                const useReplacePreview = configurationService.getValue().search.useReplacePreview;
                if (!useReplacePreview || hasToOpenFile(accessor, nextFocusElement) || nextFocusElement instanceof MatchInNotebook) {
                    viewlet?.open(nextFocusElement, true);
                }
                else {
                    accessor.get(IReplaceService).openReplacePreview(nextFocusElement, true);
                }
            }
            else if (isSearchTreeFileMatch(nextFocusElement)) {
                viewlet?.open(nextFocusElement, true);
            }
        }
    }
    viewer.domFocus();
}
function hasToOpenFile(accessor, currBottomElem) {
    if (!(isSearchTreeMatch(currBottomElem))) {
        return false;
    }
    const activeEditor = accessor.get(IEditorService).activeEditor;
    const file = activeEditor?.resource;
    if (file) {
        return accessor.get(IUriIdentityService).extUri.isEqual(file, currBottomElem.parent().resource);
    }
    return false;
}
function compareLevels(elem1, elem2) {
    if (isSearchTreeMatch(elem1)) {
        if (isSearchTreeMatch(elem2)) {
            return 0;
        }
        else {
            return -1;
        }
    }
    else if (isSearchTreeFileMatch(elem1)) {
        if (isSearchTreeMatch(elem2)) {
            return 1;
        }
        else if (isSearchTreeFileMatch(elem2)) {
            return 0;
        }
        else {
            return -1;
        }
    }
    else if (isSearchTreeFolderMatch(elem1)) {
        if (isTextSearchHeading(elem2)) {
            return -1;
        }
        else if (isSearchTreeFolderMatch(elem2)) {
            return 0;
        }
        else {
            return 1;
        }
    }
    else {
        if (isTextSearchHeading(elem2)) {
            return 0;
        }
        else {
            return 1;
        }
    }
}
/**
 * Returns element to focus after removing the given element
 */
export async function getElementToFocusAfterRemoved(viewer, element, elementsToRemove) {
    const navigator = viewer.navigate(element);
    if (isSearchTreeFolderMatch(element)) {
        while (!!navigator.next() && (!isSearchTreeFolderMatch(navigator.current()) || arrayContainsElementOrParent(navigator.current(), elementsToRemove))) { }
    }
    else if (isSearchTreeFileMatch(element)) {
        while (!!navigator.next() && (!isSearchTreeFileMatch(navigator.current()) || arrayContainsElementOrParent(navigator.current(), elementsToRemove))) {
            // Never expand AI search results by default
            if (navigator.current() instanceof AITextSearchHeadingImpl) {
                return navigator.current();
            }
            await viewer.expand(navigator.current());
        }
    }
    else {
        while (navigator.next() && (!isSearchTreeMatch(navigator.current()) || arrayContainsElementOrParent(navigator.current(), elementsToRemove))) {
            // Never expand AI search results by default
            if (navigator.current() instanceof AITextSearchHeadingImpl) {
                return navigator.current();
            }
            await viewer.expand(navigator.current());
        }
    }
    return navigator.current();
}
/***
 * Finds the last element in the tree with the same type as `element`
 */
export async function getLastNodeFromSameType(viewer, element) {
    let lastElem = viewer.lastVisibleElement ?? null;
    while (lastElem) {
        const compareVal = compareLevels(element, lastElem);
        if (compareVal === -1) {
            const expanded = await viewer.expand(lastElem);
            if (!expanded) {
                return lastElem;
            }
            lastElem = viewer.lastVisibleElement;
        }
        else if (compareVal === 1) {
            const potentialLastElem = viewer.getParentElement(lastElem);
            if (isSearchResult(potentialLastElem)) {
                break;
            }
            else {
                lastElem = potentialLastElem;
            }
        }
        else {
            return lastElem;
        }
    }
    return undefined;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1JlbW92ZVJlcGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoQWN0aW9uc1JlbW92ZVJlcGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUseUJBQXlCLEVBQXNDLE1BQU0sa0RBQWtELENBQUM7QUFDakksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRXZFLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsc0JBQXNCLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsNEJBQTRCLEVBQWtDLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdOLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQXdCdEUsWUFBWTtBQUVaLGlCQUFpQjtBQUNqQixlQUFlLENBQUMsTUFBTSxZQUFhLFNBQVEsT0FBTztJQUVqRDtRQUVDLEtBQUssQ0FBQztZQUNMLEVBQUUsd0VBQTJDO1lBQzdDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQztZQUNyRCxRQUFRO1lBQ1IsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQztnQkFDeEgsT0FBTyx5QkFBZ0I7Z0JBQ3ZCLEdBQUcsRUFBRTtvQkFDSixPQUFPLEVBQUUscURBQWtDO2lCQUMzQzthQUNEO1lBQ0QsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsYUFBYTtvQkFDeEIsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1I7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7b0JBQzNCLEtBQUssRUFBRSxRQUFRO29CQUNmLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDO29CQUM1SSxLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUF5QztRQUM5RSxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUvQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxPQUFPLEVBQUUsT0FBTyxDQUFDO1FBQy9CLElBQUksTUFBTSxHQUFHLE9BQU8sRUFBRSxNQUFNLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUM7UUFDN0MsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQWlDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDMUksSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztRQUVyRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3JELFlBQVksR0FBRyxPQUFPLENBQUM7UUFDeEIsQ0FBQztRQUVELElBQUksZ0JBQWdCLENBQUM7UUFDckIsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDekUsSUFBSSxZQUFZLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QyxnQkFBZ0IsR0FBRyxNQUFNLDZCQUE2QixDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRyxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQztRQUU3QyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFlBQVksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsTUFBTSxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLGlDQUFpQztRQUV0RSxJQUFJLFlBQVksSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2QixnQkFBZ0IsR0FBRyxNQUFNLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN4RSxDQUFDO1lBRUQsSUFBSSxnQkFBZ0IsSUFBSSxDQUFDLDRCQUE0QixDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztnQkFDM0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNoQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLHlCQUF5QixFQUFFLENBQUMsQ0FBQztZQUN0RSxDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDOUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLE9BQU87SUFDUixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0sYUFBYyxTQUFRLE9BQU87SUFDbEQ7UUFFQyxLQUFLLENBQUM7WUFDTCxFQUFFLDBFQUE0QztZQUM5QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLENBQUM7WUFDdEQsUUFBUTtZQUNSLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7Z0JBQ2xNLE9BQU8sRUFBRSxtREFBNkIsMEJBQWlCO2FBQ3ZEO1lBQ0QsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxhQUFhO29CQUN4QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7b0JBQ3BKLEtBQUssRUFBRSxRQUFRO29CQUNmLEtBQUssRUFBRSxDQUFDO2lCQUNSO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO29CQUMzQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7b0JBQ3BKLEtBQUssRUFBRSxRQUFRO29CQUNmLEtBQUssRUFBRSxDQUFDO2lCQUNSO2FBQ0Q7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE9BQXlDO1FBQ3ZGLE9BQU8sY0FBYyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMxQyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0sZ0JBQWlCLFNBQVEsT0FBTztJQUVyRDtRQUVDLEtBQUssQ0FBQztZQUNMLEVBQUUsNEZBQXFEO1lBQ3ZELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQztZQUM1RCxRQUFRO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDak0sT0FBTyxFQUFFLG1EQUE2QiwwQkFBaUI7Z0JBQ3ZELFNBQVMsRUFBRSxDQUFDLG1EQUE2Qix3QkFBZ0IsQ0FBQzthQUMxRDtZQUNELElBQUksRUFBRSxpQkFBaUI7WUFDdkIsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsYUFBYTtvQkFDeEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO29CQUNuSixLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsQ0FBQztpQkFDUjtnQkFDRDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtvQkFDM0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO29CQUNuSixLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUF5QztRQUN2RixPQUFPLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDMUMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLHdCQUF5QixTQUFRLE9BQU87SUFDN0Q7UUFFQyxLQUFLLENBQUM7WUFDTCxFQUFFLGdHQUF1RDtZQUN6RCxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxhQUFhLENBQUM7WUFDNUQsUUFBUTtZQUNSLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUM7Z0JBQ25NLE9BQU8sRUFBRSxtREFBNkIsMEJBQWlCO2dCQUN2RCxTQUFTLEVBQUUsQ0FBQyxtREFBNkIsd0JBQWdCLENBQUM7YUFDMUQ7WUFDRCxJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLElBQUksRUFBRTtnQkFDTDtvQkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLGFBQWE7b0JBQ3hCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDckosS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1I7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7b0JBQzNCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDckosS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBeUM7UUFDdkYsT0FBTyxjQUFjLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxZQUFZO0FBRVosaUJBQWlCO0FBRWpCLEtBQUssVUFBVSxjQUFjLENBQUMsUUFBMEIsRUFDdkQsT0FBeUM7SUFDekMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDakUsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUVqRCxNQUFNLE9BQU8sR0FBMkIsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sTUFBTSxHQUFtRixPQUFPLEVBQUUsTUFBTSxJQUFJLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUV4SSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPO0lBQ1IsQ0FBQztJQUNELE1BQU0sT0FBTyxHQUEyQixPQUFPLEVBQUUsT0FBTyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVqRix1SUFBdUk7SUFDdkksTUFBTSxpQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxJQUFJLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQWlDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDeEosSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXhDLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN6SSxZQUFZLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNwQyxPQUFPO0lBQ1IsQ0FBQztJQUNELElBQUksZ0JBQWdCLENBQUM7SUFDckIsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixnQkFBZ0IsR0FBRyxNQUFNLDZCQUE2QixDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNqRyxDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsT0FBTyxFQUFFLFlBQVksQ0FBQztJQUUzQyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2xCLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxNQUFNLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsaUNBQWlDO0lBRXBFLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkIsZ0JBQWdCLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixNQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLHlCQUF5QixFQUFFLENBQUMsQ0FBQztZQUVyRSxJQUFJLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQXdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDO2dCQUN6RyxJQUFJLENBQUMsaUJBQWlCLElBQUksYUFBYSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLGdCQUFnQixZQUFZLGVBQWUsRUFBRSxDQUFDO29CQUNwSCxPQUFPLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDMUUsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUM7SUFFRixDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxRQUEwQixFQUFFLGNBQStCO0lBQ2pGLElBQUksQ0FBQyxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMxQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUMvRCxNQUFNLElBQUksR0FBRyxZQUFZLEVBQUUsUUFBUSxDQUFDO0lBQ3BDLElBQUksSUFBSSxFQUFFLENBQUM7UUFDVixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakcsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQXNCLEVBQUUsS0FBc0I7SUFDcEUsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzlCLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7SUFFRixDQUFDO1NBQU0sSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3pDLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7YUFBTSxJQUFJLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekMsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO0lBQ0YsQ0FBQztTQUFNLElBQUksdUJBQXVCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMzQyxJQUFJLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7YUFBTSxJQUFJLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSw2QkFBNkIsQ0FBQyxNQUEwRSxFQUFFLE9BQXdCLEVBQUUsZ0JBQW1DO0lBQzVMLE1BQU0sU0FBUyxHQUF3QixNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hFLElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN0QyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekosQ0FBQztTQUFNLElBQUkscUJBQXFCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUMzQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNuSiw0Q0FBNEM7WUFDNUMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLFlBQVksdUJBQXVCLEVBQUUsQ0FBQztnQkFDNUQsT0FBTyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUIsQ0FBQztZQUNELE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksNEJBQTRCLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzdJLDRDQUE0QztZQUM1QyxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsWUFBWSx1QkFBdUIsRUFBRSxDQUFDO2dCQUM1RCxPQUFPLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QixDQUFDO1lBQ0QsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDNUIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSx1QkFBdUIsQ0FBQyxNQUEwRSxFQUFFLE9BQXdCO0lBQ2pKLElBQUksUUFBUSxHQUEyQixNQUFNLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDO0lBRXpFLE9BQU8sUUFBUSxFQUFFLENBQUM7UUFDakIsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNwRCxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxRQUFRLENBQUM7WUFDakIsQ0FBQztZQUNELFFBQVEsR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUM7UUFDdEMsQ0FBQzthQUFNLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzVELElBQUksY0FBYyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDdkMsTUFBTTtZQUNQLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLEdBQUcsaUJBQWlCLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDO0FBRUQsWUFBWSJ9
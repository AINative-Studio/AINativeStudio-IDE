/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../base/browser/dom.js';
import * as nls from '../../../../nls.js';
import { VIEW_ID } from '../../../services/search/common/search.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch } from './searchTreeModel/searchTreeCommon.js';
import { searchComparer } from './searchCompare.js';
export const category = nls.localize2('search', "Search");
export function isSearchViewFocused(viewsService) {
    const searchView = getSearchView(viewsService);
    return !!(searchView && DOM.isAncestorOfActiveElement(searchView.getContainer()));
}
export function appendKeyBindingLabel(label, inputKeyBinding) {
    return doAppendKeyBindingLabel(label, inputKeyBinding);
}
export function getSearchView(viewsService) {
    return viewsService.getActiveViewWithId(VIEW_ID);
}
export function getElementsToOperateOn(viewer, currElement, sortConfig) {
    let elements = viewer.getSelection().filter((x) => x !== null).sort((a, b) => searchComparer(a, b, sortConfig.sortOrder));
    // if selection doesn't include multiple elements, just return current focus element.
    if (currElement && !(elements.length > 1 && elements.includes(currElement))) {
        elements = [currElement];
    }
    return elements;
}
/**
 * @param elements elements that are going to be removed
 * @param focusElement element that is focused
 * @returns whether we need to re-focus on a remove
 */
export function shouldRefocus(elements, focusElement) {
    if (!focusElement) {
        return false;
    }
    return !focusElement || elements.includes(focusElement) || hasDownstreamMatch(elements, focusElement);
}
function hasDownstreamMatch(elements, focusElement) {
    for (const elem of elements) {
        if ((isSearchTreeFileMatch(elem) && isSearchTreeMatch(focusElement) && elem.matches().includes(focusElement)) ||
            (isSearchTreeFolderMatch(elem) && ((isSearchTreeFileMatch(focusElement) && elem.getDownstreamFileMatch(focusElement.resource)) ||
                (isSearchTreeMatch(focusElement) && elem.getDownstreamFileMatch(focusElement.parent().resource))))) {
            return true;
        }
    }
    return false;
}
export function openSearchView(viewsService, focus) {
    return viewsService.openView(VIEW_ID, focus).then(view => (view ?? undefined));
}
function doAppendKeyBindingLabel(label, keyBinding) {
    return keyBinding ? label + ' (' + keyBinding.getLabel() + ')' : label;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0Jhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoQWN0aW9uc0Jhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBSTFDLE9BQU8sRUFBa0MsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFrQyxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVwRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFFMUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFlBQTJCO0lBQzlELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMvQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNuRixDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEtBQWEsRUFBRSxlQUErQztJQUNuRyxPQUFPLHVCQUF1QixDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxZQUEyQjtJQUN4RCxPQUFPLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQWUs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
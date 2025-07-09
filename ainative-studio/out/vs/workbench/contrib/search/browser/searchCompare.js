/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isIMatchInNotebook } from './notebookSearch/notebookSearchModelBase.js';
import { compareFileExtensions, compareFileNames, comparePaths } from '../../../../base/common/comparers.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createParentList, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeMatch } from './searchTreeModel/searchTreeCommon.js';
import { isSearchTreeAIFileMatch } from './AISearch/aiSearchModelBase.js';
let elemAIndex = -1;
let elemBIndex = -1;
/**
 * Compares instances of the same match type. Different match types should not be siblings
 * and their sort order is undefined.
 */
export function searchMatchComparer(elementA, elementB, sortOrder = "default" /* SearchSortOrder.Default */) {
    if (isSearchTreeFileMatch(elementA) && isSearchTreeFolderMatch(elementB)) {
        return 1;
    }
    if (isSearchTreeFileMatch(elementB) && isSearchTreeFolderMatch(elementA)) {
        return -1;
    }
    if (isSearchTreeFolderMatch(elementA) && isSearchTreeFolderMatch(elementB)) {
        elemAIndex = elementA.index();
        elemBIndex = elementB.index();
        if (elemAIndex !== -1 && elemBIndex !== -1) {
            return elemAIndex - elemBIndex;
        }
        if (isSearchTreeAIFileMatch(elementA) && isSearchTreeAIFileMatch(elementB)) {
            return elementA.rank - elementB.rank;
        }
        switch (sortOrder) {
            case "countDescending" /* SearchSortOrder.CountDescending */:
                return elementB.count() - elementA.count();
            case "countAscending" /* SearchSortOrder.CountAscending */:
                return elementA.count() - elementB.count();
            case "type" /* SearchSortOrder.Type */:
                return compareFileExtensions(elementA.name(), elementB.name());
            case "fileNames" /* SearchSortOrder.FileNames */:
                return compareFileNames(elementA.name(), elementB.name());
            // Fall through otherwise
            default:
                if (!elementA.resource || !elementB.resource) {
                    return 0;
                }
                return comparePaths(elementA.resource.fsPath, elementB.resource.fsPath) || compareFileNames(elementA.name(), elementB.name());
        }
    }
    if (isSearchTreeFileMatch(elementA) && isSearchTreeFileMatch(elementB)) {
        switch (sortOrder) {
            case "countDescending" /* SearchSortOrder.CountDescending */:
                return elementB.count() - elementA.count();
            case "countAscending" /* SearchSortOrder.CountAscending */:
                return elementA.count() - elementB.count();
            case "type" /* SearchSortOrder.Type */:
                return compareFileExtensions(elementA.name(), elementB.name());
            case "fileNames" /* SearchSortOrder.FileNames */:
                return compareFileNames(elementA.name(), elementB.name());
            case "modified" /* SearchSortOrder.Modified */: {
                const fileStatA = elementA.fileStat;
                const fileStatB = elementB.fileStat;
                if (fileStatA && fileStatB) {
                    return fileStatB.mtime - fileStatA.mtime;
                }
            }
            // Fall through otherwise
            default:
                return comparePaths(elementA.resource.fsPath, elementB.resource.fsPath) || compareFileNames(elementA.name(), elementB.name());
        }
    }
    if (isIMatchInNotebook(elementA) && isIMatchInNotebook(elementB)) {
        return compareNotebookPos(elementA, elementB);
    }
    if (isSearchTreeMatch(elementA) && isSearchTreeMatch(elementB)) {
        return Range.compareRangesUsingStarts(elementA.range(), elementB.range());
    }
    return 0;
}
function compareNotebookPos(match1, match2) {
    if (match1.cellIndex === match2.cellIndex) {
        if (match1.webviewIndex !== undefined && match2.webviewIndex !== undefined) {
            return match1.webviewIndex - match2.webviewIndex;
        }
        else if (match1.webviewIndex === undefined && match2.webviewIndex === undefined) {
            return Range.compareRangesUsingStarts(match1.range(), match2.range());
        }
        else {
            // webview matches should always be after content matches
            if (match1.webviewIndex !== undefined) {
                return 1;
            }
            else {
                return -1;
            }
        }
    }
    else if (match1.cellIndex < match2.cellIndex) {
        return -1;
    }
    else {
        return 1;
    }
}
export function searchComparer(elementA, elementB, sortOrder = "default" /* SearchSortOrder.Default */) {
    const elemAParents = createParentList(elementA);
    const elemBParents = createParentList(elementB);
    let i = elemAParents.length - 1;
    let j = elemBParents.length - 1;
    while (i >= 0 && j >= 0) {
        if (elemAParents[i].id() !== elemBParents[j].id()) {
            return searchMatchComparer(elemAParents[i], elemBParents[j], sortOrder);
        }
        i--;
        j--;
    }
    const elemAAtEnd = i === 0;
    const elemBAtEnd = j === 0;
    if (elemAAtEnd && !elemBAtEnd) {
        return 1;
    }
    else if (!elemAAtEnd && elemBAtEnd) {
        return -1;
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQ29tcGFyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hDb21wYXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBb0Isa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFN0csT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxpQkFBaUIsRUFBbUIsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3SixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUcxRSxJQUFJLFVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQztBQUM1QixJQUFJLFVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQztBQUU1Qjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsUUFBeUIsRUFBRSxRQUF5QixFQUFFLG1EQUFvRDtJQUM3SSxJQUFJLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDMUUsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBRUQsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSx1QkFBdUIsQ0FB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
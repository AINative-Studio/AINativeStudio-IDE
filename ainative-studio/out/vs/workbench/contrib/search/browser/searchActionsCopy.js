/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import * as Constants from '../common/constants.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { category, getSearchView } from './searchActionsBase.js';
import { isWindows } from '../../../../base/common/platform.js';
import { searchMatchComparer } from './searchCompare.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchWithResource } from './searchTreeModel/searchTreeCommon.js';
//#region Actions
registerAction2(class CopyMatchCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.copyMatch" /* Constants.SearchCommandIds.CopyMatchCommandId */,
            title: nls.localize2('copyMatchLabel', "Copy"),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: Constants.SearchContext.FileMatchOrMatchFocusKey,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
            },
            menu: [{
                    id: MenuId.SearchContext,
                    when: Constants.SearchContext.FileMatchOrMatchFocusKey,
                    group: 'search_2',
                    order: 1
                }]
        });
    }
    async run(accessor, match) {
        await copyMatchCommand(accessor, match);
    }
});
registerAction2(class CopyPathCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.copyPath" /* Constants.SearchCommandIds.CopyPathCommandId */,
            title: nls.localize2('copyPathLabel', "Copy Path"),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: Constants.SearchContext.FileMatchOrFolderMatchWithResourceFocusKey,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
                win: {
                    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */
                },
            },
            menu: [{
                    id: MenuId.SearchContext,
                    when: Constants.SearchContext.FileMatchOrFolderMatchWithResourceFocusKey,
                    group: 'search_2',
                    order: 2
                }]
        });
    }
    async run(accessor, fileMatch) {
        await copyPathCommand(accessor, fileMatch);
    }
});
registerAction2(class CopyAllCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.copyAll" /* Constants.SearchCommandIds.CopyAllCommandId */,
            title: nls.localize2('copyAllLabel', "Copy All"),
            category,
            menu: [{
                    id: MenuId.SearchContext,
                    when: Constants.SearchContext.HasSearchResults,
                    group: 'search_2',
                    order: 3
                }]
        });
    }
    async run(accessor) {
        await copyAllCommand(accessor);
    }
});
registerAction2(class GetSearchResultsAction extends Action2 {
    constructor() {
        super({
            id: "search.action.getSearchResults" /* Constants.SearchCommandIds.GetSearchResultsActionId */,
            title: nls.localize2('getSearchResultsLabel', "Get Search Results"),
            category,
            f1: false
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const labelService = accessor.get(ILabelService);
        const searchView = getSearchView(viewsService);
        if (searchView) {
            const root = searchView.searchResult;
            const textSearchResult = allFolderMatchesToString(root.folderMatches(), labelService);
            const aiSearchResult = allFolderMatchesToString(root.folderMatches(true), labelService);
            const text = `${textSearchResult}${lineDelimiter}${lineDelimiter}${aiSearchResult}`;
            return text;
        }
        return undefined;
    }
});
//#endregion
//#region Helpers
export const lineDelimiter = isWindows ? '\r\n' : '\n';
async function copyPathCommand(accessor, fileMatch) {
    if (!fileMatch) {
        const selection = getSelectedRow(accessor);
        if (!isSearchTreeFileMatch(selection) || isSearchTreeFolderMatchWithResource(selection)) {
            return;
        }
        fileMatch = selection;
    }
    const clipboardService = accessor.get(IClipboardService);
    const labelService = accessor.get(ILabelService);
    const text = labelService.getUriLabel(fileMatch.resource, { noPrefix: true });
    await clipboardService.writeText(text);
}
async function copyMatchCommand(accessor, match) {
    if (!match) {
        const selection = getSelectedRow(accessor);
        if (!selection) {
            return;
        }
        match = selection;
    }
    const clipboardService = accessor.get(IClipboardService);
    const labelService = accessor.get(ILabelService);
    let text;
    if (isSearchTreeMatch(match)) {
        text = matchToString(match);
    }
    else if (isSearchTreeFileMatch(match)) {
        text = fileMatchToString(match, labelService).text;
    }
    else if (isSearchTreeFolderMatch(match)) {
        text = folderMatchToString(match, labelService).text;
    }
    if (text) {
        await clipboardService.writeText(text);
    }
}
async function copyAllCommand(accessor) {
    const viewsService = accessor.get(IViewsService);
    const clipboardService = accessor.get(IClipboardService);
    const labelService = accessor.get(ILabelService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const root = searchView.searchResult;
        const text = allFolderMatchesToString(root.folderMatches(), labelService);
        await clipboardService.writeText(text);
    }
}
function matchToString(match, indent = 0) {
    const getFirstLinePrefix = () => `${match.range().startLineNumber},${match.range().startColumn}`;
    const getOtherLinePrefix = (i) => match.range().startLineNumber + i + '';
    const fullMatchLines = match.fullPreviewLines();
    const largestPrefixSize = fullMatchLines.reduce((largest, _, i) => {
        const thisSize = i === 0 ?
            getFirstLinePrefix().length :
            getOtherLinePrefix(i).length;
        return Math.max(thisSize, largest);
    }, 0);
    const formattedLines = fullMatchLines
        .map((line, i) => {
        const prefix = i === 0 ?
            getFirstLinePrefix() :
            getOtherLinePrefix(i);
        const paddingStr = ' '.repeat(largestPrefixSize - prefix.length);
        const indentStr = ' '.repeat(indent);
        return `${indentStr}${prefix}: ${paddingStr}${line}`;
    });
    return formattedLines.join('\n');
}
function fileFolderMatchToString(match, labelService) {
    if (isSearchTreeFileMatch(match)) {
        return fileMatchToString(match, labelService);
    }
    else {
        return folderMatchToString(match, labelService);
    }
}
function fileMatchToString(fileMatch, labelService) {
    const matchTextRows = fileMatch.matches()
        .sort(searchMatchComparer)
        .map(match => matchToString(match, 2));
    const uriString = labelService.getUriLabel(fileMatch.resource, { noPrefix: true });
    return {
        text: `${uriString}${lineDelimiter}${matchTextRows.join(lineDelimiter)}`,
        count: matchTextRows.length
    };
}
function folderMatchToString(folderMatch, labelService) {
    const results = [];
    let numMatches = 0;
    const matches = folderMatch.matches().sort(searchMatchComparer);
    matches.forEach(match => {
        const result = fileFolderMatchToString(match, labelService);
        numMatches += result.count;
        results.push(result.text);
    });
    return {
        text: results.join(lineDelimiter + lineDelimiter),
        count: numMatches
    };
}
function allFolderMatchesToString(folderMatches, labelService) {
    const folderResults = [];
    folderMatches = folderMatches.sort(searchMatchComparer);
    for (let i = 0; i < folderMatches.length; i++) {
        const folderResult = folderMatchToString(folderMatches[i], labelService);
        if (folderResult.count) {
            folderResults.push(folderResult.text);
        }
    }
    return folderResults.join(lineDelimiter + lineDelimiter);
}
function getSelectedRow(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    return searchView?.getControl().getSelection()[0];
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0NvcHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hBY3Rpb25zQ29weS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxLQUFLLFNBQVMsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUdsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQXFDLGlCQUFpQixFQUFvRixxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXBSLGlCQUFpQjtBQUNqQixlQUFlLENBQUMsTUFBTSxzQkFBdUIsU0FBUSxPQUFPO0lBRTNEO1FBRUMsS0FBSyxDQUFDO1lBQ0wsRUFBRSwrRUFBK0M7WUFDakQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDO1lBQzlDLFFBQVE7WUFDUixVQUFVLEVBQUU7Z0JB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
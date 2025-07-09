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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0NvcHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoQWN0aW9uc0NvcHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUU5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFxQyxpQkFBaUIsRUFBb0YscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVwUixpQkFBaUI7QUFDakIsZUFBZSxDQUFDLE1BQU0sc0JBQXVCLFNBQVEsT0FBTztJQUUzRDtRQUVDLEtBQUssQ0FBQztZQUNMLEVBQUUsK0VBQStDO1lBQ2pELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQztZQUM5QyxRQUFRO1lBQ1IsVUFBVSxFQUFFO2dC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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextSearchMatch } from '../../../../services/search/common/search.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { genericCellMatchesToTextSearchMatches, rawCellPrefix } from '../../common/searchNotebookHelpers.js';
export function getIDFromINotebookCellMatch(match) {
    if (isINotebookCellMatchWithModel(match)) {
        return match.cell.id;
    }
    else {
        return `${rawCellPrefix}${match.index}`;
    }
}
export function isINotebookFileMatchWithModel(object) {
    return 'cellResults' in object && object.cellResults instanceof Array && object.cellResults.every(isINotebookCellMatchWithModel);
}
export function isINotebookCellMatchWithModel(object) {
    return 'cell' in object;
}
export function contentMatchesToTextSearchMatches(contentMatches, cell) {
    return genericCellMatchesToTextSearchMatches(contentMatches, cell.textBuffer);
}
export function webviewMatchesToTextSearchMatches(webviewMatches) {
    return webviewMatches
        .map(rawMatch => (rawMatch.searchPreviewInfo) ?
        new TextSearchMatch(rawMatch.searchPreviewInfo.line, new Range(0, rawMatch.searchPreviewInfo.range.start, 0, rawMatch.searchPreviewInfo.range.end), undefined, rawMatch.index) : undefined).filter((e) => !!e);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL25vdGVib29rU2VhcmNoL3NlYXJjaE5vdGVib29rSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQWdDLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQXdELHFDQUFxQyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBT25LLE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxLQUF5QjtJQUNwRSxJQUFJLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDMUMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUN0QixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sR0FBRyxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pDLENBQUM7QUFDRixDQUFDO0FBU0QsTUFBTSxVQUFVLDZCQUE2QixDQUFDLE1BQVc7SUFDeEQsT0FBTyxhQUFhLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxXQUFXLFlBQVksS0FBSyxJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDbEksQ0FBQztBQUVELE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxNQUFXO0lBQ3hELE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQztBQUN6QixDQUFDO0FBRUQsTUFBTSxVQUFVLGlDQUFpQyxDQUFDLGNBQTJCLEVBQUUsSUFBb0I7SUFDbEcsT0FBTyxxQ0FBcUMsQ0FDM0MsY0FBYyxFQUNkLElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsaUNBQWlDLENBQUMsY0FBc0M7SUFDdkYsT0FBTyxjQUFjO1NBQ25CLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUNmLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUM3QixJQUFJLGVBQWUsQ0FDbEIsUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFDL0IsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUM3RixTQUFTLEVBQ1QsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQzdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMifQ==
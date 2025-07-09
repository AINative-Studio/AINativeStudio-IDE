/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextSearchMatch } from '../../../services/search/common/search.js';
import { Range } from '../../../../editor/common/core/range.js';
export function isINotebookFileMatchNoModel(object) {
    return 'cellResults' in object;
}
export const rawCellPrefix = 'rawCell#';
export function genericCellMatchesToTextSearchMatches(contentMatches, buffer) {
    let previousEndLine = -1;
    const contextGroupings = [];
    let currentContextGrouping = [];
    contentMatches.forEach((match) => {
        if (match.range.startLineNumber !== previousEndLine) {
            if (currentContextGrouping.length > 0) {
                contextGroupings.push([...currentContextGrouping]);
                currentContextGrouping = [];
            }
        }
        currentContextGrouping.push(match);
        previousEndLine = match.range.endLineNumber;
    });
    if (currentContextGrouping.length > 0) {
        contextGroupings.push([...currentContextGrouping]);
    }
    const textSearchResults = contextGroupings.map((grouping) => {
        const lineTexts = [];
        const firstLine = grouping[0].range.startLineNumber;
        const lastLine = grouping[grouping.length - 1].range.endLineNumber;
        for (let i = firstLine; i <= lastLine; i++) {
            lineTexts.push(buffer.getLineContent(i));
        }
        return new TextSearchMatch(lineTexts.join('\n') + '\n', grouping.map(m => new Range(m.range.startLineNumber - 1, m.range.startColumn - 1, m.range.endLineNumber - 1, m.range.endColumn - 1)));
    });
    return textSearchResults;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9jb21tb24vc2VhcmNoTm90ZWJvb2tIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQWdDLE1BQU0sMkNBQTJDLENBQUM7QUFDMUcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBZWhFLE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxNQUFrQjtJQUM3RCxPQUFPLGFBQWEsSUFBSSxNQUFNLENBQUM7QUFDaEMsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUM7QUFFeEMsTUFBTSxVQUFVLHFDQUFxQyxDQUFDLGNBQTJCLEVBQUUsTUFBMkI7SUFDN0csSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDekIsTUFBTSxnQkFBZ0IsR0FBa0IsRUFBRSxDQUFDO0lBQzNDLElBQUksc0JBQXNCLEdBQWdCLEVBQUUsQ0FBQztJQUU3QyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDaEMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsS0FBSyxlQUFlLEVBQUUsQ0FBQztZQUNyRCxJQUFJLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELHNCQUFzQixHQUFHLEVBQUUsQ0FBQztZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUVELHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQyxlQUFlLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7SUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsTUFBTSxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUMzRCxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7UUFDL0IsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFDcEQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztRQUNuRSxLQUFLLElBQUksQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUNELE9BQU8sSUFBSSxlQUFlLENBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUMzQixRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FDcEksQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxpQkFBaUIsQ0FBQztBQUMxQixDQUFDIn0=
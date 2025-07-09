/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as pfs from '../../../../base/node/pfs.js';
import { resultIsMatch } from '../common/search.js';
import { RipgrepTextSearchEngine } from './ripgrepTextSearchEngine.js';
import { NativeTextSearchManager } from './textSearchManager.js';
export class TextSearchEngineAdapter {
    constructor(query, numThreads) {
        this.query = query;
        this.numThreads = numThreads;
    }
    search(token, onResult, onMessage) {
        if ((!this.query.folderQueries || !this.query.folderQueries.length) && (!this.query.extraFileResources || !this.query.extraFileResources.length)) {
            return Promise.resolve({
                type: 'success',
                limitHit: false,
                stats: {
                    type: 'searchProcess'
                },
                messages: []
            });
        }
        const pretendOutputChannel = {
            appendLine(msg) {
                onMessage({ message: msg });
            }
        };
        const textSearchManager = new NativeTextSearchManager(this.query, new RipgrepTextSearchEngine(pretendOutputChannel, this.numThreads), pfs);
        return new Promise((resolve, reject) => {
            return textSearchManager
                .search(matches => {
                onResult(matches.map(fileMatchToSerialized));
            }, token)
                .then(c => resolve({ limitHit: c.limitHit ?? false, type: 'success', stats: c.stats, messages: [] }), reject);
        });
    }
}
function fileMatchToSerialized(match) {
    return {
        path: match.resource && match.resource.fsPath,
        results: match.results,
        numMatches: (match.results || []).reduce((sum, r) => {
            if (resultIsMatch(r)) {
                const m = r;
                return sum + m.rangeLocations.length;
            }
            else {
                return sum + 1;
            }
        }, 0)
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaEFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9ub2RlL3RleHRTZWFyY2hBZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUE4RyxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNoSyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVqRSxNQUFNLE9BQU8sdUJBQXVCO0lBRW5DLFlBQW9CLEtBQWlCLEVBQVUsVUFBbUI7UUFBOUMsVUFBSyxHQUFMLEtBQUssQ0FBWTtRQUFVLGVBQVUsR0FBVixVQUFVLENBQVM7SUFBSSxDQUFDO0lBRXZFLE1BQU0sQ0FBQyxLQUF3QixFQUFFLFFBQW1ELEVBQUUsU0FBOEM7UUFDbkksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNsSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQ3RCLElBQUksRUFBRSxTQUFTO2dCQUNmLFFBQVEsRUFBRSxLQUFLO2dCQUNmLEtBQUssRUFBRTtvQkFDTixJQUFJLEVBQUUsZUFBZTtpQkFDckI7Z0JBQ0QsUUFBUSxFQUFFLEVBQUU7YUFDWixDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxvQkFBb0IsR0FBRztZQUM1QixVQUFVLENBQUMsR0FBVztnQkFDckIsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDN0IsQ0FBQztTQUNELENBQUM7UUFDRixNQUFNLGlCQUFpQixHQUFHLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLHVCQUF1QixDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzSSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3RDLE9BQU8saUJBQWlCO2lCQUN0QixNQUFNLENBQ04sT0FBTyxDQUFDLEVBQUU7Z0JBQ1QsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQzlDLENBQUMsRUFDRCxLQUFLLENBQUM7aUJBQ04sSUFBSSxDQUNKLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQzlGLE1BQU0sQ0FBQyxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxTQUFTLHFCQUFxQixDQUFDLEtBQWlCO0lBQy9DLE9BQU87UUFDTixJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07UUFDN0MsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1FBQ3RCLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ25ELElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxHQUFxQixDQUFDLENBQUM7Z0JBQzlCLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1lBQ3RDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDTCxDQUFDO0FBQ0gsQ0FBQyJ9
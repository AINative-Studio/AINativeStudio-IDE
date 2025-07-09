/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { splitGlobAware } from '../../../../base/common/glob.js';
import { ReplEvaluationResult, ReplEvaluationInput } from '../common/replModel.js';
import { Variable } from '../common/debugModel.js';
export class ReplFilter {
    constructor() {
        this._parsedQueries = [];
    }
    static { this.matchQuery = matchesFuzzy; }
    set filterQuery(query) {
        this._parsedQueries = [];
        query = query.trim();
        if (query && query !== '') {
            const filters = splitGlobAware(query, ',').map(s => s.trim()).filter(s => !!s.length);
            for (const f of filters) {
                if (f.startsWith('\\')) {
                    this._parsedQueries.push({ type: 'include', query: f.slice(1) });
                }
                else if (f.startsWith('!')) {
                    this._parsedQueries.push({ type: 'exclude', query: f.slice(1) });
                }
                else {
                    this._parsedQueries.push({ type: 'include', query: f });
                }
            }
        }
    }
    filter(element, parentVisibility) {
        if (element instanceof ReplEvaluationInput || element instanceof ReplEvaluationResult || element instanceof Variable) {
            // Only filter the output events, everything else is visible https://github.com/microsoft/vscode/issues/105863
            return 1 /* TreeVisibility.Visible */;
        }
        let includeQueryPresent = false;
        let includeQueryMatched = false;
        const text = element.toString(true);
        for (const { type, query } of this._parsedQueries) {
            if (type === 'exclude' && ReplFilter.matchQuery(query, text)) {
                // If exclude query matches, ignore all other queries and hide
                return false;
            }
            else if (type === 'include') {
                includeQueryPresent = true;
                if (ReplFilter.matchQuery(query, text)) {
                    includeQueryMatched = true;
                }
            }
        }
        return includeQueryPresent ? includeQueryMatched : (typeof parentVisibility !== 'undefined' ? parentVisibility : 1 /* TreeVisibility.Visible */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEZpbHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3JlcGxGaWx0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFjLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUdqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFRbkQsTUFBTSxPQUFPLFVBQVU7SUFBdkI7UUFJUyxtQkFBYyxHQUFrQixFQUFFLENBQUM7SUE0QzVDLENBQUM7YUE5Q08sZUFBVSxHQUFHLFlBQVksQUFBZixDQUFnQjtJQUdqQyxJQUFJLFdBQVcsQ0FBQyxLQUFhO1FBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFckIsSUFBSSxLQUFLLElBQUksS0FBSyxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzNCLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0RixLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEUsQ0FBQztxQkFBTSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUFxQixFQUFFLGdCQUFnQztRQUM3RCxJQUFJLE9BQU8sWUFBWSxtQkFBbUIsSUFBSSxPQUFPLFlBQVksb0JBQW9CLElBQUksT0FBTyxZQUFZLFFBQVEsRUFBRSxDQUFDO1lBQ3RILDhHQUE4RztZQUM5RyxzQ0FBOEI7UUFDL0IsQ0FBQztRQUVELElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDO1FBRWhDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFcEMsS0FBSyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuRCxJQUFJLElBQUksS0FBSyxTQUFTLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsOERBQThEO2dCQUM5RCxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7aUJBQU0sSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQy9CLG1CQUFtQixHQUFHLElBQUksQ0FBQztnQkFDM0IsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4QyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7Z0JBQzVCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sbUJBQW1CLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sZ0JBQWdCLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLCtCQUF1QixDQUFDLENBQUM7SUFDMUksQ0FBQyJ9
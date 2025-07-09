/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy, matchesFuzzy2 } from '../../../../base/common/filters.js';
import * as strings from '../../../../base/common/strings.js';
export class FilterOptions {
    static { this._filter = matchesFuzzy2; }
    static { this._messageFilter = matchesFuzzy; }
    constructor(filter, showResolved, showUnresolved) {
        this.filter = filter;
        this.showResolved = true;
        this.showUnresolved = true;
        filter = filter.trim();
        this.showResolved = showResolved;
        this.showUnresolved = showUnresolved;
        const negate = filter.startsWith('!');
        this.textFilter = { text: (negate ? strings.ltrim(filter, '!') : filter).trim(), negate };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNGaWx0ZXJPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHNGaWx0ZXJPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBVyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUYsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxNQUFNLE9BQU8sYUFBYTthQUVULFlBQU8sR0FBWSxhQUFhLEFBQXpCLENBQTBCO2FBQ2pDLG1CQUFjLEdBQVksWUFBWSxBQUF4QixDQUF5QjtJQU12RCxZQUNVLE1BQWMsRUFDdkIsWUFBcUIsRUFDckIsY0FBdUI7UUFGZCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBTGYsaUJBQVksR0FBWSxJQUFJLENBQUM7UUFDN0IsbUJBQWMsR0FBWSxJQUFJLENBQUM7UUFRdkMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUVyQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUMzRixDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ILogService } from '../../../../platform/log/common/log.js';
import { SearchRange } from '../common/search.js';
import * as searchExtTypes from '../common/searchExtTypes.js';
export function anchorGlob(glob) {
    return glob.startsWith('**') || glob.startsWith('/') ? glob : `/${glob}`;
}
export function rangeToSearchRange(range) {
    return new SearchRange(range.start.line, range.start.character, range.end.line, range.end.character);
}
export function searchRangeToRange(range) {
    return new searchExtTypes.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
}
let OutputChannel = class OutputChannel {
    constructor(prefix, logService) {
        this.prefix = prefix;
        this.logService = logService;
    }
    appendLine(msg) {
        this.logService.debug(`${this.prefix}#search`, msg);
    }
};
OutputChannel = __decorate([
    __param(1, ILogService)
], OutputChannel);
export { OutputChannel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFNlYXJjaFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvbm9kZS9yaXBncmVwU2VhcmNoVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNsRCxPQUFPLEtBQUssY0FBYyxNQUFNLDZCQUE2QixDQUFDO0FBSTlELE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBWTtJQUN0QyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQzFFLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsS0FBMkI7SUFDN0QsT0FBTyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RHLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsS0FBa0I7SUFDcEQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pILENBQUM7QUFNTSxJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUFhO0lBQ3pCLFlBQW9CLE1BQWMsRUFBZ0MsVUFBdUI7UUFBckUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFnQyxlQUFVLEdBQVYsVUFBVSxDQUFhO0lBQUksQ0FBQztJQUU5RixVQUFVLENBQUMsR0FBVztRQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0QsQ0FBQTtBQU5ZLGFBQWE7SUFDWSxXQUFBLFdBQVcsQ0FBQTtHQURwQyxhQUFhLENBTXpCIn0=
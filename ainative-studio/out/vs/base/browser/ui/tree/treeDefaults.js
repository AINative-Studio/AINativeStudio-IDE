/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Action } from '../../../common/actions.js';
import * as nls from '../../../../nls.js';
export class CollapseAllAction extends Action {
    constructor(viewer, enabled) {
        super('vs.tree.collapse', nls.localize('collapse all', "Collapse All"), 'collapse-all', enabled);
        this.viewer = viewer;
    }
    async run() {
        this.viewer.collapseAll();
        this.viewer.setSelection([]);
        this.viewer.setFocus([]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZURlZmF1bHRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL3RyZWVEZWZhdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxNQUFNLE9BQU8saUJBQWlELFNBQVEsTUFBTTtJQUUzRSxZQUFvQixNQUE2QyxFQUFFLE9BQWdCO1FBQ2xGLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFEOUUsV0FBTSxHQUFOLE1BQU0sQ0FBdUM7SUFFakUsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHO1FBQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNEIn0=
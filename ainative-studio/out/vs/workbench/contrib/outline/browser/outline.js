/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var OutlineSortOrder;
(function (OutlineSortOrder) {
    OutlineSortOrder[OutlineSortOrder["ByPosition"] = 0] = "ByPosition";
    OutlineSortOrder[OutlineSortOrder["ByName"] = 1] = "ByName";
    OutlineSortOrder[OutlineSortOrder["ByKind"] = 2] = "ByKind";
})(OutlineSortOrder || (OutlineSortOrder = {}));
export var IOutlinePane;
(function (IOutlinePane) {
    IOutlinePane.Id = 'outline';
})(IOutlinePane || (IOutlinePane = {}));
// --- context keys
export const ctxFollowsCursor = new RawContextKey('outlineFollowsCursor', false);
export const ctxFilterOnType = new RawContextKey('outlineFiltersOnType', false);
export const ctxSortMode = new RawContextKey('outlineSortMode', 0 /* OutlineSortOrder.ByPosition */);
export const ctxAllCollapsed = new RawContextKey('outlineAllCollapsed', false);
export const ctxFocused = new RawContextKey('outlineFocused', true);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRsaW5lL2Jyb3dzZXIvb3V0bGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHckYsTUFBTSxDQUFOLElBQWtCLGdCQUlqQjtBQUpELFdBQWtCLGdCQUFnQjtJQUNqQyxtRUFBVSxDQUFBO0lBQ1YsMkRBQU0sQ0FBQTtJQUNOLDJEQUFNLENBQUE7QUFDUCxDQUFDLEVBSmlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFJakM7QUFRRCxNQUFNLEtBQVcsWUFBWSxDQUU1QjtBQUZELFdBQWlCLFlBQVk7SUFDZixlQUFFLEdBQUcsU0FBUyxDQUFDO0FBQzdCLENBQUMsRUFGZ0IsWUFBWSxLQUFaLFlBQVksUUFFNUI7QUFRRCxtQkFBbUI7QUFFbkIsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxhQUFhLENBQVUsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDMUYsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3pGLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGFBQWEsQ0FBbUIsaUJBQWlCLHNDQUE4QixDQUFDO0FBQy9HLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4RixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUMifQ==
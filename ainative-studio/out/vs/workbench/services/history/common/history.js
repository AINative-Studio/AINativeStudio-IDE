/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IHistoryService = createDecorator('historyService');
/**
 * Limit editor navigation to certain kinds.
 */
export var GoFilter;
(function (GoFilter) {
    /**
     * Navigate between editor navigation history
     * entries from any kind of navigation source.
     */
    GoFilter[GoFilter["NONE"] = 0] = "NONE";
    /**
     * Only navigate between editor navigation history
     * entries that were resulting from edits.
     */
    GoFilter[GoFilter["EDITS"] = 1] = "EDITS";
    /**
     * Only navigate between editor navigation history
     * entries that were resulting from navigations, such
     * as "Go to definition".
     */
    GoFilter[GoFilter["NAVIGATION"] = 2] = "NAVIGATION";
})(GoFilter || (GoFilter = {}));
/**
 * Limit editor navigation to certain scopes.
 */
export var GoScope;
(function (GoScope) {
    /**
     * Navigate across all editors and editor groups.
     */
    GoScope[GoScope["DEFAULT"] = 0] = "DEFAULT";
    /**
     * Navigate only in editors of the active editor group.
     */
    GoScope[GoScope["EDITOR_GROUP"] = 1] = "EDITOR_GROUP";
    /**
     * Navigate only in the active editor.
     */
    GoScope[GoScope["EDITOR"] = 2] = "EDITOR";
})(GoScope || (GoScope = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvaGlzdG9yeS9jb21tb24vaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFNN0YsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsZ0JBQWdCLENBQUMsQ0FBQztBQUVsRjs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixRQW9CakI7QUFwQkQsV0FBa0IsUUFBUTtJQUV6Qjs7O09BR0c7SUFDSCx1Q0FBSSxDQUFBO0lBRUo7OztPQUdHO0lBQ0gseUNBQUssQ0FBQTtJQUVMOzs7O09BSUc7SUFDSCxtREFBVSxDQUFBO0FBQ1gsQ0FBQyxFQXBCaUIsUUFBUSxLQUFSLFFBQVEsUUFvQnpCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsT0FnQmpCO0FBaEJELFdBQWtCLE9BQU87SUFFeEI7O09BRUc7SUFDSCwyQ0FBTyxDQUFBO0lBRVA7O09BRUc7SUFDSCxxREFBWSxDQUFBO0lBRVo7O09BRUc7SUFDSCx5Q0FBTSxDQUFBO0FBQ1AsQ0FBQyxFQWhCaUIsT0FBTyxLQUFQLE9BQU8sUUFnQnhCIn0=
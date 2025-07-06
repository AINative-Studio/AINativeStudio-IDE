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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2hpc3RvcnkvY29tbW9uL2hpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTTdGLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUM7QUFFbEY7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsUUFvQmpCO0FBcEJELFdBQWtCLFFBQVE7SUFFekI7OztPQUdHO0lBQ0gsdUNBQUksQ0FBQTtJQUVKOzs7T0FHRztJQUNILHlDQUFLLENBQUE7SUFFTDs7OztPQUlHO0lBQ0gsbURBQVUsQ0FBQTtBQUNYLENBQUMsRUFwQmlCLFFBQVEsS0FBUixRQUFRLFFBb0J6QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLE9BZ0JqQjtBQWhCRCxXQUFrQixPQUFPO0lBRXhCOztPQUVHO0lBQ0gsMkNBQU8sQ0FBQTtJQUVQOztPQUVHO0lBQ0gscURBQVksQ0FBQTtJQUVaOztPQUVHO0lBQ0gseUNBQU0sQ0FBQTtBQUNQLENBQUMsRUFoQmlCLE9BQU8sS0FBUCxPQUFPLFFBZ0J4QiJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../../base/common/arrays.js';
import * as nls from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { globMatchesResource, priorityToRank, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
export const ICustomEditorService = createDecorator('customEditorService');
export const CONTEXT_ACTIVE_CUSTOM_EDITOR_ID = new RawContextKey('activeCustomEditorId', '', {
    type: 'string',
    description: nls.localize('context.customEditor', "The viewType of the currently active custom editor."),
});
export const CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE = new RawContextKey('focusedCustomEditorIsEditable', false);
export var CustomEditorPriority;
(function (CustomEditorPriority) {
    CustomEditorPriority["default"] = "default";
    CustomEditorPriority["builtin"] = "builtin";
    CustomEditorPriority["option"] = "option";
})(CustomEditorPriority || (CustomEditorPriority = {}));
export class CustomEditorInfo {
    constructor(descriptor) {
        this.id = descriptor.id;
        this.displayName = descriptor.displayName;
        this.providerDisplayName = descriptor.providerDisplayName;
        this.priority = descriptor.priority;
        this.selector = descriptor.selector;
    }
    matches(resource) {
        return this.selector.some(selector => selector.filenamePattern && globMatchesResource(selector.filenamePattern, resource));
    }
}
export class CustomEditorInfoCollection {
    constructor(editors) {
        this.allEditors = distinct(editors, editor => editor.id);
    }
    get length() { return this.allEditors.length; }
    /**
     * Find the single default editor to use (if any) by looking at the editor's priority and the
     * other contributed editors.
     */
    get defaultEditor() {
        return this.allEditors.find(editor => {
            switch (editor.priority) {
                case RegisteredEditorPriority.default:
                case RegisteredEditorPriority.builtin:
                    // A default editor must have higher priority than all other contributed editors.
                    return this.allEditors.every(otherEditor => otherEditor === editor || isLowerPriority(otherEditor, editor));
                default:
                    return false;
            }
        });
    }
    /**
     * Find the best available editor to use.
     *
     * Unlike the `defaultEditor`, a bestAvailableEditor can exist even if there are other editors with
     * the same priority.
     */
    get bestAvailableEditor() {
        const editors = Array.from(this.allEditors).sort((a, b) => {
            return priorityToRank(a.priority) - priorityToRank(b.priority);
        });
        return editors[0];
    }
}
function isLowerPriority(otherEditor, editor) {
    return priorityToRank(otherEditor.priority) < priorityToRank(editor.priority);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2N1c3RvbUVkaXRvci9jb21tb24vY3VzdG9tRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUs3RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRXpJLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQztBQUVqRyxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLGFBQWEsQ0FBUyxzQkFBc0IsRUFBRSxFQUFFLEVBQUU7SUFDcEcsSUFBSSxFQUFFLFFBQVE7SUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxxREFBcUQsQ0FBQztDQUN4RyxDQUFDLENBQUM7QUFFSCxNQUFNLENBQUMsTUFBTSx5Q0FBeUMsR0FBRyxJQUFJLGFBQWEsQ0FBVSwrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQztBQXFENUgsTUFBTSxDQUFOLElBQWtCLG9CQUlqQjtBQUpELFdBQWtCLG9CQUFvQjtJQUNyQywyQ0FBbUIsQ0FBQTtJQUNuQiwyQ0FBbUIsQ0FBQTtJQUNuQix5Q0FBaUIsQ0FBQTtBQUNsQixDQUFDLEVBSmlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFJckM7QUFjRCxNQUFNLE9BQU8sZ0JBQWdCO0lBUTVCLFlBQVksVUFBa0M7UUFDN0MsSUFBSSxDQUFDLEVBQUUsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQztRQUMxQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1FBQzFELElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQztRQUNwQyxJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUM7SUFDckMsQ0FBQztJQUVELE9BQU8sQ0FBQyxRQUFhO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBZSxJQUFJLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM1SCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMEJBQTBCO0lBSXRDLFlBQ0MsT0FBb0M7UUFFcEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxJQUFXLE1BQU0sS0FBYSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUU5RDs7O09BR0c7SUFDSCxJQUFXLGFBQWE7UUFDdkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNwQyxRQUFRLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDekIsS0FBSyx3QkFBd0IsQ0FBQyxPQUFPLENBQUM7Z0JBQ3RDLEtBQUssd0JBQXdCLENBQUMsT0FBTztvQkFDcEMsaUZBQWlGO29CQUNqRixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQzFDLFdBQVcsS0FBSyxNQUFNLElBQUksZUFBZSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUVsRTtvQkFDQyxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILElBQVcsbUJBQW1CO1FBQzdCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6RCxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7Q0FDRDtBQUVELFNBQVMsZUFBZSxDQUFDLFdBQTZCLEVBQUUsTUFBd0I7SUFDL0UsT0FBTyxjQUFjLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0UsQ0FBQyJ9
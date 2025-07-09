/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
class InspectKeyMap extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.inspectKeyMappings',
            title: localize2('workbench.action.inspectKeyMap', 'Inspect Key Mappings'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor, editor) {
        const keybindingService = accessor.get(IKeybindingService);
        const editorService = accessor.get(IEditorService);
        editorService.openEditor({ resource: undefined, contents: keybindingService._dumpDebugInfo(), options: { pinned: true } });
    }
}
registerAction2(InspectKeyMap);
class InspectKeyMapJSON extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.inspectKeyMappingsJSON',
            title: localize2('workbench.action.inspectKeyMapJSON', 'Inspect Key Mappings (JSON)'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const keybindingService = accessor.get(IKeybindingService);
        await editorService.openEditor({ resource: undefined, contents: keybindingService._dumpDebugInfoJSON(), options: { pinned: true } });
    }
}
registerAction2(InspectKeyMapJSON);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdEtleWJpbmRpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9pbnNwZWN0S2V5YmluZGluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRy9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRixNQUFNLGFBQWMsU0FBUSxPQUFPO0lBRWxDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFDQUFxQztZQUN6QyxLQUFLLEVBQUUsU0FBUyxDQUFDLGdDQUFnQyxFQUFFLHNCQUFzQixDQUFDO1lBQzFFLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUNsRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRW5ELGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVILENBQUM7Q0FDRDtBQUVELGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUUvQixNQUFNLGlCQUFrQixTQUFRLE9BQU87SUFFdEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUNBQXlDO1lBQzdDLEtBQUssRUFBRSxTQUFTLENBQUMsb0NBQW9DLEVBQUUsNkJBQTZCLENBQUM7WUFDckYsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDNUMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUUzRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdEksQ0FBQztDQUNEO0FBRUQsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUMifQ==
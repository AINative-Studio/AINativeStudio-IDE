/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sequence } from '../../../../base/common/async.js';
import { Schemas } from '../../../../base/common/network.js';
// Commands
export function revealResourcesInOS(resources, nativeHostService, workspaceContextService) {
    if (resources.length) {
        sequence(resources.map(r => async () => {
            if (r.scheme === Schemas.file || r.scheme === Schemas.vscodeUserData) {
                nativeHostService.showItemInFolder(r.with({ scheme: Schemas.file }).fsPath);
            }
        }));
    }
    else if (workspaceContextService.getWorkspace().folders.length) {
        const uri = workspaceContextService.getWorkspace().folders[0].uri;
        if (uri.scheme === Schemas.file) {
            nativeHostService.showItemInFolder(uri.fsPath);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2VsZWN0cm9uLXNhbmRib3gvZmlsZUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHN0QsV0FBVztBQUVYLE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxTQUFnQixFQUFFLGlCQUFxQyxFQUFFLHVCQUFpRDtJQUM3SSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QixRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3RDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN0RSxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztTQUFNLElBQUksdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xFLE1BQU0sR0FBRyxHQUFHLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDbEUsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDIn0=
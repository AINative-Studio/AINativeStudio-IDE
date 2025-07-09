/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getRemotes } from '../../../../platform/extensionManagement/common/configRemotes.js';
export const IWorkspaceTagsService = createDecorator('workspaceTagsService');
export async function getHashedRemotesFromConfig(text, stripEndingDotGit = false, sha1Hex) {
    return Promise.all(getRemotes(text, stripEndingDotGit).map(remote => sha1Hex(remote)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YWdzL2NvbW1vbi93b3Jrc3BhY2VUYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFJOUYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBZ0JwRyxNQUFNLENBQUMsS0FBSyxVQUFVLDBCQUEwQixDQUFDLElBQVksRUFBRSxvQkFBNkIsS0FBSyxFQUFFLE9BQXlDO0lBQzNJLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDIn0=
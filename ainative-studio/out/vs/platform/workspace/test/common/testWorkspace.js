/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { toWorkspaceFolder, Workspace as BaseWorkspace } from '../../common/workspace.js';
export class Workspace extends BaseWorkspace {
    constructor(id, folders = [], configuration = null, ignorePathCasing = () => !isLinux) {
        super(id, folders, false, configuration, ignorePathCasing);
    }
}
const wsUri = URI.file(isWindows ? 'C:\\testWorkspace' : '/testWorkspace');
export const TestWorkspace = testWorkspace(wsUri);
export function testWorkspace(resource) {
    return new Workspace(resource.toString(), [toWorkspaceFolder(resource)]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2UvdGVzdC9jb21tb24vdGVzdFdvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxJQUFJLGFBQWEsRUFBbUIsTUFBTSwyQkFBMkIsQ0FBQztBQUUzRyxNQUFNLE9BQU8sU0FBVSxTQUFRLGFBQWE7SUFDM0MsWUFDQyxFQUFVLEVBQ1YsVUFBNkIsRUFBRSxFQUMvQixnQkFBNEIsSUFBSSxFQUNoQyxtQkFBMEMsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPO1FBRXhELEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUM1RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDM0UsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVsRCxNQUFNLFVBQVUsYUFBYSxDQUFDLFFBQWE7SUFDMUMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUUsQ0FBQyJ9
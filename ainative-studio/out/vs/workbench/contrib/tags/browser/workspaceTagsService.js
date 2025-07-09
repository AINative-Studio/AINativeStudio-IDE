/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkspaceTagsService } from '../common/workspaceTags.js';
export class NoOpWorkspaceTagsService {
    getTags() {
        return Promise.resolve({});
    }
    async getTelemetryWorkspaceId(workspace, state) {
        return undefined;
    }
    getHashedRemotesFromUri(workspaceUri, stripEndingDotGit) {
        return Promise.resolve([]);
    }
}
registerSingleton(IWorkspaceTagsService, NoOpWorkspaceTagsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFnc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFncy9icm93c2VyL3dvcmtzcGFjZVRhZ3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQVEsTUFBTSw0QkFBNEIsQ0FBQztBQUV6RSxNQUFNLE9BQU8sd0JBQXdCO0lBSXBDLE9BQU87UUFDTixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxTQUFxQixFQUFFLEtBQXFCO1FBQ3pFLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxZQUFpQixFQUFFLGlCQUEyQjtRQUNyRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsd0JBQXdCLG9DQUE0QixDQUFDIn0=
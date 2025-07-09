/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
export function isVirtualResource(resource) {
    return resource.scheme !== Schemas.file && resource.scheme !== Schemas.vscodeRemote;
}
export function getVirtualWorkspaceLocation(workspace) {
    if (workspace.folders.length) {
        return workspace.folders.every(f => isVirtualResource(f.uri)) ? workspace.folders[0].uri : undefined;
    }
    else if (workspace.configuration && isVirtualResource(workspace.configuration)) {
        return workspace.configuration;
    }
    return undefined;
}
export function getVirtualWorkspaceScheme(workspace) {
    return getVirtualWorkspaceLocation(workspace)?.scheme;
}
export function getVirtualWorkspaceAuthority(workspace) {
    return getVirtualWorkspaceLocation(workspace)?.authority;
}
export function isVirtualWorkspace(workspace) {
    return getVirtualWorkspaceLocation(workspace) !== undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlydHVhbFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2UvY29tbW9uL3ZpcnR1YWxXb3Jrc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBSTFELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxRQUFhO0lBQzlDLE9BQU8sUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksQ0FBQztBQUNyRixDQUFDO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFNBQXFCO0lBQ2hFLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QixPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDdEcsQ0FBQztTQUFNLElBQUksU0FBUyxDQUFDLGFBQWEsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztRQUNsRixPQUFPLFNBQVMsQ0FBQyxhQUFhLENBQUM7SUFDaEMsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsU0FBcUI7SUFDOUQsT0FBTywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDdkQsQ0FBQztBQUVELE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxTQUFxQjtJQUNqRSxPQUFPLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQztBQUMxRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFNBQXFCO0lBQ3ZELE9BQU8sMkJBQTJCLENBQUMsU0FBUyxDQUFDLEtBQUssU0FBUyxDQUFDO0FBQzdELENBQUMifQ==
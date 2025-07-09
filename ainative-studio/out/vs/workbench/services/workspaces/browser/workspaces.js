/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hash } from '../../../../base/common/hash.js';
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function getWorkspaceIdentifier(workspaceUri) {
    return {
        id: getWorkspaceId(workspaceUri),
        configPath: workspaceUri
    };
}
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function getSingleFolderWorkspaceIdentifier(folderUri) {
    return {
        id: getWorkspaceId(folderUri),
        uri: folderUri
    };
}
function getWorkspaceId(uri) {
    return hash(uri.toString()).toString(16);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9icm93c2VyL3dvcmtzcGFjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFDekQseURBQXlEO0FBRXpELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxZQUFpQjtJQUN2RCxPQUFPO1FBQ04sRUFBRSxFQUFFLGNBQWMsQ0FBQyxZQUFZLENBQUM7UUFDaEMsVUFBVSxFQUFFLFlBQVk7S0FDeEIsQ0FBQztBQUNILENBQUM7QUFFRCx5REFBeUQ7QUFDekQseURBQXlEO0FBQ3pELHlEQUF5RDtBQUV6RCxNQUFNLFVBQVUsa0NBQWtDLENBQUMsU0FBYztJQUNoRSxPQUFPO1FBQ04sRUFBRSxFQUFFLGNBQWMsQ0FBQyxTQUFTLENBQUM7UUFDN0IsR0FBRyxFQUFFLFNBQVM7S0FDZCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLEdBQVE7SUFDL0IsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzFDLENBQUMifQ==
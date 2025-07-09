/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
export function isEmptyWindowBackupInfo(obj) {
    const candidate = obj;
    return typeof candidate?.backupFolder === 'string';
}
export function deserializeWorkspaceInfos(serializedBackupWorkspaces) {
    let workspaceBackupInfos = [];
    try {
        if (Array.isArray(serializedBackupWorkspaces.workspaces)) {
            workspaceBackupInfos = serializedBackupWorkspaces.workspaces.map(workspace => ({
                workspace: {
                    id: workspace.id,
                    configPath: URI.parse(workspace.configURIPath)
                },
                remoteAuthority: workspace.remoteAuthority
            }));
        }
    }
    catch (e) {
        // ignore URI parsing exceptions
    }
    return workspaceBackupInfos;
}
export function deserializeFolderInfos(serializedBackupWorkspaces) {
    let folderBackupInfos = [];
    try {
        if (Array.isArray(serializedBackupWorkspaces.folders)) {
            folderBackupInfos = serializedBackupWorkspaces.folders.map(folder => ({
                folderUri: URI.parse(folder.folderUri),
                remoteAuthority: folder.remoteAuthority
            }));
        }
    }
    catch (e) {
        // ignore URI parsing exceptions
    }
    return folderBackupInfos;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2JhY2t1cC9ub2RlL2JhY2t1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFPbEQsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEdBQVk7SUFDbkQsTUFBTSxTQUFTLEdBQUcsR0FBeUMsQ0FBQztJQUU1RCxPQUFPLE9BQU8sU0FBUyxFQUFFLFlBQVksS0FBSyxRQUFRLENBQUM7QUFDcEQsQ0FBQztBQVFELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQywwQkFBdUQ7SUFDaEcsSUFBSSxvQkFBb0IsR0FBMkIsRUFBRSxDQUFDO0lBQ3RELElBQUksQ0FBQztRQUNKLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzFELG9CQUFvQixHQUFHLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUM3RTtnQkFDQyxTQUFTLEVBQUU7b0JBQ1YsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFO29CQUNoQixVQUFVLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDO2lCQUM5QztnQkFDRCxlQUFlLEVBQUUsU0FBUyxDQUFDLGVBQWU7YUFDMUMsQ0FDRCxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWixnQ0FBZ0M7SUFDakMsQ0FBQztJQUVELE9BQU8sb0JBQW9CLENBQUM7QUFDN0IsQ0FBQztBQU9ELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQywwQkFBdUQ7SUFDN0YsSUFBSSxpQkFBaUIsR0FBd0IsRUFBRSxDQUFDO0lBQ2hELElBQUksQ0FBQztRQUNKLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3ZELGlCQUFpQixHQUFHLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUNwRTtnQkFDQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO2dCQUN0QyxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWU7YUFDdkMsQ0FDRCxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWixnQ0FBZ0M7SUFDakMsQ0FBQztJQUVELE9BQU8saUJBQWlCLENBQUM7QUFDMUIsQ0FBQyJ9
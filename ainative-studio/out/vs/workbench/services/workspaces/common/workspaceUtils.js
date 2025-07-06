/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
export function isChatTransferredWorkspace(workspace, storageService) {
    const workspaceUri = workspace.folders[0]?.uri;
    if (!workspaceUri) {
        return false;
    }
    const chatWorkspaceTransfer = storageService.getObject('chat.workspaceTransfer', 0 /* StorageScope.PROFILE */, []);
    const toWorkspace = chatWorkspaceTransfer.map((item) => {
        return { toWorkspace: URI.from(item.toWorkspace) };
    });
    return toWorkspace.some(item => item.toWorkspace.toString() === workspaceUri.toString());
}
export async function areWorkspaceFoldersEmpty(workspace, fileService) {
    for (const folder of workspace.folders) {
        const folderStat = await fileService.resolve(folder.uri);
        if (folderStat.children && folderStat.children.length > 0) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9jb21tb24vd29ya3NwYWNlVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBS3JELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxTQUFxQixFQUFFLGNBQStCO0lBQ2hHLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO0lBQy9DLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNuQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxNQUFNLHFCQUFxQixHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLGdDQUF3QixFQUFFLENBQUMsQ0FBQztJQUMzRyxNQUFNLFdBQVcsR0FBMkIscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUU7UUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO0lBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUMxRixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSx3QkFBd0IsQ0FBQyxTQUFxQixFQUFFLFdBQXlCO0lBQzlGLEtBQUssTUFBTSxNQUFNLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekQsSUFBSSxVQUFVLENBQUMsUUFBUSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==
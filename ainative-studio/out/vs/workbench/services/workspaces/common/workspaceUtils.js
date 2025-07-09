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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvY29tbW9uL3dvcmtzcGFjZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUtyRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsU0FBcUIsRUFBRSxjQUErQjtJQUNoRyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztJQUMvQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsTUFBTSxxQkFBcUIsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLHdCQUF3QixnQ0FBd0IsRUFBRSxDQUFDLENBQUM7SUFDM0csTUFBTSxXQUFXLEdBQTJCLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFO1FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztJQUNwRCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFDMUYsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsd0JBQXdCLENBQUMsU0FBcUIsRUFBRSxXQUF5QjtJQUM5RixLQUFLLE1BQU0sTUFBTSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN4QyxNQUFNLFVBQVUsR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pELElBQUksVUFBVSxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMzRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIn0=
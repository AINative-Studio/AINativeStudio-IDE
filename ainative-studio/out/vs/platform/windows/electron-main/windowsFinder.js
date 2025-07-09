/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier } from '../../workspace/common/workspace.js';
export async function findWindowOnFile(windows, fileUri, localWorkspaceResolver) {
    // First check for windows with workspaces that have a parent folder of the provided path opened
    for (const window of windows) {
        const workspace = window.openedWorkspace;
        if (isWorkspaceIdentifier(workspace)) {
            const resolvedWorkspace = await localWorkspaceResolver(workspace);
            // resolved workspace: folders are known and can be compared with
            if (resolvedWorkspace) {
                if (resolvedWorkspace.folders.some(folder => extUriBiasedIgnorePathCase.isEqualOrParent(fileUri, folder.uri))) {
                    return window;
                }
            }
            // unresolved: can only compare with workspace location
            else {
                if (extUriBiasedIgnorePathCase.isEqualOrParent(fileUri, workspace.configPath)) {
                    return window;
                }
            }
        }
    }
    // Then go with single folder windows that are parent of the provided file path
    const singleFolderWindowsOnFilePath = windows.filter(window => isSingleFolderWorkspaceIdentifier(window.openedWorkspace) && extUriBiasedIgnorePathCase.isEqualOrParent(fileUri, window.openedWorkspace.uri));
    if (singleFolderWindowsOnFilePath.length) {
        return singleFolderWindowsOnFilePath.sort((windowA, windowB) => -(windowA.openedWorkspace.uri.path.length - windowB.openedWorkspace.uri.path.length))[0];
    }
    return undefined;
}
export function findWindowOnWorkspaceOrFolder(windows, folderOrWorkspaceConfigUri) {
    for (const window of windows) {
        // check for workspace config path
        if (isWorkspaceIdentifier(window.openedWorkspace) && extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.configPath, folderOrWorkspaceConfigUri)) {
            return window;
        }
        // check for folder path
        if (isSingleFolderWorkspaceIdentifier(window.openedWorkspace) && extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.uri, folderOrWorkspaceConfigUri)) {
            return window;
        }
    }
    return undefined;
}
export function findWindowOnExtensionDevelopmentPath(windows, extensionDevelopmentPaths) {
    const matches = (uriString) => {
        return extensionDevelopmentPaths.some(path => extUriBiasedIgnorePathCase.isEqual(URI.file(path), URI.file(uriString)));
    };
    for (const window of windows) {
        // match on extension development path. the path can be one or more paths
        // so we check if any of the paths match on any of the provided ones
        if (window.config?.extensionDevelopmentPath?.some(path => matches(path))) {
            return window;
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0ZpbmRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3dzL2VsZWN0cm9uLW1haW4vd2luZG93c0ZpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFbEQsT0FBTyxFQUF3RCxpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBd0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzTCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUFDLE9BQXNCLEVBQUUsT0FBWSxFQUFFLHNCQUFvRztJQUVoTCxnR0FBZ0c7SUFDaEcsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM5QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDO1FBQ3pDLElBQUkscUJBQXFCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFbEUsaUVBQWlFO1lBQ2pFLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsMEJBQTBCLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUMvRyxPQUFPLE1BQU0sQ0FBQztnQkFDZixDQUFDO1lBQ0YsQ0FBQztZQUVELHVEQUF1RDtpQkFDbEQsQ0FBQztnQkFDTCxJQUFJLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxP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
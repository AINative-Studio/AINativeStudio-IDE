/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createHash } from 'crypto';
import { Schemas } from '../../../base/common/network.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { originalFSPath } from '../../../base/common/resources.js';
/**
 * Length of workspace identifiers that are not empty. Those are
 * MD5 hashes (128bits / 4 due to hex presentation).
 */
export const NON_EMPTY_WORKSPACE_ID_LENGTH = 128 / 4;
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function getWorkspaceIdentifier(configPath) {
    function getWorkspaceId() {
        let configPathStr = configPath.scheme === Schemas.file ? originalFSPath(configPath) : configPath.toString();
        if (!isLinux) {
            configPathStr = configPathStr.toLowerCase(); // sanitize for platform file system
        }
        return createHash('md5').update(configPathStr).digest('hex'); // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
    }
    return {
        id: getWorkspaceId(),
        configPath
    };
}
export function getSingleFolderWorkspaceIdentifier(folderUri, folderStat) {
    function getFolderId() {
        // Remote: produce a hash from the entire URI
        if (folderUri.scheme !== Schemas.file) {
            return createHash('md5').update(folderUri.toString()).digest('hex'); // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
        }
        // Local: we use the ctime as extra salt to the
        // identifier so that folders getting recreated
        // result in a different identifier. However, if
        // the stat is not provided we return `undefined`
        // to ensure identifiers are stable for the given
        // URI.
        if (!folderStat) {
            return undefined;
        }
        let ctime;
        if (isLinux) {
            ctime = folderStat.ino; // Linux: birthtime is ctime, so we cannot use it! We use the ino instead!
        }
        else if (isMacintosh) {
            ctime = folderStat.birthtime.getTime(); // macOS: birthtime is fine to use as is
        }
        else if (isWindows) {
            if (typeof folderStat.birthtimeMs === 'number') {
                ctime = Math.floor(folderStat.birthtimeMs); // Windows: fix precision issue in node.js 8.x to get 7.x results (see https://github.com/nodejs/node/issues/19897)
            }
            else {
                ctime = folderStat.birthtime.getTime();
            }
        }
        return createHash('md5').update(folderUri.fsPath).update(ctime ? String(ctime) : '').digest('hex'); // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
    }
    const folderId = getFolderId();
    if (typeof folderId === 'string') {
        return {
            id: folderId,
            uri: folderUri
        };
    }
    return undefined; // invalid folder
}
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function createEmptyWorkspaceIdentifier() {
    return {
        id: (Date.now() + Math.round(Math.random() * 1000)).toString()
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL25vZGUvd29ya3NwYWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBRXBDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFJbkU7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUVyRCx5REFBeUQ7QUFDekQseURBQXlEO0FBQ3pELHlEQUF5RDtBQUV6RCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsVUFBZTtJQUVyRCxTQUFTLGNBQWM7UUFDdEIsSUFBSSxhQUFhLEdBQUcsVUFBVSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM1RyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxhQUFhLEdBQUcsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsb0NBQW9DO1FBQ2xGLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsc0VBQXNFO0lBQ3JJLENBQUM7SUFFRCxPQUFPO1FBQ04sRUFBRSxFQUFFLGNBQWMsRUFBRTtRQUNwQixVQUFVO0tBQ1YsQ0FBQztBQUNILENBQUM7QUFRRCxNQUFNLFVBQVUsa0NBQWtDLENBQUMsU0FBYyxFQUFFLFVBQWtCO0lBRXBGLFNBQVMsV0FBVztRQUVuQiw2Q0FBNkM7UUFDN0MsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN2QyxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsc0VBQXNFO1FBQzVJLENBQUM7UUFFRCwrQ0FBK0M7UUFDL0MsK0NBQStDO1FBQy9DLGdEQUFnRDtRQUNoRCxpREFBaUQ7UUFDakQsaURBQWlEO1FBQ2pELE9BQU87UUFFUCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksS0FBeUIsQ0FBQztRQUM5QixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQywwRUFBMEU7UUFDbkcsQ0FBQzthQUFNLElBQUksV0FBVyxFQUFFLENBQUM7WUFDeEIsS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyx3Q0FBd0M7UUFDakYsQ0FBQzthQUFNLElBQUksU0FBUyxFQUFFLENBQUM7WUFDdEIsSUFBSSxPQUFPLFVBQVUsQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2hELEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1IQUFtSDtZQUNoSyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsc0VBQXNFO0lBQzNLLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxXQUFXLEVBQUUsQ0FBQztJQUMvQixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLE9BQU87WUFDTixFQUFFLEVBQUUsUUFBUTtZQUNaLEdBQUcsRUFBRSxTQUFTO1NBQ2QsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQyxDQUFDLGlCQUFpQjtBQUNwQyxDQUFDO0FBRUQseURBQXlEO0FBQ3pELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFFekQsTUFBTSxVQUFVLDhCQUE4QjtJQUM3QyxPQUFPO1FBQ04sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO0tBQzlELENBQUM7QUFDSCxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isUNC } from '../../../../base/common/extpath.js';
import { Schemas } from '../../../../base/common/network.js';
import { normalize, sep } from '../../../../base/common/path.js';
import { URI } from '../../../../base/common/uri.js';
import { FileOperationError } from '../../../../platform/files/common/files.js';
import { getWebviewContentMimeType } from '../../../../platform/webview/common/mimeTypes.js';
export var WebviewResourceResponse;
(function (WebviewResourceResponse) {
    let Type;
    (function (Type) {
        Type[Type["Success"] = 0] = "Success";
        Type[Type["Failed"] = 1] = "Failed";
        Type[Type["AccessDenied"] = 2] = "AccessDenied";
        Type[Type["NotModified"] = 3] = "NotModified";
    })(Type = WebviewResourceResponse.Type || (WebviewResourceResponse.Type = {}));
    class StreamSuccess {
        constructor(stream, etag, mtime, mimeType) {
            this.stream = stream;
            this.etag = etag;
            this.mtime = mtime;
            this.mimeType = mimeType;
            this.type = Type.Success;
        }
    }
    WebviewResourceResponse.StreamSuccess = StreamSuccess;
    WebviewResourceResponse.Failed = { type: Type.Failed };
    WebviewResourceResponse.AccessDenied = { type: Type.AccessDenied };
    class NotModified {
        constructor(mimeType, mtime) {
            this.mimeType = mimeType;
            this.mtime = mtime;
            this.type = Type.NotModified;
        }
    }
    WebviewResourceResponse.NotModified = NotModified;
})(WebviewResourceResponse || (WebviewResourceResponse = {}));
export async function loadLocalResource(requestUri, options, fileService, logService, token) {
    logService.debug(`loadLocalResource - begin. requestUri=${requestUri}`);
    const resourceToLoad = getResourceToLoad(requestUri, options.roots);
    logService.debug(`loadLocalResource - found resource to load. requestUri=${requestUri}, resourceToLoad=${resourceToLoad}`);
    if (!resourceToLoad) {
        return WebviewResourceResponse.AccessDenied;
    }
    const mime = getWebviewContentMimeType(requestUri); // Use the original path for the mime
    try {
        const result = await fileService.readFileStream(resourceToLoad, { etag: options.ifNoneMatch }, token);
        return new WebviewResourceResponse.StreamSuccess(result.value, result.etag, result.mtime, mime);
    }
    catch (err) {
        if (err instanceof FileOperationError) {
            const result = err.fileOperationResult;
            // NotModified status is expected and can be handled gracefully
            if (result === 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */) {
                return new WebviewResourceResponse.NotModified(mime, err.options?.mtime);
            }
        }
        // Otherwise the error is unexpected.
        logService.debug(`loadLocalResource - Error using fileReader. requestUri=${requestUri}`);
        console.log(err);
        return WebviewResourceResponse.Failed;
    }
}
function getResourceToLoad(requestUri, roots) {
    for (const root of roots) {
        if (containsResource(root, requestUri)) {
            return normalizeResourcePath(requestUri);
        }
    }
    return undefined;
}
function containsResource(root, resource) {
    if (root.scheme !== resource.scheme) {
        return false;
    }
    let resourceFsPath = normalize(resource.fsPath);
    let rootPath = normalize(root.fsPath + (root.fsPath.endsWith(sep) ? '' : sep));
    if (isUNC(root.fsPath) && isUNC(resource.fsPath)) {
        rootPath = rootPath.toLowerCase();
        resourceFsPath = resourceFsPath.toLowerCase();
    }
    return resourceFsPath.startsWith(rootPath);
}
function normalizeResourcePath(resource) {
    // Rewrite remote uris to a path that the remote file system can understand
    if (resource.scheme === Schemas.vscodeRemote) {
        return URI.from({
            scheme: Schemas.vscodeRemote,
            authority: resource.authority,
            path: '/vscode-resource',
            query: JSON.stringify({
                requestResourcePath: resource.path
            })
        });
    }
    return resource;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VMb2FkaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci9yZXNvdXJjZUxvYWRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQXdELE1BQU0sNENBQTRDLENBQUM7QUFFdEksT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFN0YsTUFBTSxLQUFXLHVCQUF1QixDQTJCdkM7QUEzQkQsV0FBaUIsdUJBQXVCO0lBQ3ZDLElBQVksSUFBbUQ7SUFBL0QsV0FBWSxJQUFJO1FBQUcscUNBQU8sQ0FBQTtRQUFFLG1DQUFNLENBQUE7UUFBRSwrQ0FBWSxDQUFBO1FBQUUsNkNBQVcsQ0FBQTtJQUFDLENBQUMsRUFBbkQsSUFBSSxHQUFKLDRCQUFJLEtBQUosNEJBQUksUUFBK0M7SUFFL0QsTUFBYSxhQUFhO1FBR3pCLFlBQ2lCLE1BQThCLEVBQzlCLElBQXdCLEVBQ3hCLEtBQXlCLEVBQ3pCLFFBQWdCO1lBSGhCLFdBQU0sR0FBTixNQUFNLENBQXdCO1lBQzlCLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQ3hCLFVBQUssR0FBTCxLQUFLLENBQW9CO1lBQ3pCLGFBQVEsR0FBUixRQUFRLENBQVE7WUFOeEIsU0FBSSxHQUFHLElBQUksQ0FBQyxP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
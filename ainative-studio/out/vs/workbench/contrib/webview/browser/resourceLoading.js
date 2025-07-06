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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VMb2FkaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9icm93c2VyL3Jlc291cmNlTG9hZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBd0QsTUFBTSw0Q0FBNEMsQ0FBQztBQUV0SSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU3RixNQUFNLEtBQVcsdUJBQXVCLENBMkJ2QztBQTNCRCxXQUFpQix1QkFBdUI7SUFDdkMsSUFBWSxJQUFtRDtJQUEvRCxXQUFZLElBQUk7UUFBRyxxQ0FBTyxDQUFBO1FBQUUsbUNBQU0sQ0FBQTtRQUFFLCtDQUFZLENBQUE7UUFBRSw2Q0FBVyxDQUFBO0lBQUMsQ0FBQyxFQUFuRCxJQUFJLEdBQUosNEJBQUksS0FBSiw0QkFBSSxRQUErQztJQUUvRCxNQUFhLGFBQWE7UUFHekIsWUFDaUIsTUFBOEIsRUFDOUIsSUFBd0IsRUFDeEIsS0FBeUIsRUFDekIsUUFBZ0I7WUFIaEIsV0FBTSxHQUFOLE1BQU0sQ0FBd0I7WUFDOUIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFDeEIsVUFBSyxHQUFMLEtBQUssQ0FBb0I7WUFDekIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtZQU54QixTQUFJLEdBQUcsSUFBSSxDQUFDLE9B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
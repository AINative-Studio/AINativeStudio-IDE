/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
/**
 * Root from which resources in webviews are loaded.
 *
 * This is hardcoded because we never expect to actually hit it. Instead these requests
 * should always go to a service worker.
 */
export const webviewResourceBaseHost = 'vscode-cdn.net';
export const webviewRootResourceAuthority = `vscode-resource.${webviewResourceBaseHost}`;
export const webviewGenericCspSource = `'self' https://*.${webviewResourceBaseHost}`;
/**
 * Construct a uri that can load resources inside a webview
 *
 * We encode the resource component of the uri so that on the main thread
 * we know where to load the resource from (remote or truly local):
 *
 * ```txt
 * ${scheme}+${resource-authority}.vscode-resource.vscode-cdn.net/${path}
 * ```
 *
 * @param resource Uri of the resource to load.
 * @param remoteInfo Optional information about the remote that specifies where `resource` should be resolved from.
 */
export function asWebviewUri(resource, remoteInfo) {
    if (resource.scheme === Schemas.http || resource.scheme === Schemas.https) {
        return resource;
    }
    if (remoteInfo && remoteInfo.authority && remoteInfo.isRemote && resource.scheme === Schemas.file) {
        resource = URI.from({
            scheme: Schemas.vscodeRemote,
            authority: remoteInfo.authority,
            path: resource.path,
        });
    }
    return URI.from({
        scheme: Schemas.https,
        authority: `${resource.scheme}+${encodeAuthority(resource.authority)}.${webviewRootResourceAuthority}`,
        path: resource.path,
        fragment: resource.fragment,
        query: resource.query,
    });
}
function encodeAuthority(authority) {
    return authority.replace(/./g, char => {
        const code = char.charCodeAt(0);
        if ((code >= 97 /* CharCode.a */ && code <= 122 /* CharCode.z */)
            || (code >= 65 /* CharCode.A */ && code <= 90 /* CharCode.Z */)
            || (code >= 48 /* CharCode.Digit0 */ && code <= 57 /* CharCode.Digit9 */)) {
            return char;
        }
        return '-' + code.toString(16).padStart(4, '0');
    });
}
export function decodeAuthority(authority) {
    return authority.replace(/-([0-9a-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2NvbW1vbi93ZWJ2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFPckQ7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxnQkFBZ0IsQ0FBQztBQUV4RCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxtQkFBbUIsdUJBQXVCLEVBQUUsQ0FBQztBQUV6RixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxvQkFBb0IsdUJBQXVCLEVBQUUsQ0FBQztBQUVyRjs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLFFBQWEsRUFBRSxVQUE4QjtJQUN6RSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMzRSxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLFNBQVMsSUFBSSxVQUFVLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25HLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ25CLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWTtZQUM1QixTQUFTLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDL0IsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1NBQ25CLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLEtBQUs7UUFDckIsU0FBUyxFQUFFLEdBQUcsUUFBUSxDQUFDLE1BQU0sSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLDRCQUE0QixFQUFFO1FBQ3RHLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtRQUNuQixRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVE7UUFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO0tBQ3JCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxTQUFpQjtJQUN6QyxPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEMsSUFDQyxDQUFDLElBQUksdUJBQWMsSUFBSSxJQUFJLHdCQUFjLENBQUM7ZUFDdkMsQ0FBQyxJQUFJLHVCQUFjLElBQUksSUFBSSx1QkFBYyxDQUFDO2VBQzFDLENBQUMsSUFBSSw0QkFBbUIsSUFBSSxJQUFJLDRCQUFtQixDQUFDLEVBQ3RELENBQUM7WUFDRixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxTQUFpQjtJQUNoRCxPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25HLENBQUMifQ==
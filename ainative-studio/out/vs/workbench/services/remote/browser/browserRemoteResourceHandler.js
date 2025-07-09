/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getMediaOrTextMime } from '../../../../base/common/mime.js';
import { URI } from '../../../../base/common/uri.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
let BrowserRemoteResourceLoader = class BrowserRemoteResourceLoader extends Disposable {
    constructor(fileService, provider) {
        super();
        this.provider = provider;
        this._register(provider.onDidReceiveRequest(async (request) => {
            let uri;
            try {
                uri = JSON.parse(decodeURIComponent(request.uri.query));
            }
            catch {
                return request.respondWith(404, new Uint8Array(), {});
            }
            let content;
            try {
                content = await fileService.readFile(URI.from(uri, true));
            }
            catch (e) {
                const str = VSBuffer.fromString(e.message).buffer;
                if (e instanceof FileOperationError && e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    return request.respondWith(404, str, {});
                }
                else {
                    return request.respondWith(500, str, {});
                }
            }
            const mime = uri.path && getMediaOrTextMime(uri.path);
            request.respondWith(200, content.value.buffer, mime ? { 'content-type': mime } : {});
        }));
    }
    getResourceUriProvider() {
        const baseUri = URI.parse(document.location.href);
        return uri => baseUri.with({
            path: this.provider.path,
            query: JSON.stringify(uri),
        });
    }
};
BrowserRemoteResourceLoader = __decorate([
    __param(0, IFileService)
], BrowserRemoteResourceLoader);
export { BrowserRemoteResourceLoader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclJlbW90ZVJlc291cmNlSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2Jyb3dzZXIvYnJvd3NlclJlbW90ZVJlc291cmNlSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFxQyxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUcxSCxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7SUFDMUQsWUFDZSxXQUF5QixFQUN0QixRQUFpQztRQUVsRCxLQUFLLEVBQUUsQ0FBQztRQUZTLGFBQVEsR0FBUixRQUFRLENBQXlCO1FBSWxELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtZQUMzRCxJQUFJLEdBQWtCLENBQUM7WUFDdkIsSUFBSSxDQUFDO2dCQUNKLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBRUQsSUFBSSxPQUFxQixDQUFDO1lBQzFCLElBQUksQ0FBQztnQkFDSixPQUFPLEdBQUcsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDM0QsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsWUFBWSxrQkFBa0IsSUFBSSxDQUFDLENBQUMsbUJBQW1CLCtDQUF1QyxFQUFFLENBQUM7b0JBQ3JHLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEQsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xELE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQzFCLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDeEIsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO1NBQzFCLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBdkNZLDJCQUEyQjtJQUVyQyxXQUFBLFlBQVksQ0FBQTtHQUZGLDJCQUEyQixDQXVDdkMifQ==
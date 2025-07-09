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
import { VSBuffer, encodeBase64 } from '../../../base/common/buffer.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { getMediaOrTextMime } from '../../../base/common/mime.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { FileOperationError, IFileService } from '../../files/common/files.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
import { NODE_REMOTE_RESOURCE_CHANNEL_NAME, NODE_REMOTE_RESOURCE_IPC_METHOD_NAME } from '../common/electronRemoteResources.js';
let ElectronRemoteResourceLoader = class ElectronRemoteResourceLoader extends Disposable {
    constructor(windowId, mainProcessService, fileService) {
        super();
        this.windowId = windowId;
        this.fileService = fileService;
        const channel = {
            listen(_, event) {
                throw new Error(`Event not found: ${event}`);
            },
            call: (_, command, arg) => {
                switch (command) {
                    case NODE_REMOTE_RESOURCE_IPC_METHOD_NAME: return this.doRequest(URI.revive(arg[0]));
                }
                throw new Error(`Call not found: ${command}`);
            }
        };
        mainProcessService.registerChannel(NODE_REMOTE_RESOURCE_CHANNEL_NAME, channel);
    }
    async doRequest(uri) {
        let content;
        try {
            const params = new URLSearchParams(uri.query);
            const actual = uri.with({
                scheme: params.get('scheme'),
                authority: params.get('authority'),
                query: '',
            });
            content = await this.fileService.readFile(actual);
        }
        catch (e) {
            const str = encodeBase64(VSBuffer.fromString(e.message));
            if (e instanceof FileOperationError && e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return { statusCode: 404, body: str };
            }
            else {
                return { statusCode: 500, body: str };
            }
        }
        const mimeType = uri.path && getMediaOrTextMime(uri.path);
        return { statusCode: 200, body: encodeBase64(content.value), mimeType };
    }
    getResourceUriProvider() {
        return (uri) => uri.with({
            scheme: Schemas.vscodeManagedRemoteResource,
            authority: `window:${this.windowId}`,
            query: new URLSearchParams({ authority: uri.authority, scheme: uri.scheme }).toString(),
        });
    }
};
ElectronRemoteResourceLoader = __decorate([
    __param(1, IMainProcessService),
    __param(2, IFileService)
], ElectronRemoteResourceLoader);
export { ElectronRemoteResourceLoader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25SZW1vdGVSZXNvdXJjZUxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvZWxlY3Ryb24tc2FuZGJveC9lbGVjdHJvblJlbW90ZVJlc291cmNlTG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFxQyxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsb0NBQW9DLEVBQThCLE1BQU0sc0NBQXNDLENBQUM7QUFFcEosSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBQzNELFlBQ2tCLFFBQWdCLEVBQ1osa0JBQXVDLEVBQzdCLFdBQXlCO1FBRXhELEtBQUssRUFBRSxDQUFDO1FBSlMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUVGLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBSXhELE1BQU0sT0FBTyxHQUFtQjtZQUMvQixNQUFNLENBQUksQ0FBVSxFQUFFLEtBQWE7Z0JBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDOUMsQ0FBQztZQUVELElBQUksRUFBRSxDQUFDLENBQVUsRUFBRSxPQUFlLEVBQUUsR0FBUyxFQUFnQixFQUFFO2dCQUM5RCxRQUFRLE9BQU8sRUFBRSxDQUFDO29CQUNqQixLQUFLLG9DQUFvQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEYsQ0FBQztnQkFFRCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLENBQUM7U0FDRCxDQUFDO1FBRUYsa0JBQWtCLENBQUMsZUFBZSxDQUFDLGlDQUFpQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQVE7UUFDL0IsSUFBSSxPQUFxQixDQUFDO1FBQzFCLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5QyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUN2QixNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUU7Z0JBQzdCLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBRTtnQkFDbkMsS0FBSyxFQUFFLEVBQUU7YUFDVCxDQUFDLENBQUM7WUFDSCxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3pELElBQUksQ0FBQyxZQUFZLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxtQkFBbUIsK0NBQXVDLEVBQUUsQ0FBQztnQkFDckcsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ3ZDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUN6RSxDQUFDO0lBRU0sc0JBQXNCO1FBQzVCLE9BQU8sQ0FBQyxHQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDN0IsTUFBTSxFQUFFLE9BQU8sQ0FBQywyQkFBMkI7WUFDM0MsU0FBUyxFQUFFLFVBQVUsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNwQyxLQUFLLEVBQUUsSUFBSSxlQUFlLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFO1NBQ3ZGLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBdkRZLDRCQUE0QjtJQUd0QyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsWUFBWSxDQUFBO0dBSkYsNEJBQTRCLENBdUR4QyJ9
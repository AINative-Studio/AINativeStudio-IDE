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
import { Barrier } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IProductService } from '../../product/common/productService.js';
import { ExtensionGalleryManifestService } from './extensionGalleryManifestService.js';
let ExtensionGalleryManifestIPCService = class ExtensionGalleryManifestIPCService extends ExtensionGalleryManifestService {
    constructor(server, productService) {
        super(productService);
        this._onDidChangeExtensionGalleryManifest = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifest = this._onDidChangeExtensionGalleryManifest.event;
        this.barrier = new Barrier();
        server.registerChannel('extensionGalleryManifest', {
            listen: () => Event.None,
            call: async (context, command, args) => {
                switch (command) {
                    case 'setExtensionGalleryManifest': return Promise.resolve(this.setExtensionGalleryManifest(args[0]));
                }
                throw new Error('Invalid call');
            }
        });
    }
    async getExtensionGalleryManifest() {
        await this.barrier.wait();
        return this.extensionGalleryManifest ?? null;
    }
    setExtensionGalleryManifest(manifest) {
        this.extensionGalleryManifest = manifest;
        this._onDidChangeExtensionGalleryManifest.fire(manifest);
        this.barrier.open();
    }
};
ExtensionGalleryManifestIPCService = __decorate([
    __param(1, IProductService)
], ExtensionGalleryManifestIPCService);
export { ExtensionGalleryManifestIPCService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25HYWxsZXJ5TWFuaWZlc3RTZXJ2aWNlSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRixJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFtQyxTQUFRLCtCQUErQjtJQVV0RixZQUNDLE1BQXNCLEVBQ0wsY0FBK0I7UUFFaEQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBVmYseUNBQW9DLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBb0MsQ0FBQyxDQUFDO1FBQzdGLHdDQUFtQyxHQUFHLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLENBQUM7UUFHdkYsWUFBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFPeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRTtZQUNsRCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDeEIsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFZLEVBQUUsT0FBZSxFQUFFLElBQVUsRUFBZ0IsRUFBRTtnQkFDdkUsUUFBUSxPQUFPLEVBQUUsQ0FBQztvQkFDakIsS0FBSyw2QkFBNkIsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkcsQ0FBQztnQkFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsS0FBSyxDQUFDLDJCQUEyQjtRQUN6QyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUIsT0FBTyxJQUFJLENBQUMsd0JBQXdCLElBQUksSUFBSSxDQUFDO0lBQzlDLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxRQUEwQztRQUM3RSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsUUFBUSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBRUQsQ0FBQTtBQXJDWSxrQ0FBa0M7SUFZNUMsV0FBQSxlQUFlLENBQUE7R0FaTCxrQ0FBa0MsQ0FxQzlDIn0=
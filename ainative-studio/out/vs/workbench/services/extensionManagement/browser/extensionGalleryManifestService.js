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
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService as ExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifestService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
let WebExtensionGalleryManifestService = class WebExtensionGalleryManifestService extends ExtensionGalleryManifestService {
    constructor(productService, remoteAgentService) {
        super(productService);
        const remoteConnection = remoteAgentService.getConnection();
        if (remoteConnection) {
            const channel = remoteConnection.getChannel('extensionGalleryManifest');
            this.getExtensionGalleryManifest().then(manifest => {
                channel.call('setExtensionGalleryManifest', [manifest]);
                this._register(this.onDidChangeExtensionGalleryManifest(manifest => channel.call('setExtensionGalleryManifest', [manifest])));
            });
        }
    }
};
WebExtensionGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IRemoteAgentService)
], WebExtensionGalleryManifestService);
registerSingleton(IExtensionGalleryManifestService, WebExtensionGalleryManifestService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9icm93c2VyL2V4dGVuc2lvbkdhbGxlcnlNYW5pZmVzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDL0gsT0FBTyxFQUFFLCtCQUErQixJQUFJLCtCQUErQixFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFDeEssT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVoRixJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFtQyxTQUFRLCtCQUErQjtJQUUvRSxZQUNrQixjQUErQixFQUMzQixrQkFBdUM7UUFFNUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDNUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3hFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ILENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7Q0FFRCxDQUFBO0FBakJLLGtDQUFrQztJQUdyQyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUJBQW1CLENBQUE7R0FKaEIsa0NBQWtDLENBaUJ2QztBQUVELGlCQUFpQixDQUFDLGdDQUFnQyxFQUFFLGtDQUFrQyxvQ0FBNEIsQ0FBQyJ9
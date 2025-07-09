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
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IURLService } from '../../../platform/url/common/url.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtensionUrlHandler } from '../../services/extensions/browser/extensionUrlHandler.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { ITrustedDomainService } from '../../contrib/url/browser/trustedDomainService.js';
class ExtensionUrlHandler {
    constructor(proxy, handle, extensionId, extensionDisplayName) {
        this.proxy = proxy;
        this.handle = handle;
        this.extensionId = extensionId;
        this.extensionDisplayName = extensionDisplayName;
    }
    async handleURL(uri, options) {
        if (!ExtensionIdentifier.equals(this.extensionId, uri.authority)) {
            return false;
        }
        await this.proxy.$handleExternalUri(this.handle, uri);
        return true;
    }
}
let MainThreadUrls = class MainThreadUrls extends Disposable {
    constructor(context, trustedDomainService, urlService, extensionUrlHandler) {
        super();
        this.urlService = urlService;
        this.extensionUrlHandler = extensionUrlHandler;
        this.handlers = new Map();
        this.proxy = context.getProxy(ExtHostContext.ExtHostUrls);
    }
    async $registerUriHandler(handle, extensionId, extensionDisplayName) {
        const handler = new ExtensionUrlHandler(this.proxy, handle, extensionId, extensionDisplayName);
        const disposable = this.urlService.registerHandler(handler);
        this.handlers.set(handle, { extensionId, disposable });
        this.extensionUrlHandler.registerExtensionHandler(extensionId, handler);
        return undefined;
    }
    async $unregisterUriHandler(handle) {
        const tuple = this.handlers.get(handle);
        if (!tuple) {
            return undefined;
        }
        const { extensionId, disposable } = tuple;
        this.extensionUrlHandler.unregisterExtensionHandler(extensionId);
        this.handlers.delete(handle);
        disposable.dispose();
        return undefined;
    }
    async $createAppUri(uri) {
        return this.urlService.create(uri);
    }
    dispose() {
        super.dispose();
        this.handlers.forEach(({ disposable }) => disposable.dispose());
        this.handlers.clear();
    }
};
MainThreadUrls = __decorate([
    extHostNamedCustomer(MainContext.MainThreadUrls),
    __param(1, ITrustedDomainService),
    __param(2, IURLService),
    __param(3, IExtensionUrlHandler)
], MainThreadUrls);
export { MainThreadUrls };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFVybHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRVcmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUF5QyxNQUFNLCtCQUErQixDQUFDO0FBQ25ILE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsV0FBVyxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQW1DLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDakksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFMUYsTUFBTSxtQkFBbUI7SUFFeEIsWUFDa0IsS0FBdUIsRUFDdkIsTUFBYyxFQUN0QixXQUFnQyxFQUNoQyxvQkFBNEI7UUFIcEIsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFDdkIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUN0QixnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7UUFDaEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFRO0lBQ2xDLENBQUM7SUFFTCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQVEsRUFBRSxPQUF5QjtRQUNsRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDbEUsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFD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
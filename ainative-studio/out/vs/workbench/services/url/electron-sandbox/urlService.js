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
import { IURLService } from '../../../../platform/url/common/url.js';
import { URI } from '../../../../base/common/uri.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { URLHandlerChannel } from '../../../../platform/url/common/urlIpc.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { matchesScheme } from '../../../../base/common/network.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { NativeURLService } from '../../../../platform/url/common/urlService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let RelayURLService = class RelayURLService extends NativeURLService {
    constructor(mainProcessService, openerService, nativeHostService, productService, logService) {
        super(productService);
        this.nativeHostService = nativeHostService;
        this.logService = logService;
        this.urlService = ProxyChannel.toService(mainProcessService.getChannel('url'));
        mainProcessService.registerChannel('urlHandler', new URLHandlerChannel(this));
        openerService.registerOpener(this);
    }
    create(options) {
        const uri = super.create(options);
        let query = uri.query;
        if (!query) {
            query = `windowId=${encodeURIComponent(this.nativeHostService.windowId)}`;
        }
        else {
            query += `&windowId=${encodeURIComponent(this.nativeHostService.windowId)}`;
        }
        return uri.with({ query });
    }
    async open(resource, options) {
        if (!matchesScheme(resource, this.productService.urlProtocol)) {
            return false;
        }
        if (typeof resource === 'string') {
            resource = URI.parse(resource);
        }
        return await this.urlService.open(resource, options);
    }
    async handleURL(uri, options) {
        const result = await super.open(uri, options);
        if (result) {
            this.logService.trace('URLService#handleURL(): handled', uri.toString(true));
            await this.nativeHostService.focusWindow({ force: true /* Application may not be active */, targetWindowId: this.nativeHostService.windowId });
        }
        else {
            this.logService.trace('URLService#handleURL(): not handled', uri.toString(true));
        }
        return result;
    }
};
RelayURLService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IOpenerService),
    __param(2, INativeHostService),
    __param(3, IProductService),
    __param(4, ILogService)
], RelayURLService);
export { RelayURLService };
registerSingleton(IURLService, RelayURLService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXJsL2VsZWN0cm9uLXNhbmRib3gvdXJsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFnQyxNQUFNLHdDQUF3QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBVyxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFPOUQsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxnQkFBZ0I7SUFJcEQsWUFDc0Isa0JBQXVDLEVBQzVDLGFBQTZCLEVBQ1IsaUJBQXFDLEVBQ3pELGNBQStCLEVBQ2xCLFVBQXVCO1FBRXJELEtBQUssQ0FBQyxjQUFjLENBQUMs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
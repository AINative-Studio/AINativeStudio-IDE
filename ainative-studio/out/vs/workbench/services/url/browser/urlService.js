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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { AbstractURLService } from '../../../../platform/url/common/urlService.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { matchesScheme } from '../../../../base/common/network.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
class BrowserURLOpener {
    constructor(urlService, productService) {
        this.urlService = urlService;
        this.productService = productService;
    }
    async open(resource, options) {
        if (options?.openExternal) {
            return false;
        }
        if (!matchesScheme(resource, this.productService.urlProtocol)) {
            return false;
        }
        if (typeof resource === 'string') {
            resource = URI.parse(resource);
        }
        return this.urlService.open(resource, { trusted: true });
    }
}
let BrowserURLService = class BrowserURLService extends AbstractURLService {
    constructor(environmentService, openerService, productService) {
        super();
        this.provider = environmentService.options?.urlCallbackProvider;
        if (this.provider) {
            this._register(this.provider.onCallback(uri => this.open(uri, { trusted: true })));
        }
        this._register(openerService.registerOpener(new BrowserURLOpener(this, productService)));
    }
    create(options) {
        if (this.provider) {
            return this.provider.create(options);
        }
        return URI.parse('unsupported://');
    }
};
BrowserURLService = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, IOpenerService),
    __param(2, IProductService)
], BrowserURLService);
export { BrowserURLService };
registerSingleton(IURLService, BrowserURLService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXJsL2Jyb3dzZXIvdXJsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFbkYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBcUQsTUFBTSw4Q0FBOEMsQ0FBQztBQUNqSSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBNEJ4RixNQUFNLGdCQUFnQjtJQUVyQixZQUNTLFVBQXVCLEVBQ3ZCLGNBQStCO1FBRC9CLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDdkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO0lBQ3BDLENBQUM7SUFFTCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQXNCLEVBQUUsT0FBbUQ7UUFDckYsSUFBSyxPQUEyQyxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQ2hFLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUMvRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRDtBQUVNLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsa0JBQWtCO0lBSXhELFlBQ3NDLGtCQUF1RCxFQUM1RSxhQUE2QixFQUM1QixjQUErQjtRQUVoRCxLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksQ0FBQyxRQUFRLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxFQUFFLG1CQUFtQixDQUFDO1FBRWhFLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQWdDO1FBQ3RDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FDRCxDQUFBO0FBM0JZLGlCQUFpQjtJQUszQixXQUFBLG1DQUFtQyxDQUFBO0lBQ25DLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxlQUFlLENBQUE7R0FQTCxpQkFBaUIsQ0EyQjdCOztBQUVELGlCQUFpQixDQUFDLFdBQVcsRUFBRSxpQkFBaUIsb0NBQTRCLENBQUMifQ==
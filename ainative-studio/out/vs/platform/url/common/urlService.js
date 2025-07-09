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
import { first } from '../../../base/common/async.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IProductService } from '../../product/common/productService.js';
export class AbstractURLService extends Disposable {
    constructor() {
        super(...arguments);
        this.handlers = new Set();
    }
    open(uri, options) {
        const handlers = [...this.handlers.values()];
        return first(handlers.map(h => () => h.handleURL(uri, options)), undefined, false).then(val => val || false);
    }
    registerHandler(handler) {
        this.handlers.add(handler);
        return toDisposable(() => this.handlers.delete(handler));
    }
}
let NativeURLService = class NativeURLService extends AbstractURLService {
    constructor(productService) {
        super();
        this.productService = productService;
    }
    create(options) {
        let { authority, path, query, fragment } = options ? options : { authority: undefined, path: undefined, query: undefined, fragment: undefined };
        if (authority && path && path.indexOf('/') !== 0) {
            path = `/${path}`; // URI validation requires a path if there is an authority
        }
        return URI.from({ scheme: this.productService.urlProtocol, authority, path, query, fragment });
    }
};
NativeURLService = __decorate([
    __param(0, IProductService)
], NativeURLService);
export { NativeURLService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cmwvY29tbW9uL3VybFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUYsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHekUsTUFBTSxPQUFnQixrQkFBbUIsU0FBUSxVQUFVO0lBQTNEOztRQUlTLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO0lBYTNDLENBQUM7SUFUQSxJQUFJLENBQUMsR0FBUSxFQUFFLE9BQXlCO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDN0MsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQztJQUM5RyxDQUFDO0lBRUQsZUFBZSxDQUFDLE9BQW9CO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztDQUNEO0FBRU0sSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxrQkFBa0I7SUFFdkQsWUFDcUMsY0FBK0I7UUFFbkUsS0FBSyxFQUFFLENBQUM7UUFGNEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO0lBR3BFLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBZ0M7UUFDdEMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUVoSixJQUFJLFNBQVMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLDBEQUEwRDtRQUM5RSxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDaEcsQ0FBQztDQUNELENBQUE7QUFqQlksZ0JBQWdCO0lBRzFCLFdBQUEsZUFBZSxDQUFBO0dBSEwsZ0JBQWdCLENBaUI1QiJ9
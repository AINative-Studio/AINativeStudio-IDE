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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IQuickDiffService } from '../../contrib/scm/common/quickDiff.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadQuickDiff = class MainThreadQuickDiff {
    constructor(extHostContext, quickDiffService) {
        this.quickDiffService = quickDiffService;
        this.providerDisposables = new DisposableMap();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostQuickDiff);
    }
    async $registerQuickDiffProvider(handle, selector, label, rootUri, visible) {
        const provider = {
            label,
            rootUri: URI.revive(rootUri),
            selector,
            isSCM: false,
            visible,
            getOriginalResource: async (uri) => {
                return URI.revive(await this.proxy.$provideOriginalResource(handle, uri, CancellationToken.None));
            }
        };
        const disposable = this.quickDiffService.addQuickDiffProvider(provider);
        this.providerDisposables.set(handle, disposable);
    }
    async $unregisterQuickDiffProvider(handle) {
        if (this.providerDisposables.has(handle)) {
            this.providerDisposables.deleteAndDispose(handle);
        }
    }
    dispose() {
        this.providerDisposables.dispose();
    }
};
MainThreadQuickDiff = __decorate([
    extHostNamedCustomer(MainContext.MainThreadQuickDiff),
    __param(1, IQuickDiffService)
], MainThreadQuickDiff);
export { MainThreadQuickDiff };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFF1aWNrRGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFF1aWNrRGlmZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDL0UsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUE2QyxXQUFXLEVBQTRCLE1BQU0sK0JBQStCLENBQUM7QUFDakosT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHVDQUF1QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUd0RyxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQUsvQixZQUNDLGNBQStCLEVBQ1osZ0JBQW9EO1FBQW5DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFKaEUsd0JBQW1CLEdBQUcsSUFBSSxhQUFhLEVBQXVCLENBQUM7UUFNdEUsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxLQUFLLENBQUMsMEJBQTBCLENBQUMsTUFBYyxFQUFFLFFBQThCLEVBQUUsS0FBYSxFQUFFLE9BQWtDLEVBQUUsT0FBZ0I7UUFDbkosTUFBTSxRQUFRLEdBQXNCO1lBQ25DLEtBQUs7WUFDTCxPQUFPLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDNUIsUUFBUTtZQUNSLEtBQUssRUFBRSxLQUFLO1lBQ1osT0FBTztZQUNQLG1CQUFtQixFQUFFLEtBQUssRUFBRSxHQUFRLEVBQUUsRUFBRTtnQkFDdkMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbkcsQ0FBQztTQUNELENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxNQUFjO1FBQ2hELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNELENBQUE7QUFwQ1ksbUJBQW1CO0lBRC9CLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQztJQVFuRCxXQUFBLGlCQUFpQixDQUFBO0dBUFAsbUJBQW1CLENBb0MvQiJ9
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
import { dispose } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IShareService } from '../../contrib/share/common/share.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadShare = class MainThreadShare {
    constructor(extHostContext, shareService) {
        this.shareService = shareService;
        this.providers = new Map();
        this.providerDisposables = new Map();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostShare);
    }
    $registerShareProvider(handle, selector, id, label, priority) {
        const provider = {
            id,
            label,
            selector,
            priority,
            provideShare: async (item) => {
                const result = await this.proxy.$provideShare(handle, item, CancellationToken.None);
                return typeof result === 'string' ? result : URI.revive(result);
            }
        };
        this.providers.set(handle, provider);
        const disposable = this.shareService.registerShareProvider(provider);
        this.providerDisposables.set(handle, disposable);
    }
    $unregisterShareProvider(handle) {
        if (this.providers.has(handle)) {
            this.providers.delete(handle);
        }
        if (this.providerDisposables.has(handle)) {
            this.providerDisposables.delete(handle);
        }
    }
    dispose() {
        this.providers.clear();
        dispose(this.providerDisposables.values());
        this.providerDisposables.clear();
    }
};
MainThreadShare = __decorate([
    extHostNamedCustomer(MainContext.MainThreadShare),
    __param(1, IShareService)
], MainThreadShare);
export { MainThreadShare };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNoYXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkU2hhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsY0FBYyxFQUF5QyxXQUFXLEVBQXdCLE1BQU0sK0JBQStCLENBQUM7QUFDekksT0FBTyxFQUFrQixhQUFhLEVBQWtCLE1BQU0scUNBQXFDLENBQUM7QUFDcEcsT0FBTyxFQUFtQixvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3RHLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFNM0IsWUFDQyxjQUErQixFQUNoQixZQUE0QztRQUEzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUxwRCxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7UUFDOUMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFNNUQsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsc0JBQXNCLENBQUMsTUFBYyxFQUFFLFFBQThCLEVBQUUsRUFBVSxFQUFFLEtBQWEsRUFBRSxRQUFnQjtRQUNqSCxNQUFNLFFBQVEsR0FBbUI7WUFDaEMsRUFBRTtZQUNGLEtBQUs7WUFDTCxRQUFRO1lBQ1IsUUFBUTtZQUNSLFlBQVksRUFBRSxLQUFLLEVBQUUsSUFBb0IsRUFBRSxFQUFFO2dCQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3BGLE9BQU8sT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakUsQ0FBQztTQUNELENBQUM7UUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDckMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsd0JBQXdCLENBQUMsTUFBYztRQUN0QyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2xDLENBQUM7Q0FDRCxDQUFBO0FBM0NZLGVBQWU7SUFEM0Isb0JBQW9CLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQztJQVMvQyxXQUFBLGFBQWEsQ0FBQTtHQVJILGVBQWUsQ0EyQzNCIn0=
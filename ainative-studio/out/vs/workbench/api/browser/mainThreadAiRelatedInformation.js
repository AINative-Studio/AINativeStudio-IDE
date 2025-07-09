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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IAiRelatedInformationService } from '../../services/aiRelatedInformation/common/aiRelatedInformation.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadAiRelatedInformation = class MainThreadAiRelatedInformation extends Disposable {
    constructor(context, _aiRelatedInformationService) {
        super();
        this._aiRelatedInformationService = _aiRelatedInformationService;
        this._registrations = this._register(new DisposableMap());
        this._proxy = context.getProxy(ExtHostContext.ExtHostAiRelatedInformation);
    }
    $getAiRelatedInformation(query, types) {
        // TODO: use a real cancellation token
        return this._aiRelatedInformationService.getRelatedInformation(query, types, CancellationToken.None);
    }
    $registerAiRelatedInformationProvider(handle, type) {
        const provider = {
            provideAiRelatedInformation: (query, token) => {
                return this._proxy.$provideAiRelatedInformation(handle, query, token);
            },
        };
        this._registrations.set(handle, this._aiRelatedInformationService.registerAiRelatedInformationProvider(type, provider));
    }
    $unregisterAiRelatedInformationProvider(handle) {
        this._registrations.deleteAndDispose(handle);
    }
};
MainThreadAiRelatedInformation = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAiRelatedInformation),
    __param(1, IAiRelatedInformationService)
], MainThreadAiRelatedInformation);
export { MainThreadAiRelatedInformation };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEFpUmVsYXRlZEluZm9ybWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQWlSZWxhdGVkSW5mb3JtYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQW9DLGNBQWMsRUFBRSxXQUFXLEVBQXVDLE1BQU0sK0JBQStCLENBQUM7QUFFbkosT0FBTyxFQUFpQyw0QkFBNEIsRUFBNEIsTUFBTSxvRUFBb0UsQ0FBQztBQUMzSyxPQUFPLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHdEcsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO0lBSTdELFlBQ0MsT0FBd0IsRUFDTSw0QkFBMkU7UUFFekcsS0FBSyxFQUFFLENBQUM7UUFGdUMsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUE4QjtRQUp6RixtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQVUsQ0FBQyxDQUFDO1FBTzdFLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsd0JBQXdCLENBQUMsS0FBYSxFQUFFLEtBQStCO1FBQ3RFLHNDQUFzQztRQUN0QyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFFRCxxQ0FBcUMsQ0FBQyxNQUFjLEVBQUUsSUFBNEI7UUFDakYsTUFBTSxRQUFRLEdBQWtDO1lBQy9DLDJCQUEyQixFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUM3QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RSxDQUFDO1NBQ0QsQ0FBQztRQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsNEJBQTRCLENBQUMsb0NBQW9DLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDekgsQ0FBQztJQUVELHVDQUF1QyxDQUFDLE1BQWM7UUFDckQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBQ0QsQ0FBQTtBQTdCWSw4QkFBOEI7SUFEMUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLDhCQUE4QixDQUFDO0lBTzlELFdBQUEsNEJBQTRCLENBQUE7R0FObEIsOEJBQThCLENBNkIxQyJ9
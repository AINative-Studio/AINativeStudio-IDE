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
import { localize } from '../../../nls.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { extHostCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { raceCancellationError } from '../../../base/common/async.js';
import { IEditSessionIdentityService } from '../../../platform/workspace/common/editSessions.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
class ExtHostEditSessionIdentityCreateParticipant {
    constructor(extHostContext) {
        this.timeout = 10000;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostWorkspace);
    }
    async participate(workspaceFolder, token) {
        const p = new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error(localize('timeout.onWillCreateEditSessionIdentity', "Aborted onWillCreateEditSessionIdentity-event after 10000ms"))), this.timeout);
            this._proxy.$onWillCreateEditSessionIdentity(workspaceFolder.uri, token, this.timeout).then(resolve, reject);
        });
        return raceCancellationError(p, token);
    }
}
let EditSessionIdentityCreateParticipant = class EditSessionIdentityCreateParticipant {
    constructor(extHostContext, instantiationService, _editSessionIdentityService) {
        this._editSessionIdentityService = _editSessionIdentityService;
        this._saveParticipantDisposable = this._editSessionIdentityService.addEditSessionIdentityCreateParticipant(instantiationService.createInstance(ExtHostEditSessionIdentityCreateParticipant, extHostContext));
    }
    dispose() {
        this._saveParticipantDisposable.dispose();
    }
};
EditSessionIdentityCreateParticipant = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, IEditSessionIdentityService)
], EditSessionIdentityCreateParticipant);
export { EditSessionIdentityCreateParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRTZXNzaW9uSWRlbnRpdHlQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEVkaXRTZXNzaW9uSWRlbnRpdHlQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUV4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RSxPQUFPLEVBQXlDLDJCQUEyQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDeEksT0FBTyxFQUFFLGNBQWMsRUFBeUIsTUFBTSwrQkFBK0IsQ0FBQztBQUd0RixNQUFNLDJDQUEyQztJQUtoRCxZQUFZLGNBQStCO1FBRjFCLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFHaEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLGVBQWdDLEVBQUUsS0FBd0I7UUFDM0UsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFFOUMsVUFBVSxDQUNULEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMseUNBQXlDLEVBQUUsNkRBQTZELENBQUMsQ0FBQyxDQUFDLEVBQzNJLElBQUksQ0FBQyxPQUFPLENBQ1osQ0FBQztZQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsZ0NBQWdDLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUcsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLHFCQUFxQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQ0Q7QUFHTSxJQUFNLG9DQUFvQyxHQUExQyxNQUFNLG9DQUFvQztJQUloRCxZQUNDLGNBQStCLEVBQ1Isb0JBQTJDLEVBQ3BCLDJCQUF3RDtRQUF4RCxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO1FBRXRHLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsdUNBQXVDLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDJDQUEyQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDOU0sQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0MsQ0FBQztDQUNELENBQUE7QUFmWSxvQ0FBb0M7SUFEaEQsZUFBZTtJQU9iLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSwyQkFBMkIsQ0FBQTtHQVBqQixvQ0FBb0MsQ0FlaEQifQ==
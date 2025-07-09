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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadLabelService = class MainThreadLabelService extends Disposable {
    constructor(_, _labelService) {
        super();
        this._labelService = _labelService;
        this._resourceLabelFormatters = this._register(new DisposableMap());
    }
    $registerResourceLabelFormatter(handle, formatter) {
        // Dynamicily registered formatters should have priority over those contributed via package.json
        formatter.priority = true;
        const disposable = this._labelService.registerCachedFormatter(formatter);
        this._resourceLabelFormatters.set(handle, disposable);
    }
    $unregisterResourceLabelFormatter(handle) {
        this._resourceLabelFormatters.deleteAndDispose(handle);
    }
};
MainThreadLabelService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLabelService),
    __param(1, ILabelService)
], MainThreadLabelService);
export { MainThreadLabelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhYmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZExhYmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQTBCLE1BQU0seUNBQXlDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcsRUFBK0IsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFHdEcsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBSXJELFlBQ0MsQ0FBa0IsRUFDSCxhQUE2QztRQUU1RCxLQUFLLEVBQUUsQ0FBQztRQUZ3QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUo1Qyw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFVLENBQUMsQ0FBQztJQU94RixDQUFDO0lBRUQsK0JBQStCLENBQUMsTUFBYyxFQUFFLFNBQWlDO1FBQ2hGLGdHQUFnRztRQUNoRyxTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUMxQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxpQ0FBaUMsQ0FBQyxNQUFjO1FBQy9DLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4RCxDQUFDO0NBQ0QsQ0FBQTtBQXJCWSxzQkFBc0I7SUFEbEMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDO0lBT3RELFdBQUEsYUFBYSxDQUFBO0dBTkgsc0JBQXNCLENBcUJsQyJ9
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
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import * as extHostProtocol from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
export const IExtHostApiDeprecationService = createDecorator('IExtHostApiDeprecationService');
let ExtHostApiDeprecationService = class ExtHostApiDeprecationService {
    constructor(rpc, _extHostLogService) {
        this._extHostLogService = _extHostLogService;
        this._reportedUsages = new Set();
        this._telemetryShape = rpc.getProxy(extHostProtocol.MainContext.MainThreadTelemetry);
    }
    report(apiId, extension, migrationSuggestion) {
        const key = this.getUsageKey(apiId, extension);
        if (this._reportedUsages.has(key)) {
            return;
        }
        this._reportedUsages.add(key);
        if (extension.isUnderDevelopment) {
            this._extHostLogService.warn(`[Deprecation Warning] '${apiId}' is deprecated. ${migrationSuggestion}`);
        }
        this._telemetryShape.$publicLog2('extHostDeprecatedApiUsage', {
            extensionId: extension.identifier.value,
            apiId: apiId,
        });
    }
    getUsageKey(apiId, extension) {
        return `${apiId}-${extension.identifier.value}`;
    }
};
ExtHostApiDeprecationService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService)
], ExtHostApiDeprecationService);
export { ExtHostApiDeprecationService };
export const NullApiDeprecationService = Object.freeze(new class {
    report(_apiId, _extension, _warningMessage) {
        // noop
    }
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaURlcHJlY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RBcGlEZXByZWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBUTVELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FBZ0MsK0JBQStCLENBQUMsQ0FBQztBQUV0SCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0QjtJQU94QyxZQUNxQixHQUF1QixFQUM5QixrQkFBZ0Q7UUFBL0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFhO1FBTDdDLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQU9wRCxJQUFJLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBYSxFQUFFLFNBQWdDLEVBQUUsbUJBQTJCO1FBQ3pGLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9DLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTlCLElBQUksU0FBUyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQywwQkFBMEIsS0FBSyxvQkFBb0IsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBQ3hHLENBQUM7UUFZRCxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBaUQsMkJBQTJCLEVBQUU7WUFDN0csV0FBVyxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSztZQUN2QyxLQUFLLEVBQUUsS0FBSztTQUNaLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxXQUFXLENBQUMsS0FBYSxFQUFFLFNBQWdDO1FBQ2xFLE9BQU8sR0FBRyxLQUFLLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNqRCxDQUFDO0NBQ0QsQ0FBQTtBQTVDWSw0QkFBNEI7SUFRdEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFdBQVcsQ0FBQTtHQVRELDRCQUE0QixDQTRDeEM7O0FBR0QsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJO0lBR25ELE1BQU0sQ0FBQyxNQUFjLEVBQUUsVUFBaUMsRUFBRSxlQUF1QjtRQUN2RixPQUFPO0lBQ1IsQ0FBQztDQUNELEVBQUUsQ0FBQyxDQUFDIn0=
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaURlcHJlY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0QXBpRGVwcmVjYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQVE1RCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxlQUFlLENBQWdDLCtCQUErQixDQUFDLENBQUM7QUFFdEgsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFPeEMsWUFDcUIsR0FBdUIsRUFDOUIsa0JBQWdEO1FBQS9CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBYTtRQUw3QyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFPcEQsSUFBSSxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQWEsRUFBRSxTQUFnQyxFQUFFLG1CQUEyQjtRQUN6RixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvQyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU5QixJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEtBQUssb0JBQW9CLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUN4RyxDQUFDO1FBWUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQWlELDJCQUEyQixFQUFFO1lBQzdHLFdBQVcsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUs7WUFDdkMsS0FBSyxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sV0FBVyxDQUFDLEtBQWEsRUFBRSxTQUFnQztRQUNsRSxPQUFPLEdBQUcsS0FBSyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakQsQ0FBQztDQUNELENBQUE7QUE1Q1ksNEJBQTRCO0lBUXRDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxXQUFXLENBQUE7R0FURCw0QkFBNEIsQ0E0Q3hDOztBQUdELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSTtJQUduRCxNQUFNLENBQUMsTUFBYyxFQUFFLFVBQWlDLEVBQUUsZUFBdUI7UUFDdkYsT0FBTztJQUNSLENBQUM7Q0FDRCxFQUFFLENBQUMsQ0FBQyJ9
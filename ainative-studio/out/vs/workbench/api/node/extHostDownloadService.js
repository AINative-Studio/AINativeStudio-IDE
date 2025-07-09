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
import { join } from '../../../base/common/path.js';
import { tmpdir } from 'os';
import { generateUuid } from '../../../base/common/uuid.js';
import { IExtHostCommands } from '../common/extHostCommands.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { MainContext } from '../common/extHost.protocol.js';
import { URI } from '../../../base/common/uri.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
let ExtHostDownloadService = class ExtHostDownloadService extends Disposable {
    constructor(extHostRpc, commands) {
        super();
        const proxy = extHostRpc.getProxy(MainContext.MainThreadDownloadService);
        commands.registerCommand(false, '_workbench.downloadResource', async (resource) => {
            const location = URI.file(join(tmpdir(), generateUuid()));
            await proxy.$download(resource, location);
            return location;
        });
    }
};
ExtHostDownloadService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostCommands)
], ExtHostDownloadService);
export { ExtHostDownloadService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvd25sb2FkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdERvd25sb2FkU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFN0QsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBRXJELFlBQ3FCLFVBQThCLEVBQ2hDLFFBQTBCO1FBRTVDLEtBQUssRUFBRSxDQUFDO1FBRVIsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUV6RSxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSw2QkFBNkIsRUFBRSxLQUFLLEVBQUUsUUFBYSxFQUFnQixFQUFFO1lBQ3BHLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRCxNQUFNLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUFoQlksc0JBQXNCO0lBR2hDLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpOLHNCQUFzQixDQWdCbEMifQ==
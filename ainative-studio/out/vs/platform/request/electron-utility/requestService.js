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
import { net } from 'electron';
import { RequestService as NodeRequestService } from '../node/requestService.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { ILogService } from '../../log/common/log.js';
function getRawRequest(options) {
    return net.request;
}
let RequestService = class RequestService extends NodeRequestService {
    constructor(configurationService, environmentService, logService) {
        super('local', configurationService, environmentService, logService);
    }
    request(options, token) {
        return super.request({ ...(options || {}), getRawRequest, isChromiumNetwork: true }, token);
    }
};
RequestService = __decorate([
    __param(0, IConfigurationService),
    __param(1, INativeEnvironmentService),
    __param(2, ILogService)
], RequestService);
export { RequestService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVxdWVzdC9lbGVjdHJvbi11dGlsaXR5L3JlcXVlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHL0IsT0FBTyxFQUF1QixjQUFjLElBQUksa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQsU0FBUyxhQUFhLENBQUMsT0FBd0I7SUFDOUMsT0FBTyxHQUFHLENBQUMsT0FBcUMsQ0FBQztBQUNsRCxDQUFDO0FBRU0sSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLGtCQUFrQjtJQUVyRCxZQUN3QixvQkFBMkMsRUFDdkMsa0JBQTZDLEVBQzNELFVBQXVCO1FBRXBDLEtBQUssQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVRLE9BQU8sQ0FBQyxPQUF3QixFQUFFLEtBQXdCO1FBQ2xFLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdGLENBQUM7Q0FDRCxDQUFBO0FBYlksY0FBYztJQUd4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxXQUFXLENBQUE7R0FMRCxjQUFjLENBYTFCIn0=
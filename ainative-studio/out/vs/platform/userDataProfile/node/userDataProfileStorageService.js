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
import { IStorageService } from '../../storage/common/storage.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../common/userDataProfile.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
import { RemoteUserDataProfileStorageService } from '../common/userDataProfileStorageService.js';
let SharedProcessUserDataProfileStorageService = class SharedProcessUserDataProfileStorageService extends RemoteUserDataProfileStorageService {
    constructor(mainProcessService, userDataProfilesService, storageService, logService) {
        super(true, mainProcessService, userDataProfilesService, storageService, logService);
    }
};
SharedProcessUserDataProfileStorageService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IUserDataProfilesService),
    __param(2, IStorageService),
    __param(3, ILogService)
], SharedProcessUserDataProfileStorageService);
export { SharedProcessUserDataProfileStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL25vZGUvdXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUxRixJQUFNLDBDQUEwQyxHQUFoRCxNQUFNLDBDQUEyQyxTQUFRLG1DQUFtQztJQUVsRyxZQUNzQixrQkFBdUMsRUFDbEMsdUJBQWlELEVBQzFELGNBQStCLEVBQ25DLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7Q0FDRCxDQUFBO0FBVlksMENBQTBDO0lBR3BELFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsV0FBVyxDQUFBO0dBTkQsMENBQTBDLENBVXREIn0=
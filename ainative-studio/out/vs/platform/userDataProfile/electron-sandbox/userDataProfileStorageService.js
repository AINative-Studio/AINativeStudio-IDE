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
import { IUserDataProfileStorageService, RemoteUserDataProfileStorageService } from '../common/userDataProfileStorageService.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../common/userDataProfile.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
let NativeUserDataProfileStorageService = class NativeUserDataProfileStorageService extends RemoteUserDataProfileStorageService {
    constructor(mainProcessService, userDataProfilesService, storageService, logService) {
        super(false, mainProcessService, userDataProfilesService, storageService, logService);
    }
};
NativeUserDataProfileStorageService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IUserDataProfilesService),
    __param(2, IStorageService),
    __param(3, ILogService)
], NativeUserDataProfileStorageService);
export { NativeUserDataProfileStorageService };
registerSingleton(IUserDataProfileStorageService, NativeUserDataProfileStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFQcm9maWxlL2VsZWN0cm9uLXNhbmRib3gvdXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakksT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFdEUsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBb0MsU0FBUSxtQ0FBbUM7SUFFM0YsWUFDc0Isa0JBQXVDLEVBQ2xDLHVCQUFpRCxFQUMxRCxjQUErQixFQUNuQyxVQUF1QjtRQUVwQyxLQUFLLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLHVCQUF1QixFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN2RixDQUFDO0NBQ0QsQ0FBQTtBQVZZLG1DQUFtQztJQUc3QyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFdBQVcsQ0FBQTtHQU5ELG1DQUFtQyxDQVUvQzs7QUFFRCxpQkFBaUIsQ0FBQyw4QkFBOEIsRUFBRSxtQ0FBbUMsb0NBQTRCLENBQUMifQ==
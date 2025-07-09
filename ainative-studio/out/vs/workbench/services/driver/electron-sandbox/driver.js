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
import { mainWindow } from '../../../../base/browser/window.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { BrowserWindowDriver } from '../browser/driver.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
let NativeWindowDriver = class NativeWindowDriver extends BrowserWindowDriver {
    constructor(helper, fileService, environmentService, lifecycleService, logService) {
        super(fileService, environmentService, lifecycleService, logService);
        this.helper = helper;
    }
    exitApplication() {
        return this.helper.exitApplication();
    }
};
NativeWindowDriver = __decorate([
    __param(1, IFileService),
    __param(2, IEnvironmentService),
    __param(3, ILifecycleService),
    __param(4, ILogService)
], NativeWindowDriver);
export function registerWindowDriver(instantiationService, helper) {
    Object.assign(mainWindow, { driver: instantiationService.createInstance(NativeWindowDriver, helper) });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJpdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kcml2ZXIvZWxlY3Ryb24tc2FuZGJveC9kcml2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFNeEUsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxtQkFBbUI7SUFFbkQsWUFDa0IsTUFBaUMsRUFDcEMsV0FBeUIsRUFDbEIsa0JBQXVDLEVBQ3pDLGdCQUFtQyxFQUN6QyxVQUF1QjtRQUVwQyxLQUFLLENBQUMsV0FBVyxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBTnBELFdBQU0sR0FBTixNQUFNLENBQTJCO0lBT25ELENBQUM7SUFFUSxlQUFlO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0NBQ0QsQ0FBQTtBQWZLLGtCQUFrQjtJQUlyQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFdBQVcsQ0FBQTtHQVBSLGtCQUFrQixDQWV2QjtBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxvQkFBMkMsRUFBRSxNQUFpQztJQUNsSCxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hHLENBQUMifQ==
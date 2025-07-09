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
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
// @ts-ignore: interface is implemented via proxy
let NativeWorkspacesService = class NativeWorkspacesService {
    constructor(mainProcessService, nativeHostService) {
        return ProxyChannel.toService(mainProcessService.getChannel('workspaces'), { context: nativeHostService.windowId });
    }
};
NativeWorkspacesService = __decorate([
    __param(0, IMainProcessService),
    __param(1, INativeHostService)
], NativeWorkspacesService);
export { NativeWorkspacesService };
registerSingleton(IWorkspacesService, NativeWorkspacesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvZWxlY3Ryb24tc2FuZGJveC93b3Jrc3BhY2VzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM1RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRWxGLGlEQUFpRDtBQUMxQyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQUluQyxZQUNzQixrQkFBdUMsRUFDeEMsaUJBQXFDO1FBRXpELE9BQU8sWUFBWSxDQUFDLFNBQVMsQ0FBcUIsa0JBQWtCLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDekksQ0FBQztDQUNELENBQUE7QUFWWSx1QkFBdUI7SUFLakMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0dBTlIsdUJBQXVCLENBVW5DOztBQUVELGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLHVCQUF1QixvQ0FBNEIsQ0FBQyJ9
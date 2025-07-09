/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
export const IVoidUpdateService = createDecorator('VoidUpdateService');
// implemented by calling channel
let VoidUpdateService = class VoidUpdateService {
    constructor(mainProcessService) {
        // anything transmitted over a channel must be async even if it looks like it doesn't have to be
        this.check = async (explicit) => {
            const res = await this.voidUpdateService.check(explicit);
            return res;
        };
        // creates an IPC proxy to use metricsMainService.ts
        this.voidUpdateService = ProxyChannel.toService(mainProcessService.getChannel('void-channel-update'));
    }
};
VoidUpdateService = __decorate([
    __param(0, IMainProcessService)
], VoidUpdateService);
export { VoidUpdateService };
registerSingleton(IVoidUpdateService, VoidUpdateService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vdm9pZFVwZGF0ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFXNUYsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFDO0FBRzNGLGlDQUFpQztBQUMxQixJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFpQjtJQUs3QixZQUNzQixrQkFBdUM7UUFPN0QsZ0dBQWdHO1FBQ2hHLFVBQUssR0FBZ0MsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3ZELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN4RCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUMsQ0FBQTtRQVRBLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBcUIsa0JBQWtCLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUMzSCxDQUFDO0NBUUQsQ0FBQTtBQWxCWSxpQkFBaUI7SUFNM0IsV0FBQSxtQkFBbUIsQ0FBQTtHQU5ULGlCQUFpQixDQWtCN0I7O0FBRUQsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLGtDQUEwQixDQUFDIn0=
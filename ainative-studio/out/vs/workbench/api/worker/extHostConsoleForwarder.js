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
import { AbstractExtHostConsoleForwarder } from '../common/extHostConsoleForwarder.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
let ExtHostConsoleForwarder = class ExtHostConsoleForwarder extends AbstractExtHostConsoleForwarder {
    constructor(extHostRpc, initData) {
        super(extHostRpc, initData);
    }
    _nativeConsoleLogMessage(_method, original, args) {
        original.apply(console, args);
    }
};
ExtHostConsoleForwarder = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService)
], ExtHostConsoleForwarder);
export { ExtHostConsoleForwarder };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS93b3JrZXIvZXh0SG9zdENvbnNvbGVGb3J3YXJkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFN0QsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSwrQkFBK0I7SUFFM0UsWUFDcUIsVUFBOEIsRUFDekIsUUFBaUM7UUFFMUQsS0FBSyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRWtCLHdCQUF3QixDQUFDLE9BQWdCLEVBQUUsUUFBa0MsRUFBRSxJQUFnQjtRQUNqSCxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFXLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQ0QsQ0FBQTtBQVpZLHVCQUF1QjtJQUdqQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7R0FKYix1QkFBdUIsQ0FZbkMifQ==
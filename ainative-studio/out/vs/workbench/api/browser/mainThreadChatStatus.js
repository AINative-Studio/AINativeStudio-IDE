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
import { Disposable } from '../../../base/common/lifecycle.js';
import { IChatStatusItemService } from '../../contrib/chat/browser/chatStatusItemService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { MainContext } from '../common/extHost.protocol.js';
let MainThreadChatStatus = class MainThreadChatStatus extends Disposable {
    constructor(_extHostContext, _chatStatusItemService) {
        super();
        this._chatStatusItemService = _chatStatusItemService;
    }
    $setEntry(id, entry) {
        this._chatStatusItemService.setOrUpdateEntry({
            id,
            label: entry.title,
            description: entry.description,
            detail: entry.detail,
        });
    }
    $disposeEntry(id) {
        this._chatStatusItemService.deleteEntry(id);
    }
};
MainThreadChatStatus = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatStatus),
    __param(1, IChatStatusItemService)
], MainThreadChatStatus);
export { MainThreadChatStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ2hhdFN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDN0YsT0FBTyxFQUFtQixvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBcUIsV0FBVyxFQUE2QixNQUFNLCtCQUErQixDQUFDO0FBR25HLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQUVuRCxZQUNDLGVBQWdDLEVBQ1Msc0JBQThDO1FBRXZGLEtBQUssRUFBRSxDQUFDO1FBRmlDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7SUFHeEYsQ0FBQztJQUVELFNBQVMsQ0FBQyxFQUFVLEVBQUUsS0FBd0I7UUFDN0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDO1lBQzVDLEVBQUU7WUFDRixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDbEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQzlCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtTQUNwQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsYUFBYSxDQUFDLEVBQVU7UUFDdkIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQ0QsQ0FBQTtBQXJCWSxvQkFBb0I7SUFEaEMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDO0lBS3BELFdBQUEsc0JBQXNCLENBQUE7R0FKWixvQkFBb0IsQ0FxQmhDIn0=
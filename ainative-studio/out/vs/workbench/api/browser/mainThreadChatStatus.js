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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDaGF0U3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM3RixPQUFPLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFxQixXQUFXLEVBQTZCLE1BQU0sK0JBQStCLENBQUM7QUFHbkcsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBRW5ELFlBQ0MsZUFBZ0MsRUFDUyxzQkFBOEM7UUFFdkYsS0FBSyxFQUFFLENBQUM7UUFGaUMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtJQUd4RixDQUFDO0lBRUQsU0FBUyxDQUFDLEVBQVUsRUFBRSxLQUF3QjtRQUM3QyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUM7WUFDNUMsRUFBRTtZQUNGLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1NBQ3BCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxhQUFhLENBQUMsRUFBVTtRQUN2QixJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzdDLENBQUM7Q0FDRCxDQUFBO0FBckJZLG9CQUFvQjtJQURoQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUM7SUFLcEQsV0FBQSxzQkFBc0IsQ0FBQTtHQUpaLG9CQUFvQixDQXFCaEMifQ==
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
import { Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IHostService } from '../../services/host/browser/host.js';
import { IUserActivityService } from '../../services/userActivity/common/userActivityService.js';
import { encodeBase64 } from '../../../base/common/buffer.js';
let MainThreadWindow = class MainThreadWindow {
    constructor(extHostContext, hostService, openerService, userActivityService) {
        this.hostService = hostService;
        this.openerService = openerService;
        this.userActivityService = userActivityService;
        this.disposables = new DisposableStore();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostWindow);
        Event.latch(hostService.onDidChangeFocus)(this.proxy.$onDidChangeWindowFocus, this.proxy, this.disposables);
        userActivityService.onDidChangeIsActive(this.proxy.$onDidChangeWindowActive, this.proxy, this.disposables);
        this.registerNativeHandle();
    }
    dispose() {
        this.disposables.dispose();
    }
    registerNativeHandle() {
        Event.latch(this.hostService.onDidChangeActiveWindow)(async (windowId) => {
            const handle = await this.hostService.getNativeWindowHandle(windowId);
            this.proxy.$onDidChangeActiveNativeWindowHandle(handle ? encodeBase64(handle) : undefined);
        }, this, this.disposables);
    }
    $getInitialState() {
        return Promise.resolve({
            isFocused: this.hostService.hasFocus,
            isActive: this.userActivityService.isActive,
        });
    }
    async $openUri(uriComponents, uriString, options) {
        const uri = URI.from(uriComponents);
        let target;
        if (uriString && URI.parse(uriString).toString() === uri.toString()) {
            // called with string and no transformation happened -> keep string
            target = uriString;
        }
        else {
            // called with URI or transformed -> use uri
            target = uri;
        }
        return this.openerService.open(target, {
            openExternal: true,
            allowTunneling: options.allowTunneling,
            allowContributedOpeners: options.allowContributedOpeners,
        });
    }
    async $asExternalUri(uriComponents, options) {
        const result = await this.openerService.resolveExternalUri(URI.revive(uriComponents), options);
        return result.resolved;
    }
};
MainThreadWindow = __decorate([
    extHostNamedCustomer(MainContext.MainThreadWindow),
    __param(1, IHostService),
    __param(2, IOpenerService),
    __param(3, IUserActivityService)
], MainThreadWindow);
export { MainThreadWindow };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdpbmRvdy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFdpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUF1QyxXQUFXLEVBQXlCLE1BQU0sK0JBQStCLENBQUM7QUFDeEksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUd2RCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQUs1QixZQUNDLGNBQStCLEVBQ2pCLFdBQTBDLEVBQ3hDLGFBQThDLEVBQ3hDLG1CQUEwRDtRQUZqRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdkIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQU5oRSxnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFRcEQsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FB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
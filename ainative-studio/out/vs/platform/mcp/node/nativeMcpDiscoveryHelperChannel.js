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
import { transformOutgoingURIs } from '../../../base/common/uriIpc.js';
import { INativeMcpDiscoveryHelperService } from '../common/nativeMcpDiscoveryHelper.js';
let NativeMcpDiscoveryHelperChannel = class NativeMcpDiscoveryHelperChannel {
    constructor(getUriTransformer, nativeMcpDiscoveryHelperService) {
        this.getUriTransformer = getUriTransformer;
        this.nativeMcpDiscoveryHelperService = nativeMcpDiscoveryHelperService;
    }
    listen(context, event) {
        throw new Error('Invalid listen');
    }
    async call(context, command, args) {
        const uriTransformer = this.getUriTransformer?.(context);
        switch (command) {
            case 'load': {
                const result = await this.nativeMcpDiscoveryHelperService.load();
                return uriTransformer ? transformOutgoingURIs(result, uriTransformer) : result;
            }
        }
        throw new Error('Invalid call');
    }
};
NativeMcpDiscoveryHelperChannel = __decorate([
    __param(1, INativeMcpDiscoveryHelperService)
], NativeMcpDiscoveryHelperChannel);
export { NativeMcpDiscoveryHelperChannel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5SGVscGVyQ2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWNwL25vZGUvbmF0aXZlTWNwRGlzY292ZXJ5SGVscGVyQ2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQW1CLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFbEYsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBK0I7SUFFM0MsWUFDUyxpQkFBeUUsRUFDdkMsK0JBQWlFO1FBRG5HLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBd0Q7UUFDdkMsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztJQUN4RyxDQUFDO0lBRUwsTUFBTSxDQUFDLE9BQVksRUFBRSxLQUFhO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFZLEVBQUUsT0FBZSxFQUFFLElBQVU7UUFDbkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekQsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pFLE9BQU8sY0FBYyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNoRixDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUNELENBQUE7QUFyQlksK0JBQStCO0lBSXpDLFdBQUEsZ0NBQWdDLENBQUE7R0FKdEIsK0JBQStCLENBcUIzQyJ9
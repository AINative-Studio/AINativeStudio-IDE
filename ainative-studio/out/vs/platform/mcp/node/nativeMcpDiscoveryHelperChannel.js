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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5SGVscGVyQ2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9ub2RlL25hdGl2ZU1jcERpc2NvdmVyeUhlbHBlckNoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXhGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWxGLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQStCO0lBRTNDLFlBQ1MsaUJBQXlFLEVBQ3ZDLCtCQUFpRTtRQURuRyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQXdEO1FBQ3ZDLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBa0M7SUFDeEcsQ0FBQztJQUVMLE1BQU0sQ0FBQyxPQUFZLEVBQUUsS0FBYTtRQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBWSxFQUFFLE9BQWUsRUFBRSxJQUFVO1FBQ25ELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pELFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNiLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNqRSxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDaEYsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRCxDQUFBO0FBckJZLCtCQUErQjtJQUl6QyxXQUFBLGdDQUFnQyxDQUFBO0dBSnRCLCtCQUErQixDQXFCM0MifQ==
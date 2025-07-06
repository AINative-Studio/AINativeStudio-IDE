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
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService } from '../../../../platform/policy/common/policy.js';
import { IDefaultAccountService } from '../../accounts/common/defaultAccount.js';
let AccountPolicyService = class AccountPolicyService extends AbstractPolicyService {
    constructor(logService, defaultAccountService) {
        super();
        this.logService = logService;
        this.defaultAccountService = defaultAccountService;
        this.chatPreviewFeaturesEnabled = true;
        this.defaultAccountService.getDefaultAccount()
            .then(account => {
            this._update(account?.chat_preview_features_enabled ?? true);
            this._register(this.defaultAccountService.onDidChangeDefaultAccount(account => this._update(account?.chat_preview_features_enabled ?? true)));
        });
    }
    _update(chatPreviewFeaturesEnabled) {
        const newValue = (chatPreviewFeaturesEnabled === undefined) || chatPreviewFeaturesEnabled;
        if (this.chatPreviewFeaturesEnabled !== newValue) {
            this.chatPreviewFeaturesEnabled = newValue;
            this._updatePolicyDefinitions(this.policyDefinitions);
        }
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        this.logService.trace(`AccountPolicyService#_updatePolicyDefinitions: Got ${Object.keys(policyDefinitions).length} policy definitions`);
        const update = [];
        for (const key in policyDefinitions) {
            const policy = policyDefinitions[key];
            if (policy.previewFeature) {
                if (this.chatPreviewFeaturesEnabled) {
                    this.policies.delete(key);
                    update.push(key);
                    continue;
                }
                const defaultValue = policy.defaultValue;
                const updatedValue = defaultValue === undefined ? false : defaultValue;
                if (this.policies.get(key) === updatedValue) {
                    continue;
                }
                this.policies.set(key, updatedValue);
                update.push(key);
            }
        }
        if (update.length) {
            this._onDidChange.fire(update);
        }
    }
};
AccountPolicyService = __decorate([
    __param(0, ILogService),
    __param(1, IDefaultAccountService)
], AccountPolicyService);
export { AccountPolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcG9saWNpZXMvY29tbW9uL2FjY291bnRQb2xpY3lTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQW9DLE1BQU0sOENBQThDLENBQUM7QUFDdkgsT0FBTyxFQUF5QixzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWpHLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEscUJBQXFCO0lBRTlELFlBQ2MsVUFBd0MsRUFDN0IscUJBQTZEO1FBRXJGLEtBQUssRUFBRSxDQUFDO1FBSHNCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDWiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSDlFLCtCQUEwQixHQUFZLElBQUksQ0FBQztRQU9sRCxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7YUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsNkJBQTZCLElBQUksSUFBSSxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSw2QkFBNkIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0ksQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sT0FBTyxDQUFDLDBCQUErQztRQUM5RCxNQUFNLFFBQVEsR0FBRyxDQUFDLDBCQUEwQixLQUFLLFNBQVMsQ0FBQyxJQUFJLDBCQUEwQixDQUFDO1FBQzFGLElBQUksSUFBSSxDQUFDLDBCQUEwQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQywwQkFBMEIsR0FBRyxRQUFRLENBQUM7WUFDM0MsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7SUFDRixDQUFDO0lBRVMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLGlCQUFzRDtRQUM5RixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzREFBc0QsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0scUJBQXFCLENBQUMsQ0FBQztRQUV4SSxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUMzQixJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO29CQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDakIsU0FBUztnQkFDVixDQUFDO2dCQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7Z0JBQ3pDLE1BQU0sWUFBWSxHQUFHLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO2dCQUN2RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFlBQVksRUFBRSxDQUFDO29CQUM3QyxTQUFTO2dCQUNWLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBakRZLG9CQUFvQjtJQUc5QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsc0JBQXNCLENBQUE7R0FKWixvQkFBb0IsQ0FpRGhDIn0=
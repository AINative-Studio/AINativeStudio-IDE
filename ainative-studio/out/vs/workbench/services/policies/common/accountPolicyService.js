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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3BvbGljaWVzL2NvbW1vbi9hY2NvdW50UG9saWN5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQyxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZILE9BQU8sRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRyxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLHFCQUFxQjtJQUU5RCxZQUNjLFVBQXdDLEVBQzdCLHFCQUE2RDtRQUVyRixLQUFLLEVBQUUsQ0FBQztRQUhzQixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ1osMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUg5RSwrQkFBMEIsR0FBWSxJQUFJLENBQUM7UUFPbEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFO2FBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLDZCQUE2QixJQUFJLElBQUksQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsNkJBQTZCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9JLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLE9BQU8sQ0FBQywwQkFBK0M7UUFDOUQsTUFBTSxRQUFRLEdBQUcsQ0FBQywwQkFBMEIsS0FBSyxTQUFTLENBQUMsSUFBSSwwQkFBMEIsQ0FBQztRQUMxRixJQUFJLElBQUksQ0FBQywwQkFBMEIsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsUUFBUSxDQUFDO1lBQzNDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUVTLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBc0Q7UUFDOUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0RBQXNELE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLHFCQUFxQixDQUFDLENBQUM7UUFFeEksTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUNyQyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QyxJQUFJLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2pCLFNBQVM7Z0JBQ1YsQ0FBQztnQkFDRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO2dCQUN6QyxNQUFNLFlBQVksR0FBRyxZQUFZLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztnQkFDdkUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxZQUFZLEVBQUUsQ0FBQztvQkFDN0MsU0FBUztnQkFDVixDQUFDO2dCQUNELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWpEWSxvQkFBb0I7SUFHOUIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHNCQUFzQixDQUFBO0dBSlosb0JBQW9CLENBaURoQyJ9
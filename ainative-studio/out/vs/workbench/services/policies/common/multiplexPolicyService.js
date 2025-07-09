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
import { Iterable } from '../../../../base/common/iterator.js';
import { Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService } from '../../../../platform/policy/common/policy.js';
let MultiplexPolicyService = class MultiplexPolicyService extends AbstractPolicyService {
    constructor(policyServices, logService) {
        super();
        this.policyServices = policyServices;
        this.logService = logService;
        this.updatePolicies();
        this._register(Event.any(...this.policyServices.map(service => service.onDidChange))(names => {
            this.updatePolicies();
            this._onDidChange.fire(names);
        }));
    }
    async updatePolicyDefinitions(policyDefinitions) {
        await this._updatePolicyDefinitions(policyDefinitions);
        return Iterable.reduce(this.policies.entries(), (r, [name, value]) => ({ ...r, [name]: value }), {});
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        await Promise.all(this.policyServices.map(service => service.updatePolicyDefinitions(policyDefinitions)));
        this.updatePolicies();
    }
    updatePolicies() {
        this.policies.clear();
        const updated = [];
        for (const service of this.policyServices) {
            const definitions = service.policyDefinitions;
            for (const name in definitions) {
                const value = service.getPolicyValue(name);
                this.policyDefinitions[name] = definitions[name];
                if (value !== undefined) {
                    updated.push(name);
                    this.policies.set(name, value);
                }
            }
        }
        // Check that no results have overlapping keys
        const changed = new Set();
        for (const key of updated) {
            if (changed.has(key)) {
                this.logService.warn(`MultiplexPolicyService#_updatePolicyDefinitions - Found overlapping keys in policy services: ${key}`);
            }
            changed.add(key);
        }
    }
};
MultiplexPolicyService = __decorate([
    __param(1, ILogService)
], MultiplexPolicyService);
export { MultiplexPolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlwbGV4UG9saWN5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcG9saWNpZXMvY29tbW9uL211bHRpcGxleFBvbGljeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFpRCxNQUFNLDhDQUE4QyxDQUFDO0FBRTdILElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEscUJBQXFCO0lBRWhFLFlBQ2tCLGNBQTZDLEVBQ2hDLFVBQXVCO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSFMsbUJBQWMsR0FBZCxjQUFjLENBQStCO1FBQ2hDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJckQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDNUYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRVEsS0FBSyxDQUFDLHVCQUF1QixDQUFDLGlCQUFzRDtRQUM1RixNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFFUyxLQUFLLENBQUMsd0JBQXdCLENBQUMsaUJBQXNEO1FBQzlGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDM0MsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1lBQzlDLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pELElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNuQixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2xDLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7WUFDM0IsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGdHQUFnRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQzdILENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWpEWSxzQkFBc0I7SUFJaEMsV0FBQSxXQUFXLENBQUE7R0FKRCxzQkFBc0IsQ0FpRGxDIn0=
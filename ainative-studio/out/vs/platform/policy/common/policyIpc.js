/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { AbstractPolicyService } from './policy.js';
export class PolicyChannel {
    constructor(service) {
        this.service = service;
        this.disposables = new DisposableStore();
    }
    listen(_, event) {
        switch (event) {
            case 'onDidChange': return Event.map(this.service.onDidChange, names => names.reduce((r, name) => ({ ...r, [name]: this.service.getPolicyValue(name) ?? null }), {}), this.disposables);
        }
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, arg) {
        switch (command) {
            case 'updatePolicyDefinitions': return this.service.updatePolicyDefinitions(arg);
        }
        throw new Error(`Call not found: ${command}`);
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class PolicyChannelClient extends AbstractPolicyService {
    constructor(policiesData, channel) {
        super();
        this.channel = channel;
        for (const name in policiesData) {
            const { definition, value } = policiesData[name];
            this.policyDefinitions[name] = definition;
            if (value !== undefined) {
                this.policies.set(name, value);
            }
        }
        this.channel.listen('onDidChange')(policies => {
            for (const name in policies) {
                const value = policies[name];
                if (value === null) {
                    this.policies.delete(name);
                }
                else {
                    this.policies.set(name, value);
                }
            }
            this._onDidChange.fire(Object.keys(policies));
        });
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        const result = await this.channel.call('updatePolicyDefinitions', policyDefinitions);
        for (const name in result) {
            this.policies.set(name, result[name]);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5SXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3BvbGljeS9jb21tb24vcG9saWN5SXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFpRCxNQUFNLGFBQWEsQ0FBQztBQUduRyxNQUFNLE9BQU8sYUFBYTtJQUl6QixZQUFvQixPQUF1QjtRQUF2QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUYxQixnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFTixDQUFDO0lBRWhELE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYTtRQUMvQixRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxhQUFhLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUN4QixLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUM3RyxJQUFJLENBQUMsV0FBVyxDQUNoQixDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFVLEVBQUUsT0FBZSxFQUFFLEdBQVM7UUFDMUMsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLHlCQUF5QixDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLEdBQTBDLENBQUMsQ0FBQztRQUN6SCxDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG1CQUFvQixTQUFRLHFCQUFxQjtJQUU3RCxZQUFZLFlBQXFGLEVBQW1CLE9BQWlCO1FBQ3BJLEtBQUssRUFBRSxDQUFDO1FBRDJHLFlBQU8sR0FBUCxPQUFPLENBQVU7UUFFcEksS0FBSyxNQUFNLElBQUksSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNqQyxNQUFNLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDO1lBQzFDLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBUyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNyRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUM3QixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBNkIsQ0FBQyxDQUFDO2dCQUV0RCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVTLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBc0Q7UUFDOUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBc0MseUJBQXlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMxSCxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=
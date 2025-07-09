/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IPolicyService = createDecorator('policy');
export class AbstractPolicyService extends Disposable {
    constructor() {
        super(...arguments);
        this.policyDefinitions = {};
        this.policies = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
    }
    async updatePolicyDefinitions(policyDefinitions) {
        const size = Object.keys(this.policyDefinitions).length;
        this.policyDefinitions = { ...policyDefinitions, ...this.policyDefinitions };
        if (size !== Object.keys(this.policyDefinitions).length) {
            await this._updatePolicyDefinitions(this.policyDefinitions);
        }
        return Iterable.reduce(this.policies.entries(), (r, [name, value]) => ({ ...r, [name]: value }), {});
    }
    getPolicyValue(name) {
        return this.policies.get(name);
    }
    serialize() {
        return Iterable.reduce(Object.entries(this.policyDefinitions), (r, [name, definition]) => ({ ...r, [name]: { definition, value: this.policies.get(name) } }), {});
    }
}
export class NullPolicyService {
    constructor() {
        this.onDidChange = Event.None;
        this.policyDefinitions = {};
    }
    async updatePolicyDefinitions() { return {}; }
    getPolicyValue() { return undefined; }
    serialize() { return undefined; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3BvbGljeS9jb21tb24vcG9saWN5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFLOUUsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FBaUIsUUFBUSxDQUFDLENBQUM7QUFZeEUsTUFBTSxPQUFnQixxQkFBc0IsU0FBUSxVQUFVO0lBQTlEOztRQUdRLHNCQUFpQixHQUF3QyxFQUFFLENBQUM7UUFDekQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1FBRXJDLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBeUIsQ0FBQyxDQUFDO1FBQzlFLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7SUFzQmhELENBQUM7SUFwQkEsS0FBSyxDQUFDLHVCQUF1QixDQUFDLGlCQUFzRDtRQUNuRixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN4RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxHQUFHLGlCQUFpQixFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFN0UsSUFBSSxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6RCxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdEcsQ0FBQztJQUVELGNBQWMsQ0FBQyxJQUFnQjtRQUM5QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxTQUFTO1FBQ1IsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUEwRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDN1EsQ0FBQztDQUdEO0FBRUQsTUFBTSxPQUFPLGlCQUFpQjtJQUE5QjtRQUVVLGdCQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUlsQyxzQkFBaUIsR0FBd0MsRUFBRSxDQUFDO0lBQzdELENBQUM7SUFKQSxLQUFLLENBQUMsdUJBQXVCLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlDLGNBQWMsS0FBSyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDdEMsU0FBUyxLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztDQUVqQyJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { isURLDomainTrusted } from '../../common/trustedDomains.js';
export class MockTrustedDomainService {
    constructor(_trustedDomains = []) {
        this._trustedDomains = _trustedDomains;
        this.onDidChangeTrustedDomains = Event.None;
    }
    isValid(resource) {
        return isURLDomainTrusted(resource, this._trustedDomains);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1RydXN0ZWREb21haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VybC90ZXN0L2Jyb3dzZXIvbW9ja1RydXN0ZWREb21haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUc1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVwRSxNQUFNLE9BQU8sd0JBQXdCO0lBR3BDLFlBQTZCLGtCQUE0QixFQUFFO1FBQTlCLG9CQUFlLEdBQWYsZUFBZSxDQUFlO1FBRzNELDhCQUF5QixHQUFnQixLQUFLLENBQUMsSUFBSSxDQUFDO0lBRnBELENBQUM7SUFJRCxPQUFPLENBQUMsUUFBYTtRQUNwQixPQUFPLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNEIn0=
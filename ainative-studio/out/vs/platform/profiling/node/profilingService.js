/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { generateUuid } from '../../../base/common/uuid.js';
export class InspectProfilingService {
    constructor() {
        this._sessions = new Map();
    }
    async startProfiling(options) {
        const prof = await import('v8-inspect-profiler');
        const session = await prof.startProfiling({ host: options.host, port: options.port, checkForPaused: true });
        const id = generateUuid();
        this._sessions.set(id, session);
        return id;
    }
    async stopProfiling(sessionId) {
        const session = this._sessions.get(sessionId);
        if (!session) {
            throw new Error(`UNKNOWN session '${sessionId}'`);
        }
        const result = await session.stop();
        this._sessions.delete(sessionId);
        return result.profile;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsaW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9maWxpbmcvbm9kZS9wcm9maWxpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUc1RCxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBSWtCLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztJQW1CbEUsQ0FBQztJQWpCQSxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQXVDO1FBQzNELE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDakQsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDNUcsTUFBTSxFQUFFLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBaUI7UUFDcEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakMsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCJ9
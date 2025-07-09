/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
export class ServerTelemetryChannel extends Disposable {
    constructor(telemetryService, telemetryAppender) {
        super();
        this.telemetryService = telemetryService;
        this.telemetryAppender = telemetryAppender;
    }
    async call(_, command, arg) {
        switch (command) {
            case 'updateTelemetryLevel': {
                const { telemetryLevel } = arg;
                return this.telemetryService.updateInjectedTelemetryLevel(telemetryLevel);
            }
            case 'logTelemetry': {
                const { eventName, data } = arg;
                // Logging is done directly to the appender instead of through the telemetry service
                // as the data sent from the client has already had common properties added to it and
                // has already been sent to the telemetry output channel
                if (this.telemetryAppender) {
                    return this.telemetryAppender.log(eventName, data);
                }
                return Promise.resolve();
            }
            case 'flushTelemetry': {
                if (this.telemetryAppender) {
                    return this.telemetryAppender.flush();
                }
                return Promise.resolve();
            }
            case 'ping': {
                return;
            }
        }
        // Command we cannot handle so we throw an error
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(_, event, arg) {
        throw new Error('Not supported');
    }
    /**
     * Disposing the channel also disables the telemetryService as there is
     * no longer a way to control it
     */
    dispose() {
        this.telemetryService.updateInjectedTelemetryLevel(0 /* TelemetryLevel.NONE */);
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVsZW1ldHJ5Q2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL3JlbW90ZVRlbGVtZXRyeUNoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBTS9ELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO0lBQ3JELFlBQ2tCLGdCQUF5QyxFQUN6QyxpQkFBNEM7UUFFN0QsS0FBSyxFQUFFLENBQUM7UUFIUyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO1FBQ3pDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMkI7SUFHOUQsQ0FBQztJQUdELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBTSxFQUFFLE9BQWUsRUFBRSxHQUFTO1FBQzVDLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzdCLE1BQU0sRUFBRSxjQUFjLEVBQUUsR0FBRyxHQUFHLENBQUM7Z0JBQy9CLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLDRCQUE0QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzNFLENBQUM7WUFFRCxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDO2dCQUNoQyxvRkFBb0Y7Z0JBQ3BGLHFGQUFxRjtnQkFDckYsd0RBQXdEO2dCQUN4RCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUM1QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxDQUFDO2dCQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFCLENBQUM7WUFFRCxLQUFLLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3ZDLENBQUM7Z0JBRUQsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDMUIsQ0FBQztZQUVELEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDYixPQUFPO1lBQ1IsQ0FBQztRQUNGLENBQUM7UUFDRCxnREFBZ0Q7UUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLE9BQU8sWUFBWSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFNLEVBQUUsS0FBYSxFQUFFLEdBQVE7UUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ2EsT0FBTztRQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsNEJBQTRCLDZCQUFxQixDQUFDO1FBQ3hFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0QifQ==
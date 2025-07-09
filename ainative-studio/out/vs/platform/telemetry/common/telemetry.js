/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ITelemetryService = createDecorator('telemetryService');
export const ICustomEndpointTelemetryService = createDecorator('customEndpointTelemetryService');
// Keys
export const currentSessionDateStorageKey = 'telemetry.currentSessionDate';
export const firstSessionDateStorageKey = 'telemetry.firstSessionDate';
export const lastSessionDateStorageKey = 'telemetry.lastSessionDate';
export const machineIdKey = 'telemetry.machineId';
export const sqmIdKey = 'telemetry.sqmId';
export const devDeviceIdKey = 'telemetry.devDeviceId';
// Configuration Keys
export const TELEMETRY_SECTION_ID = 'telemetry';
export const TELEMETRY_SETTING_ID = 'telemetry.telemetryLevel';
export const TELEMETRY_CRASH_REPORTER_SETTING_ID = 'telemetry.enableCrashReporter';
export const TELEMETRY_OLD_SETTING_ID = 'telemetry.enableTelemetry';
export var TelemetryLevel;
(function (TelemetryLevel) {
    TelemetryLevel[TelemetryLevel["NONE"] = 0] = "NONE";
    TelemetryLevel[TelemetryLevel["CRASH"] = 1] = "CRASH";
    TelemetryLevel[TelemetryLevel["ERROR"] = 2] = "ERROR";
    TelemetryLevel[TelemetryLevel["USAGE"] = 3] = "USAGE";
})(TelemetryLevel || (TelemetryLevel = {}));
export var TelemetryConfiguration;
(function (TelemetryConfiguration) {
    TelemetryConfiguration["OFF"] = "off";
    TelemetryConfiguration["CRASH"] = "crash";
    TelemetryConfiguration["ERROR"] = "error";
    TelemetryConfiguration["ON"] = "all";
})(TelemetryConfiguration || (TelemetryConfiguration = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vdGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUc5RSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUM7QUFxRHhGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGVBQWUsQ0FBa0MsZ0NBQWdDLENBQUMsQ0FBQztBQVNsSSxPQUFPO0FBQ1AsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsOEJBQThCLENBQUM7QUFDM0UsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsNEJBQTRCLENBQUM7QUFDdkUsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsMkJBQTJCLENBQUM7QUFDckUsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLHFCQUFxQixDQUFDO0FBQ2xELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQztBQUMxQyxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLENBQUM7QUFFdEQscUJBQXFCO0FBQ3JCLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLFdBQVcsQ0FBQztBQUNoRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRywwQkFBMEIsQ0FBQztBQUMvRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRywrQkFBK0IsQ0FBQztBQUNuRixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRywyQkFBMkIsQ0FBQztBQUVwRSxNQUFNLENBQU4sSUFBa0IsY0FLakI7QUFMRCxXQUFrQixjQUFjO0lBQy9CLG1EQUFRLENBQUE7SUFDUixxREFBUyxDQUFBO0lBQ1QscURBQVMsQ0FBQTtJQUNULHFEQUFTLENBQUE7QUFDVixDQUFDLEVBTGlCLGNBQWMsS0FBZCxjQUFjLFFBSy9CO0FBRUQsTUFBTSxDQUFOLElBQWtCLHNCQUtqQjtBQUxELFdBQWtCLHNCQUFzQjtJQUN2QyxxQ0FBVyxDQUFBO0lBQ1gseUNBQWUsQ0FBQTtJQUNmLHlDQUFlLENBQUE7SUFDZixvQ0FBVSxDQUFBO0FBQ1gsQ0FBQyxFQUxpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBS3ZDIn0=
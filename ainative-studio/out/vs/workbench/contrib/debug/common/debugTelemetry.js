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
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let DebugTelemetry = class DebugTelemetry {
    constructor(model, telemetryService) {
        this.model = model;
        this.telemetryService = telemetryService;
    }
    logDebugSessionStart(dbgr, launchJsonExists) {
        const extension = dbgr.getMainExtensionDescriptor();
        /* __GDPR__
            "debugSessionStart" : {
                "owner": "connor4312",
                "type": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "breakpointCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "exceptionBreakpoints": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "watchExpressionsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "extensionName": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" },
                "isBuiltin": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true},
                "launchJsonExists": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
            }
        */
        this.telemetryService.publicLog('debugSessionStart', {
            type: dbgr.type,
            breakpointCount: this.model.getBreakpoints().length,
            exceptionBreakpoints: this.model.getExceptionBreakpoints(),
            watchExpressionsCount: this.model.getWatchExpressions().length,
            extensionName: extension.identifier.value,
            isBuiltin: extension.isBuiltin,
            launchJsonExists
        });
    }
    logDebugSessionStop(session, adapterExitEvent) {
        const breakpoints = this.model.getBreakpoints();
        /* __GDPR__
            "debugSessionStop" : {
                "owner": "connor4312",
                "type" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "success": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "sessionLengthInSeconds": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "breakpointCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "watchExpressionsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
            }
        */
        this.telemetryService.publicLog('debugSessionStop', {
            type: session && session.configuration.type,
            success: adapterExitEvent.emittedStopped || breakpoints.length === 0,
            sessionLengthInSeconds: adapterExitEvent.sessionLengthInSeconds,
            breakpointCount: breakpoints.length,
            watchExpressionsCount: this.model.getWatchExpressions().length
        });
    }
};
DebugTelemetry = __decorate([
    __param(1, ITelemetryService)
], DebugTelemetry);
export { DebugTelemetry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z1RlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUdoRixJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO0lBRTFCLFlBQ2tCLEtBQWtCLEVBQ0MsZ0JBQW1DO1FBRHRELFVBQUssR0FBTCxLQUFLLENBQWE7UUFDQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO0lBQ3BFLENBQUM7SUFFTCxvQkFBb0IsQ0FBQyxJQUFjLEVBQUUsZ0JBQXlCO1FBQzdELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1FBQ3BEOzs7Ozs7Ozs7OztVQVdFO1FBQ0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRTtZQUNwRCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixlQUFlLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNO1lBQ25ELG9CQUFvQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUU7WUFDMUQscUJBQXFCLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLE1BQU07WUFDOUQsYUFBYSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSztZQUN6QyxTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVM7WUFDOUIsZ0JBQWdCO1NBQ2hCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxPQUFzQixFQUFFLGdCQUFpQztRQUU1RSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRWhEOzs7Ozs7Ozs7VUFTRTtRQUNGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUU7WUFDbkQsSUFBSSxFQUFFLE9BQU8sSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUk7WUFDM0MsT0FBTyxFQUFFLGdCQUFnQixDQUFDLGNBQWMsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDcEUsc0JBQXNCLEVBQUUsZ0JBQWdCLENBQUMsc0JBQXNCO1lBQy9ELGVBQWUsRUFBRSxXQUFXLENBQUMsTUFBTTtZQUNuQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUMsTUFBTTtTQUM5RCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQXREWSxjQUFjO0lBSXhCLFdBQUEsaUJBQWlCLENBQUE7R0FKUCxjQUFjLENBc0QxQiJ9
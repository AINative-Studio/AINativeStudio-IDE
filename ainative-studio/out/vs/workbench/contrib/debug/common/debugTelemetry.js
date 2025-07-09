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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBR2hGLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFFMUIsWUFDa0IsS0FBa0IsRUFDQyxnQkFBbUM7UUFEdEQsVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUNDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7SUFDcEUsQ0FBQztJQUVMLG9CQUFvQixDQUFDLElBQWMsRUFBRSxnQkFBeUI7UUFDN0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFDcEQ7Ozs7Ozs7Ozs7O1VBV0U7UUFDRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFO1lBQ3BELElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLGVBQWUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU07WUFDbkQsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRTtZQUMxRCxxQkFBcUIsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUMsTUFBTTtZQUM5RCxhQUFhLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLO1lBQ3pDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztZQUM5QixnQkFBZ0I7U0FDaEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELG1CQUFtQixDQUFDLE9BQXNCLEVBQUUsZ0JBQWlDO1FBRTVFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFaEQ7Ozs7Ozs7OztVQVNFO1FBQ0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRTtZQUNuRCxJQUFJLEVBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSTtZQUMzQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsY0FBYyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUNwRSxzQkFBc0IsRUFBRSxnQkFBZ0IsQ0FBQyxzQkFBc0I7WUFDL0QsZUFBZSxFQUFFLFdBQVcsQ0FBQyxNQUFNO1lBQ25DLHFCQUFxQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxNQUFNO1NBQzlELENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBdERZLGNBQWM7SUFJeEIsV0FBQSxpQkFBaUIsQ0FBQTtHQUpQLGNBQWMsQ0FzRDFCIn0=
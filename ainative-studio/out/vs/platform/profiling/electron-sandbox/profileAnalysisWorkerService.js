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
import { createWebWorker } from '../../../base/browser/webWorkerFactory.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { reportSample } from '../common/profilingTelemetrySpec.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { FileAccess } from '../../../base/common/network.js';
export var ProfilingOutput;
(function (ProfilingOutput) {
    ProfilingOutput[ProfilingOutput["Failure"] = 0] = "Failure";
    ProfilingOutput[ProfilingOutput["Irrelevant"] = 1] = "Irrelevant";
    ProfilingOutput[ProfilingOutput["Interesting"] = 2] = "Interesting";
})(ProfilingOutput || (ProfilingOutput = {}));
export const IProfileAnalysisWorkerService = createDecorator('IProfileAnalysisWorkerService');
// ---- impl
let ProfileAnalysisWorkerService = class ProfileAnalysisWorkerService {
    constructor(_telemetryService, _logService) {
        this._telemetryService = _telemetryService;
        this._logService = _logService;
    }
    async _withWorker(callback) {
        const worker = createWebWorker(FileAccess.asBrowserUri('vs/platform/profiling/electron-sandbox/profileAnalysisWorkerMain.js'), 'CpuProfileAnalysisWorker');
        try {
            const r = await callback(worker.proxy);
            return r;
        }
        finally {
            worker.dispose();
        }
    }
    async analyseBottomUp(profile, callFrameClassifier, perfBaseline, sendAsErrorTelemtry) {
        return this._withWorker(async (worker) => {
            const result = await worker.$analyseBottomUp(profile);
            if (result.kind === 2 /* ProfilingOutput.Interesting */) {
                for (const sample of result.samples) {
                    reportSample({
                        sample,
                        perfBaseline,
                        source: callFrameClassifier(sample.url)
                    }, this._telemetryService, this._logService, sendAsErrorTelemtry);
                }
            }
            return result.kind;
        });
    }
    async analyseByLocation(profile, locations) {
        return this._withWorker(async (worker) => {
            const result = await worker.$analyseByUrlCategory(profile, locations);
            return result;
        });
    }
};
ProfileAnalysisWorkerService = __decorate([
    __param(0, ITelemetryService),
    __param(1, ILogService)
], ProfileAnalysisWorkerService);
registerSingleton(IProfileAnalysisWorkerService, ProfileAnalysisWorkerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZUFuYWx5c2lzV29ya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9maWxpbmcvZWxlY3Ryb24tc2FuZGJveC9wcm9maWxlQW5hbHlzaXNXb3JrZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUc1RSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUd0RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTdELE1BQU0sQ0FBTixJQUFrQixlQUlqQjtBQUpELFdBQWtCLGVBQWU7SUFDaEMsMkRBQU8sQ0FBQTtJQUNQLGlFQUFVLENBQUE7SUFDVixtRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUppQixlQUFlLEtBQWYsZUFBZSxRQUloQztBQU1ELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FBZ0MsK0JBQStCLENBQUMsQ0FBQztBQVM3SCxZQUFZO0FBRVosSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFJakMsWUFDcUMsaUJBQW9DLEVBQzFDLFdBQXdCO1FBRGxCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDMUMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7SUFDbkQsQ0FBQztJQUVHLEtBQUssQ0FBQyxXQUFXLENBQUksUUFBaUU7UUFFN0YsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUM3QixVQUFVLENBQUMsWUFBWSxDQUFDLHFFQUFxRSxDQUFDLEVBQzlGLDBCQUEwQixDQUMxQixDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0osTUFBTSxDQUFDLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFtQixFQUFFLG1CQUF5QyxFQUFFLFlBQW9CLEVBQUUsbUJBQTRCO1FBQ3ZJLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUMsTUFBTSxFQUFDLEVBQUU7WUFDdEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEQsSUFBSSxNQUFNLENBQUMsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO2dCQUNqRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDckMsWUFBWSxDQUFDO3dCQUNaLE1BQU07d0JBQ04sWUFBWTt3QkFDWixNQUFNLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztxQkFDdkMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNuRSxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBbUIsRUFBRSxTQUF3QztRQUNwRixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFDLE1BQU0sRUFBQyxFQUFFO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN0RSxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUE5Q0ssNEJBQTRCO0lBSy9CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxXQUFXLENBQUE7R0FOUiw0QkFBNEIsQ0E4Q2pDO0FBcUJELGlCQUFpQixDQUFDLDZCQUE2QixFQUFFLDRCQUE0QixvQ0FBNEIsQ0FBQyJ9
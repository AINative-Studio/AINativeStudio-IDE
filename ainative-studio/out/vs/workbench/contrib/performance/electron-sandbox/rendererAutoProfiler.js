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
import { timeout } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProfileAnalysisWorkerService } from '../../../../platform/profiling/electron-sandbox/profileAnalysisWorkerService.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { parseExtensionDevOptions } from '../../../services/extensions/common/extensionDevOptions.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
let RendererProfiling = class RendererProfiling {
    constructor(_environmentService, _fileService, _logService, nativeHostService, timerService, configService, profileAnalysisService) {
        this._environmentService = _environmentService;
        this._fileService = _fileService;
        this._logService = _logService;
        const devOpts = parseExtensionDevOptions(_environmentService);
        if (devOpts.isExtensionDevTestFromCli) {
            // disabled when running extension tests
            return;
        }
        timerService.perfBaseline.then(perfBaseline => {
            (_environmentService.isBuilt ? _logService.info : _logService.trace).apply(_logService, [`[perf] Render performance baseline is ${perfBaseline}ms`]);
            if (perfBaseline < 0) {
                // too slow
                return;
            }
            // SLOW threshold
            const slowThreshold = perfBaseline * 10; // ~10 frames at 64fps on MY machine
            const obs = new PerformanceObserver(async (list) => {
                obs.takeRecords();
                const maxDuration = list.getEntries()
                    .map(e => e.duration)
                    .reduce((p, c) => Math.max(p, c), 0);
                if (maxDuration < slowThreshold) {
                    return;
                }
                if (!configService.getValue('application.experimental.rendererProfiling')) {
                    _logService.debug(`[perf] SLOW task detected (${maxDuration}ms) but renderer profiling is disabled via 'application.experimental.rendererProfiling'`);
                    return;
                }
                const sessionId = generateUuid();
                _logService.warn(`[perf] Renderer reported VERY LONG TASK (${maxDuration}ms), starting profiling session '${sessionId}'`);
                // pause observation, we'll take a detailed look
                obs.disconnect();
                // profile renderer for 5secs, analyse, and take action depending on the result
                for (let i = 0; i < 3; i++) {
                    try {
                        const profile = await nativeHostService.profileRenderer(sessionId, 5000);
                        const output = await profileAnalysisService.analyseBottomUp(profile, _url => '<<renderer>>', perfBaseline, true);
                        if (output === 2 /* ProfilingOutput.Interesting */) {
                            this._store(profile, sessionId);
                            break;
                        }
                        timeout(15000); // wait 15s
                    }
                    catch (err) {
                        _logService.error(err);
                        break;
                    }
                }
                // reconnect the observer
                obs.observe({ entryTypes: ['longtask'] });
            });
            obs.observe({ entryTypes: ['longtask'] });
            this._observer = obs;
        });
    }
    dispose() {
        this._observer?.disconnect();
    }
    async _store(profile, sessionId) {
        const path = joinPath(this._environmentService.tmpDir, `renderer-${Math.random().toString(16).slice(2, 8)}.cpuprofile.json`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(profile)));
        this._logService.info(`[perf] stored profile to DISK '${path}'`, sessionId);
    }
};
RendererProfiling = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, ILogService),
    __param(3, INativeHostService),
    __param(4, ITimerService),
    __param(5, IConfigurationService),
    __param(6, IProfileAnalysisWorkerService)
], RendererProfiling);
export { RendererProfiling };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXJBdXRvUHJvZmlsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvZWxlY3Ryb24tc2FuZGJveC9yZW5kZXJlckF1dG9Qcm9maWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVsRixPQUFPLEVBQUUsNkJBQTZCLEVBQW1CLE1BQU0saUZBQWlGLENBQUM7QUFDakosT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDMUgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXpFLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBSTdCLFlBQ3NELG1CQUF1RCxFQUM3RSxZQUEwQixFQUMzQixXQUF3QixFQUNsQyxpQkFBcUMsRUFDMUMsWUFBMkIsRUFDbkIsYUFBb0MsRUFDNUIsc0JBQXFEO1FBTi9CLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBb0M7UUFDN0UsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDM0IsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFPdEQsTUFBTSxPQUFPLEdBQUcsd0JBQXdCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM5RCxJQUFJLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ3ZDLHdDQUF3QztZQUN4QyxPQUFPO1FBQ1IsQ0FBQztRQUVELFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQzdDLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLHlDQUF5QyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFckosSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLFdBQVc7Z0JBQ1gsT0FBTztZQUNSLENBQUM7WUFFRCxpQkFBaUI7WUFDakIsTUFBTSxhQUFhLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQyxDQUFDLG9DQUFvQztZQUU3RSxNQUFNLEdBQUcsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEtBQUssRUFBQyxJQUFJLEVBQUMsRUFBRTtnQkFFaEQsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNsQixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFO3FCQUNuQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO3FCQUNwQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFdEMsSUFBSSxXQUFXLEdBQUcsYUFBYSxFQUFFLENBQUM7b0JBQ2pDLE9BQU87Z0JBQ1IsQ0FBQztnQkFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUFFLENBQUM7b0JBQzNFLFdBQVcsQ0FBQyxLQUFLLENBQUMsOEJBQThCLFdBQVcseUZBQXlGLENBQUMsQ0FBQztvQkFDdEosT0FBTztnQkFDUixDQUFDO2dCQUVELE1BQU0sU0FBUyxHQUFHLFlBQVksRUFBRSxDQUFDO2dCQUVqQyxXQUFXLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxXQUFXLG9DQUFvQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO2dCQUUxSCxnREFBZ0Q7Z0JBQ2hELEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFFakIsK0VBQStFO2dCQUMvRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBRTVCLElBQUksQ0FBQzt3QkFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sc0JBQXNCLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2pILElBQUksTUFBTSx3Q0FBZ0MsRUFBRSxDQUFDOzRCQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQzs0QkFDaEMsTUFBTTt3QkFDUCxDQUFDO3dCQUVELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVc7b0JBRTVCLENBQUM7b0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQzt3QkFDZCxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUN2QixNQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCx5QkFBeUI7Z0JBQ3pCLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0MsQ0FBQyxDQUFDLENBQUM7WUFFSCxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBRXRCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHTyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQW1CLEVBQUUsU0FBaUI7UUFDMUQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDN0gsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsSUFBSSxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0UsQ0FBQztDQUNELENBQUE7QUE3RlksaUJBQWlCO0lBSzNCLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsNkJBQTZCLENBQUE7R0FYbkIsaUJBQWlCLENBNkY3QiJ9
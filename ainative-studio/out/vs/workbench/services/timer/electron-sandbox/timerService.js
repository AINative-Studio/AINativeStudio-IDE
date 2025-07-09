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
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AbstractTimerService, ITimerService } from '../browser/timerService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
let TimerService = class TimerService extends AbstractTimerService {
    constructor(_nativeHostService, _environmentService, lifecycleService, contextService, extensionService, updateService, paneCompositeService, editorService, accessibilityService, telemetryService, layoutService, _productService, _storageService) {
        super(lifecycleService, contextService, extensionService, updateService, paneCompositeService, editorService, accessibilityService, telemetryService, layoutService);
        this._nativeHostService = _nativeHostService;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._storageService = _storageService;
        this.setPerformanceMarks('main', _environmentService.window.perfMarks);
    }
    _isInitialStartup() {
        return Boolean(this._environmentService.window.isInitialStartup);
    }
    _didUseCachedData() {
        return didUseCachedData(this._productService, this._storageService, this._environmentService);
    }
    _getWindowCount() {
        return this._nativeHostService.getWindowCount();
    }
    async _extendStartupInfo(info) {
        try {
            const [osProperties, osStatistics, virtualMachineHint, isARM64Emulated] = await Promise.all([
                this._nativeHostService.getOSProperties(),
                this._nativeHostService.getOSStatistics(),
                this._nativeHostService.getOSVirtualMachineHint(),
                this._nativeHostService.isRunningUnderARM64Translation()
            ]);
            info.totalmem = osStatistics.totalmem;
            info.freemem = osStatistics.freemem;
            info.platform = osProperties.platform;
            info.release = osProperties.release;
            info.arch = osProperties.arch;
            info.loadavg = osStatistics.loadavg;
            info.isARM64Emulated = isARM64Emulated;
            const processMemoryInfo = await process.getProcessMemoryInfo();
            info.meminfo = {
                workingSetSize: processMemoryInfo.residentSet,
                privateBytes: processMemoryInfo.private,
                sharedBytes: processMemoryInfo.shared
            };
            info.isVMLikelyhood = Math.round((virtualMachineHint * 100));
            const rawCpus = osProperties.cpus;
            if (rawCpus && rawCpus.length > 0) {
                info.cpus = { count: rawCpus.length, speed: rawCpus[0].speed, model: rawCpus[0].model };
            }
        }
        catch (error) {
            // ignore, be on the safe side with these hardware method calls
        }
    }
    _shouldReportPerfMarks() {
        // always send when running with the prof-append-timers flag
        return super._shouldReportPerfMarks() || Boolean(this._environmentService.args['prof-append-timers']);
    }
};
TimerService = __decorate([
    __param(0, INativeHostService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, ILifecycleService),
    __param(3, IWorkspaceContextService),
    __param(4, IExtensionService),
    __param(5, IUpdateService),
    __param(6, IPaneCompositePartService),
    __param(7, IEditorService),
    __param(8, IAccessibilityService),
    __param(9, ITelemetryService),
    __param(10, IWorkbenchLayoutService),
    __param(11, IProductService),
    __param(12, IStorageService)
], TimerService);
export { TimerService };
registerSingleton(ITimerService, TimerService, 1 /* InstantiationType.Delayed */);
//#region cached data logic
const lastRunningCommitStorageKey = 'perf/lastRunningCommit';
let _didUseCachedData = undefined;
export function didUseCachedData(productService, storageService, environmentService) {
    // browser code loading: only a guess based on
    // this being the first start with the commit
    // or subsequent
    if (typeof _didUseCachedData !== 'boolean') {
        if (!environmentService.window.isCodeCaching || !productService.commit) {
            _didUseCachedData = false; // we only produce cached data whith commit and code cache path
        }
        else if (storageService.get(lastRunningCommitStorageKey, -1 /* StorageScope.APPLICATION */) === productService.commit) {
            _didUseCachedData = true; // subsequent start on same commit, assume cached data is there
        }
        else {
            storageService.store(lastRunningCommitStorageKey, productService.commit, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            _didUseCachedData = false; // first time start on commit, assume cached data is not yet there
        }
    }
    return _didUseCachedData;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aW1lci9lbGVjdHJvbi1zYW5kYm94L3RpbWVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBbUIsb0JBQW9CLEVBQWEsYUFBYSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDN0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3JGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBK0Is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
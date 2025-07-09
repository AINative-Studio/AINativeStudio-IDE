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
import * as perf from '../../../../base/common/performance.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Barrier, timeout } from '../../../../base/common/async.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { isWeb } from '../../../../base/common/platform.js';
import { createBlobWorker } from '../../../../base/browser/webWorkerFactory.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { TerminalExtensions } from '../../../../platform/terminal/common/terminal.js';
export const ITimerService = createDecorator('timerService');
class PerfMarks {
    constructor() {
        this._entries = [];
    }
    setMarks(source, entries) {
        this._entries.push([source, entries]);
    }
    getDuration(from, to) {
        const fromEntry = this._findEntry(from);
        if (!fromEntry) {
            return 0;
        }
        const toEntry = this._findEntry(to);
        if (!toEntry) {
            return 0;
        }
        return toEntry.startTime - fromEntry.startTime;
    }
    getStartTime(mark) {
        const entry = this._findEntry(mark);
        return entry ? entry.startTime : -1;
    }
    _findEntry(name) {
        for (const [, marks] of this._entries) {
            for (let i = marks.length - 1; i >= 0; i--) {
                if (marks[i].name === name) {
                    return marks[i];
                }
            }
        }
    }
    getEntries() {
        return this._entries.slice(0);
    }
}
let AbstractTimerService = class AbstractTimerService {
    constructor(_lifecycleService, _contextService, _extensionService, _updateService, _paneCompositeService, _editorService, _accessibilityService, _telemetryService, layoutService) {
        this._lifecycleService = _lifecycleService;
        this._contextService = _contextService;
        this._extensionService = _extensionService;
        this._updateService = _updateService;
        this._paneCompositeService = _paneCompositeService;
        this._editorService = _editorService;
        this._accessibilityService = _accessibilityService;
        this._telemetryService = _telemetryService;
        this._barrier = new Barrier();
        this._marks = new PerfMarks();
        this._rndValueShouldSendTelemetry = Math.random() < .03; // 3% of users
        Promise.all([
            this._extensionService.whenInstalledExtensionsRegistered(), // extensions registered
            _lifecycleService.when(3 /* LifecyclePhase.Restored */), // workbench created and parts restored
            layoutService.whenRestored, // layout restored (including visible editors resolved)
            Promise.all(Array.from(Registry.as(TerminalExtensions.Backend).backends.values()).map(e => e.whenReady))
        ]).then(() => {
            // set perf mark from renderer
            this.setPerformanceMarks('renderer', perf.getMarks());
            return this._computeStartupMetrics();
        }).then(metrics => {
            this._startupMetrics = metrics;
            this._reportStartupTimes(metrics);
            this._barrier.open();
        });
        this.perfBaseline = this._barrier.wait()
            .then(() => this._lifecycleService.when(4 /* LifecyclePhase.Eventually */))
            .then(() => timeout(this._startupMetrics.timers.ellapsedRequire))
            .then(() => {
            // we use fibonacci numbers to have a performance baseline that indicates
            // how slow/fast THIS machine actually is.
            const jsSrc = (function () {
                // the following operation took ~16ms (one frame at 64FPS) to complete on my machine. We derive performance observations
                // from that. We also bail if that took too long (>1s)
                let tooSlow = false;
                function fib(n) {
                    if (tooSlow) {
                        return 0;
                    }
                    if (performance.now() - t1 >= 1000) {
                        tooSlow = true;
                    }
                    if (n <= 2) {
                        return n;
                    }
                    return fib(n - 1) + fib(n - 2);
                }
                const t1 = performance.now();
                fib(24);
                const value = Math.round(performance.now() - t1);
                self.postMessage({ value: tooSlow ? -1 : value });
            }).toString();
            const blob = new Blob([`(${jsSrc})();`], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            const worker = createBlobWorker(blobUrl, { name: 'perfBaseline' });
            return new Promise(resolve => {
                worker.onmessage = e => resolve(e.data.value);
            }).finally(() => {
                worker.terminate();
                URL.revokeObjectURL(blobUrl);
            });
        });
    }
    whenReady() {
        return this._barrier.wait();
    }
    get startupMetrics() {
        if (!this._startupMetrics) {
            throw new Error('illegal state, MUST NOT access startupMetrics before whenReady has resolved');
        }
        return this._startupMetrics;
    }
    setPerformanceMarks(source, marks) {
        // Perf marks are a shared resource because anyone can generate them
        // and because of that we only accept marks that start with 'code/'
        const codeMarks = marks.filter(mark => mark.name.startsWith('code/'));
        this._marks.setMarks(source, codeMarks);
        this._reportPerformanceMarks(source, codeMarks);
    }
    getPerformanceMarks() {
        return this._marks.getEntries();
    }
    getDuration(from, to) {
        return this._marks.getDuration(from, to);
    }
    getStartTime(mark) {
        return this._marks.getStartTime(mark);
    }
    _reportStartupTimes(metrics) {
        // report IStartupMetrics as telemetry
        /* __GDPR__
            "startupTimeVaried" : {
                "owner": "jrieken",
                "${include}": [
                    "${IStartupMetrics}"
                ]
            }
        */
        this._telemetryService.publicLog('startupTimeVaried', metrics);
    }
    _shouldReportPerfMarks() {
        return this._rndValueShouldSendTelemetry;
    }
    _reportPerformanceMarks(source, marks) {
        if (!this._shouldReportPerfMarks()) {
            // the `startup.timer.mark` event is send very often. In order to save resources
            // we let some of our instances/sessions send this event
            return;
        }
        for (const mark of marks) {
            this._telemetryService.publicLog2('startup.timer.mark', {
                source,
                name: new TelemetryTrustedValue(mark.name),
                startTime: mark.startTime
            });
        }
    }
    async _computeStartupMetrics() {
        const initialStartup = this._isInitialStartup();
        let startMark;
        if (isWeb) {
            startMark = 'code/timeOrigin';
        }
        else {
            startMark = initialStartup ? 'code/didStartMain' : 'code/willOpenNewWindow';
        }
        const activeViewlet = this._paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        const activePanel = this._paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        const info = {
            ellapsed: this._marks.getDuration(startMark, 'code/didStartWorkbench'),
            // reflections
            isLatestVersion: Boolean(await this._updateService.isLatestVersion()),
            didUseCachedData: this._didUseCachedData(),
            windowKind: this._lifecycleService.startupKind,
            windowCount: await this._getWindowCount(),
            viewletId: activeViewlet?.getId(),
            editorIds: this._editorService.visibleEditors.map(input => input.typeId),
            panelId: activePanel ? activePanel.getId() : undefined,
            // timers
            timers: {
                ellapsedAppReady: initialStartup ? this._marks.getDuration('code/didStartMain', 'code/mainAppReady') : undefined,
                ellapsedNlsGeneration: initialStartup ? this._marks.getDuration('code/willGenerateNls', 'code/didGenerateNls') : undefined,
                ellapsedLoadMainBundle: initialStartup ? this._marks.getDuration('code/willLoadMainBundle', 'code/didLoadMainBundle') : undefined,
                ellapsedRunMainBundle: initialStartup ? this._marks.getDuration('code/didStartMain', 'code/didRunMainBundle') : undefined,
                ellapsedCrashReporter: initialStartup ? this._marks.getDuration('code/willStartCrashReporter', 'code/didStartCrashReporter') : undefined,
                ellapsedMainServer: initialStartup ? this._marks.getDuration('code/willStartMainServer', 'code/didStartMainServer') : undefined,
                ellapsedWindowCreate: initialStartup ? this._marks.getDuration('code/willCreateCodeWindow', 'code/didCreateCodeWindow') : undefined,
                ellapsedWindowRestoreState: initialStartup ? this._marks.getDuration('code/willRestoreCodeWindowState', 'code/didRestoreCodeWindowState') : undefined,
                ellapsedBrowserWindowCreate: initialStartup ? this._marks.getDuration('code/willCreateCodeBrowserWindow', 'code/didCreateCodeBrowserWindow') : undefined,
                ellapsedWindowMaximize: initialStartup ? this._marks.getDuration('code/willMaximizeCodeWindow', 'code/didMaximizeCodeWindow') : undefined,
                ellapsedWindowLoad: initialStartup ? this._marks.getDuration('code/mainAppReady', 'code/willOpenNewWindow') : undefined,
                ellapsedWindowLoadToRequire: this._marks.getDuration('code/willOpenNewWindow', 'code/willLoadWorkbenchMain'),
                ellapsedRequire: this._marks.getDuration('code/willLoadWorkbenchMain', 'code/didLoadWorkbenchMain'),
                ellapsedWaitForWindowConfig: this._marks.getDuration('code/willWaitForWindowConfig', 'code/didWaitForWindowConfig'),
                ellapsedStorageInit: this._marks.getDuration('code/willInitStorage', 'code/didInitStorage'),
                ellapsedSharedProcesConnected: this._marks.getDuration('code/willConnectSharedProcess', 'code/didConnectSharedProcess'),
                ellapsedWorkspaceServiceInit: this._marks.getDuration('code/willInitWorkspaceService', 'code/didInitWorkspaceService'),
                ellapsedRequiredUserDataInit: this._marks.getDuration('code/willInitRequiredUserData', 'code/didInitRequiredUserData'),
                ellapsedOtherUserDataInit: this._marks.getDuration('code/willInitOtherUserData', 'code/didInitOtherUserData'),
                ellapsedExtensions: this._marks.getDuration('code/willLoadExtensions', 'code/didLoadExtensions'),
                ellapsedEditorRestore: this._marks.getDuration('code/willRestoreEditors', 'code/didRestoreEditors'),
                ellapsedViewletRestore: this._marks.getDuration('code/willRestoreViewlet', 'code/didRestoreViewlet'),
                ellapsedPanelRestore: this._marks.getDuration('code/willRestorePanel', 'code/didRestorePanel'),
                ellapsedWorkbenchContributions: this._marks.getDuration('code/willCreateWorkbenchContributions/1', 'code/didCreateWorkbenchContributions/2'),
                ellapsedWorkbench: this._marks.getDuration('code/willStartWorkbench', 'code/didStartWorkbench'),
                ellapsedExtensionsReady: this._marks.getDuration(startMark, 'code/didLoadExtensions'),
                ellapsedRenderer: this._marks.getDuration('code/didStartRenderer', 'code/didStartWorkbench')
            },
            // system info
            platform: undefined,
            release: undefined,
            arch: undefined,
            totalmem: undefined,
            freemem: undefined,
            meminfo: undefined,
            cpus: undefined,
            loadavg: undefined,
            isVMLikelyhood: undefined,
            initialStartup,
            hasAccessibilitySupport: this._accessibilityService.isScreenReaderOptimized(),
            emptyWorkbench: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */
        };
        await this._extendStartupInfo(info);
        return info;
    }
};
AbstractTimerService = __decorate([
    __param(0, ILifecycleService),
    __param(1, IWorkspaceContextService),
    __param(2, IExtensionService),
    __param(3, IUpdateService),
    __param(4, IPaneCompositePartService),
    __param(5, IEditorService),
    __param(6, IAccessibilityService),
    __param(7, ITelemetryService),
    __param(8, IWorkbenchLayoutService)
], AbstractTimerService);
export { AbstractTimerService };
export class TimerService extends AbstractTimerService {
    _isInitialStartup() {
        return false;
    }
    _didUseCachedData() {
        return false;
    }
    async _getWindowCount() {
        return 1;
    }
    async _extendStartupInfo(info) {
        info.isVMLikelyhood = 0;
        info.isARM64Emulated = false;
        info.platform = navigator.userAgent;
        info.release = navigator.appVersion;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aW1lci9icm93c2VyL3RpbWVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQWtCLE1BQU0sb0RBQW9ELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7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
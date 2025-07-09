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
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ILifecycleService, StartupKindToString } from '../../../services/lifecycle/common/lifecycle.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import * as files from '../../files/common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { posix } from '../../../../base/common/path.js';
import { hash } from '../../../../base/common/hash.js';
let StartupTimings = class StartupTimings {
    constructor(_editorService, _paneCompositeService, _lifecycleService, _updateService, _workspaceTrustService) {
        this._editorService = _editorService;
        this._paneCompositeService = _paneCompositeService;
        this._lifecycleService = _lifecycleService;
        this._updateService = _updateService;
        this._workspaceTrustService = _workspaceTrustService;
    }
    async _isStandardStartup() {
        // check for standard startup:
        // * new window (no reload)
        // * workspace is trusted
        // * just one window
        // * explorer viewlet visible
        // * one text editor (not multiple, not webview, welcome etc...)
        // * cached data present (not rejected, not created)
        if (this._lifecycleService.startupKind !== 1 /* StartupKind.NewWindow */) {
            return StartupKindToString(this._lifecycleService.startupKind);
        }
        if (!this._workspaceTrustService.isWorkspaceTrusted()) {
            return 'Workspace not trusted';
        }
        const activeViewlet = this._paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (!activeViewlet || activeViewlet.getId() !== files.VIEWLET_ID) {
            return 'Explorer viewlet not visible';
        }
        const visibleEditorPanes = this._editorService.visibleEditorPanes;
        if (visibleEditorPanes.length !== 1) {
            return `Expected text editor count : 1, Actual : ${visibleEditorPanes.length}`;
        }
        if (!isCodeEditor(visibleEditorPanes[0].getControl())) {
            return 'Active editor is not a text editor';
        }
        const activePanel = this._paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if (activePanel) {
            return `Current active panel : ${this._paneCompositeService.getPaneComposite(activePanel.getId(), 1 /* ViewContainerLocation.Panel */)?.name}`;
        }
        const isLatestVersion = await this._updateService.isLatestVersion();
        if (isLatestVersion === false) {
            return 'Not on latest version, updates available';
        }
        return undefined;
    }
};
StartupTimings = __decorate([
    __param(0, IEditorService),
    __param(1, IPaneCompositePartService),
    __param(2, ILifecycleService),
    __param(3, IUpdateService),
    __param(4, IWorkspaceTrustManagementService)
], StartupTimings);
export { StartupTimings };
let BrowserStartupTimings = class BrowserStartupTimings extends StartupTimings {
    constructor(editorService, paneCompositeService, lifecycleService, updateService, workspaceTrustService, timerService, logService, environmentService, telemetryService, productService) {
        super(editorService, paneCompositeService, lifecycleService, updateService, workspaceTrustService);
        this.timerService = timerService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.logPerfMarks();
    }
    async logPerfMarks() {
        if (!this.environmentService.profDurationMarkers) {
            return;
        }
        await this.timerService.whenReady();
        const standardStartupError = await this._isStandardStartup();
        const perfBaseline = await this.timerService.perfBaseline;
        const [from, to] = this.environmentService.profDurationMarkers;
        const content = `${this.timerService.getDuration(from, to)}\t${this.productService.nameShort}\t${(this.productService.commit || '').slice(0, 10) || '0000000000'}\t${this.telemetryService.sessionId}\t${standardStartupError === undefined ? 'standard_start' : 'NO_standard_start : ' + standardStartupError}\t${String(perfBaseline).padStart(4, '0')}ms\n`;
        this.logService.info(`[prof-timers] ${content}`);
    }
};
BrowserStartupTimings = __decorate([
    __param(0, IEditorService),
    __param(1, IPaneCompositePartService),
    __param(2, ILifecycleService),
    __param(3, IUpdateService),
    __param(4, IWorkspaceTrustManagementService),
    __param(5, ITimerService),
    __param(6, ILogService),
    __param(7, IBrowserWorkbenchEnvironmentService),
    __param(8, ITelemetryService),
    __param(9, IProductService)
], BrowserStartupTimings);
export { BrowserStartupTimings };
let BrowserResourcePerformanceMarks = class BrowserResourcePerformanceMarks {
    constructor(telemetryService) {
        for (const item of performance.getEntriesByType('resource')) {
            try {
                const url = new URL(item.name);
                const name = posix.basename(url.pathname);
                telemetryService.publicLog2('startup.resource.perf', {
                    hosthash: `H${hash(url.host).toString(16)}`,
                    name,
                    duration: item.duration
                });
            }
            catch {
                // ignore
            }
        }
    }
};
BrowserResourcePerformanceMarks = __decorate([
    __param(0, ITelemetryService)
], BrowserResourcePerformanceMarks);
export { BrowserResourcePerformanceMarks };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFRpbWluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvYnJvd3Nlci9zdGFydHVwVGltaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFlLG1CQUFtQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sS0FBSyxLQUFLLE1BQU0sNkJBQTZCLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRXJHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFaEQsSUFBZSxjQUFjLEdBQTdCLE1BQWUsY0FBYztJQUVuQyxZQUNr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
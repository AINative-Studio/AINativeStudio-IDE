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
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { StartupTimings } from '../browser/startupTimings.js';
import { coalesce } from '../../../../base/common/arrays.js';
let NativeStartupTimings = class NativeStartupTimings extends StartupTimings {
    constructor(_fileService, _timerService, _nativeHostService, editorService, paneCompositeService, _telemetryService, lifecycleService, updateService, _environmentService, _productService, workspaceTrustService) {
        super(editorService, paneCompositeService, lifecycleService, updateService, workspaceTrustService);
        this._fileService = _fileService;
        this._timerService = _timerService;
        this._nativeHostService = _nativeHostService;
        this._telemetryService = _telemetryService;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._report().catch(onUnexpectedError);
    }
    async _report() {
        const standardStartupError = await this._isStandardStartup();
        this._appendStartupTimes(standardStartupError).catch(onUnexpectedError);
    }
    async _appendStartupTimes(standardStartupError) {
        const appendTo = this._environmentService.args['prof-append-timers'];
        const durationMarkers = this._environmentService.args['prof-duration-markers'];
        const durationMarkersFile = this._environmentService.args['prof-duration-markers-file'];
        if (!appendTo && !durationMarkers) {
            // nothing to do
            return;
        }
        try {
            await Promise.all([
                this._timerService.whenReady(),
                timeout(15000), // wait: cached data creation, telemetry sending
            ]);
            const perfBaseline = await this._timerService.perfBaseline;
            const heapStatistics = await this._resolveStartupHeapStatistics();
            if (heapStatistics) {
                this._telemetryLogHeapStatistics(heapStatistics);
            }
            if (appendTo) {
                const content = coalesce([
                    this._timerService.startupMetrics.ellapsed,
                    this._productService.nameShort,
                    (this._productService.commit || '').slice(0, 10) || '0000000000',
                    this._telemetryService.sessionId,
                    standardStartupError === undefined ? 'standard_start' : `NO_standard_start : ${standardStartupError}`,
                    `${String(perfBaseline).padStart(4, '0')}ms`,
                    heapStatistics ? this._printStartupHeapStatistics(heapStatistics) : undefined
                ]).join('\t') + '\n';
                await this._appendContent(URI.file(appendTo), content);
            }
            if (durationMarkers?.length) {
                const durations = [];
                for (const durationMarker of durationMarkers) {
                    let duration = 0;
                    if (durationMarker === 'ellapsed') {
                        duration = this._timerService.startupMetrics.ellapsed;
                    }
                    else if (durationMarker.indexOf('-') !== -1) {
                        const markers = durationMarker.split('-');
                        if (markers.length === 2) {
                            duration = this._timerService.getDuration(markers[0], markers[1]);
                        }
                    }
                    if (duration) {
                        durations.push(durationMarker);
                        durations.push(`${duration}`);
                    }
                }
                const durationsContent = `${durations.join('\t')}\n`;
                if (durationMarkersFile) {
                    await this._appendContent(URI.file(durationMarkersFile), durationsContent);
                }
                else {
                    console.log(durationsContent);
                }
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            this._nativeHostService.exit(0);
        }
    }
    async _isStandardStartup() {
        const windowCount = await this._nativeHostService.getWindowCount();
        if (windowCount !== 1) {
            return `Expected window count : 1, Actual : ${windowCount}`;
        }
        return super._isStandardStartup();
    }
    async _appendContent(file, content) {
        const chunks = [];
        if (await this._fileService.exists(file)) {
            chunks.push((await this._fileService.readFile(file)).value);
        }
        chunks.push(VSBuffer.fromString(content));
        await this._fileService.writeFile(file, VSBuffer.concat(chunks));
    }
    async _resolveStartupHeapStatistics() {
        if (!this._environmentService.args['enable-tracing'] ||
            !this._environmentService.args['trace-startup-file'] ||
            this._environmentService.args['trace-startup-format'] !== 'json' ||
            !this._environmentService.args['trace-startup-duration']) {
            return undefined; // unexpected arguments for startup heap statistics
        }
        const windowProcessId = await this._nativeHostService.getProcessId();
        const used = performance.memory?.usedJSHeapSize ?? 0; // https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
        let minorGCs = 0;
        let majorGCs = 0;
        let garbage = 0;
        let duration = 0;
        try {
            const traceContents = JSON.parse((await this._fileService.readFile(URI.file(this._environmentService.args['trace-startup-file']))).value.toString());
            for (const event of traceContents.traceEvents) {
                if (event.pid !== windowProcessId) {
                    continue;
                }
                switch (event.name) {
                    // Major/Minor GC Events
                    case 'MinorGC':
                        minorGCs++;
                        break;
                    case 'MajorGC':
                        majorGCs++;
                        break;
                    // GC Events that block the main thread
                    // Refs: https://v8.dev/blog/trash-talk
                    case 'V8.GCFinalizeMC':
                    case 'V8.GCScavenger':
                        duration += event.dur;
                        break;
                }
                if (event.name === 'MajorGC' || event.name === 'MinorGC') {
                    if (typeof event.args?.usedHeapSizeAfter === 'number' && typeof event.args.usedHeapSizeBefore === 'number') {
                        garbage += (event.args.usedHeapSizeBefore - event.args.usedHeapSizeAfter);
                    }
                }
            }
            return { minorGCs, majorGCs, used, garbage, duration: Math.round(duration / 1000) };
        }
        catch (error) {
            console.error(error);
        }
        return undefined;
    }
    _telemetryLogHeapStatistics({ used, garbage, majorGCs, minorGCs, duration }) {
        this._telemetryService.publicLog2('startupHeapStatistics', {
            heapUsed: used,
            heapGarbage: garbage,
            majorGCs,
            minorGCs,
            gcsDuration: duration
        });
    }
    _printStartupHeapStatistics({ used, garbage, majorGCs, minorGCs, duration }) {
        const MB = 1024 * 1024;
        return `Heap: ${Math.round(used / MB)}MB (used) ${Math.round(garbage / MB)}MB (garbage) ${majorGCs} (MajorGC) ${minorGCs} (MinorGC) ${duration}ms (GC duration)`;
    }
};
NativeStartupTimings = __decorate([
    __param(0, IFileService),
    __param(1, ITimerService),
    __param(2, INativeHostService),
    __param(3, IEditorService),
    __param(4, IPaneCompositePartService),
    __param(5, ITelemetryService),
    __param(6, ILifecycleService),
    __param(7, IUpdateService),
    __param(8, INativeWorkbenchEnvironmentService),
    __param(9, IProductService),
    __param(10, IWorkspaceTrustManagementService)
], NativeStartupTimings);
export { NativeStartupTimings };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFRpbWluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvZWxlY3Ryb24tc2FuZGJveC9zdGFydHVwVGltaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDMUgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEw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
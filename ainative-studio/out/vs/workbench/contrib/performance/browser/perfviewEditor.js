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
var PerfviewContrib_1, PerfviewInput_1;
import { localize } from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ILifecycleService, StartupKindToString } from '../../../services/lifecycle/common/lifecycle.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { writeTransientState } from '../../codeEditor/browser/toggleWordWrap.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, getWorkbenchContribution } from '../../../common/contributions.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
let PerfviewContrib = class PerfviewContrib {
    static { PerfviewContrib_1 = this; }
    static get() {
        return getWorkbenchContribution(PerfviewContrib_1.ID);
    }
    static { this.ID = 'workbench.contrib.perfview'; }
    constructor(_instaService, textModelResolverService) {
        this._instaService = _instaService;
        this._inputUri = URI.from({ scheme: 'perf', path: 'Startup Performance' });
        this._registration = textModelResolverService.registerTextModelContentProvider('perf', _instaService.createInstance(PerfModelContentProvider));
    }
    dispose() {
        this._registration.dispose();
    }
    getInputUri() {
        return this._inputUri;
    }
    getEditorInput() {
        return this._instaService.createInstance(PerfviewInput);
    }
};
PerfviewContrib = PerfviewContrib_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextModelService)
], PerfviewContrib);
export { PerfviewContrib };
let PerfviewInput = class PerfviewInput extends TextResourceEditorInput {
    static { PerfviewInput_1 = this; }
    static { this.Id = 'PerfviewInput'; }
    get typeId() {
        return PerfviewInput_1.Id;
    }
    constructor(textModelResolverService, textFileService, editorService, fileService, labelService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(PerfviewContrib.get().getInputUri(), localize('name', "Startup Performance"), undefined, undefined, undefined, textModelResolverService, textFileService, editorService, fileService, labelService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
    }
};
PerfviewInput = PerfviewInput_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, ITextFileService),
    __param(2, IEditorService),
    __param(3, IFileService),
    __param(4, ILabelService),
    __param(5, IFilesConfigurationService),
    __param(6, ITextResourceConfigurationService),
    __param(7, ICustomEditorLabelService)
], PerfviewInput);
export { PerfviewInput };
let PerfModelContentProvider = class PerfModelContentProvider {
    constructor(_modelService, _languageService, _editorService, _lifecycleService, _timerService, _extensionService, _productService, _remoteAgentService, _terminalService) {
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._editorService = _editorService;
        this._lifecycleService = _lifecycleService;
        this._timerService = _timerService;
        this._extensionService = _extensionService;
        this._productService = _productService;
        this._remoteAgentService = _remoteAgentService;
        this._terminalService = _terminalService;
        this._modelDisposables = [];
    }
    provideTextContent(resource) {
        if (!this._model || this._model.isDisposed()) {
            dispose(this._modelDisposables);
            const langId = this._languageService.createById('markdown');
            this._model = this._modelService.getModel(resource) || this._modelService.createModel('Loading...', langId, resource);
            this._modelDisposables.push(langId.onDidChange(e => {
                this._model?.setLanguage(e);
            }));
            this._modelDisposables.push(this._extensionService.onDidChangeExtensionsStatus(this._updateModel, this));
            writeTransientState(this._model, { wordWrapOverride: 'off' }, this._editorService);
        }
        this._updateModel();
        return Promise.resolve(this._model);
    }
    _updateModel() {
        Promise.all([
            this._timerService.whenReady(),
            this._lifecycleService.when(4 /* LifecyclePhase.Eventually */),
            this._extensionService.whenInstalledExtensionsRegistered(),
            // The terminal service never connects to the pty host on the web
            isWeb && !this._remoteAgentService.getConnection()?.remoteAuthority ? Promise.resolve() : this._terminalService.whenConnected
        ]).then(() => {
            if (this._model && !this._model.isDisposed()) {
                const md = new MarkdownBuilder();
                this._addSummary(md);
                md.blank();
                this._addSummaryTable(md);
                md.blank();
                this._addExtensionsTable(md);
                md.blank();
                this._addPerfMarksTable('Terminal Stats', md, this._timerService.getPerformanceMarks().find(e => e[0] === 'renderer')?.[1].filter(e => e.name.startsWith('code/terminal/')));
                md.blank();
                this._addWorkbenchContributionsPerfMarksTable(md);
                md.blank();
                this._addRawPerfMarks(md);
                md.blank();
                this._addResourceTimingStats(md);
                this._model.setValue(md.value);
            }
        });
    }
    _addSummary(md) {
        const metrics = this._timerService.startupMetrics;
        md.heading(2, 'System Info');
        md.li(`${this._productService.nameShort}: ${this._productService.version} (${this._productService.commit || '0000000'})`);
        md.li(`OS: ${metrics.platform}(${metrics.release})`);
        if (metrics.cpus) {
            md.li(`CPUs: ${metrics.cpus.model}(${metrics.cpus.count} x ${metrics.cpus.speed})`);
        }
        if (typeof metrics.totalmem === 'number' && typeof metrics.freemem === 'number') {
            md.li(`Memory(System): ${(metrics.totalmem / (ByteSize.GB)).toFixed(2)} GB(${(metrics.freemem / (ByteSize.GB)).toFixed(2)}GB free)`);
        }
        if (metrics.meminfo) {
            md.li(`Memory(Process): ${(metrics.meminfo.workingSetSize / ByteSize.KB).toFixed(2)} MB working set(${(metrics.meminfo.privateBytes / ByteSize.KB).toFixed(2)}MB private, ${(metrics.meminfo.sharedBytes / ByteSize.KB).toFixed(2)}MB shared)`);
        }
        md.li(`VM(likelihood): ${metrics.isVMLikelyhood}%`);
        md.li(`Initial Startup: ${metrics.initialStartup}`);
        md.li(`Has ${metrics.windowCount - 1} other windows`);
        md.li(`Screen Reader Active: ${metrics.hasAccessibilitySupport}`);
        md.li(`Empty Workspace: ${metrics.emptyWorkbench}`);
    }
    _addSummaryTable(md) {
        const metrics = this._timerService.startupMetrics;
        const contribTimings = Registry.as(WorkbenchExtensions.Workbench).timings;
        const table = [];
        table.push(['start => app.isReady', metrics.timers.ellapsedAppReady, '[main]', `initial startup: ${metrics.initialStartup}`]);
        table.push(['nls:start => nls:end', metrics.timers.ellapsedNlsGeneration, '[main]', `initial startup: ${metrics.initialStartup}`]);
        table.push(['import(main.js)', metrics.timers.ellapsedLoadMainBundle, '[main]', `initial startup: ${metrics.initialStartup}`]);
        table.push(['run main.js', metrics.timers.ellapsedRunMainBundle, '[main]', `initial startup: ${metrics.initialStartup}`]);
        table.push(['start crash reporter', metrics.timers.ellapsedCrashReporter, '[main]', `initial startup: ${metrics.initialStartup}`]);
        table.push(['serve main IPC handle', metrics.timers.ellapsedMainServer, '[main]', `initial startup: ${metrics.initialStartup}`]);
        table.push(['create window', metrics.timers.ellapsedWindowCreate, '[main]', `initial startup: ${metrics.initialStartup}, ${metrics.initialStartup ? `state: ${metrics.timers.ellapsedWindowRestoreState}ms, widget: ${metrics.timers.ellapsedBrowserWindowCreate}ms, show: ${metrics.timers.ellapsedWindowMaximize}ms` : ''}`]);
        table.push(['app.isReady => window.loadUrl()', metrics.timers.ellapsedWindowLoad, '[main]', `initial startup: ${metrics.initialStartup}`]);
        table.push(['window.loadUrl() => begin to import(workbench.desktop.main.js)', metrics.timers.ellapsedWindowLoadToRequire, '[main->renderer]', StartupKindToString(metrics.windowKind)]);
        table.push(['import(workbench.desktop.main.js)', metrics.timers.ellapsedRequire, '[renderer]', `cached data: ${(metrics.didUseCachedData ? 'YES' : 'NO')}`]);
        table.push(['wait for window config', metrics.timers.ellapsedWaitForWindowConfig, '[renderer]', undefined]);
        table.push(['init storage (global & workspace)', metrics.timers.ellapsedStorageInit, '[renderer]', undefined]);
        table.push(['init workspace service', metrics.timers.ellapsedWorkspaceServiceInit, '[renderer]', undefined]);
        if (isWeb) {
            table.push(['init settings and global state from settings sync service', metrics.timers.ellapsedRequiredUserDataInit, '[renderer]', undefined]);
            table.push(['init keybindings, snippets & extensions from settings sync service', metrics.timers.ellapsedOtherUserDataInit, '[renderer]', undefined]);
        }
        table.push(['register extensions & spawn extension host', metrics.timers.ellapsedExtensions, '[renderer]', undefined]);
        table.push(['restore viewlet', metrics.timers.ellapsedViewletRestore, '[renderer]', metrics.viewletId]);
        table.push(['restore panel', metrics.timers.ellapsedPanelRestore, '[renderer]', metrics.panelId]);
        table.push(['restore & resolve visible editors', metrics.timers.ellapsedEditorRestore, '[renderer]', `${metrics.editorIds.length}: ${metrics.editorIds.join(', ')}`]);
        table.push(['create workbench contributions', metrics.timers.ellapsedWorkbenchContributions, '[renderer]', `${(contribTimings.get(1 /* LifecyclePhase.Starting */)?.length ?? 0) + (contribTimings.get(1 /* LifecyclePhase.Starting */)?.length ?? 0)} blocking startup`]);
        table.push(['overall workbench load', metrics.timers.ellapsedWorkbench, '[renderer]', undefined]);
        table.push(['workbench ready', metrics.ellapsed, '[main->renderer]', undefined]);
        table.push(['renderer ready', metrics.timers.ellapsedRenderer, '[renderer]', undefined]);
        table.push(['shared process connection ready', metrics.timers.ellapsedSharedProcesConnected, '[renderer->sharedprocess]', undefined]);
        table.push(['extensions registered', metrics.timers.ellapsedExtensionsReady, '[renderer]', undefined]);
        md.heading(2, 'Performance Marks');
        md.table(['What', 'Duration', 'Process', 'Info'], table);
    }
    _addExtensionsTable(md) {
        const eager = [];
        const normal = [];
        const extensionsStatus = this._extensionService.getExtensionsStatus();
        for (const id in extensionsStatus) {
            const { activationTimes: times } = extensionsStatus[id];
            if (!times) {
                continue;
            }
            if (times.activationReason.startup) {
                eager.push([id, times.activationReason.startup, times.codeLoadingTime, times.activateCallTime, times.activateResolvedTime, times.activationReason.activationEvent, times.activationReason.extensionId.value]);
            }
            else {
                normal.push([id, times.activationReason.startup, times.codeLoadingTime, times.activateCallTime, times.activateResolvedTime, times.activationReason.activationEvent, times.activationReason.extensionId.value]);
            }
        }
        const table = eager.concat(normal);
        if (table.length > 0) {
            md.heading(2, 'Extension Activation Stats');
            md.table(['Extension', 'Eager', 'Load Code', 'Call Activate', 'Finish Activate', 'Event', 'By'], table);
        }
    }
    _addPerfMarksTable(name, md, marks) {
        if (!marks) {
            return;
        }
        const table = [];
        let lastStartTime = -1;
        let total = 0;
        for (const { name, startTime } of marks) {
            const delta = lastStartTime !== -1 ? startTime - lastStartTime : 0;
            total += delta;
            table.push([name, Math.round(startTime), Math.round(delta), Math.round(total)]);
            lastStartTime = startTime;
        }
        if (name) {
            md.heading(2, name);
        }
        md.table(['Name', 'Timestamp', 'Delta', 'Total'], table);
    }
    _addWorkbenchContributionsPerfMarksTable(md) {
        md.heading(2, 'Workbench Contributions Blocking Restore');
        const timings = Registry.as(WorkbenchExtensions.Workbench).timings;
        md.li(`Total (LifecyclePhase.Starting): ${timings.get(1 /* LifecyclePhase.Starting */)?.length} (${timings.get(1 /* LifecyclePhase.Starting */)?.reduce((p, c) => p + c[1], 0)}ms)`);
        md.li(`Total (LifecyclePhase.Ready): ${timings.get(2 /* LifecyclePhase.Ready */)?.length} (${timings.get(2 /* LifecyclePhase.Ready */)?.reduce((p, c) => p + c[1], 0)}ms)`);
        md.blank();
        const marks = this._timerService.getPerformanceMarks().find(e => e[0] === 'renderer')?.[1].filter(e => e.name.startsWith('code/willCreateWorkbenchContribution/1') ||
            e.name.startsWith('code/didCreateWorkbenchContribution/1') ||
            e.name.startsWith('code/willCreateWorkbenchContribution/2') ||
            e.name.startsWith('code/didCreateWorkbenchContribution/2'));
        this._addPerfMarksTable(undefined, md, marks);
    }
    _addRawPerfMarks(md) {
        for (const [source, marks] of this._timerService.getPerformanceMarks()) {
            md.heading(2, `Raw Perf Marks: ${source}`);
            md.value += '```\n';
            md.value += `Name\tTimestamp\tDelta\tTotal\n`;
            let lastStartTime = -1;
            let total = 0;
            for (const { name, startTime } of marks) {
                const delta = lastStartTime !== -1 ? startTime - lastStartTime : 0;
                total += delta;
                md.value += `${name}\t${startTime}\t${delta}\t${total}\n`;
                lastStartTime = startTime;
            }
            md.value += '```\n';
        }
    }
    _addResourceTimingStats(md) {
        const stats = performance.getEntriesByType('resource').map(entry => {
            return [entry.name, entry.duration];
        });
        if (!stats.length) {
            return;
        }
        md.heading(2, 'Resource Timing Stats');
        md.table(['Name', 'Duration'], stats);
    }
};
PerfModelContentProvider = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService),
    __param(2, ICodeEditorService),
    __param(3, ILifecycleService),
    __param(4, ITimerService),
    __param(5, IExtensionService),
    __param(6, IProductService),
    __param(7, IRemoteAgentService),
    __param(8, ITerminalService)
], PerfModelContentProvider);
class MarkdownBuilder {
    constructor() {
        this.value = '';
    }
    heading(level, value) {
        this.value += `${'#'.repeat(level)} ${value}\n\n`;
        return this;
    }
    blank() {
        this.value += '\n';
        return this;
    }
    li(value) {
        this.value += `* ${value}\n`;
        return this;
    }
    table(header, rows) {
        this.value += this.toMarkdownTable(header, rows);
    }
    toMarkdownTable(header, rows) {
        let result = '';
        const lengths = [];
        header.forEach((cell, ci) => {
            lengths[ci] = cell.length;
        });
        rows.forEach(row => {
            row.forEach((cell, ci) => {
                if (typeof cell === 'undefined') {
                    cell = row[ci] = '-';
                }
                const len = cell.toString().length;
                lengths[ci] = Math.max(len, lengths[ci]);
            });
        });
        // header
        header.forEach((cell, ci) => { result += `| ${cell + ' '.repeat(lengths[ci] - cell.toString().length)} `; });
        result += '|\n';
        header.forEach((_cell, ci) => { result += `| ${'-'.repeat(lengths[ci])} `; });
        result += '|\n';
        // cells
        rows.forEach(row => {
            row.forEach((cell, ci) => {
                if (typeof cell !== 'undefined') {
                    result += `| ${cell + ' '.repeat(lengths[ci] - cell.toString().length)} `;
                }
            });
            result += '|\n';
        });
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZnZpZXdFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvYnJvd3Nlci9wZXJmdmlld0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQTZCLE1BQU0sdURBQXVELENBQUM7QUFFckgsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3pILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUs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
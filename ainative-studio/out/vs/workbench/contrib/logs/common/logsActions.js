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
import * as nls from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { ILoggerService, LogLevel, LogLevelToLocalizedString, isLogLevel } from '../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { dirname, basename, isEqual } from '../../../../base/common/resources.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IOutputService, isMultiSourceOutputChannelDescriptor, isSingleSourceOutputChannelDescriptor } from '../../../services/output/common/output.js';
import { IDefaultLogLevelsService } from './defaultLogLevels.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
let SetLogLevelAction = class SetLogLevelAction extends Action {
    static { this.ID = 'workbench.action.setLogLevel'; }
    static { this.TITLE = nls.localize2('setLogLevel', "Set Log Level..."); }
    constructor(id, label, quickInputService, loggerService, outputService, defaultLogLevelsService) {
        super(id, label);
        this.quickInputService = quickInputService;
        this.loggerService = loggerService;
        this.outputService = outputService;
        this.defaultLogLevelsService = defaultLogLevelsService;
    }
    async run() {
        const logLevelOrChannel = await this.selectLogLevelOrChannel();
        if (logLevelOrChannel !== null) {
            if (isLogLevel(logLevelOrChannel)) {
                this.loggerService.setLogLevel(logLevelOrChannel);
            }
            else {
                await this.setLogLevelForChannel(logLevelOrChannel);
            }
        }
    }
    async selectLogLevelOrChannel() {
        const defaultLogLevels = await this.defaultLogLevelsService.getDefaultLogLevels();
        const extensionLogs = [], logs = [];
        const logLevel = this.loggerService.getLogLevel();
        for (const channel of this.outputService.getChannelDescriptors()) {
            if (!this.outputService.canSetLogLevel(channel)) {
                continue;
            }
            const sources = isSingleSourceOutputChannelDescriptor(channel) ? [channel.source] : isMultiSourceOutputChannelDescriptor(channel) ? channel.source : [];
            if (!sources.length) {
                continue;
            }
            const channelLogLevel = sources.reduce((prev, curr) => Math.min(prev, this.loggerService.getLogLevel(curr.resource) ?? logLevel), logLevel);
            const item = {
                id: channel.id,
                label: channel.label,
                description: channelLogLevel !== logLevel ? this.getLabel(channelLogLevel) : undefined,
                channel
            };
            if (channel.extensionId) {
                extensionLogs.push(item);
            }
            else {
                logs.push(item);
            }
        }
        const entries = [];
        entries.push({ type: 'separator', label: nls.localize('all', "All") });
        entries.push(...this.getLogLevelEntries(defaultLogLevels.default, this.loggerService.getLogLevel(), true));
        if (extensionLogs.length) {
            entries.push({ type: 'separator', label: nls.localize('extensionLogs', "Extension Logs") });
            entries.push(...extensionLogs.sort((a, b) => a.label.localeCompare(b.label)));
        }
        entries.push({ type: 'separator', label: nls.localize('loggers', "Logs") });
        entries.push(...logs.sort((a, b) => a.label.localeCompare(b.label)));
        return new Promise((resolve, reject) => {
            const disposables = new DisposableStore();
            const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
            quickPick.placeholder = nls.localize('selectlog', "Set Log Level");
            quickPick.items = entries;
            let selectedItem;
            disposables.add(quickPick.onDidTriggerItemButton(e => {
                quickPick.hide();
                this.defaultLogLevelsService.setDefaultLogLevel(e.item.level);
            }));
            disposables.add(quickPick.onDidAccept(e => {
                selectedItem = quickPick.selectedItems[0];
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                const result = selectedItem ? selectedItem.level ?? selectedItem : null;
                disposables.dispose();
                resolve(result);
            }));
            quickPick.show();
        });
    }
    async setLogLevelForChannel(logChannel) {
        const defaultLogLevels = await this.defaultLogLevelsService.getDefaultLogLevels();
        const defaultLogLevel = defaultLogLevels.extensions.find(e => e[0] === logChannel.channel.extensionId?.toLowerCase())?.[1] ?? defaultLogLevels.default;
        const entries = this.getLogLevelEntries(defaultLogLevel, this.outputService.getLogLevel(logChannel.channel) ?? defaultLogLevel, !!logChannel.channel.extensionId);
        return new Promise((resolve, reject) => {
            const disposables = new DisposableStore();
            const quickPick = disposables.add(this.quickInputService.createQuickPick());
            quickPick.placeholder = logChannel ? nls.localize('selectLogLevelFor', " {0}: Select log level", logChannel?.label) : nls.localize('selectLogLevel', "Select log level");
            quickPick.items = entries;
            quickPick.activeItems = entries.filter((entry) => entry.level === this.loggerService.getLogLevel());
            let selectedItem;
            disposables.add(quickPick.onDidTriggerItemButton(e => {
                quickPick.hide();
                this.defaultLogLevelsService.setDefaultLogLevel(e.item.level, logChannel.channel.extensionId);
            }));
            disposables.add(quickPick.onDidAccept(e => {
                selectedItem = quickPick.selectedItems[0];
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                if (selectedItem) {
                    this.outputService.setLogLevel(logChannel.channel, selectedItem.level);
                }
                disposables.dispose();
                resolve();
            }));
            quickPick.show();
        });
    }
    getLogLevelEntries(defaultLogLevel, currentLogLevel, canSetDefaultLogLevel) {
        const button = canSetDefaultLogLevel ? { iconClass: ThemeIcon.asClassName(Codicon.checkAll), tooltip: nls.localize('resetLogLevel', "Set as Default Log Level") } : undefined;
        return [
            { label: this.getLabel(LogLevel.Trace, currentLogLevel), level: LogLevel.Trace, description: this.getDescription(LogLevel.Trace, defaultLogLevel), buttons: button && defaultLogLevel !== LogLevel.Trace ? [button] : undefined },
            { label: this.getLabel(LogLevel.Debug, currentLogLevel), level: LogLevel.Debug, description: this.getDescription(LogLevel.Debug, defaultLogLevel), buttons: button && defaultLogLevel !== LogLevel.Debug ? [button] : undefined },
            { label: this.getLabel(LogLevel.Info, currentLogLevel), level: LogLevel.Info, description: this.getDescription(LogLevel.Info, defaultLogLevel), buttons: button && defaultLogLevel !== LogLevel.Info ? [button] : undefined },
            { label: this.getLabel(LogLevel.Warning, currentLogLevel), level: LogLevel.Warning, description: this.getDescription(LogLevel.Warning, defaultLogLevel), buttons: button && defaultLogLevel !== LogLevel.Warning ? [button] : undefined },
            { label: this.getLabel(LogLevel.Error, currentLogLevel), level: LogLevel.Error, description: this.getDescription(LogLevel.Error, defaultLogLevel), buttons: button && defaultLogLevel !== LogLevel.Error ? [button] : undefined },
            { label: this.getLabel(LogLevel.Off, currentLogLevel), level: LogLevel.Off, description: this.getDescription(LogLevel.Off, defaultLogLevel), buttons: button && defaultLogLevel !== LogLevel.Off ? [button] : undefined },
        ];
    }
    getLabel(level, current) {
        const label = LogLevelToLocalizedString(level).value;
        return level === current ? `$(check) ${label}` : label;
    }
    getDescription(level, defaultLogLevel) {
        return defaultLogLevel === level ? nls.localize('default', "Default") : undefined;
    }
};
SetLogLevelAction = __decorate([
    __param(2, IQuickInputService),
    __param(3, ILoggerService),
    __param(4, IOutputService),
    __param(5, IDefaultLogLevelsService)
], SetLogLevelAction);
export { SetLogLevelAction };
let OpenWindowSessionLogFileAction = class OpenWindowSessionLogFileAction extends Action {
    static { this.ID = 'workbench.action.openSessionLogFile'; }
    static { this.TITLE = nls.localize2('openSessionLogFile', "Open Window Log File (Session)..."); }
    constructor(id, label, environmentService, fileService, quickInputService, editorService) {
        super(id, label);
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.quickInputService = quickInputService;
        this.editorService = editorService;
    }
    async run() {
        const sessionResult = await this.quickInputService.pick(this.getSessions().then(sessions => sessions.map((s, index) => ({
            id: s.toString(),
            label: basename(s),
            description: index === 0 ? nls.localize('current', "Current") : undefined
        }))), {
            canPickMany: false,
            placeHolder: nls.localize('sessions placeholder', "Select Session")
        });
        if (sessionResult) {
            const logFileResult = await this.quickInputService.pick(this.getLogFiles(URI.parse(sessionResult.id)).then(logFiles => logFiles.map((s) => ({
                id: s.toString(),
                label: basename(s)
            }))), {
                canPickMany: false,
                placeHolder: nls.localize('log placeholder', "Select Log file")
            });
            if (logFileResult) {
                return this.editorService.openEditor({ resource: URI.parse(logFileResult.id), options: { pinned: true } }).then(() => undefined);
            }
        }
    }
    async getSessions() {
        const logsPath = this.environmentService.logsHome.with({ scheme: this.environmentService.logFile.scheme });
        const result = [logsPath];
        const stat = await this.fileService.resolve(dirname(logsPath));
        if (stat.children) {
            result.push(...stat.children
                .filter(stat => !isEqual(stat.resource, logsPath) && stat.isDirectory && /^\d{8}T\d{6}$/.test(stat.name))
                .sort()
                .reverse()
                .map(d => d.resource));
        }
        return result;
    }
    async getLogFiles(session) {
        const stat = await this.fileService.resolve(session);
        if (stat.children) {
            return stat.children.filter(stat => !stat.isDirectory).map(stat => stat.resource);
        }
        return [];
    }
};
OpenWindowSessionLogFileAction = __decorate([
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IFileService),
    __param(4, IQuickInputService),
    __param(5, IEditorService)
], OpenWindowSessionLogFileAction);
export { OpenWindowSessionLogFileAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9ncy9jb21tb24vbG9nc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUseUJBQXlCLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekgsT0FBTyxFQUFxQixrQkFBa0IsRUFBdUMsTUFBTSxzREFBc0QsQ0FBQztBQUNsSixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQTRCLGNBQWMsRUFBRSxvQ0FBb0MsRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xMLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFz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
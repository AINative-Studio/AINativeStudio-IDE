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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2dzL2NvbW1vbi9sb2dzQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSx5QkFBeUIsRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6SCxPQUFPLEVBQXFCLGtCQUFrQixFQUF1QyxNQUFNLHNEQUFzRCxDQUFDO0FBQ2xKLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBNEIsY0FBYyxFQUFFLG9DQUFvQyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEwsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXND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
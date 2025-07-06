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
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuId, registerAction2, Action2, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { OutputService } from './outputServices.js';
import { OUTPUT_MODE_ID, OUTPUT_MIME, OUTPUT_VIEW_ID, IOutputService, CONTEXT_IN_OUTPUT, LOG_MODE_ID, LOG_MIME, CONTEXT_OUTPUT_SCROLL_LOCK, ACTIVE_OUTPUT_CHANNEL_CONTEXT, CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE, Extensions, CONTEXT_ACTIVE_OUTPUT_LEVEL, CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT, SHOW_INFO_FILTER_CONTEXT, SHOW_TRACE_FILTER_CONTEXT, SHOW_DEBUG_FILTER_CONTEXT, SHOW_ERROR_FILTER_CONTEXT, SHOW_WARNING_FILTER_CONTEXT, OUTPUT_FILTER_FOCUS_CONTEXT, CONTEXT_ACTIVE_LOG_FILE_OUTPUT, isSingleSourceOutputChannelDescriptor } from '../../../services/output/common/output.js';
import { OutputViewPane } from './outputView.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Extensions as ViewContainerExtensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { AUX_WINDOW_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Disposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ILoggerService, LogLevel, LogLevelToLocalizedString, LogLevelToString } from '../../../../platform/log/common/log.js';
import { IDefaultLogLevelsService } from '../../logs/common/defaultLogLevels.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { IsWindowsContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { basename } from '../../../../base/common/resources.js';
const IMPORTED_LOG_ID_PREFIX = 'importedLog.';
// Register Service
registerSingleton(IOutputService, OutputService, 1 /* InstantiationType.Delayed */);
// Register Output Mode
ModesRegistry.registerLanguage({
    id: OUTPUT_MODE_ID,
    extensions: [],
    mimetypes: [OUTPUT_MIME]
});
// Register Log Output Mode
ModesRegistry.registerLanguage({
    id: LOG_MODE_ID,
    extensions: [],
    mimetypes: [LOG_MIME]
});
// register output container
const outputViewIcon = registerIcon('output-view-icon', Codicon.output, nls.localize('outputViewIcon', 'View icon of the output view.'));
const VIEW_CONTAINER = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: OUTPUT_VIEW_ID,
    title: nls.localize2('output', "Output"),
    icon: outputViewIcon,
    order: 1,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [OUTPUT_VIEW_ID, { mergeViewWithContainerWhenSingleView: true }]),
    storageId: OUTPUT_VIEW_ID,
    hideIfEmpty: true,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
Registry.as(ViewContainerExtensions.ViewsRegistry).registerViews([{
        id: OUTPUT_VIEW_ID,
        name: nls.localize2('output', "Output"),
        containerIcon: outputViewIcon,
        canMoveView: true,
        canToggleVisibility: true,
        ctorDescriptor: new SyncDescriptor(OutputViewPane),
        openCommandActionDescriptor: {
            id: 'workbench.action.output.toggleOutput',
            mnemonicTitle: nls.localize({ key: 'miToggleOutput', comment: ['&& denotes a mnemonic'] }, "&&Output"),
            keybindings: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 51 /* KeyCode.KeyU */,
                linux: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 38 /* KeyCode.KeyH */) // On Ubuntu Ctrl+Shift+U is taken by some global OS command
                }
            },
            order: 1,
        }
    }], VIEW_CONTAINER);
let OutputContribution = class OutputContribution extends Disposable {
    constructor(outputService, editorService) {
        super();
        this.outputService = outputService;
        this.editorService = editorService;
        this.registerActions();
    }
    registerActions() {
        this.registerSwitchOutputAction();
        this.registerAddCompoundLogAction();
        this.registerRemoveLogAction();
        this.registerShowOutputChannelsAction();
        this.registerClearOutputAction();
        this.registerToggleAutoScrollAction();
        this.registerOpenActiveOutputFileAction();
        this.registerOpenActiveOutputFileInAuxWindowAction();
        this.registerSaveActiveOutputAsAction();
        this.registerShowLogsAction();
        this.registerOpenLogFileAction();
        this.registerConfigureActiveOutputLogLevelAction();
        this.registerLogLevelFilterActions();
        this.registerClearFilterActions();
        this.registerExportLogsAction();
        this.registerImportLogAction();
    }
    registerSwitchOutputAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.output.action.switchBetweenOutputs`,
                    title: nls.localize('switchBetweenOutputs.label', "Switch Output"),
                });
            }
            async run(accessor, channelId) {
                if (channelId) {
                    accessor.get(IOutputService).showChannel(channelId, true);
                }
            }
        }));
        const switchOutputMenu = new MenuId('workbench.output.menu.switchOutput');
        this._register(MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
            submenu: switchOutputMenu,
            title: nls.localize('switchToOutput.label', "Switch Output"),
            group: 'navigation',
            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
            order: 1,
            isSelection: true
        }));
        const registeredChannels = new Map();
        this._register(toDisposable(() => dispose(registeredChannels.values())));
        const registerOutputChannels = (channels) => {
            for (const channel of channels) {
                const title = channel.label;
                const group = channel.user ? '2_user_outputchannels' : channel.extensionId ? '0_ext_outputchannels' : '1_core_outputchannels';
                registeredChannels.set(channel.id, registerAction2(class extends Action2 {
                    constructor() {
                        super({
                            id: `workbench.action.output.show.${channel.id}`,
                            title,
                            toggled: ACTIVE_OUTPUT_CHANNEL_CONTEXT.isEqualTo(channel.id),
                            menu: {
                                id: switchOutputMenu,
                                group,
                            }
                        });
                    }
                    async run(accessor) {
                        return accessor.get(IOutputService).showChannel(channel.id, true);
                    }
                }));
            }
        };
        registerOutputChannels(this.outputService.getChannelDescriptors());
        const outputChannelRegistry = Registry.as(Extensions.OutputChannels);
        this._register(outputChannelRegistry.onDidRegisterChannel(e => {
            const channel = this.outputService.getChannelDescriptor(e);
            if (channel) {
                registerOutputChannels([channel]);
            }
        }));
        this._register(outputChannelRegistry.onDidRemoveChannel(e => {
            registeredChannels.get(e.id)?.dispose();
            registeredChannels.delete(e.id);
        }));
    }
    registerAddCompoundLogAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.output.addCompoundLog',
                    title: nls.localize2('addCompoundLog', "Add Compound Log..."),
                    category: nls.localize2('output', "Output"),
                    f1: true,
                    menu: [{
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '2_add',
                        }],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionLogs = [], logs = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.log && !channel.user) {
                        if (channel.extensionId) {
                            extensionLogs.push(channel);
                        }
                        else {
                            logs.push(channel);
                        }
                    }
                }
                const entries = [];
                for (const log of logs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                if (extensionLogs.length && logs.length) {
                    entries.push({ type: 'separator', label: nls.localize('extensionLogs', "Extension Logs") });
                }
                for (const log of extensionLogs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                const result = await quickInputService.pick(entries, { placeHolder: nls.localize('selectlog', "Select Log"), canPickMany: true });
                if (result?.length) {
                    outputService.showChannel(outputService.registerCompoundLogChannel(result));
                }
            }
        }));
    }
    registerRemoveLogAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.output.remove',
                    title: nls.localize2('removeLog', "Remove Output..."),
                    category: nls.localize2('output', "Output"),
                    f1: true
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const notificationService = accessor.get(INotificationService);
                const entries = outputService.getChannelDescriptors().filter(channel => channel.user);
                if (entries.length === 0) {
                    notificationService.info(nls.localize('nocustumoutput', "No custom outputs to remove."));
                    return;
                }
                const result = await quickInputService.pick(entries, { placeHolder: nls.localize('selectlog', "Select Log"), canPickMany: true });
                if (!result?.length) {
                    return;
                }
                const outputChannelRegistry = Registry.as(Extensions.OutputChannels);
                for (const channel of result) {
                    outputChannelRegistry.removeChannel(channel.id);
                }
            }
        }));
    }
    registerShowOutputChannelsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.showOutputChannels',
                    title: nls.localize2('showOutputChannels', "Show Output Channels..."),
                    category: nls.localize2('output', "Output"),
                    f1: true
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionChannels = [], coreChannels = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.extensionId) {
                        extensionChannels.push(channel);
                    }
                    else {
                        coreChannels.push(channel);
                    }
                }
                const entries = [];
                for (const { id, label } of extensionChannels) {
                    entries.push({ id, label });
                }
                if (extensionChannels.length && coreChannels.length) {
                    entries.push({ type: 'separator' });
                }
                for (const { id, label } of coreChannels) {
                    entries.push({ id, label });
                }
                const entry = await quickInputService.pick(entries, { placeHolder: nls.localize('selectOutput', "Select Output Channel") });
                if (entry) {
                    return outputService.showChannel(entry.id);
                }
            }
        }));
    }
    registerClearOutputAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.output.action.clearOutput`,
                    title: nls.localize2('clearOutput.label', "Clear Output"),
                    category: Categories.View,
                    menu: [{
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: 'navigation',
                            order: 2
                        }, {
                            id: MenuId.CommandPalette
                        }, {
                            id: MenuId.EditorContext,
                            when: CONTEXT_IN_OUTPUT
                        }],
                    icon: Codicon.clearAll
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
                const activeChannel = outputService.getActiveChannel();
                if (activeChannel) {
                    activeChannel.clear();
                    accessibilitySignalService.playSignal(AccessibilitySignal.clear);
                }
            }
        }));
    }
    registerToggleAutoScrollAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.output.action.toggleAutoScroll`,
                    title: nls.localize2('toggleAutoScroll', "Toggle Auto Scrolling"),
                    tooltip: nls.localize('outputScrollOff', "Turn Auto Scrolling Off"),
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID)),
                        group: 'navigation',
                        order: 3,
                    },
                    icon: Codicon.lock,
                    toggled: {
                        condition: CONTEXT_OUTPUT_SCROLL_LOCK,
                        icon: Codicon.unlock,
                        tooltip: nls.localize('outputScrollOn', "Turn Auto Scrolling On")
                    }
                });
            }
            async run(accessor) {
                const outputView = accessor.get(IViewsService).getActiveViewWithId(OUTPUT_VIEW_ID);
                outputView.scrollLock = !outputView.scrollLock;
            }
        }));
    }
    registerOpenActiveOutputFileAction() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.openActiveLogOutputFile`,
                    title: nls.localize2('openActiveOutputFile', "Open Output in Editor"),
                    menu: [{
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: 'navigation',
                            order: 4,
                            isHiddenByDefault: true
                        }],
                    icon: Codicon.goToFile,
                });
            }
            async run() {
                that.openActiveOutput();
            }
        }));
    }
    registerOpenActiveOutputFileInAuxWindowAction() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.openActiveLogOutputFileInNewWindow`,
                    title: nls.localize2('openActiveOutputFileInNewWindow', "Open Output in New Window"),
                    menu: [{
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: 'navigation',
                            order: 5,
                            isHiddenByDefault: true
                        }],
                    icon: Codicon.emptyWindow,
                });
            }
            async run() {
                that.openActiveOutput(AUX_WINDOW_GROUP);
            }
        }));
    }
    registerSaveActiveOutputAsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.saveActiveLogOutputAs`,
                    title: nls.localize2('saveActiveOutputAs', "Save Output As..."),
                    menu: [{
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '1_export',
                            order: 1
                        }],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const channel = outputService.getActiveChannel();
                if (channel) {
                    const descriptor = outputService.getChannelDescriptors().find(c => c.id === channel.id);
                    if (descriptor) {
                        await outputService.saveOutputAs(descriptor);
                    }
                }
            }
        }));
    }
    async openActiveOutput(group) {
        const channel = this.outputService.getActiveChannel();
        if (channel) {
            await this.editorService.openEditor({
                resource: channel.uri,
                options: {
                    pinned: true,
                },
            }, group);
        }
    }
    registerConfigureActiveOutputLogLevelAction() {
        const logLevelMenu = new MenuId('workbench.output.menu.logLevel');
        this._register(MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
            submenu: logLevelMenu,
            title: nls.localize('logLevel.label', "Set Log Level..."),
            group: 'navigation',
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID), CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE),
            icon: Codicon.gear,
            order: 6
        }));
        let order = 0;
        const registerLogLevel = (logLevel) => {
            this._register(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `workbench.action.output.activeOutputLogLevel.${logLevel}`,
                        title: LogLevelToLocalizedString(logLevel).value,
                        toggled: CONTEXT_ACTIVE_OUTPUT_LEVEL.isEqualTo(LogLevelToString(logLevel)),
                        menu: {
                            id: logLevelMenu,
                            order: order++,
                            group: '0_level'
                        }
                    });
                }
                async run(accessor) {
                    const outputService = accessor.get(IOutputService);
                    const channel = outputService.getActiveChannel();
                    if (channel) {
                        const channelDescriptor = outputService.getChannelDescriptor(channel.id);
                        if (channelDescriptor) {
                            outputService.setLogLevel(channelDescriptor, logLevel);
                        }
                    }
                }
            }));
        };
        registerLogLevel(LogLevel.Trace);
        registerLogLevel(LogLevel.Debug);
        registerLogLevel(LogLevel.Info);
        registerLogLevel(LogLevel.Warning);
        registerLogLevel(LogLevel.Error);
        registerLogLevel(LogLevel.Off);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.output.activeOutputLogLevelDefault`,
                    title: nls.localize('logLevelDefault.label', "Set As Default"),
                    menu: {
                        id: logLevelMenu,
                        order,
                        group: '1_default'
                    },
                    precondition: CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT.negate()
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const loggerService = accessor.get(ILoggerService);
                const defaultLogLevelsService = accessor.get(IDefaultLogLevelsService);
                const channel = outputService.getActiveChannel();
                if (channel) {
                    const channelDescriptor = outputService.getChannelDescriptor(channel.id);
                    if (channelDescriptor && isSingleSourceOutputChannelDescriptor(channelDescriptor)) {
                        const logLevel = loggerService.getLogLevel(channelDescriptor.source.resource);
                        return await defaultLogLevelsService.setDefaultLogLevel(logLevel, channelDescriptor.extensionId);
                    }
                }
            }
        }));
    }
    registerShowLogsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.showLogs',
                    title: nls.localize2('showLogs', "Show Logs..."),
                    category: Categories.Developer,
                    menu: {
                        id: MenuId.CommandPalette,
                    },
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionLogs = [], logs = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.log) {
                        if (channel.extensionId) {
                            extensionLogs.push(channel);
                        }
                        else {
                            logs.push(channel);
                        }
                    }
                }
                const entries = [];
                for (const { id, label } of logs) {
                    entries.push({ id, label });
                }
                if (extensionLogs.length && logs.length) {
                    entries.push({ type: 'separator', label: nls.localize('extensionLogs', "Extension Logs") });
                }
                for (const { id, label } of extensionLogs) {
                    entries.push({ id, label });
                }
                const entry = await quickInputService.pick(entries, { placeHolder: nls.localize('selectlog', "Select Log") });
                if (entry) {
                    return outputService.showChannel(entry.id);
                }
            }
        }));
    }
    registerOpenLogFileAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.openLogFile',
                    title: nls.localize2('openLogFile', "Open Log..."),
                    category: Categories.Developer,
                    menu: {
                        id: MenuId.CommandPalette,
                    },
                    metadata: {
                        description: 'workbench.action.openLogFile',
                        args: [{
                                name: 'logFile',
                                schema: {
                                    markdownDescription: nls.localize('logFile', "The id of the log file to open, for example `\"window\"`. Currently the best way to get this is to get the ID by checking the `workbench.action.output.show.<id>` commands"),
                                    type: 'string'
                                }
                            }]
                    },
                });
            }
            async run(accessor, args) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const editorService = accessor.get(IEditorService);
                let entry;
                const argName = args && typeof args === 'string' ? args : undefined;
                const extensionChannels = [];
                const coreChannels = [];
                for (const c of outputService.getChannelDescriptors()) {
                    if (c.log) {
                        const e = { id: c.id, label: c.label };
                        if (c.extensionId) {
                            extensionChannels.push(e);
                        }
                        else {
                            coreChannels.push(e);
                        }
                        if (e.id === argName) {
                            entry = e;
                        }
                    }
                }
                if (!entry) {
                    const entries = [...extensionChannels.sort((a, b) => a.label.localeCompare(b.label))];
                    if (entries.length && coreChannels.length) {
                        entries.push({ type: 'separator' });
                        entries.push(...coreChannels.sort((a, b) => a.label.localeCompare(b.label)));
                    }
                    entry = await quickInputService.pick(entries, { placeHolder: nls.localize('selectlogFile', "Select Log File") });
                }
                if (entry?.id) {
                    const channel = outputService.getChannel(entry.id);
                    if (channel) {
                        await editorService.openEditor({
                            resource: channel.uri,
                            options: {
                                pinned: true,
                            }
                        });
                    }
                }
            }
        }));
    }
    registerLogLevelFilterActions() {
        let order = 0;
        const registerLogLevel = (logLevel, toggled) => {
            this._register(registerAction2(class extends ViewAction {
                constructor() {
                    super({
                        id: `workbench.actions.${OUTPUT_VIEW_ID}.toggle.${LogLevelToString(logLevel)}`,
                        title: LogLevelToLocalizedString(logLevel).value,
                        metadata: {
                            description: localize2('toggleTraceDescription', "Show or hide {0} messages in the output", LogLevelToString(logLevel))
                        },
                        toggled,
                        menu: {
                            id: viewFilterSubmenu,
                            group: '2_log_filter',
                            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OUTPUT_VIEW_ID), CONTEXT_ACTIVE_LOG_FILE_OUTPUT),
                            order: order++
                        },
                        viewId: OUTPUT_VIEW_ID
                    });
                }
                async runInView(serviceAccessor, view) {
                    this.toggleLogLevelFilter(serviceAccessor.get(IOutputService), logLevel);
                }
                toggleLogLevelFilter(outputService, logLevel) {
                    switch (logLevel) {
                        case LogLevel.Trace:
                            outputService.filters.trace = !outputService.filters.trace;
                            break;
                        case LogLevel.Debug:
                            outputService.filters.debug = !outputService.filters.debug;
                            break;
                        case LogLevel.Info:
                            outputService.filters.info = !outputService.filters.info;
                            break;
                        case LogLevel.Warning:
                            outputService.filters.warning = !outputService.filters.warning;
                            break;
                        case LogLevel.Error:
                            outputService.filters.error = !outputService.filters.error;
                            break;
                    }
                }
            }));
        };
        registerLogLevel(LogLevel.Trace, SHOW_TRACE_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Debug, SHOW_DEBUG_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Info, SHOW_INFO_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Warning, SHOW_WARNING_FILTER_CONTEXT);
        registerLogLevel(LogLevel.Error, SHOW_ERROR_FILTER_CONTEXT);
    }
    registerClearFilterActions() {
        this._register(registerAction2(class extends ViewAction {
            constructor() {
                super({
                    id: `workbench.actions.${OUTPUT_VIEW_ID}.clearFilterText`,
                    title: localize('clearFiltersText', "Clear filters text"),
                    keybinding: {
                        when: OUTPUT_FILTER_FOCUS_CONTEXT,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: 9 /* KeyCode.Escape */
                    },
                    viewId: OUTPUT_VIEW_ID
                });
            }
            async runInView(serviceAccessor, outputView) {
                outputView.clearFilterText();
            }
        }));
    }
    registerExportLogsAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.exportLogs`,
                    title: nls.localize2('exportLogs', "Export Logs..."),
                    f1: true,
                    category: Categories.Developer,
                    menu: [{
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '1_export',
                            order: 2,
                        }],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const quickInputService = accessor.get(IQuickInputService);
                const extensionLogs = [], logs = [], userLogs = [];
                for (const channel of outputService.getChannelDescriptors()) {
                    if (channel.log) {
                        if (channel.extensionId) {
                            extensionLogs.push(channel);
                        }
                        else if (channel.user) {
                            userLogs.push(channel);
                        }
                        else {
                            logs.push(channel);
                        }
                    }
                }
                const entries = [];
                for (const log of logs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                if (extensionLogs.length && logs.length) {
                    entries.push({ type: 'separator', label: nls.localize('extensionLogs', "Extension Logs") });
                }
                for (const log of extensionLogs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                if (userLogs.length && (extensionLogs.length || logs.length)) {
                    entries.push({ type: 'separator', label: nls.localize('userLogs', "User Logs") });
                }
                for (const log of userLogs.sort((a, b) => a.label.localeCompare(b.label))) {
                    entries.push(log);
                }
                const result = await quickInputService.pick(entries, { placeHolder: nls.localize('selectlog', "Select Log"), canPickMany: true });
                if (result?.length) {
                    await outputService.saveOutputAs(...result);
                }
            }
        }));
    }
    registerImportLogAction() {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.importLog`,
                    title: nls.localize2('importLog', "Import Log..."),
                    f1: true,
                    category: Categories.Developer,
                    menu: [{
                            id: MenuId.ViewTitle,
                            when: ContextKeyExpr.equals('view', OUTPUT_VIEW_ID),
                            group: '2_add',
                            order: 2,
                        }],
                });
            }
            async run(accessor) {
                const outputService = accessor.get(IOutputService);
                const fileDialogService = accessor.get(IFileDialogService);
                const result = await fileDialogService.showOpenDialog({
                    title: nls.localize('importLogFile', "Import Log File"),
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    filters: [{
                            name: nls.localize('logFiles', "Log Files"),
                            extensions: ['log']
                        }]
                });
                if (result?.length) {
                    const channelName = basename(result[0]);
                    const channelId = `${IMPORTED_LOG_ID_PREFIX}${Date.now()}`;
                    // Register and show the channel
                    Registry.as(Extensions.OutputChannels).registerChannel({
                        id: channelId,
                        label: channelName,
                        log: true,
                        user: true,
                        source: result.length === 1
                            ? { resource: result[0] }
                            : result.map(resource => ({ resource, name: basename(resource).split('.')[0] }))
                    });
                    outputService.showChannel(channelId);
                }
            }
        }));
    }
};
OutputContribution = __decorate([
    __param(0, IOutputService),
    __param(1, IEditorService)
], OutputContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(OutputContribution, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'output',
    order: 30,
    title: nls.localize('output', "Output"),
    type: 'object',
    properties: {
        'output.smartScroll.enabled': {
            type: 'boolean',
            description: nls.localize('output.smartScroll.enabled', "Enable/disable the ability of smart scrolling in the output view. Smart scrolling allows you to lock scrolling automatically when you click in the output view and unlocks when you click in the last line."),
            default: true,
            scope: 4 /* ConfigurationScope.WINDOW */,
            tags: ['output']
        }
    }
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityLeft',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityLeftSelect',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityRight',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */
});
KeybindingsRegistry.registerKeybindingRule({
    id: 'cursorWordAccessibilityRightSelect',
    when: ContextKeyExpr.and(EditorContextKeys.textInputFocus, CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext, ContextKeyExpr.equals(FocusedViewContext.key, OUTPUT_VIEW_ID)),
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dHB1dC9icm93c2VyL291dHB1dC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQVUsUUFBUSxFQUFXLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsMEJBQTBCLEVBQTRCLDZCQUE2QixFQUFFLG9DQUFvQyxFQUEwQixVQUFVLEVBQUUsMkJBQTJCLEVBQUUsc0NBQXNDLEVBQUUsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsMkJBQTJCLEVBQUUsMkJBQTJCLEVBQUUsOEJBQThCLEVBQUUscUNBQXFDLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsbkIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8s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
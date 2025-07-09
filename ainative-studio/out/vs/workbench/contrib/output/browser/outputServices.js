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
import { Event, Emitter } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { OUTPUT_VIEW_ID, LOG_MIME, OUTPUT_MIME, Extensions, ACTIVE_OUTPUT_CHANNEL_CONTEXT, CONTEXT_ACTIVE_FILE_OUTPUT, CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE, CONTEXT_ACTIVE_OUTPUT_LEVEL, CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT, SHOW_DEBUG_FILTER_CONTEXT, SHOW_ERROR_FILTER_CONTEXT, SHOW_INFO_FILTER_CONTEXT, SHOW_TRACE_FILTER_CONTEXT, SHOW_WARNING_FILTER_CONTEXT, CONTEXT_ACTIVE_LOG_FILE_OUTPUT, isSingleSourceOutputChannelDescriptor, HIDE_CATEGORY_FILTER_CONTEXT, isMultiSourceOutputChannelDescriptor } from '../../../services/output/common/output.js';
import { OutputLinkProvider } from './outputLinkProvider.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ILogService, ILoggerService, LogLevel, LogLevelToString } from '../../../../platform/log/common/log.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { DelegatedOutputChannelModel, FileOutputChannelModel, MultiFileOutputChannelModel } from '../common/outputChannelModel.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDefaultLogLevelsService } from '../../logs/common/defaultLogLevels.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { localize } from '../../../../nls.js';
import { joinPath } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { telemetryLogId } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { toLocalISOString } from '../../../../base/common/date.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
const OUTPUT_ACTIVE_CHANNEL_KEY = 'output.activechannel';
let OutputChannel = class OutputChannel extends Disposable {
    constructor(outputChannelDescriptor, outputLocation, outputDirPromise, languageService, instantiationService) {
        super();
        this.outputChannelDescriptor = outputChannelDescriptor;
        this.outputLocation = outputLocation;
        this.outputDirPromise = outputDirPromise;
        this.languageService = languageService;
        this.instantiationService = instantiationService;
        this.scrollLock = false;
        this.id = outputChannelDescriptor.id;
        this.label = outputChannelDescriptor.label;
        this.uri = URI.from({ scheme: Schemas.outputChannel, path: this.id });
        this.model = this._register(this.createOutputChannelModel(this.uri, outputChannelDescriptor));
    }
    createOutputChannelModel(uri, outputChannelDescriptor) {
        const language = outputChannelDescriptor.languageId ? this.languageService.createById(outputChannelDescriptor.languageId) : this.languageService.createByMimeType(outputChannelDescriptor.log ? LOG_MIME : OUTPUT_MIME);
        if (isMultiSourceOutputChannelDescriptor(outputChannelDescriptor)) {
            return this.instantiationService.createInstance(MultiFileOutputChannelModel, uri, language, [...outputChannelDescriptor.source]);
        }
        if (isSingleSourceOutputChannelDescriptor(outputChannelDescriptor)) {
            return this.instantiationService.createInstance(FileOutputChannelModel, uri, language, outputChannelDescriptor.source);
        }
        return this.instantiationService.createInstance(DelegatedOutputChannelModel, this.id, uri, language, this.outputLocation, this.outputDirPromise);
    }
    getLogEntries() {
        return this.model.getLogEntries();
    }
    append(output) {
        this.model.append(output);
    }
    update(mode, till) {
        this.model.update(mode, till, true);
    }
    clear() {
        this.model.clear();
    }
    replace(value) {
        this.model.replace(value);
    }
};
OutputChannel = __decorate([
    __param(3, ILanguageService),
    __param(4, IInstantiationService)
], OutputChannel);
class OutputViewFilters extends Disposable {
    constructor(options, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._filterText = '';
        this._trace = SHOW_TRACE_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._debug = SHOW_DEBUG_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._info = SHOW_INFO_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._warning = SHOW_WARNING_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._error = SHOW_ERROR_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._categories = HIDE_CATEGORY_FILTER_CONTEXT.bindTo(this.contextKeyService);
        this._trace.set(options.trace);
        this._debug.set(options.debug);
        this._info.set(options.info);
        this._warning.set(options.warning);
        this._error.set(options.error);
        this._categories.set(options.sources);
        this.filterHistory = options.filterHistory;
    }
    get text() {
        return this._filterText;
    }
    set text(filterText) {
        if (this._filterText !== filterText) {
            this._filterText = filterText;
            this._onDidChange.fire();
        }
    }
    get trace() {
        return !!this._trace.get();
    }
    set trace(trace) {
        if (this._trace.get() !== trace) {
            this._trace.set(trace);
            this._onDidChange.fire();
        }
    }
    get debug() {
        return !!this._debug.get();
    }
    set debug(debug) {
        if (this._debug.get() !== debug) {
            this._debug.set(debug);
            this._onDidChange.fire();
        }
    }
    get info() {
        return !!this._info.get();
    }
    set info(info) {
        if (this._info.get() !== info) {
            this._info.set(info);
            this._onDidChange.fire();
        }
    }
    get warning() {
        return !!this._warning.get();
    }
    set warning(warning) {
        if (this._warning.get() !== warning) {
            this._warning.set(warning);
            this._onDidChange.fire();
        }
    }
    get error() {
        return !!this._error.get();
    }
    set error(error) {
        if (this._error.get() !== error) {
            this._error.set(error);
            this._onDidChange.fire();
        }
    }
    get categories() {
        return this._categories.get() || ',';
    }
    set categories(categories) {
        this._categories.set(categories);
        this._onDidChange.fire();
    }
    toggleCategory(category) {
        const categories = this.categories;
        if (this.hasCategory(category)) {
            this.categories = categories.replace(`,${category},`, ',');
        }
        else {
            this.categories = `${categories}${category},`;
        }
    }
    hasCategory(category) {
        if (category === ',') {
            return false;
        }
        return this.categories.includes(`,${category},`);
    }
}
let OutputService = class OutputService extends Disposable {
    constructor(storageService, instantiationService, textModelService, logService, loggerService, lifecycleService, viewsService, contextKeyService, defaultLogLevelsService, fileDialogService, fileService, environmentService) {
        super();
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.textModelService = textModelService;
        this.logService = logService;
        this.loggerService = loggerService;
        this.lifecycleService = lifecycleService;
        this.viewsService = viewsService;
        this.defaultLogLevelsService = defaultLogLevelsService;
        this.fileDialogService = fileDialogService;
        this.fileService = fileService;
        this.channels = this._register(new DisposableMap());
        this._onActiveOutputChannel = this._register(new Emitter());
        this.onActiveOutputChannel = this._onActiveOutputChannel.event;
        this.outputFolderCreationPromise = null;
        this.activeChannelIdInStorage = this.storageService.get(OUTPUT_ACTIVE_CHANNEL_KEY, 1 /* StorageScope.WORKSPACE */, '');
        this.activeOutputChannelContext = ACTIVE_OUTPUT_CHANNEL_CONTEXT.bindTo(contextKeyService);
        this.activeOutputChannelContext.set(this.activeChannelIdInStorage);
        this._register(this.onActiveOutputChannel(channel => this.activeOutputChannelContext.set(channel)));
        this.activeFileOutputChannelContext = CONTEXT_ACTIVE_FILE_OUTPUT.bindTo(contextKeyService);
        this.activeLogOutputChannelContext = CONTEXT_ACTIVE_LOG_FILE_OUTPUT.bindTo(contextKeyService);
        this.activeOutputChannelLevelSettableContext = CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE.bindTo(contextKeyService);
        this.activeOutputChannelLevelContext = CONTEXT_ACTIVE_OUTPUT_LEVEL.bindTo(contextKeyService);
        this.activeOutputChannelLevelIsDefaultContext = CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT.bindTo(contextKeyService);
        this.outputLocation = joinPath(environmentService.windowLogsPath, `output_${toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '')}`);
        // Register as text model content provider for output
        this._register(textModelService.registerTextModelContentProvider(Schemas.outputChannel, this));
        this._register(instantiationService.createInstance(OutputLinkProvider));
        // Create output channels for already registered channels
        const registry = Registry.as(Extensions.OutputChannels);
        for (const channelIdentifier of registry.getChannels()) {
            this.onDidRegisterChannel(channelIdentifier.id);
        }
        this._register(registry.onDidRegisterChannel(id => this.onDidRegisterChannel(id)));
        this._register(registry.onDidUpdateChannelSources(channel => this.onDidUpdateChannelSources(channel)));
        this._register(registry.onDidRemoveChannel(channel => this.onDidRemoveChannel(channel)));
        // Set active channel to first channel if not set
        if (!this.activeChannel) {
            const channels = this.getChannelDescriptors();
            this.setActiveChannel(channels && channels.length > 0 ? this.getChannel(channels[0].id) : undefined);
        }
        this._register(Event.filter(this.viewsService.onDidChangeViewVisibility, e => e.id === OUTPUT_VIEW_ID && e.visible)(() => {
            if (this.activeChannel) {
                this.viewsService.getActiveViewWithId(OUTPUT_VIEW_ID)?.showChannel(this.activeChannel, true);
            }
        }));
        this._register(this.loggerService.onDidChangeLogLevel(() => {
            this.resetLogLevelFilters();
            this.setLevelContext();
            this.setLevelIsDefaultContext();
        }));
        this._register(this.defaultLogLevelsService.onDidChangeDefaultLogLevels(() => {
            this.setLevelIsDefaultContext();
        }));
        this._register(this.lifecycleService.onDidShutdown(() => this.dispose()));
        this.filters = this._register(new OutputViewFilters({
            filterHistory: [],
            trace: true,
            debug: true,
            info: true,
            warning: true,
            error: true,
            sources: '',
        }, contextKeyService));
    }
    provideTextContent(resource) {
        const channel = this.getChannel(resource.path);
        if (channel) {
            return channel.model.loadModel();
        }
        return null;
    }
    async showChannel(id, preserveFocus) {
        const channel = this.getChannel(id);
        if (this.activeChannel?.id !== channel?.id) {
            this.setActiveChannel(channel);
            this._onActiveOutputChannel.fire(id);
        }
        const outputView = await this.viewsService.openView(OUTPUT_VIEW_ID, !preserveFocus);
        if (outputView && channel) {
            outputView.showChannel(channel, !!preserveFocus);
        }
    }
    getChannel(id) {
        return this.channels.get(id);
    }
    getChannelDescriptor(id) {
        return Registry.as(Extensions.OutputChannels).getChannel(id);
    }
    getChannelDescriptors() {
        return Registry.as(Extensions.OutputChannels).getChannels();
    }
    getActiveChannel() {
        return this.activeChannel;
    }
    canSetLogLevel(channel) {
        return channel.log && channel.id !== telemetryLogId;
    }
    getLogLevel(channel) {
        if (!channel.log) {
            return undefined;
        }
        const sources = isSingleSourceOutputChannelDescriptor(channel) ? [channel.source] : isMultiSourceOutputChannelDescriptor(channel) ? channel.source : [];
        if (sources.length === 0) {
            return undefined;
        }
        const logLevel = this.loggerService.getLogLevel();
        return sources.reduce((prev, curr) => Math.min(prev, this.loggerService.getLogLevel(curr.resource) ?? logLevel), LogLevel.Error);
    }
    setLogLevel(channel, logLevel) {
        if (!channel.log) {
            return;
        }
        const sources = isSingleSourceOutputChannelDescriptor(channel) ? [channel.source] : isMultiSourceOutputChannelDescriptor(channel) ? channel.source : [];
        if (sources.length === 0) {
            return;
        }
        for (const source of sources) {
            this.loggerService.setLogLevel(source.resource, logLevel);
        }
    }
    registerCompoundLogChannel(descriptors) {
        const outputChannelRegistry = Registry.as(Extensions.OutputChannels);
        descriptors.sort((a, b) => a.label.localeCompare(b.label));
        const id = descriptors.map(r => r.id.toLowerCase()).join('-');
        if (!outputChannelRegistry.getChannel(id)) {
            outputChannelRegistry.registerChannel({
                id,
                label: descriptors.map(r => r.label).join(', '),
                log: descriptors.some(r => r.log),
                user: true,
                source: descriptors.map(descriptor => {
                    if (isSingleSourceOutputChannelDescriptor(descriptor)) {
                        return [{ resource: descriptor.source.resource, name: descriptor.source.name ?? descriptor.label }];
                    }
                    if (isMultiSourceOutputChannelDescriptor(descriptor)) {
                        return descriptor.source;
                    }
                    const channel = this.getChannel(descriptor.id);
                    if (channel) {
                        return channel.model.source;
                    }
                    return [];
                }).flat(),
            });
        }
        return id;
    }
    async saveOutputAs(...channels) {
        let channel;
        if (channels.length > 1) {
            const compoundChannelId = this.registerCompoundLogChannel(channels);
            channel = this.getChannel(compoundChannelId);
        }
        else {
            channel = this.getChannel(channels[0].id);
        }
        if (!channel) {
            return;
        }
        try {
            const name = channels.length > 1 ? 'output' : channels[0].label;
            const uri = await this.fileDialogService.showSaveDialog({
                title: localize('saveLog.dialogTitle', "Save Output As"),
                availableFileSystems: [Schemas.file],
                defaultUri: joinPath(await this.fileDialogService.defaultFilePath(), `${name}.log`),
                filters: [{
                        name,
                        extensions: ['log']
                    }]
            });
            if (!uri) {
                return;
            }
            const modelRef = await this.textModelService.createModelReference(channel.uri);
            try {
                await this.fileService.writeFile(uri, VSBuffer.fromString(modelRef.object.textEditorModel.getValue()));
            }
            finally {
                modelRef.dispose();
            }
            return;
        }
        finally {
            if (channels.length > 1) {
                Registry.as(Extensions.OutputChannels).removeChannel(channel.id);
            }
        }
    }
    async onDidRegisterChannel(channelId) {
        const channel = this.createChannel(channelId);
        this.channels.set(channelId, channel);
        if (!this.activeChannel || this.activeChannelIdInStorage === channelId) {
            this.setActiveChannel(channel);
            this._onActiveOutputChannel.fire(channelId);
            const outputView = this.viewsService.getActiveViewWithId(OUTPUT_VIEW_ID);
            outputView?.showChannel(channel, true);
        }
    }
    onDidUpdateChannelSources(channel) {
        const outputChannel = this.channels.get(channel.id);
        if (outputChannel) {
            outputChannel.model.updateChannelSources(channel.source);
        }
    }
    onDidRemoveChannel(channel) {
        if (this.activeChannel?.id === channel.id) {
            const channels = this.getChannelDescriptors();
            if (channels[0]) {
                this.showChannel(channels[0].id);
            }
        }
        this.channels.deleteAndDispose(channel.id);
    }
    createChannel(id) {
        const channel = this.instantiateChannel(id);
        this._register(Event.once(channel.model.onDispose)(() => {
            if (this.activeChannel === channel) {
                const channels = this.getChannelDescriptors();
                const channel = channels.length ? this.getChannel(channels[0].id) : undefined;
                if (channel && this.viewsService.isViewVisible(OUTPUT_VIEW_ID)) {
                    this.showChannel(channel.id);
                }
                else {
                    this.setActiveChannel(undefined);
                }
            }
            Registry.as(Extensions.OutputChannels).removeChannel(id);
        }));
        return channel;
    }
    instantiateChannel(id) {
        const channelData = Registry.as(Extensions.OutputChannels).getChannel(id);
        if (!channelData) {
            this.logService.error(`Channel '${id}' is not registered yet`);
            throw new Error(`Channel '${id}' is not registered yet`);
        }
        if (!this.outputFolderCreationPromise) {
            this.outputFolderCreationPromise = this.fileService.createFolder(this.outputLocation).then(() => undefined);
        }
        return this.instantiationService.createInstance(OutputChannel, channelData, this.outputLocation, this.outputFolderCreationPromise);
    }
    resetLogLevelFilters() {
        const descriptor = this.activeChannel?.outputChannelDescriptor;
        const channelLogLevel = descriptor ? this.getLogLevel(descriptor) : undefined;
        if (channelLogLevel !== undefined) {
            this.filters.error = channelLogLevel <= LogLevel.Error;
            this.filters.warning = channelLogLevel <= LogLevel.Warning;
            this.filters.info = channelLogLevel <= LogLevel.Info;
            this.filters.debug = channelLogLevel <= LogLevel.Debug;
            this.filters.trace = channelLogLevel <= LogLevel.Trace;
        }
    }
    setLevelContext() {
        const descriptor = this.activeChannel?.outputChannelDescriptor;
        const channelLogLevel = descriptor ? this.getLogLevel(descriptor) : undefined;
        this.activeOutputChannelLevelContext.set(channelLogLevel !== undefined ? LogLevelToString(channelLogLevel) : '');
    }
    async setLevelIsDefaultContext() {
        const descriptor = this.activeChannel?.outputChannelDescriptor;
        const channelLogLevel = descriptor ? this.getLogLevel(descriptor) : undefined;
        if (channelLogLevel !== undefined) {
            const channelDefaultLogLevel = await this.defaultLogLevelsService.getDefaultLogLevel(descriptor?.extensionId);
            this.activeOutputChannelLevelIsDefaultContext.set(channelDefaultLogLevel === channelLogLevel);
        }
        else {
            this.activeOutputChannelLevelIsDefaultContext.set(false);
        }
    }
    setActiveChannel(channel) {
        this.activeChannel = channel;
        const descriptor = channel?.outputChannelDescriptor;
        this.activeFileOutputChannelContext.set(!!descriptor && isSingleSourceOutputChannelDescriptor(descriptor));
        this.activeLogOutputChannelContext.set(!!descriptor?.log);
        this.activeOutputChannelLevelSettableContext.set(descriptor !== undefined && this.canSetLogLevel(descriptor));
        this.setLevelIsDefaultContext();
        this.setLevelContext();
        if (this.activeChannel) {
            this.storageService.store(OUTPUT_ACTIVE_CHANNEL_KEY, this.activeChannel.id, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(OUTPUT_ACTIVE_CHANNEL_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
};
OutputService = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, ITextModelService),
    __param(3, ILogService),
    __param(4, ILoggerService),
    __param(5, ILifecycleService),
    __param(6, IViewsService),
    __param(7, IContextKeyService),
    __param(8, IDefaultLogLevelsService),
    __param(9, IFileDialogService),
    __param(10, IFileService),
    __param(11, IWorkbenchEnvironmentService)
], OutputService);
export { OutputService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0U2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L2Jyb3dzZXIvb3V0cHV0U2VydmljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFrQyxjQUFjLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBcUQsVUFBVSxFQUEwQiw2QkFBNkIsRUFBRSwwQkFBMEIsRUFBRSxvQ0FBb0MsRUFBRSwyQkFBMkIsRUFBRSxzQ0FBc0MsRUFBc0IseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUseUJBQXlCLEVBQUUsMkJBQTJCLEVBQUUsOEJBQThCLEVBQXVDLHFDQUFxQyxFQUFFLDRCQUE0QixFQUFFLG9DQUFvQyxFQUFhLE1BQU0sMkNBQTJDLENBQUM7QUFDdHRCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBNkIsTUFBTSx1REFBdUQsQ0FBQztBQUVy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
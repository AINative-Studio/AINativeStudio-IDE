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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SetLogLevelAction } from './logsActions.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IOutputService, Extensions, isMultiSourceOutputChannelDescriptor, isSingleSourceOutputChannelDescriptor } from '../../../services/output/common/output.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { CONTEXT_LOG_LEVEL, ILoggerService, LogLevelToString, isLogLevel } from '../../../../platform/log/common/log.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';
import { windowLogId, showWindowLogActionId } from '../../../services/log/common/logConstants.js';
import { IDefaultLogLevelsService } from './defaultLogLevels.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { CounterSet } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Schemas } from '../../../../base/common/network.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SetLogLevelAction.ID,
            title: SetLogLevelAction.TITLE,
            category: Categories.Developer,
            f1: true
        });
    }
    run(servicesAccessor) {
        return servicesAccessor.get(IInstantiationService).createInstance(SetLogLevelAction, SetLogLevelAction.ID, SetLogLevelAction.TITLE.value).run();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.setDefaultLogLevel',
            title: nls.localize2('setDefaultLogLevel', "Set Default Log Level"),
            category: Categories.Developer,
        });
    }
    run(servicesAccessor, logLevel, extensionId) {
        return servicesAccessor.get(IDefaultLogLevelsService).setDefaultLogLevel(logLevel, extensionId);
    }
});
let LogOutputChannels = class LogOutputChannels extends Disposable {
    constructor(loggerService, contextKeyService, uriIdentityService) {
        super();
        this.loggerService = loggerService;
        this.contextKeyService = contextKeyService;
        this.uriIdentityService = uriIdentityService;
        this.contextKeys = new CounterSet();
        this.outputChannelRegistry = Registry.as(Extensions.OutputChannels);
        const contextKey = CONTEXT_LOG_LEVEL.bindTo(contextKeyService);
        contextKey.set(LogLevelToString(loggerService.getLogLevel()));
        this._register(loggerService.onDidChangeLogLevel(e => {
            if (isLogLevel(e)) {
                contextKey.set(LogLevelToString(loggerService.getLogLevel()));
            }
        }));
        this.onDidAddLoggers(loggerService.getRegisteredLoggers());
        this._register(loggerService.onDidChangeLoggers(({ added, removed }) => {
            this.onDidAddLoggers(added);
            this.onDidRemoveLoggers(removed);
        }));
        this._register(loggerService.onDidChangeVisibility(([resource, visibility]) => {
            const logger = loggerService.getRegisteredLogger(resource);
            if (logger) {
                if (visibility) {
                    this.registerLogChannel(logger);
                }
                else {
                    this.deregisterLogChannel(logger);
                }
            }
        }));
        this.registerShowWindowLogAction();
        this._register(Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(this.contextKeys))(() => this.onDidChangeContext()));
    }
    onDidAddLoggers(loggers) {
        for (const logger of loggers) {
            if (logger.when) {
                const contextKeyExpr = ContextKeyExpr.deserialize(logger.when);
                if (contextKeyExpr) {
                    for (const key of contextKeyExpr.keys()) {
                        this.contextKeys.add(key);
                    }
                    if (!this.contextKeyService.contextMatchesRules(contextKeyExpr)) {
                        continue;
                    }
                }
            }
            if (logger.hidden) {
                continue;
            }
            this.registerLogChannel(logger);
        }
    }
    onDidChangeContext() {
        for (const logger of this.loggerService.getRegisteredLoggers()) {
            if (logger.when) {
                if (this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(logger.when))) {
                    this.registerLogChannel(logger);
                }
                else {
                    this.deregisterLogChannel(logger);
                }
            }
        }
    }
    onDidRemoveLoggers(loggers) {
        for (const logger of loggers) {
            if (logger.when) {
                const contextKeyExpr = ContextKeyExpr.deserialize(logger.when);
                if (contextKeyExpr) {
                    for (const key of contextKeyExpr.keys()) {
                        this.contextKeys.delete(key);
                    }
                }
            }
            this.deregisterLogChannel(logger);
        }
    }
    registerLogChannel(logger) {
        if (logger.group) {
            this.registerCompoundLogChannel(logger.group.id, logger.group.name, logger);
            return;
        }
        const channel = this.outputChannelRegistry.getChannel(logger.id);
        if (channel && isSingleSourceOutputChannelDescriptor(channel) && this.uriIdentityService.extUri.isEqual(channel.source.resource, logger.resource)) {
            return;
        }
        const existingChannel = this.outputChannelRegistry.getChannel(logger.id);
        const remoteLogger = existingChannel && isSingleSourceOutputChannelDescriptor(existingChannel) && existingChannel.source.resource.scheme === Schemas.vscodeRemote ? this.loggerService.getRegisteredLogger(existingChannel.source.resource) : undefined;
        if (remoteLogger) {
            this.deregisterLogChannel(remoteLogger);
        }
        const hasToAppendRemote = existingChannel && logger.resource.scheme === Schemas.vscodeRemote;
        const id = hasToAppendRemote ? `${logger.id}.remote` : logger.id;
        const label = hasToAppendRemote ? nls.localize('remote name', "{0} (Remote)", logger.name ?? logger.id) : logger.name ?? logger.id;
        this.outputChannelRegistry.registerChannel({ id, label, source: { resource: logger.resource }, log: true, extensionId: logger.extensionId });
    }
    registerCompoundLogChannel(id, name, logger) {
        const channel = this.outputChannelRegistry.getChannel(id);
        const source = { resource: logger.resource, name: logger.name ?? logger.id };
        if (channel) {
            if (isMultiSourceOutputChannelDescriptor(channel) && !channel.source.some(({ resource }) => this.uriIdentityService.extUri.isEqual(resource, logger.resource))) {
                this.outputChannelRegistry.updateChannelSources(id, [...channel.source, source]);
            }
        }
        else {
            this.outputChannelRegistry.registerChannel({ id, label: name, log: true, source: [source] });
        }
    }
    deregisterLogChannel(logger) {
        if (logger.group) {
            const channel = this.outputChannelRegistry.getChannel(logger.group.id);
            if (channel && isMultiSourceOutputChannelDescriptor(channel)) {
                this.outputChannelRegistry.updateChannelSources(logger.group.id, channel.source.filter(({ resource }) => !this.uriIdentityService.extUri.isEqual(resource, logger.resource)));
            }
        }
        else {
            this.outputChannelRegistry.removeChannel(logger.id);
        }
    }
    registerShowWindowLogAction() {
        this._register(registerAction2(class ShowWindowLogAction extends Action2 {
            constructor() {
                super({
                    id: showWindowLogActionId,
                    title: nls.localize2('show window log', "Show Window Log"),
                    category: Categories.Developer,
                    f1: true
                });
            }
            async run(servicesAccessor) {
                const outputService = servicesAccessor.get(IOutputService);
                outputService.showChannel(windowLogId);
            }
        }));
    }
};
LogOutputChannels = __decorate([
    __param(0, ILoggerService),
    __param(1, IContextKeyService),
    __param(2, IUriIdentityService)
], LogOutputChannels);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LogOutputChannels, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9ncy9jb21tb24vbG9ncy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDckQsT0FBTyxFQUEyRCxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SSxPQUFPLEVBQTBCLGNBQWMsRUFBRSxVQUFVLEVBQUUsb0NBQW9DLEVBQUUscUNBQXFDLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1TCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFtQixjQUFjLEVBQVksZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFcEosT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENB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
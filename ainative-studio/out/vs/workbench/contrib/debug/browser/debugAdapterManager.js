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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import * as strings from '../../../../base/common/strings.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as nls from '../../../../nls.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Breakpoints } from '../common/breakpoints.js';
import { CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_EXTENSION_AVAILABLE, INTERNAL_CONSOLE_OPTIONS_SCHEMA } from '../common/debug.js';
import { Debugger } from '../common/debugger.js';
import { breakpointsExtPoint, debuggersExtPoint, launchSchema, presentationSchema } from '../common/debugSchemas.js';
import { TaskDefinitionRegistry } from '../../tasks/common/taskDefinitionRegistry.js';
import { ITaskService } from '../../tasks/common/taskService.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
let AdapterManager = class AdapterManager extends Disposable {
    constructor(delegate, editorService, configurationService, quickInputService, instantiationService, commandService, extensionService, contextKeyService, languageService, dialogService, lifecycleService, tasksService, menuService) {
        super();
        this.delegate = delegate;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.languageService = languageService;
        this.dialogService = dialogService;
        this.lifecycleService = lifecycleService;
        this.tasksService = tasksService;
        this.menuService = menuService;
        this.debugAdapterFactories = new Map();
        this._onDidRegisterDebugger = new Emitter();
        this._onDidDebuggersExtPointRead = new Emitter();
        this.breakpointContributions = [];
        this.debuggerWhenKeys = new Set();
        this.taskLabels = [];
        this.usedDebugTypes = new Set();
        this.adapterDescriptorFactories = [];
        this.debuggers = [];
        this.registerListeners();
        this.contextKeyService.bufferChangeEvents(() => {
            this.debuggersAvailable = CONTEXT_DEBUGGERS_AVAILABLE.bindTo(contextKeyService);
            this.debugExtensionsAvailable = CONTEXT_DEBUG_EXTENSION_AVAILABLE.bindTo(contextKeyService);
        });
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this.debuggerWhenKeys)) {
                this.debuggersAvailable.set(this.hasEnabledDebuggers());
                this.updateDebugAdapterSchema();
            }
        }));
        this._register(this.onDidDebuggersExtPointRead(() => {
            this.debugExtensionsAvailable.set(this.debuggers.length > 0);
        }));
        // generous debounce since this will end up calling `resolveTask` internally
        const updateTaskScheduler = this._register(new RunOnceScheduler(() => this.updateTaskLabels(), 5000));
        this._register(Event.any(tasksService.onDidChangeTaskConfig, tasksService.onDidChangeTaskProviders)(() => {
            updateTaskScheduler.cancel();
            updateTaskScheduler.schedule();
        }));
        this.lifecycleService.when(4 /* LifecyclePhase.Eventually */)
            .then(() => this.debugExtensionsAvailable.set(this.debuggers.length > 0)); // If no extensions with a debugger contribution are loaded
        this._register(delegate.onDidNewSession(s => {
            this.usedDebugTypes.add(s.configuration.type);
        }));
        updateTaskScheduler.schedule();
    }
    registerListeners() {
        debuggersExtPoint.setHandler((extensions, delta) => {
            delta.added.forEach(added => {
                added.value.forEach(rawAdapter => {
                    if (!rawAdapter.type || (typeof rawAdapter.type !== 'string')) {
                        added.collector.error(nls.localize('debugNoType', "Debugger 'type' can not be omitted and must be of type 'string'."));
                    }
                    if (rawAdapter.type !== '*') {
                        const existing = this.getDebugger(rawAdapter.type);
                        if (existing) {
                            existing.merge(rawAdapter, added.description);
                        }
                        else {
                            const dbg = this.instantiationService.createInstance(Debugger, this, rawAdapter, added.description);
                            dbg.when?.keys().forEach(key => this.debuggerWhenKeys.add(key));
                            this.debuggers.push(dbg);
                        }
                    }
                });
            });
            // take care of all wildcard contributions
            extensions.forEach(extension => {
                extension.value.forEach(rawAdapter => {
                    if (rawAdapter.type === '*') {
                        this.debuggers.forEach(dbg => dbg.merge(rawAdapter, extension.description));
                    }
                });
            });
            delta.removed.forEach(removed => {
                const removedTypes = removed.value.map(rawAdapter => rawAdapter.type);
                this.debuggers = this.debuggers.filter(d => removedTypes.indexOf(d.type) === -1);
            });
            this.updateDebugAdapterSchema();
            this._onDidDebuggersExtPointRead.fire();
        });
        breakpointsExtPoint.setHandler(extensions => {
            this.breakpointContributions = extensions.flatMap(ext => ext.value.map(breakpoint => this.instantiationService.createInstance(Breakpoints, breakpoint)));
        });
    }
    updateTaskLabels() {
        this.tasksService.getKnownTasks().then(tasks => {
            this.taskLabels = tasks.map(task => task._label);
            this.updateDebugAdapterSchema();
        });
    }
    updateDebugAdapterSchema() {
        // update the schema to include all attributes, snippets and types from extensions.
        const items = launchSchema.properties['configurations'].items;
        const taskSchema = TaskDefinitionRegistry.getJsonSchema();
        const definitions = {
            'common': {
                properties: {
                    'name': {
                        type: 'string',
                        description: nls.localize('debugName', "Name of configuration; appears in the launch configuration dropdown menu."),
                        default: 'Launch'
                    },
                    'debugServer': {
                        type: 'number',
                        description: nls.localize('debugServer', "For debug extension development only: if a port is specified VS Code tries to connect to a debug adapter running in server mode"),
                        default: 4711
                    },
                    'preLaunchTask': {
                        anyOf: [taskSchema, {
                                type: ['string']
                            }],
                        default: '',
                        defaultSnippets: [{ body: { task: '', type: '' } }],
                        description: nls.localize('debugPrelaunchTask', "Task to run before debug session starts."),
                        examples: this.taskLabels,
                    },
                    'postDebugTask': {
                        anyOf: [taskSchema, {
                                type: ['string'],
                            }],
                        default: '',
                        defaultSnippets: [{ body: { task: '', type: '' } }],
                        description: nls.localize('debugPostDebugTask', "Task to run after debug session ends."),
                        examples: this.taskLabels,
                    },
                    'presentation': presentationSchema,
                    'internalConsoleOptions': INTERNAL_CONSOLE_OPTIONS_SCHEMA,
                    'suppressMultipleSessionWarning': {
                        type: 'boolean',
                        description: nls.localize('suppressMultipleSessionWarning', "Disable the warning when trying to start the same debug configuration more than once."),
                        default: true
                    }
                }
            }
        };
        launchSchema.definitions = definitions;
        items.oneOf = [];
        items.defaultSnippets = [];
        this.debuggers.forEach(adapter => {
            const schemaAttributes = adapter.getSchemaAttributes(definitions);
            if (schemaAttributes && items.oneOf) {
                items.oneOf.push(...schemaAttributes);
            }
            const configurationSnippets = adapter.configurationSnippets;
            if (configurationSnippets && items.defaultSnippets) {
                items.defaultSnippets.push(...configurationSnippets);
            }
        });
        jsonRegistry.registerSchema(launchSchemaId, launchSchema);
    }
    registerDebugAdapterFactory(debugTypes, debugAdapterLauncher) {
        debugTypes.forEach(debugType => this.debugAdapterFactories.set(debugType, debugAdapterLauncher));
        this.debuggersAvailable.set(this.hasEnabledDebuggers());
        this._onDidRegisterDebugger.fire();
        return {
            dispose: () => {
                debugTypes.forEach(debugType => this.debugAdapterFactories.delete(debugType));
            }
        };
    }
    hasEnabledDebuggers() {
        for (const [type] of this.debugAdapterFactories) {
            const dbg = this.getDebugger(type);
            if (dbg && dbg.enabled) {
                return true;
            }
        }
        return false;
    }
    createDebugAdapter(session) {
        const factory = this.debugAdapterFactories.get(session.configuration.type);
        if (factory) {
            return factory.createDebugAdapter(session);
        }
        return undefined;
    }
    substituteVariables(debugType, folder, config) {
        const factory = this.debugAdapterFactories.get(debugType);
        if (factory) {
            return factory.substituteVariables(folder, config);
        }
        return Promise.resolve(config);
    }
    runInTerminal(debugType, args, sessionId) {
        const factory = this.debugAdapterFactories.get(debugType);
        if (factory) {
            return factory.runInTerminal(args, sessionId);
        }
        return Promise.resolve(void 0);
    }
    registerDebugAdapterDescriptorFactory(debugAdapterProvider) {
        this.adapterDescriptorFactories.push(debugAdapterProvider);
        return {
            dispose: () => {
                this.unregisterDebugAdapterDescriptorFactory(debugAdapterProvider);
            }
        };
    }
    unregisterDebugAdapterDescriptorFactory(debugAdapterProvider) {
        const ix = this.adapterDescriptorFactories.indexOf(debugAdapterProvider);
        if (ix >= 0) {
            this.adapterDescriptorFactories.splice(ix, 1);
        }
    }
    getDebugAdapterDescriptor(session) {
        const config = session.configuration;
        const providers = this.adapterDescriptorFactories.filter(p => p.type === config.type && p.createDebugAdapterDescriptor);
        if (providers.length === 1) {
            return providers[0].createDebugAdapterDescriptor(session);
        }
        else {
            // TODO@AW handle n > 1 case
        }
        return Promise.resolve(undefined);
    }
    getDebuggerLabel(type) {
        const dbgr = this.getDebugger(type);
        if (dbgr) {
            return dbgr.label;
        }
        return undefined;
    }
    get onDidRegisterDebugger() {
        return this._onDidRegisterDebugger.event;
    }
    get onDidDebuggersExtPointRead() {
        return this._onDidDebuggersExtPointRead.event;
    }
    canSetBreakpointsIn(model) {
        const languageId = model.getLanguageId();
        if (!languageId || languageId === 'jsonc' || languageId === 'log') {
            // do not allow breakpoints in our settings files and output
            return false;
        }
        if (this.configurationService.getValue('debug').allowBreakpointsEverywhere) {
            return true;
        }
        return this.breakpointContributions.some(breakpoints => breakpoints.language === languageId && breakpoints.enabled);
    }
    getDebugger(type) {
        return this.debuggers.find(dbg => strings.equalsIgnoreCase(dbg.type, type));
    }
    getEnabledDebugger(type) {
        const adapter = this.getDebugger(type);
        return adapter && adapter.enabled ? adapter : undefined;
    }
    someDebuggerInterestedInLanguage(languageId) {
        return !!this.debuggers
            .filter(d => d.enabled)
            .find(a => a.interestedInLanguage(languageId));
    }
    async guessDebugger(gettingConfigurations) {
        const activeTextEditorControl = this.editorService.activeTextEditorControl;
        let candidates = [];
        let languageLabel = null;
        let model = null;
        if (isCodeEditor(activeTextEditorControl)) {
            model = activeTextEditorControl.getModel();
            const language = model ? model.getLanguageId() : undefined;
            if (language) {
                languageLabel = this.languageService.getLanguageName(language);
            }
            const adapters = this.debuggers
                .filter(a => a.enabled)
                .filter(a => language && a.interestedInLanguage(language));
            if (adapters.length === 1) {
                return { debugger: adapters[0] };
            }
            if (adapters.length > 1) {
                candidates = adapters;
            }
        }
        // We want to get the debuggers that have configuration providers in the case we are fetching configurations
        // Or if a breakpoint can be set in the current file (good hint that an extension can handle it)
        if ((!languageLabel || gettingConfigurations || (model && this.canSetBreakpointsIn(model))) && candidates.length === 0) {
            await this.activateDebuggers('onDebugInitialConfigurations');
            candidates = this.debuggers
                .filter(a => a.enabled)
                .filter(dbg => dbg.hasInitialConfiguration() || dbg.hasDynamicConfigurationProviders() || dbg.hasConfigurationProvider());
        }
        if (candidates.length === 0 && languageLabel) {
            if (languageLabel.indexOf(' ') >= 0) {
                languageLabel = `'${languageLabel}'`;
            }
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Warning,
                message: nls.localize('CouldNotFindLanguage', "You don't have an extension for debugging {0}. Should we find a {0} extension in the Marketplace?", languageLabel),
                primaryButton: nls.localize({ key: 'findExtension', comment: ['&& denotes a mnemonic'] }, "&&Find {0} extension", languageLabel)
            });
            if (confirmed) {
                await this.commandService.executeCommand('debug.installAdditionalDebuggers', languageLabel);
            }
            return undefined;
        }
        this.initExtensionActivationsIfNeeded();
        candidates.sort((first, second) => first.label.localeCompare(second.label));
        candidates = candidates.filter(a => !a.isHiddenFromDropdown);
        const suggestedCandidates = [];
        const otherCandidates = [];
        candidates.forEach(d => {
            const descriptor = d.getMainExtensionDescriptor();
            if (descriptor.id && !!this.earlyActivatedExtensions?.has(descriptor.id)) {
                // Was activated early
                suggestedCandidates.push(d);
            }
            else if (this.usedDebugTypes.has(d.type)) {
                // Was used already
                suggestedCandidates.push(d);
            }
            else {
                otherCandidates.push(d);
            }
        });
        const picks = [];
        const dynamic = await this.delegate.configurationManager().getDynamicProviders();
        if (suggestedCandidates.length > 0) {
            picks.push({ type: 'separator', label: nls.localize('suggestedDebuggers', "Suggested") }, ...suggestedCandidates.map(c => ({ label: c.label, pick: () => ({ debugger: c }) })));
        }
        if (otherCandidates.length > 0) {
            if (picks.length > 0) {
                picks.push({ type: 'separator', label: '' });
            }
            picks.push(...otherCandidates.map(c => ({ label: c.label, pick: () => ({ debugger: c }) })));
        }
        if (dynamic.length) {
            if (picks.length) {
                picks.push({ type: 'separator', label: '' });
            }
            for (const d of dynamic) {
                picks.push({
                    label: nls.localize('moreOptionsForDebugType', "More {0} options...", d.label),
                    pick: async () => {
                        const cfg = await d.pick();
                        if (!cfg) {
                            return undefined;
                        }
                        return cfg && { debugger: this.getDebugger(d.type), withConfig: cfg };
                    },
                });
            }
        }
        picks.push({ type: 'separator', label: '' }, { label: languageLabel ? nls.localize('installLanguage', "Install an extension for {0}...", languageLabel) : nls.localize('installExt', "Install extension...") });
        const contributed = this.menuService.getMenuActions(MenuId.DebugCreateConfiguration, this.contextKeyService);
        for (const [, action] of contributed) {
            for (const item of action) {
                picks.push(item);
            }
        }
        const placeHolder = nls.localize('selectDebug', "Select debugger");
        return this.quickInputService.pick(picks, { activeItem: picks[0], placeHolder }).then(async (picked) => {
            if (picked && 'pick' in picked && typeof picked.pick === 'function') {
                return await picked.pick();
            }
            if (picked instanceof MenuItemAction) {
                picked.run();
                return;
            }
            if (picked) {
                this.commandService.executeCommand('debug.installAdditionalDebuggers', languageLabel);
            }
            return undefined;
        });
    }
    initExtensionActivationsIfNeeded() {
        if (!this.earlyActivatedExtensions) {
            this.earlyActivatedExtensions = new Set();
            const status = this.extensionService.getExtensionsStatus();
            for (const id in status) {
                if (!!status[id].activationTimes) {
                    this.earlyActivatedExtensions.add(id);
                }
            }
        }
    }
    async activateDebuggers(activationEvent, debugType) {
        this.initExtensionActivationsIfNeeded();
        const promises = [
            this.extensionService.activateByEvent(activationEvent),
            this.extensionService.activateByEvent('onDebug')
        ];
        if (debugType) {
            promises.push(this.extensionService.activateByEvent(`${activationEvent}:${debugType}`));
        }
        await Promise.all(promises);
    }
};
AdapterManager = __decorate([
    __param(1, IEditorService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, IInstantiationService),
    __param(5, ICommandService),
    __param(6, IExtensionService),
    __param(7, IContextKeyService),
    __param(8, ILanguageService),
    __param(9, IDialogService),
    __param(10, ILifecycleService),
    __param(11, ITaskService),
    __param(12, IMenuService)
], AdapterManager);
export { AdapterManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBZGFwdGVyTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnQWRhcHRlck1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFbkYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLElBQUksY0FBYyxFQUE2QixNQUFNLHFFQUFxRSxDQUFDO0FBQzlJLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxpQ0FBaUMsRUFBa00sK0JBQStCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNyVSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQztBQUVwRyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsRUFBRSxDQUE0QixjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQU90RixJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTtJQWtCN0MsWUFDa0IsUUFBaUMsRUFDbEMsYUFBOEMsRUFDdkMsb0JBQTRELEVBQy9ELGlCQUFzRCxFQUNuRCxvQkFBNEQsRUFDbEUsY0FBZ0QsRUFDOUMsZ0JBQW9ELEVBQ25ELGlCQUFzRCxFQUN4RCxlQUFrRCxFQUNwRCxhQUE4QyxFQUMzQyxnQkFBb0QsRUFDekQsWUFBMkMsRUFDM0MsV0FBMEM7UUFFeEQsS0FBSyxFQUFFLENBQUM7UUFkUyxhQUFRLEdBQVIsUUFBUSxDQUF5QjtRQUNqQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2xDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDakQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQzdCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDbEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN2QyxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDbkMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDeEMsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDMUIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUEzQmpELDBCQUFxQixHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBR3ZELDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDN0MsZ0NBQTJCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUMzRCw0QkFBdUIsR0FBa0IsRUFBRSxDQUFDO1FBQzVDLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDckMsZUFBVSxHQUFhLEVBQUUsQ0FBQztRQUsxQixtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFrQjFDLElBQUksQ0FBQywwQkFBMEIsR0FBRyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtZQUM5QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsMkJBQTJCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDaEYsSUFBSSxDQUFDLHdCQUF3QixHQUFHLGlDQUFpQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzdGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDNUQsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLEVBQUU7WUFDbkQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosNEVBQTRFO1FBQzVFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFdEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxZQUFZLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxHQUFHLEVBQUU7WUFDeEcsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDN0IsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLG1DQUEyQjthQUNuRCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMkRBQTJEO1FBRXZJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNsRCxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDM0IsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxVQUFVLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUM7d0JBQy9ELEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGtFQUFrRSxDQUFDLENBQUMsQ0FBQztvQkFDeEgsQ0FBQztvQkFFRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNuRCxJQUFJLFFBQVEsRUFBRSxDQUFDOzRCQUNkLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDL0MsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDOzRCQUNwRyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQzFCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1lBRUgsMENBQTBDO1lBQzFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzlCLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNwQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQzdFLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUVILEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUMvQixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEYsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7UUFFSCxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0MsSUFBSSxDQUFDLHVCQUF1QixHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLHdCQUF3QjtRQUMvQixtRkFBbUY7UUFDbkYsTUFBTSxLQUFLLEdBQWlCLFlBQVksQ0FBQyxVQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFNLENBQUM7UUFDOUUsTUFBTSxVQUFVLEdBQUcsc0JBQXNCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDMUQsTUFBTSxXQUFXLEdBQW1CO1lBQ25DLFFBQVEsRUFBRTtnQkFDVCxVQUFVLEVBQUU7b0JBQ1gsTUFBTSxFQUFFO3dCQUNQLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSwyRUFBMkUsQ0FBQzt3QkFDbkgsT0FBTyxFQUFFLFFBQVE7cUJBQ2pCO29CQUNELGFBQWEsRUFBRTt3QkFDZCxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsaUlBQWlJLENBQUM7d0JBQzNLLE9BQU8sRUFBRSxJQUFJO3FCQUNiO29CQUNELGVBQWUsRUFBRTt3QkFDaEIsS0FBSyxFQUFFLENBQUMsVUFBVSxFQUFFO2dDQUNuQixJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUM7NkJBQ2hCLENBQUM7d0JBQ0YsT0FBTyxFQUFFLEVBQUU7d0JBQ1gsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO3dCQUNuRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSwwQ0FBMEMsQ0FBQzt3QkFDM0YsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVO3FCQUN6QjtvQkFDRCxlQUFlLEVBQUU7d0JBQ2hCLEtBQUssRUFBRSxDQUFDLFVBQVUsRUFBRTtnQ0FDbkIsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDOzZCQUNoQixDQUFDO3dCQUNGLE9BQU8sRUFBRSxFQUFFO3dCQUNYLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQzt3QkFDbkQsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsdUNBQXVDLENBQUM7d0JBQ3hGLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVTtxQkFDekI7b0JBQ0QsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsd0JBQXdCLEVBQUUsK0JBQStCO29CQUN6RCxnQ0FBZ0MsRUFBRTt3QkFDakMsSUFBSSxFQUFFLFNBQVM7d0JBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsdUZBQXVGLENBQUM7d0JBQ3BKLE9BQU8sRUFBRSxJQUFJO3FCQUNiO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDO1FBQ0YsWUFBWSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDdkMsS0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDaEMsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDbEUsSUFBSSxnQkFBZ0IsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztZQUN2QyxDQUFDO1lBQ0QsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUM7WUFDNUQsSUFBSSxxQkFBcUIsSUFBSSxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3BELEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcscUJBQXFCLENBQUMsQ0FBQztZQUN0RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSCxZQUFZLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsMkJBQTJCLENBQUMsVUFBb0IsRUFBRSxvQkFBMEM7UUFDM0YsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUNqRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDO1FBRW5DLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDL0UsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2pELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN4QixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsT0FBc0I7UUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELG1CQUFtQixDQUFDLFNBQWlCLEVBQUUsTUFBb0MsRUFBRSxNQUFlO1FBQzNGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxhQUFhLENBQUMsU0FBaUIsRUFBRSxJQUFpRCxFQUFFLFNBQWlCO1FBQ3BHLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxxQ0FBcUMsQ0FBQyxvQkFBb0Q7UUFDekYsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzNELE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3BFLENBQUM7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVELHVDQUF1QyxDQUFDLG9CQUFvRDtRQUMzRixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDekUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUVELHlCQUF5QixDQUFDLE9BQXNCO1FBQy9DLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7UUFDckMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUN4SCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0QsQ0FBQzthQUFNLENBQUM7WUFDUCw0QkFBNEI7UUFDN0IsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsSUFBWTtRQUM1QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDbkIsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUM7SUFDMUMsQ0FBQztJQUVELElBQUksMEJBQTBCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQztJQUMvQyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsS0FBaUI7UUFDcEMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLElBQUksVUFBVSxLQUFLLE9BQU8sSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDbkUsNERBQTREO1lBQzVELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBc0IsT0FBTyxDQUFDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNqRyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxLQUFLLFVBQVUsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckgsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFZO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxJQUFZO1FBQzlCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsT0FBTyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDekQsQ0FBQztJQUVELGdDQUFnQyxDQUFDLFVBQWtCO1FBQ2xELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTO2FBQ3JCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDdEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMscUJBQThCO1FBQ2pELE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztRQUMzRSxJQUFJLFVBQVUsR0FBZSxFQUFFLENBQUM7UUFDaEMsSUFBSSxhQUFhLEdBQWtCLElBQUksQ0FBQztRQUN4QyxJQUFJLEtBQUssR0FBd0IsSUFBSSxDQUFDO1FBQ3RDLElBQUksWUFBWSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztZQUMzQyxLQUFLLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUMzRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoRSxDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVM7aUJBQzdCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7aUJBQ3RCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUNELElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsVUFBVSxHQUFHLFFBQVEsQ0FBQztZQUN2QixDQUFDO1FBQ0YsQ0FBQztRQUVELDRHQUE0RztRQUM1RyxnR0FBZ0c7UUFDaEcsSUFBSSxDQUFDLENBQUMsYUFBYSxJQUFJLHFCQUFxQixJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4SCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBRTdELFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUztpQkFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztpQkFDdEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksR0FBRyxDQUFDLGdDQUFnQyxFQUFFLElBQUksR0FBRyxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUM1SCxDQUFDO1FBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUM5QyxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLGFBQWEsR0FBRyxJQUFJLGFBQWEsR0FBRyxDQUFDO1lBQ3RDLENBQUM7WUFDRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDdEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN0QixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxtR0FBbUcsRUFBRSxhQUFhLENBQUM7Z0JBQ2pLLGFBQWEsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsYUFBYSxDQUFDO2FBQ2hJLENBQUMsQ0FBQztZQUNILElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxrQ0FBa0MsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM3RixDQUFDO1lBQ0QsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO1FBRXhDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1RSxVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFN0QsTUFBTSxtQkFBbUIsR0FBZSxFQUFFLENBQUM7UUFDM0MsTUFBTSxlQUFlLEdBQWUsRUFBRSxDQUFDO1FBQ3ZDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDbEQsSUFBSSxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMxRSxzQkFBc0I7Z0JBQ3RCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLG1CQUFtQjtnQkFDbkIsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sS0FBSyxHQUFpSSxFQUFFLENBQUM7UUFDL0ksTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUNqRixJQUFJLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxLQUFLLENBQUMsSUFBSSxDQUNULEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsRUFBRSxFQUM3RSxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsQ0FBQztRQUVELElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLENBQUM7WUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUYsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5QyxDQUFDO1lBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDekIsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDVixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO29CQUM5RSxJQUFJLEVBQUUsS0FBSyxJQUEyQyxFQUFFO3dCQUN2RCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDM0IsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDOzRCQUFDLE9BQU8sU0FBUyxDQUFDO3dCQUFDLENBQUM7d0JBQy9CLE9BQU8sR0FBRyxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQztvQkFDeEUsQ0FBQztpQkFDRCxDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUVELEtBQUssQ0FBQyxJQUFJLENBQ1QsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFDaEMsRUFBRSxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGlDQUFpQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLENBQ2pLLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDN0csS0FBSyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUMzQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNuRSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQTBELEtBQUssRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLE1BQU0sRUFBQyxFQUFFO1lBQzdKLElBQUksTUFBTSxJQUFJLE1BQU0sSUFBSSxNQUFNLElBQUksT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNyRSxPQUFPLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzVCLENBQUM7WUFFRCxJQUFJLE1BQU0sWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNiLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxrQ0FBa0MsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN2RixDQUFDO1lBRUQsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sZ0NBQWdDO1FBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMzRCxLQUFLLE1BQU0sRUFBRSxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ2xDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsZUFBdUIsRUFBRSxTQUFrQjtRQUNsRSxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztRQUV4QyxNQUFNLFFBQVEsR0FBbUI7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUM7WUFDdEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7U0FDaEQsQ0FBQztRQUNGLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsR0FBRyxlQUFlLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0IsQ0FBQztDQUNELENBQUE7QUF2Y1ksY0FBYztJQW9CeEIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsWUFBWSxDQUFBO0dBL0JGLGNBQWMsQ0F1YzFCIn0=
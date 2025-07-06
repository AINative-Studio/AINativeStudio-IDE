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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBZGFwdGVyTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdBZGFwdGVyTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVuRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsSUFBSSxjQUFjLEVBQTZC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
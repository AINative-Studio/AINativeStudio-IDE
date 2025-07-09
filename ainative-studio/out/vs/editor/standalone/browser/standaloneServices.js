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
import './standaloneCodeEditorService.js';
import './standaloneLayoutService.js';
import '../../../platform/undoRedo/common/undoRedoService.js';
import '../../common/services/languageFeatureDebounce.js';
import '../../common/services/semanticTokensStylingService.js';
import '../../common/services/languageFeaturesService.js';
import '../../browser/services/hoverService/hoverService.js';
import * as strings from '../../../base/common/strings.js';
import * as dom from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { Emitter, Event, ValueWithChangeEvent } from '../../../base/common/event.js';
import { KeyCodeChord, decodeKeybinding } from '../../../base/common/keybindings.js';
import { ImmortalReference, toDisposable, DisposableStore, Disposable, combinedDisposable } from '../../../base/common/lifecycle.js';
import { OS, isLinux, isMacintosh } from '../../../base/common/platform.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { IBulkEditService, ResourceEdit, ResourceTextEdit } from '../../browser/services/bulkEditService.js';
import { isDiffEditorConfigurationKey, isEditorConfigurationKey } from '../../common/config/editorConfigurationSchema.js';
import { EditOperation } from '../../common/core/editOperation.js';
import { Position as Pos } from '../../common/core/position.js';
import { Range } from '../../common/core/range.js';
import { IModelService } from '../../common/services/model.js';
import { ITextModelService } from '../../common/services/resolverService.js';
import { ITextResourceConfigurationService, ITextResourcePropertiesService } from '../../common/services/textResourceConfiguration.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { Configuration, ConfigurationModel, ConfigurationChangeEvent } from '../../../platform/configuration/common/configurationModels.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { createDecorator, IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { AbstractKeybindingService } from '../../../platform/keybinding/common/abstractKeybindingService.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { KeybindingResolver } from '../../../platform/keybinding/common/keybindingResolver.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { ResolvedKeybindingItem } from '../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { INotificationService, NoOpNotification, NotificationsFilter } from '../../../platform/notification/common/notification.js';
import { IEditorProgressService, IProgressService } from '../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService, WorkspaceFolder, STANDALONE_EDITOR_WORKSPACE_ID } from '../../../platform/workspace/common/workspace.js';
import { ILayoutService } from '../../../platform/layout/browser/layoutService.js';
import { StandaloneServicesNLS } from '../../common/standaloneStrings.js';
import { basename } from '../../../base/common/resources.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { ConsoleLogger, ILogService } from '../../../platform/log/common/log.js';
import { IWorkspaceTrustManagementService } from '../../../platform/workspace/common/workspaceTrust.js';
import { IContextMenuService, IContextViewService } from '../../../platform/contextview/browser/contextView.js';
import { ContextViewService } from '../../../platform/contextview/browser/contextViewService.js';
import { LanguageService } from '../../common/services/languageService.js';
import { ContextMenuService } from '../../../platform/contextview/browser/contextMenuService.js';
import { getSingletonServiceDescriptors, registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { OpenerService } from '../../browser/services/openerService.js';
import { IEditorWorkerService } from '../../common/services/editorWorker.js';
import { EditorWorkerService } from '../../browser/services/editorWorkerService.js';
import { ILanguageService } from '../../common/languages/language.js';
import { MarkerDecorationsService } from '../../common/services/markerDecorationsService.js';
import { IMarkerDecorationsService } from '../../common/services/markerDecorations.js';
import { ModelService } from '../../common/services/modelService.js';
import { StandaloneQuickInputService } from './quickInput/standaloneQuickInputService.js';
import { StandaloneThemeService } from './standaloneThemeService.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { AccessibilityService } from '../../../platform/accessibility/browser/accessibilityService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { IMenuService } from '../../../platform/actions/common/actions.js';
import { MenuService } from '../../../platform/actions/common/menuService.js';
import { BrowserClipboardService } from '../../../platform/clipboard/browser/clipboardService.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyService } from '../../../platform/contextkey/browser/contextKeyService.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IListService, ListService } from '../../../platform/list/browser/listService.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../platform/markers/common/markerService.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { IStorageService, InMemoryStorageService } from '../../../platform/storage/common/storage.js';
import { DefaultConfiguration } from '../../../platform/configuration/common/configurations.js';
import { IAccessibilitySignalService } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { LogService } from '../../../platform/log/common/logService.js';
import { getEditorFeatures } from '../../common/editorFeatures.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { mainWindow } from '../../../base/browser/window.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ITreeSitterParserService } from '../../common/services/treeSitterParserService.js';
import { StandaloneTreeSitterParserService } from './standaloneTreeSitterService.js';
class SimpleModel {
    constructor(model) {
        this.disposed = false;
        this.model = model;
        this._onWillDispose = new Emitter();
    }
    get onWillDispose() {
        return this._onWillDispose.event;
    }
    resolve() {
        return Promise.resolve();
    }
    get textEditorModel() {
        return this.model;
    }
    createSnapshot() {
        return this.model.createSnapshot();
    }
    isReadonly() {
        return false;
    }
    dispose() {
        this.disposed = true;
        this._onWillDispose.fire();
    }
    isDisposed() {
        return this.disposed;
    }
    isResolved() {
        return true;
    }
    getLanguageId() {
        return this.model.getLanguageId();
    }
}
let StandaloneTextModelService = class StandaloneTextModelService {
    constructor(modelService) {
        this.modelService = modelService;
    }
    createModelReference(resource) {
        const model = this.modelService.getModel(resource);
        if (!model) {
            return Promise.reject(new Error(`Model not found`));
        }
        return Promise.resolve(new ImmortalReference(new SimpleModel(model)));
    }
    registerTextModelContentProvider(scheme, provider) {
        return {
            dispose: function () { }
        };
    }
    canHandleResource(resource) {
        return false;
    }
};
StandaloneTextModelService = __decorate([
    __param(0, IModelService)
], StandaloneTextModelService);
class StandaloneEditorProgressService {
    static { this.NULL_PROGRESS_RUNNER = {
        done: () => { },
        total: () => { },
        worked: () => { }
    }; }
    show() {
        return StandaloneEditorProgressService.NULL_PROGRESS_RUNNER;
    }
    async showWhile(promise, delay) {
        await promise;
    }
}
class StandaloneProgressService {
    withProgress(_options, task, onDidCancel) {
        return task({
            report: () => { },
        });
    }
}
class StandaloneEnvironmentService {
    constructor() {
        this.stateResource = URI.from({ scheme: 'monaco', authority: 'stateResource' });
        this.userRoamingDataHome = URI.from({ scheme: 'monaco', authority: 'userRoamingDataHome' });
        this.keyboardLayoutResource = URI.from({ scheme: 'monaco', authority: 'keyboardLayoutResource' });
        this.argvResource = URI.from({ scheme: 'monaco', authority: 'argvResource' });
        this.untitledWorkspacesHome = URI.from({ scheme: 'monaco', authority: 'untitledWorkspacesHome' });
        this.workspaceStorageHome = URI.from({ scheme: 'monaco', authority: 'workspaceStorageHome' });
        this.localHistoryHome = URI.from({ scheme: 'monaco', authority: 'localHistoryHome' });
        this.cacheHome = URI.from({ scheme: 'monaco', authority: 'cacheHome' });
        this.userDataSyncHome = URI.from({ scheme: 'monaco', authority: 'userDataSyncHome' });
        this.sync = undefined;
        this.continueOn = undefined;
        this.editSessionId = undefined;
        this.debugExtensionHost = { port: null, break: false };
        this.isExtensionDevelopment = false;
        this.disableExtensions = false;
        this.enableExtensions = undefined;
        this.extensionDevelopmentLocationURI = undefined;
        this.extensionDevelopmentKind = undefined;
        this.extensionTestsLocationURI = undefined;
        this.logsHome = URI.from({ scheme: 'monaco', authority: 'logsHome' });
        this.logLevel = undefined;
        this.extensionLogLevel = undefined;
        this.verbose = false;
        this.isBuilt = false;
        this.disableTelemetry = false;
        this.serviceMachineIdResource = URI.from({ scheme: 'monaco', authority: 'serviceMachineIdResource' });
        this.policyFile = undefined;
    }
}
class StandaloneDialogService {
    constructor() {
        this.onWillShowDialog = Event.None;
        this.onDidShowDialog = Event.None;
    }
    async confirm(confirmation) {
        const confirmed = this.doConfirm(confirmation.message, confirmation.detail);
        return {
            confirmed,
            checkboxChecked: false // unsupported
        };
    }
    doConfirm(message, detail) {
        let messageText = message;
        if (detail) {
            messageText = messageText + '\n\n' + detail;
        }
        return mainWindow.confirm(messageText);
    }
    async prompt(prompt) {
        let result = undefined;
        const confirmed = this.doConfirm(prompt.message, prompt.detail);
        if (confirmed) {
            const promptButtons = [...(prompt.buttons ?? [])];
            if (prompt.cancelButton && typeof prompt.cancelButton !== 'string' && typeof prompt.cancelButton !== 'boolean') {
                promptButtons.push(prompt.cancelButton);
            }
            result = await promptButtons[0]?.run({ checkboxChecked: false });
        }
        return { result };
    }
    async info(message, detail) {
        await this.prompt({ type: Severity.Info, message, detail });
    }
    async warn(message, detail) {
        await this.prompt({ type: Severity.Warning, message, detail });
    }
    async error(message, detail) {
        await this.prompt({ type: Severity.Error, message, detail });
    }
    input() {
        return Promise.resolve({ confirmed: false }); // unsupported
    }
    about() {
        return Promise.resolve(undefined);
    }
}
export class StandaloneNotificationService {
    constructor() {
        this.onDidAddNotification = Event.None;
        this.onDidRemoveNotification = Event.None;
        this.onDidChangeFilter = Event.None;
    }
    static { this.NO_OP = new NoOpNotification(); }
    info(message) {
        return this.notify({ severity: Severity.Info, message });
    }
    warn(message) {
        return this.notify({ severity: Severity.Warning, message });
    }
    error(error) {
        return this.notify({ severity: Severity.Error, message: error });
    }
    notify(notification) {
        switch (notification.severity) {
            case Severity.Error:
                console.error(notification.message);
                break;
            case Severity.Warning:
                console.warn(notification.message);
                break;
            default:
                console.log(notification.message);
                break;
        }
        return StandaloneNotificationService.NO_OP;
    }
    prompt(severity, message, choices, options) {
        return StandaloneNotificationService.NO_OP;
    }
    status(message, options) {
        return Disposable.None;
    }
    setFilter(filter) { }
    getFilter(source) {
        return NotificationsFilter.OFF;
    }
    getFilters() {
        return [];
    }
    removeFilter(sourceId) { }
}
let StandaloneCommandService = class StandaloneCommandService {
    constructor(instantiationService) {
        this._onWillExecuteCommand = new Emitter();
        this._onDidExecuteCommand = new Emitter();
        this.onWillExecuteCommand = this._onWillExecuteCommand.event;
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
        this._instantiationService = instantiationService;
    }
    executeCommand(id, ...args) {
        const command = CommandsRegistry.getCommand(id);
        if (!command) {
            return Promise.reject(new Error(`command '${id}' not found`));
        }
        try {
            this._onWillExecuteCommand.fire({ commandId: id, args });
            const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [command.handler, ...args]);
            this._onDidExecuteCommand.fire({ commandId: id, args });
            return Promise.resolve(result);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
};
StandaloneCommandService = __decorate([
    __param(0, IInstantiationService)
], StandaloneCommandService);
export { StandaloneCommandService };
let StandaloneKeybindingService = class StandaloneKeybindingService extends AbstractKeybindingService {
    constructor(contextKeyService, commandService, telemetryService, notificationService, logService, codeEditorService) {
        super(contextKeyService, commandService, telemetryService, notificationService, logService);
        this._cachedResolver = null;
        this._dynamicKeybindings = [];
        this._domNodeListeners = [];
        const addContainer = (domNode) => {
            const disposables = new DisposableStore();
            // for standard keybindings
            disposables.add(dom.addDisposableListener(domNode, dom.EventType.KEY_DOWN, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                const shouldPreventDefault = this._dispatch(keyEvent, keyEvent.target);
                if (shouldPreventDefault) {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                }
            }));
            // for single modifier chord keybindings (e.g. shift shift)
            disposables.add(dom.addDisposableListener(domNode, dom.EventType.KEY_UP, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                const shouldPreventDefault = this._singleModifierDispatch(keyEvent, keyEvent.target);
                if (shouldPreventDefault) {
                    keyEvent.preventDefault();
                }
            }));
            this._domNodeListeners.push(new DomNodeListeners(domNode, disposables));
        };
        const removeContainer = (domNode) => {
            for (let i = 0; i < this._domNodeListeners.length; i++) {
                const domNodeListeners = this._domNodeListeners[i];
                if (domNodeListeners.domNode === domNode) {
                    this._domNodeListeners.splice(i, 1);
                    domNodeListeners.dispose();
                }
            }
        };
        const addCodeEditor = (codeEditor) => {
            if (codeEditor.getOption(63 /* EditorOption.inDiffEditor */)) {
                return;
            }
            addContainer(codeEditor.getContainerDomNode());
        };
        const removeCodeEditor = (codeEditor) => {
            if (codeEditor.getOption(63 /* EditorOption.inDiffEditor */)) {
                return;
            }
            removeContainer(codeEditor.getContainerDomNode());
        };
        this._register(codeEditorService.onCodeEditorAdd(addCodeEditor));
        this._register(codeEditorService.onCodeEditorRemove(removeCodeEditor));
        codeEditorService.listCodeEditors().forEach(addCodeEditor);
        const addDiffEditor = (diffEditor) => {
            addContainer(diffEditor.getContainerDomNode());
        };
        const removeDiffEditor = (diffEditor) => {
            removeContainer(diffEditor.getContainerDomNode());
        };
        this._register(codeEditorService.onDiffEditorAdd(addDiffEditor));
        this._register(codeEditorService.onDiffEditorRemove(removeDiffEditor));
        codeEditorService.listDiffEditors().forEach(addDiffEditor);
    }
    addDynamicKeybinding(command, keybinding, handler, when) {
        return combinedDisposable(CommandsRegistry.registerCommand(command, handler), this.addDynamicKeybindings([{
                keybinding,
                command,
                when
            }]));
    }
    addDynamicKeybindings(rules) {
        const entries = rules.map((rule) => {
            const keybinding = decodeKeybinding(rule.keybinding, OS);
            return {
                keybinding,
                command: rule.command ?? null,
                commandArgs: rule.commandArgs,
                when: rule.when,
                weight1: 1000,
                weight2: 0,
                extensionId: null,
                isBuiltinExtension: false
            };
        });
        this._dynamicKeybindings = this._dynamicKeybindings.concat(entries);
        this.updateResolver();
        return toDisposable(() => {
            // Search the first entry and remove them all since they will be contiguous
            for (let i = 0; i < this._dynamicKeybindings.length; i++) {
                if (this._dynamicKeybindings[i] === entries[0]) {
                    this._dynamicKeybindings.splice(i, entries.length);
                    this.updateResolver();
                    return;
                }
            }
        });
    }
    updateResolver() {
        this._cachedResolver = null;
        this._onDidUpdateKeybindings.fire();
    }
    _getResolver() {
        if (!this._cachedResolver) {
            const defaults = this._toNormalizedKeybindingItems(KeybindingsRegistry.getDefaultKeybindings(), true);
            const overrides = this._toNormalizedKeybindingItems(this._dynamicKeybindings, false);
            this._cachedResolver = new KeybindingResolver(defaults, overrides, (str) => this._log(str));
        }
        return this._cachedResolver;
    }
    _documentHasFocus() {
        return mainWindow.document.hasFocus();
    }
    _toNormalizedKeybindingItems(items, isDefault) {
        const result = [];
        let resultLen = 0;
        for (const item of items) {
            const when = item.when || undefined;
            const keybinding = item.keybinding;
            if (!keybinding) {
                // This might be a removal keybinding item in user settings => accept it
                result[resultLen++] = new ResolvedKeybindingItem(undefined, item.command, item.commandArgs, when, isDefault, null, false);
            }
            else {
                const resolvedKeybindings = USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
                for (const resolvedKeybinding of resolvedKeybindings) {
                    result[resultLen++] = new ResolvedKeybindingItem(resolvedKeybinding, item.command, item.commandArgs, when, isDefault, null, false);
                }
            }
        }
        return result;
    }
    resolveKeybinding(keybinding) {
        return USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
    }
    resolveKeyboardEvent(keyboardEvent) {
        const chord = new KeyCodeChord(keyboardEvent.ctrlKey, keyboardEvent.shiftKey, keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        return new USLayoutResolvedKeybinding([chord], OS);
    }
    resolveUserBinding(userBinding) {
        return [];
    }
    _dumpDebugInfo() {
        return '';
    }
    _dumpDebugInfoJSON() {
        return '';
    }
    registerSchemaContribution(contribution) {
        // noop
    }
    /**
     * not yet supported
     */
    enableKeybindingHoldMode(commandId) {
        return undefined;
    }
};
StandaloneKeybindingService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ICommandService),
    __param(2, ITelemetryService),
    __param(3, INotificationService),
    __param(4, ILogService),
    __param(5, ICodeEditorService)
], StandaloneKeybindingService);
export { StandaloneKeybindingService };
class DomNodeListeners extends Disposable {
    constructor(domNode, disposables) {
        super();
        this.domNode = domNode;
        this._register(disposables);
    }
}
function isConfigurationOverrides(thing) {
    return thing
        && typeof thing === 'object'
        && (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string')
        && (!thing.resource || thing.resource instanceof URI);
}
let StandaloneConfigurationService = class StandaloneConfigurationService {
    constructor(logService) {
        this.logService = logService;
        this._onDidChangeConfiguration = new Emitter();
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        const defaultConfiguration = new DefaultConfiguration(logService);
        this._configuration = new Configuration(defaultConfiguration.reload(), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), logService);
        defaultConfiguration.dispose();
    }
    getValue(arg1, arg2) {
        const section = typeof arg1 === 'string' ? arg1 : undefined;
        const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : {};
        return this._configuration.getValue(section, overrides, undefined);
    }
    updateValues(values) {
        const previous = { data: this._configuration.toData() };
        const changedKeys = [];
        for (const entry of values) {
            const [key, value] = entry;
            if (this.getValue(key) === value) {
                continue;
            }
            this._configuration.updateValue(key, value);
            changedKeys.push(key);
        }
        if (changedKeys.length > 0) {
            const configurationChangeEvent = new ConfigurationChangeEvent({ keys: changedKeys, overrides: [] }, previous, this._configuration, undefined, this.logService);
            configurationChangeEvent.source = 8 /* ConfigurationTarget.MEMORY */;
            this._onDidChangeConfiguration.fire(configurationChangeEvent);
        }
        return Promise.resolve();
    }
    updateValue(key, value, arg3, arg4) {
        return this.updateValues([[key, value]]);
    }
    inspect(key, options = {}) {
        return this._configuration.inspect(key, options, undefined);
    }
    keys() {
        return this._configuration.keys(undefined);
    }
    reloadConfiguration() {
        return Promise.resolve(undefined);
    }
    getConfigurationData() {
        const emptyModel = {
            contents: {},
            keys: [],
            overrides: []
        };
        return {
            defaults: emptyModel,
            policy: emptyModel,
            application: emptyModel,
            userLocal: emptyModel,
            userRemote: emptyModel,
            workspace: emptyModel,
            folders: []
        };
    }
};
StandaloneConfigurationService = __decorate([
    __param(0, ILogService)
], StandaloneConfigurationService);
export { StandaloneConfigurationService };
let StandaloneResourceConfigurationService = class StandaloneResourceConfigurationService {
    constructor(configurationService, modelService, languageService) {
        this.configurationService = configurationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this._onDidChangeConfiguration = new Emitter();
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this.configurationService.onDidChangeConfiguration((e) => {
            this._onDidChangeConfiguration.fire({ affectedKeys: e.affectedKeys, affectsConfiguration: (resource, configuration) => e.affectsConfiguration(configuration) });
        });
    }
    getValue(resource, arg2, arg3) {
        const position = Pos.isIPosition(arg2) ? arg2 : null;
        const section = position ? (typeof arg3 === 'string' ? arg3 : undefined) : (typeof arg2 === 'string' ? arg2 : undefined);
        const language = resource ? this.getLanguage(resource, position) : undefined;
        if (typeof section === 'undefined') {
            return this.configurationService.getValue({
                resource,
                overrideIdentifier: language
            });
        }
        return this.configurationService.getValue(section, {
            resource,
            overrideIdentifier: language
        });
    }
    inspect(resource, position, section) {
        const language = resource ? this.getLanguage(resource, position) : undefined;
        return this.configurationService.inspect(section, { resource, overrideIdentifier: language });
    }
    getLanguage(resource, position) {
        const model = this.modelService.getModel(resource);
        if (model) {
            return position ? model.getLanguageIdAtPosition(position.lineNumber, position.column) : model.getLanguageId();
        }
        return this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
    }
    updateValue(resource, key, value, configurationTarget) {
        return this.configurationService.updateValue(key, value, { resource }, configurationTarget);
    }
};
StandaloneResourceConfigurationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], StandaloneResourceConfigurationService);
let StandaloneResourcePropertiesService = class StandaloneResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', { overrideIdentifier: language, resource });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return (isLinux || isMacintosh) ? '\n' : '\r\n';
    }
};
StandaloneResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], StandaloneResourcePropertiesService);
class StandaloneTelemetryService {
    constructor() {
        this.telemetryLevel = 0 /* TelemetryLevel.NONE */;
        this.sessionId = 'someValue.sessionId';
        this.machineId = 'someValue.machineId';
        this.sqmId = 'someValue.sqmId';
        this.devDeviceId = 'someValue.devDeviceId';
        this.firstSessionDate = 'someValue.firstSessionDate';
        this.sendErrorTelemetry = false;
    }
    setEnabled() { }
    setExperimentProperty() { }
    publicLog() { }
    publicLog2() { }
    publicLogError() { }
    publicLogError2() { }
}
class StandaloneWorkspaceContextService {
    static { this.SCHEME = 'inmemory'; }
    constructor() {
        this._onDidChangeWorkspaceName = new Emitter();
        this.onDidChangeWorkspaceName = this._onDidChangeWorkspaceName.event;
        this._onWillChangeWorkspaceFolders = new Emitter();
        this.onWillChangeWorkspaceFolders = this._onWillChangeWorkspaceFolders.event;
        this._onDidChangeWorkspaceFolders = new Emitter();
        this.onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFolders.event;
        this._onDidChangeWorkbenchState = new Emitter();
        this.onDidChangeWorkbenchState = this._onDidChangeWorkbenchState.event;
        const resource = URI.from({ scheme: StandaloneWorkspaceContextService.SCHEME, authority: 'model', path: '/' });
        this.workspace = { id: STANDALONE_EDITOR_WORKSPACE_ID, folders: [new WorkspaceFolder({ uri: resource, name: '', index: 0 })] };
    }
    getCompleteWorkspace() {
        return Promise.resolve(this.getWorkspace());
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkbenchState() {
        if (this.workspace) {
            if (this.workspace.configuration) {
                return 3 /* WorkbenchState.WORKSPACE */;
            }
            return 2 /* WorkbenchState.FOLDER */;
        }
        return 1 /* WorkbenchState.EMPTY */;
    }
    getWorkspaceFolder(resource) {
        return resource && resource.scheme === StandaloneWorkspaceContextService.SCHEME ? this.workspace.folders[0] : null;
    }
    isInsideWorkspace(resource) {
        return resource && resource.scheme === StandaloneWorkspaceContextService.SCHEME;
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        return true;
    }
}
export function updateConfigurationService(configurationService, source, isDiffEditor) {
    if (!source) {
        return;
    }
    if (!(configurationService instanceof StandaloneConfigurationService)) {
        return;
    }
    const toUpdate = [];
    Object.keys(source).forEach((key) => {
        if (isEditorConfigurationKey(key)) {
            toUpdate.push([`editor.${key}`, source[key]]);
        }
        if (isDiffEditor && isDiffEditorConfigurationKey(key)) {
            toUpdate.push([`diffEditor.${key}`, source[key]]);
        }
    });
    if (toUpdate.length > 0) {
        configurationService.updateValues(toUpdate);
    }
}
let StandaloneBulkEditService = class StandaloneBulkEditService {
    constructor(_modelService) {
        this._modelService = _modelService;
        //
    }
    hasPreviewHandler() {
        return false;
    }
    setPreviewHandler() {
        return Disposable.None;
    }
    async apply(editsIn, _options) {
        const edits = Array.isArray(editsIn) ? editsIn : ResourceEdit.convert(editsIn);
        const textEdits = new Map();
        for (const edit of edits) {
            if (!(edit instanceof ResourceTextEdit)) {
                throw new Error('bad edit - only text edits are supported');
            }
            const model = this._modelService.getModel(edit.resource);
            if (!model) {
                throw new Error('bad edit - model not found');
            }
            if (typeof edit.versionId === 'number' && model.getVersionId() !== edit.versionId) {
                throw new Error('bad state - model changed in the meantime');
            }
            let array = textEdits.get(model);
            if (!array) {
                array = [];
                textEdits.set(model, array);
            }
            array.push(EditOperation.replaceMove(Range.lift(edit.textEdit.range), edit.textEdit.text));
        }
        let totalEdits = 0;
        let totalFiles = 0;
        for (const [model, edits] of textEdits) {
            model.pushStackElement();
            model.pushEditOperations([], edits, () => []);
            model.pushStackElement();
            totalFiles += 1;
            totalEdits += edits.length;
        }
        return {
            ariaSummary: strings.format(StandaloneServicesNLS.bulkEditServiceSummary, totalEdits, totalFiles),
            isApplied: totalEdits > 0
        };
    }
};
StandaloneBulkEditService = __decorate([
    __param(0, IModelService)
], StandaloneBulkEditService);
class StandaloneUriLabelService {
    constructor() {
        this.onDidChangeFormatters = Event.None;
    }
    getUriLabel(resource, options) {
        if (resource.scheme === 'file') {
            return resource.fsPath;
        }
        return resource.path;
    }
    getUriBasenameLabel(resource) {
        return basename(resource);
    }
    getWorkspaceLabel(workspace, options) {
        return '';
    }
    getSeparator(scheme, authority) {
        return '/';
    }
    registerFormatter(formatter) {
        throw new Error('Not implemented');
    }
    registerCachedFormatter(formatter) {
        return this.registerFormatter(formatter);
    }
    getHostLabel() {
        return '';
    }
    getHostTooltip() {
        return undefined;
    }
}
let StandaloneContextViewService = class StandaloneContextViewService extends ContextViewService {
    constructor(layoutService, _codeEditorService) {
        super(layoutService);
        this._codeEditorService = _codeEditorService;
    }
    showContextView(delegate, container, shadowRoot) {
        if (!container) {
            const codeEditor = this._codeEditorService.getFocusedCodeEditor() || this._codeEditorService.getActiveCodeEditor();
            if (codeEditor) {
                container = codeEditor.getContainerDomNode();
            }
        }
        return super.showContextView(delegate, container, shadowRoot);
    }
};
StandaloneContextViewService = __decorate([
    __param(0, ILayoutService),
    __param(1, ICodeEditorService)
], StandaloneContextViewService);
class StandaloneWorkspaceTrustManagementService {
    constructor() {
        this._neverEmitter = new Emitter();
        this.onDidChangeTrust = this._neverEmitter.event;
        this.onDidChangeTrustedFolders = this._neverEmitter.event;
        this.workspaceResolved = Promise.resolve();
        this.workspaceTrustInitialized = Promise.resolve();
        this.acceptsOutOfWorkspaceFiles = true;
    }
    isWorkspaceTrusted() {
        return true;
    }
    isWorkspaceTrustForced() {
        return false;
    }
    canSetParentFolderTrust() {
        return false;
    }
    async setParentFolderTrust(trusted) {
        // noop
    }
    canSetWorkspaceTrust() {
        return false;
    }
    async setWorkspaceTrust(trusted) {
        // noop
    }
    getUriTrustInfo(uri) {
        throw new Error('Method not supported.');
    }
    async setUrisTrust(uri, trusted) {
        // noop
    }
    getTrustedUris() {
        return [];
    }
    async setTrustedUris(uris) {
        // noop
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        throw new Error('Method not supported.');
    }
}
class StandaloneLanguageService extends LanguageService {
    constructor() {
        super();
    }
}
class StandaloneLogService extends LogService {
    constructor() {
        super(new ConsoleLogger());
    }
}
let StandaloneContextMenuService = class StandaloneContextMenuService extends ContextMenuService {
    constructor(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService) {
        super(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService);
        this.configure({ blockMouse: false }); // we do not want that in the standalone editor
    }
};
StandaloneContextMenuService = __decorate([
    __param(0, ITelemetryService),
    __param(1, INotificationService),
    __param(2, IContextViewService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], StandaloneContextMenuService);
const standaloneEditorWorkerDescriptor = {
    esmModuleLocation: undefined,
    label: 'editorWorkerService'
};
let StandaloneEditorWorkerService = class StandaloneEditorWorkerService extends EditorWorkerService {
    constructor(modelService, configurationService, logService, languageConfigurationService, languageFeaturesService) {
        super(standaloneEditorWorkerDescriptor, modelService, configurationService, logService, languageConfigurationService, languageFeaturesService);
    }
};
StandaloneEditorWorkerService = __decorate([
    __param(0, IModelService),
    __param(1, ITextResourceConfigurationService),
    __param(2, ILogService),
    __param(3, ILanguageConfigurationService),
    __param(4, ILanguageFeaturesService)
], StandaloneEditorWorkerService);
class StandaloneAccessbilitySignalService {
    async playSignal(cue, options) {
    }
    async playSignals(cues) {
    }
    getEnabledState(signal, userGesture, modality) {
        return ValueWithChangeEvent.const(false);
    }
    getDelayMs(signal, modality) {
        return 0;
    }
    isSoundEnabled(cue) {
        return false;
    }
    isAnnouncementEnabled(cue) {
        return false;
    }
    onSoundEnabledChanged(cue) {
        return Event.None;
    }
    async playSound(cue, allowManyInParallel) {
    }
    playSignalLoop(cue) {
        return toDisposable(() => { });
    }
}
registerSingleton(ILogService, StandaloneLogService, 0 /* InstantiationType.Eager */);
registerSingleton(IConfigurationService, StandaloneConfigurationService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextResourceConfigurationService, StandaloneResourceConfigurationService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextResourcePropertiesService, StandaloneResourcePropertiesService, 0 /* InstantiationType.Eager */);
registerSingleton(IWorkspaceContextService, StandaloneWorkspaceContextService, 0 /* InstantiationType.Eager */);
registerSingleton(ILabelService, StandaloneUriLabelService, 0 /* InstantiationType.Eager */);
registerSingleton(ITelemetryService, StandaloneTelemetryService, 0 /* InstantiationType.Eager */);
registerSingleton(IDialogService, StandaloneDialogService, 0 /* InstantiationType.Eager */);
registerSingleton(IEnvironmentService, StandaloneEnvironmentService, 0 /* InstantiationType.Eager */);
registerSingleton(INotificationService, StandaloneNotificationService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerService, MarkerService, 0 /* InstantiationType.Eager */);
registerSingleton(ILanguageService, StandaloneLanguageService, 0 /* InstantiationType.Eager */);
registerSingleton(IStandaloneThemeService, StandaloneThemeService, 0 /* InstantiationType.Eager */);
registerSingleton(IModelService, ModelService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerDecorationsService, MarkerDecorationsService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextKeyService, ContextKeyService, 0 /* InstantiationType.Eager */);
registerSingleton(IProgressService, StandaloneProgressService, 0 /* InstantiationType.Eager */);
registerSingleton(IEditorProgressService, StandaloneEditorProgressService, 0 /* InstantiationType.Eager */);
registerSingleton(IStorageService, InMemoryStorageService, 0 /* InstantiationType.Eager */);
registerSingleton(IEditorWorkerService, StandaloneEditorWorkerService, 0 /* InstantiationType.Eager */);
registerSingleton(IBulkEditService, StandaloneBulkEditService, 0 /* InstantiationType.Eager */);
registerSingleton(IWorkspaceTrustManagementService, StandaloneWorkspaceTrustManagementService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextModelService, StandaloneTextModelService, 0 /* InstantiationType.Eager */);
registerSingleton(IAccessibilityService, AccessibilityService, 0 /* InstantiationType.Eager */);
registerSingleton(IListService, ListService, 0 /* InstantiationType.Eager */);
registerSingleton(ICommandService, StandaloneCommandService, 0 /* InstantiationType.Eager */);
registerSingleton(IKeybindingService, StandaloneKeybindingService, 0 /* InstantiationType.Eager */);
registerSingleton(IQuickInputService, StandaloneQuickInputService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextViewService, StandaloneContextViewService, 0 /* InstantiationType.Eager */);
registerSingleton(IOpenerService, OpenerService, 0 /* InstantiationType.Eager */);
registerSingleton(IClipboardService, BrowserClipboardService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextMenuService, StandaloneContextMenuService, 0 /* InstantiationType.Eager */);
registerSingleton(IMenuService, MenuService, 0 /* InstantiationType.Eager */);
registerSingleton(IAccessibilitySignalService, StandaloneAccessbilitySignalService, 0 /* InstantiationType.Eager */);
registerSingleton(ITreeSitterParserService, StandaloneTreeSitterParserService, 0 /* InstantiationType.Eager */);
/**
 * We don't want to eagerly instantiate services because embedders get a one time chance
 * to override services when they create the first editor.
 */
export var StandaloneServices;
(function (StandaloneServices) {
    const serviceCollection = new ServiceCollection();
    for (const [id, descriptor] of getSingletonServiceDescriptors()) {
        serviceCollection.set(id, descriptor);
    }
    const instantiationService = new InstantiationService(serviceCollection, true);
    serviceCollection.set(IInstantiationService, instantiationService);
    function get(serviceId) {
        if (!initialized) {
            initialize({});
        }
        const r = serviceCollection.get(serviceId);
        if (!r) {
            throw new Error('Missing service ' + serviceId);
        }
        if (r instanceof SyncDescriptor) {
            return instantiationService.invokeFunction((accessor) => accessor.get(serviceId));
        }
        else {
            return r;
        }
    }
    StandaloneServices.get = get;
    let initialized = false;
    const onDidInitialize = new Emitter();
    function initialize(overrides) {
        if (initialized) {
            return instantiationService;
        }
        initialized = true;
        // Add singletons that were registered after this module loaded
        for (const [id, descriptor] of getSingletonServiceDescriptors()) {
            if (!serviceCollection.get(id)) {
                serviceCollection.set(id, descriptor);
            }
        }
        // Initialize the service collection with the overrides, but only if the
        // service was not instantiated in the meantime.
        for (const serviceId in overrides) {
            if (overrides.hasOwnProperty(serviceId)) {
                const serviceIdentifier = createDecorator(serviceId);
                const r = serviceCollection.get(serviceIdentifier);
                if (r instanceof SyncDescriptor) {
                    serviceCollection.set(serviceIdentifier, overrides[serviceId]);
                }
            }
        }
        // Instantiate all editor features
        const editorFeatures = getEditorFeatures();
        for (const feature of editorFeatures) {
            try {
                instantiationService.createInstance(feature);
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        onDidInitialize.fire();
        return instantiationService;
    }
    StandaloneServices.initialize = initialize;
    /**
     * Executes callback once services are initialized.
     */
    function withServices(callback) {
        if (initialized) {
            return callback();
        }
        const disposable = new DisposableStore();
        const listener = disposable.add(onDidInitialize.event(() => {
            listener.dispose();
            disposable.add(callback());
        }));
        return disposable;
    }
    StandaloneServices.withServices = withServices;
})(StandaloneServices || (StandaloneServices = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZVNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sa0NBQWtDLENBQUM7QUFDMUMsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLHNEQUFzRCxDQUFDO0FBQzlELE9BQU8sa0RBQWtELENBQUM7QUFDMUQsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8scURBQXFELENBQUM7QUFFN0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUF5QixvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzVHLE9BQU8sRUFBc0IsWUFBWSxFQUFjLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckgsT0FBTyxFQUEyQixpQkFBaUIsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlKLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQXFDLGdCQUFnQixFQUFFLFlBQVks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
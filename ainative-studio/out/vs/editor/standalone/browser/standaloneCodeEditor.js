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
import * as aria from '../../../base/browser/ui/aria/aria.js';
import { Disposable, toDisposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../browser/widget/codeEditor/codeEditorWidget.js';
import { InternalEditorAction } from '../../common/editorAction.js';
import { StandaloneKeybindingService, updateConfigurationService } from './standaloneServices.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { MenuId, MenuRegistry } from '../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { StandaloneCodeEditorNLS } from '../../common/standaloneStrings.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { IEditorProgressService } from '../../../platform/progress/common/progress.js';
import { IModelService } from '../../common/services/model.js';
import { ILanguageService } from '../../common/languages/language.js';
import { StandaloneCodeEditorService } from './standaloneCodeEditorService.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../common/languages/modesRegistry.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { DiffEditorWidget } from '../../browser/widget/diffEditor/diffEditorWidget.js';
import { IAccessibilitySignalService } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { mainWindow } from '../../../base/browser/window.js';
import { setHoverDelegateFactory } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../platform/hover/browser/hover.js';
import { setBaseLayerHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegate2.js';
let LAST_GENERATED_COMMAND_ID = 0;
let ariaDomNodeCreated = false;
/**
 * Create ARIA dom node inside parent,
 * or only for the first editor instantiation inside document.body.
 * @param parent container element for ARIA dom node
 */
function createAriaDomNode(parent) {
    if (!parent) {
        if (ariaDomNodeCreated) {
            return;
        }
        ariaDomNodeCreated = true;
    }
    aria.setARIAContainer(parent || mainWindow.document.body);
}
/**
 * A code editor to be used both by the standalone editor and the standalone diff editor.
 */
let StandaloneCodeEditor = class StandaloneCodeEditor extends CodeEditorWidget {
    constructor(domElement, _options, instantiationService, codeEditorService, commandService, contextKeyService, hoverService, keybindingService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        const options = { ..._options };
        options.ariaLabel = options.ariaLabel || StandaloneCodeEditorNLS.editorViewAccessibleLabel;
        super(domElement, options, {}, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
        if (keybindingService instanceof StandaloneKeybindingService) {
            this._standaloneKeybindingService = keybindingService;
        }
        else {
            this._standaloneKeybindingService = null;
        }
        createAriaDomNode(options.ariaContainerElement);
        setHoverDelegateFactory((placement, enableInstantHover) => instantiationService.createInstance(WorkbenchHoverDelegate, placement, { instantHover: enableInstantHover }, {}));
        setBaseLayerHoverDelegate(hoverService);
    }
    addCommand(keybinding, handler, context) {
        if (!this._standaloneKeybindingService) {
            console.warn('Cannot add command because the editor is configured with an unrecognized KeybindingService');
            return null;
        }
        const commandId = 'DYNAMIC_' + (++LAST_GENERATED_COMMAND_ID);
        const whenExpression = ContextKeyExpr.deserialize(context);
        this._standaloneKeybindingService.addDynamicKeybinding(commandId, keybinding, handler, whenExpression);
        return commandId;
    }
    createContextKey(key, defaultValue) {
        return this._contextKeyService.createKey(key, defaultValue);
    }
    addAction(_descriptor) {
        if ((typeof _descriptor.id !== 'string') || (typeof _descriptor.label !== 'string') || (typeof _descriptor.run !== 'function')) {
            throw new Error('Invalid action descriptor, `id`, `label` and `run` are required properties!');
        }
        if (!this._standaloneKeybindingService) {
            console.warn('Cannot add keybinding because the editor is configured with an unrecognized KeybindingService');
            return Disposable.None;
        }
        // Read descriptor options
        const id = _descriptor.id;
        const label = _descriptor.label;
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals('editorId', this.getId()), ContextKeyExpr.deserialize(_descriptor.precondition));
        const keybindings = _descriptor.keybindings;
        const keybindingsWhen = ContextKeyExpr.and(precondition, ContextKeyExpr.deserialize(_descriptor.keybindingContext));
        const contextMenuGroupId = _descriptor.contextMenuGroupId || null;
        const contextMenuOrder = _descriptor.contextMenuOrder || 0;
        const run = (_accessor, ...args) => {
            return Promise.resolve(_descriptor.run(this, ...args));
        };
        const toDispose = new DisposableStore();
        // Generate a unique id to allow the same descriptor.id across multiple editor instances
        const uniqueId = this.getId() + ':' + id;
        // Register the command
        toDispose.add(CommandsRegistry.registerCommand(uniqueId, run));
        // Register the context menu item
        if (contextMenuGroupId) {
            const menuItem = {
                command: {
                    id: uniqueId,
                    title: label
                },
                when: precondition,
                group: contextMenuGroupId,
                order: contextMenuOrder
            };
            toDispose.add(MenuRegistry.appendMenuItem(MenuId.EditorContext, menuItem));
        }
        // Register the keybindings
        if (Array.isArray(keybindings)) {
            for (const kb of keybindings) {
                toDispose.add(this._standaloneKeybindingService.addDynamicKeybinding(uniqueId, kb, run, keybindingsWhen));
            }
        }
        // Finally, register an internal editor action
        const internalAction = new InternalEditorAction(uniqueId, label, label, undefined, precondition, (...args) => Promise.resolve(_descriptor.run(this, ...args)), this._contextKeyService);
        // Store it under the original id, such that trigger with the original id will work
        this._actions.set(id, internalAction);
        toDispose.add(toDisposable(() => {
            this._actions.delete(id);
        }));
        return toDispose;
    }
    _triggerCommand(handlerId, payload) {
        if (this._codeEditorService instanceof StandaloneCodeEditorService) {
            // Help commands find this editor as the active editor
            try {
                this._codeEditorService.setActiveCodeEditor(this);
                super._triggerCommand(handlerId, payload);
            }
            finally {
                this._codeEditorService.setActiveCodeEditor(null);
            }
        }
        else {
            super._triggerCommand(handlerId, payload);
        }
    }
};
StandaloneCodeEditor = __decorate([
    __param(2, IInstantiationService),
    __param(3, ICodeEditorService),
    __param(4, ICommandService),
    __param(5, IContextKeyService),
    __param(6, IHoverService),
    __param(7, IKeybindingService),
    __param(8, IThemeService),
    __param(9, INotificationService),
    __param(10, IAccessibilityService),
    __param(11, ILanguageConfigurationService),
    __param(12, ILanguageFeaturesService)
], StandaloneCodeEditor);
export { StandaloneCodeEditor };
let StandaloneEditor = class StandaloneEditor extends StandaloneCodeEditor {
    constructor(domElement, _options, instantiationService, codeEditorService, commandService, contextKeyService, hoverService, keybindingService, themeService, notificationService, configurationService, accessibilityService, modelService, languageService, languageConfigurationService, languageFeaturesService) {
        const options = { ..._options };
        updateConfigurationService(configurationService, options, false);
        const themeDomRegistration = themeService.registerEditorContainer(domElement);
        if (typeof options.theme === 'string') {
            themeService.setTheme(options.theme);
        }
        if (typeof options.autoDetectHighContrast !== 'undefined') {
            themeService.setAutoDetectHighContrast(Boolean(options.autoDetectHighContrast));
        }
        const _model = options.model;
        delete options.model;
        super(domElement, options, instantiationService, codeEditorService, commandService, contextKeyService, hoverService, keybindingService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
        this._configurationService = configurationService;
        this._standaloneThemeService = themeService;
        this._register(themeDomRegistration);
        let model;
        if (typeof _model === 'undefined') {
            const languageId = languageService.getLanguageIdByMimeType(options.language) || options.language || PLAINTEXT_LANGUAGE_ID;
            model = createTextModel(modelService, languageService, options.value || '', languageId, undefined);
            this._ownsModel = true;
        }
        else {
            model = _model;
            this._ownsModel = false;
        }
        this._attachModel(model);
        if (model) {
            const e = {
                oldModelUrl: null,
                newModelUrl: model.uri
            };
            this._onDidChangeModel.fire(e);
        }
    }
    dispose() {
        super.dispose();
    }
    updateOptions(newOptions) {
        updateConfigurationService(this._configurationService, newOptions, false);
        if (typeof newOptions.theme === 'string') {
            this._standaloneThemeService.setTheme(newOptions.theme);
        }
        if (typeof newOptions.autoDetectHighContrast !== 'undefined') {
            this._standaloneThemeService.setAutoDetectHighContrast(Boolean(newOptions.autoDetectHighContrast));
        }
        super.updateOptions(newOptions);
    }
    _postDetachModelCleanup(detachedModel) {
        super._postDetachModelCleanup(detachedModel);
        if (detachedModel && this._ownsModel) {
            detachedModel.dispose();
            this._ownsModel = false;
        }
    }
};
StandaloneEditor = __decorate([
    __param(2, IInstantiationService),
    __param(3, ICodeEditorService),
    __param(4, ICommandService),
    __param(5, IContextKeyService),
    __param(6, IHoverService),
    __param(7, IKeybindingService),
    __param(8, IStandaloneThemeService),
    __param(9, INotificationService),
    __param(10, IConfigurationService),
    __param(11, IAccessibilityService),
    __param(12, IModelService),
    __param(13, ILanguageService),
    __param(14, ILanguageConfigurationService),
    __param(15, ILanguageFeaturesService)
], StandaloneEditor);
export { StandaloneEditor };
let StandaloneDiffEditor2 = class StandaloneDiffEditor2 extends DiffEditorWidget {
    constructor(domElement, _options, instantiationService, contextKeyService, codeEditorService, themeService, notificationService, configurationService, contextMenuService, editorProgressService, clipboardService, accessibilitySignalService) {
        const options = { ..._options };
        updateConfigurationService(configurationService, options, true);
        const themeDomRegistration = themeService.registerEditorContainer(domElement);
        if (typeof options.theme === 'string') {
            themeService.setTheme(options.theme);
        }
        if (typeof options.autoDetectHighContrast !== 'undefined') {
            themeService.setAutoDetectHighContrast(Boolean(options.autoDetectHighContrast));
        }
        super(domElement, options, {}, contextKeyService, instantiationService, codeEditorService, accessibilitySignalService, editorProgressService);
        this._configurationService = configurationService;
        this._standaloneThemeService = themeService;
        this._register(themeDomRegistration);
    }
    dispose() {
        super.dispose();
    }
    updateOptions(newOptions) {
        updateConfigurationService(this._configurationService, newOptions, true);
        if (typeof newOptions.theme === 'string') {
            this._standaloneThemeService.setTheme(newOptions.theme);
        }
        if (typeof newOptions.autoDetectHighContrast !== 'undefined') {
            this._standaloneThemeService.setAutoDetectHighContrast(Boolean(newOptions.autoDetectHighContrast));
        }
        super.updateOptions(newOptions);
    }
    _createInnerEditor(instantiationService, container, options) {
        return instantiationService.createInstance(StandaloneCodeEditor, container, options);
    }
    getOriginalEditor() {
        return super.getOriginalEditor();
    }
    getModifiedEditor() {
        return super.getModifiedEditor();
    }
    addCommand(keybinding, handler, context) {
        return this.getModifiedEditor().addCommand(keybinding, handler, context);
    }
    createContextKey(key, defaultValue) {
        return this.getModifiedEditor().createContextKey(key, defaultValue);
    }
    addAction(descriptor) {
        return this.getModifiedEditor().addAction(descriptor);
    }
};
StandaloneDiffEditor2 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextKeyService),
    __param(4, ICodeEditorService),
    __param(5, IStandaloneThemeService),
    __param(6, INotificationService),
    __param(7, IConfigurationService),
    __param(8, IContextMenuService),
    __param(9, IEditorProgressService),
    __param(10, IClipboardService),
    __param(11, IAccessibilitySignalService)
], StandaloneDiffEditor2);
export { StandaloneDiffEditor2 };
/**
 * @internal
 */
export function createTextModel(modelService, languageService, value, languageId, uri) {
    value = value || '';
    if (!languageId) {
        const firstLF = value.indexOf('\n');
        let firstLine = value;
        if (firstLF !== -1) {
            firstLine = value.substring(0, firstLF);
        }
        return doCreateModel(modelService, value, languageService.createByFilepathOrFirstLine(uri || null, firstLine), uri);
    }
    return doCreateModel(modelService, value, languageService.createById(languageId), uri);
}
/**
 * @internal
 */
function doCreateModel(modelService, value, languageSelection, uri) {
    return modelService.createModel(value, languageSelection, uri);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lQ29kZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTNHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXZGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3BFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBYSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFtQixlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNuSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFnQyxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSx5REFBeUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsa0JBQWtC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
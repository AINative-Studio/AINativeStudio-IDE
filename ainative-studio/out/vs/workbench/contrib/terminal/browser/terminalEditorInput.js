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
var TerminalEditorInput_1;
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { ITerminalInstanceService, terminalEditorId } from './terminal.js';
import { getColorClass, getUriClasses } from './terminalIcon.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalExitReason, TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Emitter } from '../../../../base/common/event.js';
let TerminalEditorInput = class TerminalEditorInput extends EditorInput {
    static { TerminalEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.terminal'; }
    setGroup(group) {
        this._group = group;
        if (group?.scopedContextKeyService) {
            this._terminalInstance?.setParentContextKeyService(group.scopedContextKeyService);
        }
    }
    get group() {
        return this._group;
    }
    get typeId() {
        return TerminalEditorInput_1.ID;
    }
    get editorId() {
        return terminalEditorId;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */ | 128 /* EditorInputCapabilities.CanDropIntoEditor */ | 64 /* EditorInputCapabilities.ForceDescription */;
    }
    setTerminalInstance(instance) {
        if (this._terminalInstance) {
            throw new Error('cannot set instance that has already been set');
        }
        this._terminalInstance = instance;
        this._setupInstanceListeners();
    }
    copy() {
        const instance = this._terminalInstanceService.createInstance(this._copyLaunchConfig || {}, TerminalLocation.Editor);
        instance.focusWhenReady();
        this._copyLaunchConfig = undefined;
        return this._instantiationService.createInstance(TerminalEditorInput_1, instance.resource, instance);
    }
    /**
     * Sets the launch config to use for the next call to EditorInput.copy, which will be used when
     * the editor's split command is run.
     */
    setCopyLaunchConfig(launchConfig) {
        this._copyLaunchConfig = launchConfig;
    }
    /**
     * Returns the terminal instance for this input if it has not yet been detached from the input.
     */
    get terminalInstance() {
        return this._isDetached ? undefined : this._terminalInstance;
    }
    showConfirm() {
        if (this._isReverted) {
            return false;
        }
        const confirmOnKill = this._configurationService.getValue("terminal.integrated.confirmOnKill" /* TerminalSettingId.ConfirmOnKill */);
        if (confirmOnKill === 'editor' || confirmOnKill === 'always') {
            return this._terminalInstance?.hasChildProcesses || false;
        }
        return false;
    }
    async confirm(terminals) {
        const { confirmed } = await this._dialogService.confirm({
            type: Severity.Warning,
            message: localize('confirmDirtyTerminal.message', "Do you want to terminate running processes?"),
            primaryButton: localize({ key: 'confirmDirtyTerminal.button', comment: ['&& denotes a mnemonic'] }, "&&Terminate"),
            detail: terminals.length > 1 ?
                terminals.map(terminal => terminal.editor.getName()).join('\n') + '\n\n' + localize('confirmDirtyTerminals.detail', "Closing will terminate the running processes in the terminals.") :
                localize('confirmDirtyTerminal.detail', "Closing will terminate the running processes in this terminal.")
        });
        return confirmed ? 1 /* ConfirmResult.DONT_SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    async revert() {
        // On revert just treat the terminal as permanently non-dirty
        this._isReverted = true;
    }
    constructor(resource, _terminalInstance, _themeService, _terminalInstanceService, _instantiationService, _configurationService, _lifecycleService, _contextKeyService, _dialogService) {
        super();
        this.resource = resource;
        this._terminalInstance = _terminalInstance;
        this._themeService = _themeService;
        this._terminalInstanceService = _terminalInstanceService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._lifecycleService = _lifecycleService;
        this._contextKeyService = _contextKeyService;
        this._dialogService = _dialogService;
        this.closeHandler = this;
        this._isDetached = false;
        this._isShuttingDown = false;
        this._isReverted = false;
        this._onDidRequestAttach = this._register(new Emitter());
        this.onDidRequestAttach = this._onDidRequestAttach.event;
        this._terminalEditorFocusContextKey = TerminalContextKeys.editorFocus.bindTo(_contextKeyService);
        if (_terminalInstance) {
            this._setupInstanceListeners();
        }
    }
    _setupInstanceListeners() {
        const instance = this._terminalInstance;
        if (!instance) {
            return;
        }
        const instanceOnDidFocusListener = instance.onDidFocus(() => this._terminalEditorFocusContextKey.set(true));
        const instanceOnDidBlurListener = instance.onDidBlur(() => this._terminalEditorFocusContextKey.reset());
        this._register(toDisposable(() => {
            if (!this._isDetached && !this._isShuttingDown) {
                // Will be ignored if triggered by onExit or onDisposed terminal events
                // as disposed was already called
                instance.dispose(TerminalExitReason.User);
            }
            dispose([instanceOnDidFocusListener, instanceOnDidBlurListener]);
        }));
        const disposeListeners = [
            instance.onExit((e) => {
                if (!instance.waitOnExit) {
                    this.dispose();
                }
            }),
            instance.onDisposed(() => this.dispose()),
            instance.onTitleChanged(() => this._onDidChangeLabel.fire()),
            instance.onIconChanged(() => this._onDidChangeLabel.fire()),
            instanceOnDidFocusListener,
            instanceOnDidBlurListener,
            instance.statusList.onDidChangePrimaryStatus(() => this._onDidChangeLabel.fire())
        ];
        // Don't dispose editor when instance is torn down on shutdown to avoid extra work and so
        // the editor/tabs don't disappear
        this._lifecycleService.onWillShutdown((e) => {
            this._isShuttingDown = true;
            dispose(disposeListeners);
            // Don't touch processes if the shutdown was a result of reload as they will be reattached
            const shouldPersistTerminals = this._configurationService.getValue("terminal.integrated.enablePersistentSessions" /* TerminalSettingId.EnablePersistentSessions */) && e.reason === 3 /* ShutdownReason.RELOAD */;
            if (shouldPersistTerminals) {
                instance.detachProcessAndDispose(TerminalExitReason.Shutdown);
            }
            else {
                instance.dispose(TerminalExitReason.Shutdown);
            }
        });
    }
    getName() {
        return this._terminalInstance?.title || this.resource.fragment;
    }
    getIcon() {
        if (!this._terminalInstance || !ThemeIcon.isThemeIcon(this._terminalInstance.icon)) {
            return undefined;
        }
        return this._terminalInstance.icon;
    }
    getLabelExtraClasses() {
        if (!this._terminalInstance) {
            return [];
        }
        const extraClasses = ['terminal-tab', 'predefined-file-icon'];
        const colorClass = getColorClass(this._terminalInstance);
        if (colorClass) {
            extraClasses.push(colorClass);
        }
        const uriClasses = getUriClasses(this._terminalInstance, this._themeService.getColorTheme().type);
        if (uriClasses) {
            extraClasses.push(...uriClasses);
        }
        return extraClasses;
    }
    /**
     * Detach the instance from the input such that when the input is disposed it will not dispose
     * of the terminal instance/process.
     */
    detachInstance() {
        if (!this._isShuttingDown) {
            this._terminalInstance?.detachFromElement();
            this._terminalInstance?.setParentContextKeyService(this._contextKeyService);
            this._isDetached = true;
        }
    }
    getDescription() {
        return this._terminalInstance?.description;
    }
    toUntyped() {
        return {
            resource: this.resource,
            options: {
                override: terminalEditorId,
                pinned: true,
                forceReload: true
            }
        };
    }
};
TerminalEditorInput = TerminalEditorInput_1 = __decorate([
    __param(2, IThemeService),
    __param(3, ITerminalInstanceService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, ILifecycleService),
    __param(7, IContextKeyService),
    __param(8, IDialogService)
], TerminalEditorInput);
export { TerminalEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBdUIsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RixPQUFPLEVBQXFCLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFzQixrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBcUIsTUFBTSxrREFBa0QsQ0FBQztBQUUvSSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFDLE1BQU0saURBQWlELENBQUM7QUFFdkgsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7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
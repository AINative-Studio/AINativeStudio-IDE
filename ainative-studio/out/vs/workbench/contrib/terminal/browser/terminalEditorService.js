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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ITerminalInstanceService } from './terminal.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { getInstanceFromResource } from './terminalUri.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService, ACTIVE_GROUP, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let TerminalEditorService = class TerminalEditorService extends Disposable {
    constructor(_editorService, _editorGroupsService, _terminalInstanceService, _instantiationService, lifecycleService, contextKeyService) {
        super();
        this._editorService = _editorService;
        this._editorGroupsService = _editorGroupsService;
        this._terminalInstanceService = _terminalInstanceService;
        this._instantiationService = _instantiationService;
        this.instances = [];
        this._activeInstanceIndex = -1;
        this._isShuttingDown = false;
        this._editorInputs = new Map();
        this._instanceDisposables = new Map();
        this._onDidDisposeInstance = this._register(new Emitter());
        this.onDidDisposeInstance = this._onDidDisposeInstance.event;
        this._onDidFocusInstance = this._register(new Emitter());
        this.onDidFocusInstance = this._onDidFocusInstance.event;
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        this.onDidChangeInstanceCapability = this._onDidChangeInstanceCapability.event;
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this.onDidChangeActiveInstance = this._onDidChangeActiveInstance.event;
        this._onDidChangeInstances = this._register(new Emitter());
        this.onDidChangeInstances = this._onDidChangeInstances.event;
        this._terminalEditorActive = TerminalContextKeys.terminalEditorActive.bindTo(contextKeyService);
        this._register(toDisposable(() => {
            for (const d of this._instanceDisposables.values()) {
                dispose(d);
            }
        }));
        this._register(lifecycleService.onWillShutdown(() => this._isShuttingDown = true));
        this._register(this._editorService.onDidActiveEditorChange(() => {
            const activeEditor = this._editorService.activeEditor;
            const instance = activeEditor instanceof TerminalEditorInput ? activeEditor?.terminalInstance : undefined;
            const terminalEditorActive = !!instance && activeEditor instanceof TerminalEditorInput;
            this._terminalEditorActive.set(terminalEditorActive);
            if (terminalEditorActive) {
                activeEditor?.setGroup(this._editorService.activeEditorPane?.group);
                this.setActiveInstance(instance);
            }
            else {
                for (const instance of this.instances) {
                    instance.resetFocusContextKey();
                }
            }
        }));
        this._register(this._editorService.onDidVisibleEditorsChange(() => {
            // add any terminal editors created via the editor service split command
            const knownIds = this.instances.map(i => i.instanceId);
            const terminalEditors = this._getActiveTerminalEditors();
            const unknownEditor = terminalEditors.find(input => {
                const inputId = input instanceof TerminalEditorInput ? input.terminalInstance?.instanceId : undefined;
                if (inputId === undefined) {
                    return false;
                }
                return !knownIds.includes(inputId);
            });
            if (unknownEditor instanceof TerminalEditorInput && unknownEditor.terminalInstance) {
                this._editorInputs.set(unknownEditor.terminalInstance.resource.path, unknownEditor);
                this.instances.push(unknownEditor.terminalInstance);
            }
        }));
        // Remove the terminal from the managed instances when the editor closes. This fires when
        // dragging and dropping to another editor or closing the editor via cmd/ctrl+w.
        this._register(this._editorService.onDidCloseEditor(e => {
            const instance = e.editor instanceof TerminalEditorInput ? e.editor.terminalInstance : undefined;
            if (instance) {
                const instanceIndex = this.instances.findIndex(e => e === instance);
                if (instanceIndex !== -1) {
                    const wasActiveInstance = this.instances[instanceIndex] === this.activeInstance;
                    this._removeInstance(instance);
                    if (wasActiveInstance) {
                        this.setActiveInstance(undefined);
                    }
                }
            }
        }));
    }
    _getActiveTerminalEditors() {
        return this._editorService.visibleEditors.filter(e => e instanceof TerminalEditorInput && e.terminalInstance?.instanceId);
    }
    get activeInstance() {
        if (this.instances.length === 0 || this._activeInstanceIndex === -1) {
            return undefined;
        }
        return this.instances[this._activeInstanceIndex];
    }
    setActiveInstance(instance) {
        this._activeInstanceIndex = instance ? this.instances.findIndex(e => e === instance) : -1;
        this._onDidChangeActiveInstance.fire(this.activeInstance);
    }
    async focusInstance(instance) {
        return instance.focusWhenReady(true);
    }
    async focusActiveInstance() {
        return this.activeInstance?.focusWhenReady(true);
    }
    async openEditor(instance, editorOptions) {
        const resource = this.resolveResource(instance);
        if (resource) {
            await this._activeOpenEditorRequest?.promise;
            this._activeOpenEditorRequest = {
                instanceId: instance.instanceId,
                promise: this._editorService.openEditor({
                    resource,
                    description: instance.description || instance.shellLaunchConfig.type,
                    options: {
                        pinned: true,
                        forceReload: true,
                        preserveFocus: editorOptions?.preserveFocus
                    }
                }, editorOptions?.viewColumn ?? ACTIVE_GROUP)
            };
            await this._activeOpenEditorRequest?.promise;
            this._activeOpenEditorRequest = undefined;
        }
    }
    resolveResource(instance) {
        const resource = instance.resource;
        const inputKey = resource.path;
        const cachedEditor = this._editorInputs.get(inputKey);
        if (cachedEditor) {
            return cachedEditor.resource;
        }
        instance.target = TerminalLocation.Editor;
        const input = this._instantiationService.createInstance(TerminalEditorInput, resource, instance);
        this._registerInstance(inputKey, input, instance);
        return input.resource;
    }
    getInputFromResource(resource) {
        const input = this._editorInputs.get(resource.path);
        if (!input) {
            throw new Error(`Could not get input from resource: ${resource.path}`);
        }
        return input;
    }
    _registerInstance(inputKey, input, instance) {
        this._editorInputs.set(inputKey, input);
        this._instanceDisposables.set(inputKey, [
            instance.onDidFocus(this._onDidFocusInstance.fire, this._onDidFocusInstance),
            instance.onDisposed(this._onDidDisposeInstance.fire, this._onDidDisposeInstance),
            instance.capabilities.onDidAddCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
            instance.capabilities.onDidRemoveCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
        ]);
        this.instances.push(instance);
        this._onDidChangeInstances.fire();
    }
    _removeInstance(instance) {
        const inputKey = instance.resource.path;
        this._editorInputs.delete(inputKey);
        const instanceIndex = this.instances.findIndex(e => e === instance);
        if (instanceIndex !== -1) {
            this.instances.splice(instanceIndex, 1);
        }
        const disposables = this._instanceDisposables.get(inputKey);
        this._instanceDisposables.delete(inputKey);
        if (disposables) {
            dispose(disposables);
        }
        this._onDidChangeInstances.fire();
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    splitInstance(instanceToSplit, shellLaunchConfig = {}) {
        if (instanceToSplit.target === TerminalLocation.Editor) {
            // Make sure the instance to split's group is active
            const group = this._editorInputs.get(instanceToSplit.resource.path)?.group;
            if (group) {
                this._editorGroupsService.activateGroup(group);
            }
        }
        const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Editor);
        const resource = this.resolveResource(instance);
        if (resource) {
            this._editorService.openEditor({
                resource: URI.revive(resource),
                description: instance.description,
                options: {
                    pinned: true,
                    forceReload: true
                }
            }, SIDE_GROUP);
        }
        return instance;
    }
    reviveInput(deserializedInput) {
        if ('pid' in deserializedInput) {
            const newDeserializedInput = { ...deserializedInput, findRevivedId: true };
            const instance = this._terminalInstanceService.createInstance({ attachPersistentProcess: newDeserializedInput }, TerminalLocation.Editor);
            const input = this._instantiationService.createInstance(TerminalEditorInput, instance.resource, instance);
            this._registerInstance(instance.resource.path, input, instance);
            return input;
        }
        else {
            throw new Error(`Could not revive terminal editor input, ${deserializedInput}`);
        }
    }
    detachInstance(instance) {
        const inputKey = instance.resource.path;
        const editorInput = this._editorInputs.get(inputKey);
        editorInput?.detachInstance();
        this._removeInstance(instance);
        // Don't dispose the input when shutting down to avoid layouts in the editor area
        if (!this._isShuttingDown) {
            editorInput?.dispose();
        }
    }
    async revealActiveEditor(preserveFocus) {
        const instance = this.activeInstance;
        if (!instance) {
            return;
        }
        // If there is an active openEditor call for this instance it will be revealed by that
        if (this._activeOpenEditorRequest?.instanceId === instance.instanceId) {
            return;
        }
        const editorInput = this._editorInputs.get(instance.resource.path);
        this._editorService.openEditor(editorInput, {
            pinned: true,
            forceReload: true,
            preserveFocus,
            activation: EditorActivation.PRESERVE
        });
    }
};
TerminalEditorService = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, ITerminalInstanceService),
    __param(3, IInstantiationService),
    __param(4, ILifecycleService),
    __param(5, IContextKeyService)
], TerminalEditorService);
export { TerminalEditorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXNCLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHeEcsT0FBTyxFQUErRSx3QkFBd0IsRUFBMEIsTUFBTSxlQUFlLENBQUM7QUFDOUosT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0s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
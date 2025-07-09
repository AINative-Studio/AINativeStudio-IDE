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
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { INotebookEditorService } from '../../contrib/notebook/browser/services/notebookEditorService.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../contrib/notebook/common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../contrib/notebook/common/notebookKernelService.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { INotebookService } from '../../contrib/notebook/common/notebookService.js';
import { AsyncIterableSource } from '../../../base/common/async.js';
class MainThreadKernel {
    get preloadUris() {
        return this.preloads.map(p => p.uri);
    }
    get preloadProvides() {
        return this.preloads.flatMap(p => p.provides);
    }
    constructor(data, _languageService) {
        this._languageService = _languageService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.id = data.id;
        this.viewType = data.notebookType;
        this.extension = data.extensionId;
        this.implementsInterrupt = data.supportsInterrupt ?? false;
        this.label = data.label;
        this.description = data.description;
        this.detail = data.detail;
        this.supportedLanguages = isNonEmptyArray(data.supportedLanguages) ? data.supportedLanguages : _languageService.getRegisteredLanguageIds();
        this.implementsExecutionOrder = data.supportsExecutionOrder ?? false;
        this.hasVariableProvider = data.hasVariableProvider ?? false;
        this.localResourceRoot = URI.revive(data.extensionLocation);
        this.preloads = data.preloads?.map(u => ({ uri: URI.revive(u.uri), provides: u.provides })) ?? [];
    }
    update(data) {
        const event = Object.create(null);
        if (data.label !== undefined) {
            this.label = data.label;
            event.label = true;
        }
        if (data.description !== undefined) {
            this.description = data.description;
            event.description = true;
        }
        if (data.detail !== undefined) {
            this.detail = data.detail;
            event.detail = true;
        }
        if (data.supportedLanguages !== undefined) {
            this.supportedLanguages = isNonEmptyArray(data.supportedLanguages) ? data.supportedLanguages : this._languageService.getRegisteredLanguageIds();
            event.supportedLanguages = true;
        }
        if (data.supportsExecutionOrder !== undefined) {
            this.implementsExecutionOrder = data.supportsExecutionOrder;
            event.hasExecutionOrder = true;
        }
        if (data.supportsInterrupt !== undefined) {
            this.implementsInterrupt = data.supportsInterrupt;
            event.hasInterruptHandler = true;
        }
        if (data.hasVariableProvider !== undefined) {
            this.hasVariableProvider = data.hasVariableProvider;
            event.hasVariableProvider = true;
        }
        this._onDidChange.fire(event);
    }
}
class MainThreadKernelDetectionTask {
    constructor(notebookType) {
        this.notebookType = notebookType;
    }
}
let MainThreadNotebookKernels = class MainThreadNotebookKernels {
    constructor(extHostContext, _languageService, _notebookKernelService, _notebookExecutionStateService, _notebookService, notebookEditorService) {
        this._languageService = _languageService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._notebookService = _notebookService;
        this._editors = new DisposableMap();
        this._disposables = new DisposableStore();
        this._kernels = new Map();
        this._kernelDetectionTasks = new Map();
        this._kernelSourceActionProviders = new Map();
        this._kernelSourceActionProvidersEventRegistrations = new Map();
        this._executions = new Map();
        this._notebookExecutions = new Map();
        this.variableRequestIndex = 0;
        this.variableRequestMap = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookKernels);
        notebookEditorService.listNotebookEditors().forEach(this._onEditorAdd, this);
        notebookEditorService.onDidAddNotebookEditor(this._onEditorAdd, this, this._disposables);
        notebookEditorService.onDidRemoveNotebookEditor(this._onEditorRemove, this, this._disposables);
        this._disposables.add(toDisposable(() => {
            // EH shut down, complete all executions started by this EH
            this._executions.forEach(e => {
                e.complete({});
            });
            this._notebookExecutions.forEach(e => e.complete());
        }));
        this._disposables.add(this._notebookExecutionStateService.onDidChangeExecution(e => {
            if (e.type === NotebookExecutionType.cell) {
                this._proxy.$cellExecutionChanged(e.notebook, e.cellHandle, e.changed?.state);
            }
        }));
        this._disposables.add(this._notebookKernelService.onDidChangeSelectedNotebooks(e => {
            for (const [handle, [kernel,]] of this._kernels) {
                if (e.oldKernel === kernel.id) {
                    this._proxy.$acceptNotebookAssociation(handle, e.notebook, false);
                }
                else if (e.newKernel === kernel.id) {
                    this._proxy.$acceptNotebookAssociation(handle, e.notebook, true);
                }
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
        for (const [, registration] of this._kernels.values()) {
            registration.dispose();
        }
        for (const [, registration] of this._kernelDetectionTasks.values()) {
            registration.dispose();
        }
        for (const [, registration] of this._kernelSourceActionProviders.values()) {
            registration.dispose();
        }
        this._editors.dispose();
    }
    // --- kernel ipc
    _onEditorAdd(editor) {
        const ipcListener = editor.onDidReceiveMessage(e => {
            if (!editor.hasModel()) {
                return;
            }
            const { selected } = this._notebookKernelService.getMatchingKernel(editor.textModel);
            if (!selected) {
                return;
            }
            for (const [handle, candidate] of this._kernels) {
                if (candidate[0] === selected) {
                    this._proxy.$acceptKernelMessageFromRenderer(handle, editor.getId(), e.message);
                    break;
                }
            }
        });
        this._editors.set(editor, ipcListener);
    }
    _onEditorRemove(editor) {
        this._editors.deleteAndDispose(editor);
    }
    async $postMessage(handle, editorId, message) {
        const tuple = this._kernels.get(handle);
        if (!tuple) {
            throw new Error('kernel already disposed');
        }
        const [kernel] = tuple;
        let didSend = false;
        for (const [editor] of this._editors) {
            if (!editor.hasModel()) {
                continue;
            }
            if (this._notebookKernelService.getMatchingKernel(editor.textModel).selected !== kernel) {
                // different kernel
                continue;
            }
            if (editorId === undefined) {
                // all editors
                editor.postMessage(message);
                didSend = true;
            }
            else if (editor.getId() === editorId) {
                // selected editors
                editor.postMessage(message);
                didSend = true;
                break;
            }
        }
        return didSend;
    }
    $receiveVariable(requestId, variable) {
        const source = this.variableRequestMap.get(requestId);
        if (source) {
            source.emitOne(variable);
        }
    }
    // --- kernel adding/updating/removal
    async $addKernel(handle, data) {
        const that = this;
        const kernel = new class extends MainThreadKernel {
            async executeNotebookCellsRequest(uri, handles) {
                await that._proxy.$executeCells(handle, uri, handles);
            }
            async cancelNotebookCellExecution(uri, handles) {
                await that._proxy.$cancelCells(handle, uri, handles);
            }
            provideVariables(notebookUri, parentId, kind, start, token) {
                const requestId = `${handle}variables${that.variableRequestIndex++}`;
                if (that.variableRequestMap.has(requestId)) {
                    return that.variableRequestMap.get(requestId).asyncIterable;
                }
                const source = new AsyncIterableSource();
                that.variableRequestMap.set(requestId, source);
                that._proxy.$provideVariables(handle, requestId, notebookUri, parentId, kind, start, token).then(() => {
                    source.resolve();
                    that.variableRequestMap.delete(requestId);
                }).catch((err) => {
                    source.reject(err);
                    that.variableRequestMap.delete(requestId);
                });
                return source.asyncIterable;
            }
        }(data, this._languageService);
        const disposables = this._disposables.add(new DisposableStore());
        // Ensure _kernels is up to date before we register a kernel.
        this._kernels.set(handle, [kernel, disposables]);
        disposables.add(this._notebookKernelService.registerKernel(kernel));
    }
    $updateKernel(handle, data) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            tuple[0].update(data);
        }
    }
    $removeKernel(handle) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernels.delete(handle);
        }
    }
    $updateNotebookPriority(handle, notebook, value) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            this._notebookKernelService.updateKernelNotebookAffinity(tuple[0], URI.revive(notebook), value);
        }
    }
    // --- Cell execution
    $createExecution(handle, controllerId, rawUri, cellHandle) {
        const uri = URI.revive(rawUri);
        const notebook = this._notebookService.getNotebookTextModel(uri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${uri.toString()}`);
        }
        const kernel = this._notebookKernelService.getMatchingKernel(notebook);
        if (!kernel.selected || kernel.selected.id !== controllerId) {
            throw new Error(`Kernel is not selected: ${kernel.selected?.id} !== ${controllerId}`);
        }
        const execution = this._notebookExecutionStateService.createCellExecution(uri, cellHandle);
        execution.confirm();
        this._executions.set(handle, execution);
    }
    $updateExecution(handle, data) {
        const updates = data.value;
        try {
            const execution = this._executions.get(handle);
            execution?.update(updates.map(NotebookDto.fromCellExecuteUpdateDto));
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    $completeExecution(handle, data) {
        try {
            const execution = this._executions.get(handle);
            execution?.complete(NotebookDto.fromCellExecuteCompleteDto(data.value));
        }
        catch (e) {
            onUnexpectedError(e);
        }
        finally {
            this._executions.delete(handle);
        }
    }
    // --- Notebook execution
    $createNotebookExecution(handle, controllerId, rawUri) {
        const uri = URI.revive(rawUri);
        const notebook = this._notebookService.getNotebookTextModel(uri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${uri.toString()}`);
        }
        const kernel = this._notebookKernelService.getMatchingKernel(notebook);
        if (!kernel.selected || kernel.selected.id !== controllerId) {
            throw new Error(`Kernel is not selected: ${kernel.selected?.id} !== ${controllerId}`);
        }
        const execution = this._notebookExecutionStateService.createExecution(uri);
        execution.confirm();
        this._notebookExecutions.set(handle, execution);
    }
    $beginNotebookExecution(handle) {
        try {
            const execution = this._notebookExecutions.get(handle);
            execution?.begin();
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    $completeNotebookExecution(handle) {
        try {
            const execution = this._notebookExecutions.get(handle);
            execution?.complete();
        }
        catch (e) {
            onUnexpectedError(e);
        }
        finally {
            this._notebookExecutions.delete(handle);
        }
    }
    // --- notebook kernel detection task
    async $addKernelDetectionTask(handle, notebookType) {
        const kernelDetectionTask = new MainThreadKernelDetectionTask(notebookType);
        const registration = this._notebookKernelService.registerNotebookKernelDetectionTask(kernelDetectionTask);
        this._kernelDetectionTasks.set(handle, [kernelDetectionTask, registration]);
    }
    $removeKernelDetectionTask(handle) {
        const tuple = this._kernelDetectionTasks.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernelDetectionTasks.delete(handle);
        }
    }
    // --- notebook kernel source action provider
    async $addKernelSourceActionProvider(handle, eventHandle, notebookType) {
        const kernelSourceActionProvider = {
            viewType: notebookType,
            provideKernelSourceActions: async () => {
                const actions = await this._proxy.$provideKernelSourceActions(handle, CancellationToken.None);
                return actions.map(action => {
                    let documentation = action.documentation;
                    if (action.documentation && typeof action.documentation !== 'string') {
                        documentation = URI.revive(action.documentation);
                    }
                    return {
                        label: action.label,
                        command: action.command,
                        description: action.description,
                        detail: action.detail,
                        documentation,
                    };
                });
            }
        };
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._kernelSourceActionProvidersEventRegistrations.set(eventHandle, emitter);
            kernelSourceActionProvider.onDidChangeSourceActions = emitter.event;
        }
        const registration = this._notebookKernelService.registerKernelSourceActionProvider(notebookType, kernelSourceActionProvider);
        this._kernelSourceActionProviders.set(handle, [kernelSourceActionProvider, registration]);
    }
    $removeKernelSourceActionProvider(handle, eventHandle) {
        const tuple = this._kernelSourceActionProviders.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernelSourceActionProviders.delete(handle);
        }
        if (typeof eventHandle === 'number') {
            this._kernelSourceActionProvidersEventRegistrations.delete(eventHandle);
        }
    }
    $emitNotebookKernelSourceActionsChangeEvent(eventHandle) {
        const emitter = this._kernelSourceActionProvidersEventRegistrations.get(eventHandle);
        if (emitter instanceof Emitter) {
            emitter.fire(undefined);
        }
    }
    $variablesUpdated(notebookUri) {
        this._notebookKernelService.notifyVariablesChange(URI.revive(notebookUri));
    }
};
MainThreadNotebookKernels = __decorate([
    extHostNamedCustomer(MainContext.MainThreadNotebookKernels),
    __param(1, ILanguageService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionStateService),
    __param(4, INotebookService),
    __param(5, INotebookEditorService)
], MainThreadNotebookKernels);
export { MainThreadNotebookKernels };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rS2VybmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE5vdGVib29rS2VybmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUU3RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUMxRyxPQUFPLEVBQThDLDhCQUE4QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkwsT0FBTyxFQUEwRyxzQkFBc0IsRUFBbUIsTUFBTSx3REFBd0QsQ0FBQztBQUV6TixPQUFPLEVBQUUsY0FBYyxFQUFzRyxXQUFXLEVBQWtDLE1BQU0sK0JBQStCLENBQUM7QUFDaE4sT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0s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
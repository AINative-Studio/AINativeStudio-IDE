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
import { asArray } from '../../../base/common/arrays.js';
import { DeferredPromise, timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext } from './extHost.protocol.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult } from './extHostCommands.js';
import * as extHostTypeConverters from './extHostTypeConverters.js';
import { NotebookCellExecutionState as ExtHostNotebookCellExecutionState, NotebookCellOutput, NotebookControllerAffinity2, NotebookVariablesRequestKind } from './extHostTypes.js';
import { asWebviewUri } from '../../contrib/webview/common/webview.js';
import { CellExecutionUpdateType } from '../../contrib/notebook/common/notebookExecutionService.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { variablePageSize } from '../../contrib/notebook/common/notebookKernelService.js';
let ExtHostNotebookKernels = class ExtHostNotebookKernels {
    constructor(mainContext, _initData, _extHostNotebook, _commands, _logService) {
        this._initData = _initData;
        this._extHostNotebook = _extHostNotebook;
        this._commands = _commands;
        this._logService = _logService;
        this._activeExecutions = new ResourceMap();
        this._activeNotebookExecutions = new ResourceMap();
        this._kernelDetectionTask = new Map();
        this._kernelDetectionTaskHandlePool = 0;
        this._kernelSourceActionProviders = new Map();
        this._kernelSourceActionProviderHandlePool = 0;
        this._kernelData = new Map();
        this._handlePool = 0;
        this._onDidChangeCellExecutionState = new Emitter();
        this.onDidChangeNotebookCellExecutionState = this._onDidChangeCellExecutionState.event;
        this.id = 0;
        this.variableStore = {};
        this._proxy = mainContext.getProxy(MainContext.MainThreadNotebookKernels);
        // todo@rebornix @joyceerhl: move to APICommands once stabilized.
        const selectKernelApiCommand = new ApiCommand('notebook.selectKernel', '_notebook.selectKernel', 'Trigger kernel picker for specified notebook editor widget', [
            new ApiCommandArgument('options', 'Select kernel options', v => true, (v) => {
                if (v && 'notebookEditor' in v && 'id' in v) {
                    const notebookEditorId = this._extHostNotebook.getIdByEditor(v.notebookEditor);
                    return {
                        id: v.id, extension: v.extension, notebookEditorId
                    };
                }
                else if (v && 'notebookEditor' in v) {
                    const notebookEditorId = this._extHostNotebook.getIdByEditor(v.notebookEditor);
                    if (notebookEditorId === undefined) {
                        throw new Error(`Cannot invoke 'notebook.selectKernel' for unrecognized notebook editor ${v.notebookEditor.notebook.uri.toString()}`);
                    }
                    return { notebookEditorId };
                }
                return v;
            })
        ], ApiCommandResult.Void);
        const requestKernelVariablesApiCommand = new ApiCommand('vscode.executeNotebookVariableProvider', '_executeNotebookVariableProvider', 'Execute notebook variable provider', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of variables', (value, apiArgs) => {
            return value.map(variable => {
                return {
                    variable: {
                        name: variable.name,
                        value: variable.value,
                        expression: variable.expression,
                        type: variable.type,
                        language: variable.language
                    },
                    hasNamedChildren: variable.hasNamedChildren,
                    indexedChildrenCount: variable.indexedChildrenCount
                };
            });
        }));
        this._commands.registerApiCommand(selectKernelApiCommand);
        this._commands.registerApiCommand(requestKernelVariablesApiCommand);
    }
    createNotebookController(extension, id, viewType, label, handler, preloads) {
        for (const data of this._kernelData.values()) {
            if (data.controller.id === id && ExtensionIdentifier.equals(extension.identifier, data.extensionId)) {
                throw new Error(`notebook controller with id '${id}' ALREADY exist`);
            }
        }
        const handle = this._handlePool++;
        const that = this;
        this._logService.trace(`NotebookController[${handle}], CREATED by ${extension.identifier.value}, ${id}`);
        const _defaultExecutHandler = () => console.warn(`NO execute handler from notebook controller '${data.id}' of extension: '${extension.identifier}'`);
        let isDisposed = false;
        const onDidChangeSelection = new Emitter();
        const onDidReceiveMessage = new Emitter();
        const data = {
            id: createKernelId(extension.identifier, id),
            notebookType: viewType,
            extensionId: extension.identifier,
            extensionLocation: extension.extensionLocation,
            label: label || extension.identifier.value,
            preloads: preloads ? preloads.map(extHostTypeConverters.NotebookRendererScript.from) : []
        };
        //
        let _executeHandler = handler ?? _defaultExecutHandler;
        let _interruptHandler;
        let _variableProvider;
        this._proxy.$addKernel(handle, data).catch(err => {
            // this can happen when a kernel with that ID is already registered
            console.log(err);
            isDisposed = true;
        });
        // update: all setters write directly into the dto object
        // and trigger an update. the actual update will only happen
        // once per event loop execution
        let tokenPool = 0;
        const _update = () => {
            if (isDisposed) {
                return;
            }
            const myToken = ++tokenPool;
            Promise.resolve().then(() => {
                if (myToken === tokenPool) {
                    this._proxy.$updateKernel(handle, data);
                }
            });
        };
        // notebook documents that are associated to this controller
        const associatedNotebooks = new ResourceMap();
        const controller = {
            get id() { return id; },
            get notebookType() { return data.notebookType; },
            onDidChangeSelectedNotebooks: onDidChangeSelection.event,
            get label() {
                return data.label;
            },
            set label(value) {
                data.label = value ?? extension.displayName ?? extension.name;
                _update();
            },
            get detail() {
                return data.detail ?? '';
            },
            set detail(value) {
                data.detail = value;
                _update();
            },
            get description() {
                return data.description ?? '';
            },
            set description(value) {
                data.description = value;
                _update();
            },
            get supportedLanguages() {
                return data.supportedLanguages;
            },
            set supportedLanguages(value) {
                data.supportedLanguages = value;
                _update();
            },
            get supportsExecutionOrder() {
                return data.supportsExecutionOrder ?? false;
            },
            set supportsExecutionOrder(value) {
                data.supportsExecutionOrder = value;
                _update();
            },
            get rendererScripts() {
                return data.preloads ? data.preloads.map(extHostTypeConverters.NotebookRendererScript.to) : [];
            },
            get executeHandler() {
                return _executeHandler;
            },
            set executeHandler(value) {
                _executeHandler = value ?? _defaultExecutHandler;
            },
            get interruptHandler() {
                return _interruptHandler;
            },
            set interruptHandler(value) {
                _interruptHandler = value;
                data.supportsInterrupt = Boolean(value);
                _update();
            },
            set variableProvider(value) {
                checkProposedApiEnabled(extension, 'notebookVariableProvider');
                _variableProvider = value;
                data.hasVariableProvider = !!value;
                value?.onDidChangeVariables(e => that._proxy.$variablesUpdated(e.uri));
                _update();
            },
            get variableProvider() {
                return _variableProvider;
            },
            createNotebookCellExecution(cell) {
                if (isDisposed) {
                    throw new Error('notebook controller is DISPOSED');
                }
                if (!associatedNotebooks.has(cell.notebook.uri)) {
                    that._logService.trace(`NotebookController[${handle}] NOT associated to notebook, associated to THESE notebooks:`, Array.from(associatedNotebooks.keys()).map(u => u.toString()));
                    throw new Error(`notebook controller is NOT associated to notebook: ${cell.notebook.uri.toString()}`);
                }
                return that._createNotebookCellExecution(cell, createKernelId(extension.identifier, this.id));
            },
            createNotebookExecution(notebook) {
                checkProposedApiEnabled(extension, 'notebookExecution');
                if (isDisposed) {
                    throw new Error('notebook controller is DISPOSED');
                }
                if (!associatedNotebooks.has(notebook.uri)) {
                    that._logService.trace(`NotebookController[${handle}] NOT associated to notebook, associated to THESE notebooks:`, Array.from(associatedNotebooks.keys()).map(u => u.toString()));
                    throw new Error(`notebook controller is NOT associated to notebook: ${notebook.uri.toString()}`);
                }
                return that._createNotebookExecution(notebook, createKernelId(extension.identifier, this.id));
            },
            dispose: () => {
                if (!isDisposed) {
                    this._logService.trace(`NotebookController[${handle}], DISPOSED`);
                    isDisposed = true;
                    this._kernelData.delete(handle);
                    onDidChangeSelection.dispose();
                    onDidReceiveMessage.dispose();
                    this._proxy.$removeKernel(handle);
                }
            },
            // --- priority
            updateNotebookAffinity(notebook, priority) {
                if (priority === NotebookControllerAffinity2.Hidden) {
                    // This api only adds an extra enum value, the function is the same, so just gate on the new value being passed
                    // for proposedAPI check.
                    checkProposedApiEnabled(extension, 'notebookControllerAffinityHidden');
                }
                that._proxy.$updateNotebookPriority(handle, notebook.uri, priority);
            },
            // --- ipc
            onDidReceiveMessage: onDidReceiveMessage.event,
            postMessage(message, editor) {
                checkProposedApiEnabled(extension, 'notebookMessaging');
                return that._proxy.$postMessage(handle, editor && that._extHostNotebook.getIdByEditor(editor), message);
            },
            asWebviewUri(uri) {
                checkProposedApiEnabled(extension, 'notebookMessaging');
                return asWebviewUri(uri, that._initData.remote);
            },
        };
        this._kernelData.set(handle, {
            extensionId: extension.identifier,
            controller,
            onDidReceiveMessage,
            onDidChangeSelection,
            associatedNotebooks
        });
        return controller;
    }
    getIdByController(controller) {
        for (const [_, candidate] of this._kernelData) {
            if (candidate.controller === controller) {
                return createKernelId(candidate.extensionId, controller.id);
            }
        }
        return null;
    }
    createNotebookControllerDetectionTask(extension, viewType) {
        const handle = this._kernelDetectionTaskHandlePool++;
        const that = this;
        this._logService.trace(`NotebookControllerDetectionTask[${handle}], CREATED by ${extension.identifier.value}`);
        this._proxy.$addKernelDetectionTask(handle, viewType);
        const detectionTask = {
            dispose: () => {
                this._kernelDetectionTask.delete(handle);
                that._proxy.$removeKernelDetectionTask(handle);
            }
        };
        this._kernelDetectionTask.set(handle, detectionTask);
        return detectionTask;
    }
    registerKernelSourceActionProvider(extension, viewType, provider) {
        const handle = this._kernelSourceActionProviderHandlePool++;
        const eventHandle = typeof provider.onDidChangeNotebookKernelSourceActions === 'function' ? handle : undefined;
        const that = this;
        this._kernelSourceActionProviders.set(handle, provider);
        this._logService.trace(`NotebookKernelSourceActionProvider[${handle}], CREATED by ${extension.identifier.value}`);
        this._proxy.$addKernelSourceActionProvider(handle, handle, viewType);
        let subscription;
        if (eventHandle !== undefined) {
            subscription = provider.onDidChangeNotebookKernelSourceActions(_ => this._proxy.$emitNotebookKernelSourceActionsChangeEvent(eventHandle));
        }
        return {
            dispose: () => {
                this._kernelSourceActionProviders.delete(handle);
                that._proxy.$removeKernelSourceActionProvider(handle, handle);
                subscription?.dispose();
            }
        };
    }
    async $provideKernelSourceActions(handle, token) {
        const provider = this._kernelSourceActionProviders.get(handle);
        if (provider) {
            const disposables = new DisposableStore();
            const ret = await provider.provideNotebookKernelSourceActions(token);
            return (ret ?? []).map(item => extHostTypeConverters.NotebookKernelSourceAction.from(item, this._commands.converter, disposables));
        }
        return [];
    }
    $acceptNotebookAssociation(handle, uri, value) {
        const obj = this._kernelData.get(handle);
        if (obj) {
            // update data structure
            const notebook = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
            if (value) {
                obj.associatedNotebooks.set(notebook.uri, true);
            }
            else {
                obj.associatedNotebooks.delete(notebook.uri);
            }
            this._logService.trace(`NotebookController[${handle}] ASSOCIATE notebook`, notebook.uri.toString(), value);
            // send event
            obj.onDidChangeSelection.fire({
                selected: value,
                notebook: notebook.apiNotebook
            });
        }
    }
    async $executeCells(handle, uri, handles) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        const cells = [];
        for (const cellHandle of handles) {
            const cell = document.getCell(cellHandle);
            if (cell) {
                cells.push(cell.apiCell);
            }
        }
        try {
            this._logService.trace(`NotebookController[${handle}] EXECUTE cells`, document.uri.toString(), cells.length);
            await obj.controller.executeHandler.call(obj.controller, cells, document.apiNotebook, obj.controller);
        }
        catch (err) {
            //
            this._logService.error(`NotebookController[${handle}] execute cells FAILED`, err);
            console.error(err);
        }
    }
    async $cancelCells(handle, uri, handles) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        // cancel or interrupt depends on the controller. When an interrupt handler is used we
        // don't trigger the cancelation token of executions.
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        if (obj.controller.interruptHandler) {
            await obj.controller.interruptHandler.call(obj.controller, document.apiNotebook);
        }
        else {
            for (const cellHandle of handles) {
                const cell = document.getCell(cellHandle);
                if (cell) {
                    this._activeExecutions.get(cell.uri)?.cancel();
                }
            }
        }
        if (obj.controller.interruptHandler) {
            // If we're interrupting all cells, we also need to cancel the notebook level execution.
            const items = this._activeNotebookExecutions.get(document.uri);
            this._activeNotebookExecutions.delete(document.uri);
            if (handles.length && Array.isArray(items) && items.length) {
                items.forEach(d => d.dispose());
            }
        }
    }
    async $provideVariables(handle, requestId, notebookUri, parentId, kind, start, token) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            return;
        }
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(notebookUri));
        const variableProvider = obj.controller.variableProvider;
        if (!variableProvider) {
            return;
        }
        let parent = undefined;
        if (parentId !== undefined) {
            parent = this.variableStore[parentId];
            if (!parent) {
                // request for unknown parent
                return;
            }
        }
        else {
            // root request, clear store
            this.variableStore = {};
        }
        const requestKind = kind === 'named' ? NotebookVariablesRequestKind.Named : NotebookVariablesRequestKind.Indexed;
        const variableResults = variableProvider.provideVariables(document.apiNotebook, parent, requestKind, start, token);
        let resultCount = 0;
        for await (const result of variableResults) {
            if (token.isCancellationRequested) {
                return;
            }
            const variable = {
                id: this.id++,
                name: result.variable.name,
                value: result.variable.value,
                type: result.variable.type,
                interfaces: result.variable.interfaces,
                language: result.variable.language,
                expression: result.variable.expression,
                hasNamedChildren: result.hasNamedChildren,
                indexedChildrenCount: result.indexedChildrenCount,
                extensionId: obj.extensionId.value,
            };
            this.variableStore[variable.id] = result.variable;
            this._proxy.$receiveVariable(requestId, variable);
            if (resultCount++ >= variablePageSize) {
                return;
            }
        }
    }
    $acceptKernelMessageFromRenderer(handle, editorId, message) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        const editor = this._extHostNotebook.getEditorById(editorId);
        obj.onDidReceiveMessage.fire(Object.freeze({ editor: editor.apiEditor, message }));
    }
    $cellExecutionChanged(uri, cellHandle, state) {
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        const cell = document.getCell(cellHandle);
        if (cell) {
            const newState = state ? extHostTypeConverters.NotebookCellExecutionState.to(state) : ExtHostNotebookCellExecutionState.Idle;
            if (newState !== undefined) {
                this._onDidChangeCellExecutionState.fire({
                    cell: cell.apiCell,
                    state: newState
                });
            }
        }
    }
    // ---
    _createNotebookCellExecution(cell, controllerId) {
        if (cell.index < 0) {
            throw new Error('CANNOT execute cell that has been REMOVED from notebook');
        }
        const notebook = this._extHostNotebook.getNotebookDocument(cell.notebook.uri);
        const cellObj = notebook.getCellFromApiCell(cell);
        if (!cellObj) {
            throw new Error('invalid cell');
        }
        if (this._activeExecutions.has(cellObj.uri)) {
            throw new Error(`duplicate execution for ${cellObj.uri}`);
        }
        const execution = new NotebookCellExecutionTask(controllerId, cellObj, this._proxy);
        this._activeExecutions.set(cellObj.uri, execution);
        const listener = execution.onDidChangeState(() => {
            if (execution.state === NotebookCellExecutionTaskState.Resolved) {
                execution.dispose();
                listener.dispose();
                this._activeExecutions.delete(cellObj.uri);
            }
        });
        return execution.asApiObject();
    }
    // ---
    _createNotebookExecution(nb, controllerId) {
        const notebook = this._extHostNotebook.getNotebookDocument(nb.uri);
        const runningCell = nb.getCells().find(cell => {
            const apiCell = notebook.getCellFromApiCell(cell);
            return apiCell && this._activeExecutions.has(apiCell.uri);
        });
        if (runningCell) {
            throw new Error(`duplicate cell execution for ${runningCell.document.uri}`);
        }
        if (this._activeNotebookExecutions.has(notebook.uri)) {
            throw new Error(`duplicate notebook execution for ${notebook.uri}`);
        }
        const execution = new NotebookExecutionTask(controllerId, notebook, this._proxy);
        const listener = execution.onDidChangeState(() => {
            if (execution.state === NotebookExecutionTaskState.Resolved) {
                execution.dispose();
                listener.dispose();
                this._activeNotebookExecutions.delete(notebook.uri);
            }
        });
        this._activeNotebookExecutions.set(notebook.uri, [execution, listener]);
        return execution.asApiObject();
    }
};
ExtHostNotebookKernels = __decorate([
    __param(4, ILogService)
], ExtHostNotebookKernels);
export { ExtHostNotebookKernels };
var NotebookCellExecutionTaskState;
(function (NotebookCellExecutionTaskState) {
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Init"] = 0] = "Init";
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Started"] = 1] = "Started";
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Resolved"] = 2] = "Resolved";
})(NotebookCellExecutionTaskState || (NotebookCellExecutionTaskState = {}));
class NotebookCellExecutionTask extends Disposable {
    static { this.HANDLE = 0; }
    get state() { return this._state; }
    constructor(controllerId, _cell, _proxy) {
        super();
        this._cell = _cell;
        this._proxy = _proxy;
        this._handle = NotebookCellExecutionTask.HANDLE++;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._state = NotebookCellExecutionTaskState.Init;
        this._tokenSource = this._register(new CancellationTokenSource());
        this._collector = new TimeoutBasedCollector(10, updates => this.update(updates));
        this._executionOrder = _cell.internalMetadata.executionOrder;
        this._proxy.$createExecution(this._handle, controllerId, this._cell.notebook.uri, this._cell.handle);
    }
    cancel() {
        this._tokenSource.cancel();
    }
    async updateSoon(update) {
        await this._collector.addItem(update);
    }
    async update(update) {
        const updates = Array.isArray(update) ? update : [update];
        return this._proxy.$updateExecution(this._handle, new SerializableObjectWithBuffers(updates));
    }
    verifyStateForOutput() {
        if (this._state === NotebookCellExecutionTaskState.Init) {
            throw new Error('Must call start before modifying cell output');
        }
        if (this._state === NotebookCellExecutionTaskState.Resolved) {
            throw new Error('Cannot modify cell output after calling resolve');
        }
    }
    cellIndexToHandle(cellOrCellIndex) {
        let cell = this._cell;
        if (cellOrCellIndex) {
            cell = this._cell.notebook.getCellFromApiCell(cellOrCellIndex);
        }
        if (!cell) {
            throw new Error('INVALID cell');
        }
        return cell.handle;
    }
    validateAndConvertOutputs(items) {
        return items.map(output => {
            const newOutput = NotebookCellOutput.ensureUniqueMimeTypes(output.items, true);
            if (newOutput === output.items) {
                return extHostTypeConverters.NotebookCellOutput.from(output);
            }
            return extHostTypeConverters.NotebookCellOutput.from({
                items: newOutput,
                id: output.id,
                metadata: output.metadata
            });
        });
    }
    async updateOutputs(outputs, cell, append) {
        const handle = this.cellIndexToHandle(cell);
        const outputDtos = this.validateAndConvertOutputs(asArray(outputs));
        return this.updateSoon({
            editType: CellExecutionUpdateType.Output,
            cellHandle: handle,
            append,
            outputs: outputDtos
        });
    }
    async updateOutputItems(items, output, append) {
        items = NotebookCellOutput.ensureUniqueMimeTypes(asArray(items), true);
        return this.updateSoon({
            editType: CellExecutionUpdateType.OutputItems,
            items: items.map(extHostTypeConverters.NotebookCellOutputItem.from),
            outputId: output.id,
            append
        });
    }
    asApiObject() {
        const that = this;
        const result = {
            get token() { return that._tokenSource.token; },
            get cell() { return that._cell.apiCell; },
            get executionOrder() { return that._executionOrder; },
            set executionOrder(v) {
                that._executionOrder = v;
                that.update([{
                        editType: CellExecutionUpdateType.ExecutionState,
                        executionOrder: that._executionOrder
                    }]);
            },
            start(startTime) {
                if (that._state === NotebookCellExecutionTaskState.Resolved || that._state === NotebookCellExecutionTaskState.Started) {
                    throw new Error('Cannot call start again');
                }
                that._state = NotebookCellExecutionTaskState.Started;
                that._onDidChangeState.fire();
                that.update({
                    editType: CellExecutionUpdateType.ExecutionState,
                    runStartTime: startTime
                });
            },
            end(success, endTime, executionError) {
                if (that._state === NotebookCellExecutionTaskState.Resolved) {
                    throw new Error('Cannot call resolve twice');
                }
                that._state = NotebookCellExecutionTaskState.Resolved;
                that._onDidChangeState.fire();
                // The last update needs to be ordered correctly and applied immediately,
                // so we use updateSoon and immediately flush.
                that._collector.flush();
                const error = createSerializeableError(executionError);
                that._proxy.$completeExecution(that._handle, new SerializableObjectWithBuffers({
                    runEndTime: endTime,
                    lastRunSuccess: success,
                    error
                }));
            },
            clearOutput(cell) {
                that.verifyStateForOutput();
                return that.updateOutputs([], cell, false);
            },
            appendOutput(outputs, cell) {
                that.verifyStateForOutput();
                return that.updateOutputs(outputs, cell, true);
            },
            replaceOutput(outputs, cell) {
                that.verifyStateForOutput();
                return that.updateOutputs(outputs, cell, false);
            },
            appendOutputItems(items, output) {
                that.verifyStateForOutput();
                return that.updateOutputItems(items, output, true);
            },
            replaceOutputItems(items, output) {
                that.verifyStateForOutput();
                return that.updateOutputItems(items, output, false);
            }
        };
        return Object.freeze(result);
    }
}
function createSerializeableError(executionError) {
    const convertRange = (range) => (range ? {
        startLineNumber: range.start.line,
        startColumn: range.start.character,
        endLineNumber: range.end.line,
        endColumn: range.end.character
    } : undefined);
    const convertStackFrame = (frame) => ({
        uri: frame.uri,
        position: frame.position,
        label: frame.label
    });
    const error = executionError ? {
        name: executionError.name,
        message: executionError.message,
        stack: executionError.stack instanceof Array
            ? executionError.stack.map(frame => convertStackFrame(frame))
            : executionError.stack,
        location: convertRange(executionError.location),
        uri: executionError.uri
    } : undefined;
    return error;
}
var NotebookExecutionTaskState;
(function (NotebookExecutionTaskState) {
    NotebookExecutionTaskState[NotebookExecutionTaskState["Init"] = 0] = "Init";
    NotebookExecutionTaskState[NotebookExecutionTaskState["Started"] = 1] = "Started";
    NotebookExecutionTaskState[NotebookExecutionTaskState["Resolved"] = 2] = "Resolved";
})(NotebookExecutionTaskState || (NotebookExecutionTaskState = {}));
class NotebookExecutionTask extends Disposable {
    static { this.HANDLE = 0; }
    get state() { return this._state; }
    constructor(controllerId, _notebook, _proxy) {
        super();
        this._notebook = _notebook;
        this._proxy = _proxy;
        this._handle = NotebookExecutionTask.HANDLE++;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._state = NotebookExecutionTaskState.Init;
        this._tokenSource = this._register(new CancellationTokenSource());
        this._proxy.$createNotebookExecution(this._handle, controllerId, this._notebook.uri);
    }
    cancel() {
        this._tokenSource.cancel();
    }
    asApiObject() {
        const result = {
            start: () => {
                if (this._state === NotebookExecutionTaskState.Resolved || this._state === NotebookExecutionTaskState.Started) {
                    throw new Error('Cannot call start again');
                }
                this._state = NotebookExecutionTaskState.Started;
                this._onDidChangeState.fire();
                this._proxy.$beginNotebookExecution(this._handle);
            },
            end: () => {
                if (this._state === NotebookExecutionTaskState.Resolved) {
                    throw new Error('Cannot call resolve twice');
                }
                this._state = NotebookExecutionTaskState.Resolved;
                this._onDidChangeState.fire();
                this._proxy.$completeNotebookExecution(this._handle);
            },
        };
        return Object.freeze(result);
    }
}
class TimeoutBasedCollector {
    constructor(delay, callback) {
        this.delay = delay;
        this.callback = callback;
        this.batch = [];
        this.startedTimer = Date.now();
    }
    addItem(item) {
        this.batch.push(item);
        if (!this.currentDeferred) {
            this.currentDeferred = new DeferredPromise();
            this.startedTimer = Date.now();
            timeout(this.delay).then(() => {
                return this.flush();
            });
        }
        // This can be called by the extension repeatedly for a long time before the timeout is able to run.
        // Force a flush after the delay.
        if (Date.now() - this.startedTimer > this.delay) {
            return this.flush();
        }
        return this.currentDeferred.p;
    }
    flush() {
        if (this.batch.length === 0 || !this.currentDeferred) {
            return Promise.resolve();
        }
        const deferred = this.currentDeferred;
        this.currentDeferred = undefined;
        const batch = this.batch;
        this.batch = [];
        return this.callback(batch)
            .finally(() => deferred.complete());
    }
}
export function createKernelId(extensionIdentifier, id) {
    return `${extensionIdentifier.value}/${id}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rS2VybmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Tm90ZWJvb2tLZXJuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQXlCLE1BQU0sbURBQW1ELENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBeUYsV0FBVyxFQUFzRSxNQUFNLHVCQUF1QixDQUFDO0FBQy9NLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQW1CLE1BQU0sc0JBQXNCLENBQUM7QUFJekcsT0FBTyxLQUFLLHFCQUFxQixNQUFNLDRCQUE0QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSwwQkFBMEIsSUFBSSxpQ0FBaUMsRUFBRSxrQkFBa0IsRUFBRSwyQkFBMkIsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FB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
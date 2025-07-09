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
var NotebookKernelService_1;
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { LRUCache, ResourceMap } from '../../../../../base/common/map.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { URI } from '../../../../../base/common/uri.js';
import { INotebookService } from '../../common/notebookService.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { Schemas } from '../../../../../base/common/network.js';
import { getActiveWindow, runWhenWindowIdle } from '../../../../../base/browser/dom.js';
class KernelInfo {
    static { this._logicClock = 0; }
    constructor(kernel) {
        this.notebookPriorities = new ResourceMap();
        this.kernel = kernel;
        this.score = -1;
        this.time = KernelInfo._logicClock++;
    }
}
class NotebookTextModelLikeId {
    static str(k) {
        return `${k.notebookType}/${k.uri.toString()}`;
    }
    static obj(s) {
        const idx = s.indexOf('/');
        return {
            notebookType: s.substring(0, idx),
            uri: URI.parse(s.substring(idx + 1))
        };
    }
}
class SourceAction extends Disposable {
    constructor(action, model, isPrimary) {
        super();
        this.action = action;
        this.model = model;
        this.isPrimary = isPrimary;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
    }
    async runAction() {
        if (this.execution) {
            return this.execution;
        }
        this.execution = this._runAction();
        this._onDidChangeState.fire();
        await this.execution;
        this.execution = undefined;
        this._onDidChangeState.fire();
    }
    async _runAction() {
        try {
            await this.action.run({
                uri: this.model.uri,
                $mid: 14 /* MarshalledId.NotebookActionContext */
            });
        }
        catch (error) {
            console.warn(`Kernel source command failed: ${error}`);
        }
    }
}
let NotebookKernelService = class NotebookKernelService extends Disposable {
    static { NotebookKernelService_1 = this; }
    static { this._storageNotebookBinding = 'notebook.controller2NotebookBindings'; }
    constructor(_notebookService, _storageService, _menuService, _contextKeyService) {
        super();
        this._notebookService = _notebookService;
        this._storageService = _storageService;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._kernels = new Map();
        this._notebookBindings = new LRUCache(1000, 0.7);
        this._onDidChangeNotebookKernelBinding = this._register(new Emitter());
        this._onDidAddKernel = this._register(new Emitter());
        this._onDidRemoveKernel = this._register(new Emitter());
        this._onDidChangeNotebookAffinity = this._register(new Emitter());
        this._onDidChangeSourceActions = this._register(new Emitter());
        this._onDidNotebookVariablesChange = this._register(new Emitter());
        this._kernelSources = new Map();
        this._kernelSourceActionsUpdates = new Map();
        this._kernelDetectionTasks = new Map();
        this._onDidChangeKernelDetectionTasks = this._register(new Emitter());
        this._kernelSourceActionProviders = new Map();
        this.onDidChangeSelectedNotebooks = this._onDidChangeNotebookKernelBinding.event;
        this.onDidAddKernel = this._onDidAddKernel.event;
        this.onDidRemoveKernel = this._onDidRemoveKernel.event;
        this.onDidChangeNotebookAffinity = this._onDidChangeNotebookAffinity.event;
        this.onDidChangeSourceActions = this._onDidChangeSourceActions.event;
        this.onDidChangeKernelDetectionTasks = this._onDidChangeKernelDetectionTasks.event;
        this.onDidNotebookVariablesUpdate = this._onDidNotebookVariablesChange.event;
        // auto associate kernels to new notebook documents, also emit event when
        // a notebook has been closed (but don't update the memento)
        this._register(_notebookService.onDidAddNotebookDocument(this._tryAutoBindNotebook, this));
        this._register(_notebookService.onWillRemoveNotebookDocument(notebook => {
            const id = NotebookTextModelLikeId.str(notebook);
            const kernelId = this._notebookBindings.get(id);
            if (kernelId && notebook.uri.scheme === Schemas.untitled) {
                this.selectKernelForNotebook(undefined, notebook);
            }
            this._kernelSourceActionsUpdates.get(id)?.dispose();
            this._kernelSourceActionsUpdates.delete(id);
        }));
        // restore from storage
        try {
            const data = JSON.parse(this._storageService.get(NotebookKernelService_1._storageNotebookBinding, 1 /* StorageScope.WORKSPACE */, '[]'));
            this._notebookBindings.fromJSON(data);
        }
        catch {
            // ignore
        }
    }
    dispose() {
        this._kernels.clear();
        this._kernelSources.forEach(v => {
            v.menu.dispose();
            v.actions.forEach(a => a[1].dispose());
        });
        this._kernelSourceActionsUpdates.forEach(v => {
            v.dispose();
        });
        this._kernelSourceActionsUpdates.clear();
        super.dispose();
    }
    _persistMementos() {
        this._persistSoonHandle?.dispose();
        this._persistSoonHandle = runWhenWindowIdle(getActiveWindow(), () => {
            this._storageService.store(NotebookKernelService_1._storageNotebookBinding, JSON.stringify(this._notebookBindings), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }, 100);
    }
    static _score(kernel, notebook) {
        if (kernel.viewType === '*') {
            return 5;
        }
        else if (kernel.viewType === notebook.notebookType) {
            return 10;
        }
        else {
            return 0;
        }
    }
    _tryAutoBindNotebook(notebook, onlyThisKernel) {
        const id = this._notebookBindings.get(NotebookTextModelLikeId.str(notebook));
        if (!id) {
            // no kernel associated
            return;
        }
        const existingKernel = this._kernels.get(id);
        if (!existingKernel || !NotebookKernelService_1._score(existingKernel.kernel, notebook)) {
            // associated kernel not known, not matching
            return;
        }
        if (!onlyThisKernel || existingKernel.kernel === onlyThisKernel) {
            this._onDidChangeNotebookKernelBinding.fire({ notebook: notebook.uri, oldKernel: undefined, newKernel: existingKernel.kernel.id });
        }
    }
    notifyVariablesChange(notebookUri) {
        this._onDidNotebookVariablesChange.fire(notebookUri);
    }
    registerKernel(kernel) {
        if (this._kernels.has(kernel.id)) {
            throw new Error(`NOTEBOOK CONTROLLER with id '${kernel.id}' already exists`);
        }
        this._kernels.set(kernel.id, new KernelInfo(kernel));
        this._onDidAddKernel.fire(kernel);
        // auto associate the new kernel to existing notebooks it was
        // associated to in the past.
        for (const notebook of this._notebookService.getNotebookTextModels()) {
            this._tryAutoBindNotebook(notebook, kernel);
        }
        return toDisposable(() => {
            if (this._kernels.delete(kernel.id)) {
                this._onDidRemoveKernel.fire(kernel);
            }
            for (const [key, candidate] of Array.from(this._notebookBindings)) {
                if (candidate === kernel.id) {
                    this._onDidChangeNotebookKernelBinding.fire({ notebook: NotebookTextModelLikeId.obj(key).uri, oldKernel: kernel.id, newKernel: undefined });
                }
            }
        });
    }
    getMatchingKernel(notebook) {
        // all applicable kernels
        const kernels = [];
        for (const info of this._kernels.values()) {
            const score = NotebookKernelService_1._score(info.kernel, notebook);
            if (score) {
                kernels.push({
                    score,
                    kernel: info.kernel,
                    instanceAffinity: info.notebookPriorities.get(notebook.uri) ?? 1 /* vscode.NotebookControllerPriority.Default */,
                });
            }
        }
        kernels
            .sort((a, b) => b.instanceAffinity - a.instanceAffinity || a.score - b.score || a.kernel.label.localeCompare(b.kernel.label));
        const all = kernels.map(obj => obj.kernel);
        // bound kernel
        const selectedId = this._notebookBindings.get(NotebookTextModelLikeId.str(notebook));
        const selected = selectedId ? this._kernels.get(selectedId)?.kernel : undefined;
        const suggestions = kernels.filter(item => item.instanceAffinity > 1).map(item => item.kernel);
        const hidden = kernels.filter(item => item.instanceAffinity < 0).map(item => item.kernel);
        return { all, selected, suggestions, hidden };
    }
    getSelectedOrSuggestedKernel(notebook) {
        const info = this.getMatchingKernel(notebook);
        if (info.selected) {
            return info.selected;
        }
        const preferred = info.all.filter(kernel => this._kernels.get(kernel.id)?.notebookPriorities.get(notebook.uri) === 2 /* vscode.NotebookControllerPriority.Preferred */);
        if (preferred.length === 1) {
            return preferred[0];
        }
        return info.all.length === 1 ? info.all[0] : undefined;
    }
    // a notebook has one kernel, a kernel has N notebooks
    // notebook <-1----N-> kernel
    selectKernelForNotebook(kernel, notebook) {
        const key = NotebookTextModelLikeId.str(notebook);
        const oldKernel = this._notebookBindings.get(key);
        if (oldKernel !== kernel?.id) {
            if (kernel) {
                this._notebookBindings.set(key, kernel.id);
            }
            else {
                this._notebookBindings.delete(key);
            }
            this._onDidChangeNotebookKernelBinding.fire({ notebook: notebook.uri, oldKernel, newKernel: kernel?.id });
            this._persistMementos();
        }
    }
    preselectKernelForNotebook(kernel, notebook) {
        const key = NotebookTextModelLikeId.str(notebook);
        const oldKernel = this._notebookBindings.get(key);
        if (oldKernel !== kernel?.id) {
            this._notebookBindings.set(key, kernel.id);
            this._persistMementos();
        }
    }
    updateKernelNotebookAffinity(kernel, notebook, preference) {
        const info = this._kernels.get(kernel.id);
        if (!info) {
            throw new Error(`UNKNOWN kernel '${kernel.id}'`);
        }
        if (preference === undefined) {
            info.notebookPriorities.delete(notebook);
        }
        else {
            info.notebookPriorities.set(notebook, preference);
        }
        this._onDidChangeNotebookAffinity.fire();
    }
    getRunningSourceActions(notebook) {
        const id = NotebookTextModelLikeId.str(notebook);
        const existingInfo = this._kernelSources.get(id);
        if (existingInfo) {
            return existingInfo.actions.filter(action => action[0].execution).map(action => action[0]);
        }
        return [];
    }
    getSourceActions(notebook, contextKeyService) {
        contextKeyService = contextKeyService ?? this._contextKeyService;
        const id = NotebookTextModelLikeId.str(notebook);
        const existingInfo = this._kernelSources.get(id);
        if (existingInfo) {
            return existingInfo.actions.map(a => a[0]);
        }
        const sourceMenu = this._register(this._menuService.createMenu(MenuId.NotebookKernelSource, contextKeyService));
        const info = { menu: sourceMenu, actions: [] };
        const loadActionsFromMenu = (menu, document) => {
            const groups = menu.getActions({ shouldForwardArgs: true });
            const sourceActions = [];
            groups.forEach(group => {
                const isPrimary = /^primary/.test(group[0]);
                group[1].forEach(action => {
                    const sourceAction = new SourceAction(action, document, isPrimary);
                    const stateChangeListener = sourceAction.onDidChangeState(() => {
                        this._onDidChangeSourceActions.fire({
                            notebook: document.uri,
                            viewType: document.notebookType,
                        });
                    });
                    sourceActions.push([sourceAction, stateChangeListener]);
                });
            });
            info.actions = sourceActions;
            this._kernelSources.set(id, info);
            this._onDidChangeSourceActions.fire({ notebook: document.uri, viewType: document.notebookType });
        };
        this._kernelSourceActionsUpdates.get(id)?.dispose();
        this._kernelSourceActionsUpdates.set(id, sourceMenu.onDidChange(() => {
            loadActionsFromMenu(sourceMenu, notebook);
        }));
        loadActionsFromMenu(sourceMenu, notebook);
        return info.actions.map(a => a[0]);
    }
    registerNotebookKernelDetectionTask(task) {
        const notebookType = task.notebookType;
        const all = this._kernelDetectionTasks.get(notebookType) ?? [];
        all.push(task);
        this._kernelDetectionTasks.set(notebookType, all);
        this._onDidChangeKernelDetectionTasks.fire(notebookType);
        return toDisposable(() => {
            const all = this._kernelDetectionTasks.get(notebookType) ?? [];
            const idx = all.indexOf(task);
            if (idx >= 0) {
                all.splice(idx, 1);
                this._kernelDetectionTasks.set(notebookType, all);
                this._onDidChangeKernelDetectionTasks.fire(notebookType);
            }
        });
    }
    getKernelDetectionTasks(notebook) {
        return this._kernelDetectionTasks.get(notebook.notebookType) ?? [];
    }
    registerKernelSourceActionProvider(viewType, provider) {
        const providers = this._kernelSourceActionProviders.get(viewType) ?? [];
        providers.push(provider);
        this._kernelSourceActionProviders.set(viewType, providers);
        this._onDidChangeSourceActions.fire({ viewType: viewType });
        const eventEmitterDisposable = provider.onDidChangeSourceActions?.(() => {
            this._onDidChangeSourceActions.fire({ viewType: viewType });
        });
        return toDisposable(() => {
            const providers = this._kernelSourceActionProviders.get(viewType) ?? [];
            const idx = providers.indexOf(provider);
            if (idx >= 0) {
                providers.splice(idx, 1);
                this._kernelSourceActionProviders.set(viewType, providers);
            }
            eventEmitterDisposable?.dispose();
        });
    }
    /**
     * Get kernel source actions from providers
     */
    getKernelSourceActions2(notebook) {
        const viewType = notebook.notebookType;
        const providers = this._kernelSourceActionProviders.get(viewType) ?? [];
        const promises = providers.map(provider => provider.provideKernelSourceActions());
        return Promise.all(promises).then(actions => {
            return actions.reduce((a, b) => a.concat(b), []);
        });
    }
};
NotebookKernelService = NotebookKernelService_1 = __decorate([
    __param(0, INotebookService),
    __param(1, IStorageService),
    __param(2, IMenuService),
    __param(3, IContextKeyService)
], NotebookKernelService);
export { NotebookKernelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rS2VybmVsU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbkUsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUc3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXhGLE1BQU0sVUFBVTthQUVBLGdCQUFXLEdBQUcsQ0FBQyxBQUFKLENBQUs7SUFRL0IsWUFBWSxNQUF1QjtRQUYxQix1QkFBa0IsR0FBRyxJQUFJLFdBQVcsRUFBVSxDQUFDO1FBR3ZELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxL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
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
var NotebookKernelHistoryService_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { LinkedMap } from '../../../../../base/common/map.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { INotebookKernelHistoryService, INotebookKernelService } from '../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
const MAX_KERNELS_IN_HISTORY = 5;
let NotebookKernelHistoryService = class NotebookKernelHistoryService extends Disposable {
    static { NotebookKernelHistoryService_1 = this; }
    static { this.STORAGE_KEY = 'notebook.kernelHistory'; }
    constructor(_storageService, _notebookKernelService, _notebookLoggingService) {
        super();
        this._storageService = _storageService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookLoggingService = _notebookLoggingService;
        this._mostRecentKernelsMap = {};
        this._loadState();
        this._register(this._storageService.onWillSaveState(() => this._saveState()));
        this._register(this._storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, NotebookKernelHistoryService_1.STORAGE_KEY, this._store)(() => {
            this._loadState();
        }));
    }
    getKernels(notebook) {
        const allAvailableKernels = this._notebookKernelService.getMatchingKernel(notebook);
        const allKernels = allAvailableKernels.all;
        const selectedKernel = allAvailableKernels.selected;
        // We will suggest the only kernel
        const suggested = allAvailableKernels.all.length === 1 ? allAvailableKernels.all[0] : undefined;
        this._notebookLoggingService.debug('History', `getMatchingKernels: ${allAvailableKernels.all.length} kernels available for ${notebook.uri.path}. Selected: ${allAvailableKernels.selected?.label}. Suggested: ${suggested?.label}`);
        const mostRecentKernelIds = this._mostRecentKernelsMap[notebook.notebookType] ? [...this._mostRecentKernelsMap[notebook.notebookType].values()] : [];
        const all = mostRecentKernelIds.map(kernelId => allKernels.find(kernel => kernel.id === kernelId)).filter(kernel => !!kernel);
        this._notebookLoggingService.debug('History', `mru: ${mostRecentKernelIds.length} kernels in history, ${all.length} registered already.`);
        return {
            selected: selectedKernel ?? suggested,
            all
        };
    }
    addMostRecentKernel(kernel) {
        const key = kernel.id;
        const viewType = kernel.viewType;
        const recentKeynels = this._mostRecentKernelsMap[viewType] ?? new LinkedMap();
        recentKeynels.set(key, key, 1 /* Touch.AsOld */);
        if (recentKeynels.size > MAX_KERNELS_IN_HISTORY) {
            const reserved = [...recentKeynels.entries()].slice(0, MAX_KERNELS_IN_HISTORY);
            recentKeynels.fromJSON(reserved);
        }
        this._mostRecentKernelsMap[viewType] = recentKeynels;
    }
    _saveState() {
        let notEmpty = false;
        for (const [_, kernels] of Object.entries(this._mostRecentKernelsMap)) {
            notEmpty = notEmpty || kernels.size > 0;
        }
        if (notEmpty) {
            const serialized = this._serialize();
            this._storageService.store(NotebookKernelHistoryService_1.STORAGE_KEY, JSON.stringify(serialized), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        }
        else {
            this._storageService.remove(NotebookKernelHistoryService_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
    }
    _loadState() {
        const serialized = this._storageService.get(NotebookKernelHistoryService_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (serialized) {
            try {
                this._deserialize(JSON.parse(serialized));
            }
            catch (e) {
                this._mostRecentKernelsMap = {};
            }
        }
        else {
            this._mostRecentKernelsMap = {};
        }
    }
    _serialize() {
        const result = Object.create(null);
        for (const [viewType, kernels] of Object.entries(this._mostRecentKernelsMap)) {
            result[viewType] = {
                entries: [...kernels.values()]
            };
        }
        return result;
    }
    _deserialize(serialized) {
        this._mostRecentKernelsMap = {};
        for (const [viewType, kernels] of Object.entries(serialized)) {
            const linkedMap = new LinkedMap();
            const mapValues = [];
            for (const entry of kernels.entries) {
                mapValues.push([entry, entry]);
            }
            linkedMap.fromJSON(mapValues);
            this._mostRecentKernelsMap[viewType] = linkedMap;
        }
    }
    _clear() {
        this._mostRecentKernelsMap = {};
        this._saveState();
    }
};
NotebookKernelHistoryService = NotebookKernelHistoryService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, INotebookKernelService),
    __param(2, INotebookLoggingService)
], NotebookKernelHistoryService);
export { NotebookKernelHistoryService };
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.clearNotebookKernelsMRUCache',
            title: localize2('workbench.notebook.clearNotebookKernelsMRUCache', "Clear Notebook Kernels MRU Cache"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const historyService = accessor.get(INotebookKernelHistoryService);
        historyService._clear();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxIaXN0b3J5U2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0tlcm5lbEhpc3RvcnlTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQVMsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQW1CLDZCQUE2QixFQUFFLHNCQUFzQixFQUEwQixNQUFNLHVDQUF1QyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBVWpGLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFDO0FBRTFCLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTs7YUFHNUMsZ0JBQVcsR0FBRyx3QkFBd0IsQUFBM0IsQ0FBNEI7SUFHdEQsWUFBNkIsZUFBaUQsRUFDckQsc0JBQStELEVBQzlELHVCQUFpRTtRQUMxRixLQUFLLEVBQUUsQ0FBQztRQUhxQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDcEMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtRQUM3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
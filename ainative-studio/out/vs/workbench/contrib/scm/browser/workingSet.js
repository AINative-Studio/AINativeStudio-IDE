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
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { getProviderKey } from './util.js';
import { ISCMService } from '../common/scm.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
let SCMWorkingSetController = class SCMWorkingSetController extends Disposable {
    static { this.ID = 'workbench.contrib.scmWorkingSets'; }
    constructor(configurationService, editorGroupsService, scmService, storageService, layoutService) {
        super();
        this.configurationService = configurationService;
        this.editorGroupsService = editorGroupsService;
        this.scmService = scmService;
        this.storageService = storageService;
        this.layoutService = layoutService;
        this._repositoryDisposables = new DisposableMap();
        this._enabledConfig = observableConfigValue('scm.workingSets.enabled', false, this.configurationService);
        this._store.add(autorunWithStore((reader, store) => {
            if (!this._enabledConfig.read(reader)) {
                this.storageService.remove('scm.workingSets', 1 /* StorageScope.WORKSPACE */);
                this._repositoryDisposables.clearAndDisposeAll();
                return;
            }
            this._workingSets = this._loadWorkingSets();
            this.scmService.onDidAddRepository(this._onDidAddRepository, this, store);
            this.scmService.onDidRemoveRepository(this._onDidRemoveRepository, this, store);
            for (const repository of this.scmService.repositories) {
                this._onDidAddRepository(repository);
            }
        }));
    }
    _onDidAddRepository(repository) {
        const disposables = new DisposableStore();
        const historyItemRefId = derived(reader => {
            const historyProvider = repository.provider.historyProvider.read(reader);
            const historyItemRef = historyProvider?.historyItemRef.read(reader);
            return historyItemRef?.id;
        });
        disposables.add(autorun(async (reader) => {
            const historyItemRefIdValue = historyItemRefId.read(reader);
            if (!historyItemRefIdValue) {
                return;
            }
            const providerKey = getProviderKey(repository.provider);
            const repositoryWorkingSets = this._workingSets.get(providerKey);
            if (!repositoryWorkingSets) {
                this._workingSets.set(providerKey, { currentHistoryItemGroupId: historyItemRefIdValue, editorWorkingSets: new Map() });
                return;
            }
            // Editors for the current working set are automatically restored
            if (repositoryWorkingSets.currentHistoryItemGroupId === historyItemRefIdValue) {
                return;
            }
            // Save the working set
            this._saveWorkingSet(providerKey, historyItemRefIdValue, repositoryWorkingSets);
            // Restore the working set
            await this._restoreWorkingSet(providerKey, historyItemRefIdValue);
        }));
        this._repositoryDisposables.set(repository, disposables);
    }
    _onDidRemoveRepository(repository) {
        this._repositoryDisposables.deleteAndDispose(repository);
    }
    _loadWorkingSets() {
        const workingSets = new Map();
        const workingSetsRaw = this.storageService.get('scm.workingSets', 1 /* StorageScope.WORKSPACE */);
        if (!workingSetsRaw) {
            return workingSets;
        }
        for (const serializedWorkingSet of JSON.parse(workingSetsRaw)) {
            workingSets.set(serializedWorkingSet.providerKey, {
                currentHistoryItemGroupId: serializedWorkingSet.currentHistoryItemGroupId,
                editorWorkingSets: new Map(serializedWorkingSet.editorWorkingSets)
            });
        }
        return workingSets;
    }
    _saveWorkingSet(providerKey, currentHistoryItemGroupId, repositoryWorkingSets) {
        const previousHistoryItemGroupId = repositoryWorkingSets.currentHistoryItemGroupId;
        const editorWorkingSets = repositoryWorkingSets.editorWorkingSets;
        const editorWorkingSet = this.editorGroupsService.saveWorkingSet(previousHistoryItemGroupId);
        this._workingSets.set(providerKey, { currentHistoryItemGroupId, editorWorkingSets: editorWorkingSets.set(previousHistoryItemGroupId, editorWorkingSet) });
        // Save to storage
        const workingSets = [];
        for (const [providerKey, { currentHistoryItemGroupId, editorWorkingSets }] of this._workingSets) {
            workingSets.push({ providerKey, currentHistoryItemGroupId, editorWorkingSets: [...editorWorkingSets] });
        }
        this.storageService.store('scm.workingSets', JSON.stringify(workingSets), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async _restoreWorkingSet(providerKey, currentHistoryItemGroupId) {
        const workingSets = this._workingSets.get(providerKey);
        if (!workingSets) {
            return;
        }
        let editorWorkingSetId = workingSets.editorWorkingSets.get(currentHistoryItemGroupId);
        if (!editorWorkingSetId && this.configurationService.getValue('scm.workingSets.default') === 'empty') {
            editorWorkingSetId = 'empty';
        }
        if (editorWorkingSetId) {
            // Applying a working set can be the result of a user action that has been
            // initiated from the terminal (ex: switching branches). As such, we want
            // to preserve the focus in the terminal. This does not cover the scenario
            // in which the terminal is in the editor part.
            const preserveFocus = this.layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
            await this.editorGroupsService.applyWorkingSet(editorWorkingSetId, { preserveFocus });
        }
    }
    dispose() {
        this._repositoryDisposables.dispose();
        super.dispose();
    }
};
SCMWorkingSetController = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorGroupsService),
    __param(2, ISCMService),
    __param(3, IStorageService),
    __param(4, IWorkbenchLayoutService)
], SCMWorkingSetController);
export { SCMWorkingSetController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ1NldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci93b3JraW5nU2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFlLE1BQU0sdUNBQXVDLENBQUM7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQzNDLE9BQU8sRUFBa0IsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFxQixNQUFNLHdEQUF3RCxDQUFDO0FBQ2pILE9BQU8sRUFBRSx1QkFBdUIsRUFBUyxNQUFNLG1EQUFtRCxDQUFDO0FBYTVGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTthQUN0QyxPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXNDO0lBT3hELFlBQ3dCLG9CQUE0RCxFQUM3RCxtQkFBMEQsRUFDbkUsVUFBd0MsRUFDcEMsY0FBZ0QsRUFDeEMsYUFBdUQ7UUFFaEYsS0FBSyxFQUFFLENBQUM7UUFOZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM1Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ2xE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
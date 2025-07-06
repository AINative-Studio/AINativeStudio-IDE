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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ISCMViewService, ISCMService } from '../common/scm.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SCMMenus } from './menus.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { debounce } from '../../../../base/common/decorators.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { compareFileNames, comparePaths } from '../../../../base/common/comparers.js';
import { basename } from '../../../../base/common/resources.js';
import { binarySearch } from '../../../../base/common/arrays.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { derivedObservableWithCache, derivedOpts, latestChangedValue, observableFromEventOpts, observableValue } from '../../../../base/common/observable.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
function getProviderStorageKey(provider) {
    return `${provider.contextValue}:${provider.label}${provider.rootUri ? `:${provider.rootUri.toString()}` : ''}`;
}
function getRepositoryName(workspaceContextService, repository) {
    if (!repository.provider.rootUri) {
        return repository.provider.label;
    }
    const folder = workspaceContextService.getWorkspaceFolder(repository.provider.rootUri);
    return folder?.uri.toString() === repository.provider.rootUri.toString() ? folder.name : basename(repository.provider.rootUri);
}
export const RepositoryContextKeys = {
    RepositorySortKey: new RawContextKey('scmRepositorySortKey', "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */),
};
let RepositoryPicker = class RepositoryPicker {
    constructor(_placeHolder, _autoQuickItemDescription, _quickInputService, _scmViewService) {
        this._placeHolder = _placeHolder;
        this._autoQuickItemDescription = _autoQuickItemDescription;
        this._quickInputService = _quickInputService;
        this._scmViewService = _scmViewService;
        this._autoQuickPickItem = {
            label: localize('auto', "Auto"),
            description: this._autoQuickItemDescription,
            repository: 'auto'
        };
    }
    async pickRepository() {
        const picks = [
            this._autoQuickPickItem,
            { type: 'separator' }
        ];
        picks.push(...this._scmViewService.repositories.map(r => ({
            label: r.provider.name,
            description: r.provider.rootUri?.fsPath,
            iconClass: ThemeIcon.asClassName(Codicon.repo),
            repository: r
        })));
        return this._quickInputService.pick(picks, { placeHolder: this._placeHolder });
    }
};
RepositoryPicker = __decorate([
    __param(2, IQuickInputService),
    __param(3, ISCMViewService)
], RepositoryPicker);
export { RepositoryPicker };
let SCMViewService = class SCMViewService {
    get repositories() {
        return this._repositories.map(r => r.repository);
    }
    get visibleRepositories() {
        // In order to match the legacy behaviour, when the repositories are sorted by discovery time,
        // the visible repositories are sorted by the selection index instead of the discovery time.
        if (this._repositoriesSortKey === "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */) {
            return this._repositories.filter(r => r.selectionIndex !== -1)
                .sort((r1, r2) => r1.selectionIndex - r2.selectionIndex)
                .map(r => r.repository);
        }
        return this._repositories
            .filter(r => r.selectionIndex !== -1)
            .map(r => r.repository);
    }
    set visibleRepositories(visibleRepositories) {
        const set = new Set(visibleRepositories);
        const added = new Set();
        const removed = new Set();
        for (const repositoryView of this._repositories) {
            // Selected -> !Selected
            if (!set.has(repositoryView.repository) && repositoryView.selectionIndex !== -1) {
                repositoryView.selectionIndex = -1;
                removed.add(repositoryView.repository);
            }
            // Selected | !Selected -> Selected
            if (set.has(repositoryView.repository)) {
                if (repositoryView.selectionIndex === -1) {
                    added.add(repositoryView.repository);
                }
                repositoryView.selectionIndex = visibleRepositories.indexOf(repositoryView.repository);
            }
        }
        if (added.size === 0 && removed.size === 0) {
            return;
        }
        this._onDidSetVisibleRepositories.fire({ added, removed });
        // Update focus if the focused repository is not visible anymore
        if (this._repositories.find(r => r.focused && r.selectionIndex === -1)) {
            this.focus(this._repositories.find(r => r.selectionIndex !== -1)?.repository);
        }
    }
    get focusedRepository() {
        return this._repositories.find(r => r.focused)?.repository;
    }
    constructor(scmService, contextKeyService, editorService, extensionService, instantiationService, configurationService, storageService, workspaceContextService) {
        this.scmService = scmService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.workspaceContextService = workspaceContextService;
        this.didFinishLoading = false;
        this.didSelectRepository = false;
        this.disposables = new DisposableStore();
        this._repositories = [];
        this._onDidChangeRepositories = new Emitter();
        this.onDidChangeRepositories = this._onDidChangeRepositories.event;
        this._onDidSetVisibleRepositories = new Emitter();
        this.onDidChangeVisibleRepositories = Event.any(this._onDidSetVisibleRepositories.event, Event.debounce(this._onDidChangeRepositories.event, (last, e) => {
            if (!last) {
                return e;
            }
            const added = new Set(last.added);
            const removed = new Set(last.removed);
            for (const repository of e.added) {
                if (removed.has(repository)) {
                    removed.delete(repository);
                }
                else {
                    added.add(repository);
                }
            }
            for (const repository of e.removed) {
                if (added.has(repository)) {
                    added.delete(repository);
                }
                else {
                    removed.add(repository);
                }
            }
            return { added, removed };
        }, 0, undefined, undefined, undefined, this.disposables));
        this._onDidFocusRepository = new Emitter();
        this.onDidFocusRepository = this._onDidFocusRepository.event;
        this.menus = instantiationService.createInstance(SCMMenus);
        this._focusedRepositoryObs = observableFromEventOpts({
            owner: this,
            equalsFn: () => false
        }, this.onDidFocusRepository, () => this.focusedRepository);
        this._activeEditorObs = observableFromEventOpts({
            owner: this,
            equalsFn: () => false
        }, this.editorService.onDidActiveEditorChange, () => this.editorService.activeEditor);
        this._activeEditorRepositoryObs = derivedObservableWithCache(this, (reader, lastValue) => {
            const activeEditor = this._activeEditorObs.read(reader);
            const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
            if (!activeResource) {
                return lastValue;
            }
            const repository = this.scmService.getRepository(activeResource);
            if (!repository) {
                return lastValue;
            }
            return Object.create(repository);
        });
        this._activeRepositoryPinnedObs = observableValue(this, undefined);
        this._activeRepositoryObs = latestChangedValue(this, [this._activeEditorRepositoryObs, this._focusedRepositoryObs]);
        this.activeRepository = derivedOpts({
            owner: this,
            equalsFn: (r1, r2) => r1?.id === r2?.id
        }, reader => {
            const activeRepository = this._activeRepositoryObs.read(reader);
            const activeRepositoryPinned = this._activeRepositoryPinnedObs.read(reader);
            return activeRepositoryPinned ?? activeRepository;
        });
        try {
            this.previousState = JSON.parse(storageService.get('scm:view:visibleRepositories', 1 /* StorageScope.WORKSPACE */, ''));
        }
        catch {
            // noop
        }
        this._repositoriesSortKey = this.previousState?.sortKey ?? this.getViewSortOrder();
        this._sortKeyContextKey = RepositoryContextKeys.RepositorySortKey.bindTo(contextKeyService);
        this._sortKeyContextKey.set(this._repositoriesSortKey);
        scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposables);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        for (const repository of scmService.repositories) {
            this.onDidAddRepository(repository);
        }
        storageService.onWillSaveState(this.onWillSaveState, this, this.disposables);
        // Maintain repository selection when the extension host restarts.
        // Extension host is restarted after installing an extension update
        // or during a profile switch.
        extensionService.onWillStop(() => {
            this.onWillSaveState();
            this.didFinishLoading = false;
        }, this, this.disposables);
    }
    onDidAddRepository(repository) {
        if (!this.didFinishLoading) {
            this.eventuallyFinishLoading();
        }
        const repositoryView = {
            repository, discoveryTime: Date.now(), focused: false, selectionIndex: -1
        };
        let removed = Iterable.empty();
        if (this.previousState && !this.didFinishLoading) {
            const index = this.previousState.all.indexOf(getProviderStorageKey(repository.provider));
            if (index === -1) {
                // This repository is not part of the previous state which means that it
                // was either manually closed in the previous session, or the repository
                // was added after the previous session.In this case, we should select all
                // of the repositories.
                const added = [];
                this.insertRepositoryView(this._repositories, repositoryView);
                this._repositories.forEach((repositoryView, index) => {
                    if (repositoryView.selectionIndex === -1) {
                        added.push(repositoryView.repository);
                    }
                    repositoryView.selectionIndex = index;
                });
                this._onDidChangeRepositories.fire({ added, removed: Iterable.empty() });
                this.didSelectRepository = false;
                return;
            }
            if (this.previousState.visible.indexOf(index) === -1) {
                // Explicit selection started
                if (this.didSelectRepository) {
                    this.insertRepositoryView(this._repositories, repositoryView);
                    this._onDidChangeRepositories.fire({ added: Iterable.empty(), removed: Iterable.empty() });
                    return;
                }
            }
            else {
                // First visible repository
                if (!this.didSelectRepository) {
                    removed = [...this.visibleRepositories];
                    this._repositories.forEach(r => {
                        r.focused = false;
                        r.selectionIndex = -1;
                    });
                    this.didSelectRepository = true;
                }
            }
        }
        const maxSelectionIndex = this.getMaxSelectionIndex();
        this.insertRepositoryView(this._repositories, { ...repositoryView, selectionIndex: maxSelectionIndex + 1 });
        this._onDidChangeRepositories.fire({ added: [repositoryView.repository], removed });
        if (!this._repositories.find(r => r.focused)) {
            this.focus(repository);
        }
    }
    onDidRemoveRepository(repository) {
        if (!this.didFinishLoading) {
            this.eventuallyFinishLoading();
        }
        const repositoriesIndex = this._repositories.findIndex(r => r.repository === repository);
        if (repositoriesIndex === -1) {
            return;
        }
        let added = Iterable.empty();
        const repositoryView = this._repositories.splice(repositoriesIndex, 1);
        if (this._repositories.length > 0 && this.visibleRepositories.length === 0) {
            this._repositories[0].selectionIndex = 0;
            added = [this._repositories[0].repository];
        }
        this._onDidChangeRepositories.fire({ added, removed: repositoryView.map(r => r.repository) });
        if (repositoryView.length === 1 && repositoryView[0].focused && this.visibleRepositories.length > 0) {
            this.focus(this.visibleRepositories[0]);
        }
    }
    isVisible(repository) {
        return this._repositories.find(r => r.repository === repository)?.selectionIndex !== -1;
    }
    toggleVisibility(repository, visible) {
        if (typeof visible === 'undefined') {
            visible = !this.isVisible(repository);
        }
        else if (this.isVisible(repository) === visible) {
            return;
        }
        if (visible) {
            this.visibleRepositories = [...this.visibleRepositories, repository];
        }
        else {
            const index = this.visibleRepositories.indexOf(repository);
            if (index > -1) {
                this.visibleRepositories = [
                    ...this.visibleRepositories.slice(0, index),
                    ...this.visibleRepositories.slice(index + 1)
                ];
            }
        }
    }
    toggleSortKey(sortKey) {
        this._repositoriesSortKey = sortKey;
        this._sortKeyContextKey.set(this._repositoriesSortKey);
        this._repositories.sort(this.compareRepositories.bind(this));
        this._onDidChangeRepositories.fire({ added: Iterable.empty(), removed: Iterable.empty() });
    }
    focus(repository) {
        if (repository && !this.isVisible(repository)) {
            return;
        }
        this._repositories.forEach(r => r.focused = r.repository === repository);
        if (this._repositories.find(r => r.focused)) {
            this._onDidFocusRepository.fire(repository);
        }
    }
    pinActiveRepository(repository) {
        this._activeRepositoryPinnedObs.set(repository, undefined);
    }
    compareRepositories(op1, op2) {
        // Sort by discovery time
        if (this._repositoriesSortKey === "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */) {
            return op1.discoveryTime - op2.discoveryTime;
        }
        // Sort by path
        if (this._repositoriesSortKey === 'path' && op1.repository.provider.rootUri && op2.repository.provider.rootUri) {
            return comparePaths(op1.repository.provider.rootUri.fsPath, op2.repository.provider.rootUri.fsPath);
        }
        // Sort by name, path
        const name1 = getRepositoryName(this.workspaceContextService, op1.repository);
        const name2 = getRepositoryName(this.workspaceContextService, op2.repository);
        const nameComparison = compareFileNames(name1, name2);
        if (nameComparison === 0 && op1.repository.provider.rootUri && op2.repository.provider.rootUri) {
            return comparePaths(op1.repository.provider.rootUri.fsPath, op2.repository.provider.rootUri.fsPath);
        }
        return nameComparison;
    }
    getMaxSelectionIndex() {
        return this._repositories.length === 0 ? -1 :
            Math.max(...this._repositories.map(r => r.selectionIndex));
    }
    getViewSortOrder() {
        const sortOder = this.configurationService.getValue('scm.repositories.sortOrder');
        switch (sortOder) {
            case 'discovery time':
                return "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */;
            case 'name':
                return "name" /* ISCMRepositorySortKey.Name */;
            case 'path':
                return "path" /* ISCMRepositorySortKey.Path */;
            default:
                return "discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */;
        }
    }
    insertRepositoryView(repositories, repositoryView) {
        const index = binarySearch(repositories, repositoryView, this.compareRepositories.bind(this));
        repositories.splice(index < 0 ? ~index : index, 0, repositoryView);
    }
    onWillSaveState() {
        if (!this.didFinishLoading) { // don't remember state, if the workbench didn't really finish loading
            return;
        }
        const all = this.repositories.map(r => getProviderStorageKey(r.provider));
        const visible = this.visibleRepositories.map(r => all.indexOf(getProviderStorageKey(r.provider)));
        this.previousState = { all, sortKey: this._repositoriesSortKey, visible };
        this.storageService.store('scm:view:visibleRepositories', JSON.stringify(this.previousState), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    eventuallyFinishLoading() {
        this.finishLoading();
    }
    finishLoading() {
        if (this.didFinishLoading) {
            return;
        }
        this.didFinishLoading = true;
    }
    dispose() {
        this.disposables.dispose();
        this._onDidChangeRepositories.dispose();
        this._onDidSetVisibleRepositories.dispose();
    }
};
__decorate([
    debounce(5000)
], SCMViewService.prototype, "eventuallyFinishLoading", null);
SCMViewService = __decorate([
    __param(0, ISCMService),
    __param(1, IContextKeyService),
    __param(2, IEditorService),
    __param(3, IExtensionService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IStorageService),
    __param(7, IWorkspaceContextService)
], SCMViewService);
export { SCMViewService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtVmlld1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9zY21WaWV3U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFrQixXQUFXLEVBQXdGLE1BQU0sa0JBQWtCLENBQUM7QUFDdEssT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDdEMsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxp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
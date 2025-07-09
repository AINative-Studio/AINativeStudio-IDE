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
import { localize } from '../../../../nls.js';
import { basename } from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { VIEW_PANE_ID, ISCMService, ISCMViewService } from '../common/scm.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { ITitleService } from '../../../services/title/browser/titleService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { getRepositoryResourceCount } from './util.js';
import { autorun, autorunWithStore, derived, observableFromEvent } from '../../../../base/common/observable.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
const ActiveRepositoryContextKeys = {
    ActiveRepositoryName: new RawContextKey('scmActiveRepositoryName', ''),
    ActiveRepositoryBranchName: new RawContextKey('scmActiveRepositoryBranchName', ''),
};
let SCMActiveRepositoryController = class SCMActiveRepositoryController extends Disposable {
    constructor(activityService, configurationService, contextKeyService, scmService, scmViewService, statusbarService, titleService) {
        super();
        this.activityService = activityService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.statusbarService = statusbarService;
        this.titleService = titleService;
        this._activeRepositoryNameContextKey = ActiveRepositoryContextKeys.ActiveRepositoryName.bindTo(this.contextKeyService);
        this._activeRepositoryBranchNameContextKey = ActiveRepositoryContextKeys.ActiveRepositoryBranchName.bindTo(this.contextKeyService);
        this.titleService.registerVariables([
            { name: 'activeRepositoryName', contextKey: ActiveRepositoryContextKeys.ActiveRepositoryName.key },
            { name: 'activeRepositoryBranchName', contextKey: ActiveRepositoryContextKeys.ActiveRepositoryBranchName.key, }
        ]);
        this._countBadgeConfig = observableConfigValue('scm.countBadge', 'all', this.configurationService);
        this._repositories = observableFromEvent(this, Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository), () => this.scmService.repositories);
        this._activeRepositoryHistoryItemRefName = derived(reader => {
            const repository = this.scmViewService.activeRepository.read(reader);
            const historyProvider = repository?.provider.historyProvider.read(reader);
            const historyItemRef = historyProvider?.historyItemRef.read(reader);
            return historyItemRef?.name;
        });
        this._countBadgeRepositories = derived(this, reader => {
            switch (this._countBadgeConfig.read(reader)) {
                case 'all': {
                    const repositories = this._repositories.read(reader);
                    return [...Iterable.map(repositories, r => ({ provider: r.provider, resourceCount: this._getRepositoryResourceCount(r) }))];
                }
                case 'focused': {
                    const repository = this.scmViewService.activeRepository.read(reader);
                    return repository ? [{ provider: repository.provider, resourceCount: this._getRepositoryResourceCount(repository) }] : [];
                }
                case 'off':
                    return [];
                default:
                    throw new Error('Invalid countBadge setting');
            }
        });
        this._countBadge = derived(this, reader => {
            let total = 0;
            for (const repository of this._countBadgeRepositories.read(reader)) {
                const count = repository.provider.count?.read(reader);
                const resourceCount = repository.resourceCount.read(reader);
                total = total + (count ?? resourceCount);
            }
            return total;
        });
        this._register(autorunWithStore((reader, store) => {
            const countBadge = this._countBadge.read(reader);
            this._updateActivityCountBadge(countBadge, store);
        }));
        this._register(autorunWithStore((reader, store) => {
            this._repositories.read(reader);
            const repository = this.scmViewService.activeRepository.read(reader);
            const commands = repository?.provider.statusBarCommands.read(reader);
            this._updateStatusBar(repository, commands ?? [], store);
        }));
        this._register(autorun(reader => {
            const repository = this.scmViewService.activeRepository.read(reader);
            const historyItemRefName = this._activeRepositoryHistoryItemRefName.read(reader);
            this._updateActiveRepositoryContextKeys(repository?.provider.name, historyItemRefName);
        }));
    }
    _getRepositoryResourceCount(repository) {
        return observableFromEvent(this, repository.provider.onDidChangeResources, () => /** @description repositoryResourceCount */ getRepositoryResourceCount(repository.provider));
    }
    _updateActivityCountBadge(count, store) {
        if (count === 0) {
            return;
        }
        const badge = new NumberBadge(count, num => localize('scmPendingChangesBadge', '{0} pending changes', num));
        store.add(this.activityService.showViewActivity(VIEW_PANE_ID, { badge }));
    }
    _updateStatusBar(repository, commands, store) {
        if (!repository) {
            return;
        }
        const label = repository.provider.rootUri
            ? `${basename(repository.provider.rootUri)} (${repository.provider.label})`
            : repository.provider.label;
        for (let index = 0; index < commands.length; index++) {
            const command = commands[index];
            const tooltip = `${label}${command.tooltip ? ` - ${command.tooltip}` : ''}`;
            // Get a repository agnostic name for the status bar action, derive this from the
            // first command argument which is in the form "git.<command>/<number>"
            let repoAgnosticActionName = command.arguments?.[0];
            if (repoAgnosticActionName && typeof repoAgnosticActionName === 'string') {
                repoAgnosticActionName = repoAgnosticActionName
                    .substring(0, repoAgnosticActionName.lastIndexOf('/'))
                    .replace(/^git\./, '');
                if (repoAgnosticActionName.length > 1) {
                    repoAgnosticActionName = repoAgnosticActionName[0].toLocaleUpperCase() + repoAgnosticActionName.slice(1);
                }
            }
            else {
                repoAgnosticActionName = '';
            }
            const statusbarEntry = {
                name: localize('status.scm', "Source Control") + (repoAgnosticActionName ? ` ${repoAgnosticActionName}` : ''),
                text: command.title,
                ariaLabel: tooltip,
                tooltip,
                command: command.id ? command : undefined
            };
            store.add(index === 0 ?
                this.statusbarService.addEntry(statusbarEntry, `status.scm.${index}`, 0 /* MainThreadStatusBarAlignment.LEFT */, 10000) :
                this.statusbarService.addEntry(statusbarEntry, `status.scm.${index}`, 0 /* MainThreadStatusBarAlignment.LEFT */, { location: { id: `status.scm.${index - 1}`, priority: 10000 }, alignment: 1 /* MainThreadStatusBarAlignment.RIGHT */, compact: true }));
        }
        // Ssource control provider status bar entry
        if (this.scmService.repositoryCount > 1) {
            const repositoryStatusbarEntry = {
                name: localize('status.scm.provider', "Source Control Provider"),
                text: `$(repo) ${repository.provider.name}`,
                ariaLabel: label,
                tooltip: label,
                command: 'scm.setActiveProvider'
            };
            store.add(this.statusbarService.addEntry(repositoryStatusbarEntry, 'status.scm.provider', 0 /* MainThreadStatusBarAlignment.LEFT */, { location: { id: `status.scm.0`, priority: 10000 }, alignment: 0 /* MainThreadStatusBarAlignment.LEFT */, compact: true }));
        }
    }
    _updateActiveRepositoryContextKeys(repositoryName, branchName) {
        this._activeRepositoryNameContextKey.set(repositoryName ?? '');
        this._activeRepositoryBranchNameContextKey.set(branchName ?? '');
    }
};
SCMActiveRepositoryController = __decorate([
    __param(0, IActivityService),
    __param(1, IConfigurationService),
    __param(2, IContextKeyService),
    __param(3, ISCMService),
    __param(4, ISCMViewService),
    __param(5, IStatusbarService),
    __param(6, ITitleService)
], SCMActiveRepositoryController);
export { SCMActiveRepositoryController };
let SCMActiveResourceContextKeyController = class SCMActiveResourceContextKeyController extends Disposable {
    constructor(editorGroupsService, scmService, uriIdentityService) {
        super();
        this.scmService = scmService;
        this.uriIdentityService = uriIdentityService;
        this._onDidRepositoryChange = new Emitter();
        const activeResourceHasChangesContextKey = new RawContextKey('scmActiveResourceHasChanges', false, localize('scmActiveResourceHasChanges', "Whether the active resource has changes"));
        const activeResourceRepositoryContextKey = new RawContextKey('scmActiveResourceRepository', undefined, localize('scmActiveResourceRepository', "The active resource's repository"));
        this._repositories = observableFromEvent(this, Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository), () => this.scmService.repositories);
        this._store.add(autorunWithStore((reader, store) => {
            for (const repository of this._repositories.read(reader)) {
                store.add(Event.runAndSubscribe(repository.provider.onDidChangeResources, () => {
                    this._onDidRepositoryChange.fire();
                }));
            }
        }));
        // Create context key providers which will update the context keys based on each groups active editor
        const hasChangesContextKeyProvider = {
            contextKey: activeResourceHasChangesContextKey,
            getGroupContextKeyValue: (group) => this._getEditorHasChanges(group.activeEditor),
            onDidChange: this._onDidRepositoryChange.event
        };
        const repositoryContextKeyProvider = {
            contextKey: activeResourceRepositoryContextKey,
            getGroupContextKeyValue: (group) => this._getEditorRepositoryId(group.activeEditor),
            onDidChange: this._onDidRepositoryChange.event
        };
        this._store.add(editorGroupsService.registerContextKeyProvider(hasChangesContextKeyProvider));
        this._store.add(editorGroupsService.registerContextKeyProvider(repositoryContextKeyProvider));
    }
    _getEditorHasChanges(activeEditor) {
        const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
        if (!activeResource) {
            return false;
        }
        const activeResourceRepository = this.scmService.getRepository(activeResource);
        for (const resourceGroup of activeResourceRepository?.provider.groups ?? []) {
            if (resourceGroup.resources
                .some(scmResource => this.uriIdentityService.extUri.isEqual(activeResource, scmResource.sourceUri))) {
                return true;
            }
        }
        return false;
    }
    _getEditorRepositoryId(activeEditor) {
        const activeResource = EditorResourceAccessor.getOriginalUri(activeEditor);
        if (!activeResource) {
            return undefined;
        }
        const activeResourceRepository = this.scmService.getRepository(activeResource);
        return activeResourceRepository?.id;
    }
    dispose() {
        this._onDidRepositoryChange.dispose();
        super.dispose();
    }
};
SCMActiveResourceContextKeyController = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, ISCMService),
    __param(2, IUriIdentityService)
], SCMActiveResourceContextKeyController);
export { SCMActiveResourceContextKeyController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvYWN0aXZpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFtQixNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQWtCLGVBQWUsRUFBZ0IsTUFBTSxrQkFBa0IsQ0FBQztBQUM1RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFOUYsT0FBTyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RILE9BQU8sRUFBbUIsaUJBQWlCLEVBQXNELE1BQU0sa0RBQWtELENBQUM7QUFDMUosT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRixPQUFPLEVBQWtDLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFOUgsT0FB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
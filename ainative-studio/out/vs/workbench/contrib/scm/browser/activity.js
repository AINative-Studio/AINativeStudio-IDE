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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9hY3Rpdml0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBa0IsZUFBZSxFQUFnQixNQUFNLGtCQUFrQixDQUFDO0FBQzVHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU5RixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEgsT0FBTyxFQUFtQixpQkFBaUIsRUFBc0QsTUFBTSxrREFBa0QsQ0FBQztBQUMxSixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBa0Msb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU5SCxPQUFP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
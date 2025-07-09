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
var ScmMultiDiffSourceResolver_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent, ValueWithChangeEventFromObservable, waitForState } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize2 } from '../../../../nls.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IActivityService, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ISCMService } from '../../scm/common/scm.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem } from './multiDiffSourceResolverService.js';
let ScmMultiDiffSourceResolver = class ScmMultiDiffSourceResolver {
    static { ScmMultiDiffSourceResolver_1 = this; }
    static { this._scheme = 'scm-multi-diff-source'; }
    static getMultiDiffSourceUri(repositoryUri, groupId) {
        return URI.from({
            scheme: ScmMultiDiffSourceResolver_1._scheme,
            query: JSON.stringify({ repositoryUri, groupId }),
        });
    }
    static parseUri(uri) {
        if (uri.scheme !== ScmMultiDiffSourceResolver_1._scheme) {
            return undefined;
        }
        let query;
        try {
            query = JSON.parse(uri.query);
        }
        catch (e) {
            return undefined;
        }
        if (typeof query !== 'object' || query === null) {
            return undefined;
        }
        const { repositoryUri, groupId } = query;
        if (typeof repositoryUri !== 'string' || typeof groupId !== 'string') {
            return undefined;
        }
        return { repositoryUri: URI.parse(repositoryUri), groupId };
    }
    constructor(_scmService, _activityService) {
        this._scmService = _scmService;
        this._activityService = _activityService;
    }
    canHandleUri(uri) {
        return ScmMultiDiffSourceResolver_1.parseUri(uri) !== undefined;
    }
    async resolveDiffSource(uri) {
        const { repositoryUri, groupId } = ScmMultiDiffSourceResolver_1.parseUri(uri);
        const repository = await waitForState(observableFromEvent(this, this._scmService.onDidAddRepository, () => [...this._scmService.repositories].find(r => r.provider.rootUri?.toString() === repositoryUri.toString())));
        const group = await waitForState(observableFromEvent(this, repository.provider.onDidChangeResourceGroups, () => repository.provider.groups.find(g => g.id === groupId)));
        const scmActivities = observableFromEvent(this._activityService.onDidChangeActivity, () => [...this._activityService.getViewContainerActivities('workbench.view.scm')]);
        const scmViewHasNoProgressBadge = scmActivities.map(activities => !activities.some(a => a.badge instanceof ProgressBadge));
        await waitForState(scmViewHasNoProgressBadge, v => v);
        return new ScmResolvedMultiDiffSource(group, repository);
    }
};
ScmMultiDiffSourceResolver = ScmMultiDiffSourceResolver_1 = __decorate([
    __param(0, ISCMService),
    __param(1, IActivityService)
], ScmMultiDiffSourceResolver);
export { ScmMultiDiffSourceResolver };
class ScmResolvedMultiDiffSource {
    constructor(_group, _repository) {
        this._group = _group;
        this._repository = _repository;
        this._resources = observableFromEvent(this._group.onDidChangeResources, () => /** @description resources */ this._group.resources.map(e => new MultiDiffEditorItem(e.multiDiffEditorOriginalUri, e.multiDiffEditorModifiedUri, e.sourceUri)));
        this.resources = new ValueWithChangeEventFromObservable(this._resources);
        this.contextKeys = {
            scmResourceGroup: this._group.id,
            scmProvider: this._repository.provider.contextValue,
        };
    }
}
let ScmMultiDiffSourceResolverContribution = class ScmMultiDiffSourceResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.scmMultiDiffSourceResolver'; }
    constructor(instantiationService, multiDiffSourceResolverService) {
        super();
        this._register(multiDiffSourceResolverService.registerResolver(instantiationService.createInstance(ScmMultiDiffSourceResolver)));
    }
};
ScmMultiDiffSourceResolverContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMultiDiffSourceResolverService)
], ScmMultiDiffSourceResolverContribution);
export { ScmMultiDiffSourceResolverContribution };
export class OpenScmGroupAction extends Action2 {
    static async openMultiFileDiffEditor(editorService, label, repositoryRootUri, resourceGroupId, options) {
        if (!repositoryRootUri) {
            return;
        }
        const multiDiffSource = ScmMultiDiffSourceResolver.getMultiDiffSourceUri(repositoryRootUri.toString(), resourceGroupId);
        return await editorService.openEditor({ label, multiDiffSource, options });
    }
    constructor() {
        super({
            id: '_workbench.openScmMultiDiffEditor',
            title: localize2('openChanges', 'Open Changes'),
            f1: false
        });
    }
    async run(accessor, options) {
        const editorService = accessor.get(IEditorService);
        await OpenScmGroupAction.openMultiFileDiffEditor(editorService, options.title, URI.revive(options.repositoryUri), options.resourceGroupId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtTXVsdGlEaWZmU291cmNlUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbXVsdGlEaWZmRWRpdG9yL2Jyb3dzZXIvc2NtTXVsdGlEaWZmU291cmNlUmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0NBQWtDLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUgsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXpFLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBcUMsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDekYsT0FBTyxFQUE0QiwrQkFBK0IsRUFBNEIsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV4SixJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEwQjs7YUFDZCxZQUFPLEdBQUcsdUJBQXVCLEFBQTFCLENBQTJCO0lBRW5ELE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxhQUFxQixFQUFFLE9BQWU7UUFDekUsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFD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
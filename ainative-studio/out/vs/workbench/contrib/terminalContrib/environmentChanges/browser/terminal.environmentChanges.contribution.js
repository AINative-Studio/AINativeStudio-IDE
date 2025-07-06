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
var EnvironmentCollectionProvider_1;
import { URI } from '../../../../../base/common/uri.js';
import { Event } from '../../../../../base/common/event.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { EnvironmentVariableMutatorType } from '../../../../../platform/terminal/common/environmentVariable.js';
import { registerActiveInstanceAction } from '../../../terminal/browser/terminalActions.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
// TODO: The rest of the terminal environment changes feature should move here https://github.com/microsoft/vscode/issues/177241
// #region Actions
registerActiveInstanceAction({
    id: "workbench.action.terminal.showEnvironmentContributions" /* TerminalCommandId.ShowEnvironmentContributions */,
    title: localize2('workbench.action.terminal.showEnvironmentContributions', 'Show Environment Contributions'),
    run: async (activeInstance, c, accessor, arg) => {
        const collection = activeInstance.extEnvironmentVariableCollection;
        if (collection) {
            const scope = arg;
            const instantiationService = accessor.get(IInstantiationService);
            const outputProvider = instantiationService.createInstance(EnvironmentCollectionProvider);
            const editorService = accessor.get(IEditorService);
            const timestamp = new Date().getTime();
            const scopeDesc = scope?.workspaceFolder ? ` - ${scope.workspaceFolder.name}` : '';
            const textContent = await outputProvider.provideTextContent(URI.from({
                scheme: EnvironmentCollectionProvider.scheme,
                path: `Environment changes${scopeDesc}`,
                fragment: describeEnvironmentChanges(collection, scope),
                query: `environment-collection-${timestamp}`
            }));
            if (textContent) {
                await editorService.openEditor({
                    resource: textContent.uri
                });
            }
        }
    }
});
// #endregion
function describeEnvironmentChanges(collection, scope) {
    let content = `# ${localize('envChanges', 'Terminal Environment Changes')}`;
    const globalDescriptions = collection.getDescriptionMap(undefined);
    const workspaceDescriptions = collection.getDescriptionMap(scope);
    for (const [ext, coll] of collection.collections) {
        content += `\n\n## ${localize('extension', 'Extension: {0}', ext)}`;
        content += '\n';
        const globalDescription = globalDescriptions.get(ext);
        if (globalDescription) {
            content += `\n${globalDescription}\n`;
        }
        const workspaceDescription = workspaceDescriptions.get(ext);
        if (workspaceDescription) {
            // Only show '(workspace)' suffix if there is already a description for the extension.
            const workspaceSuffix = globalDescription ? ` (${localize('ScopedEnvironmentContributionInfo', 'workspace')})` : '';
            content += `\n${workspaceDescription}${workspaceSuffix}\n`;
        }
        for (const mutator of coll.map.values()) {
            if (filterScope(mutator, scope) === false) {
                continue;
            }
            content += `\n- \`${mutatorTypeLabel(mutator.type, mutator.value, mutator.variable)}\``;
        }
    }
    return content;
}
function filterScope(mutator, scope) {
    if (!mutator.scope) {
        return true;
    }
    // Only mutators which are applicable on the relevant workspace should be shown.
    if (mutator.scope.workspaceFolder && scope?.workspaceFolder && mutator.scope.workspaceFolder.index === scope.workspaceFolder.index) {
        return true;
    }
    return false;
}
function mutatorTypeLabel(type, value, variable) {
    switch (type) {
        case EnvironmentVariableMutatorType.Prepend: return `${variable}=${value}\${env:${variable}}`;
        case EnvironmentVariableMutatorType.Append: return `${variable}=\${env:${variable}}${value}`;
        default: return `${variable}=${value}`;
    }
}
let EnvironmentCollectionProvider = class EnvironmentCollectionProvider {
    static { EnvironmentCollectionProvider_1 = this; }
    static { this.scheme = 'ENVIRONMENT_CHANGES_COLLECTION'; }
    constructor(textModelResolverService, _modelService) {
        this._modelService = _modelService;
        textModelResolverService.registerTextModelContentProvider(EnvironmentCollectionProvider_1.scheme, this);
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        return this._modelService.createModel(resource.fragment, { languageId: 'markdown', onDidChange: Event.None }, resource, false);
    }
};
EnvironmentCollectionProvider = EnvironmentCollectionProvider_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], EnvironmentCollectionProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZW52aXJvbm1lbnRDaGFuZ2VzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2Vudmlyb25tZW50Q2hhbmdlcy9icm93c2VyL3Rlcm1pbmFsLmVudmlyb25tZW50Q2hhbmdlcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBNkIsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSw4QkFBOEIsRUFBK0YsTUFBTSxnRUFBZ0UsQ0FBQztBQUM3TSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU1RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsZ0lBQWdJO0FBRWhJLGtCQUFrQjtBQUVsQiw0QkFBNEIsQ0FBQztJQUM1QixFQUFFLCtHQUFnRDtJQUNsRCxLQUFLLEVBQUUsU0FBUyxDQUFDLHdEQUF3RCxFQUFFLGdDQUFnQyxDQUFDO0lBQzVHLEdBQUcsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxF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
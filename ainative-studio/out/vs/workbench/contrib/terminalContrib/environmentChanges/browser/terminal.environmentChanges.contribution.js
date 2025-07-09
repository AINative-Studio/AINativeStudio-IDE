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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZW52aXJvbm1lbnRDaGFuZ2VzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvZW52aXJvbm1lbnRDaGFuZ2VzL2Jyb3dzZXIvdGVybWluYWwuZW52aXJvbm1lbnRDaGFuZ2VzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLDhCQUE4QixFQUErRixNQUFNLGdFQUFnRSxDQUFDO0FBQzdNLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVyRixnSUFBZ0k7QUFFaEksa0JBQWtCO0FBRWxCLDRCQUE0QixDQUFDO0lBQzVCLEVBQUUsK0dBQWdEO0lBQ2xELEtBQUssRUFBRSxTQUFTLENBQUMsd0RBQXdELEVBQUUsZ0NBQWdDLENBQUM7SUFDNUcsR0FBRyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUs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
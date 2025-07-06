/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MultiDiffEditor } from './multiDiffEditor.js';
import { MultiDiffEditorInput, MultiDiffEditorResolverContribution, MultiDiffEditorSerializer } from './multiDiffEditorInput.js';
import { CollapseAllAction, ExpandAllAction, GoToFileAction } from './actions.js';
import { IMultiDiffSourceResolverService, MultiDiffSourceResolverService } from './multiDiffSourceResolverService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { OpenScmGroupAction, ScmMultiDiffSourceResolverContribution } from './scmMultiDiffSourceResolver.js';
registerAction2(GoToFileAction);
registerAction2(CollapseAllAction);
registerAction2(ExpandAllAction);
Registry.as(Extensions.Configuration)
    .registerConfiguration({
    properties: {
        'multiDiffEditor.experimental.enabled': {
            type: 'boolean',
            default: true,
            description: 'Enable experimental multi diff editor.',
        },
    }
});
registerSingleton(IMultiDiffSourceResolverService, MultiDiffSourceResolverService, 1 /* InstantiationType.Delayed */);
// Editor Integration
registerWorkbenchContribution2(MultiDiffEditorResolverContribution.ID, MultiDiffEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
Registry.as(EditorExtensions.EditorPane)
    .registerEditorPane(EditorPaneDescriptor.create(MultiDiffEditor, MultiDiffEditor.ID, localize('name', "Multi Diff Editor")), [new SyncDescriptor(MultiDiffEditorInput)]);
Registry.as(EditorExtensions.EditorFactory)
    .registerEditorSerializer(MultiDiffEditorInput.ID, MultiDiffEditorSerializer);
// SCM integration
registerAction2(OpenScmGroupAction);
registerWorkbenchContribution2(ScmMultiDiffSourceResolverContribution.ID, ScmMultiDiffSourceResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL211bHRpRGlmZkVkaXRvci9icm93c2VyL211bHRpRGlmZkVkaXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLDRCQUE0QixDQUFDO0FBQ3ZGLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sMkJBQTJCLENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQ0FBbUMsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RILE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDaEMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDbkMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRWpDLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUM7S0FDM0QscUJBQXFCLENBQUM7SUFDdEIsVUFBVSxFQUFFO1FBQ1gsc0NBQXNDLEVBQUU7WUFDdkMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLFdBQVcsRUFBRSx3Q0FBd0M7U0FDckQ7S0FDRDtDQUNELENBQUMsQ0FBQztBQUVKLGlCQUFpQixDQUFDLCtCQUErQixFQUFFLDhCQUE4QixvQ0FBNEIsQ0FBQztBQUU5RyxxQkFBcUI7QUFDckIsOEJBQThCLENBQUMsbUNBQW1DLENBQUMsRUFBRSxFQUFFLG1DQUFtQyxzQ0FBd0UsQ0FBQztBQUVuTCxRQUFRLENBQUMsRUFBRSxDQUFzQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUM7S0FDM0Qsa0JBQWtCLENBQ2xCLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLG1CQUFtQixDQUFDLENBQUMsRUFDdkcsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQzFDLENBQUM7QUFFSCxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUM7S0FDakUsd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFFL0Usa0JBQWtCO0FBQ2xCLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3BDLDhCQUE4QixDQUFDLHNDQUFzQyxDQUFDLEVBQUUsRUFBRSxzQ0FBc0Msc0NBQXlFLENBQUMifQ==
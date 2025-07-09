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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tdWx0aURpZmZFZGl0b3IvYnJvd3Nlci9tdWx0aURpZmZFZGl0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLDJCQUEyQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUNBQW1DLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNsRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0SCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNDQUFzQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0csZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ2hDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ25DLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUVqQyxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDO0tBQzNELHFCQUFxQixDQUFDO0lBQ3RCLFVBQVUsRUFBRTtRQUNYLHNDQUFzQyxFQUFFO1lBQ3ZDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixXQUFXLEVBQUUsd0NBQXdDO1NBQ3JEO0tBQ0Q7Q0FDRCxDQUFDLENBQUM7QUFFSixpQkFBaUIsQ0FBQywrQkFBK0IsRUFBRSw4QkFBOEIsb0NBQTRCLENBQUM7QUFFOUcscUJBQXFCO0FBQ3JCLDhCQUE4QixDQUFDLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxtQ0FBbUMsc0NBQXdFLENBQUM7QUFFbkwsUUFBUSxDQUFDLEVBQUUsQ0FBc0IsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO0tBQzNELGtCQUFrQixDQUNsQixvQkFBb0IsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLEVBQ3ZHLENBQUMsSUFBSSxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUMxQyxDQUFDO0FBRUgsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDO0tBQ2pFLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO0FBRS9FLGtCQUFrQjtBQUNsQixlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNwQyw4QkFBOEIsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUFFLEVBQUUsc0NBQXNDLHNDQUF5RSxDQUFDIn0=
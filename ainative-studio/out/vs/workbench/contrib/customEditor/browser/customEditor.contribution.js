/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { ComplexCustomWorkingCopyEditorHandler as ComplexCustomWorkingCopyEditorHandler, CustomEditorInputSerializer } from './customEditorInputFactory.js';
import { ICustomEditorService } from '../common/customEditor.js';
import { WebviewEditor } from '../../webviewPanel/browser/webviewEditor.js';
import { CustomEditorInput } from './customEditorInput.js';
import { CustomEditorService } from './customEditors.js';
registerSingleton(ICustomEditorService, CustomEditorService, 1 /* InstantiationType.Delayed */);
Registry.as(EditorExtensions.EditorPane)
    .registerEditorPane(EditorPaneDescriptor.create(WebviewEditor, WebviewEditor.ID, 'Webview Editor'), [
    new SyncDescriptor(CustomEditorInput)
]);
Registry.as(EditorExtensions.EditorFactory)
    .registerEditorSerializer(CustomEditorInputSerializer.ID, CustomEditorInputSerializer);
registerWorkbenchContribution2(ComplexCustomWorkingCopyEditorHandler.ID, ComplexCustomWorkingCopyEditorHandler, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jdXN0b21FZGl0b3IvYnJvd3Nlci9jdXN0b21FZGl0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLDJCQUEyQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQ0FBcUMsSUFBSSxxQ0FBcUMsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzVKLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV6RCxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsb0NBQTRCLENBQUM7QUFFeEYsUUFBUSxDQUFDLEVBQUUsQ0FBc0IsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO0tBQzNELGtCQUFrQixDQUNsQixvQkFBb0IsQ0FBQyxNQUFNLENBQzFCLGFBQWEsRUFDYixhQUFhLENBQUMsRUFBRSxFQUNoQixnQkFBZ0IsQ0FDaEIsRUFBRTtJQUNILElBQUksY0FBYyxDQUFDLGlCQUFpQixDQUFDO0NBQ3JDLENBQUMsQ0FBQztBQUVKLFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQztLQUNqRSx3QkFBd0IsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztBQUV4Riw4QkFBOEIsQ0FBQyxxQ0FBcUMsQ0FBQyxFQUFFLEVBQUUscUNBQXFDLHNDQUE4QixDQUFDIn0=
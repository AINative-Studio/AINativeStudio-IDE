/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IEditorPaneService } from '../common/editorPaneService.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export class EditorPaneService {
    constructor() {
        this.onWillInstantiateEditorPane = EditorPaneDescriptor.onWillInstantiateEditorPane;
    }
    didInstantiateEditorPane(typeId) {
        return EditorPaneDescriptor.didInstantiateEditorPane(typeId);
    }
}
registerSingleton(IEditorPaneService, EditorPaneService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9icm93c2VyL2VkaXRvclBhbmVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxNQUFNLE9BQU8saUJBQWlCO0lBQTlCO1FBSVUsZ0NBQTJCLEdBQUcsb0JBQW9CLENBQUMsMkJBQTJCLENBQUM7SUFLekYsQ0FBQztJQUhBLHdCQUF3QixDQUFDLE1BQWM7UUFDdEMsT0FBTyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5RCxDQUFDO0NBQ0Q7QUFFRCxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsb0NBQTRCLENBQUMifQ==
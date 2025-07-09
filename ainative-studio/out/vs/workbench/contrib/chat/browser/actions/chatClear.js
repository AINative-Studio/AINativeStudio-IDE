/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatEditorInput } from '../chatEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
export async function clearChatEditor(accessor, chatEditorInput) {
    const editorService = accessor.get(IEditorService);
    if (!chatEditorInput) {
        const editorInput = editorService.activeEditor;
        chatEditorInput = editorInput instanceof ChatEditorInput ? editorInput : undefined;
    }
    if (chatEditorInput instanceof ChatEditorInput) {
        // A chat editor can only be open in one group
        const identifier = editorService.findEditors(chatEditorInput.resource)[0];
        await editorService.replaceEditors([{
                editor: chatEditorInput,
                replacement: { resource: ChatEditorInput.getNewEditorUri(), options: { pinned: true } }
            }], identifier.groupId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENsZWFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRDbGVhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXJGLE1BQU0sQ0FBQyxLQUFLLFVBQVUsZUFBZSxDQUFDLFFBQTBCLEVBQUUsZUFBaUM7SUFDbEcsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdEIsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQztRQUMvQyxlQUFlLEdBQUcsV0FBVyxZQUFZLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDcEYsQ0FBQztJQUVELElBQUksZUFBZSxZQUFZLGVBQWUsRUFBRSxDQUFDO1FBQ2hELDhDQUE4QztRQUM5QyxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxNQUFNLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxFQUFFLGVBQWU7Z0JBQ3ZCLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsZUFBZSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBK0IsRUFBRTthQUNwSCxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7QUFDRixDQUFDIn0=
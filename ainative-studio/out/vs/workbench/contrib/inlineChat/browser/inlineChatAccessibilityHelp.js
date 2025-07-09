/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { getChatAccessibilityHelpProvider } from '../../chat/browser/actions/chatAccessibilityHelp.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { CTX_INLINE_CHAT_RESPONSE_FOCUSED } from '../common/inlineChat.js';
export class InlineChatAccessibilityHelp {
    constructor() {
        this.priority = 106;
        this.name = 'inlineChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.or(CTX_INLINE_CHAT_RESPONSE_FOCUSED, ChatContextKeys.inputHasFocus);
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() || accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        return getChatAccessibilityHelpProvider(accessor, codeEditor, 'inlineChat');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0QWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUUzRSxNQUFNLE9BQU8sMkJBQTJCO0lBQXhDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxZQUFZLENBQUM7UUFDcEIsU0FBSSx3Q0FBMkI7UUFDL0IsU0FBSSxHQUFHLGNBQWMsQ0FBQyxFQUFFLENBQUMsZ0NBQWdDLEVBQUUsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBUXBHLENBQUM7SUFQQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDckksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBQ0QsT0FBTyxnQ0FBZ0MsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzdFLENBQUM7Q0FDRCJ9
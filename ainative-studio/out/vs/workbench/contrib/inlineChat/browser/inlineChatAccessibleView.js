/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { InlineChatController } from './inlineChatController.js';
import { CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_RESPONSE_FOCUSED } from '../common/inlineChat.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
export class InlineChatAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'inlineChat';
        this.when = ContextKeyExpr.or(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_RESPONSE_FOCUSED);
        this.type = "view" /* AccessibleViewType.View */;
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = (codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor());
        if (!editor) {
            return;
        }
        const controller = InlineChatController.get(editor);
        if (!controller) {
            return;
        }
        const responseContent = controller.widget.responseContent;
        if (!responseContent) {
            return;
        }
        return new AccessibleContentProvider("inlineChat" /* AccessibleViewProviderId.InlineChat */, { type: "view" /* AccessibleViewType.View */ }, () => renderMarkdownAsPlaintext(new MarkdownString(responseContent), true), () => controller.focus(), "accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjY2Vzc2libGVWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0QWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGdDQUFnQyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBZ0QseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUd2SixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHekYsTUFBTSxPQUFPLHdCQUF3QjtJQUFyQztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcsWUFBWSxDQUFDO1FBQ3BCLFNBQUksR0FBRyxjQUFjLENBQUMsRUFBRSxDQUFDLHVCQUF1QixFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFDcEYsU0FBSSx3Q0FBMkI7SUF3QnpDLENBQUM7SUF2QkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRTNELE1BQU0sTUFBTSxHQUFHLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDckcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7UUFDMUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU87UUFDUixDQUFDO1FBQ0QsT0FBTyxJQUFJLHlCQUF5Qix5REFFbkMsRUFBRSxJQUFJLHNDQUF5QixFQUFFLEVBQ2pDLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksY0FBYyxDQUFDLGVBQWUsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUMxRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLHdGQUV4QixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=
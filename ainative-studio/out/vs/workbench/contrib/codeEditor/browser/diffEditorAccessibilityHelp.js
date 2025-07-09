/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { AccessibleDiffViewerNext, AccessibleDiffViewerPrev } from '../../../../editor/browser/widget/diffEditor/commands.js';
import { DiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyEqualsExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getCommentCommandInfo } from '../../accessibility/browser/editorAccessibilityHelp.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
export class DiffEditorAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'diff-editor';
        this.when = ContextKeyEqualsExpr.create('isInDiffEditor', true);
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const editorService = accessor.get(IEditorService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const keybindingService = accessor.get(IKeybindingService);
        const contextKeyService = accessor.get(IContextKeyService);
        if (!(editorService.activeTextEditorControl instanceof DiffEditorWidget)) {
            return;
        }
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        const switchSides = localize('msg3', "Run the command Diff Editor: Switch Side{0} to toggle between the original and modified editors.", '<keybinding:diffEditor.switchSide>');
        const diffEditorActiveAnnouncement = localize('msg5', "The setting, accessibility.verbosity.diffEditorActive, controls if a diff editor announcement is made when it becomes the active editor.");
        const keys = ['accessibility.signals.diffLineDeleted', 'accessibility.signals.diffLineInserted', 'accessibility.signals.diffLineModified'];
        const content = [
            localize('msg1', "You are in a diff editor."),
            localize('msg2', "View the next{0} or previous{1} diff in diff review mode, which is optimized for screen readers.", '<keybinding:' + AccessibleDiffViewerNext.id + '>', '<keybinding:' + AccessibleDiffViewerPrev.id + '>'),
            switchSides,
            diffEditorActiveAnnouncement,
            localize('msg4', "To control which accessibility signals should be played, the following settings can be configured: {0}.", keys.join(', ')),
        ];
        const commentCommandInfo = getCommentCommandInfo(keybindingService, contextKeyService, codeEditor);
        if (commentCommandInfo) {
            content.push(commentCommandInfo);
        }
        return new AccessibleContentProvider("diffEditor" /* AccessibleViewProviderId.DiffEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => content.join('\n'), () => codeEditor.focus(), "accessibility.verbosity.diffEditor" /* AccessibilityVerbositySettingId.DiffEditor */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9kaWZmRWRpdG9yQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDcEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBZ0QseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV2SixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVoSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsTUFBTSxPQUFPLDJCQUEyQjtJQUF4QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcsYUFBYSxDQUFDO1FBQ3JCLFNBQUksR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsU0FBSSx3Q0FBMkI7SUF1Q3pDLENBQUM7SUF0Q0EsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLHVCQUF1QixZQUFZLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUMxRSxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLElBQUksaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUN2RyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLGtHQUFrRyxFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFDL0ssTUFBTSw0QkFBNEIsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLDBJQUEwSSxDQUFDLENBQUM7UUFFbE0sTUFBTSxJQUFJLEdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSx3Q0FBd0MsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzNJLE1BQU0sT0FBTyxHQUFHO1lBQ2YsUUFBUSxDQUFDLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQztZQUM3QyxRQUFRLENBQUMsTUFBTSxFQUFFLGtHQUFrRyxFQUFFLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQyxFQUFFLEdBQUcsR0FBRyxFQUFFLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDO1lBQzVOLFdBQVc7WUFDWCw0QkFBNEI7WUFDNUIsUUFBUSxDQUFDLE1BQU0sRUFBRSx5R0FBeUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzVJLENBQUM7UUFDRixNQUFNLGtCQUFrQixHQUFHLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ25HLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELE9BQU8sSUFBSSx5QkFBeUIseURBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN4QixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLHdGQUV4QixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=
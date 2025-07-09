/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyEqualsExpr } from '../../../../platform/contextkey/common/contextkey.js';
export class MergeEditorAccessibilityHelpProvider {
    constructor() {
        this.name = 'mergeEditor';
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 125;
        this.when = ContextKeyEqualsExpr.create('isMergeEditor', true);
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        const content = [
            localize('msg1', "You are in a merge editor."),
            localize('msg2', "Navigate between merge conflicts using the commands Go to Next Unhandled Conflict{0} and Go to Previous Unhandled Conflict{1}.", '<keybinding:merge.goToNextUnhandledConflict>', '<keybinding:merge.goToPreviousUnhandledConflict>'),
            localize('msg3', "Run the command Merge Editor: Accept All Changes from the Left{0} and Merge Editor: Accept All Changes from the Right{1}", '<keybinding:merge.acceptAllInput1>', '<keybinding:merge.acceptAllInput2>'),
        ];
        return new AccessibleContentProvider("mergeEditor" /* AccessibleViewProviderId.MergeEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => content.join('\n'), () => codeEditor.focus(), "accessibility.verbosity.mergeEditor" /* AccessibilityVerbositySettingId.MergeEditor */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21lcmdlRWRpdG9yQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSx5QkFBeUIsRUFBZ0QsTUFBTSw4REFBOEQsQ0FBQztBQUV2SixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUs1RixNQUFNLE9BQU8sb0NBQW9DO0lBQWpEO1FBQ1UsU0FBSSxHQUFHLGFBQWEsQ0FBQztRQUNyQixTQUFJLHdDQUEyQjtRQUMvQixhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsU0FBSSxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7SUF1QnBFLENBQUM7SUF0QkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRTNELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLElBQUksaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUN2RyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRztZQUNmLFFBQVEsQ0FBQyxNQUFNLEVBQUUsNEJBQTRCLENBQUM7WUFDOUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxnSUFBZ0ksRUFBRSw4Q0FBOEMsRUFBRSxrREFBa0QsQ0FBQztZQUN0UCxRQUFRLENBQUMsTUFBTSxFQUFFLDBIQUEwSCxFQUFFLG9DQUFvQyxFQUFFLG9DQUFvQyxDQUFDO1NBQ3hOLENBQUM7UUFFRixPQUFPLElBQUkseUJBQXlCLDJEQUVuQyxFQUFFLElBQUksc0NBQXlCLEVBQUUsRUFDakMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDeEIsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSwwRkFFeEIsQ0FBQztJQUNILENBQUM7Q0FDRCJ9
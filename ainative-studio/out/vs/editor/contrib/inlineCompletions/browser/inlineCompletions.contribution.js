/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { wrapInHotClass1 } from '../../../../platform/observable/common/wrapInHotClass.js';
import { registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { AcceptInlineCompletion, AcceptNextLineOfInlineCompletion, AcceptNextWordOfInlineCompletion, DevExtractReproSample, HideInlineCompletion, JumpToNextInlineEdit, ShowNextInlineSuggestionAction, ShowPreviousInlineSuggestionAction, ToggleAlwaysShowInlineSuggestionToolbar, ExplicitTriggerInlineEditAction, TriggerInlineSuggestionAction, TriggerInlineEditAction, ToggleInlineCompletionShowCollapsed, AcceptNextInlineEditPart } from './controller/commands.js';
import { InlineCompletionsController } from './controller/inlineCompletionsController.js';
import { InlineCompletionsHoverParticipant } from './hintsWidget/hoverParticipant.js';
import { InlineCompletionsAccessibleView } from './inlineCompletionsAccessibleView.js';
import { InlineEditsAdapterContribution } from './model/inlineEditsAdapter.js';
registerEditorContribution(InlineEditsAdapterContribution.ID, InlineEditsAdapterContribution, 3 /* EditorContributionInstantiation.Eventually */);
registerEditorContribution(InlineCompletionsController.ID, wrapInHotClass1(InlineCompletionsController.hot), 3 /* EditorContributionInstantiation.Eventually */);
registerEditorAction(TriggerInlineSuggestionAction);
registerEditorAction(ExplicitTriggerInlineEditAction);
registerEditorCommand(new TriggerInlineEditAction());
registerEditorAction(ShowNextInlineSuggestionAction);
registerEditorAction(ShowPreviousInlineSuggestionAction);
registerEditorAction(AcceptNextWordOfInlineCompletion);
registerEditorAction(AcceptNextLineOfInlineCompletion);
registerEditorAction(AcceptInlineCompletion);
registerEditorAction(ToggleInlineCompletionShowCollapsed);
registerEditorAction(HideInlineCompletion);
registerEditorAction(AcceptNextInlineEditPart);
registerEditorAction(JumpToNextInlineEdit);
registerAction2(ToggleAlwaysShowInlineSuggestionToolbar);
registerEditorAction(DevExtractReproSample);
HoverParticipantRegistry.register(InlineCompletionsHoverParticipant);
AccessibleViewRegistry.register(new InlineCompletionsAccessibleView());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9pbmxpbmVDb21wbGV0aW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQW1DLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEssT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdDQUFnQyxFQUFFLGdDQUFnQyxFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLDhCQUE4QixFQUFFLGtDQUFrQyxFQUFFLHVDQUF1QyxFQUFFLCtCQUErQixFQUFFLDZCQUE2QixFQUFFLHVCQUF1QixFQUFFLG1DQUFtQyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDOWMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDMUYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFL0UsMEJBQTBCLENBQUMsOEJBQThCLENBQUMsRUFBRSxFQUFFLDhCQUE4QixxREFBNkMsQ0FBQztBQUcxSSwwQkFBMEIsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxxREFBNkMsQ0FBQztBQUV6SixvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQ3BELG9CQUFvQixDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDdEQscUJBQXFCLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7QUFDckQsb0JBQW9CLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUNyRCxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBQ3pELG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDdkQsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUN2RCxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQzdDLG9CQUFvQixDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDMUQsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUMzQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBQy9DLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDM0MsZUFBZSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7QUFDekQsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUU1Qyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLENBQUMsQ0FBQztBQUNyRSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSwrQkFBK0IsRUFBRSxDQUFDLENBQUMifQ==
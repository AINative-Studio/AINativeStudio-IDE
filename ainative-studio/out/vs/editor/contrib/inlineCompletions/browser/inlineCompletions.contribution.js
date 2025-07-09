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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvaW5saW5lQ29tcGxldGlvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFtQyxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hLLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQ0FBZ0MsRUFBRSxnQ0FBZ0MsRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSw4QkFBOEIsRUFBRSxrQ0FBa0MsRUFBRSx1Q0FBdUMsRUFBRSwrQkFBK0IsRUFBRSw2QkFBNkIsRUFBRSx1QkFBdUIsRUFBRSxtQ0FBbUMsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzljLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRS9FLDBCQUEwQixDQUFDLDhCQUE4QixDQUFDLEVBQUUsRUFBRSw4QkFBOEIscURBQTZDLENBQUM7QUFHMUksMEJBQTBCLENBQUMsMkJBQTJCLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMscURBQTZDLENBQUM7QUFFekosb0JBQW9CLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUNwRCxvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0FBQ3RELHFCQUFxQixDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0FBQ3JELG9CQUFvQixDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFDckQsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQUN6RCxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ3ZELG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFDdkQsb0JBQW9CLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUM3QyxvQkFBb0IsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQzFELG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDM0Msb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUMvQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQzNDLGVBQWUsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ3pELG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFFNUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFDckUsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksK0JBQStCLEVBQUUsQ0FBQyxDQUFDIn0=
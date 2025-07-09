/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as languages from '../../../../editor/common/languages.js';
import { peekViewTitleBackground } from '../../../../editor/contrib/peekView/browser/peekView.js';
import * as nls from '../../../../nls.js';
import { contrastBorder, disabledForeground, listFocusOutline, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
const resolvedCommentViewIcon = registerColor('commentsView.resolvedIcon', { dark: disabledForeground, light: disabledForeground, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('resolvedCommentIcon', 'Icon color for resolved comments.'));
const unresolvedCommentViewIcon = registerColor('commentsView.unresolvedIcon', { dark: listFocusOutline, light: listFocusOutline, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('unresolvedCommentIcon', 'Icon color for unresolved comments.'));
registerColor('editorCommentsWidget.replyInputBackground', peekViewTitleBackground, nls.localize('commentReplyInputBackground', 'Background color for comment reply input box.'));
const resolvedCommentBorder = registerColor('editorCommentsWidget.resolvedBorder', { dark: resolvedCommentViewIcon, light: resolvedCommentViewIcon, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('resolvedCommentBorder', 'Color of borders and arrow for resolved comments.'));
const unresolvedCommentBorder = registerColor('editorCommentsWidget.unresolvedBorder', { dark: unresolvedCommentViewIcon, light: unresolvedCommentViewIcon, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('unresolvedCommentBorder', 'Color of borders and arrow for unresolved comments.'));
export const commentThreadRangeBackground = registerColor('editorCommentsWidget.rangeBackground', transparent(unresolvedCommentBorder, .1), nls.localize('commentThreadRangeBackground', 'Color of background for comment ranges.'));
export const commentThreadRangeActiveBackground = registerColor('editorCommentsWidget.rangeActiveBackground', transparent(unresolvedCommentBorder, .1), nls.localize('commentThreadActiveRangeBackground', 'Color of background for currently selected or hovered comment range.'));
const commentThreadStateBorderColors = new Map([
    [languages.CommentThreadState.Unresolved, unresolvedCommentBorder],
    [languages.CommentThreadState.Resolved, resolvedCommentBorder],
]);
const commentThreadStateIconColors = new Map([
    [languages.CommentThreadState.Unresolved, unresolvedCommentViewIcon],
    [languages.CommentThreadState.Resolved, resolvedCommentViewIcon],
]);
export const commentThreadStateColorVar = '--comment-thread-state-color';
export const commentViewThreadStateColorVar = '--comment-view-thread-state-color';
export const commentThreadStateBackgroundColorVar = '--comment-thread-state-background-color';
function getCommentThreadStateColor(state, theme, map) {
    const colorId = (state !== undefined) ? map.get(state) : undefined;
    return (colorId !== undefined) ? theme.getColor(colorId) : undefined;
}
export function getCommentThreadStateBorderColor(state, theme) {
    return getCommentThreadStateColor(state, theme, commentThreadStateBorderColors);
}
export function getCommentThreadStateIconColor(state, theme) {
    return getCommentThreadStateColor(state, theme, commentThreadStateIconColors);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudENvbG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRDb2xvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNsRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBR3RKLE1BQU0sdUJBQXVCLEdBQUcsYUFBYSxDQUFDLDJCQUEyQixFQUFFLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztBQUMvUCxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FBQyw2QkFBNkIsRUFBRSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7QUFFblEsYUFBYSxDQUFDLDJDQUEyQyxFQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsK0NBQStDLENB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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var CommentContextKeys;
(function (CommentContextKeys) {
    /**
     * A context key that is set when the active cursor is in a commenting range.
     */
    CommentContextKeys.activeCursorHasCommentingRange = new RawContextKey('activeCursorHasCommentingRange', false, {
        description: nls.localize('hasCommentingRange', "Whether the position at the active cursor has a commenting range"),
        type: 'boolean'
    });
    /**
     * A context key that is set when the active cursor is in the range of an existing comment.
     */
    CommentContextKeys.activeCursorHasComment = new RawContextKey('activeCursorHasComment', false, {
        description: nls.localize('hasComment', "Whether the position at the active cursor has a comment"),
        type: 'boolean'
    });
    /**
     * A context key that is set when the active editor has commenting ranges.
     */
    CommentContextKeys.activeEditorHasCommentingRange = new RawContextKey('activeEditorHasCommentingRange', false, {
        description: nls.localize('editorHasCommentingRange', "Whether the active editor has a commenting range"),
        type: 'boolean'
    });
    /**
     * A context key that is set when the workspace has either comments or commenting ranges.
     */
    CommentContextKeys.WorkspaceHasCommenting = new RawContextKey('workspaceHasCommenting', false, {
        description: nls.localize('hasCommentingProvider', "Whether the open workspace has either comments or commenting ranges."),
        type: 'boolean'
    });
    /**
     * A context key that is set when the comment thread has no comments.
     */
    CommentContextKeys.commentThreadIsEmpty = new RawContextKey('commentThreadIsEmpty', false, { type: 'boolean', description: nls.localize('commentThreadIsEmpty', "Set when the comment thread has no comments") });
    /**
     * A context key that is set when the comment has no input.
     */
    CommentContextKeys.commentIsEmpty = new RawContextKey('commentIsEmpty', false, { type: 'boolean', description: nls.localize('commentIsEmpty', "Set when the comment has no input") });
    /**
     * The context value of the comment.
     */
    CommentContextKeys.commentContext = new RawContextKey('comment', undefined, { type: 'string', description: nls.localize('comment', "The context value of the comment") });
    /**
     * The context value of the comment thread.
     */
    CommentContextKeys.commentThreadContext = new RawContextKey('commentThread', undefined, { type: 'string', description: nls.localize('commentThread', "The context value of the comment thread") });
    /**
     * The comment controller id associated with a comment thread.
     */
    CommentContextKeys.commentControllerContext = new RawContextKey('commentController', undefined, { type: 'string', description: nls.localize('commentController', "The comment controller id associated with a comment thread") });
    /**
     * The comment widget is focused.
     */
    CommentContextKeys.commentFocused = new RawContextKey('commentFocused', false, { type: 'boolean', description: nls.localize('commentFocused', "Set when the comment is focused") });
    /**
     * A context key that is set when commenting is enabled.
     */
    CommentContextKeys.commentingEnabled = new RawContextKey('commentingEnabled', true, {
        description: nls.localize('commentingEnabled', "Whether commenting functionality is enabled"),
        type: 'boolean'
    });
})(CommentContextKeys || (CommentContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudENvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2NvbW1vbi9jb21tZW50Q29udGV4dEtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHckYsTUFBTSxLQUFXLGtCQUFrQixDQW1FbEM7QUFuRUQsV0FBaUIsa0JBQWtCO0lBRWxDOztPQUVHO0lBQ1UsaURBQThCLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0NBQWdDLEVBQUUsS0FBSyxFQUFFO1FBQ2pILFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGtFQUFrRSxDQUFDO1FBQ25ILElBQUksRUFBRSxTQUFTO0tBQ2YsQ0FBQyxDQUFDO0lBRUg7O09BRUc7SUFDVSx5Q0FBc0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSx3QkFBd0IsRUFBRSxLQUFLLEVBQUU7UUFDakcsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLHlEQUF5RCxDQUFDO1FBQ2xHLElBQUksRUFBRSxTQUFTO0tBQ2YsQ0FBQyxDQUFDO0lBRUg7O09BRUc7SUFDVSxpREFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxnQ0FBZ0MsRUFBRSxLQUFLLEVBQUU7UUFDakgsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsa0RBQWtELENBQUM7UUFDekcsSUFBSSxFQUFFLFNBQVM7S0FDZixDQUFDLENBQUM7SUFFSDs7T0FFRztJQUNVLHlDQUFzQixHQUFHLElBQUksYUFBYSxDQUFVLHdCQUF3QixFQUFFLEtBQUssRUFBRTtRQUNqRyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxzRUFBc0UsQ0FBQztRQUMxSCxJQUFJLEVBQUUsU0FBUztLQUNmLENBQUMsQ0FBQztJQUVIOztPQUVHO0lBQ1UsdUNBQW9CLEdBQUcsSUFBSSxhQUFhLENBQVUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSw2Q0FBNkMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyTjs7T0FFRztJQUNVLGlDQUFjLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxtQ0FBbUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6TDs7T0FFRztJQUNVLGlDQUFjLEdBQUcsSUFBSSxhQUFhLENBQVMsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLGtDQUFrQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVLOztPQUVHO0lBQ1UsdUNBQW9CLEdBQUcsSUFBSSxhQUFhLENBQVMsZUFBZSxFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHlDQUF5QyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JNOztPQUVHO0lBQ1UsMkNBQXdCLEdBQUcsSUFBSSxhQUFhLENBQVMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSw0REFBNEQsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVwTzs7T0FFRztJQUNVLGlDQUFjLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxpQ0FBaUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUV2TDs7T0FFRztJQUNVLG9DQUFpQixHQUFHLElBQUksYUFBYSxDQUFVLG1CQUFtQixFQUFFLElBQUksRUFBRTtRQUN0RixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSw2Q0FBNkMsQ0FBQztRQUM3RixJQUFJLEVBQUUsU0FBUztLQUNmLENBQUMsQ0FBQztBQUNKLENBQUMsRUFuRWdCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFtRWxDIn0=
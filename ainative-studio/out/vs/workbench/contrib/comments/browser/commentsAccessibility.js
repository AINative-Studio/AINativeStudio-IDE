/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ctxCommentEditorFocused } from './simpleCommentEditor.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import * as nls from '../../../../nls.js';
import { ToggleTabFocusModeAction } from '../../../../editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export var CommentAccessibilityHelpNLS;
(function (CommentAccessibilityHelpNLS) {
    CommentAccessibilityHelpNLS.intro = nls.localize('intro', "The editor contains commentable range(s). Some useful commands include:");
    CommentAccessibilityHelpNLS.tabFocus = nls.localize('introWidget', "This widget contains a text area, for composition of new comments, and actions, that can be tabbed to once tab moves focus mode has been enabled with the command Toggle Tab Key Moves Focus{0}.", `<keybinding:${ToggleTabFocusModeAction.ID}>`);
    CommentAccessibilityHelpNLS.commentCommands = nls.localize('commentCommands', "Some useful comment commands include:");
    CommentAccessibilityHelpNLS.escape = nls.localize('escape', "- Dismiss Comment (Escape)");
    CommentAccessibilityHelpNLS.nextRange = nls.localize('next', "- Go to Next Commenting Range{0}.", `<keybinding:${"editor.action.nextCommentingRange" /* CommentCommandId.NextRange */}>`);
    CommentAccessibilityHelpNLS.previousRange = nls.localize('previous', "- Go to Previous Commenting Range{0}.", `<keybinding:${"editor.action.previousCommentingRange" /* CommentCommandId.PreviousRange */}>`);
    CommentAccessibilityHelpNLS.nextCommentThread = nls.localize('nextCommentThreadKb', "- Go to Next Comment Thread{0}.", `<keybinding:${"editor.action.nextCommentThreadAction" /* CommentCommandId.NextThread */}>`);
    CommentAccessibilityHelpNLS.previousCommentThread = nls.localize('previousCommentThreadKb', "- Go to Previous Comment Thread{0}.", `<keybinding:${"editor.action.previousCommentThreadAction" /* CommentCommandId.PreviousThread */}>`);
    CommentAccessibilityHelpNLS.nextCommentedRange = nls.localize('nextCommentedRangeKb', "- Go to Next Commented Range{0}.", `<keybinding:${"editor.action.nextCommentedRangeAction" /* CommentCommandId.NextCommentedRange */}>`);
    CommentAccessibilityHelpNLS.previousCommentedRange = nls.localize('previousCommentedRangeKb', "- Go to Previous Commented Range{0}.", `<keybinding:${"editor.action.previousCommentedRangeAction" /* CommentCommandId.PreviousCommentedRange */}>`);
    CommentAccessibilityHelpNLS.addComment = nls.localize('addCommentNoKb', "- Add Comment on Current Selection{0}.", `<keybinding:${"workbench.action.addComment" /* CommentCommandId.Add */}>`);
    CommentAccessibilityHelpNLS.submitComment = nls.localize('submitComment', "- Submit Comment{0}.", `<keybinding:${"editor.action.submitComment" /* CommentCommandId.Submit */}>`);
})(CommentAccessibilityHelpNLS || (CommentAccessibilityHelpNLS = {}));
export class CommentsAccessibilityHelpProvider extends Disposable {
    constructor() {
        super(...arguments);
        this.id = "comments" /* AccessibleViewProviderId.Comments */;
        this.verbositySettingKey = "accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    provideContent() {
        return [CommentAccessibilityHelpNLS.tabFocus, CommentAccessibilityHelpNLS.commentCommands, CommentAccessibilityHelpNLS.escape, CommentAccessibilityHelpNLS.addComment, CommentAccessibilityHelpNLS.submitComment, CommentAccessibilityHelpNLS.nextRange, CommentAccessibilityHelpNLS.previousRange].join('\n');
    }
    onClose() {
        this._element?.focus();
    }
}
export class CommentsAccessibilityHelp {
    constructor() {
        this.priority = 110;
        this.name = 'comments';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.or(ctxCommentEditorFocused, CommentContextKeys.commentFocused);
    }
    getProvider(accessor) {
        return accessor.get(IInstantiationService).createInstance(CommentsAccessibilityHelpProvider);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNBY2Nlc3NpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHNBY2Nlc3NpYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUd2SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHbEUsTUFBTSxLQUFXLDJCQUEyQixDQWEzQztBQWJELFdBQWlCLDJCQUEyQjtJQUM5QixpQ0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLHlFQUF5RSxDQUFDLENBQUM7SUFDekcsb0NBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxrTUFBa00sRUFBRSxlQUFlLHdCQUF3QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDMVIsMkNBQWUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHVDQUF1QyxDQUFDLENBQUM7SUFDM0Ysa0NBQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO0lBQzlELHFDQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsbUNBQW1DLEVBQUUsZUFBZSxvRUFBMEIsR0FBRyxDQUFDLENBQUM7SUFDcEgseUNBQWEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSx1Q0FBdUMsRUFBRSxlQUFlLDRFQUE4QixHQUFHLENBQUMsQ0FBQztJQUNwSSw2Q0FBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGlDQUFpQyxFQUFFLGVBQWUseUVBQTJCLEdBQUcsQ0FBQyxDQUFDO0lBQzFJLGlEQUFxQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUscUNBQXFDLEVBQUUsZUFBZSxpRkFBK0IsR0FBRyxDQUFDLENBQUM7SUFDMUosOENBQWtCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxrQ0FBa0MsRUFBRSxlQUFlLGtGQUFtQyxHQUFHLENBQUMsQ0FBQztJQUNySixrREFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHNDQUFzQyxFQUFFLGVBQWUsMEZBQXVDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JLLHNDQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx3Q0FBd0MsRUFBRSxlQUFlLHdEQUFvQixHQUFHLENBQUMsQ0FBQztJQUM5SCx5Q0FBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHNCQUFzQixFQUFFLGVBQWUsMkRBQXVCLEdBQUcsQ0FBQyxDQUFDO0FBQy9ILENBQUMsRUFiZ0IsMkJBQTJCLEtBQTNCLDJCQUEyQixRQWEzQztBQUVELE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxVQUFVO0lBQWpFOztRQUNDLE9BQUUsc0RBQXFDO1FBQ3ZDLHdCQUFtQixxRkFBNkU7UUFDaEcsWUFBTyxHQUEyQixFQUFFLElBQUksc0NBQXlCLEVBQUUsQ0FBQztJQVFyRSxDQUFDO0lBTkEsY0FBYztRQUNiLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsMkJBQTJCLENBQUMsZUFBZSxFQUFFLDJCQUEyQixDQUFDLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQyxVQUFVLEVBQUUsMkJBQTJCLENBQUMsYUFBYSxFQUFFLDJCQUEyQixDQUFDLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaFQsQ0FBQztJQUNELE9BQU87UUFDTixJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFBdEM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsU0FBSSxHQUFHLFVBQVUsQ0FBQztRQUNsQixTQUFJLHdDQUEyQjtRQUMvQixTQUFJLEdBQUcsY0FBYyxDQUFDLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUkvRixDQUFDO0lBSEEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0lBQzlGLENBQUM7Q0FDRCJ9
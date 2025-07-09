/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../base/common/keyCodes.js';
import './media/review.css';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import * as nls from '../../../../nls.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ICommentService } from './commentService.js';
import { ctxCommentEditorFocused, SimpleCommentEditor } from './simpleCommentEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { CommentController, ID } from './commentsController.js';
import { Range } from '../../../../editor/common/core/range.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { accessibilityHelpIsShown, accessibleViewCurrentProviderId } from '../../accessibility/browser/accessibilityConfiguration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { CommentsInputContentProvider } from './commentsInputContentProvider.js';
import { CommentWidgetFocus } from './commentThreadZoneWidget.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
registerEditorContribution(ID, CommentController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerWorkbenchContribution2(CommentsInputContentProvider.ID, CommentsInputContentProvider, 2 /* WorkbenchPhase.BlockRestore */);
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.nextCommentThreadAction" /* CommentCommandId.NextThread */,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.nextCommentThread(true);
    },
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 512 /* KeyMod.Alt */ | 67 /* KeyCode.F9 */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.previousCommentThreadAction" /* CommentCommandId.PreviousThread */,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.previousCommentThread(true);
    },
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 67 /* KeyCode.F9 */
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.nextCommentedRangeAction" /* CommentCommandId.NextCommentedRange */,
            title: {
                value: nls.localize('comments.NextCommentedRange', "Go to Next Commented Range"),
                original: 'Go to Next Commented Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeEditorHasCommentingRange
            }
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentThread(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.previousCommentedRangeAction" /* CommentCommandId.PreviousCommentedRange */,
            title: {
                value: nls.localize('comments.previousCommentedRange', "Go to Previous Commented Range"),
                original: 'Go to Previous Commented Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeEditorHasCommentingRange
            }
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentThread(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.nextCommentingRange" /* CommentCommandId.NextRange */,
            title: {
                value: nls.localize('comments.nextCommentingRange', "Go to Next Commenting Range"),
                original: 'Go to Next Commenting Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(EditorContextKeys.focus, CommentContextKeys.commentFocused, ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewCurrentProviderId.isEqualTo("comments" /* AccessibleViewProviderId.Comments */))))
            }
        });
    }
    run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentingRange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.previousCommentingRange" /* CommentCommandId.PreviousRange */,
            title: {
                value: nls.localize('comments.previousCommentingRange', "Go to Previous Commenting Range"),
                original: 'Go to Previous Commenting Range'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange
                }],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(EditorContextKeys.focus, CommentContextKeys.commentFocused, ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewCurrentProviderId.isEqualTo("comments" /* AccessibleViewProviderId.Comments */))))
            }
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentingRange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.toggleCommenting" /* CommentCommandId.ToggleCommenting */,
            title: {
                value: nls.localize('comments.toggleCommenting', "Toggle Editor Commenting"),
                original: 'Toggle Editor Commenting'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(ICommentService);
        const enable = commentService.isCommentingEnabled;
        commentService.enableCommenting(!enable);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.addComment" /* CommentCommandId.Add */,
            title: {
                value: nls.localize('comments.addCommand', "Add Comment on Current Selection"),
                original: 'Add Comment on Current Selection'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeCursorHasCommentingRange
                }],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeCursorHasCommentingRange
            }
        });
    }
    async run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = args?.range ? new Range(args.range.startLineNumber, args.range.startLineNumber, args.range.endLineNumber, args.range.endColumn)
            : (args?.fileComment ? undefined : activeEditor.getSelection());
        await controller.addOrToggleCommentAtLine(position, undefined);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.focusCommentOnCurrentLine" /* CommentCommandId.FocusCommentOnCurrentLine */,
            title: {
                value: nls.localize('comments.focusCommentOnCurrentLine', "Focus Comment on Current Line"),
                original: 'Focus Comment on Current Line'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            f1: true,
            precondition: CommentContextKeys.activeCursorHasComment,
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = activeEditor.getSelection();
        const notificationService = accessor.get(INotificationService);
        let error = false;
        try {
            const commentAtLine = controller.getCommentsAtLine(position);
            if (commentAtLine.length === 0) {
                error = true;
            }
            else {
                await controller.revealCommentThread(commentAtLine[0].commentThread.threadId, undefined, false, CommentWidgetFocus.Widget);
            }
        }
        catch (e) {
            error = true;
        }
        if (error) {
            notificationService.error(nls.localize('comments.focusCommand.error', "The cursor must be on a line with a comment to focus the comment"));
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.collapseAllComments" /* CommentCommandId.CollapseAll */,
            title: {
                value: nls.localize('comments.collapseAll', "Collapse All Comments"),
                original: 'Collapse All Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        getActiveController(accessor)?.collapseAll();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.expandAllComments" /* CommentCommandId.ExpandAll */,
            title: {
                value: nls.localize('comments.expandAll', "Expand All Comments"),
                original: 'Expand All Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        getActiveController(accessor)?.expandAll();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.expandUnresolvedComments" /* CommentCommandId.ExpandUnresolved */,
            title: {
                value: nls.localize('comments.expandUnresolved', "Expand Unresolved Comments"),
                original: 'Expand Unresolved Comments'
            },
            category: {
                value: nls.localize('commentsCategory', "Comments"),
                original: 'Comments'
            },
            menu: [{
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting
                }]
        });
    }
    run(accessor, ...args) {
        getActiveController(accessor)?.expandUnresolved();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.submitComment" /* CommentCommandId.Submit */,
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    when: ctxCommentEditorFocused,
    handler: (accessor, args) => {
        const activeCodeEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (activeCodeEditor instanceof SimpleCommentEditor) {
            activeCodeEditor.getParentThread().submitComment();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "workbench.action.hideComment" /* CommentCommandId.Hide */,
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.or(ctxCommentEditorFocused, CommentContextKeys.commentFocused),
    handler: async (accessor, args) => {
        const activeCodeEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        const keybindingService = accessor.get(IKeybindingService);
        // Unfortunate, but collapsing the comment thread might cause a dialog to show
        // If we don't wait for the key up here, then the dialog will consume it and immediately close
        await keybindingService.enableKeybindingHoldMode("workbench.action.hideComment" /* CommentCommandId.Hide */);
        if (activeCodeEditor instanceof SimpleCommentEditor) {
            activeCodeEditor.getParentThread().collapse();
        }
        else if (activeCodeEditor) {
            const controller = CommentController.get(activeCodeEditor);
            if (!controller) {
                return;
            }
            const notificationService = accessor.get(INotificationService);
            const commentService = accessor.get(ICommentService);
            let error = false;
            try {
                const activeComment = commentService.lastActiveCommentcontroller?.activeComment;
                if (!activeComment) {
                    error = true;
                }
                else {
                    controller.collapseAndFocusRange(activeComment.thread.threadId);
                }
            }
            catch (e) {
                error = true;
            }
            if (error) {
                notificationService.error(nls.localize('comments.focusCommand.error', "The cursor must be on a line with a comment to focus the comment"));
            }
        }
    }
});
export function getActiveEditor(accessor) {
    let activeTextEditorControl = accessor.get(IEditorService).activeTextEditorControl;
    if (isDiffEditor(activeTextEditorControl)) {
        if (activeTextEditorControl.getOriginalEditor().hasTextFocus()) {
            activeTextEditorControl = activeTextEditorControl.getOriginalEditor();
        }
        else {
            activeTextEditorControl = activeTextEditorControl.getModifiedEditor();
        }
    }
    if (!isCodeEditor(activeTextEditorControl) || !activeTextEditorControl.hasModel()) {
        return null;
    }
    return activeTextEditorControl;
}
function getActiveController(accessor) {
    const activeEditor = getActiveEditor(accessor);
    if (!activeEditor) {
        return undefined;
    }
    const controller = CommentController.get(activeEditor);
    if (!controller) {
        return undefined;
    }
    return controller;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c0VkaXRvckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFxQixZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUcsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2hFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLCtCQUErQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFdEksT0FBTyxFQUFFLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsMkRBQW1ELENBQUM7QUFDcEcsOEJBQThCLENBQUMsNEJBQTRCLENBQUMsRUFBRSxFQUFFLDRCQUE0QixzQ0FBOEIsQ0FBQztBQUUzSCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLDJFQUE2QjtJQUMvQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUE4QyxFQUFFLEVBQUU7UUFDM0UsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxQixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMxQixDQUFDO1FBQ0QsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDRCxNQUFNLDBDQUFnQztJQUN0QyxPQUFPLEVBQUUsMENBQXVCO0NBQ2hDLENBQUMsQ0FBQztBQUVILG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsbUZBQWlDO0lBQ25DLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQThDLEVBQUUsRUFBRTtRQUMzRSxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLENBQUM7UUFDRCxVQUFVLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUNELE1BQU0sMENBQWdDO0lBQ3RDLE9BQU8sRUFBRSw4Q0FBeUIsc0JBQWE7Q0FDL0MsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxvRkFBcUM7WUFDdkMsS0FBSyxFQUFFO2dCQUNOLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDRCQUE0QixDQUFDO2dCQUNoRixRQUFRLEVBQUUsNEJBQTRCO2FBQ3RDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQztnQkFDbkQsUUFBUSxFQUFFLFVBQVU7YUFDcEI7WUFDRCxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxrQkFBa0IsQ0FBQyw4QkFBOEI7aUJBQ3ZELENBQUM7WUFDRixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLDJDQUF3QjtnQkFDakMsTUFBTSwwQ0FBZ0M7Z0JBQ3RDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyw4QkFBOEI7YUFDdkQ7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ1EsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQ3RELE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBQ0QsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLDRGQUF5QztZQUMzQyxLQUFLLEVBQUU7Z0JBQ04sS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsZ0NBQWdDLENBQUM7Z0JBQ3hGLFFBQVEsRUFBRSxnQ0FBZ0M7YUFDMUM7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxDQUFDO2dCQUNuRCxRQUFRLEVBQUUsVUFBVTthQUNwQjtZQUNELElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGtCQUFrQixDQUFDLDhCQUE4QjtpQkFDdkQsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsOENBQXlCLHVCQUFjO2dCQUNoRCxNQUFNLDBDQUFnQztnQkFDdEMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLDhCQUE4QjthQUN2RDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFDUSxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDdEQsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTztRQUNSLENBQUM7UUFDRCxVQUFVLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDekMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsc0VBQTRCO1lBQzlCLEtBQUssRUFBRTtnQkFDTixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSw2QkFBNkIsQ0FBQztnQkFDbEYsUUFBUSxFQUFFLDZCQUE2QjthQUN2QztZQUNELFFBQVEsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUM7Z0JBQ25ELFFBQVEsRUFBRSxVQUFVO2FBQ3BCO1lBQ0QsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsa0JBQWtCLENBQUMsOEJBQThCO2lCQUN2RCxDQUFDO1lBQ0YsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLEVBQUUsZ0RBQTJCLDZCQUFvQixDQUFDO2dCQUNqRyxNQUFNLDBDQUFnQztnQkFDdEMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsK0JBQStCLENBQUMsU0FBUyxvREFBbUMsQ0FBQyxDQUFDLENBQUM7YUFDdlE7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBOEM7UUFDdEYsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTztRQUNSLENBQUM7UUFDRCxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSw4RUFBZ0M7WUFDbEMsS0FBSyxFQUFFO2dCQUNOLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLGlDQUFpQyxDQUFDO2dCQUMxRixRQUFRLEVBQUUsaUNBQWlDO2FBQzNDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQztnQkFDbkQsUUFBUSxFQUFFLFVBQVU7YUFDcEI7WUFDRCxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxrQkFBa0IsQ0FBQyw4QkFBOEI7aUJBQ3ZELENBQUM7WUFDRixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSxnREFBMkIsMkJBQWtCLENBQUM7Z0JBQy9GLE1BQU0sMENBQWdDO2dCQUN0QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSwrQkFBK0IsQ0FBQyxTQUFTLG9EQUFtQyxDQUFDLENBQUMsQ0FBQzthQUN2UTtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzVELE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBQ0QsVUFBVSxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDdEMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsNkVBQW1DO1lBQ3JDLEtBQUssRUFBRTtnQkFDTixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwwQkFBMEIsQ0FBQztnQkFDNUUsUUFBUSxFQUFFLDBCQUEwQjthQUNwQztZQUNELFFBQVEsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUM7Z0JBQ25ELFFBQVEsRUFBRSxVQUFVO2FBQ3BCO1lBQ0QsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsa0JBQWtCLENBQUMsc0JBQXNCO2lCQUMvQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNRLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUN0RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQztRQUNsRCxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQyxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSwwREFBc0I7WUFDeEIsS0FBSyxFQUFFO2dCQUNOLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGtDQUFrQyxDQUFDO2dCQUM5RSxRQUFRLEVBQUUsa0NBQWtDO2FBQzVDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQztnQkFDbkQsUUFBUSxFQUFFLFVBQVU7YUFDcEI7WUFDRCxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxrQkFBa0IsQ0FBQyw4QkFBOEI7aUJBQ3ZELENBQUM7WUFDRixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSxnREFBMkIsd0JBQWUsQ0FBQztnQkFDNUYsTUFBTSwwQ0FBZ0M7Z0JBQ3RDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyw4QkFBOEI7YUFDdkQ7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLElBQThDO1FBQzVGLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDL0ksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUNqRSxNQUFNLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDaEUsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsK0ZBQTRDO1lBQzlDLEtBQUssRUFBRTtnQkFDTixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSwrQkFBK0IsQ0FBQztnQkFDMUYsUUFBUSxFQUFFLCtCQUErQjthQUN6QztZQUNELFFBQVEsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUM7Z0JBQ25ELFFBQVEsRUFBRSxVQUFVO2FBQ3BCO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsa0JBQWtCLENBQUMsc0JBQXNCO1NBQ3ZELENBQUMsQ0FBQztJQUNKLENBQUM7SUFDUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzVELE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzdDLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9ELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNsQixJQUFJLENBQUM7WUFDSixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0QsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sVUFBVSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDNUgsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLElBQUksQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsa0VBQWtFLENBQUMsQ0FBQyxDQUFDO1FBQzVJLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSwyRUFBOEI7WUFDaEMsS0FBSyxFQUFFO2dCQUNOLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHVCQUF1QixDQUFDO2dCQUNwRSxRQUFRLEVBQUUsdUJBQXVCO2FBQ2pDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQztnQkFDbkQsUUFBUSxFQUFFLFVBQVU7YUFDcEI7WUFDRCxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7b0JBQ3pCLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxzQkFBc0I7aUJBQy9DLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ1EsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQ3RELG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDO0lBQzlDLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLHVFQUE0QjtZQUM5QixLQUFLLEVBQUU7Z0JBQ04sS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUscUJBQXFCLENBQUM7Z0JBQ2hFLFFBQVEsRUFBRSxxQkFBcUI7YUFDL0I7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxDQUFDO2dCQUNuRCxRQUFRLEVBQUUsVUFBVTthQUNwQjtZQUNELElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsY0FBYztvQkFDekIsSUFBSSxFQUFFLGtCQUFrQixDQUFDLHNCQUFzQjtpQkFDL0MsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDUSxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDdEQsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUM7SUFDNUMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUscUZBQW1DO1lBQ3JDLEtBQUssRUFBRTtnQkFDTixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSw0QkFBNEIsQ0FBQztnQkFDOUUsUUFBUSxFQUFFLDRCQUE0QjthQUN0QztZQUNELFFBQVEsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUM7Z0JBQ25ELFFBQVEsRUFBRSxVQUFVO2FBQ3BCO1lBQ0QsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjO29CQUN6QixJQUFJLEVBQUUsa0JBQWtCLENBQUMsc0JBQXNCO2lCQUMvQyxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNRLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBVztRQUN0RCxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO0lBQ25ELENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLDZEQUF5QjtJQUMzQixNQUFNLDBDQUFnQztJQUN0QyxPQUFPLEVBQUUsaURBQThCO0lBQ3ZDLElBQUksRUFBRSx1QkFBdUI7SUFDN0IsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzNCLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDakYsSUFBSSxnQkFBZ0IsWUFBWSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3JELGdCQUFnQixDQUFDLGVBQWUsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7SUFDcEQsRUFBRSw0REFBdUI7SUFDekIsTUFBTSwwQ0FBZ0M7SUFDdEMsT0FBTyx3QkFBZ0I7SUFDdkIsU0FBUyxFQUFFLENBQUMsZ0RBQTZCLENBQUM7SUFDMUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDO0lBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2pDLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDakYsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsOEVBQThFO1FBQzlFLDhGQUE4RjtRQUM5RixNQUFNLGlCQUFpQixDQUFDLHdCQUF3Qiw0REFBdUIsQ0FBQztRQUN4RSxJQUFJLGdCQUFnQixZQUFZLG1CQUFtQixFQUFFLENBQUM7WUFDckQsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDL0MsQ0FBQzthQUFNLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUM3QixNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLE9BQU87WUFDUixDQUFDO1lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDL0QsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNyRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDbEIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQywyQkFBMkIsRUFBRSxhQUFhLENBQUM7Z0JBQ2hGLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDcEIsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDZCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsVUFBVSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2pFLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2QsQ0FBQztZQUNELElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsa0VBQWtFLENBQUMsQ0FBQyxDQUFDO1lBQzVJLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILE1BQU0sVUFBVSxlQUFlLENBQUMsUUFBMEI7SUFDekQsSUFBSSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDO0lBRW5GLElBQUksWUFBWSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztRQUMzQyxJQUFJLHVCQUF1QixDQUFDLGlCQUFpQixFQUFFLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUNoRSx1QkFBdUIsR0FBRyx1QkFBdUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZFLENBQUM7YUFBTSxDQUFDO1lBQ1AsdUJBQXVCLEdBQUcsdUJBQXVCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN2RSxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7UUFDbkYsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyx1QkFBdUIsQ0FBQztBQUNoQyxDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxRQUEwQjtJQUN0RCxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0MsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ25CLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2pCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxPQUFPLFVBQVUsQ0FBQztBQUNuQixDQUFDIn0=
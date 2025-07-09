/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import './commentsEditorContribution.js';
import { ICommentService, CommentService } from './commentService.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions } from '../../../common/contributions.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { COMMENTS_VIEW_ID } from './commentsTreeViewer.js';
import { CommentThreadState } from '../../../../editor/common/languages.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CONTEXT_KEY_HAS_COMMENTS, CONTEXT_KEY_SOME_COMMENTS_EXPANDED } from './commentsView.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { revealCommentThread } from './commentsController.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown } from '../../accessibility/browser/accessibilityConfiguration.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { CommentsAccessibleView, CommentThreadAccessibleView } from './commentsAccessibleView.js';
import { CommentsAccessibilityHelp } from './commentsAccessibility.js';
registerAction2(class Collapse extends ViewAction {
    constructor() {
        super({
            viewId: COMMENTS_VIEW_ID,
            id: 'comments.collapse',
            title: nls.localize('collapseAll', "Collapse All"),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.and(ContextKeyExpr.equals('view', COMMENTS_VIEW_ID), CONTEXT_KEY_HAS_COMMENTS), CONTEXT_KEY_SOME_COMMENTS_EXPANDED),
                order: 100
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
registerAction2(class Expand extends ViewAction {
    constructor() {
        super({
            viewId: COMMENTS_VIEW_ID,
            id: 'comments.expand',
            title: nls.localize('expandAll', "Expand All"),
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.and(ContextKeyExpr.equals('view', COMMENTS_VIEW_ID), CONTEXT_KEY_HAS_COMMENTS), ContextKeyExpr.not(CONTEXT_KEY_SOME_COMMENTS_EXPANDED.key)),
                order: 100
            }
        });
    }
    runInView(_accessor, view) {
        view.expandAll();
    }
});
registerAction2(class Reply extends Action2 {
    constructor() {
        super({
            id: 'comments.reply',
            title: nls.localize('reply', "Reply"),
            icon: Codicon.reply,
            precondition: ContextKeyExpr.equals('canReply', true),
            menu: [{
                    id: MenuId.CommentsViewThreadActions,
                    order: 100
                },
                {
                    id: MenuId.AccessibleView,
                    when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "comments" /* AccessibleViewProviderId.Comments */)),
                }]
        });
    }
    run(accessor, marshalledCommentThread) {
        const commentService = accessor.get(ICommentService);
        const editorService = accessor.get(IEditorService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        revealCommentThread(commentService, editorService, uriIdentityService, marshalledCommentThread.thread, marshalledCommentThread.thread.comments[marshalledCommentThread.thread.comments.length - 1], true);
    }
});
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'comments',
    order: 20,
    title: nls.localize('commentsConfigurationTitle', "Comments"),
    type: 'object',
    properties: {
        'comments.openPanel': {
            enum: ['neverOpen', 'openOnSessionStart', 'openOnSessionStartWithComments'],
            default: 'openOnSessionStartWithComments',
            description: nls.localize('openComments', "Controls when the comments panel should open."),
            restricted: false,
            markdownDeprecationMessage: nls.localize('comments.openPanel.deprecated', "This setting is deprecated in favor of `comments.openView`.")
        },
        'comments.openView': {
            enum: ['never', 'file', 'firstFile', 'firstFileUnresolved'],
            enumDescriptions: [nls.localize('comments.openView.never', "The comments view will never be opened."), nls.localize('comments.openView.file', "The comments view will open when a file with comments is active."), nls.localize('comments.openView.firstFile', "If the comments view has not been opened yet during this session it will open the first time during a session that a file with comments is active."), nls.localize('comments.openView.firstFileUnresolved', "If the comments view has not been opened yet during this session and the comment is not resolved, it will open the first time during a session that a file with comments is active.")],
            default: 'firstFile',
            description: nls.localize('comments.openView', "Controls when the comments view should open."),
            restricted: false
        },
        'comments.useRelativeTime': {
            type: 'boolean',
            default: true,
            description: nls.localize('useRelativeTime', "Determines if relative time will be used in comment timestamps (ex. '1 day ago').")
        },
        'comments.visible': {
            type: 'boolean',
            default: true,
            description: nls.localize('comments.visible', "Controls the visibility of the comments bar and comment threads in editors that have commenting ranges and comments. Comments are still accessible via the Comments view and will cause commenting to be toggled on in the same way running the command \"Comments: Toggle Editor Commenting\" toggles comments.")
        },
        'comments.maxHeight': {
            type: 'boolean',
            default: true,
            description: nls.localize('comments.maxHeight', "Controls whether the comments widget scrolls or expands.")
        },
        'comments.collapseOnResolve': {
            type: 'boolean',
            default: true,
            description: nls.localize('collapseOnResolve', "Controls whether the comment thread should collapse when the thread is resolved.")
        },
        'comments.thread.confirmOnCollapse': {
            type: 'string',
            enum: ['whenHasUnsubmittedComments', 'never'],
            enumDescriptions: [nls.localize('confirmOnCollapse.whenHasUnsubmittedComments', "Show a confirmation dialog when collapsing a comment thread with unsubmitted comments."), nls.localize('confirmOnCollapse.never', "Never show a confirmation dialog when collapsing a comment thread.")],
            default: 'whenHasUnsubmittedComments',
            description: nls.localize('confirmOnCollapse', "Controls whether a confirmation dialog is shown when collapsing a comment thread.")
        }
    }
});
registerSingleton(ICommentService, CommentService, 1 /* InstantiationType.Delayed */);
let UnresolvedCommentsBadge = class UnresolvedCommentsBadge extends Disposable {
    constructor(_commentService, activityService) {
        super();
        this._commentService = _commentService;
        this.activityService = activityService;
        this.activity = this._register(new MutableDisposable());
        this.totalUnresolved = 0;
        this._register(this._commentService.onDidSetAllCommentThreads(this.onAllCommentsChanged, this));
        this._register(this._commentService.onDidUpdateCommentThreads(this.onCommentsUpdated, this));
    }
    onAllCommentsChanged(e) {
        let unresolved = 0;
        for (const thread of e.commentThreads) {
            if (thread.state === CommentThreadState.Unresolved) {
                unresolved++;
            }
        }
        this.updateBadge(unresolved);
    }
    onCommentsUpdated() {
        let unresolved = 0;
        for (const resource of this._commentService.commentsModel.resourceCommentThreads) {
            for (const thread of resource.commentThreads) {
                if (thread.threadState === CommentThreadState.Unresolved) {
                    unresolved++;
                }
            }
        }
        this.updateBadge(unresolved);
    }
    updateBadge(unresolved) {
        if (unresolved === this.totalUnresolved) {
            return;
        }
        this.totalUnresolved = unresolved;
        const message = nls.localize('totalUnresolvedComments', '{0} Unresolved Comments', this.totalUnresolved);
        this.activity.value = this.activityService.showViewActivity(COMMENTS_VIEW_ID, { badge: new NumberBadge(this.totalUnresolved, () => message) });
    }
};
UnresolvedCommentsBadge = __decorate([
    __param(0, ICommentService),
    __param(1, IActivityService)
], UnresolvedCommentsBadge);
export { UnresolvedCommentsBadge };
Registry.as(Extensions.Workbench).registerWorkbenchContribution(UnresolvedCommentsBadge, 4 /* LifecyclePhase.Eventually */);
AccessibleViewRegistry.register(new CommentsAccessibleView());
AccessibleViewRegistry.register(new CommentThreadAccessibleView());
AccessibleViewRegistry.register(new CommentsAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFpQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3JHLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFFbkosT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUEyRCxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUU1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsa0NBQWtDLEVBQWlC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
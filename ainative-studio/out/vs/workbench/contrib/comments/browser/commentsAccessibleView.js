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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { COMMENTS_VIEW_ID, CommentsMenus } from './commentsTreeViewer.js';
import { CONTEXT_KEY_COMMENT_FOCUSED } from './commentsView.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ICommentService } from './commentService.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { moveToNextCommentInThread as findNextCommentInThread, revealCommentThread } from './commentsController.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { URI } from '../../../../base/common/uri.js';
export class CommentsAccessibleView extends Disposable {
    getProvider(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        const viewsService = accessor.get(IViewsService);
        const menuService = accessor.get(IMenuService);
        const commentsView = viewsService.getActiveViewWithId(COMMENTS_VIEW_ID);
        const focusedCommentNode = commentsView?.focusedCommentNode;
        if (!commentsView || !focusedCommentNode) {
            return;
        }
        const menus = this._register(new CommentsMenus(menuService));
        menus.setContextKeyService(contextKeyService);
        return new CommentsAccessibleContentProvider(commentsView, focusedCommentNode, menus);
    }
    constructor() {
        super();
        this.priority = 90;
        this.name = 'comment';
        this.when = CONTEXT_KEY_COMMENT_FOCUSED;
        this.type = "view" /* AccessibleViewType.View */;
    }
}
export class CommentThreadAccessibleView extends Disposable {
    getProvider(accessor) {
        const commentService = accessor.get(ICommentService);
        const editorService = accessor.get(IEditorService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const threads = commentService.commentsModel.hasCommentThreads();
        if (!threads) {
            return;
        }
        return new CommentsThreadWidgetAccessibleContentProvider(commentService, editorService, uriIdentityService);
    }
    constructor() {
        super();
        this.priority = 85;
        this.name = 'commentThread';
        this.when = CommentContextKeys.commentFocused;
        this.type = "view" /* AccessibleViewType.View */;
    }
}
class CommentsAccessibleContentProvider extends Disposable {
    constructor(_commentsView, _focusedCommentNode, _menus) {
        super();
        this._commentsView = _commentsView;
        this._focusedCommentNode = _focusedCommentNode;
        this._menus = _menus;
        this.id = "comments" /* AccessibleViewProviderId.Comments */;
        this.verbositySettingKey = "accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this.actions = [...this._menus.getResourceContextActions(this._focusedCommentNode)].filter(i => i.enabled).map(action => {
            return {
                ...action,
                run: () => {
                    this._commentsView.focus();
                    action.run({
                        thread: this._focusedCommentNode.thread,
                        $mid: 7 /* MarshalledId.CommentThread */,
                        commentControlHandle: this._focusedCommentNode.controllerHandle,
                        commentThreadHandle: this._focusedCommentNode.threadHandle,
                    });
                }
            };
        });
    }
    provideContent() {
        const commentNode = this._commentsView.focusedCommentNode;
        const content = this._commentsView.focusedCommentInfo?.toString();
        if (!commentNode || !content) {
            throw new Error('Comment tree is focused but no comment is selected');
        }
        return content;
    }
    onClose() {
        this._commentsView.focus();
    }
    provideNextContent() {
        this._commentsView.focusNextNode();
        return this.provideContent();
    }
    providePreviousContent() {
        this._commentsView.focusPreviousNode();
        return this.provideContent();
    }
}
let CommentsThreadWidgetAccessibleContentProvider = class CommentsThreadWidgetAccessibleContentProvider extends Disposable {
    constructor(_commentService, _editorService, _uriIdentityService) {
        super();
        this._commentService = _commentService;
        this._editorService = _editorService;
        this._uriIdentityService = _uriIdentityService;
        this.id = "commentThread" /* AccessibleViewProviderId.CommentThread */;
        this.verbositySettingKey = "accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
    }
    get activeCommentInfo() {
        if (!this._activeCommentInfo && this._commentService.lastActiveCommentcontroller) {
            this._activeCommentInfo = this._commentService.lastActiveCommentcontroller.activeComment;
        }
        return this._activeCommentInfo;
    }
    provideContent() {
        if (!this.activeCommentInfo) {
            throw new Error('No current comment thread');
        }
        const comment = this.activeCommentInfo.comment?.body;
        const commentLabel = typeof comment === 'string' ? comment : comment?.value ?? '';
        const resource = this.activeCommentInfo.thread.resource;
        const range = this.activeCommentInfo.thread.range;
        let contentLabel = '';
        if (resource && range) {
            const editor = this._editorService.findEditors(URI.parse(resource)) || [];
            const codeEditor = this._editorService.activeEditorPane?.getControl();
            if (editor?.length && isCodeEditor(codeEditor)) {
                const content = codeEditor.getModel()?.getValueInRange(range);
                if (content) {
                    contentLabel = '\nCorresponding code: \n' + content;
                }
            }
        }
        return commentLabel + contentLabel;
    }
    onClose() {
        const lastComment = this._activeCommentInfo;
        this._activeCommentInfo = undefined;
        if (lastComment) {
            revealCommentThread(this._commentService, this._editorService, this._uriIdentityService, lastComment.thread, lastComment.comment);
        }
    }
    provideNextContent() {
        const newCommentInfo = findNextCommentInThread(this._activeCommentInfo, 'next');
        if (newCommentInfo) {
            this._activeCommentInfo = newCommentInfo;
            return this.provideContent();
        }
        return undefined;
    }
    providePreviousContent() {
        const newCommentInfo = findNextCommentInThread(this._activeCommentInfo, 'previous');
        if (newCommentInfo) {
            this._activeCommentInfo = newCommentInfo;
            return this.provideContent();
        }
        return undefined;
    }
};
CommentsThreadWidgetAccessibleContentProvider = __decorate([
    __param(0, ICommentService),
    __param(1, IEditorService),
    __param(2, IUriIdentityService)
], CommentsThreadWidgetAccessibleContentProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzQWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBS2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDMUUsT0FBTyxFQUFpQiwyQkFBMkIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckUsT0FBTyxFQUFFLHlCQUF5QixJQUFJLHVCQUF1QixFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDcEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFLckQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7SUFLckQsV0FB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
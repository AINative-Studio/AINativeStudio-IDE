/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
import { CommentsViewFilterFocusContextKey } from './comments.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { COMMENTS_VIEW_ID } from './commentsTreeViewer.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { Codicon } from '../../../../base/common/codicons.js';
export var CommentsSortOrder;
(function (CommentsSortOrder) {
    CommentsSortOrder["ResourceAscending"] = "resourceAscending";
    CommentsSortOrder["UpdatedAtDescending"] = "updatedAtDescending";
})(CommentsSortOrder || (CommentsSortOrder = {}));
const CONTEXT_KEY_SHOW_RESOLVED = new RawContextKey('commentsView.showResolvedFilter', true);
const CONTEXT_KEY_SHOW_UNRESOLVED = new RawContextKey('commentsView.showUnResolvedFilter', true);
const CONTEXT_KEY_SORT_BY = new RawContextKey('commentsView.sortBy', "resourceAscending" /* CommentsSortOrder.ResourceAscending */);
export class CommentsFilters extends Disposable {
    constructor(options, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._showUnresolved = CONTEXT_KEY_SHOW_UNRESOLVED.bindTo(this.contextKeyService);
        this._showResolved = CONTEXT_KEY_SHOW_RESOLVED.bindTo(this.contextKeyService);
        this._sortBy = CONTEXT_KEY_SORT_BY.bindTo(this.contextKeyService);
        this._showResolved.set(options.showResolved);
        this._showUnresolved.set(options.showUnresolved);
        this._sortBy.set(options.sortBy);
    }
    get showUnresolved() {
        return !!this._showUnresolved.get();
    }
    set showUnresolved(showUnresolved) {
        if (this._showUnresolved.get() !== showUnresolved) {
            this._showUnresolved.set(showUnresolved);
            this._onDidChange.fire({ showUnresolved: true });
        }
    }
    get showResolved() {
        return !!this._showResolved.get();
    }
    set showResolved(showResolved) {
        if (this._showResolved.get() !== showResolved) {
            this._showResolved.set(showResolved);
            this._onDidChange.fire({ showResolved: true });
        }
    }
    get sortBy() {
        return this._sortBy.get() ?? "resourceAscending" /* CommentsSortOrder.ResourceAscending */;
    }
    set sortBy(sortBy) {
        if (this._sortBy.get() !== sortBy) {
            this._sortBy.set(sortBy);
            this._onDidChange.fire({ sortBy });
        }
    }
}
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'commentsFocusViewFromFilter',
            title: localize('focusCommentsList', "Focus Comments view"),
            keybinding: {
                when: CommentsViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
            },
            viewId: COMMENTS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, commentsView) {
        commentsView.focus();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'commentsClearFilterText',
            title: localize('commentsClearFilterText', "Clear filter text"),
            keybinding: {
                when: CommentsViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 9 /* KeyCode.Escape */
            },
            viewId: COMMENTS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, commentsView) {
        commentsView.clearFilterText();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'commentsFocusFilter',
            title: localize('focusCommentsFilter', "Focus comments filter"),
            keybinding: {
                when: FocusedViewContext.isEqualTo(COMMENTS_VIEW_ID),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */
            },
            viewId: COMMENTS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, commentsView) {
        commentsView.focusFilter();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleUnResolvedComments`,
            title: localize('toggle unresolved', "Show Unresolved"),
            category: localize('comments', "Comments"),
            toggled: {
                condition: CONTEXT_KEY_SHOW_UNRESOLVED,
                title: localize('unresolved', "Show Unresolved"),
            },
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', COMMENTS_VIEW_ID),
                order: 1
            },
            viewId: COMMENTS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showUnresolved = !view.filters.showUnresolved;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleResolvedComments`,
            title: localize('toggle resolved', "Show Resolved"),
            category: localize('comments', "Comments"),
            toggled: {
                condition: CONTEXT_KEY_SHOW_RESOLVED,
                title: localize('resolved', "Show Resolved"),
            },
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', COMMENTS_VIEW_ID),
                order: 1
            },
            viewId: COMMENTS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showResolved = !view.filters.showResolved;
    }
});
const commentSortSubmenu = new MenuId('submenu.filter.commentSort');
MenuRegistry.appendMenuItem(viewFilterSubmenu, {
    submenu: commentSortSubmenu,
    title: localize('comment sorts', "Sort By"),
    group: '2_sort',
    icon: Codicon.history,
    when: ContextKeyExpr.equals('view', COMMENTS_VIEW_ID),
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleSortByUpdatedAt`,
            title: localize('toggle sorting by updated at', "Updated Time"),
            category: localize('comments', "Comments"),
            icon: Codicon.history,
            viewId: COMMENTS_VIEW_ID,
            toggled: {
                condition: ContextKeyExpr.equals(CONTEXT_KEY_SORT_BY.key, "updatedAtDescending" /* CommentsSortOrder.UpdatedAtDescending */),
                title: localize('sorting by updated at', "Updated Time"),
            },
            menu: {
                id: commentSortSubmenu,
                group: 'navigation',
                order: 1,
                isHiddenByDefault: false,
            },
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.sortBy = "updatedAtDescending" /* CommentsSortOrder.UpdatedAtDescending */;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${COMMENTS_VIEW_ID}.toggleSortByResource`,
            title: localize('toggle sorting by resource', "Position in File"),
            category: localize('comments', "Comments"),
            icon: Codicon.history,
            viewId: COMMENTS_VIEW_ID,
            toggled: {
                condition: ContextKeyExpr.equals(CONTEXT_KEY_SORT_BY.key, "resourceAscending" /* CommentsSortOrder.ResourceAscending */),
                title: localize('sorting by position in file', "Position in File"),
            },
            menu: {
                id: commentSortSubmenu,
                group: 'navigation',
                order: 0,
                isHiddenByDefault: false,
            },
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.sortBy = "resourceAscending" /* CommentsSortOrder.ResourceAscending */;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNWaWV3QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzVmlld0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsY0FBYyxFQUFtQyxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlDQUFpQyxFQUFpQixNQUFNLGVBQWUsQ0FBQztBQUNqRixPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE1BQU0sQ0FBTixJQUFrQixpQkFHakI7QUFIRCxXQUFrQixpQkFBaUI7SUFDbEMsNERBQXVDLENBQUE7SUFDdkMsZ0VBQTJDLENBQUE7QUFDNUMsQ0FBQyxFQUhpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBR2xDO0FBR0QsTUFBTSx5QkFBeUIsR0FBRyxJQUFJ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
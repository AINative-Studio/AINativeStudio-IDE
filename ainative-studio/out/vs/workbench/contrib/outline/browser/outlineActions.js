/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ctxAllCollapsed, ctxFilterOnType, ctxFollowsCursor, ctxSortMode, IOutlinePane } from './outline.js';
// --- commands
registerAction2(class CollapseAll extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.collapse',
            title: localize('collapse', "Collapse All"),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), ctxAllCollapsed.isEqualTo(false))
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
registerAction2(class ExpandAll extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.expand',
            title: localize('expand', "Expand All"),
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), ctxAllCollapsed.isEqualTo(true))
            }
        });
    }
    runInView(_accessor, view) {
        view.expandAll();
    }
});
registerAction2(class FollowCursor extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.followCursor',
            title: localize('followCur', "Follow Cursor"),
            f1: false,
            toggled: ctxFollowsCursor,
            menu: {
                id: MenuId.ViewTitle,
                group: 'config',
                order: 1,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.followCursor = !view.outlineViewState.followCursor;
    }
});
registerAction2(class FilterOnType extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.filterOnType',
            title: localize('filterOnType', "Filter on Type"),
            f1: false,
            toggled: ctxFilterOnType,
            menu: {
                id: MenuId.ViewTitle,
                group: 'config',
                order: 2,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.filterOnType = !view.outlineViewState.filterOnType;
    }
});
registerAction2(class SortByPosition extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByPosition',
            title: localize('sortByPosition', "Sort By: Position"),
            f1: false,
            toggled: ctxSortMode.isEqualTo(0 /* OutlineSortOrder.ByPosition */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 1,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 0 /* OutlineSortOrder.ByPosition */;
    }
});
registerAction2(class SortByName extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByName',
            title: localize('sortByName', "Sort By: Name"),
            f1: false,
            toggled: ctxSortMode.isEqualTo(1 /* OutlineSortOrder.ByName */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 2,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 1 /* OutlineSortOrder.ByName */;
    }
});
registerAction2(class SortByKind extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByKind',
            title: localize('sortByKind', "Sort By: Category"),
            f1: false,
            toggled: ctxSortMode.isEqualTo(2 /* OutlineSortOrder.ByKind */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 3,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 2 /* OutlineSortOrder.ByKind */;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0bGluZS9icm93c2VyL291dGxpbmVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQW9CLE1BQU0sY0FBYyxDQUFDO0FBRy9ILGVBQWU7QUFFZixlQUFlLENBQUMsTUFBTSxXQUFZLFNBQVEsVUFBd0I7SUFDakU7UUFDQyxLQUFLLENBQUM7WUFDTCxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUU7WUFDdkIsRUFBRSxFQUFFLGtCQUFrQjtZQUN0QixLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUM7WUFDM0MsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDekIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztnQkFDcEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxF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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import * as cssJs from '../../../../base/browser/cssValue.js';
import { Action } from '../../../../base/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
export class ToggleReactionsAction extends Action {
    static { this.ID = 'toolbar.toggle.pickReactions'; }
    constructor(toggleDropdownMenu, title) {
        super(ToggleReactionsAction.ID, title || nls.localize('pickReactions', "Pick Reactions..."), 'toggle-reactions', true);
        this._menuActions = [];
        this.toggleDropdownMenu = toggleDropdownMenu;
    }
    run() {
        this.toggleDropdownMenu();
        return Promise.resolve(true);
    }
    get menuActions() {
        return this._menuActions;
    }
    set menuActions(actions) {
        this._menuActions = actions;
    }
}
export class ReactionActionViewItem extends ActionViewItem {
    constructor(action) {
        super(null, action, {});
    }
    updateLabel() {
        if (!this.label) {
            return;
        }
        const action = this.action;
        if (action.class) {
            this.label.classList.add(action.class);
        }
        if (!action.icon) {
            const reactionLabel = dom.append(this.label, dom.$('span.reaction-label'));
            reactionLabel.innerText = action.label;
        }
        else {
            const reactionIcon = dom.append(this.label, dom.$('.reaction-icon'));
            const uri = URI.revive(action.icon);
            reactionIcon.style.backgroundImage = cssJs.asCSSUrl(uri);
        }
        if (action.count) {
            const reactionCount = dom.append(this.label, dom.$('span.reaction-count'));
            reactionCount.innerText = `${action.count}`;
        }
    }
    getTooltip() {
        const action = this.action;
        const toggleMessage = action.enabled ? nls.localize('comment.toggleableReaction', "Toggle reaction, ") : '';
        if (action.count === undefined) {
            return nls.localize({
                key: 'comment.reactionLabelNone', comment: [
                    'This is a tooltip for an emoji button so that the current user can toggle their reaction to a comment.',
                    'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second is the name of the reaction.'
                ]
            }, "{0}{1} reaction", toggleMessage, action.label);
        }
        else if (action.reactors === undefined || action.reactors.length === 0) {
            if (action.count === 1) {
                return nls.localize({
                    key: 'comment.reactionLabelOne', comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is 1.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second is the name of the reaction.'
                    ]
                }, "{0}1 reaction with {1}", toggleMessage, action.label);
            }
            else if (action.count > 1) {
                return nls.localize({
                    key: 'comment.reactionLabelMany', comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is greater than 1.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second is number of users who have reacted with that reaction, and the third is the name of the reaction.'
                    ]
                }, "{0}{1} reactions with {2}", toggleMessage, action.count, action.label);
            }
        }
        else {
            if (action.reactors.length <= 10 && action.reactors.length === action.count) {
                return nls.localize({
                    key: 'comment.reactionLessThanTen', comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is less than or equal to 10.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second iis a list of the reactors, and the third is the name of the reaction.'
                    ]
                }, "{0}{1} reacted with {2}", toggleMessage, action.reactors.join(', '), action.label);
            }
            else if (action.count > 1) {
                const displayedReactors = action.reactors.slice(0, 10);
                return nls.localize({
                    key: 'comment.reactionMoreThanTen', comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is less than or equal to 10.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second iis a list of the reactors, and the third is the name of the reaction.'
                    ]
                }, "{0}{1} and {2} more reacted with {3}", toggleMessage, displayedReactors.join(', '), action.count - displayedReactors.length, action.label);
            }
        }
        return undefined;
    }
}
export class ReactionAction extends Action {
    static { this.ID = 'toolbar.toggle.reaction'; }
    constructor(id, label = '', cssClass = '', enabled = true, actionCallback, reactors, icon, count) {
        super(ReactionAction.ID, label, cssClass, enabled, actionCallback);
        this.reactors = reactors;
        this.icon = icon;
        this.count = count;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3Rpb25zQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvcmVhY3Rpb25zQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssS0FBSyxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUUxRixNQUFNLE9BQU8scUJBQXNCLFNBQVEsTUFBTTthQUNoQyxPQUFFLEdBQUcsOEJBQThCLEFBQWpDLENBQWtDO0lBR3BELFlBQVksa0JBQThCLEVBQUUsS0FBYztRQUN6RCxLQUFLLENBQUMscUJBQXFCLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBSGhILGlCQUFZLEdBQWMsRUFBRSxDQUFDO1FBSXBDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztJQUM5QyxDQUFDO0lBQ1EsR0FBRztRQUNYLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzFCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBQ0QsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFDRCxJQUFJLFdBQVcsQ0FBQyxPQUFrQjtRQUNqQyxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztJQUM3QixDQUFDOztBQUVGLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxjQUFjO0lBQ3pELFlBQVksTUFBc0I7UUFDakMsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUNrQixXQUFXO1FBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBd0IsQ0FBQztRQUM3QyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xCLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztZQUMzRSxhQUFhLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDckUsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEIsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1lBQzNFLGFBQWEsQ0FBQyxTQUFTLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDN0MsQ0FBQztJQUNGLENBQUM7SUFFa0IsVUFBVTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBd0IsQ0FBQztRQUM3QyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUU1RyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDO2dCQUNuQixHQUFHLEVBQUUsMkJBQTJCLEVBQUUsT0FBTyxFQUFFO29CQUMxQyx3R0FBd0c7b0JBQ3hHLG9LQUFvSztpQkFBQzthQUN0SyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEQsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUUsSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN4QixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUM7b0JBQ25CLEdBQUcsRUFBRSwwQkFBMEIsRUFBRSxPQUFPLEVBQUU7d0JBQ3pDLHlHQUF5Rzt3QkFDekcsK0ZBQStGO3dCQUMvRixvS0FBb0s7cUJBQUM7aUJBQ3RLLEVBQUUsd0JBQXdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzRCxDQUFDO2lCQUFNLElBQUksTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDO29CQUNuQixHQUFHLEVBQUUsMkJBQTJCLEVBQUUsT0FBTyxFQUFFO3dCQUMxQyxzSEFBc0g7d0JBQ3RILCtGQUErRjt3QkFDL0YsME9BQTBPO3FCQUFDO2lCQUM1TyxFQUFFLDJCQUEyQixFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1RSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLEVBQUUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzdFLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQztvQkFDbkIsR0FBRyxFQUFFLDZCQUE2QixFQUFFLE9BQU8sRUFBRTt3QkFDNUMsZ0lBQWdJO3dCQUNoSSwrRkFBK0Y7d0JBQy9GLDhNQUE4TTtxQkFBQztpQkFDaE4sRUFBRSx5QkFBeUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hGLENBQUM7aUJBQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM3QixNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdkQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDO29CQUNuQixHQUFHLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxFQUFFO3dCQUM1QyxnSUFBZ0k7d0JBQ2hJLCtGQUErRjt3QkFDL0YsOE1BQThNO3FCQUFDO2lCQUNoTixFQUFFLHNDQUFzQyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hKLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBQ0QsTUFBTSxPQUFPLGNBQWUsU0FBUSxNQUFNO2FBQ3pCLE9BQUUsR0FBRyx5QkFBeUIsQ0FBQztJQUMvQyxZQUFZLEVBQVUsRUFBRSxRQUFnQixFQUFFLEVBQUUsV0FBbUIsRUFBRSxFQUFFLFVBQW1CLElBQUksRUFBRSxjQUE4QyxFQUFrQixRQUE0QixFQUFTLElBQW9CLEVBQVMsS0FBYztRQUMzTyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUR3RixhQUFRLEdBQVIsUUFBUSxDQUFvQjtRQUFTLFNBQUksR0FBSixJQUFJLENBQWdCO1FBQVMsVUFBSyxHQUFMLEtBQUssQ0FBUztJQUU1TyxDQUFDIn0=
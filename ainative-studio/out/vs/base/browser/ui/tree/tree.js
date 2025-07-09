/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var TreeVisibility;
(function (TreeVisibility) {
    /**
     * The tree node should be hidden.
     */
    TreeVisibility[TreeVisibility["Hidden"] = 0] = "Hidden";
    /**
     * The tree node should be visible.
     */
    TreeVisibility[TreeVisibility["Visible"] = 1] = "Visible";
    /**
     * The tree node should be visible if any of its descendants is visible.
     */
    TreeVisibility[TreeVisibility["Recurse"] = 2] = "Recurse";
})(TreeVisibility || (TreeVisibility = {}));
export var ObjectTreeElementCollapseState;
(function (ObjectTreeElementCollapseState) {
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["Expanded"] = 0] = "Expanded";
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["Collapsed"] = 1] = "Collapsed";
    /**
     * If the element is already in the tree, preserve its current state. Else, expand it.
     */
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["PreserveOrExpanded"] = 2] = "PreserveOrExpanded";
    /**
     * If the element is already in the tree, preserve its current state. Else, collapse it.
     */
    ObjectTreeElementCollapseState[ObjectTreeElementCollapseState["PreserveOrCollapsed"] = 3] = "PreserveOrCollapsed";
})(ObjectTreeElementCollapseState || (ObjectTreeElementCollapseState = {}));
export var TreeMouseEventTarget;
(function (TreeMouseEventTarget) {
    TreeMouseEventTarget[TreeMouseEventTarget["Unknown"] = 0] = "Unknown";
    TreeMouseEventTarget[TreeMouseEventTarget["Twistie"] = 1] = "Twistie";
    TreeMouseEventTarget[TreeMouseEventTarget["Element"] = 2] = "Element";
    TreeMouseEventTarget[TreeMouseEventTarget["Filter"] = 3] = "Filter";
})(TreeMouseEventTarget || (TreeMouseEventTarget = {}));
export var TreeDragOverBubble;
(function (TreeDragOverBubble) {
    TreeDragOverBubble[TreeDragOverBubble["Down"] = 0] = "Down";
    TreeDragOverBubble[TreeDragOverBubble["Up"] = 1] = "Up";
})(TreeDragOverBubble || (TreeDragOverBubble = {}));
export const TreeDragOverReactions = {
    acceptBubbleUp() { return { accept: true, bubble: 1 /* TreeDragOverBubble.Up */ }; },
    acceptBubbleDown(autoExpand = false) { return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, autoExpand }; },
    acceptCopyBubbleUp() { return { accept: true, bubble: 1 /* TreeDragOverBubble.Up */, effect: { type: 0 /* ListDragOverEffectType.Copy */, position: "drop-target" /* ListDragOverEffectPosition.Over */ } }; },
    acceptCopyBubbleDown(autoExpand = false) { return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect: { type: 0 /* ListDragOverEffectType.Copy */, position: "drop-target" /* ListDragOverEffectPosition.Over */ }, autoExpand }; }
};
export class TreeError extends Error {
    constructor(user, message) {
        super(`TreeError [${user}] ${message}`);
    }
}
export class WeakMapper {
    constructor(fn) {
        this.fn = fn;
        this._map = new WeakMap();
    }
    map(key) {
        let result = this._map.get(key);
        if (!result) {
            result = this.fn(key);
            this._map.set(key, result);
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdHJlZS90cmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBUWhHLE1BQU0sQ0FBTixJQUFrQixjQWdCakI7QUFoQkQsV0FBa0IsY0FBYztJQUUvQjs7T0FFRztJQUNILHVEQUFNLENBQUE7SUFFTjs7T0FFRztJQUNILHlEQUFPLENBQUE7SUFFUDs7T0FFRztJQUNILHlEQUFPLENBQUE7QUFDUixDQUFDLEVBaEJpQixjQUFjLEtBQWQsY0FBYyxRQWdCL0I7QUF1REQsTUFBTSxDQUFOLElBQVksOEJBYVg7QUFiRCxXQUFZLDhCQUE4QjtJQUN6QywyRkFBUSxDQUFBO0lBQ1IsNkZBQVMsQ0FBQTtJQUVUOztPQUVHO0lBQ0gsK0dBQWtCLENBQUE7SUFFbEI7O09BRUc7SUFDSCxpSEFBbUIsQ0FBQTtBQUNwQixDQUFDLEVBYlcsOEJBQThCLEtBQTlCLDhCQUE4QixRQWF6QztBQTRFRCxNQUFNLENBQU4sSUFBWSxvQkFLWDtBQUxELFdBQVksb0JBQW9CO0lBQy9CLHFFQUFPLENBQUE7SUFDUCxxRUFBTyxDQUFBO0lBQ1AscUVBQU8sQ0FBQTtJQUNQLG1FQUFNLENBQUE7QUFDUCxDQUFDLEVBTFcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUsvQjtBQWtDRCxNQUFNLENBQU4sSUFBa0Isa0JBR2pCO0FBSEQsV0FBa0Isa0JBQWtCO0lBQ25DLDJEQUFJLENBQUE7SUFDSix1REFBRSxDQUFBO0FBQ0gsQ0FBQyxFQUhpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBR25DO0FBT0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUc7SUFDcEMsY0FBYyxLQUE0QixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLCtCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ25HLGdCQUFnQixDQUFDLFVBQVUsR0FBRyxLQUFLLElBQTJCLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQXlCLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JJLGtCQUFrQixLQUE0QixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLCtCQUF1QixFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUkscUNBQTZCLEVBQUUsUUFBUSxxREFBaUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pNLG9CQUFvQixDQUFDLFVBQVUsR0FBRyxLQUFLLElBQTJCLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQXlCLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxxQ0FBNkIsRUFBRSxRQUFRLHFEQUFpQyxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQ25PLENBQUM7QUFNRixNQUFNLE9BQU8sU0FBVSxTQUFRLEtBQUs7SUFFbkMsWUFBWSxJQUFZLEVBQUUsT0FBZTtRQUN4QyxLQUFLLENBQUMsY0FBYyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUV0QixZQUFvQixFQUFlO1FBQWYsT0FBRSxHQUFGLEVBQUUsQ0FBYTtRQUUzQixTQUFJLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztJQUZJLENBQUM7SUFJeEMsR0FBRyxDQUFDLEdBQU07UUFDVCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVoQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNEIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ListDragOverEffectType;
(function (ListDragOverEffectType) {
    ListDragOverEffectType[ListDragOverEffectType["Copy"] = 0] = "Copy";
    ListDragOverEffectType[ListDragOverEffectType["Move"] = 1] = "Move";
})(ListDragOverEffectType || (ListDragOverEffectType = {}));
export var ListDragOverEffectPosition;
(function (ListDragOverEffectPosition) {
    ListDragOverEffectPosition["Over"] = "drop-target";
    ListDragOverEffectPosition["Before"] = "drop-target-before";
    ListDragOverEffectPosition["After"] = "drop-target-after";
})(ListDragOverEffectPosition || (ListDragOverEffectPosition = {}));
export const ListDragOverReactions = {
    reject() { return { accept: false }; },
    accept() { return { accept: true }; },
};
export class ListError extends Error {
    constructor(user, message) {
        super(`ListError [${user}] ${message}`);
    }
}
export class CachedListVirtualDelegate {
    constructor() {
        this.cache = new WeakMap();
    }
    getHeight(element) {
        return this.cache.get(element) ?? this.estimateHeight(element);
    }
    setDynamicHeight(element, height) {
        if (height > 0) {
            this.cache.set(element, height);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9saXN0L2xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFxRmhHLE1BQU0sQ0FBTixJQUFrQixzQkFHakI7QUFIRCxXQUFrQixzQkFBc0I7SUFDdkMsbUVBQUksQ0FBQTtJQUNKLG1FQUFJLENBQUE7QUFDTCxDQUFDLEVBSGlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFHdkM7QUFFRCxNQUFNLENBQU4sSUFBa0IsMEJBSWpCO0FBSkQsV0FBa0IsMEJBQTBCO0lBQzNDLGtEQUFvQixDQUFBO0lBQ3BCLDJEQUE2QixDQUFBO0lBQzdCLHlEQUEyQixDQUFBO0FBQzVCLENBQUMsRUFKaUIsMEJBQTBCLEtBQTFCLDBCQUEwQixRQUkzQztBQWFELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHO0lBQ3BDLE1BQU0sS0FBNEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0QsTUFBTSxLQUE0QixPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztDQUM1RCxDQUFDO0FBZ0JGLE1BQU0sT0FBTyxTQUFVLFNBQVEsS0FBSztJQUVuQyxZQUFZLElBQVksRUFBRSxPQUFlO1FBQ3hDLEtBQUssQ0FBQyxjQUFjLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBZ0IseUJBQXlCO0lBQS9DO1FBRVMsVUFBSyxHQUFHLElBQUksT0FBTyxFQUFhLENBQUM7SUFjMUMsQ0FBQztJQVpBLFNBQVMsQ0FBQyxPQUFVO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBS0QsZ0JBQWdCLENBQUMsT0FBVSxFQUFFLE1BQWM7UUFDMUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2pDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvbGlzdC9saXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBcUZoRyxNQUFNLENBQU4sSUFBa0Isc0JBR2pCO0FBSEQsV0FBa0Isc0JBQXNCO0lBQ3ZDLG1FQUFJLENBQUE7SUFDSixtRUFBSSxDQUFBO0FBQ0wsQ0FBQyxFQUhpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBR3ZDO0FBRUQsTUFBTSxDQUFOLElBQWtCLDBCQUlqQjtBQUpELFdBQWtCLDBCQUEwQjtJQUMzQyxrREFBb0IsQ0FBQTtJQUNwQiwyREFBNkIsQ0FBQTtJQUM3Qix5REFBMkIsQ0FBQTtBQUM1QixDQUFDLEVBSmlCLDBCQUEwQixLQUExQiwwQkFBMEIsUUFJM0M7QUFhRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRztJQUNwQyxNQUFNLEtBQTRCLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdELE1BQU0sS0FBNEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDNUQsQ0FBQztBQWdCRixNQUFNLE9BQU8sU0FBVSxTQUFRLEtBQUs7SUFFbkMsWUFBWSxJQUFZLEVBQUUsT0FBZTtRQUN4QyxLQUFLLENBQUMsY0FBYyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQWdCLHlCQUF5QjtJQUEvQztRQUVTLFVBQUssR0FBRyxJQUFJLE9BQU8sRUFBYSxDQUFDO0lBYzFDLENBQUM7SUFaQSxTQUFTLENBQUMsT0FBVTtRQUNuQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUtELGdCQUFnQixDQUFDLE9BQVUsRUFBRSxNQUFjO1FBQzFDLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNqQyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=
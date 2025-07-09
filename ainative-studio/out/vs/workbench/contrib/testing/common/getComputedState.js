/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../base/common/iterator.js';
import { makeEmptyCounts, maxPriority, statePriority } from './testingStates.js';
const isDurationAccessor = (accessor) => 'getOwnDuration' in accessor;
/**
 * Gets the computed state for the node.
 * @param force whether to refresh the computed state for this node, even
 * if it was previously set.
 */
const getComputedState = (accessor, node, force = false) => {
    let computed = accessor.getCurrentComputedState(node);
    if (computed === undefined || force) {
        computed = accessor.getOwnState(node) ?? 0 /* TestResultState.Unset */;
        let childrenCount = 0;
        const stateMap = makeEmptyCounts();
        for (const child of accessor.getChildren(node)) {
            const childComputed = getComputedState(accessor, child);
            childrenCount++;
            stateMap[childComputed]++;
            // If all children are skipped, make the current state skipped too if unset (#131537)
            computed = childComputed === 5 /* TestResultState.Skipped */ && computed === 0 /* TestResultState.Unset */
                ? 5 /* TestResultState.Skipped */ : maxPriority(computed, childComputed);
        }
        if (childrenCount > LARGE_NODE_THRESHOLD) {
            largeNodeChildrenStates.set(node, stateMap);
        }
        accessor.setComputedState(node, computed);
    }
    return computed;
};
const getComputedDuration = (accessor, node, force = false) => {
    let computed = accessor.getCurrentComputedDuration(node);
    if (computed === undefined || force) {
        const own = accessor.getOwnDuration(node);
        if (own !== undefined) {
            computed = own;
        }
        else {
            computed = undefined;
            for (const child of accessor.getChildren(node)) {
                const d = getComputedDuration(accessor, child);
                if (d !== undefined) {
                    computed = (computed || 0) + d;
                }
            }
        }
        accessor.setComputedDuration(node, computed);
    }
    return computed;
};
const LARGE_NODE_THRESHOLD = 64;
/**
 * Map of how many nodes have in each state. This is used to optimize state
 * computation in large nodes with children above the `LARGE_NODE_THRESHOLD`.
 */
const largeNodeChildrenStates = new WeakMap();
/**
 * Refreshes the computed state for the node and its parents. Any changes
 * elements cause `addUpdated` to be called.
 */
export const refreshComputedState = (accessor, node, explicitNewComputedState, refreshDuration = true) => {
    const oldState = accessor.getCurrentComputedState(node);
    const oldPriority = statePriority[oldState];
    const newState = explicitNewComputedState ?? getComputedState(accessor, node, true);
    const newPriority = statePriority[newState];
    const toUpdate = new Set();
    if (newPriority !== oldPriority) {
        accessor.setComputedState(node, newState);
        toUpdate.add(node);
        let moveFromState = oldState;
        let moveToState = newState;
        for (const parent of accessor.getParents(node)) {
            const lnm = largeNodeChildrenStates.get(parent);
            if (lnm) {
                lnm[moveFromState]--;
                lnm[moveToState]++;
            }
            const prev = accessor.getCurrentComputedState(parent);
            if (newPriority > oldPriority) {
                // Update all parents to ensure they're at least this priority.
                if (prev !== undefined && statePriority[prev] >= newPriority) {
                    break;
                }
                if (lnm && lnm[moveToState] > 1) {
                    break;
                }
                // moveToState remains the same, the new higher priority node state
                accessor.setComputedState(parent, newState);
                toUpdate.add(parent);
            }
            else /* newProirity < oldPriority */ {
                // Update all parts whose statese might have been based on this one
                if (prev === undefined || statePriority[prev] > oldPriority) {
                    break;
                }
                if (lnm && lnm[moveFromState] > 0) {
                    break;
                }
                moveToState = getComputedState(accessor, parent, true);
                accessor.setComputedState(parent, moveToState);
                toUpdate.add(parent);
            }
            moveFromState = prev;
        }
    }
    if (isDurationAccessor(accessor) && refreshDuration) {
        for (const parent of Iterable.concat(Iterable.single(node), accessor.getParents(node))) {
            const oldDuration = accessor.getCurrentComputedDuration(parent);
            const newDuration = getComputedDuration(accessor, parent, true);
            if (oldDuration === newDuration) {
                break;
            }
            accessor.setComputedDuration(parent, newDuration);
            toUpdate.add(parent);
        }
    }
    return toUpdate;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0Q29tcHV0ZWRTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi9nZXRDb21wdXRlZFN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQW1CakYsTUFBTSxrQkFBa0IsR0FBRyxDQUFJLFFBQW1DLEVBQW9ELEVBQUUsQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLENBQUM7QUFFdEo7Ozs7R0FJRztBQUVILE1BQU0sZ0JBQWdCLEdBQUcsQ0FBbUIsUUFBbUMsRUFBRSxJQUFPLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxFQUFFO0lBQzFHLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RCxJQUFJLFFBQVEsS0FBSyxTQUFTLElBQUksS0FBSyxFQUFFLENBQUM7UUFDckMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGlDQUF5QixDQUFDO1FBRS9ELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQztRQUN0QixNQUFNLFFBQVEsR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUVuQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDeEQsYUFBYSxFQUFFLENBQUM7WUFDaEIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFF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
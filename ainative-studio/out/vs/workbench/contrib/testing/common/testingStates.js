/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mapValues } from '../../../../base/common/objects.js';
/**
 * List of display priorities for different run states. When tests update,
 * the highest-priority state from any of their children will be the state
 * reflected in the parent node.
 */
export const statePriority = {
    [2 /* TestResultState.Running */]: 6,
    [6 /* TestResultState.Errored */]: 5,
    [4 /* TestResultState.Failed */]: 4,
    [1 /* TestResultState.Queued */]: 3,
    [3 /* TestResultState.Passed */]: 2,
    [0 /* TestResultState.Unset */]: 0,
    [5 /* TestResultState.Skipped */]: 1,
};
export const isFailedState = (s) => s === 6 /* TestResultState.Errored */ || s === 4 /* TestResultState.Failed */;
export const isStateWithResult = (s) => s === 6 /* TestResultState.Errored */ || s === 4 /* TestResultState.Failed */ || s === 3 /* TestResultState.Passed */;
export const stateNodes = mapValues(statePriority, (priority, stateStr) => {
    const state = Number(stateStr);
    return { statusNode: true, state, priority };
});
export const cmpPriority = (a, b) => statePriority[b] - statePriority[a];
export const maxPriority = (...states) => {
    switch (states.length) {
        case 0:
            return 0 /* TestResultState.Unset */;
        case 1:
            return states[0];
        case 2:
            return statePriority[states[0]] > statePriority[states[1]] ? states[0] : states[1];
        default: {
            let max = states[0];
            for (let i = 1; i < states.length; i++) {
                if (statePriority[max] < statePriority[states[i]]) {
                    max = states[i];
                }
            }
            return max;
        }
    }
};
export const statesInOrder = Object.keys(statePriority).map(s => Number(s)).sort(cmpPriority);
/**
 * Some states are considered terminal; once these are set for a given test run, they
 * are not reset back to a non-terminal state, or to a terminal state with lower
 * priority.
 */
export const terminalStatePriorities = {
    [3 /* TestResultState.Passed */]: 0,
    [5 /* TestResultState.Skipped */]: 1,
    [4 /* TestResultState.Failed */]: 2,
    [6 /* TestResultState.Errored */]: 3,
};
export const makeEmptyCounts = () => {
    // shh! don't tell anyone this is actually an array!
    return new Uint32Array(statesInOrder.length);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1N0YXRlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0aW5nU3RhdGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUsvRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUF1QztJQUNoRSxpQ0FBeUIsRUFBRSxDQUFDO0lBQzVCLGlDQUF5QixFQUFFLENBQUM7SUFDNUIsZ0NBQXdCLEVBQUUsQ0FBQztJQUMzQixnQ0FBd0IsRUFBRSxDQUFDO0lBQzNCLGdDQUF3QixFQUFFLENBQUM7SUFDM0IsK0JBQXVCLEVBQUUsQ0FBQztJQUMxQixpQ0FBeUIsRUFBRSxDQUFDO0NBQzVCLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDLG9DQUE0QixJQUFJLENBQUMsbUNBQTJCLENBQUM7QUFDbkgsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDLG9DQUE0QixJQUFJLENBQUMsbUNBQTJCLElBQUksQ0FBQyxtQ0FBMkIsQ0FBQztBQUV2SixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQThDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFpQixFQUFFO0lBQ25JLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQW9CLENBQUM7SUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBa0IsRUFBRSxDQUFrQixFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTNHLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsTUFBeUIsRUFBRSxFQUFFO0lBQzNELFFBQVEsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQztZQUNMLHFDQUE2QjtRQUM5QixLQUFLLENBQUM7WUFDTCxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixLQUFLLENBQUM7WUFDTCxPQUFPLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDVCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ25ELEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFakg7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUEwQztJQUM3RSxnQ0FBd0IsRUFBRSxDQUFDO0lBQzNCLGlDQUF5QixFQUFFLENBQUM7SUFDNUIsZ0NBQXdCLEVBQUUsQ0FBQztJQUMzQixpQ0FBeUIsRUFBRSxDQUFDO0NBQzVCLENBQUM7QUFPRixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsR0FBbUIsRUFBRTtJQUNuRCxvREFBb0Q7SUFDcEQsT0FBTyxJQUFJLFdBQVcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUE4QyxDQUFDO0FBQzNGLENBQUMsQ0FBQyJ9
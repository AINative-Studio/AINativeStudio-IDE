/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autorunOpts, observableFromEventOpts } from '../../../base/common/observable.js';
/** Creates an observable update when a configuration key updates. */
export function observableConfigValue(key, defaultValue, configurationService) {
    return observableFromEventOpts({ debugName: () => `Configuration Key "${key}"`, }, (handleChange) => configurationService.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(key)) {
            handleChange(e);
        }
    }), () => configurationService.getValue(key) ?? defaultValue);
}
/** Update the configuration key with a value derived from observables. */
export function bindContextKey(key, service, computeValue) {
    const boundKey = key.bindTo(service);
    return autorunOpts({ debugName: () => `Set Context Key "${key.key}"` }, reader => {
        boundKey.set(computeValue(reader));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1PYnNlcnZhYmxlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vYnNlcnZhYmxlL2NvbW1vbi9wbGF0Zm9ybU9ic2VydmFibGVVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUF3Qix1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSWhILHFFQUFxRTtBQUNyRSxNQUFNLFVBQVUscUJBQXFCLENBQUksR0FBVyxFQUFFLFlBQWUsRUFBRSxvQkFBMkM7SUFDakgsT0FBTyx1QkFBdUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsR0FBRyxHQUFHLEdBQUcsRUFDaEYsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ25FLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDLENBQUMsRUFDRixHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUksR0FBRyxDQUFDLElBQUksWUFBWSxDQUMzRCxDQUFDO0FBQ0gsQ0FBQztBQUVELDBFQUEwRTtBQUMxRSxNQUFNLFVBQVUsY0FBYyxDQUE0QixHQUFxQixFQUFFLE9BQTJCLEVBQUUsWUFBb0M7SUFDakosTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxPQUFPLFdBQVcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7UUFDaEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMifQ==
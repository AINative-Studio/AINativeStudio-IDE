/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ObservableValue } from './base.js';
import { DebugNameData } from './debugName.js';
import { strictEquals } from './commonFacade/deps.js';
import { LazyObservableValue } from './lazyObservableValue.js';
export function observableValueOpts(options, initialValue) {
    if (options.lazy) {
        return new LazyObservableValue(new DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? strictEquals);
    }
    return new ObservableValue(new DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? strictEquals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUF1QixlQUFlLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSxnQkFBZ0IsQ0FBQztBQUMvRCxPQUFPLEVBQW9CLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsT0FHQyxFQUNELFlBQWU7SUFFZixJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsQixPQUFPLElBQUksbUJBQW1CLENBQzdCLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFDOUQsWUFBWSxFQUNaLE9BQU8sQ0FBQyxRQUFRLElBQUksWUFBWSxDQUNoQyxDQUFDO0lBQ0gsQ0FBQztJQUNELE9BQU8sSUFBSSxlQUFlLENBQ3pCLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFDOUQsWUFBWSxFQUNaLE9BQU8sQ0FBQyxRQUFRLElBQUksWUFBWSxDQUNoQyxDQUFDO0FBQ0gsQ0FBQyJ9
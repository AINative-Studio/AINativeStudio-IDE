/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../base/common/lifecycle.js';
import { MainContext } from './extHost.protocol.js';
export class ExtHostLabelService {
    constructor(mainContext) {
        this._handlePool = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadLabelService);
    }
    $registerResourceLabelFormatter(formatter) {
        const handle = this._handlePool++;
        this._proxy.$registerResourceLabelFormatter(handle, formatter);
        return toDisposable(() => {
            this._proxy.$unregisterResourceLabelFormatter(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhYmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TGFiZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQXlELFdBQVcsRUFBZ0IsTUFBTSx1QkFBdUIsQ0FBQztBQUV6SCxNQUFNLE9BQU8sbUJBQW1CO0lBSy9CLFlBQVksV0FBeUI7UUFGN0IsZ0JBQVcsR0FBVyxDQUFDLENBQUM7UUFHL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxTQUFpQztRQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFL0QsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==
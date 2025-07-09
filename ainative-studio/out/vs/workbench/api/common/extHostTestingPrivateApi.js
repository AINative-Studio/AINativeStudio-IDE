/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { InvalidTestItemError } from '../../contrib/testing/common/testItemCollection.js';
const eventPrivateApis = new WeakMap();
export const createPrivateApiFor = (impl, controllerId) => {
    const api = { controllerId };
    eventPrivateApis.set(impl, api);
    return api;
};
/**
 * Gets the private API for a test item implementation. This implementation
 * is a managed object, but we keep a weakmap to avoid exposing any of the
 * internals to extensions.
 */
export const getPrivateApiFor = (impl) => {
    const api = eventPrivateApis.get(impl);
    if (!api) {
        throw new InvalidTestItemError(impl?.id || '<unknown>');
    }
    return api;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlc3RpbmdQcml2YXRlQXBpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXN0aW5nUHJpdmF0ZUFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXdCLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFTaEgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBd0MsQ0FBQztBQUU3RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLElBQXFCLEVBQUUsWUFBb0IsRUFBRSxFQUFFO0lBQ2xGLE1BQU0sR0FBRyxHQUF3QixFQUFFLFlBQVksRUFBRSxDQUFDO0lBQ2xELGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDaEMsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxJQUFxQixFQUFFLEVBQUU7SUFDekQsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE1BQU0sSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLFdBQVcsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUMsQ0FBQyJ9
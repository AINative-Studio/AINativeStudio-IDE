/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertOneOf } from '../../../../../base/common/types.js';
/**
 * Mocks an `TObject` with the provided `overrides`.
 *
 * If you need to mock an `Service`, please use {@link mockService}
 * instead which provides better type safety guarantees for the case.
 *
 * @throws Reading non-overidden property or function
 * 		   on `TObject` throws an error.
 */
export function mockObject(overrides) {
    // ensure that the overrides object cannot be modified afterward
    overrides = Object.freeze(overrides);
    const keys = Object.keys(overrides);
    const service = new Proxy({}, {
        get: (_target, key) => {
            // sanity check for the provided `key`
            assertOneOf(key, keys, `The '${key}' is not mocked.`);
            return overrides[key];
        },
    });
    // note! it's ok to `as TObject` here, because of
    // 		 the runtime checks in the `Proxy` getter
    return service;
}
/**
 * Mocks provided service with the provided `overrides`.
 * Same as more generic {@link mockObject} utility, but with
 * the service constraint on the `TService` type.
 *
 * @throws Reading non-overidden property or function
 * 		   on `TService` throws an error.
 */
export function mockService(overrides) {
    return mockObject(overrides);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL3Rlc3QvY29tbW9uL3V0aWxzL21vY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxFOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FDekIsU0FBMkI7SUFFM0IsZ0VBQWdFO0lBQ2hFLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRXJDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFpQyxDQUFDO0lBQ3BFLE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxDQUN4QixFQUFFLEVBQ0Y7UUFDQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBNkIsRUFBRSxFQUFFO1lBQy9DLHNDQUFzQztZQUN0QyxXQUFXLENBQ1YsR0FBRyxFQUNILElBQUksRUFDSixRQUFRLEdBQUcsa0JBQWtCLENBQzdCLENBQUM7WUFFRixPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixDQUFDO0tBQ0QsQ0FBQyxDQUFDO0lBRUosaURBQWlEO0lBQ2pELDhDQUE4QztJQUM5QyxPQUFPLE9BQXdDLENBQUM7QUFDakQsQ0FBQztBQVNEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUMxQixTQUE0QjtJQUU1QixPQUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM5QixDQUFDIn0=
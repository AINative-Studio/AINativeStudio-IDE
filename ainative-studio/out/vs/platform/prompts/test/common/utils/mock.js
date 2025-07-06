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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvbXB0cy90ZXN0L2NvbW1vbi91dGlscy9tb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVsRTs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQ3pCLFNBQTJCO0lBRTNCLGdFQUFnRTtJQUNoRSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVyQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBaUMsQ0FBQztJQUNwRSxNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssQ0FDeEIsRUFBRSxFQUNGO1FBQ0MsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQTZCLEVBQUUsRUFBRTtZQUMvQyxzQ0FBc0M7WUFDdEMsV0FBVyxDQUNWLEdBQUcsRUFDSCxJQUFJLEVBQ0osUUFBUSxHQUFHLGtCQUFrQixDQUM3QixDQUFDO1lBRUYsT0FBTyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQztLQUNELENBQUMsQ0FBQztJQUVKLGlEQUFpRDtJQUNqRCw4Q0FBOEM7SUFDOUMsT0FBTyxPQUF3QyxDQUFDO0FBQ2pELENBQUM7QUFTRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsU0FBNEI7SUFFNUIsT0FBTyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDOUIsQ0FBQyJ9
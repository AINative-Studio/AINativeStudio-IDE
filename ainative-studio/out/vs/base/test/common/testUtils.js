/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { randomInt } from '../../common/numbers.js';
export function flakySuite(title, fn) {
    return suite(title, function () {
        // Flaky suites need retries and timeout to complete
        // e.g. because they access browser features which can
        // be unreliable depending on the environment.
        this.retries(3);
        this.timeout(1000 * 20);
        // Invoke suite ensuring that `this` is
        // properly wired in.
        fn.call(this);
    });
}
/**
 * Helper function that allows to await for a specified amount of time.
 * @param ms The amount of time to wait in milliseconds.
 */
export const wait = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
/**
 * Helper function that allows to await for a random amount of time.
 * @param maxMs The `maximum` amount of time to wait, in milliseconds.
 * @param minMs [`optional`] The `minimum` amount of time to wait, in milliseconds.
 */
export const waitRandom = (maxMs, minMs = 0) => {
    return wait(randomInt(maxMs, minMs));
};
/**
 * (pseudo)Random boolean generator.
 *
 * ## Examples
 *
 * ```typsecript
 * randomBoolean(); // generates either `true` or `false`
 * ```
 *
 */
export const randomBoolean = () => {
    return Math.random() > 0.5;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVwRCxNQUFNLFVBQVUsVUFBVSxDQUFDLEtBQWEsRUFBRSxFQUFjO0lBQ3ZELE9BQU8sS0FBSyxDQUFDLEtBQUssRUFBRTtRQUVuQixvREFBb0Q7UUFDcEQsc0RBQXNEO1FBQ3RELDhDQUE4QztRQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRXhCLHVDQUF1QztRQUN2QyxxQkFBcUI7UUFDckIsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLEVBQVUsRUFBaUIsRUFBRTtJQUNqRCxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3hELENBQUMsQ0FBQztBQUVGOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEVBQUUsUUFBZ0IsQ0FBQyxFQUFpQixFQUFFO0lBQzdFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUM7QUFFRjs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsR0FBWSxFQUFFO0lBQzFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQztBQUM1QixDQUFDLENBQUMifQ==
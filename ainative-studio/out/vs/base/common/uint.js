/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var Constants;
(function (Constants) {
    /**
     * MAX SMI (SMall Integer) as defined in v8.
     * one bit is lost for boxing/unboxing flag.
     * one bit is lost for sign flag.
     * See https://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/#tagged-values
     */
    Constants[Constants["MAX_SAFE_SMALL_INTEGER"] = 1073741824] = "MAX_SAFE_SMALL_INTEGER";
    /**
     * MIN SMI (SMall Integer) as defined in v8.
     * one bit is lost for boxing/unboxing flag.
     * one bit is lost for sign flag.
     * See https://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/#tagged-values
     */
    Constants[Constants["MIN_SAFE_SMALL_INTEGER"] = -1073741824] = "MIN_SAFE_SMALL_INTEGER";
    /**
     * Max unsigned integer that fits on 8 bits.
     */
    Constants[Constants["MAX_UINT_8"] = 255] = "MAX_UINT_8";
    /**
     * Max unsigned integer that fits on 16 bits.
     */
    Constants[Constants["MAX_UINT_16"] = 65535] = "MAX_UINT_16";
    /**
     * Max unsigned integer that fits on 32 bits.
     */
    Constants[Constants["MAX_UINT_32"] = 4294967295] = "MAX_UINT_32";
    Constants[Constants["UNICODE_SUPPLEMENTARY_PLANE_BEGIN"] = 65536] = "UNICODE_SUPPLEMENTARY_PLANE_BEGIN";
})(Constants || (Constants = {}));
export function toUint8(v) {
    if (v < 0) {
        return 0;
    }
    if (v > 255 /* Constants.MAX_UINT_8 */) {
        return 255 /* Constants.MAX_UINT_8 */;
    }
    return v | 0;
}
export function toUint32(v) {
    if (v < 0) {
        return 0;
    }
    if (v > 4294967295 /* Constants.MAX_UINT_32 */) {
        return 4294967295 /* Constants.MAX_UINT_32 */;
    }
    return v | 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi91aW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFrQixTQWlDakI7QUFqQ0QsV0FBa0IsU0FBUztJQUMxQjs7Ozs7T0FLRztJQUNILHNGQUFnQyxDQUFBO0lBRWhDOzs7OztPQUtHO0lBQ0gsdUZBQW1DLENBQUE7SUFFbkM7O09BRUc7SUFDSCx1REFBZ0IsQ0FBQTtJQUVoQjs7T0FFRztJQUNILDJEQUFtQixDQUFBO0lBRW5COztPQUVHO0lBQ0gsZ0VBQXdCLENBQUE7SUFFeEIsdUdBQTRDLENBQUE7QUFDN0MsQ0FBQyxFQWpDaUIsU0FBUyxLQUFULFNBQVMsUUFpQzFCO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxDQUFTO0lBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ1gsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBQ0QsSUFBSSxDQUFDLGlDQUF1QixFQUFFLENBQUM7UUFDOUIsc0NBQTRCO0lBQzdCLENBQUM7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLFFBQVEsQ0FBQyxDQUFTO0lBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ1gsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBQ0QsSUFBSSxDQUFDLHlDQUF3QixFQUFFLENBQUM7UUFDL0IsOENBQTZCO0lBQzlCLENBQUM7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZCxDQUFDIn0=
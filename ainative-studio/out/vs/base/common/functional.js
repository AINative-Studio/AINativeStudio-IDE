/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Given a function, returns a function that is only calling that function once.
 */
export function createSingleCallFunction(fn, fnDidRunCallback) {
    const _this = this;
    let didCall = false;
    let result;
    return function () {
        if (didCall) {
            return result;
        }
        didCall = true;
        if (fnDidRunCallback) {
            try {
                result = fn.apply(_this, arguments);
            }
            finally {
                fnDidRunCallback();
            }
        }
        else {
            result = fn.apply(_this, arguments);
        }
        return result;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9mdW5jdGlvbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHdCQUF3QixDQUFvQyxFQUFLLEVBQUUsZ0JBQTZCO0lBQy9HLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQztJQUNuQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7SUFDcEIsSUFBSSxNQUFlLENBQUM7SUFFcEIsT0FBTztRQUNOLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ2YsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQztnQkFDSixNQUFNLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDckMsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLGdCQUFnQixFQUFFLENBQUM7WUFDcEIsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQWlCLENBQUM7QUFDbkIsQ0FBQyJ9
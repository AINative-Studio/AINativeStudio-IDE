/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function checkModeOption(mode, option) {
    if (option === undefined) {
        return undefined;
    }
    if (typeof option === 'function') {
        return option(mode);
    }
    return option;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sVUFBVSxlQUFlLENBQUMsSUFBYyxFQUFFLE1BQTJEO0lBQzFHLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzFCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==
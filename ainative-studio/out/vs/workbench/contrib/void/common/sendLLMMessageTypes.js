/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
export const errorDetails = (fullError) => {
    if (fullError === null) {
        return null;
    }
    else if (typeof fullError === 'object') {
        if (Object.keys(fullError).length === 0)
            return null;
        return JSON.stringify(fullError, null, 2);
    }
    else if (typeof fullError === 'string') {
        return null;
    }
    return null;
};
export const getErrorMessage = (error) => {
    if (error instanceof Error)
        return `${error.name}: ${error.message}`;
    return error + '';
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9zZW5kTExNTWVzc2FnZVR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBTzFGLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxDQUFDLFNBQXVCLEVBQWlCLEVBQUU7SUFDdEUsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDeEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO1NBQ0ksSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQTtRQUNwRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO1NBQ0ksSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN4QyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBK0IsQ0FBQyxLQUFLLEVBQUUsRUFBRTtJQUNwRSxJQUFJLEtBQUssWUFBWSxLQUFLO1FBQUUsT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3BFLE9BQU8sS0FBSyxHQUFHLEVBQUUsQ0FBQTtBQUNsQixDQUFDLENBQUEifQ==
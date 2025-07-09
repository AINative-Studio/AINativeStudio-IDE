/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export const ScreenshotVariableId = 'screenshot-focused-window';
export function convertBufferToScreenshotVariable(buffer) {
    return {
        id: ScreenshotVariableId,
        name: localize('screenshot', 'Screenshot'),
        value: new Uint8Array(buffer),
        isImage: true,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9zY3JlZW5zaG90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUdqRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRywyQkFBMkIsQ0FBQztBQUVoRSxNQUFNLFVBQVUsaUNBQWlDLENBQUMsTUFBdUI7SUFDeEUsT0FBTztRQUNOLEVBQUUsRUFBRSxvQkFBb0I7UUFDeEIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDO1FBQzFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDN0IsT0FBTyxFQUFFLElBQUk7S0FDYixDQUFDO0FBQ0gsQ0FBQyJ9
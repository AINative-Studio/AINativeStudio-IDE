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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL3NjcmVlbnNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2pELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLDJCQUEyQixDQUFDO0FBRWhFLE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxNQUF1QjtJQUN4RSxPQUFPO1FBQ04sRUFBRSxFQUFFLG9CQUFvQjtRQUN4QixJQUFJLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUM7UUFDMUMsS0FBSyxFQUFFLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUM3QixPQUFPLEVBQUUsSUFBSTtLQUNiLENBQUM7QUFDSCxDQUFDIn0=
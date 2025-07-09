/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IJSONEditingService = createDecorator('jsonEditingService');
export var JSONEditingErrorCode;
(function (JSONEditingErrorCode) {
    /**
     * Error when trying to write to a file that contains JSON errors.
     */
    JSONEditingErrorCode[JSONEditingErrorCode["ERROR_INVALID_FILE"] = 0] = "ERROR_INVALID_FILE";
})(JSONEditingErrorCode || (JSONEditingErrorCode = {}));
export class JSONEditingError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vY29tbW9uL2pzb25FZGl0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUc3RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUFFOUYsTUFBTSxDQUFOLElBQWtCLG9CQU1qQjtBQU5ELFdBQWtCLG9CQUFvQjtJQUVyQzs7T0FFRztJQUNILDJGQUFrQixDQUFBO0FBQ25CLENBQUMsRUFOaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQU1yQztBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxLQUFLO0lBQzFDLFlBQVksT0FBZSxFQUFTLElBQTBCO1FBQzdELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQURvQixTQUFJLEdBQUosSUFBSSxDQUFzQjtJQUU5RCxDQUFDO0NBQ0QifQ==
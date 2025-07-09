/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Extracted from json.ts to keep json nls free.
 */
import { localize } from '../../nls.js';
export function getParseErrorMessage(errorCode) {
    switch (errorCode) {
        case 1 /* ParseErrorCode.InvalidSymbol */: return localize('error.invalidSymbol', 'Invalid symbol');
        case 2 /* ParseErrorCode.InvalidNumberFormat */: return localize('error.invalidNumberFormat', 'Invalid number format');
        case 3 /* ParseErrorCode.PropertyNameExpected */: return localize('error.propertyNameExpected', 'Property name expected');
        case 4 /* ParseErrorCode.ValueExpected */: return localize('error.valueExpected', 'Value expected');
        case 5 /* ParseErrorCode.ColonExpected */: return localize('error.colonExpected', 'Colon expected');
        case 6 /* ParseErrorCode.CommaExpected */: return localize('error.commaExpected', 'Comma expected');
        case 7 /* ParseErrorCode.CloseBraceExpected */: return localize('error.closeBraceExpected', 'Closing brace expected');
        case 8 /* ParseErrorCode.CloseBracketExpected */: return localize('error.closeBracketExpected', 'Closing bracket expected');
        case 9 /* ParseErrorCode.EndOfFileExpected */: return localize('error.endOfFileExpected', 'End of file expected');
        default:
            return '';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVycm9yTWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vanNvbkVycm9yTWVzc2FnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBR3hDLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxTQUF5QjtJQUM3RCxRQUFRLFNBQVMsRUFBRSxDQUFDO1FBQ25CLHlDQUFpQyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM1RiwrQ0FBdUMsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDL0csZ0RBQXdDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2xILHlDQUFpQyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM1Rix5Q0FBaUMsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDNUYseUNBQWlDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzVGLDhDQUFzQyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUM5RyxnREFBd0MsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLDRCQUE0QixFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDcEgsNkNBQXFDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQzFHO1lBQ0MsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0FBQ0YsQ0FBQyJ9
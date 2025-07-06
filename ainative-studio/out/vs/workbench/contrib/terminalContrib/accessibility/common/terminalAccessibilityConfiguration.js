/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalAccessibilitySettingId;
(function (TerminalAccessibilitySettingId) {
    TerminalAccessibilitySettingId["AccessibleViewPreserveCursorPosition"] = "terminal.integrated.accessibleViewPreserveCursorPosition";
    TerminalAccessibilitySettingId["AccessibleViewFocusOnCommandExecution"] = "terminal.integrated.accessibleViewFocusOnCommandExecution";
})(TerminalAccessibilitySettingId || (TerminalAccessibilitySettingId = {}));
export const terminalAccessibilityConfiguration = {
    ["terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */]: {
        markdownDescription: localize('terminal.integrated.accessibleViewPreserveCursorPosition', "Preserve the cursor position on reopen of the terminal's accessible view rather than setting it to the bottom of the buffer."),
        type: 'boolean',
        default: false
    },
    ["terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */]: {
        markdownDescription: localize('terminal.integrated.accessibleViewFocusOnCommandExecution', "Focus the terminal accessible view when a command is executed."),
        type: 'boolean',
        default: false
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmlsaXR5Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2FjY2Vzc2liaWxpdHkvY29tbW9uL3Rlcm1pbmFsQWNjZXNzaWJpbGl0eUNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2pELE1BQU0sQ0FBTixJQUFrQiw4QkFHakI7QUFIRCxXQUFrQiw4QkFBOEI7SUFDL0MsbUlBQWlHLENBQUE7SUFDakcscUlBQW1HLENBQUE7QUFDcEcsQ0FBQyxFQUhpQiw4QkFBOEIsS0FBOUIsOEJBQThCLFFBRy9DO0FBT0QsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQW9EO0lBQ2xHLHNJQUFxRSxFQUFFO1FBQ3RFLG1CQUFtQixFQUFFLFFBQVEsQ0FBQywwREFBMEQsRUFBRSw4SEFBOEgsQ0FBQztRQUN6TixJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxLQUFLO0tBQ2Q7SUFDRCx3SUFBc0UsRUFBRTtRQUN2RSxtQkFBbUIsRUFBRSxRQUFRLENBQUMsMkRBQTJELEVBQUUsZ0VBQWdFLENBQUM7UUFDNUosSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsS0FBSztLQUNkO0NBQ0QsQ0FBQyJ9
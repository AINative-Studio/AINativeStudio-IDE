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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmlsaXR5Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS9jb21tb24vdGVybWluYWxBY2Nlc3NpYmlsaXR5Q29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakQsTUFBTSxDQUFOLElBQWtCLDhCQUdqQjtBQUhELFdBQWtCLDhCQUE4QjtJQUMvQyxtSUFBaUcsQ0FBQTtJQUNqRyxxSUFBbUcsQ0FBQTtBQUNwRyxDQUFDLEVBSGlCLDhCQUE4QixLQUE5Qiw4QkFBOEIsUUFHL0M7QUFPRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBb0Q7SUFDbEcsc0lBQXFFLEVBQUU7UUFDdEUsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLDBEQUEwRCxFQUFFLDhIQUE4SCxDQUFDO1FBQ3pOLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLEtBQUs7S0FDZDtJQUNELHdJQUFzRSxFQUFFO1FBQ3ZFLG1CQUFtQixFQUFFLFFBQVEsQ0FBQywyREFBMkQsRUFBRSxnRUFBZ0UsQ0FBQztRQUM1SixJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxLQUFLO0tBQ2Q7Q0FDRCxDQUFDIn0=
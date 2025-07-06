/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalAutoRepliesSettingId;
(function (TerminalAutoRepliesSettingId) {
    TerminalAutoRepliesSettingId["AutoReplies"] = "terminal.integrated.autoReplies";
})(TerminalAutoRepliesSettingId || (TerminalAutoRepliesSettingId = {}));
export const terminalAutoRepliesConfiguration = {
    ["terminal.integrated.autoReplies" /* TerminalAutoRepliesSettingId.AutoReplies */]: {
        markdownDescription: localize('terminal.integrated.autoReplies', "A set of messages that, when encountered in the terminal, will be automatically responded to. Provided the message is specific enough, this can help automate away common responses.\n\nRemarks:\n\n- Use {0} to automatically respond to the terminate batch job prompt on Windows.\n- The message includes escape sequences so the reply might not happen with styled text.\n- Each reply can only happen once every second.\n- Use {1} in the reply to mean the enter key.\n- To unset a default key, set the value to null.\n- Restart VS Code if new don't apply.", '`"Terminate batch job (Y/N)": "Y\\r"`', '`"\\r"`'),
        type: 'object',
        additionalProperties: {
            oneOf: [{
                    type: 'string',
                    description: localize('terminal.integrated.autoReplies.reply', "The reply to send to the process.")
                },
                { type: 'null' }]
        },
        default: {}
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBdXRvUmVwbGllc0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9hdXRvUmVwbGllcy9jb21tb24vdGVybWluYWxBdXRvUmVwbGllc0NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2pELE1BQU0sQ0FBTixJQUFrQiw0QkFFakI7QUFGRCxXQUFrQiw0QkFBNEI7SUFDN0MsK0VBQStDLENBQUE7QUFDaEQsQ0FBQyxFQUZpQiw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBRTdDO0FBTUQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQW9EO0lBQ2hHLGtGQUEwQyxFQUFFO1FBQzNDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSx3aUJBQXdpQixFQUFFLHVDQUF1QyxFQUFFLFNBQVMsQ0FBQztRQUM5cEIsSUFBSSxFQUFFLFFBQVE7UUFDZCxvQkFBb0IsRUFBRTtZQUNyQixLQUFLLEVBQUUsQ0FBQztvQkFDUCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLG1DQUFtQyxDQUFDO2lCQUNuRztnQkFDRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztTQUNqQjtRQUNELE9BQU8sRUFBRSxFQUFFO0tBQ1g7Q0FDRCxDQUFDIn0=
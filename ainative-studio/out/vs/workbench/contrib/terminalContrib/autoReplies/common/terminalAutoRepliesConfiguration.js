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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBdXRvUmVwbGllc0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2F1dG9SZXBsaWVzL2NvbW1vbi90ZXJtaW5hbEF1dG9SZXBsaWVzQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakQsTUFBTSxDQUFOLElBQWtCLDRCQUVqQjtBQUZELFdBQWtCLDRCQUE0QjtJQUM3QywrRUFBK0MsQ0FBQTtBQUNoRCxDQUFDLEVBRmlCLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFFN0M7QUFNRCxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBb0Q7SUFDaEcsa0ZBQTBDLEVBQUU7UUFDM0MsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLHdpQkFBd2lCLEVBQUUsdUNBQXVDLEVBQUUsU0FBUyxDQUFDO1FBQzlwQixJQUFJLEVBQUUsUUFBUTtRQUNkLG9CQUFvQixFQUFFO1lBQ3JCLEtBQUssRUFBRSxDQUFDO29CQUNQLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsbUNBQW1DLENBQUM7aUJBQ25HO2dCQUNELEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO1NBQ2pCO1FBQ0QsT0FBTyxFQUFFLEVBQUU7S0FDWDtDQUNELENBQUMifQ==
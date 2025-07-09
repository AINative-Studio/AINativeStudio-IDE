/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export const DEFAULT_LOCAL_ECHO_EXCLUDE = ['vim', 'vi', 'nano', 'tmux'];
export var TerminalTypeAheadSettingId;
(function (TerminalTypeAheadSettingId) {
    TerminalTypeAheadSettingId["LocalEchoLatencyThreshold"] = "terminal.integrated.localEchoLatencyThreshold";
    TerminalTypeAheadSettingId["LocalEchoEnabled"] = "terminal.integrated.localEchoEnabled";
    TerminalTypeAheadSettingId["LocalEchoExcludePrograms"] = "terminal.integrated.localEchoExcludePrograms";
    TerminalTypeAheadSettingId["LocalEchoStyle"] = "terminal.integrated.localEchoStyle";
})(TerminalTypeAheadSettingId || (TerminalTypeAheadSettingId = {}));
export const terminalTypeAheadConfiguration = {
    ["terminal.integrated.localEchoLatencyThreshold" /* TerminalTypeAheadSettingId.LocalEchoLatencyThreshold */]: {
        description: localize('terminal.integrated.localEchoLatencyThreshold', "Length of network delay, in milliseconds, where local edits will be echoed on the terminal without waiting for server acknowledgement. If '0', local echo will always be on, and if '-1' it will be disabled."),
        type: 'integer',
        minimum: -1,
        default: 30,
        tags: ['preview'],
    },
    ["terminal.integrated.localEchoEnabled" /* TerminalTypeAheadSettingId.LocalEchoEnabled */]: {
        markdownDescription: localize('terminal.integrated.localEchoEnabled', "When local echo should be enabled. This will override {0}", '`#terminal.integrated.localEchoLatencyThreshold#`'),
        type: 'string',
        enum: ['on', 'off', 'auto'],
        enumDescriptions: [
            localize('terminal.integrated.localEchoEnabled.on', "Always enabled"),
            localize('terminal.integrated.localEchoEnabled.off', "Always disabled"),
            localize('terminal.integrated.localEchoEnabled.auto', "Enabled only for remote workspaces")
        ],
        default: 'off',
        tags: ['preview'],
    },
    ["terminal.integrated.localEchoExcludePrograms" /* TerminalTypeAheadSettingId.LocalEchoExcludePrograms */]: {
        description: localize('terminal.integrated.localEchoExcludePrograms', "Local echo will be disabled when any of these program names are found in the terminal title."),
        type: 'array',
        items: {
            type: 'string',
            uniqueItems: true
        },
        default: DEFAULT_LOCAL_ECHO_EXCLUDE,
        tags: ['preview'],
    },
    ["terminal.integrated.localEchoStyle" /* TerminalTypeAheadSettingId.LocalEchoStyle */]: {
        description: localize('terminal.integrated.localEchoStyle', "Terminal style of locally echoed text; either a font style or an RGB color."),
        default: 'dim',
        anyOf: [
            {
                enum: ['bold', 'dim', 'italic', 'underlined', 'inverted', '#ff0000'],
            },
            {
                type: 'string',
                format: 'color-hex',
            }
        ],
        tags: ['preview'],
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWRDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi90eXBlQWhlYWQvY29tbW9uL3Rlcm1pbmFsVHlwZUFoZWFkQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQTBCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFFL0YsTUFBTSxDQUFOLElBQWtCLDBCQUtqQjtBQUxELFdBQWtCLDBCQUEwQjtJQUMzQyx5R0FBMkUsQ0FBQTtJQUMzRSx1RkFBeUQsQ0FBQTtJQUN6RCx1R0FBeUUsQ0FBQTtJQUN6RSxtRkFBcUQsQ0FBQTtBQUN0RCxDQUFDLEVBTGlCLDBCQUEwQixLQUExQiwwQkFBMEIsUUFLM0M7QUFTRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBb0Q7SUFDOUYsNEdBQXNELEVBQUU7UUFDdkQsV0FBVyxFQUFFLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRSwrTUFBK00sQ0FBQztRQUN2UixJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDWCxPQUFPLEVBQUUsRUFBRTtRQUNYLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUNqQjtJQUNELDBGQUE2QyxFQUFFO1FBQzlDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSwyREFBMkQsRUFBRSxtREFBbUQsQ0FBQztRQUN2TCxJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDO1FBQzNCLGdCQUFnQixFQUFFO1lBQ2pCLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxnQkFBZ0IsQ0FBQztZQUNyRSxRQUFRLENBQUMsMENBQTBDLEVBQUUsaUJBQWlCLENBQUM7WUFDdkUsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLG9DQUFvQyxDQUFDO1NBQzNGO1FBQ0QsT0FBTyxFQUFFLEtBQUs7UUFDZCxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7SUFDRCwwR0FBcUQsRUFBRTtRQUN0RCxXQUFXLEVBQUUsUUFBUSxDQUFDLDhDQUE4QyxFQUFFLDhGQUE4RixDQUFDO1FBQ3JLLElBQUksRUFBRSxPQUFPO1FBQ2IsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsSUFBSTtTQUNqQjtRQUNELE9BQU8sRUFBRSwwQkFBMEI7UUFDbkMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDO0tBQ2pCO0lBQ0Qsc0ZBQTJDLEVBQUU7UUFDNUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSw2RUFBNkUsQ0FBQztRQUMxSSxPQUFPLEVBQUUsS0FBSztRQUNkLEtBQUssRUFBRTtZQUNOO2dCQUNDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDO2FBQ3BFO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsTUFBTSxFQUFFLFdBQVc7YUFDbkI7U0FDRDtRQUNELElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUNqQjtDQUNELENBQUMifQ==
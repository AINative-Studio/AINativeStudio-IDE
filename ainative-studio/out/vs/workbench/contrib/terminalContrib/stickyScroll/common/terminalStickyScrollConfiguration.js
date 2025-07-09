/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import product from '../../../../../platform/product/common/product.js';
export var TerminalStickyScrollSettingId;
(function (TerminalStickyScrollSettingId) {
    TerminalStickyScrollSettingId["Enabled"] = "terminal.integrated.stickyScroll.enabled";
    TerminalStickyScrollSettingId["MaxLineCount"] = "terminal.integrated.stickyScroll.maxLineCount";
})(TerminalStickyScrollSettingId || (TerminalStickyScrollSettingId = {}));
export const terminalStickyScrollConfiguration = {
    ["terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */]: {
        markdownDescription: localize('stickyScroll.enabled', "Shows the current command at the top of the terminal. This feature requires [shell integration]({0}) to be activated. See {1}.", 'https://code.visualstudio.com/docs/terminal/shell-integration', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'boolean',
        default: product.quality !== 'stable'
    },
    ["terminal.integrated.stickyScroll.maxLineCount" /* TerminalStickyScrollSettingId.MaxLineCount */]: {
        markdownDescription: localize('stickyScroll.maxLineCount', "Defines the maximum number of sticky lines to show. Sticky scroll lines will never exceed 40% of the viewport regardless of this setting."),
        type: 'number',
        default: 5,
        minimum: 1,
        maximum: 10
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGlja3lTY3JvbGxDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdGlja3lTY3JvbGwvY29tbW9uL3Rlcm1pbmFsU3RpY2t5U2Nyb2xsQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxPQUFPLE1BQU0sbURBQW1ELENBQUM7QUFHeEUsTUFBTSxDQUFOLElBQWtCLDZCQUdqQjtBQUhELFdBQWtCLDZCQUE2QjtJQUM5QyxxRkFBb0QsQ0FBQTtJQUNwRCwrRkFBOEQsQ0FBQTtBQUMvRCxDQUFDLEVBSGlCLDZCQUE2QixLQUE3Qiw2QkFBNkIsUUFHOUM7QUFPRCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBb0Q7SUFDakcsd0ZBQXVDLEVBQUU7UUFDeEMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGdJQUFnSSxFQUFFLCtEQUErRCxFQUFFLE1BQU0sOEZBQXlDLEtBQUssQ0FBQztRQUM5UyxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVE7S0FDckM7SUFDRCxrR0FBNEMsRUFBRTtRQUM3QyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsMklBQTJJLENBQUM7UUFDdk0sSUFBSSxFQUFFLFFBQVE7UUFDZCxPQUFPLEVBQUUsQ0FBQztRQUNWLE9BQU8sRUFBRSxDQUFDO1FBQ1YsT0FBTyxFQUFFLEVBQUU7S0FDWDtDQUNELENBQUMifQ==
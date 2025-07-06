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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGlja3lTY3JvbGxDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N0aWNreVNjcm9sbC9jb21tb24vdGVybWluYWxTdGlja3lTY3JvbGxDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVqRCxPQUFPLE9BQU8sTUFBTSxtREFBbUQsQ0FBQztBQUd4RSxNQUFNLENBQU4sSUFBa0IsNkJBR2pCO0FBSEQsV0FBa0IsNkJBQTZCO0lBQzlDLHFGQUFvRCxDQUFBO0lBQ3BELCtGQUE4RCxDQUFBO0FBQy9ELENBQUMsRUFIaUIsNkJBQTZCLEtBQTdCLDZCQUE2QixRQUc5QztBQU9ELE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFvRDtJQUNqRyx3RkFBdUMsRUFBRTtRQUN4QyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsZ0lBQWdJLEVBQUUsK0RBQStELEVBQUUsTUFBTSw4RkFBeUMsS0FBSyxDQUFDO1FBQzlTLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUTtLQUNyQztJQUNELGtHQUE0QyxFQUFFO1FBQzdDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSwySUFBMkksQ0FBQztRQUN2TSxJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxDQUFDO1FBQ1YsT0FBTyxFQUFFLENBQUM7UUFDVixPQUFPLEVBQUUsRUFBRTtLQUNYO0NBQ0QsQ0FBQyJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/stickyScroll.css';
import { localize, localize2 } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalStickyScrollContribution } from './terminalStickyScrollContribution.js';
// #region Terminal Contributions
registerTerminalContribution(TerminalStickyScrollContribution.ID, TerminalStickyScrollContribution);
// #endregion
// #region Actions
var TerminalStickyScrollCommandId;
(function (TerminalStickyScrollCommandId) {
    TerminalStickyScrollCommandId["ToggleStickyScroll"] = "workbench.action.terminal.toggleStickyScroll";
})(TerminalStickyScrollCommandId || (TerminalStickyScrollCommandId = {}));
registerTerminalAction({
    id: "workbench.action.terminal.toggleStickyScroll" /* TerminalStickyScrollCommandId.ToggleStickyScroll */,
    title: localize2('workbench.action.terminal.toggleStickyScroll', 'Toggle Sticky Scroll'),
    toggled: {
        condition: ContextKeyExpr.equals(`config.${"terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */}`, true),
        title: localize('stickyScroll', "Sticky Scroll"),
        mnemonicTitle: localize({ key: 'miStickyScroll', comment: ['&& denotes a mnemonic'] }, "&&Sticky Scroll"),
    },
    run: (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue("terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */);
        return configurationService.updateValue("terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */, newValue);
    },
    menu: [
        { id: MenuId.TerminalStickyScrollContext }
    ]
});
// #endregion
// #region Colors
import './terminalStickyScrollColorRegistry.js';
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc3RpY2t5U2Nyb2xsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3RpY2t5U2Nyb2xsL2Jyb3dzZXIvdGVybWluYWwuc3RpY2t5U2Nyb2xsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUd6RixpQ0FBaUM7QUFFakMsNEJBQTRCLENBQUMsZ0NBQWdDLENBQUMsRUFBRSxFQUFFLGdDQUFnQyxDQUFDLENBQUM7QUFFcEcsYUFBYTtBQUViLGtCQUFrQjtBQUVsQixJQUFXLDZCQUVWO0FBRkQsV0FBVyw2QkFBNkI7SUFDdkMsb0dBQW1FLENBQUE7QUFDcEUsQ0FBQyxFQUZVLDZCQUE2QixLQUE3Qiw2QkFBNkIsUUFFdkM7QUFFRCxzQkFBc0IsQ0FBQztJQUN0QixFQUFFLHVHQUFrRDtJQUNwRCxLQUFLLEVBQUUsU0FBUyxDQUFDLDhDQUE4QyxFQUFFLHNCQUFzQixDQUFDO0lBQ3hGLE9BQU8sRUFBRTtRQUNSLFNBQVMsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsc0ZBQXFDLEVBQUUsRUFBRSxJQUFJLENBQUM7UUFDekYsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO1FBQ2hELGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDO0tBQ3pHO0lBQ0QsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sUUFBUSxHQUFHLENBQUMsb0JBQW9CLENBQUMsUUFBUSx3RkFBdUMsQ0FBQztRQUN2RixPQUFPLG9CQUFvQixDQUFDLFdBQVcseUZBQXdDLFFBQVEsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFDRCxJQUFJLEVBQUU7UUFDTCxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsMkJBQTJCLEVBQUU7S0FDMUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxhQUFhO0FBRWIsaUJBQWlCO0FBRWpCLE9BQU8sd0NBQXdDLENBQUM7QUFFaEQsYUFBYSJ9
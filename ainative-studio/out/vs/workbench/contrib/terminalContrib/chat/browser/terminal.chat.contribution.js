/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalInlineChatAccessibleView } from './terminalChatAccessibleView.js';
import { TerminalChatController } from './terminalChatController.js';
// #region Terminal Contributions
registerTerminalContribution(TerminalChatController.ID, TerminalChatController, false);
// #endregion
// #region Contributions
AccessibleViewRegistry.register(new TerminalInlineChatAccessibleView());
AccessibleViewRegistry.register(new TerminalChatAccessibilityHelp());
registerWorkbenchContribution2(TerminalChatEnabler.Id, TerminalChatEnabler, 3 /* WorkbenchPhase.AfterRestored */);
// #endregion
// #region Actions
import './terminalChatActions.js';
import { AccessibleViewRegistry } from '../../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { TerminalChatAccessibilityHelp } from './terminalChatAccessibilityHelp.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { TerminalChatEnabler } from './terminalChatEnabler.js';
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbC5jaGF0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVyRSxpQ0FBaUM7QUFFakMsNEJBQTRCLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRXZGLGFBQWE7QUFFYix3QkFBd0I7QUFFeEIsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hFLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLDZCQUE2QixFQUFFLENBQUMsQ0FBQztBQUVyRSw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLHVDQUErQixDQUFDO0FBRTFHLGFBQWE7QUFFYixrQkFBa0I7QUFFbEIsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNqSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0scUNBQXFDLENBQUM7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFL0QsYUFBYSJ9
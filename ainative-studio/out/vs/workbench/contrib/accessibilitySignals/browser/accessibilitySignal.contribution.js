/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibilitySignalService, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { AccessibilitySignalLineDebuggerContribution } from './accessibilitySignalDebuggerContribution.js';
import { ShowAccessibilityAnnouncementHelp, ShowSignalSoundHelp } from './commands.js';
import { EditorTextPropertySignalsContribution } from './editorTextPropertySignalsContribution.js';
import { wrapInReloadableClass0 } from '../../../../platform/observable/common/wrapInReloadableClass.js';
registerSingleton(IAccessibilitySignalService, AccessibilitySignalService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2('EditorTextPropertySignalsContribution', wrapInReloadableClass0(() => EditorTextPropertySignalsContribution), 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2('AccessibilitySignalLineDebuggerContribution', AccessibilitySignalLineDebuggerContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerAction2(ShowSignalSoundHelp);
registerAction2(ShowAccessibilityAnnouncementHelp);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eVNpZ25hbHMvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5U2lnbmFsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN6SixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdkYsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFFekcsaUJBQWlCLENBQUMsMkJBQTJCLEVBQUUsMEJBQTBCLG9DQUE0QixDQUFDO0FBRXRHLDhCQUE4QixDQUFDLHVDQUF1QyxFQUFFLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLHFDQUFxQyxDQUFDLHVDQUErQixDQUFDO0FBQzNLLDhCQUE4QixDQUFDLDZDQUE2QyxFQUFFLDJDQUEyQyx1Q0FBK0IsQ0FBQztBQUV6SixlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUNyQyxlQUFlLENBQUMsaUNBQWlDLENBQUMsQ0FBQyJ9
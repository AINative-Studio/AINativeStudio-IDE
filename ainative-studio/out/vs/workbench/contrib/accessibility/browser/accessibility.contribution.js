/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { DynamicSpeechAccessibilityConfiguration, registerAccessibilityConfiguration } from './accessibilityConfiguration.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { UnfocusedViewDimmingContribution } from './unfocusedViewDimmingContribution.js';
import { AccessibilityStatus } from './accessibilityStatus.js';
import { EditorAccessibilityHelpContribution } from './editorAccessibilityHelp.js';
import { SaveAccessibilitySignalContribution } from '../../accessibilitySignals/browser/saveAccessibilitySignal.js';
import { DiffEditorActiveAnnouncementContribution } from '../../accessibilitySignals/browser/openDiffEditorAnnouncement.js';
import { SpeechAccessibilitySignalContribution } from '../../speech/browser/speechAccessibilitySignal.js';
import { AccessibleViewInformationService, IAccessibleViewInformationService } from '../../../services/accessibility/common/accessibleViewInformationService.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { AccessibleViewService } from './accessibleView.js';
import { AccesibleViewHelpContribution, AccesibleViewContributions } from './accessibleViewContributions.js';
import { ExtensionAccessibilityHelpDialogContribution } from './extensionAccesibilityHelp.contribution.js';
registerAccessibilityConfiguration();
registerSingleton(IAccessibleViewService, AccessibleViewService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAccessibleViewInformationService, AccessibleViewInformationService, 1 /* InstantiationType.Delayed */);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(EditorAccessibilityHelpContribution, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(UnfocusedViewDimmingContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(AccesibleViewHelpContribution, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(AccesibleViewContributions, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(AccessibilityStatus.ID, AccessibilityStatus, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ExtensionAccessibilityHelpDialogContribution.ID, ExtensionAccessibilityHelpDialogContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(SaveAccessibilitySignalContribution.ID, SaveAccessibilitySignalContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(SpeechAccessibilitySignalContribution.ID, SpeechAccessibilitySignalContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(DiffEditorActiveAnnouncementContribution.ID, DiffEditorActiveAnnouncementContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(DynamicSpeechAccessibilityConfiguration.ID, DynamicSpeechAccessibilityConfiguration, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2liaWxpdHkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5SCxPQUFPLEVBQW1ELFVBQVUsSUFBSSxtQkFBbUIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXRLLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNwSCxPQUFPLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUM1SCxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUNqSyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RyxPQUFPLEVBQUUsNENBQTRDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUUzRyxrQ0FBa0MsRUFBRSxDQUFDO0FBQ3JDLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixvQ0FBNEIsQ0FBQztBQUM1RixpQkFBaUIsQ0FBQyxpQ0FBaUMsRUFBRSxnQ0FBZ0Msb0NBQTRCLENBQUM7QUFFbEgsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN0RyxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQyxtQ0FBbUMsb0NBQTRCLENBQUM7QUFDaEgsaUJBQWlCLENBQUMsNkJBQTZCLENBQUMsZ0NBQWdDLGtDQUEwQixDQUFDO0FBRTNHLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLDZCQUE2QixvQ0FBNEIsQ0FBQztBQUMxRyxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FBQywwQkFBMEIsb0NBQTRCLENBQUM7QUFFdkcsOEJBQThCLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLG1CQUFtQixzQ0FBOEIsQ0FBQztBQUN6Ryw4QkFBOEIsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUFFLEVBQUUsNENBQTRDLHNDQUE4QixDQUFDO0FBQzNKLDhCQUE4QixDQUFDLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxtQ0FBbUMsdUNBQStCLENBQUM7QUFDMUksOEJBQThCLENBQUMscUNBQXFDLENBQUMsRUFBRSxFQUFFLHFDQUFxQyx1Q0FBK0IsQ0FBQztBQUM5SSw4QkFBOEIsQ0FBQyx3Q0FBd0MsQ0FBQyxFQUFFLEVBQUUsd0NBQXdDLHVDQUErQixDQUFDO0FBQ3BKLDhCQUE4QixDQUFDLHVDQUF1QyxDQUFDLEVBQUUsRUFBRSx1Q0FBdUMsdUNBQStCLENBQUMifQ==
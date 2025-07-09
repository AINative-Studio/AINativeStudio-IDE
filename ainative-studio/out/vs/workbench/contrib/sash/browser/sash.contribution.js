/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { SashSettingsController } from './sash.js';
import { isIOS } from '../../../../base/common/platform.js';
// Sash size contribution
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(SashSettingsController, 3 /* LifecyclePhase.Restored */);
// Sash size configuration contribution
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.sash.size': {
            type: 'number',
            default: isIOS ? 20 : 4,
            minimum: 1,
            maximum: 20,
            description: localize('sashSize', "Controls the feedback area size in pixels of the dragging area in between views/editors. Set it to a larger value if you feel it's hard to resize views using the mouse.")
        },
        'workbench.sash.hoverDelay': {
            type: 'number',
            default: 300,
            minimum: 0,
            maximum: 2000,
            description: localize('sashHoverDelay', "Controls the hover feedback delay in milliseconds of the dragging area in between views/editors.")
        },
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2FzaC9icm93c2VyL3Nhc2guY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQTBCLFVBQVUsSUFBSSx1QkFBdUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBRW5KLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRixPQUFPLEVBQW1DLFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQseUJBQXlCO0FBQ3pCLFFBQVEsQ0FBQyxFQUFFLENBQWtDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQztLQUN6RSw2QkFBNkIsQ0FBQyxzQkFBc0Isa0NBQTBCLENBQUM7QUFFakYsdUNBQXVDO0FBQ3ZDLFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQztLQUN4RSxxQkFBcUIsQ0FBQztJQUN0QixHQUFHLDhCQUE4QjtJQUNqQyxVQUFVLEVBQUU7UUFDWCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QixPQUFPLEVBQUUsQ0FBQztZQUNWLE9BQU8sRUFBRSxFQUFFO1lBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsMEtBQTBLLENBQUM7U0FDN007UUFDRCwyQkFBMkIsRUFBRTtZQUM1QixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxHQUFHO1lBQ1osT0FBTyxFQUFFLENBQUM7WUFDVixPQUFPLEVBQUUsSUFBSTtZQUNiLFdBQVcsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsa0dBQWtHLENBQUM7U0FDM0k7S0FDRDtDQUNELENBQUMsQ0FBQyJ9
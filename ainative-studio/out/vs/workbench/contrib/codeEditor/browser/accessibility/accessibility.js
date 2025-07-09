/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './accessibility.css';
import * as nls from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { accessibilityHelpIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { AccessibilityHelpNLS } from '../../../../../editor/common/standaloneStrings.js';
class ToggleScreenReaderMode extends Action2 {
    constructor() {
        super({
            id: 'editor.action.toggleScreenReaderAccessibilityMode',
            title: nls.localize2('toggleScreenReaderMode', "Toggle Screen Reader Accessibility Mode"),
            metadata: {
                description: nls.localize2('toggleScreenReaderModeDescription', "Toggles an optimized mode for usage with screen readers, braille devices, and other assistive technologies."),
            },
            f1: true,
            keybinding: [{
                    primary: 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    when: accessibilityHelpIsShown
                },
                {
                    primary: 512 /* KeyMod.Alt */ | 59 /* KeyCode.F1 */ | 1024 /* KeyMod.Shift */,
                    linux: { primary: 512 /* KeyMod.Alt */ | 62 /* KeyCode.F4 */ | 1024 /* KeyMod.Shift */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                }]
        });
    }
    async run(accessor) {
        const accessibiiltyService = accessor.get(IAccessibilityService);
        const configurationService = accessor.get(IConfigurationService);
        const isScreenReaderOptimized = accessibiiltyService.isScreenReaderOptimized();
        configurationService.updateValue('editor.accessibilitySupport', isScreenReaderOptimized ? 'off' : 'on', 2 /* ConfigurationTarget.USER */);
        alert(isScreenReaderOptimized ? AccessibilityHelpNLS.screenReaderModeDisabled : AccessibilityHelpNLS.screenReaderModeEnabled);
    }
}
registerAction2(ToggleScreenReaderMode);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvYWNjZXNzaWJpbGl0eS9hY2Nlc3NpYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8scUJBQXFCLENBQUM7QUFDN0IsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFM0gsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUd4RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFekYsTUFBTSxzQkFBdUIsU0FBUSxPQUFPO0lBRTNDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1EQUFtRDtZQUN2RCxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSx5Q0FBeUMsQ0FBQztZQUN6RixRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsbUNBQW1DLEVBQUUsNkdBQTZHLENBQUM7YUFDOUs7WUFDRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFVBQVUsRUFBRSxDQUFDO29CQUNaLE9BQU8sRUFBRSxpREFBNkI7b0JBQ3RDLE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtvQkFDOUMsSUFBSSxFQUFFLHdCQUF3QjtpQkFDOUI7Z0JBQ0Q7b0JBQ0MsT0FBTyxFQUFFLDBDQUF1QiwwQkFBZTtvQkFDL0MsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLDBDQUF1QiwwQkFBZSxFQUFFO29CQUMxRCxNQUFNLEVBQUUsOENBQW9DLEVBQUU7aUJBQzlDLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNqRSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNqRSxNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDL0Usb0JBQW9CLENBQUMsV0FBVyxDQUFDLDZCQUE2QixFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksbUNBQTJCLENBQUM7UUFDbEksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUMvSCxDQUFDO0NBQ0Q7QUFFRCxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQyJ9
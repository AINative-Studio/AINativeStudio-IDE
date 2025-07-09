/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { OS } from '../../../base/common/platform.js';
import { Extensions as ConfigExtensions } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
export var DispatchConfig;
(function (DispatchConfig) {
    DispatchConfig[DispatchConfig["Code"] = 0] = "Code";
    DispatchConfig[DispatchConfig["KeyCode"] = 1] = "KeyCode";
})(DispatchConfig || (DispatchConfig = {}));
export function readKeyboardConfig(configurationService) {
    const keyboard = configurationService.getValue('keyboard');
    const dispatch = (keyboard?.dispatch === 'keyCode' ? 1 /* DispatchConfig.KeyCode */ : 0 /* DispatchConfig.Code */);
    const mapAltGrToCtrlAlt = Boolean(keyboard?.mapAltGrToCtrlAlt);
    return { dispatch, mapAltGrToCtrlAlt };
}
const configurationRegistry = Registry.as(ConfigExtensions.Configuration);
const keyboardConfiguration = {
    'id': 'keyboard',
    'order': 15,
    'type': 'object',
    'title': nls.localize('keyboardConfigurationTitle', "Keyboard"),
    'properties': {
        'keyboard.dispatch': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'string',
            enum: ['code', 'keyCode'],
            default: 'code',
            markdownDescription: nls.localize('dispatch', "Controls the dispatching logic for key presses to use either `code` (recommended) or `keyCode`."),
            included: OS === 2 /* OperatingSystem.Macintosh */ || OS === 3 /* OperatingSystem.Linux */
        },
        'keyboard.mapAltGrToCtrlAlt': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('mapAltGrToCtrlAlt', "Controls if the AltGraph+ modifier should be treated as Ctrl+Alt+."),
            included: OS === 1 /* OperatingSystem.Windows */
        }
    }
};
configurationRegistry.registerConfiguration(keyboardConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRDb25maWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5Ym9hcmRMYXlvdXQvY29tbW9uL2tleWJvYXJkQ29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFFdkMsT0FBTyxFQUFFLEVBQUUsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RSxPQUFPLEVBQXNCLFVBQVUsSUFBSSxnQkFBZ0IsRUFBOEMsTUFBTSxxREFBcUQsQ0FBQztBQUNySyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsTUFBTSxDQUFOLElBQWtCLGNBR2pCO0FBSEQsV0FBa0IsY0FBYztJQUMvQixtREFBSSxDQUFBO0lBQ0oseURBQU8sQ0FBQTtBQUNSLENBQUMsRUFIaUIsY0FBYyxLQUFkLGNBQWMsUUFHL0I7QUFPRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsb0JBQTJDO0lBQzdFLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBd0QsVUFBVSxDQUFDLENBQUM7SUFDbEgsTUFBTSxRQUFRLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLGdDQUF3QixDQUFDLDRCQUFvQixDQUFDLENBQUM7SUFDbkcsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ2xHLE1BQU0scUJBQXFCLEdBQXVCO0lBQ2pELElBQUksRUFBRSxVQUFVO0lBQ2hCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsTUFBTSxFQUFFLFFBQVE7SUFDaEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQy9ELFlBQVksRUFBRTtRQUNiLG1CQUFtQixFQUFFO1lBQ3BCLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztZQUN6QixPQUFPLEVBQUUsTUFBTTtZQUNmLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGlHQUFpRyxDQUFDO1lBQ2hKLFFBQVEsRUFBRSxFQUFFLHNDQUE4QixJQUFJLEVBQUUsa0NBQTBCO1NBQzFFO1FBQ0QsNEJBQTRCLEVBQUU7WUFDN0IsS0FBSyx3Q0FBZ0M7WUFDckMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsb0VBQW9FLENBQUM7WUFDNUgsUUFBUSxFQUFFLEVBQUUsb0NBQTRCO1NBQ3hDO0tBQ0Q7Q0FDRCxDQUFDO0FBRUYscUJBQXFCLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsQ0FBQyJ9
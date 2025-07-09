/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'update',
    order: 15,
    title: localize('updateConfigurationTitle', "Update"),
    type: 'object',
    properties: {
        'update.mode': {
            type: 'string',
            enum: ['none', 'manual', 'start', 'default'],
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('updateMode', "Configure whether you receive automatic updates. Requires a restart after change. The updates are fetched from a Microsoft online service."),
            tags: ['usesOnlineServices'],
            enumDescriptions: [
                localize('none', "Disable updates."),
                localize('manual', "Disable automatic background update checks. Updates will be available if you manually check for updates."),
                localize('start', "Check for updates only on startup. Disable automatic background update checks."),
                localize('default', "Enable automatic update checks. Code will check for updates automatically and periodically.")
            ],
            policy: {
                name: 'UpdateMode',
                minimumVersion: '1.67',
            }
        },
        'update.channel': {
            type: 'string',
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('updateMode', "Configure whether you receive automatic updates. Requires a restart after change. The updates are fetched from a Microsoft online service."),
            deprecationMessage: localize('deprecated', "This setting is deprecated, please use '{0}' instead.", 'update.mode')
        },
        'update.enableWindowsBackgroundUpdates': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            title: localize('enableWindowsBackgroundUpdatesTitle', "Enable Background Updates on Windows"),
            description: localize('enableWindowsBackgroundUpdates', "Enable to download and install new VS Code versions in the background on Windows."),
            included: isWindows && !isWeb
        },
        'update.showReleaseNotes': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('showReleaseNotes', "Show Release Notes after an update. The Release Notes are fetched from a Microsoft online service."),
            tags: ['usesOnlineServices']
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmNvbmZpZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXBkYXRlL2NvbW1vbi91cGRhdGUuY29uZmlnLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQXNCLFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSxxREFBcUQsQ0FBQztBQUN4SixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN6RyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxFQUFFLEVBQUUsUUFBUTtJQUNaLEtBQUssRUFBRSxFQUFFO0lBQ1QsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxRQUFRLENBQUM7SUFDckQsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCxhQUFhLEVBQUU7WUFDZCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQztZQUM1QyxPQUFPLEVBQUUsU0FBUztZQUNsQixLQUFLLHdDQUFnQztZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSw0SUFBNEksQ0FBQztZQUNqTCxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztZQUM1QixnQkFBZ0IsRUFBRTtnQkFDakIsUUFBUSxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQztnQkFDcEMsUUFBUSxDQUFDLFFBQVEsRUFBRSwwR0FBMEcsQ0FBQztnQkFDOUgsUUFBUSxDQUFDLE9BQU8sRUFBRSxnRkFBZ0YsQ0FBQztnQkFDbkcsUUFBUSxDQUFDLFNBQVMsRUFBRSw2RkFBNkYsQ0FBQzthQUNsSDtZQUNELE1BQU0sRUFBRTtnQkFDUCxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsY0FBYyxFQUFFLE1BQU07YUFDdEI7U0FDRDtRQUNELGdCQUFnQixFQUFFO1lBQ2pCLElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsS0FBSyx3Q0FBZ0M7WUFDckMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsNElBQTRJLENBQUM7WUFDakwsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSx1REFBdUQsRUFBRSxhQUFhLENBQUM7U0FDbEg7UUFDRCx1Q0FBdUMsRUFBRTtZQUN4QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyx3Q0FBZ0M7WUFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxzQ0FBc0MsQ0FBQztZQUM5RixXQUFXLEVBQUUsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLG1GQUFtRixDQUFDO1lBQzVJLFFBQVEsRUFBRSxTQUFTLElBQUksQ0FBQyxLQUFLO1NBQzdCO1FBQ0QseUJBQXlCLEVBQUU7WUFDMUIsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLFdBQVcsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsb0dBQW9HLENBQUM7WUFDL0ksSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7U0FDNUI7S0FDRDtDQUNELENBQUMsQ0FBQyJ9
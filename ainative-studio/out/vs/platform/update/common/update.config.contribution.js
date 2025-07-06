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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmNvbmZpZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvY29tbW9uL3VwZGF0ZS5jb25maWcuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBc0IsVUFBVSxJQUFJLHVCQUF1QixFQUEwQixNQUFNLHFEQUFxRCxDQUFDO0FBQ3hKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3pHLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO0lBQzNDLEVBQUUsRUFBRSxRQUFRO0lBQ1osS0FBSyxFQUFFLEVBQUU7SUFDVCxLQUFLLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQztJQUNyRCxJQUFJLEVBQUUsUUFBUTtJQUNkLFVBQVUsRUFBRTtRQUNYLGFBQWEsRUFBRTtZQUNkLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDO1lBQzVDLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLEtBQUssd0NBQWdDO1lBQ3JDLFdBQVcsRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLDRJQUE0SSxDQUFDO1lBQ2pMLElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDO1lBQzVCLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDO2dCQUNwQyxRQUFRLENBQUMsUUFBUSxFQUFFLDBHQUEwRyxDQUFDO2dCQUM5SCxRQUFRLENBQUMsT0FBTyxFQUFFLGdGQUFnRixDQUFDO2dCQUNuRyxRQUFRLENBQUMsU0FBUyxFQUFFLDZGQUE2RixDQUFDO2FBQ2xIO1lBQ0QsTUFBTSxFQUFFO2dCQUNQLElBQUksRUFBRSxZQUFZO2dCQUNsQixjQUFjLEVBQUUsTUFBTTthQUN0QjtTQUNEO1FBQ0QsZ0JBQWdCLEVBQUU7WUFDakIsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsU0FBUztZQUNsQixLQUFLLHdDQUFnQztZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSw0SUFBNEksQ0FBQztZQUNqTCxrQkFBa0IsRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLHVEQUF1RCxFQUFFLGFBQWEsQ0FBQztTQUNsSDtRQUNELHVDQUF1QyxFQUFFO1lBQ3hDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLHdDQUFnQztZQUNyQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLHNDQUFzQyxDQUFDO1lBQzlGLFdBQVcsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsbUZBQW1GLENBQUM7WUFDNUksUUFBUSxFQUFFLFNBQVMsSUFBSSxDQUFDLEtBQUs7U0FDN0I7UUFDRCx5QkFBeUIsRUFBRTtZQUMxQixJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyx3Q0FBZ0M7WUFDckMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxvR0FBb0csQ0FBQztZQUMvSSxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztTQUM1QjtLQUNEO0NBQ0QsQ0FBQyxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { revive } from '../../../../base/common/marshalling.js';
export class RemoteExtensionEnvironmentChannelClient {
    static async getEnvironmentData(channel, remoteAuthority, profile) {
        const args = {
            remoteAuthority,
            profile
        };
        const data = await channel.call('getEnvironmentData', args);
        return {
            pid: data.pid,
            connectionToken: data.connectionToken,
            appRoot: URI.revive(data.appRoot),
            settingsPath: URI.revive(data.settingsPath),
            logsPath: URI.revive(data.logsPath),
            extensionHostLogsPath: URI.revive(data.extensionHostLogsPath),
            globalStorageHome: URI.revive(data.globalStorageHome),
            workspaceStorageHome: URI.revive(data.workspaceStorageHome),
            localHistoryHome: URI.revive(data.localHistoryHome),
            userHome: URI.revive(data.userHome),
            os: data.os,
            arch: data.arch,
            marks: data.marks,
            useHostProxy: data.useHostProxy,
            profiles: revive(data.profiles),
            isUnsupportedGlibc: data.isUnsupportedGlibc
        };
    }
    static async getExtensionHostExitInfo(channel, remoteAuthority, reconnectionToken) {
        const args = {
            remoteAuthority,
            reconnectionToken
        };
        return channel.call('getExtensionHostExitInfo', args);
    }
    static getDiagnosticInfo(channel, options) {
        return channel.call('getDiagnosticInfo', options);
    }
    static updateTelemetryLevel(channel, telemetryLevel) {
        return channel.call('updateTelemetryLevel', { telemetryLevel });
    }
    static logTelemetry(channel, eventName, data) {
        return channel.call('logTelemetry', { eventName, data });
    }
    static flushTelemetry(channel) {
        return channel.call('flushTelemetry');
    }
    static async ping(channel) {
        await channel.call('ping');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRFbnZpcm9ubWVudENoYW5uZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9jb21tb24vcmVtb3RlQWdlbnRFbnZpcm9ubWVudENoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEdBQUcsRUFBeUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQU01RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFtQ2hFLE1BQU0sT0FBTyx1Q0FBdUM7SUFFbkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFpQixFQUFFLGVBQXVCLEVBQUUsT0FBMkI7UUFDdEcsTUFBTSxJQUFJLEdBQWlDO1lBQzFDLGVBQWU7WUFDZixPQUFPO1NBQ1AsQ0FBQztRQUVGLE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBNkIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFeEYsT0FBTztZQUNOLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtZQUNyQyxPQUFPLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ2pDLFlBQVksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDM0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNuQyxxQkFBcUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztZQUM3RCxpQkFBaUIsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUNyRCxvQkFBb0IsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztZQUMzRCxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUNuRCxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ25DLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNYLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQy9CLGtCQUFrQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7U0FDM0MsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLE9BQWlCLEVBQUUsZUFBdUIsRUFBRSxpQkFBeUI7UUFDMUcsTUFBTSxJQUFJLEdBQXVDO1lBQ2hELGVBQWU7WUFDZixpQkFBaUI7U0FDakIsQ0FBQztRQUNGLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBZ0MsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxPQUFpQixFQUFFLE9BQStCO1FBQzFFLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBa0IsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxPQUFpQixFQUFFLGNBQThCO1FBQzVFLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBTyxzQkFBc0IsRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBaUIsRUFBRSxTQUFpQixFQUFFLElBQW9CO1FBQzdFLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBTyxjQUFjLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFpQjtRQUN0QyxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQU8sZ0JBQWdCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBaUI7UUFDbEMsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFPLE1BQU0sQ0FBQyxDQUFDO0lBQ2xDLENBQUM7Q0FDRCJ9
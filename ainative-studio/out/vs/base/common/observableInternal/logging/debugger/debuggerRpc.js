/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleTypedRpcConnection } from './rpc.js';
export function registerDebugChannel(channelId, createClient) {
    const g = globalThis;
    let queuedNotifications = [];
    let curHost = undefined;
    const { channel, handler } = createChannelFactoryFromDebugChannel({
        sendNotification: (data) => {
            if (curHost) {
                curHost.sendNotification(data);
            }
            else {
                queuedNotifications.push(data);
            }
        },
    });
    let curClient = undefined;
    (g.$$debugValueEditor_debugChannels ?? (g.$$debugValueEditor_debugChannels = {}))[channelId] = (host) => {
        curClient = createClient();
        curHost = host;
        for (const n of queuedNotifications) {
            host.sendNotification(n);
        }
        queuedNotifications = [];
        return handler;
    };
    return SimpleTypedRpcConnection.createClient(channel, () => {
        if (!curClient) {
            throw new Error('Not supported');
        }
        return curClient;
    });
}
function createChannelFactoryFromDebugChannel(host) {
    let h;
    const channel = (handler) => {
        h = handler;
        return {
            sendNotification: data => {
                host.sendNotification(data);
            },
            sendRequest: data => {
                throw new Error('not supported');
            },
        };
    };
    return {
        channel: channel,
        handler: {
            handleRequest: (data) => {
                if (data.type === 'notification') {
                    return h?.handleNotification(data.data);
                }
                else {
                    return h?.handleRequest(data.data);
                }
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXJScGMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9kZWJ1Z2dlci9kZWJ1Z2dlclJwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXdDLHdCQUF3QixFQUFpQixNQUFNLFVBQVUsQ0FBQztBQUV6RyxNQUFNLFVBQVUsb0JBQW9CLENBQ25DLFNBQXlCLEVBQ3pCLFlBQStCO0lBRS9CLE1BQU0sQ0FBQyxHQUFHLFVBQThCLENBQUM7SUFFekMsSUFBSSxtQkFBbUIsR0FBYyxFQUFFLENBQUM7SUFDeEMsSUFBSSxPQUFPLEdBQXNCLFNBQVMsQ0FBQztJQUUzQyxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLG9DQUFvQyxDQUFDO1FBQ2pFLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDMUIsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQUMsQ0FBQztJQUVILElBQUksU0FBUyxHQUE0QixTQUFTLENBQUM7SUFFbkQsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLElBQUksQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3ZHLFNBQVMsR0FBRyxZQUFZLEVBQUUsQ0FBQztRQUMzQixPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ2YsS0FBSyxNQUFNLENBQUMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBQ0QsbUJBQW1CLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUMsQ0FBQztJQUVGLE9BQU8sd0JBQXdCLENBQUMsWUFBWSxDQUFJLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDN0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUFDLENBQUM7UUFDckQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBVUQsU0FBUyxvQ0FBb0MsQ0FBQyxJQUFXO0lBQ3hELElBQUksQ0FBOEIsQ0FBQztJQUNuQyxNQUFNLE9BQU8sR0FBbUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUMzQyxDQUFDLEdBQUcsT0FBTyxDQUFDO1FBQ1osT0FBTztZQUNOLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUFFO2dCQUN4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsQ0FBQztZQUNELFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNsQyxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQztJQUNGLE9BQU87UUFDTixPQUFPLEVBQUUsT0FBTztRQUNoQixPQUFPLEVBQUU7WUFDUixhQUFhLEVBQUUsQ0FBQyxJQUFTLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRSxDQUFDO29CQUNsQyxPQUFPLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztTQUNEO0tBQ0QsQ0FBQztBQUNILENBQUMifQ==
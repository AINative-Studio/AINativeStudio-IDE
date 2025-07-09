/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const NODE_REMOTE_RESOURCE_IPC_METHOD_NAME = 'request';
export const NODE_REMOTE_RESOURCE_CHANNEL_NAME = 'remoteResourceHandler';
export class NodeRemoteResourceRouter {
    async routeCall(hub, command, arg) {
        if (command !== NODE_REMOTE_RESOURCE_IPC_METHOD_NAME) {
            throw new Error(`Call not found: ${command}`);
        }
        const uri = arg[0];
        if (uri?.authority) {
            const connection = hub.connections.find(c => c.ctx === uri.authority);
            if (connection) {
                return connection;
            }
        }
        throw new Error(`Caller not found`);
    }
    routeEvent(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25SZW1vdGVSZXNvdXJjZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2NvbW1vbi9lbGVjdHJvblJlbW90ZVJlc291cmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxTQUFTLENBQUM7QUFFOUQsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsdUJBQXVCLENBQUM7QUFJekUsTUFBTSxPQUFPLHdCQUF3QjtJQUNwQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQTJCLEVBQUUsT0FBZSxFQUFFLEdBQVM7UUFDdEUsSUFBSSxPQUFPLEtBQUssb0NBQW9DLEVBQUUsQ0FBQztZQUN0RCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFnQyxDQUFDO1FBQ2xELElBQUksR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEUsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsT0FBTyxVQUFVLENBQUM7WUFDbkIsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELFVBQVUsQ0FBQyxDQUF5QixFQUFFLEtBQWE7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBQ0QifQ==
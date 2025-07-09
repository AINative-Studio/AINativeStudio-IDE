/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export const IExtHostRpcService = createDecorator('IExtHostRpcService');
export class ExtHostRpcService {
    constructor(rpcProtocol) {
        this.getProxy = rpcProtocol.getProxy.bind(rpcProtocol);
        this.set = rpcProtocol.set.bind(rpcProtocol);
        this.dispose = rpcProtocol.dispose.bind(rpcProtocol);
        this.assertRegistered = rpcProtocol.assertRegistered.bind(rpcProtocol);
        this.drain = rpcProtocol.drain.bind(rpcProtocol);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFJwY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFJwY1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTFGLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsb0JBQW9CLENBQUMsQ0FBQztBQU01RixNQUFNLE9BQU8saUJBQWlCO0lBUzdCLFlBQVksV0FBeUI7UUFDcEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQ0QifQ==
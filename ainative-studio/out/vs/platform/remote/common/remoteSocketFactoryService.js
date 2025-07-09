/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IRemoteSocketFactoryService = createDecorator('remoteSocketFactoryService');
export class RemoteSocketFactoryService {
    constructor() {
        this.factories = {};
    }
    register(type, factory) {
        this.factories[type] ??= [];
        this.factories[type].push(factory);
        return toDisposable(() => {
            const idx = this.factories[type]?.indexOf(factory);
            if (typeof idx === 'number' && idx >= 0) {
                this.factories[type]?.splice(idx, 1);
            }
        });
    }
    getSocketFactory(messagePassing) {
        const factories = (this.factories[messagePassing.type] || []);
        return factories.find(factory => factory.supports(messagePassing));
    }
    connect(connectTo, path, query, debugLabel) {
        const socketFactory = this.getSocketFactory(connectTo);
        if (!socketFactory) {
            throw new Error(`No socket factory found for ${connectTo}`);
        }
        return socketFactory.connect(connectTo, path, query, debugLabel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlU29ja2V0RmFjdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2NvbW1vbi9yZW1vdGVTb2NrZXRGYWN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzlFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQXFCdEgsTUFBTSxPQUFPLDBCQUEwQjtJQUF2QztRQUdrQixjQUFTLEdBQTBELEVBQUUsQ0FBQztJQXlCeEYsQ0FBQztJQXZCTyxRQUFRLENBQWlDLElBQU8sRUFBRSxPQUEwQjtRQUNsRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLGdCQUFnQixDQUFpQyxjQUF5QztRQUNqRyxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBd0IsQ0FBQztRQUNyRixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVNLE9BQU8sQ0FBQyxTQUEyQixFQUFFLElBQVksRUFBRSxLQUFhLEVBQUUsVUFBa0I7UUFDMUYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFDRCxPQUFPLGFBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDbEUsQ0FBQztDQUNEIn0=
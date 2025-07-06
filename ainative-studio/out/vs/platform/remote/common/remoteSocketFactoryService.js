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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlU29ja2V0RmFjdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvY29tbW9uL3JlbW90ZVNvY2tldEZhY3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHOUUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUE4Qiw0QkFBNEIsQ0FBQyxDQUFDO0FBcUJ0SCxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBR2tCLGNBQVMsR0FBMEQsRUFBRSxDQUFDO0lBeUJ4RixDQUFDO0lBdkJPLFFBQVEsQ0FBaUMsSUFBTyxFQUFFLE9BQTBCO1FBQ2xGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRCxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sZ0JBQWdCLENBQWlDLGNBQXlDO1FBQ2pHLE1BQU0sU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUF3QixDQUFDO1FBQ3JGLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRU0sT0FBTyxDQUFDLFNBQTJCLEVBQUUsSUFBWSxFQUFFLEtBQWEsRUFBRSxVQUFrQjtRQUMxRixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNELE9BQU8sYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNsRSxDQUFDO0NBQ0QifQ==
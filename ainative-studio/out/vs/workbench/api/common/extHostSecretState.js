/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import { Emitter } from '../../../base/common/event.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export class ExtHostSecretState {
    constructor(mainContext) {
        this._onDidChangePassword = new Emitter();
        this.onDidChangePassword = this._onDidChangePassword.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadSecretState);
    }
    async $onDidChangePassword(e) {
        this._onDidChangePassword.fire(e);
    }
    get(extensionId, key) {
        return this._proxy.$getPassword(extensionId, key);
    }
    store(extensionId, key, value) {
        return this._proxy.$setPassword(extensionId, key, value);
    }
    delete(extensionId, key) {
        return this._proxy.$deletePassword(extensionId, key);
    }
}
export const IExtHostSecretState = createDecorator('IExtHostSecretState');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlY3JldFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTZWNyZXRTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQTJCLFdBQVcsRUFBOEIsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTFGLE1BQU0sT0FBTyxrQkFBa0I7SUFLOUIsWUFBWSxXQUErQjtRQUhuQyx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBd0MsQ0FBQztRQUMxRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBRzlELElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQXVDO1FBQ2pFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELEdBQUcsQ0FBQyxXQUFtQixFQUFFLEdBQVc7UUFDbkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFtQixFQUFFLEdBQVcsRUFBRSxLQUFhO1FBQ3BELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQW1CLEVBQUUsR0FBVztRQUN0QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0Q7QUFHRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLHFCQUFxQixDQUFDLENBQUMifQ==
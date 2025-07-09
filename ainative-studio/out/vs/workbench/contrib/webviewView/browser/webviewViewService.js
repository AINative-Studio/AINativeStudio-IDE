/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { promiseWithResolvers } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IWebviewViewService = createDecorator('webviewViewService');
export class WebviewViewService extends Disposable {
    constructor() {
        super(...arguments);
        this._resolvers = new Map();
        this._awaitingRevival = new Map();
        this._onNewResolverRegistered = this._register(new Emitter());
        this.onNewResolverRegistered = this._onNewResolverRegistered.event;
    }
    register(viewType, resolver) {
        if (this._resolvers.has(viewType)) {
            throw new Error(`View resolver already registered for ${viewType}`);
        }
        this._resolvers.set(viewType, resolver);
        this._onNewResolverRegistered.fire({ viewType: viewType });
        const pending = this._awaitingRevival.get(viewType);
        if (pending) {
            resolver.resolve(pending.webview, CancellationToken.None).then(() => {
                this._awaitingRevival.delete(viewType);
                pending.resolve();
            });
        }
        return toDisposable(() => {
            this._resolvers.delete(viewType);
        });
    }
    resolve(viewType, webview, cancellation) {
        const resolver = this._resolvers.get(viewType);
        if (!resolver) {
            if (this._awaitingRevival.has(viewType)) {
                throw new Error('View already awaiting revival');
            }
            const { promise, resolve } = promiseWithResolvers();
            this._awaitingRevival.set(viewType, { webview, resolve });
            return promise;
        }
        return resolver.resolve(webview, cancellation);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ZpZXdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdWaWV3L2Jyb3dzZXIvd2Vidmlld1ZpZXdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQThEN0YsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFDO0FBdUI5RixNQUFNLE9BQU8sa0JBQW1CLFNBQVEsVUFBVTtJQUFsRDs7UUFJa0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFDO1FBRXJELHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUEyRSxDQUFDO1FBRXRHLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWlDLENBQUMsQ0FBQztRQUN6Riw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO0lBcUMvRSxDQUFDO0lBbkNBLFFBQVEsQ0FBQyxRQUFnQixFQUFFLFFBQThCO1FBQ3hELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRTNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNuRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN2QyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU8sQ0FBQyxRQUFnQixFQUFFLE9BQW9CLEVBQUUsWUFBK0I7UUFDOUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUNsRCxDQUFDO1lBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxvQkFBb0IsRUFBUSxDQUFDO1lBQzFELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDMUQsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDaEQsQ0FBQztDQUNEIn0=
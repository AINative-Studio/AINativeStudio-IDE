/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter, Event } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import { Disposable } from './extHostTypes.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
export const IExtHostAuthentication = createDecorator('IExtHostAuthentication');
let ExtHostAuthentication = class ExtHostAuthentication {
    constructor(extHostRpc) {
        this._authenticationProviders = new Map();
        this._onDidChangeSessions = new Emitter();
        this._getSessionTaskSingler = new TaskSingler();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadAuthentication);
    }
    /**
     * This sets up an event that will fire when the auth sessions change with a built-in filter for the extensionId
     * if a session change only affects a specific extension.
     * @param extensionId The extension that is interested in the event.
     * @returns An event with a built-in filter for the extensionId
     */
    getExtensionScopedSessionsEvent(extensionId) {
        const normalizedExtensionId = extensionId.toLowerCase();
        return Event.chain(this._onDidChangeSessions.event, ($) => $
            .filter(e => !e.extensionIdFilter || e.extensionIdFilter.includes(normalizedExtensionId))
            .map(e => ({ provider: e.provider })));
    }
    async getSession(requestingExtension, providerId, scopes, options = {}) {
        const extensionId = ExtensionIdentifier.toKey(requestingExtension.identifier);
        const sortedScopes = [...scopes].sort().join(' ');
        const keys = Object.keys(options);
        const optionsStr = keys.sort().map(key => `${key}:${!!options[key]}`).join(', ');
        return await this._getSessionTaskSingler.getOrCreate(`${extensionId} ${providerId} ${sortedScopes} ${optionsStr}`, async () => {
            await this._proxy.$ensureProvider(providerId);
            const extensionName = requestingExtension.displayName || requestingExtension.name;
            return this._proxy.$getSession(providerId, scopes, extensionId, extensionName, options);
        });
    }
    async getAccounts(providerId) {
        await this._proxy.$ensureProvider(providerId);
        return await this._proxy.$getAccounts(providerId);
    }
    async removeSession(providerId, sessionId) {
        const providerData = this._authenticationProviders.get(providerId);
        if (!providerData) {
            return this._proxy.$removeSession(providerId, sessionId);
        }
        return providerData.provider.removeSession(sessionId);
    }
    registerAuthenticationProvider(id, label, provider, options) {
        if (this._authenticationProviders.get(id)) {
            throw new Error(`An authentication provider with id '${id}' is already registered.`);
        }
        this._authenticationProviders.set(id, { label, provider, options: options ?? { supportsMultipleAccounts: false } });
        const listener = provider.onDidChangeSessions(e => this._proxy.$sendDidChangeSessions(id, e));
        this._proxy.$registerAuthenticationProvider(id, label, options?.supportsMultipleAccounts ?? false);
        return new Disposable(() => {
            listener.dispose();
            this._authenticationProviders.delete(id);
            this._proxy.$unregisterAuthenticationProvider(id);
        });
    }
    async $createSession(providerId, scopes, options) {
        const providerData = this._authenticationProviders.get(providerId);
        if (providerData) {
            return await providerData.provider.createSession(scopes, options);
        }
        throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
    }
    async $removeSession(providerId, sessionId) {
        const providerData = this._authenticationProviders.get(providerId);
        if (providerData) {
            return await providerData.provider.removeSession(sessionId);
        }
        throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
    }
    async $getSessions(providerId, scopes, options) {
        const providerData = this._authenticationProviders.get(providerId);
        if (providerData) {
            return await providerData.provider.getSessions(scopes, options);
        }
        throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
    }
    $onDidChangeAuthenticationSessions(id, label, extensionIdFilter) {
        // Don't fire events for the internal auth providers
        if (!id.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
            this._onDidChangeSessions.fire({ provider: { id, label }, extensionIdFilter });
        }
        return Promise.resolve();
    }
};
ExtHostAuthentication = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostAuthentication);
export { ExtHostAuthentication };
class TaskSingler {
    constructor() {
        this._inFlightPromises = new Map();
    }
    getOrCreate(key, promiseFactory) {
        const inFlight = this._inFlightPromises.get(key);
        if (inFlight) {
            return inFlight;
        }
        const promise = promiseFactory().finally(() => this._inFlightPromises.delete(key));
        this._inFlightPromises.set(key, promise);
        return promise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RBdXRoZW50aWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQTZELE1BQU0sdUJBQXVCLENBQUM7QUFDL0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQy9DLE9BQU8sRUFBeUIsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFHNUQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix3QkFBd0IsQ0FBQyxDQUFDO0FBUWpHLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBVWpDLFlBQ3FCLFVBQThCO1FBTjNDLDZCQUF3QixHQUFzQyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztRQUV0Ryx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBK0UsQ0FBQztRQUNsSCwyQkFBc0IsR0FBRyxJQUFJLFdBQVcsRUFBNEMsQ0FBQztRQUs1RixJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsK0JBQStCLENBQUMsV0FBbUI7UUFDbEQsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDeEQsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDMUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLElBQUksQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2FBQ3hGLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FDckMsQ0FBQztJQUNILENBQUM7SUFNRCxLQUFLLENBQUMsVUFBVSxDQUFDLG1CQUEwQyxFQUFFLFVBQWtCLEVBQUUsTUFBeUIsRUFBRSxVQUFrRCxFQUFFO1FBQy9KLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5RSxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sSUFBSSxHQUFxRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBcUQsQ0FBQztRQUN4SSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pGLE9BQU8sTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLEdBQUcsV0FBVyxJQUFJLFVBQVUsSUFBSSxZQUFZLElBQUksVUFBVSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0gsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5QyxNQUFNLGFBQWEsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDO1lBQ2xGLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBa0I7UUFDbkMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QyxPQUFPLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsVUFBa0IsRUFBRSxTQUFpQjtRQUN4RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsOEJBQThCLENBQUMsRUFBVSxFQUFFLEtBQWEsRUFBRSxRQUF1QyxFQUFFLE9BQThDO1FBQ2hKLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBRUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLElBQUksRUFBRSx3QkFBd0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEgsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixJQUFJLEtBQUssQ0FBQyxDQUFDO1FBRW5HLE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzFCLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFrQixFQUFFLE1BQWdCLEVBQUUsT0FBb0Q7UUFDOUcsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLE9BQU8sTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBa0IsRUFBRSxTQUFpQjtRQUN6RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25FLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsT0FBTyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLFVBQWtCLEVBQUUsTUFBeUMsRUFBRSxPQUFvRDtRQUNySSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25FLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsT0FBTyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsVUFBVSxFQUFFLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsa0NBQWtDLENBQUMsRUFBVSxFQUFFLEtBQWEsRUFBRSxpQkFBNEI7UUFDekYsb0RBQW9EO1FBQ3BELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztDQUNELENBQUE7QUE5R1kscUJBQXFCO0lBVy9CLFdBQUEsa0JBQWtCLENBQUE7R0FYUixxQkFBcUIsQ0E4R2pDOztBQUVELE1BQU0sV0FBVztJQUFqQjtRQUNTLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBWTNELENBQUM7SUFYQSxXQUFXLENBQUMsR0FBVyxFQUFFLGNBQWdDO1FBQ3hELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxjQUFjLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25GLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXpDLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7Q0FDRCJ9
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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, isDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IAuthenticationAccessService } from './authenticationAccessService.js';
import { IAuthenticationService } from '../common/authentication.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
export function getAuthenticationProviderActivationEvent(id) { return `onAuthenticationRequest:${id}`; }
export async function getCurrentAuthenticationSessionInfo(secretStorageService, productService) {
    const authenticationSessionValue = await secretStorageService.get(`${productService.urlProtocol}.loginAccount`);
    if (authenticationSessionValue) {
        try {
            const authenticationSessionInfo = JSON.parse(authenticationSessionValue);
            if (authenticationSessionInfo
                && isString(authenticationSessionInfo.id)
                && isString(authenticationSessionInfo.accessToken)
                && isString(authenticationSessionInfo.providerId)) {
                return authenticationSessionInfo;
            }
        }
        catch (e) {
            // This is a best effort operation.
            console.error(`Failed parsing current auth session value: ${e}`);
        }
    }
    return undefined;
}
const authenticationDefinitionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: {
            type: 'string',
            description: localize('authentication.id', 'The id of the authentication provider.')
        },
        label: {
            type: 'string',
            description: localize('authentication.label', 'The human readable name of the authentication provider.'),
        }
    }
};
const authenticationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'authentication',
    jsonSchema: {
        description: localize({ key: 'authenticationExtensionPoint', comment: [`'Contributes' means adds here`] }, 'Contributes authentication'),
        type: 'array',
        items: authenticationDefinitionSchema
    },
    activationEventsGenerator: (authenticationProviders, result) => {
        for (const authenticationProvider of authenticationProviders) {
            if (authenticationProvider.id) {
                result.push(`onAuthenticationRequest:${authenticationProvider.id}`);
            }
        }
    }
});
let AuthenticationService = class AuthenticationService extends Disposable {
    constructor(_extensionService, authenticationAccessService, _environmentService, _logService) {
        super();
        this._extensionService = _extensionService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._onDidRegisterAuthenticationProvider = this._register(new Emitter());
        this.onDidRegisterAuthenticationProvider = this._onDidRegisterAuthenticationProvider.event;
        this._onDidUnregisterAuthenticationProvider = this._register(new Emitter());
        this.onDidUnregisterAuthenticationProvider = this._onDidUnregisterAuthenticationProvider.event;
        this._onDidChangeSessions = this._register(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._onDidChangeDeclaredProviders = this._register(new Emitter());
        this.onDidChangeDeclaredProviders = this._onDidChangeDeclaredProviders.event;
        this._authenticationProviders = new Map();
        this._authenticationProviderDisposables = this._register(new DisposableMap());
        this._declaredProviders = [];
        this._register(authenticationAccessService.onDidChangeExtensionSessionAccess(e => {
            // The access has changed, not the actual session itself but extensions depend on this event firing
            // when they have gained access to an account so this fires that event.
            this._onDidChangeSessions.fire({
                providerId: e.providerId,
                label: e.accountName,
                event: {
                    added: [],
                    changed: [],
                    removed: []
                }
            });
        }));
        this._registerEnvContributedAuthenticationProviders();
        this._registerAuthenticationExtentionPointHandler();
    }
    get declaredProviders() {
        return this._declaredProviders;
    }
    _registerEnvContributedAuthenticationProviders() {
        if (!this._environmentService.options?.authenticationProviders?.length) {
            return;
        }
        for (const provider of this._environmentService.options.authenticationProviders) {
            this.registerDeclaredAuthenticationProvider(provider);
            this.registerAuthenticationProvider(provider.id, provider);
        }
    }
    _registerAuthenticationExtentionPointHandler() {
        this._register(authenticationExtPoint.setHandler((_extensions, { added, removed }) => {
            this._logService.debug(`Found authentication providers. added: ${added.length}, removed: ${removed.length}`);
            added.forEach(point => {
                for (const provider of point.value) {
                    if (isFalsyOrWhitespace(provider.id)) {
                        point.collector.error(localize('authentication.missingId', 'An authentication contribution must specify an id.'));
                        continue;
                    }
                    if (isFalsyOrWhitespace(provider.label)) {
                        point.collector.error(localize('authentication.missingLabel', 'An authentication contribution must specify a label.'));
                        continue;
                    }
                    if (!this.declaredProviders.some(p => p.id === provider.id)) {
                        this.registerDeclaredAuthenticationProvider(provider);
                        this._logService.debug(`Declared authentication provider: ${provider.id}`);
                    }
                    else {
                        point.collector.error(localize('authentication.idConflict', "This authentication id '{0}' has already been registered", provider.id));
                    }
                }
            });
            const removedExtPoints = removed.flatMap(r => r.value);
            removedExtPoints.forEach(point => {
                const provider = this.declaredProviders.find(provider => provider.id === point.id);
                if (provider) {
                    this.unregisterDeclaredAuthenticationProvider(provider.id);
                    this._logService.debug(`Undeclared authentication provider: ${provider.id}`);
                }
            });
        }));
    }
    registerDeclaredAuthenticationProvider(provider) {
        if (isFalsyOrWhitespace(provider.id)) {
            throw new Error(localize('authentication.missingId', 'An authentication contribution must specify an id.'));
        }
        if (isFalsyOrWhitespace(provider.label)) {
            throw new Error(localize('authentication.missingLabel', 'An authentication contribution must specify a label.'));
        }
        if (this.declaredProviders.some(p => p.id === provider.id)) {
            throw new Error(localize('authentication.idConflict', "This authentication id '{0}' has already been registered", provider.id));
        }
        this._declaredProviders.push(provider);
        this._onDidChangeDeclaredProviders.fire();
    }
    unregisterDeclaredAuthenticationProvider(id) {
        const index = this.declaredProviders.findIndex(provider => provider.id === id);
        if (index > -1) {
            this.declaredProviders.splice(index, 1);
        }
        this._onDidChangeDeclaredProviders.fire();
    }
    isAuthenticationProviderRegistered(id) {
        return this._authenticationProviders.has(id);
    }
    registerAuthenticationProvider(id, authenticationProvider) {
        this._authenticationProviders.set(id, authenticationProvider);
        const disposableStore = new DisposableStore();
        disposableStore.add(authenticationProvider.onDidChangeSessions(e => this._onDidChangeSessions.fire({
            providerId: id,
            label: authenticationProvider.label,
            event: e
        })));
        if (isDisposable(authenticationProvider)) {
            disposableStore.add(authenticationProvider);
        }
        this._authenticationProviderDisposables.set(id, disposableStore);
        this._onDidRegisterAuthenticationProvider.fire({ id, label: authenticationProvider.label });
    }
    unregisterAuthenticationProvider(id) {
        const provider = this._authenticationProviders.get(id);
        if (provider) {
            this._authenticationProviders.delete(id);
            this._onDidUnregisterAuthenticationProvider.fire({ id, label: provider.label });
        }
        this._authenticationProviderDisposables.deleteAndDispose(id);
    }
    getProviderIds() {
        const providerIds = [];
        this._authenticationProviders.forEach(provider => {
            providerIds.push(provider.id);
        });
        return providerIds;
    }
    getProvider(id) {
        if (this._authenticationProviders.has(id)) {
            return this._authenticationProviders.get(id);
        }
        throw new Error(`No authentication provider '${id}' is currently registered.`);
    }
    async getAccounts(id) {
        // TODO: Cache this
        const sessions = await this.getSessions(id);
        const accounts = new Array();
        const seenAccounts = new Set();
        for (const session of sessions) {
            if (!seenAccounts.has(session.account.label)) {
                seenAccounts.add(session.account.label);
                accounts.push(session.account);
            }
        }
        return accounts;
    }
    async getSessions(id, scopes, account, activateImmediate = false) {
        const authProvider = this._authenticationProviders.get(id) || await this.tryActivateProvider(id, activateImmediate);
        if (authProvider) {
            return await authProvider.getSessions(scopes, { account });
        }
        else {
            throw new Error(`No authentication provider '${id}' is currently registered.`);
        }
    }
    async createSession(id, scopes, options) {
        const authProvider = this._authenticationProviders.get(id) || await this.tryActivateProvider(id, !!options?.activateImmediate);
        if (authProvider) {
            return await authProvider.createSession(scopes, {
                account: options?.account
            });
        }
        else {
            throw new Error(`No authentication provider '${id}' is currently registered.`);
        }
    }
    async removeSession(id, sessionId) {
        const authProvider = this._authenticationProviders.get(id);
        if (authProvider) {
            return authProvider.removeSession(sessionId);
        }
        else {
            throw new Error(`No authentication provider '${id}' is currently registered.`);
        }
    }
    async tryActivateProvider(providerId, activateImmediate) {
        await this._extensionService.activateByEvent(getAuthenticationProviderActivationEvent(providerId), activateImmediate ? 1 /* ActivationKind.Immediate */ : 0 /* ActivationKind.Normal */);
        let provider = this._authenticationProviders.get(providerId);
        if (provider) {
            return provider;
        }
        const store = new DisposableStore();
        // When activate has completed, the extension has made the call to `registerAuthenticationProvider`.
        // However, activate cannot block on this, so the renderer may not have gotten the event yet.
        const didRegister = new Promise((resolve, _) => {
            store.add(Event.once(this.onDidRegisterAuthenticationProvider)(e => {
                if (e.id === providerId) {
                    provider = this._authenticationProviders.get(providerId);
                    if (provider) {
                        resolve(provider);
                    }
                    else {
                        throw new Error(`No authentication provider '${providerId}' is currently registered.`);
                    }
                }
            }));
        });
        const didTimeout = new Promise((_, reject) => {
            const handle = setTimeout(() => {
                reject('Timed out waiting for authentication provider to register');
            }, 5000);
            store.add(toDisposable(() => clearTimeout(handle)));
        });
        return Promise.race([didRegister, didTimeout]).finally(() => store.dispose());
    }
};
AuthenticationService = __decorate([
    __param(0, IExtensionService),
    __param(1, IAuthenticationAccessService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, ILogService)
], AuthenticationService);
export { AuthenticationService };
registerSingleton(IAuthenticationService, AuthenticationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi9icm93c2VyL2F1dGhlbnRpY2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0ksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFHL0csT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEYsT0FBTyxFQUEyTCxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlQLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3RHLE9BQU8sRUFBa0IsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFbkYsTUFBTSxVQUFVLHdDQUF3QyxDQUFDLEVBQVUsSUFBWSxPQUFPLDJCQUEyQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFJeEgsTUFBTSxDQUFDLEtBQUssVUFBVSxtQ0FBbUMsQ0FDeEQsb0JBQTJDLEVBQzNDLGNBQStCO0lBRS9CLE1BQU0sMEJBQTBCLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxjQUFjLENBQUMsV0FBVyxlQUFlLENBQUMsQ0FBQztJQUNoSCxJQUFJLDBCQUEwQixFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDO1lBQ0osTUFBTSx5QkFBeUIsR0FBOEIsSUFBSSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3BHLElBQUkseUJBQXlCO21CQUN6QixRQUFRLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDO21CQUN0QyxRQUFRLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDO21CQUMvQyxRQUFRLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLEVBQ2hELENBQUM7Z0JBQ0YsT0FBTyx5QkFBeUIsQ0FBQztZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixtQ0FBbUM7WUFDbkMsT0FBTyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsRSxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLDhCQUE4QixHQUFnQjtJQUNuRCxJQUFJLEVBQUUsUUFBUTtJQUNkLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsVUFBVSxFQUFFO1FBQ1gsRUFBRSxFQUFFO1lBQ0gsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHdDQUF3QyxDQUFDO1NBQ3BGO1FBQ0QsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHlEQUF5RCxDQUFDO1NBQ3hHO0tBQ0Q7Q0FDRCxDQUFDO0FBRUYsTUFBTSxzQkFBc0IsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBc0M7SUFDN0csY0FBYyxFQUFFLGdCQUFnQjtJQUNoQyxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLDhCQUE4QixFQUFFLE9BQU8sRUFBRSxDQUFDLCtCQUErQixDQUFDLEVBQUUsRUFBRSw0QkFBNEIsQ0FBQztRQUN4SSxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRSw4QkFBOEI7S0FDckM7SUFDRCx5QkFBeUIsRUFBRSxDQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQzlELEtBQUssTUFBTSxzQkFBc0IsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBQzlELElBQUksc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDckUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUksSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBa0JwRCxZQUNvQixpQkFBcUQsRUFDMUMsMkJBQXlELEVBQ2xELG1CQUF5RSxFQUNqRyxXQUF5QztRQUV0RCxLQUFLLEVBQUUsQ0FBQztRQUw0QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBRWxCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUM7UUFDaEYsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFuQi9DLHlDQUFvQyxHQUErQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFxQyxDQUFDLENBQUM7UUFDbkosd0NBQW1DLEdBQTZDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLENBQUM7UUFFakksMkNBQXNDLEdBQStDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXFDLENBQUMsQ0FBQztRQUNySiwwQ0FBcUMsR0FBNkMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLEtBQUssQ0FBQztRQUVySSx5QkFBb0IsR0FBNkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBbUYsQ0FBQyxDQUFDO1FBQy9OLHdCQUFtQixHQUEyRixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBRS9JLGtDQUE2QixHQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNsRixpQ0FBNEIsR0FBZ0IsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQztRQUV0Riw2QkFBd0IsR0FBeUMsSUFBSSxHQUFHLEVBQW1DLENBQUM7UUFDNUcsdUNBQWtDLEdBQXVDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXVCLENBQUMsQ0FBQztRQTRCbEksdUJBQWtCLEdBQXdDLEVBQUUsQ0FBQztRQWxCcEUsSUFBSSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNoRixtR0FBbUc7WUFDbkcsdUVBQXVFO1lBQ3ZFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7Z0JBQzlCLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVTtnQkFDeEIsS0FBSyxFQUFFLENBQUMsQ0FBQyxXQUFXO2dCQUNwQixLQUFLLEVBQUU7b0JBQ04sS0FBSyxFQUFFLEVBQUU7b0JBQ1QsT0FBTyxFQUFFLEVBQUU7b0JBQ1gsT0FBTyxFQUFFLEVBQUU7aUJBQ1g7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLDhDQUE4QyxFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLENBQUM7SUFDckQsQ0FBQztJQUdELElBQUksaUJBQWlCO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDO0lBQ2hDLENBQUM7SUFFTyw4Q0FBOEM7UUFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDeEUsT0FBTztRQUNSLENBQUM7UUFDRCxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNqRixJQUFJLENBQUMsc0NBQXNDLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEQsSUFBSSxDQUFDLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFTyw0Q0FBNEM7UUFDbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtZQUNwRixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsS0FBSyxDQUFDLE1BQU0sY0FBYyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM3RyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNyQixLQUFLLE1BQU0sUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDcEMsSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQzt3QkFDdEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLG9EQUFvRCxDQUFDLENBQUMsQ0FBQzt3QkFDbEgsU0FBUztvQkFDVixDQUFDO29CQUVELElBQUksbUJBQW1CLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ3pDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxzREFBc0QsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZILFNBQVM7b0JBQ1YsQ0FBQztvQkFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7d0JBQzdELElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDdEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMscUNBQXFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUM1RSxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDBEQUEwRCxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN2SSxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2RCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkYsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxJQUFJLENBQUMsd0NBQXdDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUMzRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzlFLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsc0NBQXNDLENBQUMsUUFBMkM7UUFDakYsSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxvREFBb0QsQ0FBQyxDQUFDLENBQUM7UUFDN0csQ0FBQztRQUNELElBQUksbUJBQW1CLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsc0RBQXNELENBQUMsQ0FBQyxDQUFDO1FBQ2xILENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzVELE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDBEQUEwRCxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pJLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBRUQsd0NBQXdDLENBQUMsRUFBVTtRQUNsRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMvRSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVELGtDQUFrQyxDQUFDLEVBQVU7UUFDNUMsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCw4QkFBOEIsQ0FBQyxFQUFVLEVBQUUsc0JBQStDO1FBQ3pGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDOUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM5QyxlQUFlLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztZQUNsRyxVQUFVLEVBQUUsRUFBRTtZQUNkLEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxLQUFLO1lBQ25DLEtBQUssRUFBRSxDQUFDO1NBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLElBQUksWUFBWSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztZQUMxQyxlQUFlLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUNELElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDN0YsQ0FBQztJQUVELGdDQUFnQyxDQUFDLEVBQVU7UUFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsc0NBQXNDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxjQUFjO1FBQ2IsTUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDaEQsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRUQsV0FBVyxDQUFDLEVBQVU7UUFDckIsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBQy9DLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBVTtRQUMzQixtQkFBbUI7UUFDbkIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxFQUFnQyxDQUFDO1FBQzNELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDdkMsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDeEMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFVLEVBQUUsTUFBaUIsRUFBRSxPQUFzQyxFQUFFLG9CQUE2QixLQUFLO1FBQzFILE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDcEgsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLE1BQU0sWUFBWSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzVELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFVLEVBQUUsTUFBZ0IsRUFBRSxPQUE2QztRQUM5RixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDL0gsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLE1BQU0sWUFBWSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7Z0JBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTzthQUN6QixDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUNoRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBVSxFQUFFLFNBQWlCO1FBQ2hELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLFlBQVksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDaEYsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CLENBQUMsVUFBa0IsRUFBRSxpQkFBMEI7UUFDL0UsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLHdDQUF3QyxDQUFDLFVBQVUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUMsa0NBQTBCLENBQUMsOEJBQXNCLENBQUMsQ0FBQztRQUN6SyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQyxvR0FBb0c7UUFDcEcsNkZBQTZGO1FBQzdGLE1BQU0sV0FBVyxHQUFxQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNoRixLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2xFLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDekIsUUFBUSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3pELElBQUksUUFBUSxFQUFFLENBQUM7d0JBQ2QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNuQixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsVUFBVSw0QkFBNEIsQ0FBQyxDQUFDO29CQUN4RixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLFVBQVUsR0FBcUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDOUUsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDOUIsTUFBTSxDQUFDLDJEQUEyRCxDQUFDLENBQUM7WUFDckUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRVQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUMvRSxDQUFDO0NBQ0QsQ0FBQTtBQTVPWSxxQkFBcUI7SUFtQi9CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLG1DQUFtQyxDQUFBO0lBQ25DLFdBQUEsV0FBVyxDQUFBO0dBdEJELHFCQUFxQixDQTRPakM7O0FBRUQsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLG9DQUE0QixDQUFDIn0=
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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IAuthenticationService } from '../../authentication/common/authentication.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
import { Barrier } from '../../../../base/common/async.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
var DefaultAccountStatus;
(function (DefaultAccountStatus) {
    DefaultAccountStatus["Uninitialized"] = "uninitialized";
    DefaultAccountStatus["Unavailable"] = "unavailable";
    DefaultAccountStatus["Available"] = "available";
})(DefaultAccountStatus || (DefaultAccountStatus = {}));
const CONTEXT_DEFAULT_ACCOUNT_STATE = new RawContextKey('defaultAccountStatus', "uninitialized" /* DefaultAccountStatus.Uninitialized */);
export const IDefaultAccountService = createDecorator('defaultAccountService');
export class DefaultAccountService extends Disposable {
    constructor() {
        super(...arguments);
        this._defaultAccount = undefined;
        this.initBarrier = new Barrier();
        this._onDidChangeDefaultAccount = this._register(new Emitter());
        this.onDidChangeDefaultAccount = this._onDidChangeDefaultAccount.event;
    }
    get defaultAccount() { return this._defaultAccount ?? null; }
    async getDefaultAccount() {
        await this.initBarrier.wait();
        return this.defaultAccount;
    }
    setDefaultAccount(account) {
        const oldAccount = this._defaultAccount;
        this._defaultAccount = account;
        if (oldAccount !== this._defaultAccount) {
            this._onDidChangeDefaultAccount.fire(this._defaultAccount);
        }
        this.initBarrier.open();
    }
}
export class NullDefaultAccountService extends Disposable {
    constructor() {
        super(...arguments);
        this.onDidChangeDefaultAccount = Event.None;
    }
    async getDefaultAccount() {
        return null;
    }
    setDefaultAccount(account) {
        // noop
    }
}
let DefaultAccountManagementContribution = class DefaultAccountManagementContribution extends Disposable {
    static { this.ID = 'workbench.contributions.defaultAccountManagement'; }
    constructor(defaultAccountService, configurationService, authenticationService, extensionService, productService, requestService, logService, contextKeyService) {
        super();
        this.defaultAccountService = defaultAccountService;
        this.configurationService = configurationService;
        this.authenticationService = authenticationService;
        this.extensionService = extensionService;
        this.productService = productService;
        this.requestService = requestService;
        this.logService = logService;
        this.defaultAccount = null;
        this.accountStatusContext = CONTEXT_DEFAULT_ACCOUNT_STATE.bindTo(contextKeyService);
        this.initialize();
    }
    async initialize() {
        if (!this.productService.defaultAccount) {
            return;
        }
        const { authenticationProvider, tokenEntitlementUrl, chatEntitlementUrl } = this.productService.defaultAccount;
        await this.extensionService.whenInstalledExtensionsRegistered();
        const declaredProvider = this.authenticationService.declaredProviders.find(provider => provider.id === authenticationProvider.id);
        if (!declaredProvider) {
            this.logService.info(`Default account authentication provider ${authenticationProvider} is not declared.`);
            return;
        }
        this.registerSignInAction(authenticationProvider.id, declaredProvider.label, authenticationProvider.enterpriseProviderId, authenticationProvider.enterpriseProviderConfig, authenticationProvider.scopes);
        this.setDefaultAccount(await this.getDefaultAccountFromAuthenticatedSessions(authenticationProvider.id, authenticationProvider.enterpriseProviderId, authenticationProvider.enterpriseProviderConfig, authenticationProvider.scopes, tokenEntitlementUrl, chatEntitlementUrl));
        this._register(this.authenticationService.onDidChangeSessions(async (e) => {
            if (e.providerId !== authenticationProvider.id && e.providerId !== authenticationProvider.enterpriseProviderId) {
                return;
            }
            if (this.defaultAccount && e.event.removed?.some(session => session.id === this.defaultAccount?.sessionId)) {
                this.setDefaultAccount(null);
                return;
            }
            this.setDefaultAccount(await this.getDefaultAccountFromAuthenticatedSessions(authenticationProvider.id, authenticationProvider.enterpriseProviderId, authenticationProvider.enterpriseProviderConfig, authenticationProvider.scopes, tokenEntitlementUrl, chatEntitlementUrl));
        }));
    }
    setDefaultAccount(account) {
        this.defaultAccount = account;
        this.defaultAccountService.setDefaultAccount(this.defaultAccount);
        if (this.defaultAccount) {
            this.accountStatusContext.set("available" /* DefaultAccountStatus.Available */);
        }
        else {
            this.accountStatusContext.set("unavailable" /* DefaultAccountStatus.Unavailable */);
        }
    }
    extractFromToken(token, key) {
        const result = new Map();
        const firstPart = token?.split(':')[0];
        const fields = firstPart?.split(';');
        for (const field of fields) {
            const [key, value] = field.split('=');
            result.set(key, value);
        }
        return result.get(key);
    }
    async getDefaultAccountFromAuthenticatedSessions(authProviderId, enterpriseAuthProviderId, enterpriseAuthProviderConfig, scopes, tokenEntitlementUrl, chatEntitlementUrl) {
        const id = this.configurationService.getValue(enterpriseAuthProviderConfig) ? enterpriseAuthProviderId : authProviderId;
        const sessions = await this.authenticationService.getSessions(id, undefined, undefined, true);
        const session = sessions.find(s => this.scopesMatch(s.scopes, scopes));
        if (!session) {
            return null;
        }
        const [chatEntitlements, tokenEntitlements] = await Promise.all([
            this.getChatEntitlements(session.accessToken, chatEntitlementUrl),
            this.getTokenEntitlements(session.accessToken, tokenEntitlementUrl)
        ]);
        return {
            sessionId: session.id,
            enterprise: id === enterpriseAuthProviderId || session.account.label.includes('_'),
            ...chatEntitlements,
            ...tokenEntitlements,
        };
    }
    scopesMatch(scopes, expectedScopes) {
        return scopes.length === expectedScopes.length && expectedScopes.every(scope => scopes.includes(scope));
    }
    async getTokenEntitlements(accessToken, tokenEntitlementsUrl) {
        if (!tokenEntitlementsUrl) {
            return {};
        }
        try {
            const chatContext = await this.requestService.request({
                type: 'GET',
                url: tokenEntitlementsUrl,
                disableCache: true,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }, CancellationToken.None);
            const chatData = await asJson(chatContext);
            if (chatData) {
                return {
                    // Editor preview features are disabled if the flag is present and set to 0
                    chat_preview_features_enabled: this.extractFromToken(chatData.token, 'editor_preview_features') !== '0',
                };
            }
            this.logService.error('Failed to fetch token entitlements', 'No data returned');
        }
        catch (error) {
            this.logService.error('Failed to fetch token entitlements', getErrorMessage(error));
        }
        return {};
    }
    async getChatEntitlements(accessToken, chatEntitlementsUrl) {
        if (!chatEntitlementsUrl) {
            return {};
        }
        try {
            const context = await this.requestService.request({
                type: 'GET',
                url: chatEntitlementsUrl,
                disableCache: true,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }, CancellationToken.None);
            const data = await asJson(context);
            if (data) {
                return data;
            }
            this.logService.error('Failed to fetch entitlements', 'No data returned');
        }
        catch (error) {
            this.logService.error('Failed to fetch entitlements', getErrorMessage(error));
        }
        return {};
    }
    registerSignInAction(authProviderId, authProviderLabel, enterpriseAuthProviderId, enterpriseAuthProviderConfig, scopes) {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.accounts.actions.signin',
                    title: localize('sign in', "Sign in to {0}", authProviderLabel),
                    menu: {
                        id: MenuId.AccountsContext,
                        when: ContextKeyExpr.and(CONTEXT_DEFAULT_ACCOUNT_STATE.isEqualTo("unavailable" /* DefaultAccountStatus.Unavailable */), ContextKeyExpr.has('config.extensions.gallery.serviceUrl')),
                        group: '0_signin',
                    }
                });
            }
            run() {
                const id = that.configurationService.getValue(enterpriseAuthProviderConfig) ? enterpriseAuthProviderId : authProviderId;
                return that.authenticationService.createSession(id, scopes);
            }
        }));
    }
};
DefaultAccountManagementContribution = __decorate([
    __param(0, IDefaultAccountService),
    __param(1, IConfigurationService),
    __param(2, IAuthenticationService),
    __param(3, IExtensionService),
    __param(4, IProductService),
    __param(5, IRequestService),
    __param(6, ILogService),
    __param(7, IContextKeyService)
], DefaultAccountManagementContribution);
export { DefaultAccountManagementContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdEFjY291bnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FjY291bnRzL2NvbW1vbi9kZWZhdWx0QWNjb3VudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFB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
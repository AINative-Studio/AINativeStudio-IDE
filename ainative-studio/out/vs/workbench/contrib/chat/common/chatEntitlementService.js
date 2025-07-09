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
var ChatEntitlementRequests_1, ChatEntitlementContext_1;
import product from '../../../../platform/product/common/product.js';
import { Barrier } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IAuthenticationExtensionsService, IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import Severity from '../../../../base/common/severity.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
export const IChatEntitlementService = createDecorator('chatEntitlementService');
export var ChatEntitlement;
(function (ChatEntitlement) {
    /** Signed out */
    ChatEntitlement[ChatEntitlement["Unknown"] = 1] = "Unknown";
    /** Signed in but not yet resolved */
    ChatEntitlement[ChatEntitlement["Unresolved"] = 2] = "Unresolved";
    /** Signed in and entitled to Limited */
    ChatEntitlement[ChatEntitlement["Available"] = 3] = "Available";
    /** Signed in but not entitled to Limited */
    ChatEntitlement[ChatEntitlement["Unavailable"] = 4] = "Unavailable";
    /** Signed-up to Limited */
    ChatEntitlement[ChatEntitlement["Limited"] = 5] = "Limited";
    /** Signed-up to Pro */
    ChatEntitlement[ChatEntitlement["Pro"] = 6] = "Pro";
})(ChatEntitlement || (ChatEntitlement = {}));
export var ChatSentiment;
(function (ChatSentiment) {
    /** Out of the box value */
    ChatSentiment[ChatSentiment["Standard"] = 1] = "Standard";
    /** Explicitly disabled/hidden by user */
    ChatSentiment[ChatSentiment["Disabled"] = 2] = "Disabled";
    /** Extensions installed */
    ChatSentiment[ChatSentiment["Installed"] = 3] = "Installed";
})(ChatSentiment || (ChatSentiment = {}));
//#region Service Implementation
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    providerId: product.defaultChatAgent?.providerId ?? '',
    enterpriseProviderId: product.defaultChatAgent?.enterpriseProviderId ?? '',
    providerScopes: product.defaultChatAgent?.providerScopes ?? [[]],
    entitlementUrl: product.defaultChatAgent?.entitlementUrl ?? '',
    entitlementSignupLimitedUrl: product.defaultChatAgent?.entitlementSignupLimitedUrl ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    chatQuotaExceededContext: product.defaultChatAgent?.chatQuotaExceededContext ?? '',
    completionsQuotaExceededContext: product.defaultChatAgent?.completionsQuotaExceededContext ?? ''
};
let ChatEntitlementService = class ChatEntitlementService extends Disposable {
    constructor(instantiationService, productService, environmentService, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        //#endregion
        //#region --- Quotas
        this._onDidChangeQuotaExceeded = this._register(new Emitter());
        this.onDidChangeQuotaExceeded = this._onDidChangeQuotaExceeded.event;
        this._onDidChangeQuotaRemaining = this._register(new Emitter());
        this.onDidChangeQuotaRemaining = this._onDidChangeQuotaRemaining.event;
        this._quotas = { chatQuotaExceeded: false, completionsQuotaExceeded: false, quotaResetDate: undefined };
        this.ExtensionQuotaContextKeys = {
            chatQuotaExceeded: defaultChat.chatQuotaExceededContext,
            completionsQuotaExceeded: defaultChat.completionsQuotaExceededContext,
        };
        //#endregion
        //#region --- Sentiment
        this._onDidChangeSentiment = this._register(new Emitter());
        this.onDidChangeSentiment = this._onDidChangeSentiment.event;
        this.chatQuotaExceededContextKey = ChatContextKeys.chatQuotaExceeded.bindTo(this.contextKeyService);
        this.completionsQuotaExceededContextKey = ChatContextKeys.completionsQuotaExceeded.bindTo(this.contextKeyService);
        this.onDidChangeEntitlement = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(new Set([
            ChatContextKeys.Entitlement.pro.key,
            ChatContextKeys.Entitlement.limited.key,
            ChatContextKeys.Entitlement.canSignUp.key,
            ChatContextKeys.Entitlement.signedOut.key
        ])), this._store), () => { }, this._store);
        this.onDidChangeSentiment = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(new Set([
            ChatContextKeys.Setup.hidden.key,
            ChatContextKeys.Setup.installed.key
        ])), this._store), () => { }, this._store);
        if (!productService.defaultChatAgent || // needs product config
            (isWeb && !environmentService.remoteAuthority) // only enabled locally or a remote backend
        ) {
            ChatContextKeys.Setup.hidden.bindTo(this.contextKeyService).set(true); // hide copilot UI
            return;
        }
        const context = this.context = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementContext)));
        this.requests = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementRequests, context.value, {
            clearQuotas: () => this.clearQuotas(),
            acceptQuotas: quotas => this.acceptQuotas(quotas)
        })));
        this.registerListeners();
    }
    get entitlement() {
        if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.pro.key) === true) {
            return ChatEntitlement.Pro;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.limited.key) === true) {
            return ChatEntitlement.Limited;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.canSignUp.key) === true) {
            return ChatEntitlement.Available;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.signedOut.key) === true) {
            return ChatEntitlement.Unknown;
        }
        return ChatEntitlement.Unresolved;
    }
    get quotas() { return this._quotas; }
    registerListeners() {
        const chatQuotaExceededSet = new Set([this.ExtensionQuotaContextKeys.chatQuotaExceeded]);
        const completionsQuotaExceededSet = new Set([this.ExtensionQuotaContextKeys.completionsQuotaExceeded]);
        this._register(this.contextKeyService.onDidChangeContext(e => {
            let changed = false;
            if (e.affectsSome(chatQuotaExceededSet)) {
                const newChatQuotaExceeded = this.contextKeyService.getContextKeyValue(this.ExtensionQuotaContextKeys.chatQuotaExceeded);
                if (typeof newChatQuotaExceeded === 'boolean' && newChatQuotaExceeded !== this._quotas.chatQuotaExceeded) {
                    this._quotas = {
                        ...this._quotas,
                        chatQuotaExceeded: newChatQuotaExceeded,
                    };
                    changed = true;
                }
            }
            if (e.affectsSome(completionsQuotaExceededSet)) {
                const newCompletionsQuotaExceeded = this.contextKeyService.getContextKeyValue(this.ExtensionQuotaContextKeys.completionsQuotaExceeded);
                if (typeof newCompletionsQuotaExceeded === 'boolean' && newCompletionsQuotaExceeded !== this._quotas.completionsQuotaExceeded) {
                    this._quotas = {
                        ...this._quotas,
                        completionsQuotaExceeded: newCompletionsQuotaExceeded,
                    };
                    changed = true;
                }
            }
            if (changed) {
                this.updateContextKeys();
                this._onDidChangeQuotaExceeded.fire();
            }
        }));
    }
    acceptQuotas(quotas) {
        const oldQuota = this._quotas;
        this._quotas = quotas;
        this.updateContextKeys();
        if (oldQuota.chatQuotaExceeded !== this._quotas.chatQuotaExceeded ||
            oldQuota.completionsQuotaExceeded !== this._quotas.completionsQuotaExceeded) {
            this._onDidChangeQuotaExceeded.fire();
        }
        if (oldQuota.chatRemaining !== this._quotas.chatRemaining ||
            oldQuota.completionsRemaining !== this._quotas.completionsRemaining) {
            this._onDidChangeQuotaRemaining.fire();
        }
    }
    clearQuotas() {
        if (this.quotas.chatQuotaExceeded || this.quotas.completionsQuotaExceeded) {
            this.acceptQuotas({ chatQuotaExceeded: false, completionsQuotaExceeded: false, quotaResetDate: undefined });
        }
    }
    updateContextKeys() {
        this.chatQuotaExceededContextKey.set(this._quotas.chatQuotaExceeded);
        this.completionsQuotaExceededContextKey.set(this._quotas.completionsQuotaExceeded);
    }
    get sentiment() {
        if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.installed.key) === true) {
            return ChatSentiment.Installed;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.hidden.key) === true) {
            return ChatSentiment.Disabled;
        }
        return ChatSentiment.Standard;
    }
    //#endregion
    async update(token) {
        await this.requests?.value.forceResolveEntitlement(undefined, token);
    }
};
ChatEntitlementService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IProductService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IContextKeyService)
], ChatEntitlementService);
export { ChatEntitlementService };
let ChatEntitlementRequests = ChatEntitlementRequests_1 = class ChatEntitlementRequests extends Disposable {
    static providerId(configurationService) {
        if (configurationService.getValue(`${defaultChat.completionsAdvancedSetting}.authProvider`) === defaultChat.enterpriseProviderId) {
            return defaultChat.enterpriseProviderId;
        }
        return defaultChat.providerId;
    }
    constructor(context, chatQuotasAccessor, telemetryService, authenticationService, logService, requestService, dialogService, openerService, configurationService, authenticationExtensionsService, lifecycleService) {
        super();
        this.context = context;
        this.chatQuotasAccessor = chatQuotasAccessor;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.logService = logService;
        this.requestService = requestService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.authenticationExtensionsService = authenticationExtensionsService;
        this.lifecycleService = lifecycleService;
        this.pendingResolveCts = new CancellationTokenSource();
        this.didResolveEntitlements = false;
        this.state = { entitlement: this.context.state.entitlement };
        this.registerListeners();
        this.resolve();
    }
    registerListeners() {
        this._register(this.authenticationService.onDidChangeDeclaredProviders(() => this.resolve()));
        this._register(this.authenticationService.onDidChangeSessions(e => {
            if (e.providerId === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.authenticationService.onDidRegisterAuthenticationProvider(e => {
            if (e.id === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.authenticationService.onDidUnregisterAuthenticationProvider(e => {
            if (e.id === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.context.onDidChange(() => {
            if (!this.context.state.installed || this.context.state.entitlement === ChatEntitlement.Unknown) {
                // When the extension is not installed or the user is not entitled
                // make sure to clear quotas so that any indicators are also gone
                this.state = { entitlement: this.state.entitlement, quotas: undefined };
                this.chatQuotasAccessor.clearQuotas();
            }
        }));
    }
    async resolve() {
        this.pendingResolveCts.dispose(true);
        const cts = this.pendingResolveCts = new CancellationTokenSource();
        const session = await this.findMatchingProviderSession(cts.token);
        if (cts.token.isCancellationRequested) {
            return;
        }
        // Immediately signal whether we have a session or not
        let state = undefined;
        if (session) {
            // Do not overwrite any state we have already
            if (this.state.entitlement === ChatEntitlement.Unknown) {
                state = { entitlement: ChatEntitlement.Unresolved };
            }
        }
        else {
            this.didResolveEntitlements = false; // reset so that we resolve entitlements fresh when signed in again
            state = { entitlement: ChatEntitlement.Unknown };
        }
        if (state) {
            this.update(state);
        }
        if (session && !this.didResolveEntitlements) {
            // Afterwards resolve entitlement with a network request
            // but only unless it was not already resolved before.
            await this.resolveEntitlement(session, cts.token);
        }
    }
    async findMatchingProviderSession(token) {
        const sessions = await this.doGetSessions(ChatEntitlementRequests_1.providerId(this.configurationService));
        if (token.isCancellationRequested) {
            return undefined;
        }
        for (const session of sessions) {
            for (const scopes of defaultChat.providerScopes) {
                if (this.scopesMatch(session.scopes, scopes)) {
                    return session;
                }
            }
        }
        return undefined;
    }
    async doGetSessions(providerId) {
        try {
            return await this.authenticationService.getSessions(providerId);
        }
        catch (error) {
            // ignore - errors can throw if a provider is not registered
        }
        return [];
    }
    scopesMatch(scopes, expectedScopes) {
        return scopes.length === expectedScopes.length && expectedScopes.every(scope => scopes.includes(scope));
    }
    async resolveEntitlement(session, token) {
        const entitlements = await this.doResolveEntitlement(session, token);
        if (typeof entitlements?.entitlement === 'number' && !token.isCancellationRequested) {
            this.didResolveEntitlements = true;
            this.update(entitlements);
        }
        return entitlements;
    }
    async doResolveEntitlement(session, token) {
        if (ChatEntitlementRequests_1.providerId(this.configurationService) === defaultChat.enterpriseProviderId) {
            this.logService.trace('[chat entitlement]: enterprise provider, assuming Pro');
            return { entitlement: ChatEntitlement.Pro };
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        const response = await this.request(defaultChat.entitlementUrl, 'GET', undefined, session, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (!response) {
            this.logService.trace('[chat entitlement]: no response');
            return { entitlement: ChatEntitlement.Unresolved };
        }
        if (response.res.statusCode && response.res.statusCode !== 200) {
            this.logService.trace(`[chat entitlement]: unexpected status code ${response.res.statusCode}`);
            return (response.res.statusCode === 401 ||
                response.res.statusCode === 403 ||
                response.res.statusCode === 404) ? { entitlement: ChatEntitlement.Unknown /* treat as signed out */ } : { entitlement: ChatEntitlement.Unresolved };
        }
        let responseText = null;
        try {
            responseText = await asText(response);
        }
        catch (error) {
            // ignore - handled below
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (!responseText) {
            this.logService.trace('[chat entitlement]: response has no content');
            return { entitlement: ChatEntitlement.Unresolved };
        }
        let entitlementsResponse;
        try {
            entitlementsResponse = JSON.parse(responseText);
            this.logService.trace(`[chat entitlement]: parsed result is ${JSON.stringify(entitlementsResponse)}`);
        }
        catch (err) {
            this.logService.trace(`[chat entitlement]: error parsing response (${err})`);
            return { entitlement: ChatEntitlement.Unresolved };
        }
        let entitlement;
        if (entitlementsResponse.access_type_sku === 'free_limited_copilot') {
            entitlement = ChatEntitlement.Limited;
        }
        else if (entitlementsResponse.can_signup_for_limited) {
            entitlement = ChatEntitlement.Available;
        }
        else if (entitlementsResponse.chat_enabled) {
            entitlement = ChatEntitlement.Pro;
        }
        else {
            entitlement = ChatEntitlement.Unavailable;
        }
        const chatRemaining = entitlementsResponse.limited_user_quotas?.chat;
        const completionsRemaining = entitlementsResponse.limited_user_quotas?.completions;
        const entitlements = {
            entitlement,
            quotas: {
                chatTotal: entitlementsResponse.monthly_quotas?.chat,
                completionsTotal: entitlementsResponse.monthly_quotas?.completions,
                chatRemaining: typeof chatRemaining === 'number' ? Math.max(0, chatRemaining) : undefined,
                completionsRemaining: typeof completionsRemaining === 'number' ? Math.max(0, completionsRemaining) : undefined,
                resetDate: entitlementsResponse.limited_user_reset_date
            }
        };
        this.logService.trace(`[chat entitlement]: resolved to ${entitlements.entitlement}, quotas: ${JSON.stringify(entitlements.quotas)}`);
        this.telemetryService.publicLog2('chatInstallEntitlement', {
            entitlement: entitlements.entitlement,
            tid: entitlementsResponse.analytics_tracking_id,
            quotaChat: entitlementsResponse.limited_user_quotas?.chat,
            quotaCompletions: entitlementsResponse.limited_user_quotas?.completions,
            quotaResetDate: entitlementsResponse.limited_user_reset_date
        });
        return entitlements;
    }
    async request(url, type, body, session, token) {
        try {
            return await this.requestService.request({
                type,
                url,
                data: type === 'POST' ? JSON.stringify(body) : undefined,
                disableCache: true,
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`
                }
            }, token);
        }
        catch (error) {
            if (!token.isCancellationRequested) {
                this.logService.error(`[chat entitlement] request: error ${error}`);
            }
            return undefined;
        }
    }
    update(state) {
        this.state = state;
        this.context.update({ entitlement: this.state.entitlement });
        if (state.quotas) {
            this.chatQuotasAccessor.acceptQuotas({
                chatQuotaExceeded: typeof state.quotas.chatRemaining === 'number' ? state.quotas.chatRemaining <= 0 : false,
                completionsQuotaExceeded: typeof state.quotas.completionsRemaining === 'number' ? state.quotas.completionsRemaining <= 0 : false,
                quotaResetDate: state.quotas.resetDate ? new Date(state.quotas.resetDate) : undefined,
                chatTotal: state.quotas.chatTotal,
                completionsTotal: state.quotas.completionsTotal,
                chatRemaining: state.quotas.chatRemaining,
                completionsRemaining: state.quotas.completionsRemaining
            });
        }
    }
    async forceResolveEntitlement(session, token = CancellationToken.None) {
        if (!session) {
            session = await this.findMatchingProviderSession(token);
        }
        if (!session) {
            return undefined;
        }
        return this.resolveEntitlement(session, token);
    }
    async signUpLimited(session) {
        const body = {
            restricted_telemetry: this.telemetryService.telemetryLevel === 0 /* TelemetryLevel.NONE */ ? 'disabled' : 'enabled',
            public_code_suggestions: 'enabled'
        };
        const response = await this.request(defaultChat.entitlementSignupLimitedUrl, 'POST', body, session, CancellationToken.None);
        if (!response) {
            const retry = await this.onUnknownSignUpError(localize('signUpNoResponseError', "No response received."), '[chat entitlement] sign-up: no response');
            return retry ? this.signUpLimited(session) : { errorCode: 1 };
        }
        if (response.res.statusCode && response.res.statusCode !== 200) {
            if (response.res.statusCode === 422) {
                try {
                    const responseText = await asText(response);
                    if (responseText) {
                        const responseError = JSON.parse(responseText);
                        if (typeof responseError.message === 'string' && responseError.message) {
                            this.onUnprocessableSignUpError(`[chat entitlement] sign-up: unprocessable entity (${responseError.message})`, responseError.message);
                            return { errorCode: response.res.statusCode };
                        }
                    }
                }
                catch (error) {
                    // ignore - handled below
                }
            }
            const retry = await this.onUnknownSignUpError(localize('signUpUnexpectedStatusError', "Unexpected status code {0}.", response.res.statusCode), `[chat entitlement] sign-up: unexpected status code ${response.res.statusCode}`);
            return retry ? this.signUpLimited(session) : { errorCode: response.res.statusCode };
        }
        let responseText = null;
        try {
            responseText = await asText(response);
        }
        catch (error) {
            // ignore - handled below
        }
        if (!responseText) {
            const retry = await this.onUnknownSignUpError(localize('signUpNoResponseContentsError', "Response has no contents."), '[chat entitlement] sign-up: response has no content');
            return retry ? this.signUpLimited(session) : { errorCode: 2 };
        }
        let parsedResult = undefined;
        try {
            parsedResult = JSON.parse(responseText);
            this.logService.trace(`[chat entitlement] sign-up: response is ${responseText}`);
        }
        catch (err) {
            const retry = await this.onUnknownSignUpError(localize('signUpInvalidResponseError', "Invalid response contents."), `[chat entitlement] sign-up: error parsing response (${err})`);
            return retry ? this.signUpLimited(session) : { errorCode: 3 };
        }
        // We have made it this far, so the user either did sign-up or was signed-up already.
        // That is, because the endpoint throws in all other case according to Patrick.
        this.update({ entitlement: ChatEntitlement.Limited });
        return Boolean(parsedResult?.subscribed);
    }
    async onUnknownSignUpError(detail, logMessage) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSignUpError', "An error occurred while signing up for the Copilot Free plan. Would you like to try again?"),
                detail,
                primaryButton: localize('retry', "Retry")
            });
            return confirmed;
        }
        return false;
    }
    onUnprocessableSignUpError(logMessage, logDetails) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            this.dialogService.prompt({
                type: Severity.Error,
                message: localize('unprocessableSignUpError', "An error occurred while signing up for the Copilot Free plan."),
                detail: logDetails,
                buttons: [
                    {
                        label: localize('ok', "OK"),
                        run: () => { }
                    },
                    {
                        label: localize('learnMore', "Learn More"),
                        run: () => this.openerService.open(URI.parse(defaultChat.upgradePlanUrl))
                    }
                ]
            });
        }
    }
    async signIn() {
        const providerId = ChatEntitlementRequests_1.providerId(this.configurationService);
        const session = await this.authenticationService.createSession(providerId, defaultChat.providerScopes[0]);
        this.authenticationExtensionsService.updateAccountPreference(defaultChat.extensionId, providerId, session.account);
        this.authenticationExtensionsService.updateAccountPreference(defaultChat.chatExtensionId, providerId, session.account);
        const entitlements = await this.forceResolveEntitlement(session);
        return { session, entitlements };
    }
    dispose() {
        this.pendingResolveCts.dispose(true);
        super.dispose();
    }
};
ChatEntitlementRequests = ChatEntitlementRequests_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, ILogService),
    __param(5, IRequestService),
    __param(6, IDialogService),
    __param(7, IOpenerService),
    __param(8, IConfigurationService),
    __param(9, IAuthenticationExtensionsService),
    __param(10, ILifecycleService)
], ChatEntitlementRequests);
export { ChatEntitlementRequests };
let ChatEntitlementContext = class ChatEntitlementContext extends Disposable {
    static { ChatEntitlementContext_1 = this; }
    static { this.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY = 'chat.setupContext'; }
    get state() {
        return this.suspendedState ?? this._state;
    }
    constructor(contextKeyService, storageService, extensionEnablementService, logService, extensionsWorkbenchService) {
        super();
        this.storageService = storageService;
        this.extensionEnablementService = extensionEnablementService;
        this.logService = logService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.suspendedState = undefined;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.updateBarrier = undefined;
        this.canSignUpContextKey = ChatContextKeys.Entitlement.canSignUp.bindTo(contextKeyService);
        this.signedOutContextKey = ChatContextKeys.Entitlement.signedOut.bindTo(contextKeyService);
        this.limitedContextKey = ChatContextKeys.Entitlement.limited.bindTo(contextKeyService);
        this.proContextKey = ChatContextKeys.Entitlement.pro.bindTo(contextKeyService);
        this.hiddenContext = ChatContextKeys.Setup.hidden.bindTo(contextKeyService);
        this.installedContext = ChatContextKeys.Setup.installed.bindTo(contextKeyService);
        this._state = this.storageService.getObject(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, 0 /* StorageScope.PROFILE */) ?? { entitlement: ChatEntitlement.Unknown };
        this.checkExtensionInstallation();
        this.updateContextSync();
    }
    async checkExtensionInstallation() {
        // Await extensions to be ready to be queried
        await this.extensionsWorkbenchService.queryLocal();
        // Listen to change and process extensions once
        this._register(Event.runAndSubscribe(this.extensionsWorkbenchService.onChange, e => {
            if (e && !ExtensionIdentifier.equals(e.identifier.id, defaultChat.extensionId)) {
                return; // unrelated event
            }
            const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.extensionId));
            this.update({ installed: !!defaultChatExtension?.local && this.extensionEnablementService.isEnabled(defaultChatExtension.local) });
        }));
    }
    update(context) {
        this.logService.trace(`[chat entitlement context] update(): ${JSON.stringify(context)}`);
        if (typeof context.installed === 'boolean') {
            this._state.installed = context.installed;
            if (context.installed) {
                context.hidden = false; // allows to fallback if the extension is uninstalled
            }
        }
        if (typeof context.hidden === 'boolean') {
            this._state.hidden = context.hidden;
        }
        if (typeof context.entitlement === 'number') {
            this._state.entitlement = context.entitlement;
            if (this._state.entitlement === ChatEntitlement.Limited || this._state.entitlement === ChatEntitlement.Pro) {
                this._state.registered = true;
            }
            else if (this._state.entitlement === ChatEntitlement.Available) {
                this._state.registered = false; // only reset when signed-in user can sign-up for limited
            }
        }
        this.storageService.store(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, this._state, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return this.updateContext();
    }
    async updateContext() {
        await this.updateBarrier?.wait();
        this.updateContextSync();
    }
    updateContextSync() {
        this.logService.trace(`[chat entitlement context] updateContext(): ${JSON.stringify(this._state)}`);
        this.signedOutContextKey.set(this._state.entitlement === ChatEntitlement.Unknown);
        this.canSignUpContextKey.set(this._state.entitlement === ChatEntitlement.Available);
        this.limitedContextKey.set(this._state.entitlement === ChatEntitlement.Limited);
        this.proContextKey.set(this._state.entitlement === ChatEntitlement.Pro);
        this.hiddenContext.set(!!this._state.hidden);
        this.installedContext.set(!!this._state.installed);
        this._onDidChange.fire();
    }
    suspend() {
        this.suspendedState = { ...this._state };
        this.updateBarrier = new Barrier();
    }
    resume() {
        this.suspendedState = undefined;
        this.updateBarrier?.open();
        this.updateBarrier = undefined;
    }
};
ChatEntitlementContext = ChatEntitlementContext_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IStorageService),
    __param(2, IWorkbenchExtensionEnablementService),
    __param(3, ILogService),
    __param(4, IExtensionsWorkbenchService)
], ChatEntitlementContext);
export { ChatEntitlementContext };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVudGl0bGVtZW50U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0RW50aXRsZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLE1B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
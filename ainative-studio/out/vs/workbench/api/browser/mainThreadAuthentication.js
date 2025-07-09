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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IAuthenticationService, IAuthenticationExtensionsService, INTERNAL_AUTH_PROVIDER_PREFIX as INTERNAL_MODEL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../base/common/severity.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { Emitter } from '../../../base/common/event.js';
import { IAuthenticationAccessService } from '../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../services/authentication/browser/authenticationUsageService.js';
import { getAuthenticationProviderActivationEvent } from '../../services/authentication/browser/authenticationService.js';
import { URI } from '../../../base/common/uri.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { CancellationError } from '../../../base/common/errors.js';
import { ILogService } from '../../../platform/log/common/log.js';
export class MainThreadAuthenticationProvider extends Disposable {
    constructor(_proxy, id, label, supportsMultipleAccounts, notificationService, onDidChangeSessionsEmitter) {
        super();
        this._proxy = _proxy;
        this.id = id;
        this.label = label;
        this.supportsMultipleAccounts = supportsMultipleAccounts;
        this.notificationService = notificationService;
        this.onDidChangeSessions = onDidChangeSessionsEmitter.event;
    }
    async getSessions(scopes, options) {
        return this._proxy.$getSessions(this.id, scopes, options);
    }
    createSession(scopes, options) {
        return this._proxy.$createSession(this.id, scopes, options);
    }
    async removeSession(sessionId) {
        await this._proxy.$removeSession(this.id, sessionId);
        this.notificationService.info(nls.localize('signedOut', "Successfully signed out."));
    }
}
let MainThreadAuthentication = class MainThreadAuthentication extends Disposable {
    constructor(extHostContext, authenticationService, authenticationExtensionsService, authenticationAccessService, authenticationUsageService, dialogService, notificationService, extensionService, telemetryService, openerService, logService) {
        super();
        this.authenticationService = authenticationService;
        this.authenticationExtensionsService = authenticationExtensionsService;
        this.authenticationAccessService = authenticationAccessService;
        this.authenticationUsageService = authenticationUsageService;
        this.dialogService = dialogService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
        this.openerService = openerService;
        this.logService = logService;
        this._registrations = this._register(new DisposableMap());
        this._sentProviderUsageEvents = new Set();
        // TODO@TylerLeonhardt this is a temporary addition to telemetry to understand what extensions are overriding the client id.
        // We can use this telemetry to reach out to these extension authors and let them know that they many need configuration changes
        // due to the adoption of the Microsoft broker.
        // Remove this in a few iterations.
        this._sentClientIdUsageEvents = new Set();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostAuthentication);
        this._register(this.authenticationService.onDidChangeSessions(e => {
            this._proxy.$onDidChangeAuthenticationSessions(e.providerId, e.label);
        }));
        this._register(this.authenticationExtensionsService.onDidChangeAccountPreference(e => {
            const providerInfo = this.authenticationService.getProvider(e.providerId);
            this._proxy.$onDidChangeAuthenticationSessions(providerInfo.id, providerInfo.label, e.extensionIds);
        }));
    }
    async $registerAuthenticationProvider(id, label, supportsMultipleAccounts) {
        if (!this.authenticationService.declaredProviders.find(p => p.id === id)) {
            // If telemetry shows that this is not happening much, we can instead throw an error here.
            this.logService.warn(`Authentication provider ${id} was not declared in the Extension Manifest.`);
            this.telemetryService.publicLog2('authentication.providerNotDeclared', { id });
        }
        const emitter = new Emitter();
        this._registrations.set(id, emitter);
        const provider = new MainThreadAuthenticationProvider(this._proxy, id, label, supportsMultipleAccounts, this.notificationService, emitter);
        this.authenticationService.registerAuthenticationProvider(id, provider);
    }
    $unregisterAuthenticationProvider(id) {
        this._registrations.deleteAndDispose(id);
        this.authenticationService.unregisterAuthenticationProvider(id);
    }
    async $ensureProvider(id) {
        if (!this.authenticationService.isAuthenticationProviderRegistered(id)) {
            return await this.extensionService.activateByEvent(getAuthenticationProviderActivationEvent(id), 1 /* ActivationKind.Immediate */);
        }
    }
    $sendDidChangeSessions(providerId, event) {
        const obj = this._registrations.get(providerId);
        if (obj instanceof Emitter) {
            obj.fire(event);
        }
    }
    $removeSession(providerId, sessionId) {
        return this.authenticationService.removeSession(providerId, sessionId);
    }
    async loginPrompt(provider, extensionName, recreatingSession, options) {
        let message;
        // An internal provider is a special case which is for model access only.
        if (provider.id.startsWith(INTERNAL_MODEL_AUTH_PROVIDER_PREFIX)) {
            message = nls.localize('confirmModelAccess', "The extension '{0}' wants to access the language models provided by {1}.", extensionName, provider.label);
        }
        else {
            message = recreatingSession
                ? nls.localize('confirmRelogin', "The extension '{0}' wants you to sign in again using {1}.", extensionName, provider.label)
                : nls.localize('confirmLogin', "The extension '{0}' wants to sign in using {1}.", extensionName, provider.label);
        }
        const buttons = [
            {
                label: nls.localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, "&&Allow"),
                run() {
                    return true;
                },
            }
        ];
        if (options?.learnMore) {
            buttons.push({
                label: nls.localize('learnMore', "Learn more"),
                run: async () => {
                    const result = this.loginPrompt(provider, extensionName, recreatingSession, options);
                    await this.openerService.open(URI.revive(options.learnMore), { allowCommands: true });
                    return await result;
                }
            });
        }
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message,
            buttons,
            detail: options?.detail,
            cancelButton: true,
        });
        return result ?? false;
    }
    async continueWithIncorrectAccountPrompt(chosenAccountLabel, requestedAccountLabel) {
        const result = await this.dialogService.prompt({
            message: nls.localize('incorrectAccount', "Incorrect account detected"),
            detail: nls.localize('incorrectAccountDetail', "The chosen account, {0}, does not match the requested account, {1}.", chosenAccountLabel, requestedAccountLabel),
            type: Severity.Warning,
            cancelButton: true,
            buttons: [
                {
                    label: nls.localize('keep', 'Keep {0}', chosenAccountLabel),
                    run: () => chosenAccountLabel
                },
                {
                    label: nls.localize('loginWith', 'Login with {0}', requestedAccountLabel),
                    run: () => requestedAccountLabel
                }
            ],
        });
        if (!result.result) {
            throw new CancellationError();
        }
        return result.result === chosenAccountLabel;
    }
    async doGetSession(providerId, scopes, extensionId, extensionName, options) {
        const sessions = await this.authenticationService.getSessions(providerId, scopes, options.account, true);
        const provider = this.authenticationService.getProvider(providerId);
        // Error cases
        if (options.forceNewSession && options.createIfNone) {
            throw new Error('Invalid combination of options. Please remove one of the following: forceNewSession, createIfNone');
        }
        if (options.forceNewSession && options.silent) {
            throw new Error('Invalid combination of options. Please remove one of the following: forceNewSession, silent');
        }
        if (options.createIfNone && options.silent) {
            throw new Error('Invalid combination of options. Please remove one of the following: createIfNone, silent');
        }
        if (options.clearSessionPreference) {
            // Clearing the session preference is usually paired with createIfNone, so just remove the preference and
            // defer to the rest of the logic in this function to choose the session.
            this._removeAccountPreference(extensionId, providerId, scopes);
        }
        const matchingAccountPreferenceSession = 
        // If an account was passed in, that takes precedence over the account preference
        options.account
            // We only support one session per account per set of scopes so grab the first one here
            ? sessions[0]
            : this._getAccountPreference(extensionId, providerId, scopes, sessions);
        // Check if the sessions we have are valid
        if (!options.forceNewSession && sessions.length) {
            // If we have an existing session preference, use that. If not, we'll return any valid session at the end of this function.
            if (matchingAccountPreferenceSession && this.authenticationAccessService.isAccessAllowed(providerId, matchingAccountPreferenceSession.account.label, extensionId)) {
                return matchingAccountPreferenceSession;
            }
            // If we only have one account for a single auth provider, lets just check if it's allowed and return it if it is.
            if (!provider.supportsMultipleAccounts && this.authenticationAccessService.isAccessAllowed(providerId, sessions[0].account.label, extensionId)) {
                return sessions[0];
            }
        }
        // We may need to prompt because we don't have a valid session
        // modal flows
        if (options.createIfNone || options.forceNewSession) {
            let uiOptions;
            if (typeof options.forceNewSession === 'object') {
                uiOptions = options.forceNewSession;
            }
            else if (typeof options.createIfNone === 'object') {
                uiOptions = options.createIfNone;
            }
            // We only want to show the "recreating session" prompt if we are using forceNewSession & there are sessions
            // that we will be "forcing through".
            const recreatingSession = !!(options.forceNewSession && sessions.length);
            const isAllowed = await this.loginPrompt(provider, extensionName, recreatingSession, uiOptions);
            if (!isAllowed) {
                throw new Error('User did not consent to login.');
            }
            let session;
            if (sessions?.length && !options.forceNewSession) {
                session = provider.supportsMultipleAccounts && !options.account
                    ? await this.authenticationExtensionsService.selectSession(providerId, extensionId, extensionName, scopes, sessions)
                    : sessions[0];
            }
            else {
                const accountToCreate = options.account ?? matchingAccountPreferenceSession?.account;
                do {
                    session = await this.authenticationService.createSession(providerId, scopes, { activateImmediate: true, account: accountToCreate });
                } while (accountToCreate
                    && accountToCreate.label !== session.account.label
                    && !await this.continueWithIncorrectAccountPrompt(session.account.label, accountToCreate.label));
            }
            this.authenticationAccessService.updateAllowedExtensions(providerId, session.account.label, [{ id: extensionId, name: extensionName, allowed: true }]);
            this._updateAccountPreference(extensionId, providerId, session);
            return session;
        }
        // For the silent flows, if we have a session but we don't have a session preference, we'll return the first one that is valid.
        if (!matchingAccountPreferenceSession && !this.authenticationExtensionsService.getAccountPreference(extensionId, providerId)) {
            const validSession = sessions.find(session => this.authenticationAccessService.isAccessAllowed(providerId, session.account.label, extensionId));
            if (validSession) {
                return validSession;
            }
        }
        // passive flows (silent or default)
        if (!options.silent) {
            // If there is a potential session, but the extension doesn't have access to it, use the "grant access" flow,
            // otherwise request a new one.
            sessions.length
                ? this.authenticationExtensionsService.requestSessionAccess(providerId, extensionId, extensionName, scopes, sessions)
                : await this.authenticationExtensionsService.requestNewSession(providerId, scopes, extensionId, extensionName);
        }
        return undefined;
    }
    async $getSession(providerId, scopes, extensionId, extensionName, options) {
        this.sendClientIdUsageTelemetry(extensionId, providerId, scopes);
        const session = await this.doGetSession(providerId, scopes, extensionId, extensionName, options);
        if (session) {
            this.sendProviderUsageTelemetry(extensionId, providerId);
            this.authenticationUsageService.addAccountUsage(providerId, session.account.label, scopes, extensionId, extensionName);
        }
        return session;
    }
    async $getAccounts(providerId) {
        const accounts = await this.authenticationService.getAccounts(providerId);
        return accounts;
    }
    sendClientIdUsageTelemetry(extensionId, providerId, scopes) {
        const containsVSCodeClientIdScope = scopes.some(scope => scope.startsWith('VSCODE_CLIENT_ID:'));
        const key = `${extensionId}|${providerId}|${containsVSCodeClientIdScope}`;
        if (this._sentClientIdUsageEvents.has(key)) {
            return;
        }
        this._sentClientIdUsageEvents.add(key);
        if (containsVSCodeClientIdScope) {
            this.telemetryService.publicLog2('authentication.clientIdUsage', { extensionId });
        }
    }
    sendProviderUsageTelemetry(extensionId, providerId) {
        const key = `${extensionId}|${providerId}`;
        if (this._sentProviderUsageEvents.has(key)) {
            return;
        }
        this._sentProviderUsageEvents.add(key);
        this.telemetryService.publicLog2('authentication.providerUsage', { providerId, extensionId });
    }
    //#region Account Preferences
    // TODO@TylerLeonhardt: Update this after a few iterations to no longer fallback to the session preference
    _getAccountPreference(extensionId, providerId, scopes, sessions) {
        if (sessions.length === 0) {
            return undefined;
        }
        const accountNamePreference = this.authenticationExtensionsService.getAccountPreference(extensionId, providerId);
        if (accountNamePreference) {
            const session = sessions.find(session => session.account.label === accountNamePreference);
            return session;
        }
        const sessionIdPreference = this.authenticationExtensionsService.getSessionPreference(providerId, extensionId, scopes);
        if (sessionIdPreference) {
            const session = sessions.find(session => session.id === sessionIdPreference);
            if (session) {
                // Migrate the session preference to the account preference
                this.authenticationExtensionsService.updateAccountPreference(extensionId, providerId, session.account);
                return session;
            }
        }
        return undefined;
    }
    _updateAccountPreference(extensionId, providerId, session) {
        this.authenticationExtensionsService.updateAccountPreference(extensionId, providerId, session.account);
        this.authenticationExtensionsService.updateSessionPreference(providerId, extensionId, session);
    }
    _removeAccountPreference(extensionId, providerId, scopes) {
        this.authenticationExtensionsService.removeAccountPreference(extensionId, providerId);
        this.authenticationExtensionsService.removeSessionPreference(providerId, extensionId, scopes);
    }
};
MainThreadAuthentication = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAuthentication),
    __param(1, IAuthenticationService),
    __param(2, IAuthenticationExtensionsService),
    __param(3, IAuthenticationAccessService),
    __param(4, IAuthenticationUsageService),
    __param(5, IDialogService),
    __param(6, INotificationService),
    __param(7, IExtensionService),
    __param(8, ITelemetryService),
    __param(9, IOpenerService),
    __param(10, ILogService)
], MainThreadAuthentication);
export { MainThreadAuthentication };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQXV0aGVudGljYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQTBILHNCQUFzQixFQUFFLGdDQUFnQyxFQUFFLDZCQUE2QixJQUFJLG1DQUFtQyxFQUF1RSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3JZLE9BQU8sRUFBOEIsY0FBYyxFQUFFLFdBQVcsRUFBaUMsTUFBTSwrQkFBK0IsQ0FBQztBQUN2SSxPQUFPLEVBQUUsY0FBYyxFQUFpQixNQUFNLDZDQUE2QyxDQUFDO0FBQzVGLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBa0IsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDcEgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDbEgsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0sZ0VB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
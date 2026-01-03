"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureActiveDirectoryService = exports.REFRESH_NETWORK_FAILURE = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const uri_1 = require("./common/uri");
const async_1 = require("./common/async");
const cryptoUtils_1 = require("./cryptoUtils");
const authServer_1 = require("./node/authServer");
const buffer_1 = require("./node/buffer");
const fetch_1 = __importDefault(require("./node/fetch"));
const ms_rest_azure_env_1 = require("@azure/ms-rest-azure-env");
const redirectUrl = 'https://vscode.dev/redirect';
const defaultActiveDirectoryEndpointUrl = ms_rest_azure_env_1.Environment.AzureCloud.activeDirectoryEndpointUrl;
const DEFAULT_CLIENT_ID = 'aebc6443-996d-45c2-90f0-388ff96faa56';
const DEFAULT_TENANT = 'organizations';
const MSA_TID = '9188040d-6c67-4c5b-b112-36a304b66dad';
const MSA_PASSTHRU_TID = 'f8cdef31-a31e-4b4a-93e4-5f571e91255a';
exports.REFRESH_NETWORK_FAILURE = 'Network failure';
class AzureActiveDirectoryService {
    constructor(_logger, _context, _uriHandler, _tokenStorage, _telemetryReporter, _env) {
        this._logger = _logger;
        this._uriHandler = _uriHandler;
        this._tokenStorage = _tokenStorage;
        this._telemetryReporter = _telemetryReporter;
        this._env = _env;
        this._tokens = [];
        this._refreshTimeouts = new Map();
        this._sessionChangeEmitter = new vscode.EventEmitter();
        // Used to keep track of current requests when not using the local server approach.
        this._pendingNonces = new Map();
        this._codeExchangePromises = new Map();
        this._codeVerfifiers = new Map();
        // Used to keep track of tokens that we need to store but can't because we aren't the focused window.
        this._pendingTokensToStore = new Map();
        // Used to sequence requests to the same scope.
        this._sequencer = new async_1.SequencerByKey();
        _context.subscriptions.push(this._tokenStorage.onDidChangeInOtherWindow((e) => this.checkForUpdates(e)));
        _context.subscriptions.push(vscode.window.onDidChangeWindowState(async (e) => e.focused && await this.storePendingTokens()));
        // In the event that a window isn't focused for a long time, we should still try to store the tokens at some point.
        const timer = new async_1.IntervalTimer();
        timer.cancelAndSet(() => !vscode.window.state.focused && this.storePendingTokens(), 
        // 5 hours + random extra 0-30 seconds so that each window doesn't try to store at the same time
        (18000000) + Math.floor(Math.random() * 30000));
        _context.subscriptions.push(timer);
    }
    async initialize() {
        this._logger.trace('Reading sessions from secret storage...');
        const sessions = await this._tokenStorage.getAll(item => this.sessionMatchesEndpoint(item));
        this._logger.trace(`Got ${sessions.length} stored sessions`);
        const refreshes = sessions.map(async (session) => {
            this._logger.trace(`[${session.scope}] '${session.id}' Read stored session`);
            const scopes = session.scope.split(' ');
            const scopeData = {
                scopes,
                scopeStr: session.scope,
                // filter our special scopes
                scopesToSend: scopes.filter(s => !s.startsWith('VSCODE_')).join(' '),
                clientId: this.getClientId(scopes),
                tenant: this.getTenantId(scopes),
            };
            try {
                await this.refreshToken(session.refreshToken, scopeData, session.id);
            }
            catch (e) {
                // If we aren't connected to the internet, then wait and try to refresh again later.
                if (e.message === exports.REFRESH_NETWORK_FAILURE) {
                    this._tokens.push({
                        accessToken: undefined,
                        refreshToken: session.refreshToken,
                        account: {
                            ...session.account,
                            type: "unknown" /* MicrosoftAccountType.Unknown */
                        },
                        scope: session.scope,
                        sessionId: session.id
                    });
                }
                else {
                    vscode.window.showErrorMessage(vscode.l10n.t('You have been signed out because reading stored authentication information failed.'));
                    this._logger.error(e);
                    await this.removeSessionByIToken({
                        accessToken: undefined,
                        refreshToken: session.refreshToken,
                        account: {
                            ...session.account,
                            type: "unknown" /* MicrosoftAccountType.Unknown */
                        },
                        scope: session.scope,
                        sessionId: session.id
                    });
                }
            }
        });
        const result = await Promise.allSettled(refreshes);
        for (const res of result) {
            if (res.status === 'rejected') {
                this._logger.error(`Failed to initialize stored data: ${res.reason}`);
                this.clearSessions();
                break;
            }
        }
        for (const token of this._tokens) {
            /* __GDPR__
                "login" : {
                    "owner": "TylerLeonhardt",
                    "comment": "Used to determine the usage of the Microsoft Auth Provider.",
                    "scopes": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Used to determine what scope combinations are being requested." },
                    "accountType": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Used to determine what account types are being used." }
                }
            */
            this._telemetryReporter.sendTelemetryEvent('account', {
                // Get rid of guids from telemetry.
                scopes: JSON.stringify(token.scope.replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i, '{guid}').split(' ')),
                accountType: token.account.type
            });
        }
    }
    //#region session operations
    get onDidChangeSessions() {
        return this._sessionChangeEmitter.event;
    }
    getSessions(scopes, account) {
        if (!scopes) {
            this._logger.info('Getting sessions for all scopes...');
            const sessions = this._tokens
                .filter(token => !account?.label || token.account.label === account.label)
                .map(token => this.convertToSessionSync(token));
            this._logger.info(`Got ${sessions.length} sessions for all scopes${account ? ` for account '${account.label}'` : ''}...`);
            return Promise.resolve(sessions);
        }
        let modifiedScopes = [...scopes];
        if (!modifiedScopes.includes('openid')) {
            modifiedScopes.push('openid');
        }
        if (!modifiedScopes.includes('email')) {
            modifiedScopes.push('email');
        }
        if (!modifiedScopes.includes('profile')) {
            modifiedScopes.push('profile');
        }
        if (!modifiedScopes.includes('offline_access')) {
            modifiedScopes.push('offline_access');
        }
        modifiedScopes = modifiedScopes.sort();
        const modifiedScopesStr = modifiedScopes.join(' ');
        const clientId = this.getClientId(scopes);
        const scopeData = {
            clientId,
            originalScopes: scopes,
            scopes: modifiedScopes,
            scopeStr: modifiedScopesStr,
            // filter our special scopes
            scopesToSend: modifiedScopes.filter(s => !s.startsWith('VSCODE_')).join(' '),
            tenant: this.getTenantId(scopes),
        };
        this._logger.trace(`[${scopeData.scopeStr}] Queued getting sessions` + account ? ` for ${account?.label}` : '');
        return this._sequencer.queue(modifiedScopesStr, () => this.doGetSessions(scopeData, account));
    }
    async doGetSessions(scopeData, account) {
        this._logger.info(`[${scopeData.scopeStr}] Getting sessions` + account ? ` for ${account?.label}` : '');
        const matchingTokens = this._tokens
            .filter(token => token.scope === scopeData.scopeStr)
            .filter(token => !account?.label || token.account.label === account.label);
        // If we still don't have a matching token try to get a new token from an existing token by using
        // the refreshToken. This is documented here:
        // https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#refresh-the-access-token
        // "Refresh tokens are valid for all permissions that your client has already received consent for."
        if (!matchingTokens.length) {
            // Get a token with the correct client id and account.
            let token;
            for (const t of this._tokens) {
                // No refresh token, so we can't make a new token from this session
                if (!t.refreshToken) {
                    continue;
                }
                // Need to make sure the account matches if we were provided one
                if (account?.label && t.account.label !== account.label) {
                    continue;
                }
                // If the client id is the default client id, then check for the absence of the VSCODE_CLIENT_ID scope
                if (scopeData.clientId === DEFAULT_CLIENT_ID && !t.scope.includes('VSCODE_CLIENT_ID')) {
                    token = t;
                    break;
                }
                // If the client id is not the default client id, then check for the matching VSCODE_CLIENT_ID scope
                if (scopeData.clientId !== DEFAULT_CLIENT_ID && t.scope.includes(`VSCODE_CLIENT_ID:${scopeData.clientId}`)) {
                    token = t;
                    break;
                }
            }
            if (token) {
                this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Found a matching token with a different scopes '${token.scope}'. Attempting to get a new session using the existing session.`);
                try {
                    const itoken = await this.doRefreshToken(token.refreshToken, scopeData);
                    this._sessionChangeEmitter.fire({ added: [this.convertToSessionSync(itoken)], removed: [], changed: [] });
                    matchingTokens.push(itoken);
                }
                catch (err) {
                    this._logger.error(`[${scopeData.scopeStr}] Attempted to get a new session using the existing session with scopes '${token.scope}' but it failed due to: ${err.message ?? err}`);
                }
            }
        }
        this._logger.info(`[${scopeData.scopeStr}] Got ${matchingTokens.length} sessions`);
        const results = await Promise.allSettled(matchingTokens.map(token => this.convertToSession(token, scopeData)));
        return results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
    }
    createSession(scopes, account) {
        let modifiedScopes = [...scopes];
        if (!modifiedScopes.includes('openid')) {
            modifiedScopes.push('openid');
        }
        if (!modifiedScopes.includes('email')) {
            modifiedScopes.push('email');
        }
        if (!modifiedScopes.includes('profile')) {
            modifiedScopes.push('profile');
        }
        if (!modifiedScopes.includes('offline_access')) {
            modifiedScopes.push('offline_access');
        }
        modifiedScopes = modifiedScopes.sort();
        const scopeData = {
            originalScopes: scopes,
            scopes: modifiedScopes,
            scopeStr: modifiedScopes.join(' '),
            // filter our special scopes
            scopesToSend: modifiedScopes.filter(s => !s.startsWith('VSCODE_')).join(' '),
            clientId: this.getClientId(scopes),
            tenant: this.getTenantId(scopes),
        };
        this._logger.trace(`[${scopeData.scopeStr}] Queued creating session`);
        return this._sequencer.queue(scopeData.scopeStr, () => this.doCreateSession(scopeData, account));
    }
    async doCreateSession(scopeData, account) {
        this._logger.info(`[${scopeData.scopeStr}] Creating session` + account ? ` for ${account?.label}` : '');
        const runsRemote = vscode.env.remoteName !== undefined;
        const runsServerless = vscode.env.remoteName === undefined && vscode.env.uiKind === vscode.UIKind.Web;
        if (runsServerless && this._env.activeDirectoryEndpointUrl !== defaultActiveDirectoryEndpointUrl) {
            throw new Error('Sign in to non-public clouds is not supported on the web.');
        }
        return await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Signing in to your account...'), cancellable: true }, async (_progress, token) => {
            if (runsRemote || runsServerless) {
                return await this.createSessionWithoutLocalServer(scopeData, account?.label, token);
            }
            try {
                return await this.createSessionWithLocalServer(scopeData, account?.label, token);
            }
            catch (e) {
                this._logger.error(`[${scopeData.scopeStr}] Error creating session: ${e}`);
                // If the error was about starting the server, try directly hitting the login endpoint instead
                if (e.message === 'Error listening to server' || e.message === 'Closed' || e.message === 'Timeout waiting for port') {
                    return this.createSessionWithoutLocalServer(scopeData, account?.label, token);
                }
                throw e;
            }
        });
    }
    async createSessionWithLocalServer(scopeData, loginHint, token) {
        this._logger.trace(`[${scopeData.scopeStr}] Starting login flow with local server`);
        const codeVerifier = (0, cryptoUtils_1.generateCodeVerifier)();
        const codeChallenge = await (0, cryptoUtils_1.generateCodeChallenge)(codeVerifier);
        const qs = new URLSearchParams({
            response_type: 'code',
            response_mode: 'query',
            client_id: scopeData.clientId,
            redirect_uri: redirectUrl,
            scope: scopeData.scopesToSend,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
        });
        if (loginHint) {
            qs.set('login_hint', loginHint);
        }
        else {
            qs.set('prompt', 'select_account');
        }
        const loginUrl = new URL(`${scopeData.tenant}/oauth2/v2.0/authorize?${qs.toString()}`, this._env.activeDirectoryEndpointUrl).toString();
        const server = new authServer_1.LoopbackAuthServer(path.join(__dirname, '../media'), loginUrl);
        await server.start();
        let codeToExchange;
        try {
            vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:${server.port}/signin?nonce=${encodeURIComponent(server.nonce)}`));
            const { code } = await (0, async_1.raceCancellationAndTimeoutError)(server.waitForOAuthResponse(), token, 1000 * 60 * 5); // 5 minutes
            codeToExchange = code;
        }
        finally {
            setTimeout(() => {
                void server.stop();
            }, 5000);
        }
        const session = await this.exchangeCodeForSession(codeToExchange, codeVerifier, scopeData);
        this._logger.trace(`[${scopeData.scopeStr}] '${session.id}' Sending change event for added session`);
        this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
        this._logger.info(`[${scopeData.scopeStr}] '${session.id}' session successfully created!`);
        return session;
    }
    async createSessionWithoutLocalServer(scopeData, loginHint, token) {
        this._logger.trace(`[${scopeData.scopeStr}] Starting login flow without local server`);
        let callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://vscode.microsoft-authentication`));
        const nonce = (0, cryptoUtils_1.generateCodeVerifier)();
        const callbackQuery = new URLSearchParams(callbackUri.query);
        callbackQuery.set('nonce', encodeURIComponent(nonce));
        callbackUri = callbackUri.with({
            query: callbackQuery.toString()
        });
        const state = encodeURIComponent(callbackUri.toString(true));
        const codeVerifier = (0, cryptoUtils_1.generateCodeVerifier)();
        const codeChallenge = await (0, cryptoUtils_1.generateCodeChallenge)(codeVerifier);
        const signInUrl = new URL(`${scopeData.tenant}/oauth2/v2.0/authorize`, this._env.activeDirectoryEndpointUrl);
        const qs = new URLSearchParams({
            response_type: 'code',
            client_id: encodeURIComponent(scopeData.clientId),
            response_mode: 'query',
            redirect_uri: redirectUrl,
            state,
            scope: scopeData.scopesToSend,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
        });
        if (loginHint) {
            qs.append('login_hint', loginHint);
        }
        else {
            qs.append('prompt', 'select_account');
        }
        signInUrl.search = qs.toString();
        const uri = vscode.Uri.parse(signInUrl.toString());
        vscode.env.openExternal(uri);
        const existingNonces = this._pendingNonces.get(scopeData.scopeStr) || [];
        this._pendingNonces.set(scopeData.scopeStr, [...existingNonces, nonce]);
        // Register a single listener for the URI callback, in case the user starts the login process multiple times
        // before completing it.
        let existingPromise = this._codeExchangePromises.get(scopeData.scopeStr);
        let inputBox;
        if (!existingPromise) {
            if ((0, uri_1.isSupportedEnvironment)(callbackUri)) {
                existingPromise = this.handleCodeResponse(scopeData);
            }
            else {
                inputBox = vscode.window.createInputBox();
                existingPromise = this.handleCodeInputBox(inputBox, codeVerifier, scopeData);
            }
            this._codeExchangePromises.set(scopeData.scopeStr, existingPromise);
        }
        this._codeVerfifiers.set(nonce, codeVerifier);
        return await (0, async_1.raceCancellationAndTimeoutError)(existingPromise, token, 1000 * 60 * 5) // 5 minutes
            .finally(() => {
            this._pendingNonces.delete(scopeData.scopeStr);
            this._codeExchangePromises.delete(scopeData.scopeStr);
            this._codeVerfifiers.delete(nonce);
            inputBox?.dispose();
        });
    }
    async removeSessionById(sessionId, writeToDisk = true) {
        const tokenIndex = this._tokens.findIndex(token => token.sessionId === sessionId);
        if (tokenIndex === -1) {
            this._logger.warn(`'${sessionId}' Session not found to remove`);
            return Promise.resolve(undefined);
        }
        const token = this._tokens.splice(tokenIndex, 1)[0];
        this._logger.trace(`[${token.scope}] '${sessionId}' Queued removing session`);
        return this._sequencer.queue(token.scope, () => this.removeSessionByIToken(token, writeToDisk));
    }
    async clearSessions() {
        this._logger.trace('Logging out of all sessions');
        this._tokens = [];
        await this._tokenStorage.deleteAll(item => this.sessionMatchesEndpoint(item));
        this._refreshTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
        this._refreshTimeouts.clear();
        this._logger.trace('All sessions logged out');
    }
    async removeSessionByIToken(token, writeToDisk = true) {
        this._logger.info(`[${token.scope}] '${token.sessionId}' Logging out of session`);
        this.removeSessionTimeout(token.sessionId);
        if (writeToDisk) {
            await this._tokenStorage.delete(token.sessionId);
        }
        const tokenIndex = this._tokens.findIndex(t => t.sessionId === token.sessionId);
        if (tokenIndex !== -1) {
            this._tokens.splice(tokenIndex, 1);
        }
        const session = this.convertToSessionSync(token);
        this._logger.trace(`[${token.scope}] '${token.sessionId}' Sending change event for session that was removed`);
        this._sessionChangeEmitter.fire({ added: [], removed: [session], changed: [] });
        this._logger.info(`[${token.scope}] '${token.sessionId}' Logged out of session successfully!`);
        return session;
    }
    //#endregion
    //#region timeout
    setSessionTimeout(sessionId, refreshToken, scopeData, timeout) {
        this._logger.trace(`[${scopeData.scopeStr}] '${sessionId}' Setting refresh timeout for ${timeout} milliseconds`);
        this.removeSessionTimeout(sessionId);
        this._refreshTimeouts.set(sessionId, setTimeout(async () => {
            try {
                const refreshedToken = await this.refreshToken(refreshToken, scopeData, sessionId);
                this._logger.trace(`[${scopeData.scopeStr}] '${sessionId}' Sending change event for session that was refreshed`);
                this._sessionChangeEmitter.fire({ added: [], removed: [], changed: [this.convertToSessionSync(refreshedToken)] });
                this._logger.trace(`[${scopeData.scopeStr}] '${sessionId}' refresh timeout complete`);
            }
            catch (e) {
                if (e.message !== exports.REFRESH_NETWORK_FAILURE) {
                    vscode.window.showErrorMessage(vscode.l10n.t('You have been signed out because reading stored authentication information failed.'));
                    await this.removeSessionById(sessionId);
                }
            }
        }, timeout));
    }
    removeSessionTimeout(sessionId) {
        const timeout = this._refreshTimeouts.get(sessionId);
        if (timeout) {
            clearTimeout(timeout);
            this._refreshTimeouts.delete(sessionId);
        }
    }
    //#endregion
    //#region convert operations
    convertToTokenSync(json, scopeData, existingId) {
        let claims = undefined;
        this._logger.trace(`[${scopeData.scopeStr}] '${existingId ?? 'new'}' Attempting to parse token response.`);
        try {
            if (json.id_token) {
                claims = JSON.parse((0, buffer_1.base64Decode)(json.id_token.split('.')[1]));
            }
            else {
                this._logger.warn(`[${scopeData.scopeStr}] '${existingId ?? 'new'}' Attempting to parse access_token instead since no id_token was included in the response.`);
                claims = JSON.parse((0, buffer_1.base64Decode)(json.access_token.split('.')[1]));
            }
        }
        catch (e) {
            throw e;
        }
        const id = `${claims.tid}/${(claims.oid ?? (claims.altsecid ?? '' + claims.ipd ?? ''))}`;
        const sessionId = existingId || `${id}/${(0, cryptoUtils_1.randomUUID)()}`;
        this._logger.trace(`[${scopeData.scopeStr}] '${sessionId}' Token response parsed successfully.`);
        return {
            expiresIn: json.expires_in,
            expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
            accessToken: json.access_token,
            idToken: json.id_token,
            refreshToken: json.refresh_token,
            scope: scopeData.scopeStr,
            sessionId,
            account: {
                label: claims.preferred_username ?? claims.email ?? claims.unique_name ?? 'user@example.com',
                id,
                type: claims.tid === MSA_TID || claims.tid === MSA_PASSTHRU_TID ? "msa" /* MicrosoftAccountType.MSA */ : "aad" /* MicrosoftAccountType.AAD */
            }
        };
    }
    /**
     * Return a session object without checking for expiry and potentially refreshing.
     * @param token The token information.
     */
    convertToSessionSync(token) {
        return {
            id: token.sessionId,
            accessToken: token.accessToken,
            idToken: token.idToken,
            account: token.account,
            scopes: token.scope.split(' ')
        };
    }
    async convertToSession(token, scopeData) {
        if (token.accessToken && (!token.expiresAt || token.expiresAt > Date.now())) {
            this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Token available from cache${token.expiresAt ? `, expires in ${token.expiresAt - Date.now()} milliseconds` : ''}.`);
            return {
                id: token.sessionId,
                accessToken: token.accessToken,
                idToken: token.idToken,
                account: token.account,
                scopes: scopeData.originalScopes ?? scopeData.scopes
            };
        }
        try {
            this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Token expired or unavailable, trying refresh`);
            const refreshedToken = await this.refreshToken(token.refreshToken, scopeData, token.sessionId);
            if (refreshedToken.accessToken) {
                return {
                    id: token.sessionId,
                    accessToken: refreshedToken.accessToken,
                    idToken: refreshedToken.idToken,
                    account: token.account,
                    // We always prefer the original scopes requested since that array is used as a key in the AuthService
                    scopes: scopeData.originalScopes ?? scopeData.scopes
                };
            }
            else {
                throw new Error();
            }
        }
        catch (e) {
            throw new Error('Unavailable due to network problems');
        }
    }
    //#endregion
    //#region refresh logic
    refreshToken(refreshToken, scopeData, sessionId) {
        this._logger.trace(`[${scopeData.scopeStr}] '${sessionId ?? 'new'}' Queued refreshing token`);
        return this._sequencer.queue(scopeData.scopeStr, () => this.doRefreshToken(refreshToken, scopeData, sessionId));
    }
    async doRefreshToken(refreshToken, scopeData, sessionId) {
        this._logger.trace(`[${scopeData.scopeStr}] '${sessionId ?? 'new'}' Refreshing token`);
        const postData = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: scopeData.clientId,
            grant_type: 'refresh_token',
            scope: scopeData.scopesToSend
        }).toString();
        try {
            const json = await this.fetchTokenResponse(postData, scopeData);
            const token = this.convertToTokenSync(json, scopeData, sessionId);
            if (token.expiresIn) {
                this.setSessionTimeout(token.sessionId, token.refreshToken, scopeData, token.expiresIn * AzureActiveDirectoryService.REFRESH_TIMEOUT_MODIFIER);
            }
            this.setToken(token, scopeData);
            this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Token refresh success`);
            return token;
        }
        catch (e) {
            if (e.message === exports.REFRESH_NETWORK_FAILURE) {
                // We were unable to refresh because of a network failure (i.e. the user lost internet access).
                // so set up a timeout to try again later. We only do this if we have a session id to reference later.
                if (sessionId) {
                    this.setSessionTimeout(sessionId, refreshToken, scopeData, AzureActiveDirectoryService.POLLING_CONSTANT);
                }
                throw e;
            }
            this._logger.error(`[${scopeData.scopeStr}] '${sessionId ?? 'new'}' Refreshing token failed: ${e.message}`);
            throw e;
        }
    }
    //#endregion
    //#region scope parsers
    getClientId(scopes) {
        return scopes.reduce((prev, current) => {
            if (current.startsWith('VSCODE_CLIENT_ID:')) {
                return current.split('VSCODE_CLIENT_ID:')[1];
            }
            return prev;
        }, undefined) ?? DEFAULT_CLIENT_ID;
    }
    getTenantId(scopes) {
        return scopes.reduce((prev, current) => {
            if (current.startsWith('VSCODE_TENANT:')) {
                return current.split('VSCODE_TENANT:')[1];
            }
            return prev;
        }, undefined) ?? DEFAULT_TENANT;
    }
    //#endregion
    //#region oauth flow
    async handleCodeResponse(scopeData) {
        let uriEventListener;
        return new Promise((resolve, reject) => {
            uriEventListener = this._uriHandler.event(async (uri) => {
                try {
                    const query = new URLSearchParams(uri.query);
                    let code = query.get('code');
                    let nonce = query.get('nonce');
                    if (Array.isArray(code)) {
                        code = code[0];
                    }
                    if (!code) {
                        throw new Error('No code included in query');
                    }
                    if (Array.isArray(nonce)) {
                        nonce = nonce[0];
                    }
                    if (!nonce) {
                        throw new Error('No nonce included in query');
                    }
                    const acceptedStates = this._pendingNonces.get(scopeData.scopeStr) || [];
                    // Workaround double encoding issues of state in web
                    if (!acceptedStates.includes(nonce) && !acceptedStates.includes(decodeURIComponent(nonce))) {
                        throw new Error('Nonce does not match.');
                    }
                    const verifier = this._codeVerfifiers.get(nonce) ?? this._codeVerfifiers.get(decodeURIComponent(nonce));
                    if (!verifier) {
                        throw new Error('No available code verifier');
                    }
                    const session = await this.exchangeCodeForSession(code, verifier, scopeData);
                    this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
                    this._logger.info(`[${scopeData.scopeStr}] '${session.id}' session successfully created!`);
                    resolve(session);
                }
                catch (err) {
                    reject(err);
                }
            });
        }).then(result => {
            uriEventListener.dispose();
            return result;
        }).catch(err => {
            uriEventListener.dispose();
            throw err;
        });
    }
    async handleCodeInputBox(inputBox, verifier, scopeData) {
        this._logger.trace(`[${scopeData.scopeStr}] Starting login flow with input box`);
        inputBox.ignoreFocusOut = true;
        inputBox.title = vscode.l10n.t('Microsoft Authentication');
        inputBox.prompt = vscode.l10n.t('Provide the authorization code to complete the sign in flow.');
        inputBox.placeholder = vscode.l10n.t('Paste authorization code here...');
        return new Promise((resolve, reject) => {
            inputBox.show();
            inputBox.onDidAccept(async () => {
                const code = inputBox.value;
                if (code) {
                    inputBox.dispose();
                    const session = await this.exchangeCodeForSession(code, verifier, scopeData);
                    this._logger.trace(`[${scopeData.scopeStr}] '${session.id}' sending session changed event because session was added.`);
                    this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
                    this._logger.trace(`[${scopeData.scopeStr}] '${session.id}' session successfully created!`);
                    resolve(session);
                }
            });
            inputBox.onDidHide(() => {
                if (!inputBox.value) {
                    inputBox.dispose();
                    reject('Cancelled');
                }
            });
        });
    }
    async exchangeCodeForSession(code, codeVerifier, scopeData) {
        this._logger.trace(`[${scopeData.scopeStr}] Exchanging login code for session`);
        let token;
        try {
            const postData = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: scopeData.clientId,
                scope: scopeData.scopesToSend,
                code_verifier: codeVerifier,
                redirect_uri: redirectUrl
            }).toString();
            const json = await this.fetchTokenResponse(postData, scopeData);
            this._logger.trace(`[${scopeData.scopeStr}] Exchanging code for token succeeded!`);
            token = this.convertToTokenSync(json, scopeData);
        }
        catch (e) {
            this._logger.error(`[${scopeData.scopeStr}] Error exchanging code for token: ${e}`);
            throw e;
        }
        if (token.expiresIn) {
            this.setSessionTimeout(token.sessionId, token.refreshToken, scopeData, token.expiresIn * AzureActiveDirectoryService.REFRESH_TIMEOUT_MODIFIER);
        }
        this.setToken(token, scopeData);
        this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Exchanging login code for session succeeded!`);
        return await this.convertToSession(token, scopeData);
    }
    async fetchTokenResponse(postData, scopeData) {
        let endpointUrl;
        if (this._env.activeDirectoryEndpointUrl !== defaultActiveDirectoryEndpointUrl) {
            // If this is for sovereign clouds, don't try using the proxy endpoint, which supports only public cloud
            endpointUrl = this._env.activeDirectoryEndpointUrl;
        }
        else {
            const proxyEndpoints = await vscode.commands.executeCommand('workbench.getCodeExchangeProxyEndpoints');
            endpointUrl = proxyEndpoints?.microsoft || this._env.activeDirectoryEndpointUrl;
        }
        const endpoint = new URL(`${scopeData.tenant}/oauth2/v2.0/token`, endpointUrl);
        let attempts = 0;
        while (attempts <= 3) {
            attempts++;
            let result;
            let errorMessage;
            try {
                result = await (0, fetch_1.default)(endpoint.toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: postData
                });
            }
            catch (e) {
                errorMessage = e.message ?? e;
            }
            if (!result || result.status > 499) {
                if (attempts > 3) {
                    this._logger.error(`[${scopeData.scopeStr}] Fetching token failed: ${result ? await result.text() : errorMessage}`);
                    break;
                }
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 5 * attempts * attempts * 1000));
                continue;
            }
            else if (!result.ok) {
                // For 4XX errors, the user may actually have an expired token or have changed
                // their password recently which is throwing a 4XX. For this, we throw an error
                // so that the user can be prompted to sign in again.
                throw new Error(await result.text());
            }
            return await result.json();
        }
        throw new Error(exports.REFRESH_NETWORK_FAILURE);
    }
    //#endregion
    //#region storage operations
    setToken(token, scopeData) {
        this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Setting token`);
        const existingTokenIndex = this._tokens.findIndex(t => t.sessionId === token.sessionId);
        if (existingTokenIndex > -1) {
            this._tokens.splice(existingTokenIndex, 1, token);
        }
        else {
            this._tokens.push(token);
        }
        // Don't await because setting the token is only useful for any new windows that open.
        void this.storeToken(token, scopeData);
    }
    async storeToken(token, scopeData) {
        if (!vscode.window.state.focused) {
            if (this._pendingTokensToStore.has(token.sessionId)) {
                this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Window is not focused, replacing token to be stored`);
            }
            else {
                this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Window is not focused, pending storage of token`);
            }
            this._pendingTokensToStore.set(token.sessionId, token);
            return;
        }
        await this._tokenStorage.store(token.sessionId, {
            id: token.sessionId,
            refreshToken: token.refreshToken,
            scope: token.scope,
            account: token.account,
            endpoint: this._env.activeDirectoryEndpointUrl,
        });
        this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Stored token`);
    }
    async storePendingTokens() {
        if (this._pendingTokensToStore.size === 0) {
            this._logger.trace('No pending tokens to store');
            return;
        }
        const tokens = [...this._pendingTokensToStore.values()];
        this._pendingTokensToStore.clear();
        this._logger.trace(`Storing ${tokens.length} pending tokens...`);
        await Promise.allSettled(tokens.map(async (token) => {
            this._logger.trace(`[${token.scope}] '${token.sessionId}' Storing pending token`);
            await this._tokenStorage.store(token.sessionId, {
                id: token.sessionId,
                refreshToken: token.refreshToken,
                scope: token.scope,
                account: token.account,
                endpoint: this._env.activeDirectoryEndpointUrl,
            });
            this._logger.trace(`[${token.scope}] '${token.sessionId}' Stored pending token`);
        }));
        this._logger.trace('Done storing pending tokens');
    }
    async checkForUpdates(e) {
        for (const key of e.added) {
            const session = await this._tokenStorage.get(key);
            if (!session) {
                this._logger.error('session not found that was apparently just added');
                continue;
            }
            if (!this.sessionMatchesEndpoint(session)) {
                // If the session wasn't made for this login endpoint, ignore this update
                continue;
            }
            const matchesExisting = this._tokens.some(token => token.scope === session.scope && token.sessionId === session.id);
            if (!matchesExisting && session.refreshToken) {
                try {
                    const scopes = session.scope.split(' ');
                    const scopeData = {
                        scopes,
                        scopeStr: session.scope,
                        // filter our special scopes
                        scopesToSend: scopes.filter(s => !s.startsWith('VSCODE_')).join(' '),
                        clientId: this.getClientId(scopes),
                        tenant: this.getTenantId(scopes),
                    };
                    this._logger.trace(`[${scopeData.scopeStr}] '${session.id}' Session added in another window`);
                    const token = await this.refreshToken(session.refreshToken, scopeData, session.id);
                    this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Sending change event for session that was added`);
                    this._sessionChangeEmitter.fire({ added: [this.convertToSessionSync(token)], removed: [], changed: [] });
                    this._logger.trace(`[${scopeData.scopeStr}] '${token.sessionId}' Session added in another window added here`);
                    continue;
                }
                catch (e) {
                    // Network failures will automatically retry on next poll.
                    if (e.message !== exports.REFRESH_NETWORK_FAILURE) {
                        vscode.window.showErrorMessage(vscode.l10n.t('You have been signed out because reading stored authentication information failed.'));
                        await this.removeSessionById(session.id);
                    }
                    continue;
                }
            }
        }
        for (const { value } of e.removed) {
            this._logger.trace(`[${value.scope}] '${value.id}' Session removed in another window`);
            if (!this.sessionMatchesEndpoint(value)) {
                // If the session wasn't made for this login endpoint, ignore this update
                this._logger.trace(`[${value.scope}] '${value.id}' Session doesn't match endpoint. Skipping...`);
                continue;
            }
            await this.removeSessionById(value.id, false);
            this._logger.trace(`[${value.scope}] '${value.id}' Session removed in another window removed here`);
        }
        // NOTE: We don't need to handle changed sessions because all that really would give us is a new refresh token
        // because access tokens are not stored in Secret Storage due to their short lifespan. This new refresh token
        // is not useful in this window because we really only care about the lifetime of the _access_ token which we
        // are already managing (see usages of `setSessionTimeout`).
        // However, in order to minimize the amount of times we store tokens, if a token was stored via another window,
        // we cancel any pending token storage operations.
        for (const sessionId of e.updated) {
            if (this._pendingTokensToStore.delete(sessionId)) {
                this._logger.trace(`'${sessionId}' Cancelled pending token storage because token was updated in another window`);
            }
        }
    }
    sessionMatchesEndpoint(session) {
        // For older sessions with no endpoint set, it can be assumed to be the default endpoint
        session.endpoint || (session.endpoint = defaultActiveDirectoryEndpointUrl);
        return session.endpoint === this._env.activeDirectoryEndpointUrl;
    }
}
exports.AzureActiveDirectoryService = AzureActiveDirectoryService;
// For details on why this is set to 2/3... see https://github.com/microsoft/vscode/issues/133201#issuecomment-966668197
AzureActiveDirectoryService.REFRESH_TIMEOUT_MODIFIER = 1000 * 2 / 3;
AzureActiveDirectoryService.POLLING_CONSTANT = 1000 * 60 * 30;
//# sourceMappingURL=AADHelper.js.map
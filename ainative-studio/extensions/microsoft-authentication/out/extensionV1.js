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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ms_rest_azure_env_1 = require("@azure/ms-rest-azure-env");
const AADHelper_1 = require("./AADHelper");
const betterSecretStorage_1 = require("./betterSecretStorage");
const UriEventHandler_1 = require("./UriEventHandler");
const logger_1 = __importDefault(require("./logger"));
async function initMicrosoftSovereignCloudAuthProvider(context, telemetryReporter, uriHandler, tokenStorage) {
    const environment = vscode.workspace.getConfiguration('microsoft-sovereign-cloud').get('environment');
    let authProviderName;
    if (!environment) {
        return undefined;
    }
    if (environment === 'custom') {
        const customEnv = vscode.workspace.getConfiguration('microsoft-sovereign-cloud').get('customEnvironment');
        if (!customEnv) {
            const res = await vscode.window.showErrorMessage(vscode.l10n.t('You must also specify a custom environment in order to use the custom environment auth provider.'), vscode.l10n.t('Open settings'));
            if (res) {
                await vscode.commands.executeCommand('workbench.action.openSettingsJson', 'microsoft-sovereign-cloud.customEnvironment');
            }
            return undefined;
        }
        try {
            ms_rest_azure_env_1.Environment.add(customEnv);
        }
        catch (e) {
            const res = await vscode.window.showErrorMessage(vscode.l10n.t('Error validating custom environment setting: {0}', e.message), vscode.l10n.t('Open settings'));
            if (res) {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'microsoft-sovereign-cloud.customEnvironment');
            }
            return undefined;
        }
        authProviderName = customEnv.name;
    }
    else {
        authProviderName = environment;
    }
    const env = ms_rest_azure_env_1.Environment.get(authProviderName);
    if (!env) {
        const res = await vscode.window.showErrorMessage(vscode.l10n.t('The environment `{0}` is not a valid environment.', authProviderName), vscode.l10n.t('Open settings'));
        return undefined;
    }
    const aadService = new AADHelper_1.AzureActiveDirectoryService(vscode.window.createOutputChannel(vscode.l10n.t('Microsoft Sovereign Cloud Authentication'), { log: true }), context, uriHandler, tokenStorage, telemetryReporter, env);
    await aadService.initialize();
    const disposable = vscode.authentication.registerAuthenticationProvider('microsoft-sovereign-cloud', authProviderName, {
        onDidChangeSessions: aadService.onDidChangeSessions,
        getSessions: (scopes) => aadService.getSessions(scopes),
        createSession: async (scopes) => {
            try {
                /* __GDPR__
                    "login" : {
                        "owner": "TylerLeonhardt",
                        "comment": "Used to determine the usage of the Microsoft Sovereign Cloud Auth Provider.",
                        "scopes": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Used to determine what scope combinations are being requested." }
                    }
                */
                telemetryReporter.sendTelemetryEvent('loginMicrosoftSovereignCloud', {
                    // Get rid of guids from telemetry.
                    scopes: JSON.stringify(scopes.map(s => s.replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i, '{guid}'))),
                });
                return await aadService.createSession(scopes);
            }
            catch (e) {
                /* __GDPR__
                    "loginFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users run into issues with the login flow." }
                */
                telemetryReporter.sendTelemetryEvent('loginMicrosoftSovereignCloudFailed');
                throw e;
            }
        },
        removeSession: async (id) => {
            try {
                /* __GDPR__
                    "logout" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users log out." }
                */
                telemetryReporter.sendTelemetryEvent('logoutMicrosoftSovereignCloud');
                await aadService.removeSessionById(id);
            }
            catch (e) {
                /* __GDPR__
                    "logoutFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often fail to log out." }
                */
                telemetryReporter.sendTelemetryEvent('logoutMicrosoftSovereignCloudFailed');
            }
        }
    }, { supportsMultipleAccounts: true });
    context.subscriptions.push(disposable);
    return disposable;
}
async function activate(context, telemetryReporter) {
    // If we ever activate the old flow, then mark that we will need to migrate when the user upgrades to v2.
    // TODO: MSAL Migration. Remove this when we remove the old flow.
    context.globalState.update('msalMigration', false);
    const uriHandler = new UriEventHandler_1.UriEventHandler();
    context.subscriptions.push(uriHandler);
    const betterSecretStorage = new betterSecretStorage_1.BetterTokenStorage('microsoft.login.keylist', context);
    const loginService = new AADHelper_1.AzureActiveDirectoryService(logger_1.default, context, uriHandler, betterSecretStorage, telemetryReporter, ms_rest_azure_env_1.Environment.AzureCloud);
    await loginService.initialize();
    context.subscriptions.push(vscode.authentication.registerAuthenticationProvider('microsoft', 'Microsoft', {
        onDidChangeSessions: loginService.onDidChangeSessions,
        getSessions: (scopes, options) => loginService.getSessions(scopes, options?.account),
        createSession: async (scopes, options) => {
            try {
                /* __GDPR__
                    "login" : {
                        "owner": "TylerLeonhardt",
                        "comment": "Used to determine the usage of the Microsoft Auth Provider.",
                        "scopes": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Used to determine what scope combinations are being requested." }
                    }
                */
                telemetryReporter.sendTelemetryEvent('login', {
                    // Get rid of guids from telemetry.
                    scopes: JSON.stringify(scopes.map(s => s.replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i, '{guid}'))),
                });
                return await loginService.createSession(scopes, options?.account);
            }
            catch (e) {
                /* __GDPR__
                    "loginFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users run into issues with the login flow." }
                */
                telemetryReporter.sendTelemetryEvent('loginFailed');
                throw e;
            }
        },
        removeSession: async (id) => {
            try {
                /* __GDPR__
                    "logout" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users log out." }
                */
                telemetryReporter.sendTelemetryEvent('logout');
                await loginService.removeSessionById(id);
            }
            catch (e) {
                /* __GDPR__
                    "logoutFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often fail to log out." }
                */
                telemetryReporter.sendTelemetryEvent('logoutFailed');
            }
        }
    }, { supportsMultipleAccounts: true }));
    let microsoftSovereignCloudAuthProviderDisposable = await initMicrosoftSovereignCloudAuthProvider(context, telemetryReporter, uriHandler, betterSecretStorage);
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('microsoft-sovereign-cloud')) {
            microsoftSovereignCloudAuthProviderDisposable?.dispose();
            microsoftSovereignCloudAuthProviderDisposable = await initMicrosoftSovereignCloudAuthProvider(context, telemetryReporter, uriHandler, betterSecretStorage);
        }
    }));
    return;
}
// this method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extensionV1.js.map
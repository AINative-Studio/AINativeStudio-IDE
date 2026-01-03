"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftSovereignCloudAuthenticationTelemetryReporter = exports.MicrosoftAuthenticationTelemetryReporter = void 0;
const extension_telemetry_1 = __importDefault(require("@vscode/extension-telemetry"));
class MicrosoftAuthenticationTelemetryReporter {
    constructor(aiKey) {
        this.sharedProperties = {};
        this._telemetryReporter = new extension_telemetry_1.default(aiKey);
    }
    get telemetryReporter() {
        return this._telemetryReporter;
    }
    setSharedProperty(name, value) {
        this.sharedProperties[name] = value;
    }
    postEvent(eventName, props) {
        const eventProperties = { ...this.sharedProperties, ...Object.fromEntries(props) };
        this._telemetryReporter.sendTelemetryEvent(eventName, eventProperties);
    }
    sendLoginEvent(scopes) {
        /* __GDPR__
            "login" : {
                "owner": "TylerLeonhardt",
                "comment": "Used to determine the usage of the Microsoft Auth Provider.",
                "scopes": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Used to determine what scope combinations are being requested." }
            }
        */
        this._telemetryReporter.sendTelemetryEvent('login', {
            // Get rid of guids from telemetry.
            scopes: JSON.stringify(this._scrubGuids(scopes)),
        });
    }
    sendLoginFailedEvent() {
        /* __GDPR__
            "loginFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users run into issues with the login flow." }
        */
        this._telemetryReporter.sendTelemetryEvent('loginFailed');
    }
    sendLogoutEvent() {
        /* __GDPR__
            "logout" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users log out." }
        */
        this._telemetryReporter.sendTelemetryEvent('logout');
    }
    sendLogoutFailedEvent() {
        /* __GDPR__
            "logoutFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often fail to log out." }
        */
        this._telemetryReporter.sendTelemetryEvent('logoutFailed');
    }
    /**
     * Sends an event for an account type available at startup.
     * @param scopes The scopes for the session
     * @param accountType The account type for the session
     * @todo Remove the scopes since we really don't care about them.
     */
    sendAccountEvent(scopes, accountType) {
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
            scopes: JSON.stringify(this._scrubGuids(scopes)),
            accountType
        });
    }
    _scrubGuids(scopes) {
        return scopes.map(s => s.replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i, '{guid}'));
    }
}
exports.MicrosoftAuthenticationTelemetryReporter = MicrosoftAuthenticationTelemetryReporter;
class MicrosoftSovereignCloudAuthenticationTelemetryReporter extends MicrosoftAuthenticationTelemetryReporter {
    sendLoginEvent(scopes) {
        /* __GDPR__
            "loginMicrosoftSovereignCloud" : {
                "owner": "TylerLeonhardt",
                "comment": "Used to determine the usage of the Microsoft Auth Provider.",
                "scopes": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Used to determine what scope combinations are being requested." }
            }
        */
        this._telemetryReporter.sendTelemetryEvent('loginMicrosoftSovereignCloud', {
            // Get rid of guids from telemetry.
            scopes: JSON.stringify(this._scrubGuids(scopes)),
        });
    }
    sendLoginFailedEvent() {
        /* __GDPR__
            "loginMicrosoftSovereignCloudFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users run into issues with the login flow." }
        */
        this._telemetryReporter.sendTelemetryEvent('loginMicrosoftSovereignCloudFailed');
    }
    sendLogoutEvent() {
        /* __GDPR__
            "logoutMicrosoftSovereignCloud" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users log out." }
        */
        this._telemetryReporter.sendTelemetryEvent('logoutMicrosoftSovereignCloud');
    }
    sendLogoutFailedEvent() {
        /* __GDPR__
            "logoutMicrosoftSovereignCloudFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often fail to log out." }
        */
        this._telemetryReporter.sendTelemetryEvent('logoutMicrosoftSovereignCloudFailed');
    }
}
exports.MicrosoftSovereignCloudAuthenticationTelemetryReporter = MicrosoftSovereignCloudAuthenticationTelemetryReporter;
//# sourceMappingURL=telemetryReporter.js.map
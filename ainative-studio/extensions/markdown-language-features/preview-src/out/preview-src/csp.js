"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CspAlerter = void 0;
const strings_1 = require("./strings");
/**
 * Shows an alert when there is a content security policy violation.
 */
class CspAlerter {
    constructor(_settingsManager) {
        this._settingsManager = _settingsManager;
        this._didShow = false;
        this._didHaveCspWarning = false;
        document.addEventListener('securitypolicyviolation', () => {
            this._onCspWarning();
        });
        window.addEventListener('message', (event) => {
            if (event && event.data && event.data.name === 'vscode-did-block-svg') {
                this._onCspWarning();
            }
        });
    }
    setPoster(poster) {
        this._messaging = poster;
        if (this._didHaveCspWarning) {
            this._showCspWarning();
        }
    }
    _onCspWarning() {
        this._didHaveCspWarning = true;
        this._showCspWarning();
    }
    _showCspWarning() {
        const strings = (0, strings_1.getStrings)();
        const settings = this._settingsManager.settings;
        if (this._didShow || settings.disableSecurityWarnings || !this._messaging) {
            return;
        }
        this._didShow = true;
        const notification = document.createElement('a');
        notification.innerText = strings.cspAlertMessageText;
        notification.setAttribute('id', 'code-csp-warning');
        notification.setAttribute('title', strings.cspAlertMessageTitle);
        notification.setAttribute('role', 'button');
        notification.setAttribute('aria-label', strings.cspAlertMessageLabel);
        notification.onclick = () => {
            this._messaging.postMessage('showPreviewSecuritySelector', { source: settings.source });
        };
        document.body.appendChild(notification);
    }
}
exports.CspAlerter = CspAlerter;
//# sourceMappingURL=csp.js.map
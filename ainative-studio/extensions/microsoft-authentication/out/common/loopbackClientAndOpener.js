"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.UriHandlerLoopbackClient = void 0;
const vscode_1 = require("vscode");
const async_1 = require("./async");
const env_1 = require("./env");
class UriHandlerLoopbackClient {
    constructor(_uriHandler, _redirectUri, _logger) {
        this._uriHandler = _uriHandler;
        this._redirectUri = _redirectUri;
        this._logger = _logger;
    }
    async listenForAuthCode() {
        await this._responseDeferred?.cancel();
        this._responseDeferred = new async_1.DeferredPromise();
        const result = await this._responseDeferred.p;
        this._responseDeferred = undefined;
        if (result) {
            return result;
        }
        throw new Error('No valid response received for authorization code.');
    }
    getRedirectUri() {
        // We always return the constant redirect URL because
        // it will handle redirecting back to the extension
        return this._redirectUri;
    }
    closeServer() {
        // No-op
    }
    async openBrowser(url) {
        const callbackUri = await vscode_1.env.asExternalUri(vscode_1.Uri.parse(`${vscode_1.env.uriScheme}://vscode.microsoft-authentication`));
        if ((0, env_1.isSupportedClient)(callbackUri)) {
            void this._getCodeResponseFromUriHandler();
        }
        else {
            // Unsupported clients will be shown the code in the browser, but it will not redirect back since this
            // isn't a supported client. Instead, they will copy that code in the browser and paste it in an input box
            // that will be shown to them by the extension.
            void this._getCodeResponseFromQuickPick();
        }
        const uri = vscode_1.Uri.parse(url + `&state=${encodeURI(callbackUri.toString(true))}`);
        await vscode_1.env.openExternal(uri);
    }
    async _getCodeResponseFromUriHandler() {
        if (!this._responseDeferred) {
            throw new Error('No listener for auth code');
        }
        const url = await (0, async_1.toPromise)(this._uriHandler.event);
        this._logger.debug(`Received URL event. Authority: ${url.authority}`);
        const result = new URL(url.toString(true));
        this._responseDeferred?.complete({
            code: result.searchParams.get('code') ?? undefined,
            state: result.searchParams.get('state') ?? undefined,
            error: result.searchParams.get('error') ?? undefined,
            error_description: result.searchParams.get('error_description') ?? undefined,
            error_uri: result.searchParams.get('error_uri') ?? undefined,
        });
    }
    async _getCodeResponseFromQuickPick() {
        if (!this._responseDeferred) {
            throw new Error('No listener for auth code');
        }
        const inputBox = vscode_1.window.createInputBox();
        inputBox.ignoreFocusOut = true;
        inputBox.title = vscode_1.l10n.t('Microsoft Authentication');
        inputBox.prompt = vscode_1.l10n.t('Provide the authorization code to complete the sign in flow.');
        inputBox.placeholder = vscode_1.l10n.t('Paste authorization code here...');
        inputBox.show();
        const code = await new Promise((resolve) => {
            let resolvedValue = undefined;
            const disposable = vscode_1.Disposable.from(inputBox, inputBox.onDidAccept(async () => {
                if (!inputBox.value) {
                    inputBox.validationMessage = vscode_1.l10n.t('Authorization code is required.');
                    return;
                }
                const code = inputBox.value;
                resolvedValue = code;
                resolve(code);
                inputBox.hide();
            }), inputBox.onDidChangeValue(() => {
                inputBox.validationMessage = undefined;
            }), inputBox.onDidHide(() => {
                disposable.dispose();
                if (!resolvedValue) {
                    resolve(undefined);
                }
            }));
            Promise.allSettled([this._responseDeferred?.p]).then(() => disposable.dispose());
        });
        // Something canceled the original deferred promise, so just return.
        if (this._responseDeferred.isSettled) {
            return;
        }
        if (code) {
            this._logger.debug('Received auth code from quick pick');
            this._responseDeferred.complete({
                code,
                state: undefined,
                error: undefined,
                error_description: undefined,
                error_uri: undefined
            });
            return;
        }
        this._responseDeferred.complete({
            code: undefined,
            state: undefined,
            error: 'User cancelled',
            error_description: 'User cancelled',
            error_uri: undefined
        });
    }
}
exports.UriHandlerLoopbackClient = UriHandlerLoopbackClient;
//# sourceMappingURL=loopbackClientAndOpener.js.map
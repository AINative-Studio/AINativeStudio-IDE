"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMsalFlows = getMsalFlows;
const vscode_1 = require("vscode");
const loopbackClientAndOpener_1 = require("../common/loopbackClientAndOpener");
const loopbackTemplate_1 = require("./loopbackTemplate");
const redirectUri = 'https://vscode.dev/redirect';
class DefaultLoopbackFlow {
    constructor() {
        this.label = 'default';
        this.options = {
            supportsRemoteExtensionHost: false,
            supportsWebWorkerExtensionHost: false
        };
    }
    async trigger({ cachedPca, authority, scopes, loginHint, windowHandle, logger }) {
        logger.info('Trying default msal flow...');
        return await cachedPca.acquireTokenInteractive({
            openBrowser: async (url) => { await vscode_1.env.openExternal(vscode_1.Uri.parse(url)); },
            scopes,
            authority,
            successTemplate: loopbackTemplate_1.loopbackTemplate,
            errorTemplate: loopbackTemplate_1.loopbackTemplate,
            loginHint,
            prompt: loginHint ? undefined : 'select_account',
            windowHandle
        });
    }
}
class UrlHandlerFlow {
    constructor() {
        this.label = 'protocol handler';
        this.options = {
            supportsRemoteExtensionHost: true,
            supportsWebWorkerExtensionHost: false
        };
    }
    async trigger({ cachedPca, authority, scopes, loginHint, windowHandle, logger, uriHandler }) {
        logger.info('Trying protocol handler flow...');
        const loopbackClient = new loopbackClientAndOpener_1.UriHandlerLoopbackClient(uriHandler, redirectUri, logger);
        return await cachedPca.acquireTokenInteractive({
            openBrowser: (url) => loopbackClient.openBrowser(url),
            scopes,
            authority,
            loopbackClient,
            loginHint,
            prompt: loginHint ? undefined : 'select_account',
            windowHandle
        });
    }
}
const allFlows = [
    new DefaultLoopbackFlow(),
    new UrlHandlerFlow()
];
function getMsalFlows(query) {
    return allFlows.filter(flow => {
        let useFlow = true;
        switch (query.extensionHost) {
            case 1 /* ExtensionHost.Remote */:
                useFlow && (useFlow = flow.options.supportsRemoteExtensionHost);
                break;
            case 0 /* ExtensionHost.WebWorker */:
                useFlow && (useFlow = flow.options.supportsWebWorkerExtensionHost);
                break;
        }
        return useFlow;
    });
}
//# sourceMappingURL=flows.js.map
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
const vscode_1 = require("vscode");
const extensionV1 = __importStar(require("./extensionV1"));
const extensionV2 = __importStar(require("./extensionV2"));
const experimentation_1 = require("./common/experimentation");
const telemetryReporter_1 = require("./common/telemetryReporter");
const logger_1 = __importDefault(require("./logger"));
function shouldUseMsal(expService) {
    // First check if there is a setting value to allow user to override the default
    const inspect = vscode_1.workspace.getConfiguration('microsoft-authentication').inspect('implementation');
    if (inspect?.workspaceFolderValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'workspaceFolderValue'. Value: ${inspect.workspaceFolderValue}`);
        return inspect.workspaceFolderValue === 'msal';
    }
    if (inspect?.workspaceValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'workspaceValue'. Value: ${inspect.workspaceValue}`);
        return inspect.workspaceValue === 'msal';
    }
    if (inspect?.globalValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'globalValue'. Value: ${inspect.globalValue}`);
        return inspect.globalValue === 'msal';
    }
    // Then check if the experiment value
    const expValue = expService.getTreatmentVariable('vscode', 'microsoft.useMsal');
    if (expValue !== undefined) {
        logger_1.default.info(`Acquired MSAL enablement value from 'exp'. Value: ${expValue}`);
        return expValue;
    }
    logger_1.default.info('Acquired MSAL enablement value from default. Value: false');
    // If no setting or experiment value is found, default to true
    return true;
}
let useMsal;
async function activate(context) {
    const mainTelemetryReporter = new telemetryReporter_1.MicrosoftAuthenticationTelemetryReporter(context.extension.packageJSON.aiKey);
    const expService = await (0, experimentation_1.createExperimentationService)(context, mainTelemetryReporter, vscode_1.env.uriScheme !== 'vscode');
    useMsal = shouldUseMsal(expService);
    const clientIdVersion = vscode_1.workspace.getConfiguration('microsoft-authentication').get('clientIdVersion', 'v1');
    context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration('microsoft-authentication')) {
            return;
        }
        if (useMsal === shouldUseMsal(expService) && clientIdVersion === vscode_1.workspace.getConfiguration('microsoft-authentication').get('clientIdVersion', 'v1')) {
            return;
        }
        const reload = vscode_1.l10n.t('Reload');
        const result = await vscode_1.window.showInformationMessage('Reload required', {
            modal: true,
            detail: vscode_1.l10n.t('Microsoft Account configuration has been changed.'),
        }, reload);
        if (result === reload) {
            vscode_1.commands.executeCommand('workbench.action.reloadWindow');
        }
    }));
    // Only activate the new extension if we are not running in a browser environment
    if (useMsal && typeof navigator === 'undefined') {
        await extensionV2.activate(context, mainTelemetryReporter);
    }
    else {
        await extensionV1.activate(context, mainTelemetryReporter.telemetryReporter);
    }
}
function deactivate() {
    if (useMsal) {
        extensionV2.deactivate();
    }
    else {
        extensionV1.deactivate();
    }
}
//# sourceMappingURL=extension.js.map
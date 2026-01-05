"use strict";
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
exports.promptOpenRemoteSSHWindow = promptOpenRemoteSSHWindow;
exports.openRemoteSSHWindow = openRemoteSSHWindow;
exports.openRemoteSSHLocationWindow = openRemoteSSHLocationWindow;
exports.addNewHost = addNewHost;
exports.openSSHConfigFile = openSSHConfigFile;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const authResolver_1 = require("./authResolver");
const sshConfig_1 = require("./ssh/sshConfig");
const files_1 = require("./common/files");
const sshDestination_1 = __importDefault(require("./ssh/sshDestination"));
async function promptOpenRemoteSSHWindow(reuseWindow) {
    const host = await vscode.window.showInputBox({
        title: 'Enter [user@]hostname[:port]'
    });
    if (!host) {
        return;
    }
    const sshDest = new sshDestination_1.default(host);
    openRemoteSSHWindow(sshDest.toEncodedString(), reuseWindow);
}
function openRemoteSSHWindow(host, reuseWindow) {
    vscode.commands.executeCommand('vscode.newWindow', { remoteAuthority: (0, authResolver_1.getRemoteAuthority)(host), reuseWindow });
}
function openRemoteSSHLocationWindow(host, path, reuseWindow) {
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.from({ scheme: 'vscode-remote', authority: (0, authResolver_1.getRemoteAuthority)(host), path }), { forceNewWindow: !reuseWindow });
}
async function addNewHost() {
    const sshConfigPath = (0, sshConfig_1.getSSHConfigPath)();
    if (!await (0, files_1.exists)(sshConfigPath)) {
        await fs.promises.appendFile(sshConfigPath, '');
    }
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(sshConfigPath), { preview: false });
    const textEditor = vscode.window.activeTextEditor;
    if (textEditor?.document.uri.fsPath !== sshConfigPath) {
        return;
    }
    const textDocument = textEditor.document;
    const lastLine = textDocument.lineAt(textDocument.lineCount - 1);
    if (!lastLine.isEmptyOrWhitespace) {
        await textEditor.edit((editBuilder) => {
            editBuilder.insert(lastLine.range.end, '\n');
        });
    }
    const snippet = '\nHost ${1:dev}\n\tHostName ${2:dev.example.com}\n\tUser ${3:john}';
    await textEditor.insertSnippet(new vscode.SnippetString(snippet), new vscode.Position(textDocument.lineCount, 0));
}
async function openSSHConfigFile() {
    const sshConfigPath = (0, sshConfig_1.getSSHConfigPath)();
    if (!await (0, files_1.exists)(sshConfigPath)) {
        await fs.promises.appendFile(sshConfigPath, '');
    }
    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(sshConfigPath));
}
//# sourceMappingURL=commands.js.map
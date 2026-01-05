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
exports.promptOpenRemoteWSLWindow = promptOpenRemoteWSLWindow;
exports.promptInstallNewWSLDistro = promptInstallNewWSLDistro;
exports.openRemoteWSLWindow = openRemoteWSLWindow;
exports.openRemoteWSLLocationWindow = openRemoteWSLLocationWindow;
exports.setDefaultWSLDistro = setDefaultWSLDistro;
exports.deleteWSLDistro = deleteWSLDistro;
const vscode = __importStar(require("vscode"));
const authResolver_1 = require("./authResolver");
const wslTerminal_1 = __importDefault(require("./wsl/wslTerminal"));
async function showDistrosPicker(wslManager, placeHolder) {
    const pickItemsPromise = wslManager.listDistros()
        .then(distros => distros.map(distroData => {
        return {
            ...distroData,
            label: `${distroData.name}`,
            detail: distroData.isDefault ? 'default distro' : undefined,
        };
    }));
    const picked = await vscode.window.showQuickPick(pickItemsPromise, { canPickMany: false, placeHolder });
    return picked;
}
async function showOnlineDistrosPicker(wslManager, placeHolder) {
    const pickItemsPromise = Promise.all([wslManager.listOnlineDistros(), wslManager.listDistros()])
        .then(([onlineDistros, localDistros]) => {
        const distroToInstall = onlineDistros.filter(d => !localDistros.some(l => l.name === d.name));
        return distroToInstall.map(distroData => {
            return {
                ...distroData,
                label: `${distroData.friendlyName}`,
            };
        });
    });
    const picked = await vscode.window.showQuickPick(pickItemsPromise, { canPickMany: false, placeHolder });
    return picked;
}
async function promptOpenRemoteWSLWindow(wslManager, useDefault, reuseWindow) {
    let distroName;
    if (useDefault) {
        const distros = await wslManager.listDistros();
        distroName = distros.find(distro => distro.isDefault)?.name;
    }
    else {
        distroName = (await showDistrosPicker(wslManager, 'Select WSL distro'))?.name;
    }
    if (!distroName) {
        return;
    }
    openRemoteWSLWindow(distroName, reuseWindow);
}
async function promptInstallNewWSLDistro(wslManager) {
    const distroName = (await showOnlineDistrosPicker(wslManager, 'Select the WSL distro to install'))?.name;
    if (!distroName) {
        return;
    }
    wslTerminal_1.default.runCommand(`wsl.exe --install -d ${distroName}`);
}
function openRemoteWSLWindow(distro, reuseWindow) {
    vscode.commands.executeCommand('vscode.newWindow', { remoteAuthority: (0, authResolver_1.getRemoteAuthority)(distro), reuseWindow });
}
function openRemoteWSLLocationWindow(distro, path, reuseWindow) {
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.from({ scheme: 'vscode-remote', authority: (0, authResolver_1.getRemoteAuthority)(distro), path }), { forceNewWindow: !reuseWindow });
}
async function setDefaultWSLDistro(wslManager, distroName) {
    await wslManager.setDefaultDistro(distroName);
}
async function deleteWSLDistro(wslManager, distroName) {
    const deleteAction = 'Delete';
    const resp = await vscode.window.showInformationMessage(`Are you sure you want to permanently delete the distro "${distroName}" including all its data?`, { modal: true }, deleteAction);
    if (resp === deleteAction) {
        await wslManager.deleteDistro(distroName);
        return true;
    }
    return false;
}
//# sourceMappingURL=commands.js.map
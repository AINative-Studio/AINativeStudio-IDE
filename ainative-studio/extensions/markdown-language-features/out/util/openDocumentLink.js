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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MdLinkOpener = void 0;
const vscode = __importStar(require("vscode"));
var OpenMarkdownLinks;
(function (OpenMarkdownLinks) {
    OpenMarkdownLinks["beside"] = "beside";
    OpenMarkdownLinks["currentGroup"] = "currentGroup";
})(OpenMarkdownLinks || (OpenMarkdownLinks = {}));
class MdLinkOpener {
    constructor(_client) {
        this._client = _client;
    }
    async resolveDocumentLink(linkText, fromResource) {
        return this._client.resolveLinkTarget(linkText, fromResource);
    }
    async openDocumentLink(linkText, fromResource, viewColumn) {
        const resolved = await this._client.resolveLinkTarget(linkText, fromResource);
        if (!resolved) {
            return;
        }
        const uri = vscode.Uri.from(resolved.uri);
        switch (resolved.kind) {
            case 'external':
                return vscode.commands.executeCommand('vscode.open', uri);
            case 'folder':
                return vscode.commands.executeCommand('revealInExplorer', uri);
            case 'file': {
                // If no explicit viewColumn is given, check if the editor is already open in a tab
                if (typeof viewColumn === 'undefined') {
                    for (const tab of vscode.window.tabGroups.all.flatMap(x => x.tabs)) {
                        if (tab.input instanceof vscode.TabInputText) {
                            if (tab.input.uri.fsPath === uri.fsPath) {
                                viewColumn = tab.group.viewColumn;
                                break;
                            }
                        }
                    }
                }
                return vscode.commands.executeCommand('vscode.open', uri, {
                    selection: resolved.position ? new vscode.Range(resolved.position.line, resolved.position.character, resolved.position.line, resolved.position.character) : undefined,
                    viewColumn: viewColumn ?? getViewColumn(fromResource),
                });
            }
        }
    }
}
exports.MdLinkOpener = MdLinkOpener;
function getViewColumn(resource) {
    const config = vscode.workspace.getConfiguration('markdown', resource);
    const openLinks = config.get('links.openLocation', OpenMarkdownLinks.currentGroup);
    switch (openLinks) {
        case OpenMarkdownLinks.beside:
            return vscode.ViewColumn.Beside;
        case OpenMarkdownLinks.currentGroup:
        default:
            return vscode.ViewColumn.Active;
    }
}
//# sourceMappingURL=openDocumentLink.js.map
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
exports.ShowPreviewSecuritySelectorCommand = void 0;
const vscode = __importStar(require("vscode"));
const file_1 = require("../util/file");
class ShowPreviewSecuritySelectorCommand {
    constructor(_previewSecuritySelector, _previewManager) {
        this._previewSecuritySelector = _previewSecuritySelector;
        this._previewManager = _previewManager;
        this.id = 'markdown.showPreviewSecuritySelector';
    }
    execute(resource) {
        if (this._previewManager.activePreviewResource) {
            this._previewSecuritySelector.showSecuritySelectorForResource(this._previewManager.activePreviewResource);
        }
        else if (resource) {
            const source = vscode.Uri.parse(resource);
            this._previewSecuritySelector.showSecuritySelectorForResource(source.query ? vscode.Uri.parse(source.query) : source);
        }
        else if (vscode.window.activeTextEditor && (0, file_1.isMarkdownFile)(vscode.window.activeTextEditor.document)) {
            this._previewSecuritySelector.showSecuritySelectorForResource(vscode.window.activeTextEditor.document.uri);
        }
    }
}
exports.ShowPreviewSecuritySelectorCommand = ShowPreviewSecuritySelectorCommand;
//# sourceMappingURL=showPreviewSecuritySelector.js.map
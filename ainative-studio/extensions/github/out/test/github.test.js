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
require("mocha");
const assert = __importStar(require("assert"));
const vscode_1 = require("vscode");
const pushErrorHandler_1 = require("../pushErrorHandler");
suite('github smoke test', function () {
    const cwd = vscode_1.workspace.workspaceFolders[0].uri;
    suiteSetup(async function () {
        const ext = vscode_1.extensions.getExtension('vscode.github');
        await ext?.activate();
    });
    test('should find all templates', async function () {
        const expectedValuesSorted = [
            'PULL_REQUEST_TEMPLATE/a.md',
            'PULL_REQUEST_TEMPLATE/b.md',
            'docs/PULL_REQUEST_TEMPLATE.md',
            'docs/PULL_REQUEST_TEMPLATE/a.md',
            'docs/PULL_REQUEST_TEMPLATE/b.md',
            '.github/PULL_REQUEST_TEMPLATE.md',
            '.github/PULL_REQUEST_TEMPLATE/a.md',
            '.github/PULL_REQUEST_TEMPLATE/b.md',
            'PULL_REQUEST_TEMPLATE.md'
        ];
        expectedValuesSorted.sort();
        const uris = await (0, pushErrorHandler_1.findPullRequestTemplates)(cwd);
        const urisSorted = uris.map(x => x.path.slice(cwd.path.length));
        urisSorted.sort();
        assert.deepStrictEqual(urisSorted, expectedValuesSorted);
    });
    test('selecting non-default quick-pick item should correspond to a template', async () => {
        const template0 = vscode_1.Uri.file("some-imaginary-template-0");
        const template1 = vscode_1.Uri.file("some-imaginary-template-1");
        const templates = [template0, template1];
        const pick = (0, pushErrorHandler_1.pickPullRequestTemplate)(vscode_1.Uri.file("/"), templates);
        await vscode_1.commands.executeCommand('workbench.action.quickOpenSelectNext');
        await vscode_1.commands.executeCommand('workbench.action.quickOpenSelectNext');
        await vscode_1.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
        assert.ok(await pick === template0);
    });
    test('selecting first quick-pick item should return undefined', async () => {
        const templates = [vscode_1.Uri.file("some-imaginary-file")];
        const pick = (0, pushErrorHandler_1.pickPullRequestTemplate)(vscode_1.Uri.file("/"), templates);
        await vscode_1.commands.executeCommand('workbench.action.quickOpenSelectNext');
        await vscode_1.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
        assert.ok(await pick === undefined);
    });
});
//# sourceMappingURL=github.test.js.map
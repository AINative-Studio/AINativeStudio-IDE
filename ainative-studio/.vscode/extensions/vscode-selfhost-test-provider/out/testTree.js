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
exports.TestCase = exports.TestSuite = exports.TestConstruct = exports.TestFile = exports.getContentFromFilesystem = exports.guessWorkspaceFolder = exports.clearFileDiagnostics = exports.itemData = void 0;
const path_1 = require("path");
const ts = __importStar(require("typescript"));
const util_1 = require("util");
const vscode = __importStar(require("vscode"));
const sourceUtils_1 = require("./sourceUtils");
const textDecoder = new util_1.TextDecoder('utf-8');
const diagnosticCollection = vscode.languages.createDiagnosticCollection('selfhostTestProvider');
exports.itemData = new WeakMap();
const clearFileDiagnostics = (uri) => diagnosticCollection.delete(uri);
exports.clearFileDiagnostics = clearFileDiagnostics;
/**
 * Tries to guess which workspace folder VS Code is in.
 */
const guessWorkspaceFolder = async () => {
    if (!vscode.workspace.workspaceFolders) {
        return undefined;
    }
    if (vscode.workspace.workspaceFolders.length < 2) {
        return vscode.workspace.workspaceFolders[0];
    }
    for (const folder of vscode.workspace.workspaceFolders) {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, 'src/vs/loader.js'));
            return folder;
        }
        catch {
            // ignored
        }
    }
    return undefined;
};
exports.guessWorkspaceFolder = guessWorkspaceFolder;
const getContentFromFilesystem = async (uri) => {
    try {
        const rawContent = await vscode.workspace.fs.readFile(uri);
        return textDecoder.decode(rawContent);
    }
    catch (e) {
        console.warn(`Error providing tests for ${uri.fsPath}`, e);
        return '';
    }
};
exports.getContentFromFilesystem = getContentFromFilesystem;
class TestFile {
    constructor(uri, workspaceFolder) {
        this.uri = uri;
        this.workspaceFolder = workspaceFolder;
        this.hasBeenRead = false;
    }
    getId() {
        return this.uri.toString().toLowerCase();
    }
    getLabel() {
        return (0, path_1.relative)((0, path_1.join)(this.workspaceFolder.uri.fsPath, 'src'), this.uri.fsPath);
    }
    async updateFromDisk(controller, item) {
        try {
            const content = await (0, exports.getContentFromFilesystem)(item.uri);
            item.error = undefined;
            this.updateFromContents(controller, content, item);
        }
        catch (e) {
            item.error = e.stack;
        }
    }
    /**
     * Refreshes all tests in this file, `sourceReader` provided by the root.
     */
    updateFromContents(controller, content, file) {
        try {
            const diagnostics = [];
            const ast = ts.createSourceFile(this.uri.path.split('/').pop(), content, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
            const parents = [
                { item: file, children: [] },
            ];
            const traverse = (node) => {
                const parent = parents[parents.length - 1];
                const childData = (0, sourceUtils_1.extractTestFromNode)(ast, node, exports.itemData.get(parent.item));
                if (childData === 0 /* Action.Skip */) {
                    return;
                }
                if (childData === 1 /* Action.Recurse */) {
                    ts.forEachChild(node, traverse);
                    return;
                }
                const id = `${file.uri}/${childData.fullName}`.toLowerCase();
                // Skip duplicated tests. They won't run correctly with the way
                // mocha reports them, and will error if we try to insert them.
                const existing = parent.children.find(c => c.id === id);
                if (existing) {
                    const diagnostic = new vscode.Diagnostic(childData.range, 'Duplicate tests cannot be run individually and will not be reported correctly by the test framework. Please rename them.', vscode.DiagnosticSeverity.Warning);
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(new vscode.Location(existing.uri, existing.range), 'First declared here'),
                    ];
                    diagnostics.push(diagnostic);
                    return;
                }
                const item = controller.createTestItem(id, childData.name, file.uri);
                exports.itemData.set(item, childData);
                item.range = childData.range;
                parent.children.push(item);
                if (childData instanceof TestSuite) {
                    parents.push({ item: item, children: [] });
                    ts.forEachChild(node, traverse);
                    item.children.replace(parents.pop().children);
                }
            };
            ts.forEachChild(ast, traverse);
            file.error = undefined;
            file.children.replace(parents[0].children);
            diagnosticCollection.set(this.uri, diagnostics.length ? diagnostics : undefined);
            this.hasBeenRead = true;
        }
        catch (e) {
            file.error = String(e.stack || e.message);
        }
    }
}
exports.TestFile = TestFile;
class TestConstruct {
    constructor(name, range, parent) {
        this.name = name;
        this.range = range;
        this.fullName = parent ? `${parent.fullName} ${name}` : name;
    }
}
exports.TestConstruct = TestConstruct;
class TestSuite extends TestConstruct {
}
exports.TestSuite = TestSuite;
class TestCase extends TestConstruct {
}
exports.TestCase = TestCase;
//# sourceMappingURL=testTree.js.map
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
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
async function activate(context) {
    const fileIndex = new class {
        constructor() {
            this._disposables = [];
            this._index = new Map();
            const watcher = vscode.workspace.createFileSystemWatcher('**/*.ts', false, true, false);
            this._disposables.push(watcher.onDidChange(e => { this._index.set(e.toString(), e); }));
            this._disposables.push(watcher.onDidDelete(e => { this._index.delete(e.toString()); }));
            this._disposables.push(watcher);
            this._refresh(false);
        }
        dispose() {
            for (const disposable of this._disposables) {
                disposable.dispose();
            }
            this._disposables = [];
            this._index.clear();
        }
        async all(token) {
            await Promise.race([this._currentRun, new Promise(resolve => token.onCancellationRequested(resolve))]);
            if (token.isCancellationRequested) {
                return undefined;
            }
            return Array.from(this._index.values());
        }
        _refresh(clear) {
            // TODO@jrieken LATEST API! findFiles2New
            this._currentRun = vscode.workspace.findFiles('src/vs/**/*.ts', '{**/node_modules/**,**/extensions/**}').then(all => {
                if (clear) {
                    this._index.clear();
                }
                for (const item of all) {
                    this._index.set(item.toString(), item);
                }
            });
        }
    };
    const selector = 'typescript';
    function findNodeAtPosition(document, node, position) {
        if (node.getStart() <= document.offsetAt(position) && node.getEnd() >= document.offsetAt(position)) {
            return ts.forEachChild(node, child => findNodeAtPosition(document, child, position)) || node;
        }
        return undefined;
    }
    function findImportAt(document, position) {
        const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, true);
        const node = findNodeAtPosition(document, sourceFile, position);
        if (node && ts.isStringLiteral(node) && ts.isImportDeclaration(node.parent)) {
            return node.parent;
        }
        return undefined;
    }
    const completionProvider = new class {
        async provideCompletionItems(document, position, token) {
            const index = document.getText().lastIndexOf(' from \'');
            if (index < 0 || document.positionAt(index).line < position.line) {
                // line after last import is before position
                // -> no completion, safe a parse call
                return undefined;
            }
            const node = findImportAt(document, position);
            if (!node) {
                return undefined;
            }
            const range = new vscode.Range(document.positionAt(node.moduleSpecifier.pos), document.positionAt(node.moduleSpecifier.end));
            const uris = await fileIndex.all(token);
            if (!uris) {
                return undefined;
            }
            const result = new vscode.CompletionList();
            result.isIncomplete = true;
            for (const item of uris) {
                if (!item.path.endsWith('.ts')) {
                    continue;
                }
                let relativePath = path.relative(path.dirname(document.uri.path), item.path);
                relativePath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
                const label = path.basename(item.path, path.extname(item.path));
                const insertText = ` '${relativePath.replace(/\.ts$/, '.js')}'`;
                const filterText = ` '${label}'`;
                const completion = new vscode.CompletionItem({
                    label: label,
                    description: vscode.workspace.asRelativePath(item),
                });
                completion.kind = vscode.CompletionItemKind.File;
                completion.insertText = insertText;
                completion.filterText = filterText;
                completion.range = range;
                result.items.push(completion);
            }
            return result;
        }
    };
    class ImportCodeActions {
        async provideCodeActions(document, range, context, token) {
            if (context.only && ImportCodeActions.SourceKind.intersects(context.only)) {
                return this._provideFixAll(document, context, token);
            }
            return this._provideFix(document, range, context, token);
        }
        async _provideFixAll(document, context, token) {
            const diagnostics = context.diagnostics
                .filter(d => d.code === 2307)
                .sort((a, b) => b.range.start.compareTo(a.range.start));
            if (diagnostics.length === 0) {
                return undefined;
            }
            const uris = await fileIndex.all(token);
            if (!uris) {
                return undefined;
            }
            const result = new vscode.CodeAction(`Fix All ESM Imports`, ImportCodeActions.SourceKind);
            result.edit = new vscode.WorkspaceEdit();
            result.diagnostics = [];
            for (const diag of diagnostics) {
                const actions = this._provideFixesForDiag(document, diag, uris);
                if (actions.length === 0) {
                    console.log(`ESM: no fixes for "${diag.message}"`);
                    continue;
                }
                if (actions.length > 1) {
                    console.log(`ESM: more than one fix for "${diag.message}", taking first`);
                    console.log(actions);
                }
                const [first] = actions;
                result.diagnostics.push(diag);
                for (const [uri, edits] of first.edit.entries()) {
                    result.edit.set(uri, edits);
                }
            }
            // console.log(result.edit.get(document.uri));
            return [result];
        }
        async _provideFix(document, range, context, token) {
            const uris = await fileIndex.all(token);
            if (!uris) {
                return [];
            }
            const diag = context.diagnostics.find(d => d.code === 2307 && d.range.intersection(range));
            return diag && this._provideFixesForDiag(document, diag, uris);
        }
        _provideFixesForDiag(document, diag, uris) {
            const node = findImportAt(document, diag.range.start)?.moduleSpecifier;
            if (!node || !ts.isStringLiteral(node)) {
                return [];
            }
            const nodeRange = new vscode.Range(document.positionAt(node.pos), document.positionAt(node.end));
            const name = path.basename(node.text, path.extname(node.text));
            const result = [];
            for (const item of uris) {
                if (path.basename(item.path, path.extname(item.path)) === name) {
                    let relativePath = path.relative(path.dirname(document.uri.path), item.path).replace(/\.ts$/, '.js');
                    relativePath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
                    const action = new vscode.CodeAction(`Fix to '${relativePath}'`, ImportCodeActions.FixKind);
                    action.edit = new vscode.WorkspaceEdit();
                    action.edit.replace(document.uri, nodeRange, ` '${relativePath}'`);
                    action.diagnostics = [diag];
                    result.push(action);
                }
            }
            return result;
        }
    }
    ImportCodeActions.FixKind = vscode.CodeActionKind.QuickFix.append('esmImport');
    ImportCodeActions.SourceKind = vscode.CodeActionKind.SourceFixAll.append('esmImport');
    context.subscriptions.push(fileIndex);
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, completionProvider));
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(selector, new ImportCodeActions(), { providedCodeActionKinds: [ImportCodeActions.FixKind, ImportCodeActions.SourceKind] }));
}
//# sourceMappingURL=extension.js.map
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
exports.ImportGraph = void 0;
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const cockatiel_1 = require("cockatiel");
const fs_1 = require("fs");
const maxInt32 = 2 ** 31 - 1;
// limit concurrency to avoid overwhelming the filesystem during discovery
const discoverLimiter = (0, cockatiel_1.bulkhead)(8, Infinity);
// Max import distance when listing related code to improve relevancy.
const defaultMaxDistance = 3;
/**
 * Maintains a graph of imports in the codebase. This works lazily resolving
 * imports and re-parsing files only on request.
 *
 * This is a rough, file-level graph derived from simple regex matching on
 * source files to avoid having to parse the AST of every file in the codebase,
 * which is possible but more intensive. (See: all the years of work from the
 * TS language server.)
 *
 * A more advanced implementation could use references from the language server.
 */
class ImportGraph {
    constructor(root, discoverWorkspaceTests, getTestNodeForDoc) {
        this.root = root;
        this.discoverWorkspaceTests = discoverWorkspaceTests;
        this.getTestNodeForDoc = getTestNodeForDoc;
        this.graph = new Map();
    }
    /** @inheritdoc */
    async provideRelatedCode(test, token) {
        // this is kind of a stub for this implementation. Naive following imports
        // isn't that useful for finding a test's related code.
        const node = await this.discoverOutwards(test.uri, new Set(), defaultMaxDistance, token);
        if (!node) {
            return [];
        }
        const imports = new Set();
        const queue = [{ distance: 0, next: node.imports }];
        while (queue.length) {
            const { distance, next } = queue.shift();
            for (const imp of next) {
                if (imports.has(imp.path)) {
                    continue;
                }
                imports.add(imp.path);
                if (distance < defaultMaxDistance) {
                    queue.push({ next: imp.imports, distance: distance + 1 });
                }
            }
        }
        return [...imports].map(importPath => new vscode.Location(vscode.Uri.file((0, path_1.join)(this.root.fsPath, 'src', `${importPath}.ts`)), new vscode.Range(0, 0, maxInt32, 0)));
    }
    /** @inheritdoc */
    async provideRelatedTests(document, _position, token) {
        // Expand all known tests to ensure imports of this file are realized.
        const rootTests = await this.discoverWorkspaceTests();
        const seen = new Set();
        await Promise.all(rootTests.map(v => v.uri && this.discoverOutwards(v.uri, seen, defaultMaxDistance, token)));
        const node = this.getNode(document.uri);
        if (!node) {
            return [];
        }
        const tests = [];
        const queue = [{ next: node, distance: 0 }];
        const visited = new Set();
        let maxDistance = Infinity;
        while (queue.length) {
            const { next, distance } = queue.shift();
            if (visited.has(next)) {
                continue;
            }
            visited.add(next);
            const testForDoc = this.getTestNodeForDoc(next.uri);
            if (testForDoc) {
                tests.push(testForDoc);
                // only look for tests half again as far away as the closest test to keep things relevant
                if (!Number.isFinite(maxDistance)) {
                    maxDistance = distance * 3 / 2;
                }
            }
            if (distance < maxDistance) {
                for (const importedByNode of next.importedBy) {
                    queue.push({ next: importedByNode, distance: distance + 1 });
                }
            }
        }
        return tests;
    }
    didChange(uri, deleted) {
        const rel = this.uriToImportPath(uri);
        const node = rel && this.graph.get(rel);
        if (!node) {
            return;
        }
        if (deleted) {
            this.graph.delete(rel);
            for (const imp of node.imports) {
                imp.importedBy.delete(node);
            }
        }
        else {
            node.isSynced = false;
        }
    }
    getNode(uri) {
        const rel = this.uriToImportPath(uri);
        return rel ? this.graph.get(rel) : undefined;
    }
    /** Discover all nodes that import the file */
    async discoverOutwards(uri, seen, maxDistance, token) {
        const rel = this.uriToImportPath(uri);
        if (!rel) {
            return undefined;
        }
        let node = this.graph.get(rel);
        if (!node) {
            node = new FileNode(uri, rel);
            this.graph.set(rel, node);
        }
        await this.discoverOutwardsInner(node, seen, maxDistance, token);
        return node;
    }
    async discoverOutwardsInner(node, seen, maxDistance, token) {
        if (seen.has(node.path) || maxDistance === 0) {
            return;
        }
        seen.add(node.path);
        if (node.isSynced === false) {
            await this.syncNode(node);
        }
        else if (node.isSynced instanceof Promise) {
            await node.isSynced;
        }
        if (token.isCancellationRequested) {
            return;
        }
        await Promise.all([...node.imports].map(i => this.discoverOutwardsInner(i, seen, maxDistance - 1, token)));
    }
    async syncNode(node) {
        node.isSynced = discoverLimiter.execute(async () => {
            const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === node.uri.toString());
            let text;
            if (doc) {
                text = doc.getText();
            }
            else {
                try {
                    text = await fs_1.promises.readFile(node.uri.fsPath, 'utf8');
                }
                catch {
                    text = '';
                }
            }
            for (const imp of node.imports) {
                imp.importedBy.delete(node);
            }
            node.imports.clear();
            for (const [, importPath] of text.matchAll(IMPORT_RE)) {
                let imp = this.graph.get(importPath);
                if (!imp) {
                    imp = new FileNode(this.importPathToUri(importPath), importPath);
                    this.graph.set(importPath, imp);
                }
                imp.importedBy.add(node);
                node.imports.add(imp);
            }
            node.isSynced = true;
        });
        await node.isSynced;
    }
    uriToImportPath(uri) {
        if (!uri) {
            return undefined;
        }
        const relativePath = vscode.workspace.asRelativePath(uri).replaceAll('\\', '/');
        if (!relativePath.startsWith('src/vs/') || !relativePath.endsWith('.ts')) {
            return undefined;
        }
        return relativePath.slice('src/'.length, -'.ts'.length);
    }
    importPathToUri(importPath) {
        return vscode.Uri.file((0, path_1.join)(this.root.fsPath, 'src', `${importPath}.ts`));
    }
}
exports.ImportGraph = ImportGraph;
const IMPORT_RE = /import .*? from ["'](vs\/[^"']+)/g;
class FileNode {
    // Path is the *import path* starting with `vs/`
    constructor(uri, path) {
        this.uri = uri;
        this.path = path;
        this.imports = new Set();
        this.importedBy = new Set();
        this.isSynced = false;
    }
}
//# sourceMappingURL=importGraph.js.map
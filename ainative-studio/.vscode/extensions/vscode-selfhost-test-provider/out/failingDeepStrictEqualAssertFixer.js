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
exports.FailingDeepStrictEqualAssertFixer = void 0;
const ts = __importStar(require("typescript"));
const vscode_1 = require("vscode");
const memoize_1 = require("./memoize");
const metadata_1 = require("./metadata");
class FailingDeepStrictEqualAssertFixer {
    constructor() {
        this.disposables = [];
        this.disposables.push(vscode_1.commands.registerCommand("selfhost-test.fix-test" /* Constants.FixCommandId */, async (uri, position) => {
            const document = await vscode_1.workspace.openTextDocument(uri);
            const failingAssertion = detectFailingDeepStrictEqualAssertion(document, position);
            if (!failingAssertion) {
                return;
            }
            const expectedValueNode = failingAssertion.assertion.expectedValue;
            if (!expectedValueNode) {
                return;
            }
            const start = document.positionAt(expectedValueNode.getStart());
            const end = document.positionAt(expectedValueNode.getEnd());
            const edit = new vscode_1.WorkspaceEdit();
            edit.replace(uri, new vscode_1.Range(start, end), formatJsonValue(failingAssertion.actualJSONValue));
            await vscode_1.workspace.applyEdit(edit);
        }));
        this.disposables.push(vscode_1.languages.registerCodeActionsProvider('typescript', {
            provideCodeActions: (document, range) => {
                const failingAssertion = detectFailingDeepStrictEqualAssertion(document, range.start);
                if (!failingAssertion) {
                    return undefined;
                }
                return [
                    {
                        title: 'Fix Expected Value',
                        command: "selfhost-test.fix-test" /* Constants.FixCommandId */,
                        arguments: [document.uri, range.start],
                    },
                ];
            },
        }));
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.FailingDeepStrictEqualAssertFixer = FailingDeepStrictEqualAssertFixer;
const identifierLikeRe = /^[$a-z_][a-z0-9_$]*$/i;
const tsPrinter = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const formatJsonValue = (value) => {
    if (typeof value !== 'object') {
        return JSON.stringify(value);
    }
    const src = ts.createSourceFile('', `(${JSON.stringify(value)})`, ts.ScriptTarget.ES5, true);
    const outerExpression = src.statements[0];
    const parenExpression = outerExpression.expression;
    const unquoted = ts.transform(parenExpression, [
        context => (node) => {
            const visitor = (node) => ts.isPropertyAssignment(node) &&
                ts.isStringLiteralLike(node.name) &&
                identifierLikeRe.test(node.name.text)
                ? ts.factory.createPropertyAssignment(ts.factory.createIdentifier(node.name.text), ts.visitNode(node.initializer, visitor))
                : ts.isStringLiteralLike(node) && node.text === '[undefined]'
                    ? ts.factory.createIdentifier('undefined')
                    : ts.visitEachChild(node, visitor, context);
            return ts.visitNode(node, visitor);
        },
    ]);
    return tsPrinter.printNode(ts.EmitHint.Expression, unquoted.transformed[0], src);
};
/** Parses the source file, memoizing the last document so cursor moves are efficient */
const parseSourceFile = (0, memoize_1.memoizeLast)((text) => ts.createSourceFile('', text, ts.ScriptTarget.ES5, true));
const assertionFailureMessageRe = /^Expected values to be strictly (deep-)?equal:/;
/** Gets information about the failing assertion at the poisition, if any. */
function detectFailingDeepStrictEqualAssertion(document, position) {
    const sf = parseSourceFile(document.getText());
    const offset = document.offsetAt(position);
    const assertion = StrictEqualAssertion.atPosition(sf, offset);
    if (!assertion) {
        return undefined;
    }
    const startLine = document.positionAt(assertion.offsetStart).line;
    const messages = getAllTestStatusMessagesAt(document.uri, startLine);
    const strictDeepEqualMessage = messages.find(m => assertionFailureMessageRe.test(typeof m.message === 'string' ? m.message : m.message.value));
    if (!strictDeepEqualMessage) {
        return undefined;
    }
    const metadata = (0, metadata_1.getTestMessageMetadata)(strictDeepEqualMessage);
    if (!metadata) {
        return undefined;
    }
    return {
        assertion: assertion,
        actualJSONValue: metadata.actualValue,
    };
}
class StrictEqualAssertion {
    /**
     * Extracts the assertion at the current node, if it is one.
     */
    static fromNode(node) {
        if (!ts.isCallExpression(node)) {
            return undefined;
        }
        const expr = node.expression.getText();
        if (expr !== 'assert.deepStrictEqual' && expr !== 'assert.strictEqual') {
            return undefined;
        }
        return new StrictEqualAssertion(node);
    }
    /**
     * Gets the equals assertion at the given offset in the file.
     */
    static atPosition(sf, offset) {
        let node = findNodeAt(sf, offset);
        while (node.parent) {
            const obj = StrictEqualAssertion.fromNode(node);
            if (obj) {
                return obj;
            }
            node = node.parent;
        }
        return undefined;
    }
    constructor(expression) {
        this.expression = expression;
    }
    /** Gets the expected value */
    get expectedValue() {
        return this.expression.arguments[1];
    }
    /** Gets the position of the assertion expression. */
    get offsetStart() {
        return this.expression.getStart();
    }
}
function findNodeAt(parent, offset) {
    for (const child of parent.getChildren()) {
        if (child.getStart() <= offset && offset <= child.getEnd()) {
            return findNodeAt(child, offset);
        }
    }
    return parent;
}
function getAllTestStatusMessagesAt(uri, lineNumber) {
    if (vscode_1.tests.testResults.length === 0) {
        return [];
    }
    const run = vscode_1.tests.testResults[0];
    const snapshots = getTestResultsWithUri(run, uri);
    const result = [];
    for (const snapshot of snapshots) {
        for (const m of snapshot.taskStates[0].messages) {
            if (m.location &&
                m.location.range.start.line <= lineNumber &&
                lineNumber <= m.location.range.end.line) {
                result.push(m);
            }
        }
    }
    return result;
}
function getTestResultsWithUri(testRun, uri) {
    const results = [];
    const walk = (r) => {
        for (const c of r.children) {
            walk(c);
        }
        if (r.uri?.toString() === uri.toString()) {
            results.push(r);
        }
    };
    for (const r of testRun.results) {
        walk(r);
    }
    return results;
}
//# sourceMappingURL=failingDeepStrictEqualAssertFixer.js.map
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
exports.extractTestFromNode = void 0;
const ts = __importStar(require("typescript"));
const vscode = __importStar(require("vscode"));
const testTree_1 = require("./testTree");
const suiteNames = new Set(['suite', 'flakySuite']);
const testNames = new Set(['test']);
const extractTestFromNode = (src, node, parent) => {
    if (!ts.isCallExpression(node)) {
        return 1 /* Action.Recurse */;
    }
    const asSuite = identifyCall(node.expression, suiteNames);
    const asTest = identifyCall(node.expression, testNames);
    const either = asSuite || asTest;
    if (either === 1 /* IdentifiedCall.Skipped */) {
        return 0 /* Action.Skip */;
    }
    if (either === 0 /* IdentifiedCall.Nothing */) {
        return 1 /* Action.Recurse */;
    }
    const name = node.arguments[0];
    const func = node.arguments[1];
    if (!name || !ts.isStringLiteralLike(name) || !func) {
        return 1 /* Action.Recurse */;
    }
    const start = src.getLineAndCharacterOfPosition(name.pos);
    const end = src.getLineAndCharacterOfPosition(func.end);
    const range = new vscode.Range(new vscode.Position(start.line, start.character), new vscode.Position(end.line, end.character));
    const cparent = parent instanceof testTree_1.TestConstruct ? parent : undefined;
    // we know this is either a suite or a test because we checked for skipped/nothing above
    if (asTest) {
        return new testTree_1.TestCase(name.text, range, cparent);
    }
    if (asSuite) {
        return new testTree_1.TestSuite(name.text, range, cparent);
    }
    throw new Error('unreachable');
};
exports.extractTestFromNode = extractTestFromNode;
const identifyCall = (lhs, needles) => {
    if (ts.isIdentifier(lhs)) {
        return needles.has(lhs.escapedText || lhs.text) ? 2 /* IdentifiedCall.IsThing */ : 0 /* IdentifiedCall.Nothing */;
    }
    if (isPropertyCall(lhs) && lhs.name.text === 'skip') {
        return needles.has(lhs.expression.text) ? 1 /* IdentifiedCall.Skipped */ : 0 /* IdentifiedCall.Nothing */;
    }
    if (ts.isParenthesizedExpression(lhs) && ts.isConditionalExpression(lhs.expression)) {
        return Math.max(identifyCall(lhs.expression.whenTrue, needles), identifyCall(lhs.expression.whenFalse, needles));
    }
    return 0 /* IdentifiedCall.Nothing */;
};
const isPropertyCall = (lhs) => ts.isPropertyAccessExpression(lhs) &&
    ts.isIdentifier(lhs.expression) &&
    ts.isIdentifier(lhs.name);
//# sourceMappingURL=sourceUtils.js.map
"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackTraceLocation = exports.StackTraceParser = void 0;
// Copied from https://github.com/microsoft/vscode-js-debug/blob/1d104b5184736677ab5cc280c70bbd227403850c/src/common/stackTraceParser.ts#L18
// Either match lines like
// "    at fulfilled (/Users/roblou/code/testapp-node2/out/app.js:5:58)"
// or
// "    at /Users/roblou/code/testapp-node2/out/app.js:60:23"
// and replace the path in them
const re1 = /^(\W*at .*\()(.*):(\d+):(\d+)(\))$/;
const re2 = /^(\W*at )(.*):(\d+):(\d+)$/;
const getLabelRe = /^\W*at (.*) \($/;
/**
 * Parses a textual stack trace.
 */
class StackTraceParser {
    /** Gets whether the stacktrace has any locations in it. */
    static isStackLike(str) {
        return re1.test(str) || re2.test(str);
    }
    constructor(stack) {
        this.stack = stack;
    }
    /** Iterates over segments of text and locations in the stack. */
    *[Symbol.iterator]() {
        for (const line of this.stack.split('\n')) {
            const match = re1.exec(line) || re2.exec(line);
            if (!match) {
                yield line + '\n';
                continue;
            }
            const [, prefix, url, lineNo, columnNo, suffix] = match;
            if (prefix) {
                yield prefix;
            }
            yield new StackTraceLocation(getLabelRe.exec(prefix)?.[1], url, Number(lineNo), Number(columnNo));
            if (suffix) {
                yield suffix;
            }
            yield '\n';
        }
    }
}
exports.StackTraceParser = StackTraceParser;
class StackTraceLocation {
    constructor(label, path, lineBase1, columnBase1) {
        this.label = label;
        this.path = path;
        this.lineBase1 = lineBase1;
        this.columnBase1 = columnBase1;
    }
}
exports.StackTraceLocation = StackTraceLocation;
//# sourceMappingURL=stackTraceParser.js.map
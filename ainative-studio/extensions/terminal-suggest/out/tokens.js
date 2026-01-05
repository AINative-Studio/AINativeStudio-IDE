"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenType = getTokenType;
const shellTypeResetChars = new Map([
    ["bash" /* TerminalShellType.Bash */, ['>', '>>', '<', '2>', '2>>', '&>', '&>>', '|', '|&', '&&', '||', '&', ';', '(', '{', '<<']],
    ["zsh" /* TerminalShellType.Zsh */, ['>', '>>', '<', '2>', '2>>', '&>', '&>>', '<>', '|', '|&', '&&', '||', '&', ';', '(', '{', '<<', '<<<', '<(']],
    ["pwsh" /* TerminalShellType.PowerShell */, ['>', '>>', '<', '2>', '2>>', '*>', '*>>', '|', '-and', '-or', '-not', '!', '&', '-eq', '-ne', '-gt', '-lt', '-ge', '-le', '-like', '-notlike', '-match', '-notmatch', '-contains', '-notcontains', '-in', '-notin']]
]);
const defaultShellTypeResetChars = shellTypeResetChars.get("bash" /* TerminalShellType.Bash */);
function getTokenType(ctx, shellType) {
    const spaceIndex = ctx.commandLine.substring(0, ctx.cursorPosition).lastIndexOf(' ');
    if (spaceIndex === -1) {
        return 0 /* TokenType.Command */;
    }
    const previousTokens = ctx.commandLine.substring(0, spaceIndex + 1).trim();
    const commandResetChars = shellType === undefined ? defaultShellTypeResetChars : shellTypeResetChars.get(shellType) ?? defaultShellTypeResetChars;
    if (commandResetChars.some(e => previousTokens.endsWith(e))) {
        return 0 /* TokenType.Command */;
    }
    return 1 /* TokenType.Argument */;
}
//# sourceMappingURL=tokens.js.map
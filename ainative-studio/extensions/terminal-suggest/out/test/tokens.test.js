"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const node_assert_1 = require("node:assert");
const tokens_1 = require("../tokens");
suite('Terminal Suggest', () => {
    test('simple command', () => {
        (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo', cursorPosition: 'echo'.length }, undefined), 0 /* TokenType.Command */);
    });
    test('simple argument', () => {
        (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo hello', cursorPosition: 'echo hello'.length }, undefined), 1 /* TokenType.Argument */);
    });
    test('simple command, cursor mid text', () => {
        (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo hello', cursorPosition: 'echo'.length }, undefined), 0 /* TokenType.Command */);
    });
    test('simple argument, cursor mid text', () => {
        (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo hello', cursorPosition: 'echo hel'.length }, undefined), 1 /* TokenType.Argument */);
    });
    suite('reset to command', () => {
        test('|', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo hello | ', cursorPosition: 'echo hello | '.length }, undefined), 0 /* TokenType.Command */);
        });
        test(';', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo hello; ', cursorPosition: 'echo hello; '.length }, undefined), 0 /* TokenType.Command */);
        });
        test('&&', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo hello && ', cursorPosition: 'echo hello && '.length }, undefined), 0 /* TokenType.Command */);
        });
        test('||', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'echo hello || ', cursorPosition: 'echo hello || '.length }, undefined), 0 /* TokenType.Command */);
        });
    });
    suite('pwsh', () => {
        test('simple command', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'Write-Host', cursorPosition: 'Write-Host'.length }, "pwsh" /* TerminalShellType.PowerShell */), 0 /* TokenType.Command */);
        });
        test('simple argument', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: 'Write-Host hello', cursorPosition: 'Write-Host hello'.length }, "pwsh" /* TerminalShellType.PowerShell */), 1 /* TokenType.Argument */);
        });
        test('reset char', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: `Write-Host hello -and `, cursorPosition: `Write-Host hello -and `.length }, "pwsh" /* TerminalShellType.PowerShell */), 0 /* TokenType.Command */);
        });
        test('arguments after reset char', () => {
            (0, node_assert_1.strictEqual)((0, tokens_1.getTokenType)({ commandLine: `Write-Host hello -and $true `, cursorPosition: `Write-Host hello -and $true `.length }, "pwsh" /* TerminalShellType.PowerShell */), 1 /* TokenType.Argument */);
        });
    });
});
//# sourceMappingURL=tokens.test.js.map
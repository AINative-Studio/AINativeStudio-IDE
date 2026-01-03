"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeTestSuite = exports.codeSpecOptionsAndSubcommands = void 0;
exports.createCodeTestSpecs = createCodeTestSpecs;
require("mocha");
const code_1 = __importDefault(require("../../completions/code"));
const helpers_1 = require("../helpers");
const code_insiders_1 = __importDefault(require("../../completions/code-insiders"));
exports.codeSpecOptionsAndSubcommands = [
    '-a <folder>',
    '-d <file> <file>',
    '-g <file:line[:character]>',
    '-h',
    '-m <path1> <path2> <base> <result>',
    '-n',
    '-r',
    '-s',
    '-v',
    '-w',
    '-',
    '--add <folder>',
    '--category <category>',
    '--diff <file> <file>',
    '--disable-extension <extension-id>',
    '--disable-extensions',
    '--disable-gpu',
    '--enable-proposed-api',
    '--extensions-dir <dir>',
    '--goto <file:line[:character]>',
    '--help',
    '--inspect-brk-extensions <port>',
    '--inspect-extensions <port>',
    '--install-extension <extension-id[@version] | path-to-vsix>',
    '--list-extensions',
    '--locale <locale>',
    '--locate-shell-integration-path <shell>',
    '--log <level>',
    '--max-memory <memory>',
    '--merge <path1> <path2> <base> <result>',
    '--new-window',
    '--pre-release',
    '--prof-startup',
    '--profile <settingsProfileName>',
    '--reuse-window',
    '--show-versions',
    '--status',
    '--sync <sync>',
    '--telemetry',
    '--uninstall-extension <extension-id>',
    '--user-data-dir <dir>',
    '--verbose',
    '--version',
    '--wait',
    'tunnel',
    'serve-web',
    'help',
    'status',
    'version'
];
function createCodeTestSpecs(executable) {
    const localeOptions = ['bg', 'de', 'en', 'es', 'fr', 'hu', 'it', 'ja', 'ko', 'pt-br', 'ru', 'tr', 'zh-CN', 'zh-TW'];
    const categoryOptions = ['azure', 'data science', 'debuggers', 'extension packs', 'education', 'formatters', 'keymaps', 'language packs', 'linters', 'machine learning', 'notebooks', 'programming languages', 'scm providers', 'snippets', 'testing', 'themes', 'visualization', 'other'];
    const logOptions = ['critical', 'error', 'warn', 'info', 'debug', 'trace', 'off'];
    const syncOptions = ['on', 'off'];
    const typingTests = [];
    for (let i = 1; i < executable.length; i++) {
        const expectedCompletions = [{ label: executable, description: executable === code_1.default.name ? code_1.default.description : code_insiders_1.default.description }];
        const input = `${executable.slice(0, i)}|`;
        typingTests.push({ input, expectedCompletions, expectedResourceRequests: input.endsWith(' ') ? undefined : { type: 'both', cwd: helpers_1.testPaths.cwd } });
    }
    return [
        // Typing the command
        ...typingTests,
        // Basic arguments
        { input: `${executable} |`, expectedCompletions: exports.codeSpecOptionsAndSubcommands, expectedResourceRequests: { type: 'both', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --locale |`, expectedCompletions: localeOptions },
        { input: `${executable} --diff |`, expectedResourceRequests: { type: 'files', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --diff ./file1 |`, expectedResourceRequests: { type: 'files', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --merge |`, expectedResourceRequests: { type: 'files', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --merge ./file1 ./file2 |`, expectedResourceRequests: { type: 'files', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --merge ./file1 ./file2 ./base |`, expectedResourceRequests: { type: 'files', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --goto |`, expectedResourceRequests: { type: 'files', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --user-data-dir |`, expectedResourceRequests: { type: 'folders', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --profile |` },
        { input: `${executable} --install-extension |`, expectedCompletions: [executable], expectedResourceRequests: { type: 'both', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --uninstall-extension |`, expectedCompletions: [executable] },
        { input: `${executable} --disable-extension |`, expectedCompletions: [executable] },
        { input: `${executable} --log |`, expectedCompletions: logOptions },
        { input: `${executable} --sync |`, expectedCompletions: syncOptions },
        { input: `${executable} --extensions-dir |`, expectedResourceRequests: { type: 'folders', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --list-extensions |`, expectedCompletions: exports.codeSpecOptionsAndSubcommands.filter(c => c !== '--list-extensions'), expectedResourceRequests: { type: 'both', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --show-versions |`, expectedCompletions: exports.codeSpecOptionsAndSubcommands.filter(c => c !== '--show-versions'), expectedResourceRequests: { type: 'both', cwd: helpers_1.testPaths.cwd } },
        { input: `${executable} --category |`, expectedCompletions: categoryOptions },
        { input: `${executable} --category a|`, expectedCompletions: categoryOptions },
        // Middle of command
        { input: `${executable} | --locale`, expectedCompletions: exports.codeSpecOptionsAndSubcommands, expectedResourceRequests: { type: 'both', cwd: helpers_1.testPaths.cwd } },
    ];
}
exports.codeTestSuite = {
    name: 'code',
    completionSpecs: code_1.default,
    availableCommands: 'code',
    testSpecs: createCodeTestSpecs('code')
};
//# sourceMappingURL=code.test.js.map
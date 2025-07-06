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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.availableSpecs = void 0;
exports.activate = activate;
exports.resolveCwdFromPrefix = resolveCwdFromPrefix;
exports.asArray = asArray;
exports.getCompletionItemsFromSpecs = getCompletionItemsFromSpecs;
exports.sanitizeProcessEnvironment = sanitizeProcessEnvironment;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const cd_1 = __importDefault(require("./completions/cd"));
const code_1 = __importDefault(require("./completions/code"));
const code_insiders_1 = __importDefault(require("./completions/code-insiders"));
const npx_1 = __importDefault(require("./completions/npx"));
const set_location_1 = __importDefault(require("./completions/set-location"));
const constants_1 = require("./constants");
const pathExecutableCache_1 = require("./env/pathExecutableCache");
const os_1 = require("./helpers/os");
const uri_1 = require("./helpers/uri");
const bash_1 = require("./shell/bash");
const fish_1 = require("./shell/fish");
const pwsh_1 = require("./shell/pwsh");
const zsh_1 = require("./shell/zsh");
const tokens_1 = require("./tokens");
const completionItem_1 = require("./helpers/completionItem");
const figInterface_1 = require("./fig/figInterface");
const execute_1 = require("./fig/execute");
const promise_1 = require("./helpers/promise");
const code_tunnel_1 = __importDefault(require("./completions/code-tunnel"));
const code_tunnel_insiders_1 = __importDefault(require("./completions/code-tunnel-insiders"));
const isWindows = (0, os_1.osIsWindows)();
const cachedGlobals = new Map();
let pathExecutableCache;
exports.availableSpecs = [
    cd_1.default,
    code_insiders_1.default,
    code_1.default,
    code_tunnel_1.default,
    code_tunnel_insiders_1.default,
    npx_1.default,
    set_location_1.default,
];
for (const spec of constants_1.upstreamSpecs) {
    exports.availableSpecs.push(require(`./completions/upstream/${spec}`).default);
}
const getShellSpecificGlobals = new Map([
    ["bash" /* TerminalShellType.Bash */, bash_1.getBashGlobals],
    ["zsh" /* TerminalShellType.Zsh */, zsh_1.getZshGlobals],
    // TODO: Ghost text in the command line prevents completions from working ATM for fish
    ["fish" /* TerminalShellType.Fish */, fish_1.getFishGlobals],
    ["pwsh" /* TerminalShellType.PowerShell */, pwsh_1.getPwshGlobals],
]);
async function getShellGlobals(shellType, existingCommands) {
    try {
        const cachedCommands = cachedGlobals.get(shellType);
        if (cachedCommands) {
            return cachedCommands;
        }
        if (!shellType) {
            return;
        }
        const options = { encoding: 'utf-8', shell: shellType };
        const mixedCommands = await getShellSpecificGlobals.get(shellType)?.(options, existingCommands);
        const normalizedCommands = mixedCommands?.map(command => typeof command === 'string' ? ({ label: command }) : command);
        cachedGlobals.set(shellType, normalizedCommands);
        return normalizedCommands;
    }
    catch (error) {
        console.error('Error fetching builtin commands:', error);
        return;
    }
}
async function activate(context) {
    pathExecutableCache = new pathExecutableCache_1.PathExecutableCache();
    context.subscriptions.push(pathExecutableCache);
    let currentTerminalEnv = process.env;
    context.subscriptions.push(vscode.window.registerTerminalCompletionProvider({
        id: 'terminal-suggest',
        async provideTerminalCompletions(terminal, terminalContext, token) {
            currentTerminalEnv = terminal.shellIntegration?.env?.value ?? process.env;
            if (token.isCancellationRequested) {
                console.debug('#terminalCompletions token cancellation requested');
                return;
            }
            const shellType = 'shell' in terminal.state ? terminal.state.shell : undefined;
            const terminalShellType = getTerminalShellType(shellType);
            if (!terminalShellType) {
                console.debug('#terminalCompletions No shell type found for terminal');
                return;
            }
            const commandsInPath = await pathExecutableCache.getExecutablesInPath(terminal.shellIntegration?.env?.value);
            const shellGlobals = await getShellGlobals(terminalShellType, commandsInPath?.labels) ?? [];
            if (!commandsInPath?.completionResources) {
                console.debug('#terminalCompletions No commands found in path');
                return;
            }
            // Order is important here, add shell globals first so they are prioritized over path commands
            const commands = [...shellGlobals, ...commandsInPath.completionResources];
            const prefix = getPrefix(terminalContext.commandLine, terminalContext.cursorPosition);
            const pathSeparator = isWindows ? '\\' : '/';
            const tokenType = (0, tokens_1.getTokenType)(terminalContext, terminalShellType);
            const result = await Promise.race([
                getCompletionItemsFromSpecs(exports.availableSpecs, terminalContext, commands, prefix, tokenType, terminal.shellIntegration?.cwd, getEnvAsRecord(currentTerminalEnv), terminal.name, token),
                (0, promise_1.createTimeoutPromise)(300, undefined)
            ]);
            if (!result) {
                return;
            }
            if (terminal.shellIntegration?.env) {
                const homeDirCompletion = result.items.find(i => i.label === '~');
                if (homeDirCompletion && terminal.shellIntegration.env?.value?.HOME) {
                    homeDirCompletion.documentation = (0, uri_1.getFriendlyResourcePath)(vscode.Uri.file(terminal.shellIntegration.env.value.HOME), pathSeparator, vscode.TerminalCompletionItemKind.Folder);
                    homeDirCompletion.kind = vscode.TerminalCompletionItemKind.Folder;
                }
            }
            if (result.cwd && (result.filesRequested || result.foldersRequested)) {
                return new vscode.TerminalCompletionList(result.items, { filesRequested: result.filesRequested, foldersRequested: result.foldersRequested, fileExtensions: result.fileExtensions, cwd: result.cwd, env: terminal.shellIntegration?.env?.value });
            }
            return result.items;
        }
    }, '/', '\\'));
    await (0, pathExecutableCache_1.watchPathDirectories)(context, currentTerminalEnv, pathExecutableCache);
}
/**
 * Adjusts the current working directory based on a given prefix if it is a folder.
 * @param prefix - The folder path prefix.
 * @param currentCwd - The current working directory.
 * @returns The new working directory.
 */
async function resolveCwdFromPrefix(prefix, currentCwd) {
    if (!currentCwd) {
        return;
    }
    try {
        // Get the nearest folder path from the prefix. This ignores everything after the `/` as
        // they are what triggers changes in the directory.
        let lastSlashIndex;
        if (isWindows) {
            // TODO: This support is very basic, ideally the slashes supported would depend upon the
            //       shell type. For example git bash under Windows does not allow using \ as a path
            //       separator.
            lastSlashIndex = prefix.lastIndexOf('\\');
            if (lastSlashIndex === -1) {
                lastSlashIndex = prefix.lastIndexOf('/');
            }
        }
        else {
            lastSlashIndex = prefix.lastIndexOf('/');
        }
        const relativeFolder = lastSlashIndex === -1 ? '' : prefix.slice(0, lastSlashIndex);
        // Resolve the absolute path of the prefix
        const resolvedPath = path.resolve(currentCwd?.fsPath, relativeFolder);
        const stat = await fs.stat(resolvedPath);
        // Check if the resolved path exists and is a directory
        if (stat.isDirectory()) {
            return currentCwd.with({ path: resolvedPath });
        }
    }
    catch {
        // Ignore errors
    }
    // No valid path found
    return undefined;
}
function getPrefix(commandLine, cursorPosition) {
    // Return an empty string if the command line is empty after trimming
    if (commandLine.trim() === '') {
        return '';
    }
    // Check if cursor is not at the end and there's non-whitespace after the cursor
    if (cursorPosition < commandLine.length && /\S/.test(commandLine[cursorPosition])) {
        return '';
    }
    // Extract the part of the line up to the cursor position
    const beforeCursor = commandLine.slice(0, cursorPosition);
    // Find the last sequence of non-whitespace characters before the cursor
    const match = beforeCursor.match(/(\S+)\s*$/);
    // Return the match if found, otherwise undefined
    return match ? match[0] : '';
}
function asArray(x) {
    return Array.isArray(x) ? x : [x];
}
async function getCompletionItemsFromSpecs(specs, terminalContext, availableCommands, prefix, tokenType, shellIntegrationCwd, env, name, token, executeExternals) {
    const items = [];
    let filesRequested = false;
    let foldersRequested = false;
    let hasCurrentArg = false;
    let fileExtensions;
    let precedingText = terminalContext.commandLine.slice(0, terminalContext.cursorPosition + 1);
    if (isWindows) {
        const spaceIndex = precedingText.indexOf(' ');
        const commandEndIndex = spaceIndex === -1 ? precedingText.length : spaceIndex;
        const lastDotIndex = precedingText.lastIndexOf('.', commandEndIndex);
        if (lastDotIndex > 0) { // Don't treat dotfiles as extensions
            precedingText = precedingText.substring(0, lastDotIndex) + precedingText.substring(spaceIndex);
        }
    }
    const result = await (0, figInterface_1.getFigSuggestions)(specs, terminalContext, availableCommands, prefix, tokenType, shellIntegrationCwd, env, name, precedingText, executeExternals ?? { executeCommand: execute_1.executeCommand, executeCommandTimeout: execute_1.executeCommandTimeout }, token);
    if (result) {
        hasCurrentArg || (hasCurrentArg = result.hasCurrentArg);
        filesRequested || (filesRequested = result.filesRequested);
        foldersRequested || (foldersRequested = result.foldersRequested);
        fileExtensions = result.fileExtensions;
        if (result.items) {
            items.push(...result.items);
        }
    }
    if (tokenType === 0 /* TokenType.Command */) {
        // Include builitin/available commands in the results
        const labels = new Set(items.map((i) => typeof i.label === 'string' ? i.label : i.label.label));
        for (const command of availableCommands) {
            const commandTextLabel = typeof command.label === 'string' ? command.label : command.label.label;
            if (!labels.has(commandTextLabel)) {
                items.push((0, completionItem_1.createCompletionItem)(terminalContext.cursorPosition, prefix, command, command.detail, command.documentation, vscode.TerminalCompletionItemKind.Method));
                labels.add(commandTextLabel);
            }
            else {
                const existingItem = items.find(i => (typeof i.label === 'string' ? i.label : i.label.label) === commandTextLabel);
                if (!existingItem) {
                    continue;
                }
                const preferredItem = compareItems(existingItem, command);
                if (preferredItem) {
                    preferredItem.kind = vscode.TerminalCompletionItemKind.Method;
                    items.splice(items.indexOf(existingItem), 1, preferredItem);
                }
            }
        }
        filesRequested = true;
        foldersRequested = true;
    }
    // For arguments when no fig suggestions are found these are fallback suggestions
    else if (!items.length && !filesRequested && !foldersRequested && !hasCurrentArg) {
        if (terminalContext.allowFallbackCompletions) {
            filesRequested = true;
            foldersRequested = true;
        }
    }
    let cwd;
    if (shellIntegrationCwd && (filesRequested || foldersRequested)) {
        cwd = await resolveCwdFromPrefix(prefix, shellIntegrationCwd);
    }
    return { items, filesRequested, foldersRequested, fileExtensions, cwd };
}
function compareItems(existingItem, command) {
    let score = typeof command.label === 'object' ? (command.label.detail !== undefined ? 1 : 0) : 0;
    score += typeof command.label === 'object' ? (command.label.description !== undefined ? 2 : 0) : 0;
    score += command.documentation ? typeof command.documentation === 'string' ? 2 : 3 : 0;
    if (score > 0) {
        score -= typeof existingItem.label === 'object' ? (existingItem.label.detail !== undefined ? 1 : 0) : 0;
        score -= typeof existingItem.label === 'object' ? (existingItem.label.description !== undefined ? 2 : 0) : 0;
        score -= existingItem.documentation ? typeof existingItem.documentation === 'string' ? 2 : 3 : 0;
        if (score >= 0) {
            return { ...command, replacementIndex: existingItem.replacementIndex, replacementLength: existingItem.replacementLength };
        }
    }
}
function getEnvAsRecord(shellIntegrationEnv) {
    const env = {};
    for (const [key, value] of Object.entries(shellIntegrationEnv ?? process.env)) {
        if (typeof value === 'string') {
            env[key] = value;
        }
    }
    if (!shellIntegrationEnv) {
        sanitizeProcessEnvironment(env);
    }
    return env;
}
function getTerminalShellType(shellType) {
    switch (shellType) {
        case 'bash':
            return "bash" /* TerminalShellType.Bash */;
        case 'zsh':
            return "zsh" /* TerminalShellType.Zsh */;
        case 'pwsh':
            return "pwsh" /* TerminalShellType.PowerShell */;
        case 'fish':
            return "fish" /* TerminalShellType.Fish */;
        case 'python':
            return "python" /* TerminalShellType.Python */;
        default:
            return undefined;
    }
}
function sanitizeProcessEnvironment(env, ...preserve) {
    const set = preserve.reduce((set, key) => {
        set[key] = true;
        return set;
    }, {});
    const keysToRemove = [
        /^ELECTRON_.$/,
        /^VSCODE_(?!(PORTABLE|SHELL_LOGIN|ENV_REPLACE|ENV_APPEND|ENV_PREPEND)).$/,
        /^SNAP(|_.*)$/,
        /^GDK_PIXBUF_.$/,
    ];
    const envKeys = Object.keys(env);
    envKeys
        .filter(key => !set[key])
        .forEach(envKey => {
        for (let i = 0; i < keysToRemove.length; i++) {
            if (envKey.search(keysToRemove[i]) !== -1) {
                delete env[envKey];
                break;
            }
        }
    });
}
//# sourceMappingURL=terminalSuggestMain.js.map
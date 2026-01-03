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
exports.getFigSuggestions = getFigSuggestions;
exports.collectCompletionItemResult = collectCompletionItemResult;
exports.getFixSuggestionDescription = getFixSuggestionDescription;
exports.getFigSuggestionLabel = getFigSuggestionLabel;
const vscode = __importStar(require("vscode"));
const parseArguments_1 = require("./autocomplete-parser/parseArguments");
const generators_1 = require("./autocomplete/state/generators");
const types_1 = require("./autocomplete/state/types");
const utils_1 = require("./shared/utils");
const command_1 = require("./shell-parser/command");
const completionItem_1 = require("../helpers/completionItem");
const os_1 = require("../helpers/os");
const file_1 = require("../helpers/file");
const terminalSuggestMain_1 = require("../terminalSuggestMain");
async function getFigSuggestions(specs, terminalContext, availableCommands, prefix, tokenType, shellIntegrationCwd, env, name, precedingText, executeExternals, token) {
    const result = {
        filesRequested: false,
        foldersRequested: false,
        hasCurrentArg: false,
        items: [],
    };
    for (const spec of specs) {
        const specLabels = getFigSuggestionLabel(spec);
        if (!specLabels) {
            continue;
        }
        for (const specLabel of specLabels) {
            const availableCommand = ((0, os_1.osIsWindows)()
                ? availableCommands.find(command => (typeof command.label === 'string' ? command.label : command.label.label).match(new RegExp(`${specLabel}(\\.[^ ]+)?$`)))
                : availableCommands.find(command => (typeof command.label === 'string' ? command.label : command.label.label) === (specLabel)));
            if (!availableCommand || (token && token.isCancellationRequested)) {
                continue;
            }
            // push it to the completion items
            if (tokenType === 0 /* TokenType.Command */) {
                if (availableCommand.kind !== vscode.TerminalCompletionItemKind.Alias) {
                    const description = getFixSuggestionDescription(spec);
                    result.items.push((0, completionItem_1.createCompletionItem)(terminalContext.cursorPosition, prefix, {
                        label: { label: specLabel, description },
                        kind: vscode.TerminalCompletionItemKind.Method
                    }, description, availableCommand.detail));
                }
                continue;
            }
            const commandAndAliases = ((0, os_1.osIsWindows)()
                ? availableCommands.filter(command => specLabel === (0, file_1.removeAnyFileExtension)(command.definitionCommand ?? (typeof command.label === 'string' ? command.label : command.label.label)))
                : availableCommands.filter(command => specLabel === (command.definitionCommand ?? (typeof command.label === 'string' ? command.label : command.label.label))));
            if (!((0, os_1.osIsWindows)()
                ? commandAndAliases.some(e => precedingText.startsWith(`${(0, file_1.removeAnyFileExtension)((typeof e.label === 'string' ? e.label : e.label.label))} `))
                : commandAndAliases.some(e => precedingText.startsWith(`${typeof e.label === 'string' ? e.label : e.label.label} `)))) {
                continue;
            }
            const actualSpec = availableCommand.definitionCommand ? terminalSuggestMain_1.availableSpecs.find(s => s.name === availableCommand.definitionCommand) : spec;
            if (!actualSpec) {
                continue;
            }
            const completionItemResult = await getFigSpecSuggestions(actualSpec, terminalContext, prefix, shellIntegrationCwd, env, name, executeExternals, token);
            result.hasCurrentArg || (result.hasCurrentArg = !!completionItemResult?.hasCurrentArg);
            if (completionItemResult) {
                result.filesRequested || (result.filesRequested = completionItemResult.filesRequested);
                result.foldersRequested || (result.foldersRequested = completionItemResult.foldersRequested);
                result.fileExtensions || (result.fileExtensions = completionItemResult.fileExtensions);
                if (completionItemResult.items) {
                    result.items.push(...completionItemResult.items);
                }
            }
        }
    }
    return result;
}
async function getFigSpecSuggestions(spec, terminalContext, prefix, shellIntegrationCwd, env, name, executeExternals, token) {
    let filesRequested = false;
    let foldersRequested = false;
    let fileExtensions;
    const command = (0, command_1.getCommand)(terminalContext.commandLine, {}, terminalContext.cursorPosition);
    if (!command || !shellIntegrationCwd) {
        return;
    }
    const shellContext = {
        environmentVariables: env,
        currentWorkingDirectory: shellIntegrationCwd.fsPath,
        sshPrefix: '',
        currentProcess: name,
        // TODO: pass in aliases
    };
    const parsedArguments = await (0, parseArguments_1.parseArguments)(command, shellContext, spec, executeExternals);
    const items = [];
    // TODO: Pass in and respect cancellation token
    const completionItemResult = await collectCompletionItemResult(command, parsedArguments, prefix, terminalContext, shellIntegrationCwd, env, items, executeExternals);
    if (token?.isCancellationRequested) {
        return undefined;
    }
    if (completionItemResult) {
        filesRequested = completionItemResult.filesRequested;
        foldersRequested = completionItemResult.foldersRequested;
        fileExtensions = completionItemResult.fileExtensions;
    }
    return {
        filesRequested,
        foldersRequested,
        fileExtensions,
        hasCurrentArg: !!parsedArguments.currentArg,
        items,
    };
}
async function collectCompletionItemResult(command, parsedArguments, prefix, terminalContext, shellIntegrationCwd, env, items, executeExternals) {
    let filesRequested = false;
    let foldersRequested = false;
    let fileExtensions;
    const addSuggestions = async (specArgs, kind, parsedArguments) => {
        if (kind === vscode.TerminalCompletionItemKind.Argument && parsedArguments?.currentArg?.generators) {
            const generators = parsedArguments.currentArg.generators;
            const initialFigState = {
                buffer: terminalContext.commandLine,
                cursorLocation: terminalContext.cursorPosition,
                cwd: shellIntegrationCwd?.fsPath ?? null,
                processUserIsIn: null,
                sshContextString: null,
                aliases: {},
                environmentVariables: env,
                shellContext: {
                    currentWorkingDirectory: shellIntegrationCwd?.fsPath,
                    environmentVariables: convertEnvRecordToArray(env),
                },
            };
            const state = {
                figState: initialFigState,
                parserResult: parsedArguments,
                generatorStates: [],
                command,
                visibleState: types_1.Visibility.HIDDEN_UNTIL_KEYPRESS,
                lastInsertedSuggestion: null,
                justInserted: false,
                selectedIndex: 0,
                suggestions: [],
                hasChangedIndex: false,
                historyModeEnabled: false,
                fuzzySearchEnabled: false,
                userFuzzySearchEnabled: false,
            };
            const s = (0, generators_1.createGeneratorState)(state, executeExternals);
            const generatorResults = s.triggerGenerators(parsedArguments, executeExternals);
            for (const generatorResult of generatorResults) {
                for (const item of (await generatorResult?.request) ?? []) {
                    if (item.type === 'file') {
                        filesRequested = true;
                        foldersRequested = true;
                        fileExtensions = item._internal?.fileExtensions;
                    }
                    if (item.type === 'folder') {
                        foldersRequested = true;
                    }
                    if (!item.name) {
                        continue;
                    }
                    const suggestionLabels = getFigSuggestionLabel(item);
                    if (!suggestionLabels) {
                        continue;
                    }
                    for (const label of suggestionLabels) {
                        items.push((0, completionItem_1.createCompletionItem)(terminalContext.cursorPosition, prefix, { label }, undefined, typeof item === 'string' ? item : item.description, kind));
                    }
                }
            }
            for (const generator of generators) {
                // Only some templates are supported, these are applied generally before calling
                // into the general fig code for now
                if (generator.template) {
                    const templates = Array.isArray(generator.template) ? generator.template : [generator.template];
                    for (const template of templates) {
                        if (template === 'filepaths') {
                            filesRequested = true;
                        }
                        else if (template === 'folders') {
                            foldersRequested = true;
                        }
                    }
                }
            }
        }
        if (!specArgs) {
            return { filesRequested, foldersRequested };
        }
        const flagsToExclude = kind === vscode.TerminalCompletionItemKind.Flag ? parsedArguments?.passedOptions.map(option => option.name).flat() : undefined;
        function addItem(label, item) {
            if (flagsToExclude?.includes(label)) {
                return;
            }
            let itemKind = kind;
            const lastArgType = parsedArguments?.annotations.at(-1)?.type;
            if (lastArgType === 'subcommand_arg') {
                if (typeof item === 'object' && 'args' in item && ((0, terminalSuggestMain_1.asArray)(item.args ?? [])).length > 0) {
                    itemKind = vscode.TerminalCompletionItemKind.Option;
                }
            }
            else if (lastArgType === 'option_arg') {
                itemKind = vscode.TerminalCompletionItemKind.OptionValue;
            }
            // Add <argName> for every argument
            let detail;
            if (typeof item === 'object' && 'args' in item) {
                const args = (0, terminalSuggestMain_1.asArray)(item.args);
                if (args.every(e => !!e?.name)) {
                    if (args.length > 0) {
                        detail = ' ' + args.map(e => {
                            let result = `<${e.name}>`;
                            if (e?.isOptional) {
                                result = `[${result}]`;
                            }
                            return result;
                        }).join(' ');
                    }
                }
            }
            items.push((0, completionItem_1.createCompletionItem)(terminalContext.cursorPosition, prefix, {
                label: detail ? { label, detail } : label
            }, undefined, typeof item === 'string' ? item : item.description, itemKind));
        }
        if (Array.isArray(specArgs)) {
            for (const item of specArgs) {
                const suggestionLabels = getFigSuggestionLabel(item);
                if (!suggestionLabels?.length) {
                    continue;
                }
                for (const label of suggestionLabels) {
                    addItem(label, item);
                }
            }
        }
        else {
            for (const [label, item] of Object.entries(specArgs)) {
                addItem(label, item);
            }
        }
    };
    if (parsedArguments.suggestionFlags & utils_1.SuggestionFlag.Args) {
        await addSuggestions(parsedArguments.currentArg?.suggestions, vscode.TerminalCompletionItemKind.Argument, parsedArguments);
    }
    if (parsedArguments.suggestionFlags & utils_1.SuggestionFlag.Subcommands) {
        await addSuggestions(parsedArguments.completionObj.subcommands, vscode.TerminalCompletionItemKind.Method);
    }
    if (parsedArguments.suggestionFlags & utils_1.SuggestionFlag.Options) {
        await addSuggestions(parsedArguments.completionObj.options, vscode.TerminalCompletionItemKind.Flag, parsedArguments);
    }
    return { filesRequested, foldersRequested, fileExtensions };
}
function convertEnvRecordToArray(env) {
    return Object.entries(env).map(([key, value]) => ({ key, value }));
}
function getFixSuggestionDescription(spec) {
    if ('description' in spec) {
        return spec.description ?? '';
    }
    return '';
}
function getFigSuggestionLabel(spec) {
    if (typeof spec === 'string') {
        return [spec];
    }
    if (typeof spec.name === 'string') {
        return [spec.name];
    }
    if (!Array.isArray(spec.name) || spec.name.length === 0) {
        return;
    }
    return spec.name;
}
//# sourceMappingURL=figInterface.js.map
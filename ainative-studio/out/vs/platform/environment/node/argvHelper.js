/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { localize } from '../../../nls.js';
import { NATIVE_CLI_COMMANDS, OPTIONS, parseArgs } from './argv.js';
function parseAndValidate(cmdLineArgs, reportWarnings) {
    const onMultipleValues = (id, val) => {
        console.warn(localize('multipleValues', "Option '{0}' is defined more than once. Using value '{1}'.", id, val));
    };
    const onEmptyValue = (id) => {
        console.warn(localize('emptyValue', "Option '{0}' requires a non empty value. Ignoring the option.", id));
    };
    const onDeprecatedOption = (deprecatedOption, message) => {
        console.warn(localize('deprecatedArgument', "Option '{0}' is deprecated: {1}", deprecatedOption, message));
    };
    const getSubcommandReporter = (command) => ({
        onUnknownOption: (id) => {
            if (!NATIVE_CLI_COMMANDS.includes(command)) {
                console.warn(localize('unknownSubCommandOption', "Warning: '{0}' is not in the list of known options for subcommand '{1}'", id, command));
            }
        },
        onMultipleValues,
        onEmptyValue,
        onDeprecatedOption,
        getSubcommandReporter: NATIVE_CLI_COMMANDS.includes(command) ? getSubcommandReporter : undefined
    });
    const errorReporter = {
        onUnknownOption: (id) => {
            console.warn(localize('unknownOption', "Warning: '{0}' is not in the list of known options, but still passed to Electron/Chromium.", id));
        },
        onMultipleValues,
        onEmptyValue,
        onDeprecatedOption,
        getSubcommandReporter
    };
    const args = parseArgs(cmdLineArgs, OPTIONS, reportWarnings ? errorReporter : undefined);
    if (args.goto) {
        args._.forEach(arg => assert(/^(\w:)?[^:]+(:\d*){0,2}:?$/.test(arg), localize('gotoValidation', "Arguments in `--goto` mode should be in the format of `FILE(:LINE(:CHARACTER))`.")));
    }
    return args;
}
function stripAppPath(argv) {
    const index = argv.findIndex(a => !/^-/.test(a));
    if (index > -1) {
        return [...argv.slice(0, index), ...argv.slice(index + 1)];
    }
    return undefined;
}
/**
 * Use this to parse raw code process.argv such as: `Electron . --verbose --wait`
 */
export function parseMainProcessArgv(processArgv) {
    let [, ...args] = processArgv;
    // If dev, remove the first non-option argument: it's the app location
    if (process.env['VSCODE_DEV']) {
        args = stripAppPath(args) || [];
    }
    // If called from CLI, don't report warnings as they are already reported.
    const reportWarnings = !isLaunchedFromCli(process.env);
    return parseAndValidate(args, reportWarnings);
}
/**
 * Use this to parse raw code CLI process.argv such as: `Electron cli.js . --verbose --wait`
 */
export function parseCLIProcessArgv(processArgv) {
    let [, , ...args] = processArgv; // remove the first non-option argument: it's always the app location
    // If dev, remove the first non-option argument: it's the app location
    if (process.env['VSCODE_DEV']) {
        args = stripAppPath(args) || [];
    }
    return parseAndValidate(args, true);
}
export function addArg(argv, ...args) {
    const endOfArgsMarkerIndex = argv.indexOf('--');
    if (endOfArgsMarkerIndex === -1) {
        argv.push(...args);
    }
    else {
        // if the we have an argument "--" (end of argument marker)
        // we cannot add arguments at the end. rather, we add
        // arguments before the "--" marker.
        argv.splice(endOfArgsMarkerIndex, 0, ...args);
    }
    return argv;
}
export function isLaunchedFromCli(env) {
    return env['VSCODE_CLI'] === '1';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndkhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L25vZGUvYXJndkhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTNDLE9BQU8sRUFBaUIsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVuRixTQUFTLGdCQUFnQixDQUFDLFdBQXFCLEVBQUUsY0FBdUI7SUFDdkUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEVBQVUsRUFBRSxHQUFXLEVBQUUsRUFBRTtRQUNwRCxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSw0REFBNEQsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNqSCxDQUFDLENBQUM7SUFDRixNQUFNLFlBQVksR0FBRyxDQUFDLEVBQVUsRUFBRSxFQUFFO1FBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSwrREFBK0QsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNHLENBQUMsQ0FBQztJQUNGLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxnQkFBd0IsRUFBRSxPQUFlLEVBQUUsRUFBRTtRQUN4RSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxpQ0FBaUMsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzVHLENBQUMsQ0FBQztJQUNGLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxPQUFlLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkQs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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import minimist from 'minimist';
import { isWindows } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
/**
 * This code is also used by standalone cli's. Avoid adding any other dependencies.
 */
const helpCategories = {
    o: localize('optionsUpperCase', "Options"),
    e: localize('extensionsManagement', "Extensions Management"),
    t: localize('troubleshooting', "Troubleshooting")
};
export const NATIVE_CLI_COMMANDS = ['tunnel', 'serve-web'];
export const OPTIONS = {
    'tunnel': {
        type: 'subcommand',
        description: 'Make the current machine accessible from vscode.dev or other machines through a secure tunnel',
        options: {
            'cli-data-dir': { type: 'string', args: 'dir', description: localize('cliDataDir', "Directory where CLI metadata should be stored.") },
            'disable-telemetry': { type: 'boolean' },
            'telemetry-level': { type: 'string' },
            user: {
                type: 'subcommand',
                options: {
                    login: {
                        type: 'subcommand',
                        options: {
                            provider: { type: 'string' },
                            'access-token': { type: 'string' }
                        }
                    }
                }
            }
        }
    },
    'serve-web': {
        type: 'subcommand',
        description: 'Run a server that displays the editor UI in browsers.',
        options: {
            'cli-data-dir': { type: 'string', args: 'dir', description: localize('cliDataDir', "Directory where CLI metadata should be stored.") },
            'disable-telemetry': { type: 'boolean' },
            'telemetry-level': { type: 'string' },
        }
    },
    'diff': { type: 'boolean', cat: 'o', alias: 'd', args: ['file', 'file'], description: localize('diff', "Compare two files with each other.") },
    'merge': { type: 'boolean', cat: 'o', alias: 'm', args: ['path1', 'path2', 'base', 'result'], description: localize('merge', "Perform a three-way merge by providing paths for two modified versions of a file, the common origin of both modified versions and the output file to save merge results.") },
    'add': { type: 'boolean', cat: 'o', alias: 'a', args: 'folder', description: localize('add', "Add folder(s) to the last active window.") },
    'remove': { type: 'boolean', cat: 'o', args: 'folder', description: localize('remove', "Remove folder(s) from the last active window.") },
    'goto': { type: 'boolean', cat: 'o', alias: 'g', args: 'file:line[:character]', description: localize('goto', "Open a file at the path on the specified line and character position.") },
    'new-window': { type: 'boolean', cat: 'o', alias: 'n', description: localize('newWindow', "Force to open a new window.") },
    'reuse-window': { type: 'boolean', cat: 'o', alias: 'r', description: localize('reuseWindow', "Force to open a file or folder in an already opened window.") },
    'wait': { type: 'boolean', cat: 'o', alias: 'w', description: localize('wait', "Wait for the files to be closed before returning.") },
    'waitMarkerFilePath': { type: 'string' },
    'locale': { type: 'string', cat: 'o', args: 'locale', description: localize('locale', "The locale to use (e.g. en-US or zh-TW).") },
    'user-data-dir': { type: 'string', cat: 'o', args: 'dir', description: localize('userDataDir', "Specifies the directory that user data is kept in. Can be used to open multiple distinct instances of Code.") },
    'profile': { type: 'string', 'cat': 'o', args: 'profileName', description: localize('profileName', "Opens the provided folder or workspace with the given profile and associates the profile with the workspace. If the profile does not exist, a new empty one is created.") },
    'help': { type: 'boolean', cat: 'o', alias: 'h', description: localize('help', "Print usage.") },
    'extensions-dir': { type: 'string', deprecates: ['extensionHomePath'], cat: 'e', args: 'dir', description: localize('extensionHomePath', "Set the root path for extensions.") },
    'extensions-download-dir': { type: 'string' },
    'builtin-extensions-dir': { type: 'string' },
    'list-extensions': { type: 'boolean', cat: 'e', description: localize('listExtensions', "List the installed extensions.") },
    'show-versions': { type: 'boolean', cat: 'e', description: localize('showVersions', "Show versions of installed extensions, when using --list-extensions.") },
    'category': { type: 'string', allowEmptyValue: true, cat: 'e', description: localize('category', "Filters installed extensions by provided category, when using --list-extensions."), args: 'category' },
    'install-extension': { type: 'string[]', cat: 'e', args: 'ext-id | path', description: localize('installExtension', "Installs or updates an extension. The argument is either an extension id or a path to a VSIX. The identifier of an extension is '${publisher}.${name}'. Use '--force' argument to update to latest version. To install a specific version provide '@${version}'. For example: 'vscode.csharp@1.2.3'.") },
    'pre-release': { type: 'boolean', cat: 'e', description: localize('install prerelease', "Installs the pre-release version of the extension, when using --install-extension") },
    'uninstall-extension': { type: 'string[]', cat: 'e', args: 'ext-id', description: localize('uninstallExtension', "Uninstalls an extension.") },
    'update-extensions': { type: 'boolean', cat: 'e', description: localize('updateExtensions', "Update the installed extensions.") },
    'enable-proposed-api': { type: 'string[]', allowEmptyValue: true, cat: 'e', args: 'ext-id', description: localize('experimentalApis', "Enables proposed API features for extensions. Can receive one or more extension IDs to enable individually.") },
    'add-mcp': { type: 'string[]', cat: 'o', args: 'json', description: localize('addMcp', "Adds a Model Context Protocol server definition to the user profile, or workspace or folder when used with --mcp-workspace. Accepts JSON input in the form '{\"name\":\"server-name\",\"command\":...}'") },
    'version': { type: 'boolean', cat: 't', alias: 'v', description: localize('version', "Print version.") },
    'verbose': { type: 'boolean', cat: 't', global: true, description: localize('verbose', "Print verbose output (implies --wait).") },
    'log': { type: 'string[]', cat: 't', args: 'level', global: true, description: localize('log', "Log level to use. Default is 'info'. Allowed values are 'critical', 'error', 'warn', 'info', 'debug', 'trace', 'off'. You can also configure the log level of an extension by passing extension id and log level in the following format: '${publisher}.${name}:${logLevel}'. For example: 'vscode.csharp:trace'. Can receive one or more such entries.") },
    'status': { type: 'boolean', alias: 's', cat: 't', description: localize('status', "Print process usage and diagnostics information.") },
    'prof-startup': { type: 'boolean', cat: 't', description: localize('prof-startup', "Run CPU profiler during startup.") },
    'prof-append-timers': { type: 'string' },
    'prof-duration-markers': { type: 'string[]' },
    'prof-duration-markers-file': { type: 'string' },
    'no-cached-data': { type: 'boolean' },
    'prof-startup-prefix': { type: 'string' },
    'prof-v8-extensions': { type: 'boolean' },
    'disable-extensions': { type: 'boolean', deprecates: ['disableExtensions'], cat: 't', description: localize('disableExtensions', "Disable all installed extensions. This option is not persisted and is effective only when the command opens a new window.") },
    'disable-extension': { type: 'string[]', cat: 't', args: 'ext-id', description: localize('disableExtension', "Disable the provided extension. This option is not persisted and is effective only when the command opens a new window.") },
    'sync': { type: 'string', cat: 't', description: localize('turn sync', "Turn sync on or off."), args: ['on | off'] },
    'inspect-extensions': { type: 'string', allowEmptyValue: true, deprecates: ['debugPluginHost'], args: 'port', cat: 't', description: localize('inspect-extensions', "Allow debugging and profiling of extensions. Check the developer tools for the connection URI.") },
    'inspect-brk-extensions': { type: 'string', allowEmptyValue: true, deprecates: ['debugBrkPluginHost'], args: 'port', cat: 't', description: localize('inspect-brk-extensions', "Allow debugging and profiling of extensions with the extension host being paused after start. Check the developer tools for the connection URI.") },
    'disable-lcd-text': { type: 'boolean', cat: 't', description: localize('disableLCDText', "Disable LCD font rendering.") },
    'disable-gpu': { type: 'boolean', cat: 't', description: localize('disableGPU', "Disable GPU hardware acceleration.") },
    'disable-chromium-sandbox': { type: 'boolean', cat: 't', description: localize('disableChromiumSandbox', "Use this option only when there is requirement to launch the application as sudo user on Linux or when running as an elevated user in an applocker environment on Windows.") },
    'sandbox': { type: 'boolean' },
    'locate-shell-integration-path': { type: 'string', cat: 't', args: ['shell'], description: localize('locateShellIntegrationPath', "Print the path to a terminal shell integration script. Allowed values are 'bash', 'pwsh', 'zsh' or 'fish'.") },
    'telemetry': { type: 'boolean', cat: 't', description: localize('telemetry', "Shows all telemetry events which VS code collects.") },
    'remote': { type: 'string', allowEmptyValue: true },
    'folder-uri': { type: 'string[]', cat: 'o', args: 'uri' },
    'file-uri': { type: 'string[]', cat: 'o', args: 'uri' },
    'locate-extension': { type: 'string[]' },
    'extensionDevelopmentPath': { type: 'string[]' },
    'extensionDevelopmentKind': { type: 'string[]' },
    'extensionTestsPath': { type: 'string' },
    'extensionEnvironment': { type: 'string' },
    'debugId': { type: 'string' },
    'debugRenderer': { type: 'boolean' },
    'inspect-ptyhost': { type: 'string', allowEmptyValue: true },
    'inspect-brk-ptyhost': { type: 'string', allowEmptyValue: true },
    'inspect-search': { type: 'string', deprecates: ['debugSearch'], allowEmptyValue: true },
    'inspect-brk-search': { type: 'string', deprecates: ['debugBrkSearch'], allowEmptyValue: true },
    'inspect-sharedprocess': { type: 'string', allowEmptyValue: true },
    'inspect-brk-sharedprocess': { type: 'string', allowEmptyValue: true },
    'export-default-configuration': { type: 'string' },
    'install-source': { type: 'string' },
    'enable-smoke-test-driver': { type: 'boolean' },
    'logExtensionHostCommunication': { type: 'boolean' },
    'skip-release-notes': { type: 'boolean' },
    'skip-welcome': { type: 'boolean' },
    'disable-telemetry': { type: 'boolean' },
    'disable-updates': { type: 'boolean' },
    'use-inmemory-secretstorage': { type: 'boolean', deprecates: ['disable-keytar'] },
    'password-store': { type: 'string' },
    'disable-workspace-trust': { type: 'boolean' },
    'disable-crash-reporter': { type: 'boolean' },
    'crash-reporter-directory': { type: 'string' },
    'crash-reporter-id': { type: 'string' },
    'skip-add-to-recently-opened': { type: 'boolean' },
    'open-url': { type: 'boolean' },
    'file-write': { type: 'boolean' },
    'file-chmod': { type: 'boolean' },
    'install-builtin-extension': { type: 'string[]' },
    'force': { type: 'boolean' },
    'do-not-sync': { type: 'boolean' },
    'do-not-include-pack-dependencies': { type: 'boolean' },
    'trace': { type: 'boolean' },
    'trace-memory-infra': { type: 'boolean' },
    'trace-category-filter': { type: 'string' },
    'trace-options': { type: 'string' },
    'preserve-env': { type: 'boolean' },
    'force-user-env': { type: 'boolean' },
    'force-disable-user-env': { type: 'boolean' },
    'open-devtools': { type: 'boolean' },
    'disable-gpu-sandbox': { type: 'boolean' },
    'logsPath': { type: 'string' },
    '__enable-file-policy': { type: 'boolean' },
    'editSessionId': { type: 'string' },
    'continueOn': { type: 'string' },
    'enable-coi': { type: 'boolean' },
    'unresponsive-sample-interval': { type: 'string' },
    'unresponsive-sample-period': { type: 'string' },
    // chromium flags
    'no-proxy-server': { type: 'boolean' },
    // Minimist incorrectly parses keys that start with `--no`
    // https://github.com/substack/minimist/blob/aeb3e27dae0412de5c0494e9563a5f10c82cc7a9/index.js#L118-L121
    // If --no-sandbox is passed via cli wrapper it will be treated as --sandbox which is incorrect, we use
    // the alias here to make sure --no-sandbox is always respected.
    // For https://github.com/microsoft/vscode/issues/128279
    'no-sandbox': { type: 'boolean', alias: 'sandbox' },
    'proxy-server': { type: 'string' },
    'proxy-bypass-list': { type: 'string' },
    'proxy-pac-url': { type: 'string' },
    'js-flags': { type: 'string' }, // chrome js flags
    'inspect': { type: 'string', allowEmptyValue: true },
    'inspect-brk': { type: 'string', allowEmptyValue: true },
    'nolazy': { type: 'boolean' }, // node inspect
    'force-device-scale-factor': { type: 'string' },
    'force-renderer-accessibility': { type: 'boolean' },
    'ignore-certificate-errors': { type: 'boolean' },
    'allow-insecure-localhost': { type: 'boolean' },
    'log-net-log': { type: 'string' },
    'vmodule': { type: 'string' },
    '_urls': { type: 'string[]' },
    'disable-dev-shm-usage': { type: 'boolean' },
    'profile-temp': { type: 'boolean' },
    'ozone-platform': { type: 'string' },
    'enable-tracing': { type: 'string' },
    'trace-startup-format': { type: 'string' },
    'trace-startup-file': { type: 'string' },
    'trace-startup-duration': { type: 'string' },
    'xdg-portal-required-version': { type: 'string' },
    _: { type: 'string[]' } // main arguments
};
const ignoringReporter = {
    onUnknownOption: () => { },
    onMultipleValues: () => { },
    onEmptyValue: () => { },
    onDeprecatedOption: () => { }
};
export function parseArgs(args, options, errorReporter = ignoringReporter) {
    const firstArg = args.find(a => a.length > 0 && a[0] !== '-');
    const alias = {};
    const stringOptions = ['_'];
    const booleanOptions = [];
    const globalOptions = {};
    let command = undefined;
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            if (optionId === firstArg) {
                command = o;
            }
        }
        else {
            if (o.alias) {
                alias[optionId] = o.alias;
            }
            if (o.type === 'string' || o.type === 'string[]') {
                stringOptions.push(optionId);
                if (o.deprecates) {
                    stringOptions.push(...o.deprecates);
                }
            }
            else if (o.type === 'boolean') {
                booleanOptions.push(optionId);
                if (o.deprecates) {
                    booleanOptions.push(...o.deprecates);
                }
            }
            if (o.global) {
                globalOptions[optionId] = o;
            }
        }
    }
    if (command && firstArg) {
        const options = globalOptions;
        for (const optionId in command.options) {
            options[optionId] = command.options[optionId];
        }
        const newArgs = args.filter(a => a !== firstArg);
        const reporter = errorReporter.getSubcommandReporter ? errorReporter.getSubcommandReporter(firstArg) : undefined;
        const subcommandOptions = parseArgs(newArgs, options, reporter);
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            [firstArg]: subcommandOptions,
            _: []
        };
    }
    // remove aliases to avoid confusion
    const parsedArgs = minimist(args, { string: stringOptions, boolean: booleanOptions, alias });
    const cleanedArgs = {};
    const remainingArgs = parsedArgs;
    // https://github.com/microsoft/vscode/issues/58177, https://github.com/microsoft/vscode/issues/106617
    cleanedArgs._ = parsedArgs._.map(arg => String(arg)).filter(arg => arg.length > 0);
    delete remainingArgs._;
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            continue;
        }
        if (o.alias) {
            delete remainingArgs[o.alias];
        }
        let val = remainingArgs[optionId];
        if (o.deprecates) {
            for (const deprecatedId of o.deprecates) {
                if (remainingArgs.hasOwnProperty(deprecatedId)) {
                    if (!val) {
                        val = remainingArgs[deprecatedId];
                        if (val) {
                            errorReporter.onDeprecatedOption(deprecatedId, o.deprecationMessage || localize('deprecated.useInstead', 'Use {0} instead.', optionId));
                        }
                    }
                    delete remainingArgs[deprecatedId];
                }
            }
        }
        if (typeof val !== 'undefined') {
            if (o.type === 'string[]') {
                if (!Array.isArray(val)) {
                    val = [val];
                }
                if (!o.allowEmptyValue) {
                    const sanitized = val.filter((v) => v.length > 0);
                    if (sanitized.length !== val.length) {
                        errorReporter.onEmptyValue(optionId);
                        val = sanitized.length > 0 ? sanitized : undefined;
                    }
                }
            }
            else if (o.type === 'string') {
                if (Array.isArray(val)) {
                    val = val.pop(); // take the last
                    errorReporter.onMultipleValues(optionId, val);
                }
                else if (!val && !o.allowEmptyValue) {
                    errorReporter.onEmptyValue(optionId);
                    val = undefined;
                }
            }
            cleanedArgs[optionId] = val;
            if (o.deprecationMessage) {
                errorReporter.onDeprecatedOption(optionId, o.deprecationMessage);
            }
        }
        delete remainingArgs[optionId];
    }
    for (const key in remainingArgs) {
        errorReporter.onUnknownOption(key);
    }
    return cleanedArgs;
}
function formatUsage(optionId, option) {
    let args = '';
    if (option.args) {
        if (Array.isArray(option.args)) {
            args = ` <${option.args.join('> <')}>`;
        }
        else {
            args = ` <${option.args}>`;
        }
    }
    if (option.alias) {
        return `-${option.alias} --${optionId}${args}`;
    }
    return `--${optionId}${args}`;
}
// exported only for testing
export function formatOptions(options, columns) {
    const usageTexts = [];
    for (const optionId in options) {
        const o = options[optionId];
        const usageText = formatUsage(optionId, o);
        usageTexts.push([usageText, o.description]);
    }
    return formatUsageTexts(usageTexts, columns);
}
function formatUsageTexts(usageTexts, columns) {
    const maxLength = usageTexts.reduce((previous, e) => Math.max(previous, e[0].length), 12);
    const argLength = maxLength + 2 /*left padding*/ + 1 /*right padding*/;
    if (columns - argLength < 25) {
        // Use a condensed version on narrow terminals
        return usageTexts.reduce((r, ut) => r.concat([`  ${ut[0]}`, `      ${ut[1]}`]), []);
    }
    const descriptionColumns = columns - argLength - 1;
    const result = [];
    for (const ut of usageTexts) {
        const usage = ut[0];
        const wrappedDescription = wrapText(ut[1], descriptionColumns);
        const keyPadding = indent(argLength - usage.length - 2 /*left padding*/);
        result.push('  ' + usage + keyPadding + wrappedDescription[0]);
        for (let i = 1; i < wrappedDescription.length; i++) {
            result.push(indent(argLength) + wrappedDescription[i]);
        }
    }
    return result;
}
function indent(count) {
    return ' '.repeat(count);
}
function wrapText(text, columns) {
    const lines = [];
    while (text.length) {
        let index = text.length < columns ? text.length : text.lastIndexOf(' ', columns);
        if (index === 0) {
            index = columns;
        }
        const line = text.slice(0, index).trim();
        text = text.slice(index).trimStart();
        lines.push(line);
    }
    return lines;
}
export function buildHelpMessage(productName, executableName, version, options, capabilities) {
    const columns = (process.stdout).isTTY && (process.stdout).columns || 80;
    const inputFiles = capabilities?.noInputFiles !== true ? `[${localize('paths', 'paths')}...]` : '';
    const help = [`${productName} ${version}`];
    help.push('');
    help.push(`${localize('usage', "Usage")}: ${executableName} [${localize('options', "options")}]${inputFiles}`);
    help.push('');
    if (capabilities?.noPipe !== true) {
        if (isWindows) {
            help.push(localize('stdinWindows', "To read output from another program, append '-' (e.g. 'echo Hello World | {0} -')", executableName));
        }
        else {
            help.push(localize('stdinUnix', "To read from stdin, append '-' (e.g. 'ps aux | grep code | {0} -')", executableName));
        }
        help.push('');
    }
    const optionsByCategory = {};
    const subcommands = [];
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            if (o.description) {
                subcommands.push({ command: optionId, description: o.description });
            }
        }
        else if (o.description && o.cat) {
            let optionsByCat = optionsByCategory[o.cat];
            if (!optionsByCat) {
                optionsByCategory[o.cat] = optionsByCat = {};
            }
            optionsByCat[optionId] = o;
        }
    }
    for (const helpCategoryKey in optionsByCategory) {
        const key = helpCategoryKey;
        const categoryOptions = optionsByCategory[key];
        if (categoryOptions) {
            help.push(helpCategories[key]);
            help.push(...formatOptions(categoryOptions, columns));
            help.push('');
        }
    }
    if (subcommands.length) {
        help.push(localize('subcommands', "Subcommands"));
        help.push(...formatUsageTexts(subcommands.map(s => [s.command, s.description]), columns));
        help.push('');
    }
    return help.join('\n');
}
export function buildVersionMessage(version, commit) {
    return `${version || localize('unknownVersion', "Unknown version")}\n${commit || localize('unknownCommit', "Unknown commit")}\n${process.arch}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC9ub2RlL2FyZ3YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHM0M7O0dBRUc7QUFDSCxNQUFNLGNBQWMsR0FBRztJQUN0QixDQUFDLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQztJQUMxQyxDQUFDLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHVCQUF1QixDQUFDO0lBQzVELENBQUMsRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7Q0FDakQsQ0FBQztBQTZCRixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQVUsQ0FBQztBQUVwRSxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQW1EO0lBQ3RFLFFBQVEsRUFBRTtRQUNULElBQUksRUFBRSxZQUFZO1FBQ2xCLFdBQVcsRUFBRSwrRkFBK0Y7UUFDNUcsT0FBTyxFQUFFO1lBQ1IsY0FBYyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLGdEQUFnRCxDQUFDLEVBQUU7WUFDdEksbUJBQW1CLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQ3hDLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0wsSUFBSSxFQUFF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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { TerminalQuickFixType } from './quickFix.js';
export const GitCommandLineRegex = /git/;
export const GitFastForwardPullOutputRegex = /and can be fast-forwarded/;
export const GitPushCommandLineRegex = /git\s+push/;
export const GitTwoDashesRegex = /error: did you mean `--(.+)` \(with two dashes\)\?/;
export const GitSimilarOutputRegex = /(?:(most similar commands? (is|are)))/;
export const FreePortOutputRegex = /(?:address already in use (?:0\.0\.0\.0|127\.0\.0\.1|localhost|::):|Unable to bind [^ ]*:|can't listen on port |listen EADDRINUSE [^ ]*:)(?<portNumber>\d{4,5})/;
export const GitPushOutputRegex = /git push --set-upstream origin (?<branchName>[^\s]+)/;
// The previous line starts with "Create a pull request for \'([^\s]+)\' on GitHub by visiting:\s*"
// it's safe to assume it's a github pull request if the URL includes `/pull/`
export const GitCreatePrOutputRegex = /remote:\s*(?<link>https:\/\/github\.com\/.+\/.+\/pull\/new\/.+)/;
export const PwshGeneralErrorOutputRegex = /Suggestion \[General\]:/;
export const PwshUnixCommandNotFoundErrorOutputRegex = /Suggestion \[cmd-not-found\]:/;
export var QuickFixSource;
(function (QuickFixSource) {
    QuickFixSource["Builtin"] = "builtin";
})(QuickFixSource || (QuickFixSource = {}));
export function gitSimilar() {
    return {
        id: 'Git Similar',
        type: 'internal',
        commandLineMatcher: GitCommandLineRegex,
        outputMatcher: {
            lineMatcher: GitSimilarOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 10
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const regexMatch = matchResult.outputMatch?.regexMatch[0];
            if (!regexMatch || !matchResult.outputMatch) {
                return;
            }
            const actions = [];
            const startIndex = matchResult.outputMatch.outputLines.findIndex(l => l.includes(regexMatch)) + 1;
            const results = matchResult.outputMatch.outputLines.map(r => r.trim());
            for (let i = startIndex; i < results.length; i++) {
                const fixedCommand = results[i];
                if (fixedCommand) {
                    actions.push({
                        id: 'Git Similar',
                        type: TerminalQuickFixType.TerminalCommand,
                        terminalCommand: matchResult.commandLine.replace(/git\s+[^\s]+/, () => `git ${fixedCommand}`),
                        shouldExecute: true,
                        source: "builtin" /* QuickFixSource.Builtin */
                    });
                }
            }
            return actions;
        }
    };
}
export function gitFastForwardPull() {
    return {
        id: 'Git Fast Forward Pull',
        type: 'internal',
        commandLineMatcher: GitCommandLineRegex,
        outputMatcher: {
            lineMatcher: GitFastForwardPullOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 8
        },
        commandExitResult: 'success',
        getQuickFixes: (matchResult) => {
            return {
                type: TerminalQuickFixType.TerminalCommand,
                id: 'Git Fast Forward Pull',
                terminalCommand: `git pull`,
                shouldExecute: true,
                source: "builtin" /* QuickFixSource.Builtin */
            };
        }
    };
}
export function gitTwoDashes() {
    return {
        id: 'Git Two Dashes',
        type: 'internal',
        commandLineMatcher: GitCommandLineRegex,
        outputMatcher: {
            lineMatcher: GitTwoDashesRegex,
            anchor: 'bottom',
            offset: 0,
            length: 2
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const problemArg = matchResult?.outputMatch?.regexMatch?.[1];
            if (!problemArg) {
                return;
            }
            return {
                type: TerminalQuickFixType.TerminalCommand,
                id: 'Git Two Dashes',
                terminalCommand: matchResult.commandLine.replace(` -${problemArg}`, () => ` --${problemArg}`),
                shouldExecute: true,
                source: "builtin" /* QuickFixSource.Builtin */
            };
        }
    };
}
export function freePort(runCallback) {
    return {
        id: 'Free Port',
        type: 'internal',
        commandLineMatcher: /.+/,
        outputMatcher: {
            lineMatcher: FreePortOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 30
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const port = matchResult?.outputMatch?.regexMatch?.groups?.portNumber;
            if (!port) {
                return;
            }
            const label = localize("terminal.freePort", "Free port {0}", port);
            return {
                type: TerminalQuickFixType.Port,
                class: undefined,
                tooltip: label,
                id: 'Free Port',
                label,
                enabled: true,
                source: "builtin" /* QuickFixSource.Builtin */,
                run: () => runCallback(port, matchResult.commandLine)
            };
        }
    };
}
export function gitPushSetUpstream() {
    return {
        id: 'Git Push Set Upstream',
        type: 'internal',
        commandLineMatcher: GitPushCommandLineRegex,
        /**
            Example output on Windows:
            8: PS C:\Users\merogge\repos\xterm.js> git push
            7: fatal: The current branch sdjfskdjfdslkjf has no upstream branch.
            6: To push the current branch and set the remote as upstream, use
            5:
            4:	git push --set-upstream origin sdjfskdjfdslkjf
            3:
            2: To have this happen automatically for branches without a tracking
            1: upstream, see 'push.autoSetupRemote' in 'git help config'.
            0:

            Example output on macOS:
            5: meganrogge@Megans-MacBook-Pro xterm.js % git push
            4: fatal: The current branch merogge/asjdkfsjdkfsdjf has no upstream branch.
            3: To push the current branch and set the remote as upstream, use
            2:
            1:	git push --set-upstream origin merogge/asjdkfsjdkfsdjf
            0:
         */
        outputMatcher: {
            lineMatcher: GitPushOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 8
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const matches = matchResult.outputMatch;
            const commandToRun = 'git push --set-upstream origin ${group:branchName}';
            if (!matches) {
                return;
            }
            const groups = matches.regexMatch.groups;
            if (!groups) {
                return;
            }
            const actions = [];
            let fixedCommand = commandToRun;
            for (const [key, value] of Object.entries(groups)) {
                const varToResolve = '${group:' + `${key}` + '}';
                if (!commandToRun.includes(varToResolve)) {
                    return [];
                }
                fixedCommand = fixedCommand.replaceAll(varToResolve, () => value);
            }
            if (fixedCommand) {
                actions.push({
                    type: TerminalQuickFixType.TerminalCommand,
                    id: 'Git Push Set Upstream',
                    terminalCommand: fixedCommand,
                    shouldExecute: true,
                    source: "builtin" /* QuickFixSource.Builtin */
                });
                return actions;
            }
            return;
        }
    };
}
export function gitCreatePr() {
    return {
        id: 'Git Create Pr',
        type: 'internal',
        commandLineMatcher: GitPushCommandLineRegex,
        // Example output:
        // ...
        // 10: remote:
        // 9:  remote: Create a pull request for 'my_branch' on GitHub by visiting:
        // 8:  remote:      https://github.com/microsoft/vscode/pull/new/my_branch
        // 7:  remote:
        // 6:  remote: GitHub found x vulnerabilities on microsoft/vscode's default branch (...). To find out more, visit:
        // 5:  remote:      https://github.com/microsoft/vscode/security/dependabot
        // 4:  remote:
        // 3:  To https://github.com/microsoft/vscode
        // 2:  * [new branch]              my_branch -> my_branch
        // 1:  Branch 'my_branch' set up to track remote branch 'my_branch' from 'origin'.
        // 0:
        outputMatcher: {
            lineMatcher: GitCreatePrOutputRegex,
            anchor: 'bottom',
            offset: 4,
            // ~6 should only be needed here for security alerts, but the git provider can customize
            // the text, so use 12 to be safe.
            length: 12
        },
        commandExitResult: 'success',
        getQuickFixes: (matchResult) => {
            const link = matchResult?.outputMatch?.regexMatch?.groups?.link?.trimEnd();
            if (!link) {
                return;
            }
            const label = localize("terminal.createPR", "Create PR {0}", link);
            return {
                id: 'Git Create Pr',
                label,
                enabled: true,
                type: TerminalQuickFixType.Opener,
                uri: URI.parse(link),
                source: "builtin" /* QuickFixSource.Builtin */
            };
        }
    };
}
export function pwshGeneralError() {
    return {
        id: 'Pwsh General Error',
        type: 'internal',
        commandLineMatcher: /.+/,
        outputMatcher: {
            lineMatcher: PwshGeneralErrorOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 10
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const lines = matchResult.outputMatch?.regexMatch.input?.split('\n');
            if (!lines) {
                return;
            }
            // Find the start
            let i = 0;
            let inFeedbackProvider = false;
            for (; i < lines.length; i++) {
                if (lines[i].match(PwshGeneralErrorOutputRegex)) {
                    inFeedbackProvider = true;
                    break;
                }
            }
            if (!inFeedbackProvider) {
                return;
            }
            const suggestions = lines[i + 1].match(/The most similar commands are: (?<values>.+)./)?.groups?.values?.split(', ');
            if (!suggestions) {
                return;
            }
            const result = [];
            for (const suggestion of suggestions) {
                result.push({
                    id: 'Pwsh General Error',
                    type: TerminalQuickFixType.TerminalCommand,
                    terminalCommand: suggestion,
                    source: "builtin" /* QuickFixSource.Builtin */
                });
            }
            return result;
        }
    };
}
export function pwshUnixCommandNotFoundError() {
    return {
        id: 'Unix Command Not Found',
        type: 'internal',
        commandLineMatcher: /.+/,
        outputMatcher: {
            lineMatcher: PwshUnixCommandNotFoundErrorOutputRegex,
            anchor: 'bottom',
            offset: 0,
            length: 10
        },
        commandExitResult: 'error',
        getQuickFixes: (matchResult) => {
            const lines = matchResult.outputMatch?.regexMatch.input?.split('\n');
            if (!lines) {
                return;
            }
            // Find the start
            let i = 0;
            let inFeedbackProvider = false;
            for (; i < lines.length; i++) {
                if (lines[i].match(PwshUnixCommandNotFoundErrorOutputRegex)) {
                    inFeedbackProvider = true;
                    break;
                }
            }
            if (!inFeedbackProvider) {
                return;
            }
            // Always remove the first element as it's the "Suggestion [cmd-not-found]"" line
            const result = [];
            let inSuggestions = false;
            for (; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.length === 0) {
                    break;
                }
                const installCommand = line.match(/You also have .+ installed, you can run '(?<command>.+)' instead./)?.groups?.command;
                if (installCommand) {
                    result.push({
                        id: 'Pwsh Unix Command Not Found Error',
                        type: TerminalQuickFixType.TerminalCommand,
                        terminalCommand: installCommand,
                        source: "builtin" /* QuickFixSource.Builtin */
                    });
                    inSuggestions = false;
                    continue;
                }
                if (line.match(/Command '.+' not found, but can be installed with:/)) {
                    inSuggestions = true;
                    continue;
                }
                if (inSuggestions) {
                    result.push({
                        id: 'Pwsh Unix Command Not Found Error',
                        type: TerminalQuickFixType.TerminalCommand,
                        terminalCommand: line.trim(),
                        source: "builtin" /* QuickFixSource.Builtin */
                    });
                }
            }
            return result;
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0ZpeEJ1aWx0aW5BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0ZpeC9icm93c2VyL3Rlcm1pbmFsUXVpY2tGaXhCdWlsdGluQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBeUksb0JBQW9CLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFNUwsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDO0FBQ3pDLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLDJCQUEyQixDQUFDO0FBQ3pFLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLFlBQVksQ0FBQztBQUNwRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxvREFBb0QsQ0FBQztBQUN0RixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyx1Q0FBdUMsQ0FBQztBQUM3RSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxpS0FBaUssQ0FBQztBQUNyTSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxzREFBc0QsQ0FBQztBQUN6RixtR0FBbUc7QUFDbkcsOEVBQThFO0FBQzlFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGlFQUFpRSxDQUFDO0FBQ3hHLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLHlCQUF5QixDQUFDO0FBQ3JFLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLCtCQUErQixDQUFDO0FBRXZGLE1BQU0sQ0FBTixJQUFrQixj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
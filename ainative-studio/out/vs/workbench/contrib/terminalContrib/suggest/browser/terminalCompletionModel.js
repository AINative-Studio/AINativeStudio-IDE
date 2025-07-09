/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { count } from '../../../../../base/common/strings.js';
import { SimpleCompletionModel } from '../../../../services/suggest/browser/simpleCompletionModel.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
export class TerminalCompletionModel extends SimpleCompletionModel {
    constructor(items, lineContext) {
        super(items, lineContext, compareCompletionsFn);
    }
}
const compareCompletionsFn = (leadingLineContent, a, b) => {
    // Boost always on top inline completions
    if (a.completion.kind === TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop && a.completion.kind !== b.completion.kind) {
        return -1;
    }
    if (b.completion.kind === TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop && a.completion.kind !== b.completion.kind) {
        return 1;
    }
    // Sort by the score
    let score = b.score[0] - a.score[0];
    if (score !== 0) {
        return score;
    }
    // Boost inline completions
    if (a.completion.kind === TerminalCompletionItemKind.InlineSuggestion && a.completion.kind !== b.completion.kind) {
        return -1;
    }
    if (b.completion.kind === TerminalCompletionItemKind.InlineSuggestion && a.completion.kind !== b.completion.kind) {
        return 1;
    }
    // Sort by underscore penalty (eg. `__init__/` should be penalized)
    if (a.underscorePenalty !== b.underscorePenalty) {
        return a.underscorePenalty - b.underscorePenalty;
    }
    // Sort files of the same name by extension
    const isArg = leadingLineContent.includes(' ');
    if (!isArg && a.completion.kind === TerminalCompletionItemKind.File && b.completion.kind === TerminalCompletionItemKind.File) {
        // If the file name excluding the extension is different, just do a regular sort
        if (a.labelLowExcludeFileExt !== b.labelLowExcludeFileExt) {
            return a.labelLowExcludeFileExt.localeCompare(b.labelLowExcludeFileExt, undefined, { ignorePunctuation: true });
        }
        // Then by label length ascending (excluding file extension if it's a file)
        score = a.labelLowExcludeFileExt.length - b.labelLowExcludeFileExt.length;
        if (score !== 0) {
            return score;
        }
        // If they're files at the start of the command line, boost extensions depending on the operating system
        score = fileExtScore(b.fileExtLow) - fileExtScore(a.fileExtLow);
        if (score !== 0) {
            return score;
        }
        // Then by file extension length ascending
        score = a.fileExtLow.length - b.fileExtLow.length;
        if (score !== 0) {
            return score;
        }
    }
    // Sort by more detailed completions
    if (a.completion.kind === TerminalCompletionItemKind.Method && b.completion.kind === TerminalCompletionItemKind.Method) {
        if (typeof a.completion.label !== 'string' && a.completion.label.description && typeof b.completion.label !== 'string' && b.completion.label.description) {
            score = 0;
        }
        else if (typeof a.completion.label !== 'string' && a.completion.label.description) {
            score = -2;
        }
        else if (typeof b.completion.label !== 'string' && b.completion.label.description) {
            score = 2;
        }
        score += (b.completion.detail ? 1 : 0) + (b.completion.documentation ? 2 : 0) - (a.completion.detail ? 1 : 0) - (a.completion.documentation ? 2 : 0);
        if (score !== 0) {
            return score;
        }
    }
    // Sort by folder depth (eg. `vscode/` should come before `vscode-.../`)
    if (a.completion.kind === TerminalCompletionItemKind.Folder && b.completion.kind === TerminalCompletionItemKind.Folder) {
        if (a.labelLowNormalizedPath && b.labelLowNormalizedPath) {
            // Directories
            // Count depth of path (number of / or \ occurrences)
            score = count(a.labelLowNormalizedPath, '/') - count(b.labelLowNormalizedPath, '/');
            if (score !== 0) {
                return score;
            }
            // Ensure shorter prefixes appear first
            if (b.labelLowNormalizedPath.startsWith(a.labelLowNormalizedPath)) {
                return -1; // `a` is a prefix of `b`, so `a` should come first
            }
            if (a.labelLowNormalizedPath.startsWith(b.labelLowNormalizedPath)) {
                return 1; // `b` is a prefix of `a`, so `b` should come first
            }
        }
    }
    if (a.completion.kind !== b.completion.kind) {
        // Sort by kind
        if ((a.completion.kind === TerminalCompletionItemKind.Method || a.completion.kind === TerminalCompletionItemKind.Alias) && (b.completion.kind !== TerminalCompletionItemKind.Method && b.completion.kind !== TerminalCompletionItemKind.Alias)) {
            return -1; // Methods and aliases should come first
        }
        if ((b.completion.kind === TerminalCompletionItemKind.Method || b.completion.kind === TerminalCompletionItemKind.Alias) && (a.completion.kind !== TerminalCompletionItemKind.Method && a.completion.kind !== TerminalCompletionItemKind.Alias)) {
            return 1; // Methods and aliases should come first
        }
        if ((a.completion.kind === TerminalCompletionItemKind.File || a.completion.kind === TerminalCompletionItemKind.Folder) && (b.completion.kind !== TerminalCompletionItemKind.File && b.completion.kind !== TerminalCompletionItemKind.Folder)) {
            return 1; // Resources should come last
        }
        if ((b.completion.kind === TerminalCompletionItemKind.File || b.completion.kind === TerminalCompletionItemKind.Folder) && (a.completion.kind !== TerminalCompletionItemKind.File && a.completion.kind !== TerminalCompletionItemKind.Folder)) {
            return -1; // Resources should come last
        }
    }
    // Sort alphabetically, ignoring punctuation causes dot files to be mixed in rather than
    // all at the top
    return a.labelLow.localeCompare(b.labelLow, undefined, { ignorePunctuation: true });
};
// TODO: This should be based on the process OS, not the local OS
// File score boosts for specific file extensions on Windows. This only applies when the file is the
// _first_ part of the command line.
const fileExtScores = new Map(isWindows ? [
    // Windows - .ps1 > .exe > .bat > .cmd. This is the command precedence when running the files
    //           without an extension, tested manually in pwsh v7.4.4
    ['ps1', 0.09],
    ['exe', 0.08],
    ['bat', 0.07],
    ['cmd', 0.07],
    ['msi', 0.06],
    ['com', 0.06],
    // Non-Windows
    ['sh', -0.05],
    ['bash', -0.05],
    ['zsh', -0.05],
    ['fish', -0.05],
    ['csh', -0.06], // C shell
    ['ksh', -0.06], // Korn shell
    // Scripting language files are excluded here as the standard behavior on Windows will just open
    // the file in a text editor, not run the file
] : [
    // Pwsh
    ['ps1', 0.05],
    // Windows
    ['bat', -0.05],
    ['cmd', -0.05],
    ['exe', -0.05],
    // Non-Windows
    ['sh', 0.05],
    ['bash', 0.05],
    ['zsh', 0.05],
    ['fish', 0.05],
    ['csh', 0.04], // C shell
    ['ksh', 0.04], // Korn shell
    // Scripting languages
    ['py', 0.05], // Python
    ['pl', 0.05], // Perl
]);
function fileExtScore(ext) {
    return fileExtScores.get(ext) || 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbENvbXBsZXRpb25Nb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsMEJBQTBCLEVBQStCLE1BQU0sNkJBQTZCLENBQUM7QUFFdEcsTUFBTSxPQUFPLHVCQUF3QixTQUFRLHFCQUE2QztJQUN6RixZQUNDLEtBQStCLEVBQy9CLFdBQXdCO1FBRXhCLEtBQUssQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDakQsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLGtCQUEwQixFQUFFLENBQXlCLEVBQUUsQ0FBeUIsRUFBRSxFQUFFO0lBQ2pILHlDQUF5QztJQUN6QyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLDJCQUEyQixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0gsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNYLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLDJCQUEyQixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMs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
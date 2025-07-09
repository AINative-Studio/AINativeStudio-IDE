/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * This module is responsible for parsing possible links out of lines with only access to the line
 * text and the target operating system, ie. it does not do any validation that paths actually
 * exist.
 */
import { Lazy } from '../../../../../base/common/lazy.js';
/**
 * A regex that extracts the link suffix which contains line and column information. The link suffix
 * must terminate at the end of line.
 */
const linkSuffixRegexEol = new Lazy(() => generateLinkSuffixRegex(true));
/**
 * A regex that extracts the link suffix which contains line and column information.
 */
const linkSuffixRegex = new Lazy(() => generateLinkSuffixRegex(false));
function generateLinkSuffixRegex(eolOnly) {
    let ri = 0;
    let ci = 0;
    let rei = 0;
    let cei = 0;
    function r() {
        return `(?<row${ri++}>\\d+)`;
    }
    function c() {
        return `(?<col${ci++}>\\d+)`;
    }
    function re() {
        return `(?<rowEnd${rei++}>\\d+)`;
    }
    function ce() {
        return `(?<colEnd${cei++}>\\d+)`;
    }
    const eolSuffix = eolOnly ? '$' : '';
    // The comments in the regex below use real strings/numbers for better readability, here's
    // the legend:
    // - Path    = foo
    // - Row     = 339
    // - Col     = 12
    // - RowEnd  = 341
    // - ColEnd  = 789
    //
    // These all support single quote ' in the place of " and [] in the place of ()
    //
    // See the tests for an exhaustive list of all supported formats
    const lineAndColumnRegexClauses = [
        // foo:339
        // foo:339:12
        // foo:339:12-789
        // foo:339:12-341.789
        // foo:339.12
        // foo 339
        // foo 339:12                              [#140780]
        // foo 339.12
        // foo#339
        // foo#339:12                              [#190288]
        // foo#339.12
        // foo, 339                                [#217927]
        // "foo",339
        // "foo",339:12
        // "foo",339.12
        // "foo",339.12-789
        // "foo",339.12-341.789
        `(?::|#| |['"],|, )${r()}([:.]${c()}(?:-(?:${re()}\\.)?${ce()})?)?` + eolSuffix,
        // The quotes below are optional           [#171652]
        // "foo", line 339                         [#40468]
        // "foo", line 339, col 12
        // "foo", line 339, column 12
        // "foo":line 339
        // "foo":line 339, col 12
        // "foo":line 339, column 12
        // "foo": line 339
        // "foo": line 339, col 12
        // "foo": line 339, column 12
        // "foo" on line 339
        // "foo" on line 339, col 12
        // "foo" on line 339, column 12
        // "foo" line 339 column 12
        // "foo", line 339, character 12           [#171880]
        // "foo", line 339, characters 12-789      [#171880]
        // "foo", lines 339-341                    [#171880]
        // "foo", lines 339-341, characters 12-789 [#178287]
        `['"]?(?:,? |: ?| on )lines? ${r()}(?:-${re()})?(?:,? (?:col(?:umn)?|characters?) ${c()}(?:-${ce()})?)?` + eolSuffix,
        // () and [] are interchangeable
        // foo(339)
        // foo(339,12)
        // foo(339, 12)
        // foo (339)
        // foo (339,12)
        // foo (339, 12)
        // foo: (339)
        // foo: (339,12)
        // foo: (339, 12)
        // foo(339:12)                             [#229842]
        // foo (339:12)                            [#229842]
        `:? ?[\\[\\(]${r()}(?:(?:, ?|:)${c()})?[\\]\\)]` + eolSuffix,
    ];
    const suffixClause = lineAndColumnRegexClauses
        // Join all clauses together
        .join('|')
        // Convert spaces to allow the non-breaking space char (ascii 160)
        .replace(/ /g, `[${'\u00A0'} ]`);
    return new RegExp(`(${suffixClause})`, eolOnly ? undefined : 'g');
}
/**
 * Removes the optional link suffix which contains line and column information.
 * @param link The link to use.
 */
export function removeLinkSuffix(link) {
    const suffix = getLinkSuffix(link)?.suffix;
    if (!suffix) {
        return link;
    }
    return link.substring(0, suffix.index);
}
/**
 * Removes any query string from the link.
 * @param link The link to use.
 */
export function removeLinkQueryString(link) {
    // Skip ? in UNC paths
    const start = link.startsWith('\\\\?\\') ? 4 : 0;
    const index = link.indexOf('?', start);
    if (index === -1) {
        return link;
    }
    return link.substring(0, index);
}
export function detectLinkSuffixes(line) {
    // Find all suffixes on the line. Since the regex global flag is used, lastIndex will be updated
    // in place such that there are no overlapping matches.
    let match;
    const results = [];
    linkSuffixRegex.value.lastIndex = 0;
    while ((match = linkSuffixRegex.value.exec(line)) !== null) {
        const suffix = toLinkSuffix(match);
        if (suffix === null) {
            break;
        }
        results.push(suffix);
    }
    return results;
}
/**
 * Returns the optional link suffix which contains line and column information.
 * @param link The link to parse.
 */
export function getLinkSuffix(link) {
    return toLinkSuffix(linkSuffixRegexEol.value.exec(link));
}
export function toLinkSuffix(match) {
    const groups = match?.groups;
    if (!groups || match.length < 1) {
        return null;
    }
    return {
        row: parseIntOptional(groups.row0 || groups.row1 || groups.row2),
        col: parseIntOptional(groups.col0 || groups.col1 || groups.col2),
        rowEnd: parseIntOptional(groups.rowEnd0 || groups.rowEnd1 || groups.rowEnd2),
        colEnd: parseIntOptional(groups.colEnd0 || groups.colEnd1 || groups.colEnd2),
        suffix: { index: match.index, text: match[0] }
    };
}
function parseIntOptional(value) {
    if (value === undefined) {
        return value;
    }
    return parseInt(value);
}
// This defines valid path characters for a link with a suffix, the first `[]` of the regex includes
// characters the path is not allowed to _start_ with, the second `[]` includes characters not
// allowed at all in the path. If the characters show up in both regexes the link will stop at that
// character, otherwise it will stop at a space character.
const linkWithSuffixPathCharacters = /(?<path>(?:file:\/\/\/)?[^\s\|<>\[\({][^\s\|<>]*)$/;
export function detectLinks(line, os) {
    // 1: Detect all links on line via suffixes first
    const results = detectLinksViaSuffix(line);
    // 2: Detect all links without suffixes and merge non-conflicting ranges into the results
    const noSuffixPaths = detectPathsNoSuffix(line, os);
    binaryInsertList(results, noSuffixPaths);
    return results;
}
function binaryInsertList(list, newItems) {
    if (list.length === 0) {
        list.push(...newItems);
    }
    for (const item of newItems) {
        binaryInsert(list, item, 0, list.length);
    }
}
function binaryInsert(list, newItem, low, high) {
    if (list.length === 0) {
        list.push(newItem);
        return;
    }
    if (low > high) {
        return;
    }
    // Find the index where the newItem would be inserted
    const mid = Math.floor((low + high) / 2);
    if (mid >= list.length ||
        (newItem.path.index < list[mid].path.index && (mid === 0 || newItem.path.index > list[mid - 1].path.index))) {
        // Check if it conflicts with an existing link before adding
        if (mid >= list.length ||
            (newItem.path.index + newItem.path.text.length < list[mid].path.index && (mid === 0 || newItem.path.index > list[mid - 1].path.index + list[mid - 1].path.text.length))) {
            list.splice(mid, 0, newItem);
        }
        return;
    }
    if (newItem.path.index > list[mid].path.index) {
        binaryInsert(list, newItem, mid + 1, high);
    }
    else {
        binaryInsert(list, newItem, low, mid - 1);
    }
}
function detectLinksViaSuffix(line) {
    const results = [];
    // 1: Detect link suffixes on the line
    const suffixes = detectLinkSuffixes(line);
    for (const suffix of suffixes) {
        const beforeSuffix = line.substring(0, suffix.suffix.index);
        const possiblePathMatch = beforeSuffix.match(linkWithSuffixPathCharacters);
        if (possiblePathMatch && possiblePathMatch.index !== undefined && possiblePathMatch.groups?.path) {
            let linkStartIndex = possiblePathMatch.index;
            let path = possiblePathMatch.groups.path;
            // Extract a path prefix if it exists (not part of the path, but part of the underlined
            // section)
            let prefix = undefined;
            const prefixMatch = path.match(/^(?<prefix>['"]+)/);
            if (prefixMatch?.groups?.prefix) {
                prefix = {
                    index: linkStartIndex,
                    text: prefixMatch.groups.prefix
                };
                path = path.substring(prefix.text.length);
                // Don't allow suffix links to be returned when the link itself is the empty string
                if (path.trim().length === 0) {
                    continue;
                }
                // If there are multiple characters in the prefix, trim the prefix if the _first_
                // suffix character is the same as the last prefix character. For example, for the
                // text `echo "'foo' on line 1"`:
                //
                // - Prefix='
                // - Path=foo
                // - Suffix=' on line 1
                //
                // If this fails on a multi-character prefix, just keep the original.
                if (prefixMatch.groups.prefix.length > 1) {
                    if (suffix.suffix.text[0].match(/['"]/) && prefixMatch.groups.prefix[prefixMatch.groups.prefix.length - 1] === suffix.suffix.text[0]) {
                        const trimPrefixAmount = prefixMatch.groups.prefix.length - 1;
                        prefix.index += trimPrefixAmount;
                        prefix.text = prefixMatch.groups.prefix[prefixMatch.groups.prefix.length - 1];
                        linkStartIndex += trimPrefixAmount;
                    }
                }
            }
            results.push({
                path: {
                    index: linkStartIndex + (prefix?.text.length || 0),
                    text: path
                },
                prefix,
                suffix
            });
        }
    }
    return results;
}
var RegexPathConstants;
(function (RegexPathConstants) {
    RegexPathConstants["PathPrefix"] = "(?:\\.\\.?|\\~|file://)";
    RegexPathConstants["PathSeparatorClause"] = "\\/";
    // '":; are allowed in paths but they are often separators so ignore them
    // Also disallow \\ to prevent a catastropic backtracking case #24795
    RegexPathConstants["ExcludedPathCharactersClause"] = "[^\\0<>\\?\\s!`&*()'\":;\\\\]";
    RegexPathConstants["ExcludedStartPathCharactersClause"] = "[^\\0<>\\?\\s!`&*()\\[\\]'\":;\\\\]";
    RegexPathConstants["WinOtherPathPrefix"] = "\\.\\.?|\\~";
    RegexPathConstants["WinPathSeparatorClause"] = "(?:\\\\|\\/)";
    RegexPathConstants["WinExcludedPathCharactersClause"] = "[^\\0<>\\?\\|\\/\\s!`&*()'\":;]";
    RegexPathConstants["WinExcludedStartPathCharactersClause"] = "[^\\0<>\\?\\|\\/\\s!`&*()\\[\\]'\":;]";
})(RegexPathConstants || (RegexPathConstants = {}));
/**
 * A regex that matches non-Windows paths, such as `/foo`, `~/foo`, `./foo`, `../foo` and
 * `foo/bar`.
 */
const unixLocalLinkClause = '(?:(?:' + RegexPathConstants.PathPrefix + '|(?:' + RegexPathConstants.ExcludedStartPathCharactersClause + RegexPathConstants.ExcludedPathCharactersClause + '*))?(?:' + RegexPathConstants.PathSeparatorClause + '(?:' + RegexPathConstants.ExcludedPathCharactersClause + ')+)+)';
/**
 * A regex clause that matches the start of an absolute path on Windows, such as: `C:`, `c:`,
 * `file:///c:` (uri) and `\\?\C:` (UNC path).
 */
export const winDrivePrefix = '(?:\\\\\\\\\\?\\\\|file:\\/\\/\\/)?[a-zA-Z]:';
/**
 * A regex that matches Windows paths, such as `\\?\c:\foo`, `c:\foo`, `~\foo`, `.\foo`, `..\foo`
 * and `foo\bar`.
 */
const winLocalLinkClause = '(?:(?:' + `(?:${winDrivePrefix}|${RegexPathConstants.WinOtherPathPrefix})` + '|(?:' + RegexPathConstants.WinExcludedStartPathCharactersClause + RegexPathConstants.WinExcludedPathCharactersClause + '*))?(?:' + RegexPathConstants.WinPathSeparatorClause + '(?:' + RegexPathConstants.WinExcludedPathCharactersClause + ')+)+)';
function detectPathsNoSuffix(line, os) {
    const results = [];
    const regex = new RegExp(os === 1 /* OperatingSystem.Windows */ ? winLocalLinkClause : unixLocalLinkClause, 'g');
    let match;
    while ((match = regex.exec(line)) !== null) {
        let text = match[0];
        let index = match.index;
        if (!text) {
            // Something matched but does not comply with the given match index, since this would
            // most likely a bug the regex itself we simply do nothing here
            break;
        }
        // Adjust the link range to exclude a/ and b/ if it looks like a git diff
        if (
        // --- a/foo/bar
        // +++ b/foo/bar
        ((line.startsWith('--- a/') || line.startsWith('+++ b/')) && index === 4) ||
            // diff --git a/foo/bar b/foo/bar
            (line.startsWith('diff --git') && (text.startsWith('a/') || text.startsWith('b/')))) {
            text = text.substring(2);
            index += 2;
        }
        results.push({
            path: {
                index,
                text
            },
            prefix: undefined,
            suffix: undefined
        });
    }
    return results;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUGFyc2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtQYXJzaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7O0dBSUc7QUFFSCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFzQjFEOzs7R0FHRztBQUNILE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxJQUFJLENBQVMsR0FBRyxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNqRjs7R0FFRztBQUNILE1BQU0sZUFBZSxHQUFHLElBQUksSUFBSSxDQUFTLEdBQUcsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFFL0UsU0FBUyx1QkFBdUIsQ0FBQyxPQUFnQjtJQUNoRCxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDWCxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDWCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixTQUFTLENBQUM7UUFDVCxPQUFPLFNBQVMsRUFBRSxFQUFFLFFBQVEsQ0FBQztJQUM5QixDQUFDO0lBQ0QsU0FBUyxDQUFDO1FBQ1QsT0FBTyxTQUFTLEVBQUUsRUFBRSxRQUFRLENBQUM7SUFDOUIsQ0FBQztJQUNELFNBQVMsRUFBRTtRQUNWLE9BQU8sWUFBWSxHQUFHLEVBQUUsUUFBUSxDQUFDO0lBQ2xDLENBQUM7SUFDRCxTQUFTLEVBQUU7UUFDVixPQUFPLFlBQVksR0FBRyxFQUFFLFFBQVEsQ0FBQztJQUNsQyxDQUFDO0lBRUQsTUFB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
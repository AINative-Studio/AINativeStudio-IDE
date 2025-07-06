/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { URI as uri } from '../../../../base/common/uri.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { deepClone } from '../../../../base/common/objects.js';
import { Schemas } from '../../../../base/common/network.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { coalesce } from '../../../../base/common/arrays.js';
const _formatPIIRegexp = /{([^}]+)}/g;
export function formatPII(value, excludePII, args) {
    return value.replace(_formatPIIRegexp, function (match, group) {
        if (excludePII && group.length > 0 && group[0] !== '_') {
            return match;
        }
        return args && args.hasOwnProperty(group) ?
            args[group] :
            match;
    });
}
/**
 * Filters exceptions (keys marked with "!") from the given object. Used to
 * ensure exception data is not sent on web remotes, see #97628.
 */
export function filterExceptionsFromTelemetry(data) {
    const output = {};
    for (const key of Object.keys(data)) {
        if (!key.startsWith('!')) {
            output[key] = data[key];
        }
    }
    return output;
}
export function isSessionAttach(session) {
    return session.configuration.request === 'attach' && !getExtensionHostDebugSession(session) && (!session.parentSession || isSessionAttach(session.parentSession));
}
/**
 * Returns the session or any parent which is an extension host debug session.
 * Returns undefined if there's none.
 */
export function getExtensionHostDebugSession(session) {
    let type = session.configuration.type;
    if (!type) {
        return;
    }
    if (type === 'vslsShare') {
        type = session.configuration.adapterProxy.configuration.type;
    }
    if (equalsIgnoreCase(type, 'extensionhost') || equalsIgnoreCase(type, 'pwa-extensionhost')) {
        return session;
    }
    return session.parentSession ? getExtensionHostDebugSession(session.parentSession) : undefined;
}
// only a debugger contributions with a label, program, or runtime attribute is considered a "defining" or "main" debugger contribution
export function isDebuggerMainContribution(dbg) {
    return dbg.type && (dbg.label || dbg.program || dbg.runtime);
}
export function getExactExpressionStartAndEnd(lineContent, looseStart, looseEnd) {
    let matchingExpression = undefined;
    let startOffset = 0;
    // Some example supported expressions: myVar.prop, a.b.c.d, myVar?.prop, myVar->prop, MyClass::StaticProp, *myVar
    // Match any character except a set of characters which often break interesting sub-expressions
    const expression = /([^()\[\]{}<>\s+\-/%~#^;=|,`!]|\->)+/g;
    let result = null;
    // First find the full expression under the cursor
    while (result = expression.exec(lineContent)) {
        const start = result.index + 1;
        const end = start + result[0].length;
        if (start <= looseStart && end >= looseEnd) {
            matchingExpression = result[0];
            startOffset = start;
            break;
        }
    }
    // If there are non-word characters after the cursor, we want to truncate the expression then.
    // For example in expression 'a.b.c.d', if the focus was under 'b', 'a.b' would be evaluated.
    if (matchingExpression) {
        const subExpression = /(\w|\p{L})+/gu;
        let subExpressionResult = null;
        while (subExpressionResult = subExpression.exec(matchingExpression)) {
            const subEnd = subExpressionResult.index + 1 + startOffset + subExpressionResult[0].length;
            if (subEnd >= looseEnd) {
                break;
            }
        }
        if (subExpressionResult) {
            matchingExpression = matchingExpression.substring(0, subExpression.lastIndex);
        }
    }
    return matchingExpression ?
        { start: startOffset, end: startOffset + matchingExpression.length - 1 } :
        { start: 0, end: 0 };
}
export async function getEvaluatableExpressionAtPosition(languageFeaturesService, model, position, token) {
    if (languageFeaturesService.evaluatableExpressionProvider.has(model)) {
        const supports = languageFeaturesService.evaluatableExpressionProvider.ordered(model);
        const results = coalesce(await Promise.all(supports.map(async (support) => {
            try {
                return await support.provideEvaluatableExpression(model, position, token ?? CancellationToken.None);
            }
            catch (err) {
                return undefined;
            }
        })));
        if (results.length > 0) {
            let matchingExpression = results[0].expression;
            const range = results[0].range;
            if (!matchingExpression) {
                const lineContent = model.getLineContent(position.lineNumber);
                matchingExpression = lineContent.substring(range.startColumn - 1, range.endColumn - 1);
            }
            return { range, matchingExpression };
        }
    }
    else { // old one-size-fits-all strategy
        const lineContent = model.getLineContent(position.lineNumber);
        const { start, end } = getExactExpressionStartAndEnd(lineContent, position.column, position.column);
        // use regex to extract the sub-expression #9821
        const matchingExpression = lineContent.substring(start - 1, end);
        return {
            matchingExpression,
            range: new Range(position.lineNumber, start, position.lineNumber, start + matchingExpression.length)
        };
    }
    return null;
}
// RFC 2396, Appendix A: https://www.ietf.org/rfc/rfc2396.txt
const _schemePattern = /^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/;
export function isUri(s) {
    // heuristics: a valid uri starts with a scheme and
    // the scheme has at least 2 characters so that it doesn't look like a drive letter.
    return !!(s && s.match(_schemePattern));
}
function stringToUri(source) {
    if (typeof source.path === 'string') {
        if (typeof source.sourceReference === 'number' && source.sourceReference > 0) {
            // if there is a source reference, don't touch path
        }
        else {
            if (isUri(source.path)) {
                return uri.parse(source.path);
            }
            else {
                // assume path
                if (isAbsolute(source.path)) {
                    return uri.file(source.path);
                }
                else {
                    // leave relative path as is
                }
            }
        }
    }
    return source.path;
}
function uriToString(source) {
    if (typeof source.path === 'object') {
        const u = uri.revive(source.path);
        if (u) {
            if (u.scheme === Schemas.file) {
                return u.fsPath;
            }
            else {
                return u.toString();
            }
        }
    }
    return source.path;
}
export function convertToDAPaths(message, toUri) {
    const fixPath = toUri ? stringToUri : uriToString;
    // since we modify Source.paths in the message in place, we need to make a copy of it (see #61129)
    const msg = deepClone(message);
    convertPaths(msg, (toDA, source) => {
        if (toDA && source) {
            source.path = fixPath(source);
        }
    });
    return msg;
}
export function convertToVSCPaths(message, toUri) {
    const fixPath = toUri ? stringToUri : uriToString;
    // since we modify Source.paths in the message in place, we need to make a copy of it (see #61129)
    const msg = deepClone(message);
    convertPaths(msg, (toDA, source) => {
        if (!toDA && source) {
            source.path = fixPath(source);
        }
    });
    return msg;
}
function convertPaths(msg, fixSourcePath) {
    switch (msg.type) {
        case 'event': {
            const event = msg;
            switch (event.event) {
                case 'output':
                    fixSourcePath(false, event.body.source);
                    break;
                case 'loadedSource':
                    fixSourcePath(false, event.body.source);
                    break;
                case 'breakpoint':
                    fixSourcePath(false, event.body.breakpoint.source);
                    break;
                default:
                    break;
            }
            break;
        }
        case 'request': {
            const request = msg;
            switch (request.command) {
                case 'setBreakpoints':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'breakpointLocations':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'source':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'gotoTargets':
                    fixSourcePath(true, request.arguments.source);
                    break;
                case 'launchVSCode':
                    request.arguments.args.forEach((arg) => fixSourcePath(false, arg));
                    break;
                default:
                    break;
            }
            break;
        }
        case 'response': {
            const response = msg;
            if (response.success && response.body) {
                switch (response.command) {
                    case 'stackTrace':
                        response.body.stackFrames.forEach(frame => fixSourcePath(false, frame.source));
                        break;
                    case 'loadedSources':
                        response.body.sources.forEach(source => fixSourcePath(false, source));
                        break;
                    case 'scopes':
                        response.body.scopes.forEach(scope => fixSourcePath(false, scope.source));
                        break;
                    case 'setFunctionBreakpoints':
                        response.body.breakpoints.forEach(bp => fixSourcePath(false, bp.source));
                        break;
                    case 'setBreakpoints':
                        response.body.breakpoints.forEach(bp => fixSourcePath(false, bp.source));
                        break;
                    case 'disassemble':
                        {
                            const di = response;
                            di.body?.instructions.forEach(di => fixSourcePath(false, di.location));
                        }
                        break;
                    case 'locations':
                        fixSourcePath(false, response.body?.source);
                        break;
                    default:
                        break;
                }
            }
            break;
        }
    }
}
export function getVisibleAndSorted(array) {
    return array.filter(config => !config.presentation?.hidden).sort((first, second) => {
        if (!first.presentation) {
            if (!second.presentation) {
                return 0;
            }
            return 1;
        }
        if (!second.presentation) {
            return -1;
        }
        if (!first.presentation.group) {
            if (!second.presentation.group) {
                return compareOrders(first.presentation.order, second.presentation.order);
            }
            return 1;
        }
        if (!second.presentation.group) {
            return -1;
        }
        if (first.presentation.group !== second.presentation.group) {
            return first.presentation.group.localeCompare(second.presentation.group);
        }
        return compareOrders(first.presentation.order, second.presentation.order);
    });
}
function compareOrders(first, second) {
    if (typeof first !== 'number') {
        if (typeof second !== 'number') {
            return 0;
        }
        return 1;
    }
    if (typeof second !== 'number') {
        return -1;
    }
    return first - second;
}
export async function saveAllBeforeDebugStart(configurationService, editorService) {
    const saveBeforeStartConfig = configurationService.getValue('debug.saveBeforeStart', { overrideIdentifier: editorService.activeTextEditorLanguageId });
    if (saveBeforeStartConfig !== 'none') {
        await editorService.saveAll();
        if (saveBeforeStartConfig === 'allEditorsInActiveGroup') {
            const activeEditor = editorService.activeEditorPane;
            if (activeEditor && activeEditor.input.resource?.scheme === Schemas.untitled) {
                // Make sure to save the active editor in case it is in untitled file it wont be saved as part of saveAll #111850
                await editorService.save({ editor: activeEditor.input, groupId: activeEditor.group.id });
            }
        }
    }
    await configurationService.reloadConfiguration();
}
export const sourcesEqual = (a, b) => !a || !b ? a === b : a.name === b.name && a.path === b.path && a.sourceReference === b.sourceReference;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z1V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFLN0QsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUc3RCxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFNLFVBQVUsU0FBUyxDQUFDLEtBQWEsRUFBRSxVQUFtQixFQUFFLElBQTJDO0lBQ3hHLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEtBQUssRUFBRSxLQUFLO1FBQzVELElBQUksVUFBVSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUN4RCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENB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
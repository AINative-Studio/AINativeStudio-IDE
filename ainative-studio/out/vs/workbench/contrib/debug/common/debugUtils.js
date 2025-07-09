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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV0RSxPQUFPLEVBQUUsR0FBRyxJQUFJLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSzdELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHN0QsTUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUM7QUFFdEMsTUFBTSxVQUFVLFNBQVMsQ0FBQyxLQUFhLEVBQUUsVUFBbUIsRUFBRSxJQUEyQztJQUN4RyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxLQUFLLEVBQUUsS0FBSztRQUM1RCxJQUFJLFVBQVUsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDeEQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { Range } from '../../../../editor/common/core/range.js';
import { isNumber } from '../../../../base/common/types.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { compare } from '../../../../base/common/strings.js';
import { groupBy } from '../../../../base/common/arrays.js';
export var WorkspaceSymbolProviderRegistry;
(function (WorkspaceSymbolProviderRegistry) {
    const _supports = [];
    function register(provider) {
        let support = provider;
        if (support) {
            _supports.push(support);
        }
        return {
            dispose() {
                if (support) {
                    const idx = _supports.indexOf(support);
                    if (idx >= 0) {
                        _supports.splice(idx, 1);
                        support = undefined;
                    }
                }
            }
        };
    }
    WorkspaceSymbolProviderRegistry.register = register;
    function all() {
        return _supports.slice(0);
    }
    WorkspaceSymbolProviderRegistry.all = all;
})(WorkspaceSymbolProviderRegistry || (WorkspaceSymbolProviderRegistry = {}));
export class WorkspaceSymbolItem {
    constructor(symbol, provider) {
        this.symbol = symbol;
        this.provider = provider;
    }
}
export async function getWorkspaceSymbols(query, token = CancellationToken.None) {
    const all = [];
    const promises = WorkspaceSymbolProviderRegistry.all().map(async (provider) => {
        try {
            const value = await provider.provideWorkspaceSymbols(query, token);
            if (!value) {
                return;
            }
            for (const symbol of value) {
                all.push(new WorkspaceSymbolItem(symbol, provider));
            }
        }
        catch (err) {
            onUnexpectedExternalError(err);
        }
    });
    await Promise.all(promises);
    if (token.isCancellationRequested) {
        return [];
    }
    // de-duplicate entries
    function compareItems(a, b) {
        let res = compare(a.symbol.name, b.symbol.name);
        if (res === 0) {
            res = a.symbol.kind - b.symbol.kind;
        }
        if (res === 0) {
            res = compare(a.symbol.location.uri.toString(), b.symbol.location.uri.toString());
        }
        if (res === 0) {
            if (a.symbol.location.range && b.symbol.location.range) {
                if (!Range.areIntersecting(a.symbol.location.range, b.symbol.location.range)) {
                    res = Range.compareRangesUsingStarts(a.symbol.location.range, b.symbol.location.range);
                }
            }
            else if (a.provider.resolveWorkspaceSymbol && !b.provider.resolveWorkspaceSymbol) {
                res = -1;
            }
            else if (!a.provider.resolveWorkspaceSymbol && b.provider.resolveWorkspaceSymbol) {
                res = 1;
            }
        }
        if (res === 0) {
            res = compare(a.symbol.containerName ?? '', b.symbol.containerName ?? '');
        }
        return res;
    }
    return groupBy(all, compareItems).map(group => group[0]).flat();
}
/**
 * Helper to return all opened editors with resources not belonging to the currently opened workspace.
 */
export function getOutOfWorkspaceEditorResources(accessor) {
    const editorService = accessor.get(IEditorService);
    const contextService = accessor.get(IWorkspaceContextService);
    const fileService = accessor.get(IFileService);
    const resources = editorService.editors
        .map(editor => EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }))
        .filter(resource => !!resource && !contextService.isInsideWorkspace(resource) && fileService.hasProvider(resource));
    return resources;
}
// Supports patterns of <path><#|:|(><line><#|:|,><col?><:?>
const LINE_COLON_PATTERN = /\s?[#:\(](?:line )?(\d*)(?:[#:,](\d*))?\)?:?\s*$/;
export function extractRangeFromFilter(filter, unless) {
    // Ignore when the unless character not the first character or is before the line colon pattern
    if (!filter || unless?.some(value => {
        const unlessCharPos = filter.indexOf(value);
        return unlessCharPos === 0 || unlessCharPos > 0 && !LINE_COLON_PATTERN.test(filter.substring(unlessCharPos + 1));
    })) {
        return undefined;
    }
    let range = undefined;
    // Find Line/Column number from search value using RegExp
    const patternMatch = LINE_COLON_PATTERN.exec(filter);
    if (patternMatch) {
        const startLineNumber = parseInt(patternMatch[1] ?? '', 10);
        // Line Number
        if (isNumber(startLineNumber)) {
            range = {
                startLineNumber: startLineNumber,
                startColumn: 1,
                endLineNumber: startLineNumber,
                endColumn: 1
            };
            // Column Number
            const startColumn = parseInt(patternMatch[2] ?? '', 10);
            if (isNumber(startColumn)) {
                range = {
                    startLineNumber: range.startLineNumber,
                    startColumn: startColumn,
                    endLineNumber: range.endLineNumber,
                    endColumn: startColumn
                };
            }
        }
        // User has typed "something:" or "something#" without a line number, in this case treat as start of file
        else if (patternMatch[1] === '') {
            range = {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1
            };
        }
    }
    if (patternMatch && range) {
        return {
            filter: filter.substr(0, patternMatch.index), // clear range suffix from search value
            range
        };
    }
    return undefined;
}
export var SearchUIState;
(function (SearchUIState) {
    SearchUIState[SearchUIState["Idle"] = 0] = "Idle";
    SearchUIState[SearchUIState["Searching"] = 1] = "Searching";
    SearchUIState[SearchUIState["SlowSearch"] = 2] = "SlowSearch";
})(SearchUIState || (SearchUIState = {}));
export const SearchStateKey = new RawContextKey('searchState', SearchUIState.Idle);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9jb21tb24vc2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQWU1RCxNQUFNLEtBQVcsK0JBQStCLENBMEIvQztBQTFCRCxXQUFpQiwrQkFBK0I7SUFFL0MsTUFBTSxTQUFTLEdBQStCLEVBQUUsQ0FBQztJQUVqRCxTQUFnQixRQUFRLENBQUMsUUFBa0M7UUFDMUQsSUFBSSxPQUFPLEdBQXlDLFFBQVEsQ0FBQztRQUM3RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENB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
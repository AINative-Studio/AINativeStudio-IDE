/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFalsyOrEmpty } from '../../../base/common/arrays.js';
import { Schemas, matchesSomeScheme } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import * as languages from '../../../editor/common/languages.js';
import { decodeSemanticTokensDto } from '../../../editor/common/services/semanticTokensDto.js';
import { validateWhenClauses } from '../../../platform/contextkey/common/contextkey.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult } from './extHostCommands.js';
import * as typeConverters from './extHostTypeConverters.js';
import * as types from './extHostTypes.js';
//#region --- NEW world
const newCommands = [
    // -- document highlights
    new ApiCommand('vscode.executeDocumentHighlights', '_executeDocumentHighlights', 'Execute document highlight provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of DocumentHighlight-instances.', tryMapWith(typeConverters.DocumentHighlight.to))),
    // -- document symbols
    new ApiCommand('vscode.executeDocumentSymbolProvider', '_executeDocumentSymbolProvider', 'Execute document symbol provider.', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of SymbolInformation and DocumentSymbol instances.', (value, apiArgs) => {
        if (isFalsyOrEmpty(value)) {
            return undefined;
        }
        class MergedInfo extends types.SymbolInformation {
            static to(symbol) {
                const res = new MergedInfo(symbol.name, typeConverters.SymbolKind.to(symbol.kind), symbol.containerName || '', new types.Location(apiArgs[0], typeConverters.Range.to(symbol.range)));
                res.detail = symbol.detail;
                res.range = res.location.range;
                res.selectionRange = typeConverters.Range.to(symbol.selectionRange);
                res.children = symbol.children ? symbol.children.map(MergedInfo.to) : [];
                return res;
            }
        }
        return value.map(MergedInfo.to);
    })),
    // -- formatting
    new ApiCommand('vscode.executeFormatDocumentProvider', '_executeFormatDocumentProvider', 'Execute document format provider.', [ApiCommandArgument.Uri, new ApiCommandArgument('options', 'Formatting options', _ => true, v => v)], new ApiCommandResult('A promise that resolves to an array of TextEdits.', tryMapWith(typeConverters.TextEdit.to))),
    new ApiCommand('vscode.executeFormatRangeProvider', '_executeFormatRangeProvider', 'Execute range format provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Range, new ApiCommandArgument('options', 'Formatting options', _ => true, v => v)], new ApiCommandResult('A promise that resolves to an array of TextEdits.', tryMapWith(typeConverters.TextEdit.to))),
    new ApiCommand('vscode.executeFormatOnTypeProvider', '_executeFormatOnTypeProvider', 'Execute format on type provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Position, new ApiCommandArgument('ch', 'Trigger character', v => typeof v === 'string', v => v), new ApiCommandArgument('options', 'Formatting options', _ => true, v => v)], new ApiCommandResult('A promise that resolves to an array of TextEdits.', tryMapWith(typeConverters.TextEdit.to))),
    // -- go to symbol (definition, type definition, declaration, impl, references)
    new ApiCommand('vscode.executeDefinitionProvider', '_executeDefinitionProvider', 'Execute all definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeDefinitionProvider_recursive', '_executeDefinitionProvider_recursive', 'Execute all definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeTypeDefinitionProvider', '_executeTypeDefinitionProvider', 'Execute all type definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeTypeDefinitionProvider_recursive', '_executeTypeDefinitionProvider_recursive', 'Execute all type definition providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeDeclarationProvider', '_executeDeclarationProvider', 'Execute all declaration providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeDeclarationProvider_recursive', '_executeDeclarationProvider_recursive', 'Execute all declaration providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeImplementationProvider', '_executeImplementationProvider', 'Execute all implementation providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.experimental.executeImplementationProvider_recursive', '_executeImplementationProvider_recursive', 'Execute all implementation providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location or LocationLink instances.', mapLocationOrLocationLink)),
    new ApiCommand('vscode.executeReferenceProvider', '_executeReferenceProvider', 'Execute all reference providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location-instances.', tryMapWith(typeConverters.location.to))),
    new ApiCommand('vscode.experimental.executeReferenceProvider', '_executeReferenceProvider_recursive', 'Execute all reference providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Location-instances.', tryMapWith(typeConverters.location.to))),
    // -- hover
    new ApiCommand('vscode.executeHoverProvider', '_executeHoverProvider', 'Execute all hover providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Hover-instances.', tryMapWith(typeConverters.Hover.to))),
    new ApiCommand('vscode.experimental.executeHoverProvider_recursive', '_executeHoverProvider_recursive', 'Execute all hover providers.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of Hover-instances.', tryMapWith(typeConverters.Hover.to))),
    // -- selection range
    new ApiCommand('vscode.executeSelectionRangeProvider', '_executeSelectionRangeProvider', 'Execute selection range provider.', [ApiCommandArgument.Uri, new ApiCommandArgument('position', 'A position in a text document', v => Array.isArray(v) && v.every(v => types.Position.isPosition(v)), v => v.map(typeConverters.Position.from))], new ApiCommandResult('A promise that resolves to an array of ranges.', result => {
        return result.map(ranges => {
            let node;
            for (const range of ranges.reverse()) {
                node = new types.SelectionRange(typeConverters.Range.to(range), node);
            }
            return node;
        });
    })),
    // -- symbol search
    new ApiCommand('vscode.executeWorkspaceSymbolProvider', '_executeWorkspaceSymbolProvider', 'Execute all workspace symbol providers.', [ApiCommandArgument.String.with('query', 'Search string')], new ApiCommandResult('A promise that resolves to an array of SymbolInformation-instances.', value => {
        return value.map(typeConverters.WorkspaceSymbol.to);
    })),
    // --- call hierarchy
    new ApiCommand('vscode.prepareCallHierarchy', '_executePrepareCallHierarchy', 'Prepare call hierarchy at a position inside a document', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of CallHierarchyItem-instances', v => v.map(typeConverters.CallHierarchyItem.to))),
    new ApiCommand('vscode.provideIncomingCalls', '_executeProvideIncomingCalls', 'Compute incoming calls for an item', [ApiCommandArgument.CallHierarchyItem], new ApiCommandResult('A promise that resolves to an array of CallHierarchyIncomingCall-instances', v => v.map(typeConverters.CallHierarchyIncomingCall.to))),
    new ApiCommand('vscode.provideOutgoingCalls', '_executeProvideOutgoingCalls', 'Compute outgoing calls for an item', [ApiCommandArgument.CallHierarchyItem], new ApiCommandResult('A promise that resolves to an array of CallHierarchyOutgoingCall-instances', v => v.map(typeConverters.CallHierarchyOutgoingCall.to))),
    // --- rename
    new ApiCommand('vscode.prepareRename', '_executePrepareRename', 'Execute the prepareRename of rename provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to a range and placeholder text.', value => {
        if (!value) {
            return undefined;
        }
        return {
            range: typeConverters.Range.to(value.range),
            placeholder: value.text
        };
    })),
    new ApiCommand('vscode.executeDocumentRenameProvider', '_executeDocumentRenameProvider', 'Execute rename provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Position, ApiCommandArgument.String.with('newName', 'The new symbol name')], new ApiCommandResult('A promise that resolves to a WorkspaceEdit.', value => {
        if (!value) {
            return undefined;
        }
        if (value.rejectReason) {
            throw new Error(value.rejectReason);
        }
        return typeConverters.WorkspaceEdit.to(value);
    })),
    // --- links
    new ApiCommand('vscode.executeLinkProvider', '_executeLinkProvider', 'Execute document link provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Number.with('linkResolveCount', 'Number of links that should be resolved, only when links are unresolved.').optional()], new ApiCommandResult('A promise that resolves to an array of DocumentLink-instances.', value => value.map(typeConverters.DocumentLink.to))),
    // --- semantic tokens
    new ApiCommand('vscode.provideDocumentSemanticTokensLegend', '_provideDocumentSemanticTokensLegend', 'Provide semantic tokens legend for a document', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to SemanticTokensLegend.', value => {
        if (!value) {
            return undefined;
        }
        return new types.SemanticTokensLegend(value.tokenTypes, value.tokenModifiers);
    })),
    new ApiCommand('vscode.provideDocumentSemanticTokens', '_provideDocumentSemanticTokens', 'Provide semantic tokens for a document', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to SemanticTokens.', value => {
        if (!value) {
            return undefined;
        }
        const semanticTokensDto = decodeSemanticTokensDto(value);
        if (semanticTokensDto.type !== 'full') {
            // only accepting full semantic tokens from provideDocumentSemanticTokens
            return undefined;
        }
        return new types.SemanticTokens(semanticTokensDto.data, undefined);
    })),
    new ApiCommand('vscode.provideDocumentRangeSemanticTokensLegend', '_provideDocumentRangeSemanticTokensLegend', 'Provide semantic tokens legend for a document range', [ApiCommandArgument.Uri, ApiCommandArgument.Range.optional()], new ApiCommandResult('A promise that resolves to SemanticTokensLegend.', value => {
        if (!value) {
            return undefined;
        }
        return new types.SemanticTokensLegend(value.tokenTypes, value.tokenModifiers);
    })),
    new ApiCommand('vscode.provideDocumentRangeSemanticTokens', '_provideDocumentRangeSemanticTokens', 'Provide semantic tokens for a document range', [ApiCommandArgument.Uri, ApiCommandArgument.Range], new ApiCommandResult('A promise that resolves to SemanticTokens.', value => {
        if (!value) {
            return undefined;
        }
        const semanticTokensDto = decodeSemanticTokensDto(value);
        if (semanticTokensDto.type !== 'full') {
            // only accepting full semantic tokens from provideDocumentRangeSemanticTokens
            return undefined;
        }
        return new types.SemanticTokens(semanticTokensDto.data, undefined);
    })),
    // --- completions
    new ApiCommand('vscode.executeCompletionItemProvider', '_executeCompletionItemProvider', 'Execute completion item provider.', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Position,
        ApiCommandArgument.String.with('triggerCharacter', 'Trigger completion when the user types the character, like `,` or `(`').optional(),
        ApiCommandArgument.Number.with('itemResolveCount', 'Number of completions to resolve (too large numbers slow down completions)').optional()
    ], new ApiCommandResult('A promise that resolves to a CompletionList-instance.', (value, _args, converter) => {
        if (!value) {
            return new types.CompletionList([]);
        }
        const items = value.suggestions.map(suggestion => typeConverters.CompletionItem.to(suggestion, converter));
        return new types.CompletionList(items, value.incomplete);
    })),
    // --- signature help
    new ApiCommand('vscode.executeSignatureHelpProvider', '_executeSignatureHelpProvider', 'Execute signature help provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Position, ApiCommandArgument.String.with('triggerCharacter', 'Trigger signature help when the user types the character, like `,` or `(`').optional()], new ApiCommandResult('A promise that resolves to SignatureHelp.', value => {
        if (value) {
            return typeConverters.SignatureHelp.to(value);
        }
        return undefined;
    })),
    // --- code lens
    new ApiCommand('vscode.executeCodeLensProvider', '_executeCodeLensProvider', 'Execute code lens provider.', [ApiCommandArgument.Uri, ApiCommandArgument.Number.with('itemResolveCount', 'Number of lenses that should be resolved and returned. Will only return resolved lenses, will impact performance)').optional()], new ApiCommandResult('A promise that resolves to an array of CodeLens-instances.', (value, _args, converter) => {
        return tryMapWith(item => {
            return new types.CodeLens(typeConverters.Range.to(item.range), item.command && converter.fromInternal(item.command));
        })(value);
    })),
    // --- code actions
    new ApiCommand('vscode.executeCodeActionProvider', '_executeCodeActionProvider', 'Execute code action provider.', [
        ApiCommandArgument.Uri,
        new ApiCommandArgument('rangeOrSelection', 'Range in a text document. Some refactoring provider requires Selection object.', v => types.Range.isRange(v), v => types.Selection.isSelection(v) ? typeConverters.Selection.from(v) : typeConverters.Range.from(v)),
        ApiCommandArgument.String.with('kind', 'Code action kind to return code actions for').optional(),
        ApiCommandArgument.Number.with('itemResolveCount', 'Number of code actions to resolve (too large numbers slow down code actions)').optional()
    ], new ApiCommandResult('A promise that resolves to an array of Command-instances.', (value, _args, converter) => {
        return tryMapWith((codeAction) => {
            if (codeAction._isSynthetic) {
                if (!codeAction.command) {
                    throw new Error('Synthetic code actions must have a command');
                }
                return converter.fromInternal(codeAction.command);
            }
            else {
                const ret = new types.CodeAction(codeAction.title, codeAction.kind ? new types.CodeActionKind(codeAction.kind) : undefined);
                if (codeAction.edit) {
                    ret.edit = typeConverters.WorkspaceEdit.to(codeAction.edit);
                }
                if (codeAction.command) {
                    ret.command = converter.fromInternal(codeAction.command);
                }
                ret.isPreferred = codeAction.isPreferred;
                return ret;
            }
        })(value);
    })),
    // --- colors
    new ApiCommand('vscode.executeDocumentColorProvider', '_executeDocumentColorProvider', 'Execute document color provider.', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of ColorInformation objects.', result => {
        if (result) {
            return result.map(ci => new types.ColorInformation(typeConverters.Range.to(ci.range), typeConverters.Color.to(ci.color)));
        }
        return [];
    })),
    new ApiCommand('vscode.executeColorPresentationProvider', '_executeColorPresentationProvider', 'Execute color presentation provider.', [
        new ApiCommandArgument('color', 'The color to show and insert', v => v instanceof types.Color, typeConverters.Color.from),
        new ApiCommandArgument('context', 'Context object with uri and range', _v => true, v => ({ uri: v.uri, range: typeConverters.Range.from(v.range) })),
    ], new ApiCommandResult('A promise that resolves to an array of ColorPresentation objects.', result => {
        if (result) {
            return result.map(typeConverters.ColorPresentation.to);
        }
        return [];
    })),
    // --- inline hints
    new ApiCommand('vscode.executeInlayHintProvider', '_executeInlayHintProvider', 'Execute inlay hints provider', [ApiCommandArgument.Uri, ApiCommandArgument.Range], new ApiCommandResult('A promise that resolves to an array of Inlay objects', (result, args, converter) => {
        return result.map(typeConverters.InlayHint.to.bind(undefined, converter));
    })),
    // --- folding
    new ApiCommand('vscode.executeFoldingRangeProvider', '_executeFoldingRangeProvider', 'Execute folding range provider', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of FoldingRange objects', (result, args) => {
        if (result) {
            return result.map(typeConverters.FoldingRange.to);
        }
        return undefined;
    })),
    // --- notebooks
    new ApiCommand('vscode.resolveNotebookContentProviders', '_resolveNotebookContentProvider', 'Resolve Notebook Content Providers', [
    // new ApiCommandArgument<string, string>('viewType', '', v => typeof v === 'string', v => v),
    // new ApiCommandArgument<string, string>('displayName', '', v => typeof v === 'string', v => v),
    // new ApiCommandArgument<object, object>('options', '', v => typeof v === 'object', v => v),
    ], new ApiCommandResult('A promise that resolves to an array of NotebookContentProvider static info objects.', tryMapWith(item => {
        return {
            viewType: item.viewType,
            displayName: item.displayName,
            options: {
                transientOutputs: item.options.transientOutputs,
                transientCellMetadata: item.options.transientCellMetadata,
                transientDocumentMetadata: item.options.transientDocumentMetadata
            },
            filenamePattern: item.filenamePattern.map(pattern => typeConverters.NotebookExclusiveDocumentPattern.to(pattern))
        };
    }))),
    // --- debug support
    new ApiCommand('vscode.executeInlineValueProvider', '_executeInlineValueProvider', 'Execute inline value provider', [
        ApiCommandArgument.Uri,
        ApiCommandArgument.Range,
        new ApiCommandArgument('context', 'An InlineValueContext', v => v && typeof v.frameId === 'number' && v.stoppedLocation instanceof types.Range, v => typeConverters.InlineValueContext.from(v))
    ], new ApiCommandResult('A promise that resolves to an array of InlineValue objects', result => {
        return result.map(typeConverters.InlineValue.to);
    })),
    // --- open'ish commands
    new ApiCommand('vscode.open', '_workbench.open', 'Opens the provided resource in the editor. Can be a text or binary file, or an http(s) URL. If you need more control over the options for opening a text file, use vscode.window.showTextDocument instead.', [
        new ApiCommandArgument('uriOrString', 'Uri-instance or string (only http/https)', v => URI.isUri(v) || (typeof v === 'string' && matchesSomeScheme(v, Schemas.http, Schemas.https)), v => v),
        new ApiCommandArgument('columnOrOptions', 'Either the column in which to open or editor options, see vscode.TextDocumentShowOptions', v => v === undefined || typeof v === 'number' || typeof v === 'object', v => !v ? v : typeof v === 'number' ? [typeConverters.ViewColumn.from(v), undefined] : [typeConverters.ViewColumn.from(v.viewColumn), typeConverters.TextEditorOpenOptions.from(v)]).optional(),
        ApiCommandArgument.String.with('label', '').optional()
    ], ApiCommandResult.Void),
    new ApiCommand('vscode.openWith', '_workbench.openWith', 'Opens the provided resource with a specific editor.', [
        ApiCommandArgument.Uri.with('resource', 'Resource to open'),
        ApiCommandArgument.String.with('viewId', 'Custom editor view id. This should be the viewType string for custom editors or the notebookType string for notebooks. Use \'default\' to use VS Code\'s default text editor'),
        new ApiCommandArgument('columnOrOptions', 'Either the column in which to open or editor options, see vscode.TextDocumentShowOptions', v => v === undefined || typeof v === 'number' || typeof v === 'object', v => !v ? v : typeof v === 'number' ? [typeConverters.ViewColumn.from(v), undefined] : [typeConverters.ViewColumn.from(v.viewColumn), typeConverters.TextEditorOpenOptions.from(v)]).optional()
    ], ApiCommandResult.Void),
    new ApiCommand('vscode.diff', '_workbench.diff', 'Opens the provided resources in the diff editor to compare their contents.', [
        ApiCommandArgument.Uri.with('left', 'Left-hand side resource of the diff editor'),
        ApiCommandArgument.Uri.with('right', 'Right-hand side resource of the diff editor'),
        ApiCommandArgument.String.with('title', 'Human readable title for the diff editor').optional(),
        new ApiCommandArgument('columnOrOptions', 'Either the column in which to open or editor options, see vscode.TextDocumentShowOptions', v => v === undefined || typeof v === 'object', v => v && [typeConverters.ViewColumn.from(v.viewColumn), typeConverters.TextEditorOpenOptions.from(v)]).optional(),
    ], ApiCommandResult.Void),
    new ApiCommand('vscode.changes', '_workbench.changes', 'Opens a list of resources in the changes editor to compare their contents.', [
        ApiCommandArgument.String.with('title', 'Human readable title for the changes editor'),
        new ApiCommandArgument('resourceList', 'List of resources to compare', resources => {
            for (const resource of resources) {
                if (resource.length !== 3) {
                    return false;
                }
                const [label, left, right] = resource;
                if (!URI.isUri(label) ||
                    (!URI.isUri(left) && left !== undefined && left !== null) ||
                    (!URI.isUri(right) && right !== undefined && right !== null)) {
                    return false;
                }
            }
            return true;
        }, v => v)
    ], ApiCommandResult.Void),
    // --- type hierarchy
    new ApiCommand('vscode.prepareTypeHierarchy', '_executePrepareTypeHierarchy', 'Prepare type hierarchy at a position inside a document', [ApiCommandArgument.Uri, ApiCommandArgument.Position], new ApiCommandResult('A promise that resolves to an array of TypeHierarchyItem-instances', v => v.map(typeConverters.TypeHierarchyItem.to))),
    new ApiCommand('vscode.provideSupertypes', '_executeProvideSupertypes', 'Compute supertypes for an item', [ApiCommandArgument.TypeHierarchyItem], new ApiCommandResult('A promise that resolves to an array of TypeHierarchyItem-instances', v => v.map(typeConverters.TypeHierarchyItem.to))),
    new ApiCommand('vscode.provideSubtypes', '_executeProvideSubtypes', 'Compute subtypes for an item', [ApiCommandArgument.TypeHierarchyItem], new ApiCommandResult('A promise that resolves to an array of TypeHierarchyItem-instances', v => v.map(typeConverters.TypeHierarchyItem.to))),
    // --- testing
    new ApiCommand('vscode.revealTestInExplorer', '_revealTestInExplorer', 'Reveals a test instance in the explorer', [ApiCommandArgument.TestItem], ApiCommandResult.Void),
    new ApiCommand('vscode.startContinuousTestRun', 'testing.startContinuousRunFromExtension', 'Starts running the given tests with continuous run mode.', [ApiCommandArgument.TestProfile, ApiCommandArgument.Arr(ApiCommandArgument.TestItem)], ApiCommandResult.Void),
    new ApiCommand('vscode.stopContinuousTestRun', 'testing.stopContinuousRunFromExtension', 'Stops running the given tests with continuous run mode.', [ApiCommandArgument.Arr(ApiCommandArgument.TestItem)], ApiCommandResult.Void),
    // --- continue edit session
    new ApiCommand('vscode.experimental.editSession.continue', '_workbench.editSessions.actions.continueEditSession', 'Continue the current edit session in a different workspace', [ApiCommandArgument.Uri.with('workspaceUri', 'The target workspace to continue the current edit session in')], ApiCommandResult.Void),
    // --- context keys
    new ApiCommand('setContext', '_setContext', 'Set a custom context key value that can be used in when clauses.', [
        ApiCommandArgument.String.with('name', 'The context key name'),
        new ApiCommandArgument('value', 'The context key value', () => true, v => v),
    ], ApiCommandResult.Void),
    // --- inline chat
    new ApiCommand('vscode.editorChat.start', 'inlineChat.start', 'Invoke a new editor chat session', [new ApiCommandArgument('Run arguments', '', _v => true, v => {
            if (!v) {
                return undefined;
            }
            return {
                initialRange: v.initialRange ? typeConverters.Range.from(v.initialRange) : undefined,
                initialSelection: types.Selection.isSelection(v.initialSelection) ? typeConverters.Selection.from(v.initialSelection) : undefined,
                message: v.message,
                autoSend: v.autoSend,
                position: v.position ? typeConverters.Position.from(v.position) : undefined,
            };
        })], ApiCommandResult.Void)
];
//#endregion
//#region OLD world
export class ExtHostApiCommands {
    static register(commands) {
        newCommands.forEach(commands.registerApiCommand, commands);
        this._registerValidateWhenClausesCommand(commands);
    }
    static _registerValidateWhenClausesCommand(commands) {
        commands.registerCommand(false, '_validateWhenClauses', validateWhenClauses);
    }
}
function tryMapWith(f) {
    return (value) => {
        if (Array.isArray(value)) {
            return value.map(f);
        }
        return undefined;
    };
}
function mapLocationOrLocationLink(values) {
    if (!Array.isArray(values)) {
        return undefined;
    }
    const result = [];
    for (const item of values) {
        if (languages.isLocationLink(item)) {
            result.push(typeConverters.DefinitionLink.to(item));
        }
        else {
            result.push(typeConverters.location.to(item));
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0QXBpQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFJbEQsT0FBTyxLQUFLLFNBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUd4RixPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFtQixNQUFNLHNCQUFzQixDQUFDO0FBRXpHLE9BQU8sS0FBSyxjQUFjLE1BQU0sNEJBQTRCLENBQUM7QUFDN0QsT0FBTyxLQUFLLEtBQUssTUFBTSxtQkFBbUIsQ0FBQztBQUszQyx1QkFBdUI7QUFFdkIsTUFBTSxXQUFXLEdBQWlCO0lBQ2pDLHlCQUF5QjtJQUN6QixJQUFJLFVBQVUsQ0FDYixrQ0FBa0MsRUFBRSw0QkFBNEIsRUFBRSxzQ0FBc0MsRUFDeEcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQ3JELElBQUksZ0JBQWdCLENBQXVFLHFFQUFxRSxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDbE47SUFDRCxzQkFBc0I7SUFDdEIs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
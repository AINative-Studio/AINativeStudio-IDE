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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFwaUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEFwaUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBSWxELE9BQU8sS0FBSyxTQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBbUIsTUFBTSxzQkFBc0IsQ0FBQztBQUV6RyxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sS0FBSyxLQUFLLE1BQU0sbUJBQW1CLENBQUM7QUFLM0MsdUJBQXVCO0FBRXZCLE1BQU0sV0FBVyxHQUFpQjtJQUNqQyx5QkFBeUI7SUFDekIsSUFBSSxVQUFVLENBQ2Isa0NBQWtDLEVBQUUsNEJBQTRCLEVBQUUsc0NBQXNDLEVBQ3hHLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxFQUNyRCxJQUFJLGdCQUFnQixDQUF1RSxxRUFBcUUsRUFBRSxVQUFVLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2xOO0lBQ0Qsc0JBQXNCO0lBQ3RCLElBQUks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
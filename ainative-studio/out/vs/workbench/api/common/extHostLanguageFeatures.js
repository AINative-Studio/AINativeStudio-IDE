/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, coalesce, isFalsyOrEmpty, isNonEmptyArray } from '../../../base/common/arrays.js';
import { raceCancellationError } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { NotImplementedError, isCancellationError } from '../../../base/common/errors.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { equals, mixin } from '../../../base/common/objects.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { regExpLeadsToEndlessLoop } from '../../../base/common/strings.js';
import { assertType, isObject } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { Range as EditorRange } from '../../../editor/common/core/range.js';
import { Selection } from '../../../editor/common/core/selection.js';
import * as languages from '../../../editor/common/languages.js';
import { encodeSemanticTokensDto } from '../../../editor/common/services/semanticTokensDto.js';
import { localize } from '../../../nls.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { Cache } from './cache.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import { CodeAction, CodeActionKind, CompletionList, DataTransfer, Disposable, DocumentDropOrPasteEditKind, DocumentSymbol, InlineCompletionTriggerKind, InlineEditTriggerKind, InternalDataTransferItem, Location, NewSymbolNameTriggerKind, Range, SemanticTokens, SemanticTokensEdit, SemanticTokensEdits, SnippetString, SyntaxTokenType } from './extHostTypes.js';
// --- adapter
class DocumentSymbolAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentSymbols(resource, token) {
        const doc = this._documents.getDocument(resource);
        const value = await this._provider.provideDocumentSymbols(doc, token);
        if (isFalsyOrEmpty(value)) {
            return undefined;
        }
        else if (value[0] instanceof DocumentSymbol) {
            return value.map(typeConvert.DocumentSymbol.from);
        }
        else {
            return DocumentSymbolAdapter._asDocumentSymbolTree(value);
        }
    }
    static _asDocumentSymbolTree(infos) {
        // first sort by start (and end) and then loop over all elements
        // and build a tree based on containment.
        infos = infos.slice(0).sort((a, b) => {
            let res = a.location.range.start.compareTo(b.location.range.start);
            if (res === 0) {
                res = b.location.range.end.compareTo(a.location.range.end);
            }
            return res;
        });
        const res = [];
        const parentStack = [];
        for (const info of infos) {
            const element = {
                name: info.name || '!!MISSING: name!!',
                kind: typeConvert.SymbolKind.from(info.kind),
                tags: info.tags?.map(typeConvert.SymbolTag.from) || [],
                detail: '',
                containerName: info.containerName,
                range: typeConvert.Range.from(info.location.range),
                selectionRange: typeConvert.Range.from(info.location.range),
                children: []
            };
            while (true) {
                if (parentStack.length === 0) {
                    parentStack.push(element);
                    res.push(element);
                    break;
                }
                const parent = parentStack[parentStack.length - 1];
                if (EditorRange.containsRange(parent.range, element.range) && !EditorRange.equalsRange(parent.range, element.range)) {
                    parent.children?.push(element);
                    parentStack.push(element);
                    break;
                }
                parentStack.pop();
            }
        }
        return res;
    }
}
class CodeLensAdapter {
    constructor(_documents, _commands, _provider, _extension, _extTelemetry, _logService) {
        this._documents = _documents;
        this._commands = _commands;
        this._provider = _provider;
        this._extension = _extension;
        this._extTelemetry = _extTelemetry;
        this._logService = _logService;
        this._cache = new Cache('CodeLens');
        this._disposables = new Map();
    }
    async provideCodeLenses(resource, token) {
        const doc = this._documents.getDocument(resource);
        const lenses = await this._provider.provideCodeLenses(doc, token);
        if (!lenses || token.isCancellationRequested) {
            return undefined;
        }
        const cacheId = this._cache.add(lenses);
        const disposables = new DisposableStore();
        this._disposables.set(cacheId, disposables);
        const result = {
            cacheId,
            lenses: [],
        };
        for (let i = 0; i < lenses.length; i++) {
            if (!Range.isRange(lenses[i].range)) {
                console.warn('INVALID code lens, range is not defined', this._extension.identifier.value);
                continue;
            }
            result.lenses.push({
                cacheId: [cacheId, i],
                range: typeConvert.Range.from(lenses[i].range),
                command: this._commands.toInternal(lenses[i].command, disposables)
            });
        }
        return result;
    }
    async resolveCodeLens(symbol, token) {
        const lens = symbol.cacheId && this._cache.get(...symbol.cacheId);
        if (!lens) {
            return undefined;
        }
        let resolvedLens;
        if (typeof this._provider.resolveCodeLens !== 'function' || lens.isResolved) {
            resolvedLens = lens;
        }
        else {
            resolvedLens = await this._provider.resolveCodeLens(lens, token);
        }
        if (!resolvedLens) {
            resolvedLens = lens;
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        const disposables = symbol.cacheId && this._disposables.get(symbol.cacheId[0]);
        if (!disposables) {
            // disposed in the meantime
            return undefined;
        }
        if (!resolvedLens.command) {
            const error = new Error('INVALID code lens resolved, lacks command: ' + this._extension.identifier.value);
            this._extTelemetry.onExtensionError(this._extension.identifier, error);
            this._logService.error(error);
            return undefined;
        }
        symbol.command = this._commands.toInternal(resolvedLens.command, disposables);
        return symbol;
    }
    releaseCodeLenses(cachedId) {
        this._disposables.get(cachedId)?.dispose();
        this._disposables.delete(cachedId);
        this._cache.delete(cachedId);
    }
}
function convertToLocationLinks(value) {
    if (Array.isArray(value)) {
        return value.map(typeConvert.DefinitionLink.from);
    }
    else if (value) {
        return [typeConvert.DefinitionLink.from(value)];
    }
    return [];
}
class DefinitionAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDefinition(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideDefinition(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class DeclarationAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDeclaration(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideDeclaration(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class ImplementationAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideImplementation(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideImplementation(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class TypeDefinitionAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideTypeDefinition(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideTypeDefinition(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class HoverAdapter {
    static { this.HOVER_MAP_MAX_SIZE = 10; }
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._hoverCounter = 0;
        this._hoverMap = new Map();
    }
    async provideHover(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        let value;
        if (context && context.verbosityRequest) {
            const previousHoverId = context.verbosityRequest.previousHover.id;
            const previousHover = this._hoverMap.get(previousHoverId);
            if (!previousHover) {
                throw new Error(`Hover with id ${previousHoverId} not found`);
            }
            const hoverContext = { verbosityDelta: context.verbosityRequest.verbosityDelta, previousHover };
            value = await this._provider.provideHover(doc, pos, token, hoverContext);
        }
        else {
            value = await this._provider.provideHover(doc, pos, token);
        }
        if (!value || isFalsyOrEmpty(value.contents)) {
            return undefined;
        }
        if (!value.range) {
            value.range = doc.getWordRangeAtPosition(pos);
        }
        if (!value.range) {
            value.range = new Range(pos, pos);
        }
        const convertedHover = typeConvert.Hover.from(value);
        const id = this._hoverCounter;
        // Check if hover map has more than 10 elements and if yes, remove oldest from the map
        if (this._hoverMap.size === HoverAdapter.HOVER_MAP_MAX_SIZE) {
            const minimumId = Math.min(...this._hoverMap.keys());
            this._hoverMap.delete(minimumId);
        }
        this._hoverMap.set(id, value);
        this._hoverCounter += 1;
        const hover = {
            ...convertedHover,
            id
        };
        return hover;
    }
    releaseHover(id) {
        this._hoverMap.delete(id);
    }
}
class EvaluatableExpressionAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideEvaluatableExpression(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideEvaluatableExpression(doc, pos, token);
        if (value) {
            return typeConvert.EvaluatableExpression.from(value);
        }
        return undefined;
    }
}
class InlineValuesAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideInlineValues(resource, viewPort, context, token) {
        const doc = this._documents.getDocument(resource);
        const value = await this._provider.provideInlineValues(doc, typeConvert.Range.to(viewPort), typeConvert.InlineValueContext.to(context), token);
        if (Array.isArray(value)) {
            return value.map(iv => typeConvert.InlineValue.from(iv));
        }
        return undefined;
    }
}
class DocumentHighlightAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentHighlights(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideDocumentHighlights(doc, pos, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.DocumentHighlight.from);
        }
        return undefined;
    }
}
class MultiDocumentHighlightAdapter {
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async provideMultiDocumentHighlights(resource, position, otherResources, token) {
        const doc = this._documents.getDocument(resource);
        const otherDocuments = otherResources.map(r => {
            try {
                return this._documents.getDocument(r);
            }
            catch (err) {
                this._logService.error('Error: Unable to retrieve document from URI: ' + r + '. Error message: ' + err);
                return undefined;
            }
        }).filter(doc => doc !== undefined);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideMultiDocumentHighlights(doc, pos, otherDocuments, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.MultiDocumentHighlight.from);
        }
        return undefined;
    }
}
class LinkedEditingRangeAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideLinkedEditingRanges(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideLinkedEditingRanges(doc, pos, token);
        if (value && Array.isArray(value.ranges)) {
            return {
                ranges: coalesce(value.ranges.map(typeConvert.Range.from)),
                wordPattern: value.wordPattern
            };
        }
        return undefined;
    }
}
class ReferenceAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideReferences(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideReferences(doc, pos, context, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.location.from);
        }
        return undefined;
    }
}
class CodeActionAdapter {
    static { this._maxCodeActionsPerFile = 1000; }
    constructor(_documents, _commands, _diagnostics, _provider, _logService, _extension, _apiDeprecation) {
        this._documents = _documents;
        this._commands = _commands;
        this._diagnostics = _diagnostics;
        this._provider = _provider;
        this._logService = _logService;
        this._extension = _extension;
        this._apiDeprecation = _apiDeprecation;
        this._cache = new Cache('CodeAction');
        this._disposables = new Map();
    }
    async provideCodeActions(resource, rangeOrSelection, context, token) {
        const doc = this._documents.getDocument(resource);
        const ran = Selection.isISelection(rangeOrSelection)
            ? typeConvert.Selection.to(rangeOrSelection)
            : typeConvert.Range.to(rangeOrSelection);
        const allDiagnostics = [];
        for (const diagnostic of this._diagnostics.getDiagnostics(resource)) {
            if (ran.intersection(diagnostic.range)) {
                const newLen = allDiagnostics.push(diagnostic);
                if (newLen > CodeActionAdapter._maxCodeActionsPerFile) {
                    break;
                }
            }
        }
        const codeActionContext = {
            diagnostics: allDiagnostics,
            only: context.only ? new CodeActionKind(context.only) : undefined,
            triggerKind: typeConvert.CodeActionTriggerKind.to(context.trigger),
        };
        const commandsOrActions = await this._provider.provideCodeActions(doc, ran, codeActionContext, token);
        if (!isNonEmptyArray(commandsOrActions) || token.isCancellationRequested) {
            return undefined;
        }
        const cacheId = this._cache.add(commandsOrActions);
        const disposables = new DisposableStore();
        this._disposables.set(cacheId, disposables);
        const actions = [];
        for (let i = 0; i < commandsOrActions.length; i++) {
            const candidate = commandsOrActions[i];
            if (!candidate) {
                continue;
            }
            if (CodeActionAdapter._isCommand(candidate) && !(candidate instanceof CodeAction)) {
                // old school: synthetic code action
                this._apiDeprecation.report('CodeActionProvider.provideCodeActions - return commands', this._extension, `Return 'CodeAction' instances instead.`);
                actions.push({
                    _isSynthetic: true,
                    title: candidate.title,
                    command: this._commands.toInternal(candidate, disposables),
                });
            }
            else {
                const toConvert = candidate;
                // new school: convert code action
                if (codeActionContext.only) {
                    if (!toConvert.kind) {
                        this._logService.warn(`${this._extension.identifier.value} - Code actions of kind '${codeActionContext.only.value}' requested but returned code action does not have a 'kind'. Code action will be dropped. Please set 'CodeAction.kind'.`);
                    }
                    else if (!codeActionContext.only.contains(toConvert.kind)) {
                        this._logService.warn(`${this._extension.identifier.value} - Code actions of kind '${codeActionContext.only.value}' requested but returned code action is of kind '${toConvert.kind.value}'. Code action will be dropped. Please check 'CodeActionContext.only' to only return requested code actions.`);
                    }
                }
                // Ensures that this is either a Range[] or an empty array so we don't get Array<Range | undefined>
                const range = toConvert.ranges ?? [];
                actions.push({
                    cacheId: [cacheId, i],
                    title: toConvert.title,
                    command: toConvert.command && this._commands.toInternal(toConvert.command, disposables),
                    diagnostics: toConvert.diagnostics && toConvert.diagnostics.map(typeConvert.Diagnostic.from),
                    edit: toConvert.edit && typeConvert.WorkspaceEdit.from(toConvert.edit, undefined),
                    kind: toConvert.kind && toConvert.kind.value,
                    isPreferred: toConvert.isPreferred,
                    isAI: isProposedApiEnabled(this._extension, 'codeActionAI') ? toConvert.isAI : false,
                    ranges: isProposedApiEnabled(this._extension, 'codeActionRanges') ? coalesce(range.map(typeConvert.Range.from)) : undefined,
                    disabled: toConvert.disabled?.reason
                });
            }
        }
        return { cacheId, actions };
    }
    async resolveCodeAction(id, token) {
        const [sessionId, itemId] = id;
        const item = this._cache.get(sessionId, itemId);
        if (!item || CodeActionAdapter._isCommand(item)) {
            return {}; // code actions only!
        }
        if (!this._provider.resolveCodeAction) {
            return {}; // this should not happen...
        }
        const resolvedItem = (await this._provider.resolveCodeAction(item, token)) ?? item;
        let resolvedEdit;
        if (resolvedItem.edit) {
            resolvedEdit = typeConvert.WorkspaceEdit.from(resolvedItem.edit, undefined);
        }
        let resolvedCommand;
        if (resolvedItem.command) {
            const disposables = this._disposables.get(sessionId);
            if (disposables) {
                resolvedCommand = this._commands.toInternal(resolvedItem.command, disposables);
            }
        }
        return { edit: resolvedEdit, command: resolvedCommand };
    }
    releaseCodeActions(cachedId) {
        this._disposables.get(cachedId)?.dispose();
        this._disposables.delete(cachedId);
        this._cache.delete(cachedId);
    }
    static _isCommand(thing) {
        return typeof thing.command === 'string' && typeof thing.title === 'string';
    }
}
class DocumentPasteEditProvider {
    constructor(_proxy, _documents, _provider, _handle, _extension) {
        this._proxy = _proxy;
        this._documents = _documents;
        this._provider = _provider;
        this._handle = _handle;
        this._extension = _extension;
        this._editsCache = new Cache('DocumentPasteEdit.edits');
    }
    async prepareDocumentPaste(resource, ranges, dataTransferDto, token) {
        if (!this._provider.prepareDocumentPaste) {
            return;
        }
        this._cachedPrepare = undefined;
        const doc = this._documents.getDocument(resource);
        const vscodeRanges = ranges.map(range => typeConvert.Range.to(range));
        const dataTransfer = typeConvert.DataTransfer.toDataTransfer(dataTransferDto, () => {
            throw new NotImplementedError();
        });
        await this._provider.prepareDocumentPaste(doc, vscodeRanges, dataTransfer, token);
        if (token.isCancellationRequested) {
            return;
        }
        // Only send back values that have been added to the data transfer
        const newEntries = Array.from(dataTransfer).filter(([, value]) => !(value instanceof InternalDataTransferItem));
        // Store off original data transfer items so we can retrieve them on paste
        const newCache = new Map();
        const items = await Promise.all(Array.from(newEntries, async ([mime, value]) => {
            const id = generateUuid();
            newCache.set(id, value);
            return [mime, await typeConvert.DataTransferItem.from(mime, value, id)];
        }));
        this._cachedPrepare = newCache;
        return { items };
    }
    async providePasteEdits(requestId, resource, ranges, dataTransferDto, context, token) {
        if (!this._provider.provideDocumentPasteEdits) {
            return [];
        }
        const doc = this._documents.getDocument(resource);
        const vscodeRanges = ranges.map(range => typeConvert.Range.to(range));
        const items = dataTransferDto.items.map(([mime, value]) => {
            const cached = this._cachedPrepare?.get(value.id);
            if (cached) {
                return [mime, cached];
            }
            return [
                mime,
                typeConvert.DataTransferItem.to(mime, value, async (id) => {
                    return (await this._proxy.$resolvePasteFileData(this._handle, requestId, id)).buffer;
                })
            ];
        });
        const dataTransfer = new DataTransfer(items);
        const edits = await this._provider.provideDocumentPasteEdits(doc, vscodeRanges, dataTransfer, {
            only: context.only ? new DocumentDropOrPasteEditKind(context.only) : undefined,
            triggerKind: context.triggerKind,
        }, token);
        if (!edits || token.isCancellationRequested) {
            return [];
        }
        const cacheId = this._editsCache.add(edits);
        return edits.map((edit, i) => ({
            _cacheId: [cacheId, i],
            title: edit.title ?? localize('defaultPasteLabel', "Paste using '{0}' extension", this._extension.displayName || this._extension.name),
            kind: edit.kind,
            yieldTo: edit.yieldTo?.map(x => x.value),
            insertText: typeof edit.insertText === 'string' ? edit.insertText : { snippet: edit.insertText.value },
            additionalEdit: edit.additionalEdit ? typeConvert.WorkspaceEdit.from(edit.additionalEdit, undefined) : undefined,
        }));
    }
    async resolvePasteEdit(id, token) {
        const [sessionId, itemId] = id;
        const item = this._editsCache.get(sessionId, itemId);
        if (!item || !this._provider.resolveDocumentPasteEdit) {
            return {}; // this should not happen...
        }
        const resolvedItem = (await this._provider.resolveDocumentPasteEdit(item, token)) ?? item;
        return {
            insertText: resolvedItem.insertText,
            additionalEdit: resolvedItem.additionalEdit ? typeConvert.WorkspaceEdit.from(resolvedItem.additionalEdit, undefined) : undefined
        };
    }
    releasePasteEdits(id) {
        this._editsCache.delete(id);
    }
}
class DocumentFormattingAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentFormattingEdits(resource, options, token) {
        const document = this._documents.getDocument(resource);
        const value = await this._provider.provideDocumentFormattingEdits(document, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
}
class RangeFormattingAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentRangeFormattingEdits(resource, range, options, token) {
        const document = this._documents.getDocument(resource);
        const ran = typeConvert.Range.to(range);
        const value = await this._provider.provideDocumentRangeFormattingEdits(document, ran, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
    async provideDocumentRangesFormattingEdits(resource, ranges, options, token) {
        assertType(typeof this._provider.provideDocumentRangesFormattingEdits === 'function', 'INVALID invocation of `provideDocumentRangesFormattingEdits`');
        const document = this._documents.getDocument(resource);
        const _ranges = ranges.map(typeConvert.Range.to);
        const value = await this._provider.provideDocumentRangesFormattingEdits(document, _ranges, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
}
class OnTypeFormattingAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this.autoFormatTriggerCharacters = []; // not here
    }
    async provideOnTypeFormattingEdits(resource, position, ch, options, token) {
        const document = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideOnTypeFormattingEdits(document, pos, ch, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
}
class NavigateTypeAdapter {
    constructor(_provider, _logService) {
        this._provider = _provider;
        this._logService = _logService;
        this._cache = new Cache('WorkspaceSymbols');
    }
    async provideWorkspaceSymbols(search, token) {
        const value = await this._provider.provideWorkspaceSymbols(search, token);
        if (!isNonEmptyArray(value)) {
            return { symbols: [] };
        }
        const sid = this._cache.add(value);
        const result = {
            cacheId: sid,
            symbols: []
        };
        for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (!item || !item.name) {
                this._logService.warn('INVALID SymbolInformation', item);
                continue;
            }
            result.symbols.push({
                ...typeConvert.WorkspaceSymbol.from(item),
                cacheId: [sid, i]
            });
        }
        return result;
    }
    async resolveWorkspaceSymbol(symbol, token) {
        if (typeof this._provider.resolveWorkspaceSymbol !== 'function') {
            return symbol;
        }
        if (!symbol.cacheId) {
            return symbol;
        }
        const item = this._cache.get(...symbol.cacheId);
        if (item) {
            const value = await this._provider.resolveWorkspaceSymbol(item, token);
            return value && mixin(symbol, typeConvert.WorkspaceSymbol.from(value), true);
        }
        return undefined;
    }
    releaseWorkspaceSymbols(id) {
        this._cache.delete(id);
    }
}
class RenameAdapter {
    static supportsResolving(provider) {
        return typeof provider.prepareRename === 'function';
    }
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async provideRenameEdits(resource, position, newName, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        try {
            const value = await this._provider.provideRenameEdits(doc, pos, newName, token);
            if (!value) {
                return undefined;
            }
            return typeConvert.WorkspaceEdit.from(value);
        }
        catch (err) {
            const rejectReason = RenameAdapter._asMessage(err);
            if (rejectReason) {
                return { rejectReason, edits: undefined };
            }
            else {
                // generic error
                return Promise.reject(err);
            }
        }
    }
    async resolveRenameLocation(resource, position, token) {
        if (typeof this._provider.prepareRename !== 'function') {
            return Promise.resolve(undefined);
        }
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        try {
            const rangeOrLocation = await this._provider.prepareRename(doc, pos, token);
            let range;
            let text;
            if (Range.isRange(rangeOrLocation)) {
                range = rangeOrLocation;
                text = doc.getText(rangeOrLocation);
            }
            else if (isObject(rangeOrLocation)) {
                range = rangeOrLocation.range;
                text = rangeOrLocation.placeholder;
            }
            if (!range || !text) {
                return undefined;
            }
            if (range.start.line > pos.line || range.end.line < pos.line) {
                this._logService.warn('INVALID rename location: position line must be within range start/end lines');
                return undefined;
            }
            return { range: typeConvert.Range.from(range), text };
        }
        catch (err) {
            const rejectReason = RenameAdapter._asMessage(err);
            if (rejectReason) {
                return { rejectReason, range: undefined, text: undefined };
            }
            else {
                return Promise.reject(err);
            }
        }
    }
    static _asMessage(err) {
        if (typeof err === 'string') {
            return err;
        }
        else if (err instanceof Error && typeof err.message === 'string') {
            return err.message;
        }
        else {
            return undefined;
        }
    }
}
class NewSymbolNamesAdapter {
    static { this.languageTriggerKindToVSCodeTriggerKind = {
        [languages.NewSymbolNameTriggerKind.Invoke]: NewSymbolNameTriggerKind.Invoke,
        [languages.NewSymbolNameTriggerKind.Automatic]: NewSymbolNameTriggerKind.Automatic,
    }; }
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async supportsAutomaticNewSymbolNamesTriggerKind() {
        return this._provider.supportsAutomaticTriggerKind;
    }
    async provideNewSymbolNames(resource, range, triggerKind, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Range.to(range);
        try {
            const kind = NewSymbolNamesAdapter.languageTriggerKindToVSCodeTriggerKind[triggerKind];
            const value = await this._provider.provideNewSymbolNames(doc, pos, kind, token);
            if (!value) {
                return undefined;
            }
            return value.map(v => typeof v === 'string' /* @ulugbekna: for backward compatibility because `value` used to be just `string[]` */
                ? { newSymbolName: v }
                : { newSymbolName: v.newSymbolName, tags: v.tags });
        }
        catch (err) {
            this._logService.error(NewSymbolNamesAdapter._asMessage(err) ?? JSON.stringify(err, null, '\t') /* @ulugbekna: assuming `err` doesn't have circular references that could result in an exception when converting to JSON */);
            return undefined;
        }
    }
    // @ulugbekna: this method is also defined in RenameAdapter but seems OK to be duplicated
    static _asMessage(err) {
        if (typeof err === 'string') {
            return err;
        }
        else if (err instanceof Error && typeof err.message === 'string') {
            return err.message;
        }
        else {
            return undefined;
        }
    }
}
class SemanticTokensPreviousResult {
    constructor(resultId, tokens) {
        this.resultId = resultId;
        this.tokens = tokens;
    }
}
class DocumentSemanticTokensAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._nextResultId = 1;
        this._previousResults = new Map();
    }
    async provideDocumentSemanticTokens(resource, previousResultId, token) {
        const doc = this._documents.getDocument(resource);
        const previousResult = (previousResultId !== 0 ? this._previousResults.get(previousResultId) : null);
        let value = typeof previousResult?.resultId === 'string' && typeof this._provider.provideDocumentSemanticTokensEdits === 'function'
            ? await this._provider.provideDocumentSemanticTokensEdits(doc, previousResult.resultId, token)
            : await this._provider.provideDocumentSemanticTokens(doc, token);
        if (previousResult) {
            this._previousResults.delete(previousResultId);
        }
        if (!value) {
            return null;
        }
        value = DocumentSemanticTokensAdapter._fixProvidedSemanticTokens(value);
        return this._send(DocumentSemanticTokensAdapter._convertToEdits(previousResult, value), value);
    }
    async releaseDocumentSemanticColoring(semanticColoringResultId) {
        this._previousResults.delete(semanticColoringResultId);
    }
    static _fixProvidedSemanticTokens(v) {
        if (DocumentSemanticTokensAdapter._isSemanticTokens(v)) {
            if (DocumentSemanticTokensAdapter._isCorrectSemanticTokens(v)) {
                return v;
            }
            return new SemanticTokens(new Uint32Array(v.data), v.resultId);
        }
        else if (DocumentSemanticTokensAdapter._isSemanticTokensEdits(v)) {
            if (DocumentSemanticTokensAdapter._isCorrectSemanticTokensEdits(v)) {
                return v;
            }
            return new SemanticTokensEdits(v.edits.map(edit => new SemanticTokensEdit(edit.start, edit.deleteCount, edit.data ? new Uint32Array(edit.data) : edit.data)), v.resultId);
        }
        return v;
    }
    static _isSemanticTokens(v) {
        return v && !!(v.data);
    }
    static _isCorrectSemanticTokens(v) {
        return (v.data instanceof Uint32Array);
    }
    static _isSemanticTokensEdits(v) {
        return v && Array.isArray(v.edits);
    }
    static _isCorrectSemanticTokensEdits(v) {
        for (const edit of v.edits) {
            if (!(edit.data instanceof Uint32Array)) {
                return false;
            }
        }
        return true;
    }
    static _convertToEdits(previousResult, newResult) {
        if (!DocumentSemanticTokensAdapter._isSemanticTokens(newResult)) {
            return newResult;
        }
        if (!previousResult || !previousResult.tokens) {
            return newResult;
        }
        const oldData = previousResult.tokens;
        const oldLength = oldData.length;
        const newData = newResult.data;
        const newLength = newData.length;
        let commonPrefixLength = 0;
        const maxCommonPrefixLength = Math.min(oldLength, newLength);
        while (commonPrefixLength < maxCommonPrefixLength && oldData[commonPrefixLength] === newData[commonPrefixLength]) {
            commonPrefixLength++;
        }
        if (commonPrefixLength === oldLength && commonPrefixLength === newLength) {
            // complete overlap!
            return new SemanticTokensEdits([], newResult.resultId);
        }
        let commonSuffixLength = 0;
        const maxCommonSuffixLength = maxCommonPrefixLength - commonPrefixLength;
        while (commonSuffixLength < maxCommonSuffixLength && oldData[oldLength - commonSuffixLength - 1] === newData[newLength - commonSuffixLength - 1]) {
            commonSuffixLength++;
        }
        return new SemanticTokensEdits([{
                start: commonPrefixLength,
                deleteCount: (oldLength - commonPrefixLength - commonSuffixLength),
                data: newData.subarray(commonPrefixLength, newLength - commonSuffixLength)
            }], newResult.resultId);
    }
    _send(value, original) {
        if (DocumentSemanticTokensAdapter._isSemanticTokens(value)) {
            const myId = this._nextResultId++;
            this._previousResults.set(myId, new SemanticTokensPreviousResult(value.resultId, value.data));
            return encodeSemanticTokensDto({
                id: myId,
                type: 'full',
                data: value.data
            });
        }
        if (DocumentSemanticTokensAdapter._isSemanticTokensEdits(value)) {
            const myId = this._nextResultId++;
            if (DocumentSemanticTokensAdapter._isSemanticTokens(original)) {
                // store the original
                this._previousResults.set(myId, new SemanticTokensPreviousResult(original.resultId, original.data));
            }
            else {
                this._previousResults.set(myId, new SemanticTokensPreviousResult(value.resultId));
            }
            return encodeSemanticTokensDto({
                id: myId,
                type: 'delta',
                deltas: (value.edits || []).map(edit => ({ start: edit.start, deleteCount: edit.deleteCount, data: edit.data }))
            });
        }
        return null;
    }
}
class DocumentRangeSemanticTokensAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentRangeSemanticTokens(resource, range, token) {
        const doc = this._documents.getDocument(resource);
        const value = await this._provider.provideDocumentRangeSemanticTokens(doc, typeConvert.Range.to(range), token);
        if (!value) {
            return null;
        }
        return this._send(value);
    }
    _send(value) {
        return encodeSemanticTokensDto({
            id: 0,
            type: 'full',
            data: value.data
        });
    }
}
class CompletionsAdapter {
    static supportsResolving(provider) {
        return typeof provider.resolveCompletionItem === 'function';
    }
    constructor(_documents, _commands, _provider, _apiDeprecation, _extension) {
        this._documents = _documents;
        this._commands = _commands;
        this._provider = _provider;
        this._apiDeprecation = _apiDeprecation;
        this._extension = _extension;
        this._cache = new Cache('CompletionItem');
        this._disposables = new Map();
    }
    async provideCompletionItems(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        // The default insert/replace ranges. It's important to compute them
        // before asynchronously asking the provider for its results. See
        // https://github.com/microsoft/vscode/issues/83400#issuecomment-546851421
        const replaceRange = doc.getWordRangeAtPosition(pos) || new Range(pos, pos);
        const insertRange = replaceRange.with({ end: pos });
        const sw = new StopWatch();
        const itemsOrList = await this._provider.provideCompletionItems(doc, pos, token, typeConvert.CompletionContext.to(context));
        if (!itemsOrList) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const list = Array.isArray(itemsOrList) ? new CompletionList(itemsOrList) : itemsOrList;
        // keep result for providers that support resolving
        const pid = CompletionsAdapter.supportsResolving(this._provider) ? this._cache.add(list.items) : this._cache.add([]);
        const disposables = new DisposableStore();
        this._disposables.set(pid, disposables);
        const completions = [];
        const result = {
            x: pid,
            ["b" /* extHostProtocol.ISuggestResultDtoField.completions */]: completions,
            ["a" /* extHostProtocol.ISuggestResultDtoField.defaultRanges */]: { replace: typeConvert.Range.from(replaceRange), insert: typeConvert.Range.from(insertRange) },
            ["c" /* extHostProtocol.ISuggestResultDtoField.isIncomplete */]: list.isIncomplete || undefined,
            ["d" /* extHostProtocol.ISuggestResultDtoField.duration */]: sw.elapsed()
        };
        for (let i = 0; i < list.items.length; i++) {
            const item = list.items[i];
            // check for bad completion item first
            const dto = this._convertCompletionItem(item, [pid, i], insertRange, replaceRange);
            completions.push(dto);
        }
        return result;
    }
    async resolveCompletionItem(id, token) {
        if (typeof this._provider.resolveCompletionItem !== 'function') {
            return undefined;
        }
        const item = this._cache.get(...id);
        if (!item) {
            return undefined;
        }
        const dto1 = this._convertCompletionItem(item, id);
        const resolvedItem = await this._provider.resolveCompletionItem(item, token);
        if (!resolvedItem) {
            return undefined;
        }
        const dto2 = this._convertCompletionItem(resolvedItem, id);
        if (dto1["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] !== dto2["h" /* extHostProtocol.ISuggestDataDtoField.insertText */]
            || dto1["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */] !== dto2["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */]) {
            this._apiDeprecation.report('CompletionItem.insertText', this._extension, 'extension MAY NOT change \'insertText\' of a CompletionItem during resolve');
        }
        if (dto1["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */] !== dto2["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */]
            || dto1["o" /* extHostProtocol.ISuggestDataDtoField.commandId */] !== dto2["o" /* extHostProtocol.ISuggestDataDtoField.commandId */]
            || !equals(dto1["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */], dto2["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */])) {
            this._apiDeprecation.report('CompletionItem.command', this._extension, 'extension MAY NOT change \'command\' of a CompletionItem during resolve');
        }
        return {
            ...dto1,
            ["d" /* extHostProtocol.ISuggestDataDtoField.documentation */]: dto2["d" /* extHostProtocol.ISuggestDataDtoField.documentation */],
            ["c" /* extHostProtocol.ISuggestDataDtoField.detail */]: dto2["c" /* extHostProtocol.ISuggestDataDtoField.detail */],
            ["l" /* extHostProtocol.ISuggestDataDtoField.additionalTextEdits */]: dto2["l" /* extHostProtocol.ISuggestDataDtoField.additionalTextEdits */],
            // (fishy) async insertText
            ["h" /* extHostProtocol.ISuggestDataDtoField.insertText */]: dto2["h" /* extHostProtocol.ISuggestDataDtoField.insertText */],
            ["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */]: dto2["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */],
            // (fishy) async command
            ["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */]: dto2["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */],
            ["o" /* extHostProtocol.ISuggestDataDtoField.commandId */]: dto2["o" /* extHostProtocol.ISuggestDataDtoField.commandId */],
            ["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */]: dto2["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */],
        };
    }
    releaseCompletionItems(id) {
        this._disposables.get(id)?.dispose();
        this._disposables.delete(id);
        this._cache.delete(id);
    }
    _convertCompletionItem(item, id, defaultInsertRange, defaultReplaceRange) {
        const disposables = this._disposables.get(id[0]);
        if (!disposables) {
            throw Error('DisposableStore is missing...');
        }
        const command = this._commands.toInternal(item.command, disposables);
        const result = {
            //
            x: id,
            //
            ["a" /* extHostProtocol.ISuggestDataDtoField.label */]: item.label,
            ["b" /* extHostProtocol.ISuggestDataDtoField.kind */]: item.kind !== undefined ? typeConvert.CompletionItemKind.from(item.kind) : undefined,
            ["m" /* extHostProtocol.ISuggestDataDtoField.kindModifier */]: item.tags && item.tags.map(typeConvert.CompletionItemTag.from),
            ["c" /* extHostProtocol.ISuggestDataDtoField.detail */]: item.detail,
            ["d" /* extHostProtocol.ISuggestDataDtoField.documentation */]: typeof item.documentation === 'undefined' ? undefined : typeConvert.MarkdownString.fromStrict(item.documentation),
            ["e" /* extHostProtocol.ISuggestDataDtoField.sortText */]: item.sortText !== item.label ? item.sortText : undefined,
            ["f" /* extHostProtocol.ISuggestDataDtoField.filterText */]: item.filterText !== item.label ? item.filterText : undefined,
            ["g" /* extHostProtocol.ISuggestDataDtoField.preselect */]: item.preselect || undefined,
            ["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */]: item.keepWhitespace ? 1 /* languages.CompletionItemInsertTextRule.KeepWhitespace */ : 0 /* languages.CompletionItemInsertTextRule.None */,
            ["k" /* extHostProtocol.ISuggestDataDtoField.commitCharacters */]: item.commitCharacters?.join(''),
            ["l" /* extHostProtocol.ISuggestDataDtoField.additionalTextEdits */]: item.additionalTextEdits && item.additionalTextEdits.map(typeConvert.TextEdit.from),
            ["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */]: command?.$ident,
            ["o" /* extHostProtocol.ISuggestDataDtoField.commandId */]: command?.id,
            ["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */]: command?.$ident ? undefined : command?.arguments, // filled in on main side from $ident
        };
        // 'insertText'-logic
        if (item.textEdit) {
            this._apiDeprecation.report('CompletionItem.textEdit', this._extension, `Use 'CompletionItem.insertText' and 'CompletionItem.range' instead.`);
            result["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] = item.textEdit.newText;
        }
        else if (typeof item.insertText === 'string') {
            result["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] = item.insertText;
        }
        else if (item.insertText instanceof SnippetString) {
            result["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] = item.insertText.value;
            result["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */] |= 4 /* languages.CompletionItemInsertTextRule.InsertAsSnippet */;
        }
        // 'overwrite[Before|After]'-logic
        let range;
        if (item.textEdit) {
            range = item.textEdit.range;
        }
        else if (item.range) {
            range = item.range;
        }
        if (Range.isRange(range)) {
            // "old" range
            result["j" /* extHostProtocol.ISuggestDataDtoField.range */] = typeConvert.Range.from(range);
        }
        else if (range && (!defaultInsertRange?.isEqual(range.inserting) || !defaultReplaceRange?.isEqual(range.replacing))) {
            // ONLY send range when it's different from the default ranges (safe bandwidth)
            result["j" /* extHostProtocol.ISuggestDataDtoField.range */] = {
                insert: typeConvert.Range.from(range.inserting),
                replace: typeConvert.Range.from(range.replacing)
            };
        }
        return result;
    }
}
class InlineCompletionAdapter {
    constructor(_extension, _documents, _provider, _commands) {
        this._extension = _extension;
        this._documents = _documents;
        this._provider = _provider;
        this._commands = _commands;
        this._references = new ReferenceMap();
        this._isAdditionsProposedApiEnabled = isProposedApiEnabled(this._extension, 'inlineCompletionsAdditions');
        this.languageTriggerKindToVSCodeTriggerKind = {
            [languages.InlineCompletionTriggerKind.Automatic]: InlineCompletionTriggerKind.Automatic,
            [languages.InlineCompletionTriggerKind.Explicit]: InlineCompletionTriggerKind.Invoke,
        };
    }
    get supportsHandleEvents() {
        return isProposedApiEnabled(this._extension, 'inlineCompletionsAdditions')
            && (typeof this._provider.handleDidShowCompletionItem === 'function'
                || typeof this._provider.handleDidPartiallyAcceptCompletionItem === 'function'
                || typeof this._provider.handleDidRejectCompletionItem === 'function');
    }
    async provideInlineCompletions(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const result = await this._provider.provideInlineCompletionItems(doc, pos, {
            selectedCompletionInfo: context.selectedSuggestionInfo
                ? {
                    range: typeConvert.Range.to(context.selectedSuggestionInfo.range),
                    text: context.selectedSuggestionInfo.text
                }
                : undefined,
            triggerKind: this.languageTriggerKindToVSCodeTriggerKind[context.triggerKind],
            requestUuid: context.requestUuid,
        }, token);
        if (!result) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const normalizedResult = Array.isArray(result) ? result : result.items;
        const commands = this._isAdditionsProposedApiEnabled ? Array.isArray(result) ? [] : result.commands || [] : [];
        const enableForwardStability = this._isAdditionsProposedApiEnabled && !Array.isArray(result) ? result.enableForwardStability : undefined;
        let disposableStore = undefined;
        const pid = this._references.createReferenceId({
            dispose() {
                disposableStore?.dispose();
            },
            items: normalizedResult
        });
        return {
            pid,
            items: normalizedResult.map((item, idx) => {
                let command = undefined;
                if (item.command) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    command = this._commands.toInternal(item.command, disposableStore);
                }
                let action = undefined;
                if (item.action) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    action = this._commands.toInternal(item.action, disposableStore);
                }
                const insertText = item.insertText;
                return ({
                    insertText: typeof insertText === 'string' ? insertText : { snippet: insertText.value },
                    filterText: item.filterText,
                    range: item.range ? typeConvert.Range.from(item.range) : undefined,
                    showRange: (this._isAdditionsProposedApiEnabled && item.showRange) ? typeConvert.Range.from(item.showRange) : undefined,
                    command,
                    action,
                    idx: idx,
                    completeBracketPairs: this._isAdditionsProposedApiEnabled ? item.completeBracketPairs : false,
                    isInlineEdit: this._isAdditionsProposedApiEnabled ? item.isInlineEdit : false,
                    showInlineEditMenu: this._isAdditionsProposedApiEnabled ? item.showInlineEditMenu : false,
                    warning: (item.warning && this._isAdditionsProposedApiEnabled) ? {
                        message: typeConvert.MarkdownString.from(item.warning.message),
                        icon: item.warning.icon ? typeConvert.IconPath.fromThemeIcon(item.warning.icon) : undefined,
                    } : undefined,
                });
            }),
            commands: commands.map(c => {
                if (!disposableStore) {
                    disposableStore = new DisposableStore();
                }
                return this._commands.toInternal(c, disposableStore);
            }),
            suppressSuggestions: false,
            enableForwardStability,
        };
    }
    async provideInlineEditsForRange(resource, range, context, token) {
        if (!this._provider.provideInlineEditsForRange) {
            return undefined;
        }
        checkProposedApiEnabled(this._extension, 'inlineCompletionsAdditions');
        const doc = this._documents.getDocument(resource);
        const r = typeConvert.Range.to(range);
        const result = await this._provider.provideInlineEditsForRange(doc, r, {
            selectedCompletionInfo: context.selectedSuggestionInfo
                ? {
                    range: typeConvert.Range.to(context.selectedSuggestionInfo.range),
                    text: context.selectedSuggestionInfo.text
                }
                : undefined,
            triggerKind: this.languageTriggerKindToVSCodeTriggerKind[context.triggerKind],
            userPrompt: context.userPrompt,
            requestUuid: context.requestUuid,
        }, token);
        if (!result) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const normalizedResult = Array.isArray(result) ? result : result.items;
        const commands = this._isAdditionsProposedApiEnabled ? Array.isArray(result) ? [] : result.commands || [] : [];
        const enableForwardStability = this._isAdditionsProposedApiEnabled && !Array.isArray(result) ? result.enableForwardStability : undefined;
        let disposableStore = undefined;
        const pid = this._references.createReferenceId({
            dispose() {
                disposableStore?.dispose();
            },
            items: normalizedResult
        });
        return {
            pid,
            items: normalizedResult.map((item, idx) => {
                let command = undefined;
                if (item.command) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    command = this._commands.toInternal(item.command, disposableStore);
                }
                let action = undefined;
                if (item.action) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    action = this._commands.toInternal(item.action, disposableStore);
                }
                const insertText = item.insertText;
                return ({
                    insertText: typeof insertText === 'string' ? insertText : { snippet: insertText.value },
                    filterText: item.filterText,
                    range: item.range ? typeConvert.Range.from(item.range) : undefined,
                    command,
                    action,
                    idx: idx,
                    completeBracketPairs: this._isAdditionsProposedApiEnabled ? item.completeBracketPairs : false,
                });
            }),
            commands: commands.map(c => {
                if (!disposableStore) {
                    disposableStore = new DisposableStore();
                }
                return this._commands.toInternal(c, disposableStore);
            }),
            suppressSuggestions: false,
            enableForwardStability,
        };
    }
    disposeCompletions(pid) {
        const data = this._references.disposeReferenceId(pid);
        data?.dispose();
    }
    handleDidShowCompletionItem(pid, idx, updatedInsertText) {
        const completionItem = this._references.get(pid)?.items[idx];
        if (completionItem) {
            if (this._provider.handleDidShowCompletionItem && this._isAdditionsProposedApiEnabled) {
                this._provider.handleDidShowCompletionItem(completionItem, updatedInsertText);
            }
        }
    }
    handlePartialAccept(pid, idx, acceptedCharacters, info) {
        const completionItem = this._references.get(pid)?.items[idx];
        if (completionItem) {
            if (this._provider.handleDidPartiallyAcceptCompletionItem && this._isAdditionsProposedApiEnabled) {
                this._provider.handleDidPartiallyAcceptCompletionItem(completionItem, acceptedCharacters);
                this._provider.handleDidPartiallyAcceptCompletionItem(completionItem, typeConvert.PartialAcceptInfo.to(info));
            }
        }
    }
    handleRejection(pid, idx) {
        const completionItem = this._references.get(pid)?.items[idx];
        if (completionItem) {
            if (this._provider.handleDidRejectCompletionItem && this._isAdditionsProposedApiEnabled) {
                this._provider.handleDidRejectCompletionItem(completionItem);
            }
        }
    }
}
class InlineEditAdapter {
    async provideInlineEdits(uri, context, token) {
        const doc = this._documents.getDocument(uri);
        const result = await this._provider.provideInlineEdit(doc, {
            triggerKind: this.languageTriggerKindToVSCodeTriggerKind[context.triggerKind],
            requestUuid: context.requestUuid,
        }, token);
        if (!result) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        let disposableStore = undefined;
        const pid = this._references.createReferenceId({
            dispose() {
                disposableStore?.dispose();
            },
            item: result
        });
        let acceptCommand = undefined;
        if (result.accepted) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            acceptCommand = this._commands.toInternal(result.accepted, disposableStore);
        }
        let rejectCommand = undefined;
        if (result.rejected) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            rejectCommand = this._commands.toInternal(result.rejected, disposableStore);
        }
        let shownCommand = undefined;
        if (result.shown) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            shownCommand = this._commands.toInternal(result.shown, disposableStore);
        }
        let action = undefined;
        if (result.action) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            action = this._commands.toInternal(result.action, disposableStore);
        }
        if (!disposableStore) {
            disposableStore = new DisposableStore();
        }
        const langResult = {
            pid,
            text: result.text,
            range: typeConvert.Range.from(result.range),
            showRange: typeConvert.Range.from(result.showRange),
            accepted: acceptCommand,
            rejected: rejectCommand,
            shown: shownCommand,
            action,
            commands: result.commands?.map(c => this._commands.toInternal(c, disposableStore)),
        };
        return langResult;
    }
    disposeEdit(pid) {
        const data = this._references.disposeReferenceId(pid);
        data?.dispose();
    }
    constructor(_extension, _documents, _provider, _commands) {
        this._documents = _documents;
        this._provider = _provider;
        this._commands = _commands;
        this._references = new ReferenceMap();
        this.languageTriggerKindToVSCodeTriggerKind = {
            [languages.InlineEditTriggerKind.Automatic]: InlineEditTriggerKind.Automatic,
            [languages.InlineEditTriggerKind.Invoke]: InlineEditTriggerKind.Invoke,
        };
    }
}
class ReferenceMap {
    constructor() {
        this._references = new Map();
        this._idPool = 1;
    }
    createReferenceId(value) {
        const id = this._idPool++;
        this._references.set(id, value);
        return id;
    }
    disposeReferenceId(referenceId) {
        const value = this._references.get(referenceId);
        this._references.delete(referenceId);
        return value;
    }
    get(referenceId) {
        return this._references.get(referenceId);
    }
}
class SignatureHelpAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._cache = new Cache('SignatureHelp');
    }
    async provideSignatureHelp(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const vscodeContext = this.reviveContext(context);
        const value = await this._provider.provideSignatureHelp(doc, pos, token, vscodeContext);
        if (value) {
            const id = this._cache.add([value]);
            return { ...typeConvert.SignatureHelp.from(value), id };
        }
        return undefined;
    }
    reviveContext(context) {
        let activeSignatureHelp = undefined;
        if (context.activeSignatureHelp) {
            const revivedSignatureHelp = typeConvert.SignatureHelp.to(context.activeSignatureHelp);
            const saved = this._cache.get(context.activeSignatureHelp.id, 0);
            if (saved) {
                activeSignatureHelp = saved;
                activeSignatureHelp.activeSignature = revivedSignatureHelp.activeSignature;
                activeSignatureHelp.activeParameter = revivedSignatureHelp.activeParameter;
            }
            else {
                activeSignatureHelp = revivedSignatureHelp;
            }
        }
        return { ...context, activeSignatureHelp };
    }
    releaseSignatureHelp(id) {
        this._cache.delete(id);
    }
}
class InlayHintsAdapter {
    constructor(_documents, _commands, _provider, _logService, _extension) {
        this._documents = _documents;
        this._commands = _commands;
        this._provider = _provider;
        this._logService = _logService;
        this._extension = _extension;
        this._cache = new Cache('InlayHints');
        this._disposables = new Map();
    }
    async provideInlayHints(resource, ran, token) {
        const doc = this._documents.getDocument(resource);
        const range = typeConvert.Range.to(ran);
        const hints = await this._provider.provideInlayHints(doc, range, token);
        if (!Array.isArray(hints) || hints.length === 0) {
            // bad result
            this._logService.trace(`[InlayHints] NO inlay hints from '${this._extension.identifier.value}' for range ${JSON.stringify(ran)}`);
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const pid = this._cache.add(hints);
        this._disposables.set(pid, new DisposableStore());
        const result = { hints: [], cacheId: pid };
        for (let i = 0; i < hints.length; i++) {
            if (this._isValidInlayHint(hints[i], range)) {
                result.hints.push(this._convertInlayHint(hints[i], [pid, i]));
            }
        }
        this._logService.trace(`[InlayHints] ${result.hints.length} inlay hints from '${this._extension.identifier.value}' for range ${JSON.stringify(ran)}`);
        return result;
    }
    async resolveInlayHint(id, token) {
        if (typeof this._provider.resolveInlayHint !== 'function') {
            return undefined;
        }
        const item = this._cache.get(...id);
        if (!item) {
            return undefined;
        }
        const hint = await this._provider.resolveInlayHint(item, token);
        if (!hint) {
            return undefined;
        }
        if (!this._isValidInlayHint(hint)) {
            return undefined;
        }
        return this._convertInlayHint(hint, id);
    }
    releaseHints(id) {
        this._disposables.get(id)?.dispose();
        this._disposables.delete(id);
        this._cache.delete(id);
    }
    _isValidInlayHint(hint, range) {
        if (hint.label.length === 0 || Array.isArray(hint.label) && hint.label.every(part => part.value.length === 0)) {
            console.log('INVALID inlay hint, empty label', hint);
            return false;
        }
        if (range && !range.contains(hint.position)) {
            // console.log('INVALID inlay hint, position outside range', range, hint);
            return false;
        }
        return true;
    }
    _convertInlayHint(hint, id) {
        const disposables = this._disposables.get(id[0]);
        if (!disposables) {
            throw Error('DisposableStore is missing...');
        }
        const result = {
            label: '', // fill-in below
            cacheId: id,
            tooltip: typeConvert.MarkdownString.fromStrict(hint.tooltip),
            position: typeConvert.Position.from(hint.position),
            textEdits: hint.textEdits && hint.textEdits.map(typeConvert.TextEdit.from),
            kind: hint.kind && typeConvert.InlayHintKind.from(hint.kind),
            paddingLeft: hint.paddingLeft,
            paddingRight: hint.paddingRight,
        };
        if (typeof hint.label === 'string') {
            result.label = hint.label;
        }
        else {
            const parts = [];
            result.label = parts;
            for (const part of hint.label) {
                if (!part.value) {
                    console.warn('INVALID inlay hint, empty label part', this._extension.identifier.value);
                    continue;
                }
                const part2 = {
                    label: part.value,
                    tooltip: typeConvert.MarkdownString.fromStrict(part.tooltip)
                };
                if (Location.isLocation(part.location)) {
                    part2.location = typeConvert.location.from(part.location);
                }
                if (part.command) {
                    part2.command = this._commands.toInternal(part.command, disposables);
                }
                parts.push(part2);
            }
        }
        return result;
    }
}
class LinkProviderAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._cache = new Cache('DocumentLink');
    }
    async provideLinks(resource, token) {
        const doc = this._documents.getDocument(resource);
        const links = await this._provider.provideDocumentLinks(doc, token);
        if (!Array.isArray(links) || links.length === 0) {
            // bad result
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        if (typeof this._provider.resolveDocumentLink !== 'function') {
            // no resolve -> no caching
            return { links: links.filter(LinkProviderAdapter._validateLink).map(typeConvert.DocumentLink.from) };
        }
        else {
            // cache links for future resolving
            const pid = this._cache.add(links);
            const result = { links: [], cacheId: pid };
            for (let i = 0; i < links.length; i++) {
                if (!LinkProviderAdapter._validateLink(links[i])) {
                    continue;
                }
                const dto = typeConvert.DocumentLink.from(links[i]);
                dto.cacheId = [pid, i];
                result.links.push(dto);
            }
            return result;
        }
    }
    static _validateLink(link) {
        if (link.target && link.target.path.length > 50_000) {
            console.warn('DROPPING link because it is too long');
            return false;
        }
        return true;
    }
    async resolveLink(id, token) {
        if (typeof this._provider.resolveDocumentLink !== 'function') {
            return undefined;
        }
        const item = this._cache.get(...id);
        if (!item) {
            return undefined;
        }
        const link = await this._provider.resolveDocumentLink(item, token);
        if (!link || !LinkProviderAdapter._validateLink(link)) {
            return undefined;
        }
        return typeConvert.DocumentLink.from(link);
    }
    releaseLinks(id) {
        this._cache.delete(id);
    }
}
class ColorProviderAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideColors(resource, token) {
        const doc = this._documents.getDocument(resource);
        const colors = await this._provider.provideDocumentColors(doc, token);
        if (!Array.isArray(colors)) {
            return [];
        }
        const colorInfos = colors.map(ci => {
            return {
                color: typeConvert.Color.from(ci.color),
                range: typeConvert.Range.from(ci.range)
            };
        });
        return colorInfos;
    }
    async provideColorPresentations(resource, raw, token) {
        const document = this._documents.getDocument(resource);
        const range = typeConvert.Range.to(raw.range);
        const color = typeConvert.Color.to(raw.color);
        const value = await this._provider.provideColorPresentations(color, { document, range }, token);
        if (!Array.isArray(value)) {
            return undefined;
        }
        return value.map(typeConvert.ColorPresentation.from);
    }
}
class FoldingProviderAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideFoldingRanges(resource, context, token) {
        const doc = this._documents.getDocument(resource);
        const ranges = await this._provider.provideFoldingRanges(doc, context, token);
        if (!Array.isArray(ranges)) {
            return undefined;
        }
        return ranges.map(typeConvert.FoldingRange.from);
    }
}
class SelectionRangeAdapter {
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async provideSelectionRanges(resource, pos, token) {
        const document = this._documents.getDocument(resource);
        const positions = pos.map(typeConvert.Position.to);
        const allProviderRanges = await this._provider.provideSelectionRanges(document, positions, token);
        if (!isNonEmptyArray(allProviderRanges)) {
            return [];
        }
        if (allProviderRanges.length !== positions.length) {
            this._logService.warn('BAD selection ranges, provider must return ranges for each position');
            return [];
        }
        const allResults = [];
        for (let i = 0; i < positions.length; i++) {
            const oneResult = [];
            allResults.push(oneResult);
            let last = positions[i];
            let selectionRange = allProviderRanges[i];
            while (true) {
                if (!selectionRange.range.contains(last)) {
                    throw new Error('INVALID selection range, must contain the previous range');
                }
                oneResult.push(typeConvert.SelectionRange.from(selectionRange));
                if (!selectionRange.parent) {
                    break;
                }
                last = selectionRange.range;
                selectionRange = selectionRange.parent;
            }
        }
        return allResults;
    }
}
class CallHierarchyAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._idPool = new IdGenerator('');
        this._cache = new Map();
    }
    async prepareSession(uri, position, token) {
        const doc = this._documents.getDocument(uri);
        const pos = typeConvert.Position.to(position);
        const items = await this._provider.prepareCallHierarchy(doc, pos, token);
        if (!items) {
            return undefined;
        }
        const sessionId = this._idPool.nextId();
        this._cache.set(sessionId, new Map());
        if (Array.isArray(items)) {
            return items.map(item => this._cacheAndConvertItem(sessionId, item));
        }
        else {
            return [this._cacheAndConvertItem(sessionId, items)];
        }
    }
    async provideCallsTo(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing call hierarchy item');
        }
        const calls = await this._provider.provideCallHierarchyIncomingCalls(item, token);
        if (!calls) {
            return undefined;
        }
        return calls.map(call => {
            return {
                from: this._cacheAndConvertItem(sessionId, call.from),
                fromRanges: call.fromRanges.map(r => typeConvert.Range.from(r))
            };
        });
    }
    async provideCallsFrom(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing call hierarchy item');
        }
        const calls = await this._provider.provideCallHierarchyOutgoingCalls(item, token);
        if (!calls) {
            return undefined;
        }
        return calls.map(call => {
            return {
                to: this._cacheAndConvertItem(sessionId, call.to),
                fromRanges: call.fromRanges.map(r => typeConvert.Range.from(r))
            };
        });
    }
    releaseSession(sessionId) {
        this._cache.delete(sessionId);
    }
    _cacheAndConvertItem(sessionId, item) {
        const map = this._cache.get(sessionId);
        const dto = typeConvert.CallHierarchyItem.from(item, sessionId, map.size.toString(36));
        map.set(dto._itemId, item);
        return dto;
    }
    _itemFromCache(sessionId, itemId) {
        const map = this._cache.get(sessionId);
        return map?.get(itemId);
    }
}
class TypeHierarchyAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._idPool = new IdGenerator('');
        this._cache = new Map();
    }
    async prepareSession(uri, position, token) {
        const doc = this._documents.getDocument(uri);
        const pos = typeConvert.Position.to(position);
        const items = await this._provider.prepareTypeHierarchy(doc, pos, token);
        if (!items) {
            return undefined;
        }
        const sessionId = this._idPool.nextId();
        this._cache.set(sessionId, new Map());
        if (Array.isArray(items)) {
            return items.map(item => this._cacheAndConvertItem(sessionId, item));
        }
        else {
            return [this._cacheAndConvertItem(sessionId, items)];
        }
    }
    async provideSupertypes(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing type hierarchy item');
        }
        const supertypes = await this._provider.provideTypeHierarchySupertypes(item, token);
        if (!supertypes) {
            return undefined;
        }
        return supertypes.map(supertype => {
            return this._cacheAndConvertItem(sessionId, supertype);
        });
    }
    async provideSubtypes(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing type hierarchy item');
        }
        const subtypes = await this._provider.provideTypeHierarchySubtypes(item, token);
        if (!subtypes) {
            return undefined;
        }
        return subtypes.map(subtype => {
            return this._cacheAndConvertItem(sessionId, subtype);
        });
    }
    releaseSession(sessionId) {
        this._cache.delete(sessionId);
    }
    _cacheAndConvertItem(sessionId, item) {
        const map = this._cache.get(sessionId);
        const dto = typeConvert.TypeHierarchyItem.from(item, sessionId, map.size.toString(36));
        map.set(dto._itemId, item);
        return dto;
    }
    _itemFromCache(sessionId, itemId) {
        const map = this._cache.get(sessionId);
        return map?.get(itemId);
    }
}
class DocumentDropEditAdapter {
    constructor(_proxy, _documents, _provider, _handle, _extension) {
        this._proxy = _proxy;
        this._documents = _documents;
        this._provider = _provider;
        this._handle = _handle;
        this._extension = _extension;
        this._cache = new Cache('DocumentDropEdit');
    }
    async provideDocumentOnDropEdits(requestId, uri, position, dataTransferDto, token) {
        const doc = this._documents.getDocument(uri);
        const pos = typeConvert.Position.to(position);
        const dataTransfer = typeConvert.DataTransfer.toDataTransfer(dataTransferDto, async (id) => {
            return (await this._proxy.$resolveDocumentOnDropFileData(this._handle, requestId, id)).buffer;
        });
        const edits = await this._provider.provideDocumentDropEdits(doc, pos, dataTransfer, token);
        if (!edits) {
            return undefined;
        }
        const editsArray = asArray(edits);
        const cacheId = this._cache.add(editsArray);
        return editsArray.map((edit, i) => ({
            _cacheId: [cacheId, i],
            title: edit.title ?? localize('defaultDropLabel', "Drop using '{0}' extension", this._extension.displayName || this._extension.name),
            kind: edit.kind?.value,
            yieldTo: edit.yieldTo?.map(x => x.value),
            insertText: typeof edit.insertText === 'string' ? edit.insertText : { snippet: edit.insertText.value },
            additionalEdit: edit.additionalEdit ? typeConvert.WorkspaceEdit.from(edit.additionalEdit, undefined) : undefined,
        }));
    }
    async resolveDropEdit(id, token) {
        const [sessionId, itemId] = id;
        const item = this._cache.get(sessionId, itemId);
        if (!item || !this._provider.resolveDocumentDropEdit) {
            return {}; // this should not happen...
        }
        const resolvedItem = (await this._provider.resolveDocumentDropEdit(item, token)) ?? item;
        const additionalEdit = resolvedItem.additionalEdit ? typeConvert.WorkspaceEdit.from(resolvedItem.additionalEdit, undefined) : undefined;
        return { additionalEdit };
    }
    releaseDropEdits(id) {
        this._cache.delete(id);
    }
}
class AdapterData {
    constructor(adapter, extension) {
        this.adapter = adapter;
        this.extension = extension;
    }
}
export class ExtHostLanguageFeatures {
    static { this._handlePool = 0; }
    constructor(mainContext, _uriTransformer, _documents, _commands, _diagnostics, _logService, _apiDeprecation, _extensionTelemetry) {
        this._uriTransformer = _uriTransformer;
        this._documents = _documents;
        this._commands = _commands;
        this._diagnostics = _diagnostics;
        this._logService = _logService;
        this._apiDeprecation = _apiDeprecation;
        this._extensionTelemetry = _extensionTelemetry;
        this._adapter = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadLanguageFeatures);
    }
    _transformDocumentSelector(selector, extension) {
        return typeConvert.DocumentSelector.from(selector, this._uriTransformer, extension);
    }
    _createDisposable(handle) {
        return new Disposable(() => {
            this._adapter.delete(handle);
            this._proxy.$unregister(handle);
        });
    }
    _nextHandle() {
        return ExtHostLanguageFeatures._handlePool++;
    }
    async _withAdapter(handle, ctor, callback, fallbackValue, tokenToRaceAgainst, doNotLog = false) {
        const data = this._adapter.get(handle);
        if (!data || !(data.adapter instanceof ctor)) {
            return fallbackValue;
        }
        const t1 = Date.now();
        if (!doNotLog) {
            this._logService.trace(`[${data.extension.identifier.value}] INVOKE provider '${callback.toString().replace(/[\r\n]/g, '')}'`);
        }
        const result = callback(data.adapter, data.extension);
        // logging,tracing
        Promise.resolve(result).catch(err => {
            if (!isCancellationError(err)) {
                this._logService.error(`[${data.extension.identifier.value}] provider FAILED`);
                this._logService.error(err);
                this._extensionTelemetry.onExtensionError(data.extension.identifier, err);
            }
        }).finally(() => {
            if (!doNotLog) {
                this._logService.trace(`[${data.extension.identifier.value}] provider DONE after ${Date.now() - t1}ms`);
            }
        });
        if (CancellationToken.isCancellationToken(tokenToRaceAgainst)) {
            return raceCancellationError(result, tokenToRaceAgainst);
        }
        return result;
    }
    _addNewAdapter(adapter, extension) {
        const handle = this._nextHandle();
        this._adapter.set(handle, new AdapterData(adapter, extension));
        return handle;
    }
    static _extLabel(ext) {
        return ext.displayName || ext.name;
    }
    static _extId(ext) {
        return ext.identifier.value;
    }
    // --- outline
    registerDocumentSymbolProvider(extension, selector, provider, metadata) {
        const handle = this._addNewAdapter(new DocumentSymbolAdapter(this._documents, provider), extension);
        const displayName = (metadata && metadata.label) || ExtHostLanguageFeatures._extLabel(extension);
        this._proxy.$registerDocumentSymbolProvider(handle, this._transformDocumentSelector(selector, extension), displayName);
        return this._createDisposable(handle);
    }
    $provideDocumentSymbols(handle, resource, token) {
        return this._withAdapter(handle, DocumentSymbolAdapter, adapter => adapter.provideDocumentSymbols(URI.revive(resource), token), undefined, token);
    }
    // --- code lens
    registerCodeLensProvider(extension, selector, provider) {
        const handle = this._nextHandle();
        const eventHandle = typeof provider.onDidChangeCodeLenses === 'function' ? this._nextHandle() : undefined;
        this._adapter.set(handle, new AdapterData(new CodeLensAdapter(this._documents, this._commands.converter, provider, extension, this._extensionTelemetry, this._logService), extension));
        this._proxy.$registerCodeLensSupport(handle, this._transformDocumentSelector(selector, extension), eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeCodeLenses(_ => this._proxy.$emitCodeLensEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideCodeLenses(handle, resource, token) {
        return this._withAdapter(handle, CodeLensAdapter, adapter => adapter.provideCodeLenses(URI.revive(resource), token), undefined, token, resource.scheme === 'output');
    }
    $resolveCodeLens(handle, symbol, token) {
        return this._withAdapter(handle, CodeLensAdapter, adapter => adapter.resolveCodeLens(symbol, token), undefined, undefined, true);
    }
    $releaseCodeLenses(handle, cacheId) {
        this._withAdapter(handle, CodeLensAdapter, adapter => Promise.resolve(adapter.releaseCodeLenses(cacheId)), undefined, undefined, true);
    }
    // --- declaration
    registerDefinitionProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DefinitionAdapter(this._documents, provider), extension);
        this._proxy.$registerDefinitionSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDefinition(handle, resource, position, token) {
        return this._withAdapter(handle, DefinitionAdapter, adapter => adapter.provideDefinition(URI.revive(resource), position, token), [], token);
    }
    registerDeclarationProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DeclarationAdapter(this._documents, provider), extension);
        this._proxy.$registerDeclarationSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDeclaration(handle, resource, position, token) {
        return this._withAdapter(handle, DeclarationAdapter, adapter => adapter.provideDeclaration(URI.revive(resource), position, token), [], token);
    }
    registerImplementationProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new ImplementationAdapter(this._documents, provider), extension);
        this._proxy.$registerImplementationSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideImplementation(handle, resource, position, token) {
        return this._withAdapter(handle, ImplementationAdapter, adapter => adapter.provideImplementation(URI.revive(resource), position, token), [], token);
    }
    registerTypeDefinitionProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new TypeDefinitionAdapter(this._documents, provider), extension);
        this._proxy.$registerTypeDefinitionSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideTypeDefinition(handle, resource, position, token) {
        return this._withAdapter(handle, TypeDefinitionAdapter, adapter => adapter.provideTypeDefinition(URI.revive(resource), position, token), [], token);
    }
    // --- extra info
    registerHoverProvider(extension, selector, provider, extensionId) {
        const handle = this._addNewAdapter(new HoverAdapter(this._documents, provider), extension);
        this._proxy.$registerHoverProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideHover(handle, resource, position, context, token) {
        return this._withAdapter(handle, HoverAdapter, adapter => adapter.provideHover(URI.revive(resource), position, context, token), undefined, token);
    }
    $releaseHover(handle, id) {
        this._withAdapter(handle, HoverAdapter, adapter => Promise.resolve(adapter.releaseHover(id)), undefined, undefined);
    }
    // --- debug hover
    registerEvaluatableExpressionProvider(extension, selector, provider, extensionId) {
        const handle = this._addNewAdapter(new EvaluatableExpressionAdapter(this._documents, provider), extension);
        this._proxy.$registerEvaluatableExpressionProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideEvaluatableExpression(handle, resource, position, token) {
        return this._withAdapter(handle, EvaluatableExpressionAdapter, adapter => adapter.provideEvaluatableExpression(URI.revive(resource), position, token), undefined, token);
    }
    // --- debug inline values
    registerInlineValuesProvider(extension, selector, provider, extensionId) {
        const eventHandle = typeof provider.onDidChangeInlineValues === 'function' ? this._nextHandle() : undefined;
        const handle = this._addNewAdapter(new InlineValuesAdapter(this._documents, provider), extension);
        this._proxy.$registerInlineValuesProvider(handle, this._transformDocumentSelector(selector, extension), eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeInlineValues(_ => this._proxy.$emitInlineValuesEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideInlineValues(handle, resource, range, context, token) {
        return this._withAdapter(handle, InlineValuesAdapter, adapter => adapter.provideInlineValues(URI.revive(resource), range, context, token), undefined, token);
    }
    // --- occurrences
    registerDocumentHighlightProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DocumentHighlightAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentHighlightProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    registerMultiDocumentHighlightProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new MultiDocumentHighlightAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerMultiDocumentHighlightProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDocumentHighlights(handle, resource, position, token) {
        return this._withAdapter(handle, DocumentHighlightAdapter, adapter => adapter.provideDocumentHighlights(URI.revive(resource), position, token), undefined, token);
    }
    $provideMultiDocumentHighlights(handle, resource, position, otherModels, token) {
        return this._withAdapter(handle, MultiDocumentHighlightAdapter, adapter => adapter.provideMultiDocumentHighlights(URI.revive(resource), position, otherModels.map(model => URI.revive(model)), token), undefined, token);
    }
    // --- linked editing
    registerLinkedEditingRangeProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new LinkedEditingRangeAdapter(this._documents, provider), extension);
        this._proxy.$registerLinkedEditingRangeProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideLinkedEditingRanges(handle, resource, position, token) {
        return this._withAdapter(handle, LinkedEditingRangeAdapter, async (adapter) => {
            const res = await adapter.provideLinkedEditingRanges(URI.revive(resource), position, token);
            if (res) {
                return {
                    ranges: res.ranges,
                    wordPattern: res.wordPattern ? ExtHostLanguageFeatures._serializeRegExp(res.wordPattern) : undefined
                };
            }
            return undefined;
        }, undefined, token);
    }
    // --- references
    registerReferenceProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new ReferenceAdapter(this._documents, provider), extension);
        this._proxy.$registerReferenceSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideReferences(handle, resource, position, context, token) {
        return this._withAdapter(handle, ReferenceAdapter, adapter => adapter.provideReferences(URI.revive(resource), position, context, token), undefined, token);
    }
    // --- code actions
    registerCodeActionProvider(extension, selector, provider, metadata) {
        const store = new DisposableStore();
        const handle = this._addNewAdapter(new CodeActionAdapter(this._documents, this._commands.converter, this._diagnostics, provider, this._logService, extension, this._apiDeprecation), extension);
        this._proxy.$registerCodeActionSupport(handle, this._transformDocumentSelector(selector, extension), {
            providedKinds: metadata?.providedCodeActionKinds?.map(kind => kind.value),
            documentation: metadata?.documentation?.map(x => ({
                kind: x.kind.value,
                command: this._commands.converter.toInternal(x.command, store),
            }))
        }, ExtHostLanguageFeatures._extLabel(extension), ExtHostLanguageFeatures._extId(extension), Boolean(provider.resolveCodeAction));
        store.add(this._createDisposable(handle));
        return store;
    }
    $provideCodeActions(handle, resource, rangeOrSelection, context, token) {
        return this._withAdapter(handle, CodeActionAdapter, adapter => adapter.provideCodeActions(URI.revive(resource), rangeOrSelection, context, token), undefined, token);
    }
    $resolveCodeAction(handle, id, token) {
        return this._withAdapter(handle, CodeActionAdapter, adapter => adapter.resolveCodeAction(id, token), {}, undefined);
    }
    $releaseCodeActions(handle, cacheId) {
        this._withAdapter(handle, CodeActionAdapter, adapter => Promise.resolve(adapter.releaseCodeActions(cacheId)), undefined, undefined);
    }
    // --- formatting
    registerDocumentFormattingEditProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DocumentFormattingAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentFormattingSupport(handle, this._transformDocumentSelector(selector, extension), extension.identifier, extension.displayName || extension.name);
        return this._createDisposable(handle);
    }
    $provideDocumentFormattingEdits(handle, resource, options, token) {
        return this._withAdapter(handle, DocumentFormattingAdapter, adapter => adapter.provideDocumentFormattingEdits(URI.revive(resource), options, token), undefined, token);
    }
    registerDocumentRangeFormattingEditProvider(extension, selector, provider) {
        const canFormatMultipleRanges = typeof provider.provideDocumentRangesFormattingEdits === 'function';
        const handle = this._addNewAdapter(new RangeFormattingAdapter(this._documents, provider), extension);
        this._proxy.$registerRangeFormattingSupport(handle, this._transformDocumentSelector(selector, extension), extension.identifier, extension.displayName || extension.name, canFormatMultipleRanges);
        return this._createDisposable(handle);
    }
    $provideDocumentRangeFormattingEdits(handle, resource, range, options, token) {
        return this._withAdapter(handle, RangeFormattingAdapter, adapter => adapter.provideDocumentRangeFormattingEdits(URI.revive(resource), range, options, token), undefined, token);
    }
    $provideDocumentRangesFormattingEdits(handle, resource, ranges, options, token) {
        return this._withAdapter(handle, RangeFormattingAdapter, adapter => adapter.provideDocumentRangesFormattingEdits(URI.revive(resource), ranges, options, token), undefined, token);
    }
    registerOnTypeFormattingEditProvider(extension, selector, provider, triggerCharacters) {
        const handle = this._addNewAdapter(new OnTypeFormattingAdapter(this._documents, provider), extension);
        this._proxy.$registerOnTypeFormattingSupport(handle, this._transformDocumentSelector(selector, extension), triggerCharacters, extension.identifier);
        return this._createDisposable(handle);
    }
    $provideOnTypeFormattingEdits(handle, resource, position, ch, options, token) {
        return this._withAdapter(handle, OnTypeFormattingAdapter, adapter => adapter.provideOnTypeFormattingEdits(URI.revive(resource), position, ch, options, token), undefined, token);
    }
    // --- navigate types
    registerWorkspaceSymbolProvider(extension, provider) {
        const handle = this._addNewAdapter(new NavigateTypeAdapter(provider, this._logService), extension);
        this._proxy.$registerNavigateTypeSupport(handle, typeof provider.resolveWorkspaceSymbol === 'function');
        return this._createDisposable(handle);
    }
    $provideWorkspaceSymbols(handle, search, token) {
        return this._withAdapter(handle, NavigateTypeAdapter, adapter => adapter.provideWorkspaceSymbols(search, token), { symbols: [] }, token);
    }
    $resolveWorkspaceSymbol(handle, symbol, token) {
        return this._withAdapter(handle, NavigateTypeAdapter, adapter => adapter.resolveWorkspaceSymbol(symbol, token), undefined, undefined);
    }
    $releaseWorkspaceSymbols(handle, id) {
        this._withAdapter(handle, NavigateTypeAdapter, adapter => adapter.releaseWorkspaceSymbols(id), undefined, undefined);
    }
    // --- rename
    registerRenameProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new RenameAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerRenameSupport(handle, this._transformDocumentSelector(selector, extension), RenameAdapter.supportsResolving(provider));
        return this._createDisposable(handle);
    }
    $provideRenameEdits(handle, resource, position, newName, token) {
        return this._withAdapter(handle, RenameAdapter, adapter => adapter.provideRenameEdits(URI.revive(resource), position, newName, token), undefined, token);
    }
    $resolveRenameLocation(handle, resource, position, token) {
        return this._withAdapter(handle, RenameAdapter, adapter => adapter.resolveRenameLocation(URI.revive(resource), position, token), undefined, token);
    }
    registerNewSymbolNamesProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new NewSymbolNamesAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerNewSymbolNamesProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $supportsAutomaticNewSymbolNamesTriggerKind(handle) {
        return this._withAdapter(handle, NewSymbolNamesAdapter, adapter => adapter.supportsAutomaticNewSymbolNamesTriggerKind(), false, undefined);
    }
    $provideNewSymbolNames(handle, resource, range, triggerKind, token) {
        return this._withAdapter(handle, NewSymbolNamesAdapter, adapter => adapter.provideNewSymbolNames(URI.revive(resource), range, triggerKind, token), undefined, token);
    }
    //#region semantic coloring
    registerDocumentSemanticTokensProvider(extension, selector, provider, legend) {
        const handle = this._addNewAdapter(new DocumentSemanticTokensAdapter(this._documents, provider), extension);
        const eventHandle = (typeof provider.onDidChangeSemanticTokens === 'function' ? this._nextHandle() : undefined);
        this._proxy.$registerDocumentSemanticTokensProvider(handle, this._transformDocumentSelector(selector, extension), legend, eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle) {
            const subscription = provider.onDidChangeSemanticTokens(_ => this._proxy.$emitDocumentSemanticTokensEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideDocumentSemanticTokens(handle, resource, previousResultId, token) {
        return this._withAdapter(handle, DocumentSemanticTokensAdapter, adapter => adapter.provideDocumentSemanticTokens(URI.revive(resource), previousResultId, token), null, token);
    }
    $releaseDocumentSemanticTokens(handle, semanticColoringResultId) {
        this._withAdapter(handle, DocumentSemanticTokensAdapter, adapter => adapter.releaseDocumentSemanticColoring(semanticColoringResultId), undefined, undefined);
    }
    registerDocumentRangeSemanticTokensProvider(extension, selector, provider, legend) {
        const handle = this._addNewAdapter(new DocumentRangeSemanticTokensAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentRangeSemanticTokensProvider(handle, this._transformDocumentSelector(selector, extension), legend);
        return this._createDisposable(handle);
    }
    $provideDocumentRangeSemanticTokens(handle, resource, range, token) {
        return this._withAdapter(handle, DocumentRangeSemanticTokensAdapter, adapter => adapter.provideDocumentRangeSemanticTokens(URI.revive(resource), range, token), null, token);
    }
    //#endregion
    // --- suggestion
    registerCompletionItemProvider(extension, selector, provider, triggerCharacters) {
        const handle = this._addNewAdapter(new CompletionsAdapter(this._documents, this._commands.converter, provider, this._apiDeprecation, extension), extension);
        this._proxy.$registerCompletionsProvider(handle, this._transformDocumentSelector(selector, extension), triggerCharacters, CompletionsAdapter.supportsResolving(provider), extension.identifier);
        return this._createDisposable(handle);
    }
    $provideCompletionItems(handle, resource, position, context, token) {
        return this._withAdapter(handle, CompletionsAdapter, adapter => adapter.provideCompletionItems(URI.revive(resource), position, context, token), undefined, token);
    }
    $resolveCompletionItem(handle, id, token) {
        return this._withAdapter(handle, CompletionsAdapter, adapter => adapter.resolveCompletionItem(id, token), undefined, token);
    }
    $releaseCompletionItems(handle, id) {
        this._withAdapter(handle, CompletionsAdapter, adapter => adapter.releaseCompletionItems(id), undefined, undefined);
    }
    // --- ghost text
    registerInlineCompletionsProvider(extension, selector, provider, metadata) {
        const adapter = new InlineCompletionAdapter(extension, this._documents, provider, this._commands.converter);
        const handle = this._addNewAdapter(adapter, extension);
        this._proxy.$registerInlineCompletionsSupport(handle, this._transformDocumentSelector(selector, extension), adapter.supportsHandleEvents, ExtensionIdentifier.toKey(extension.identifier.value), metadata?.yieldTo?.map(extId => ExtensionIdentifier.toKey(extId)) || [], metadata?.displayName, metadata?.debounceDelayMs);
        return this._createDisposable(handle);
    }
    $provideInlineCompletions(handle, resource, position, context, token) {
        return this._withAdapter(handle, InlineCompletionAdapter, adapter => adapter.provideInlineCompletions(URI.revive(resource), position, context, token), undefined, token);
    }
    $provideInlineEditsForRange(handle, resource, range, context, token) {
        return this._withAdapter(handle, InlineCompletionAdapter, adapter => adapter.provideInlineEditsForRange(URI.revive(resource), range, context, token), undefined, token);
    }
    $handleInlineCompletionDidShow(handle, pid, idx, updatedInsertText) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => {
            adapter.handleDidShowCompletionItem(pid, idx, updatedInsertText);
        }, undefined, undefined);
    }
    $handleInlineCompletionPartialAccept(handle, pid, idx, acceptedCharacters, info) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => {
            adapter.handlePartialAccept(pid, idx, acceptedCharacters, info);
        }, undefined, undefined);
    }
    $handleInlineCompletionRejection(handle, pid, idx) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => {
            adapter.handleRejection(pid, idx);
        }, undefined, undefined);
    }
    $freeInlineCompletionsList(handle, pid) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => { adapter.disposeCompletions(pid); }, undefined, undefined);
    }
    // --- inline edit
    registerInlineEditProvider(extension, selector, provider) {
        const adapter = new InlineEditAdapter(extension, this._documents, provider, this._commands.converter);
        const handle = this._addNewAdapter(adapter, extension);
        this._proxy.$registerInlineEditProvider(handle, this._transformDocumentSelector(selector, extension), extension.identifier, provider.displayName || extension.name);
        return this._createDisposable(handle);
    }
    $provideInlineEdit(handle, resource, context, token) {
        return this._withAdapter(handle, InlineEditAdapter, adapter => adapter.provideInlineEdits(URI.revive(resource), context, token), undefined, token);
    }
    $freeInlineEdit(handle, pid) {
        this._withAdapter(handle, InlineEditAdapter, async (adapter) => { adapter.disposeEdit(pid); }, undefined, undefined);
    }
    // --- parameter hints
    registerSignatureHelpProvider(extension, selector, provider, metadataOrTriggerChars) {
        const metadata = Array.isArray(metadataOrTriggerChars)
            ? { triggerCharacters: metadataOrTriggerChars, retriggerCharacters: [] }
            : metadataOrTriggerChars;
        const handle = this._addNewAdapter(new SignatureHelpAdapter(this._documents, provider), extension);
        this._proxy.$registerSignatureHelpProvider(handle, this._transformDocumentSelector(selector, extension), metadata);
        return this._createDisposable(handle);
    }
    $provideSignatureHelp(handle, resource, position, context, token) {
        return this._withAdapter(handle, SignatureHelpAdapter, adapter => adapter.provideSignatureHelp(URI.revive(resource), position, context, token), undefined, token);
    }
    $releaseSignatureHelp(handle, id) {
        this._withAdapter(handle, SignatureHelpAdapter, adapter => adapter.releaseSignatureHelp(id), undefined, undefined);
    }
    // --- inline hints
    registerInlayHintsProvider(extension, selector, provider) {
        const eventHandle = typeof provider.onDidChangeInlayHints === 'function' ? this._nextHandle() : undefined;
        const handle = this._addNewAdapter(new InlayHintsAdapter(this._documents, this._commands.converter, provider, this._logService, extension), extension);
        this._proxy.$registerInlayHintsProvider(handle, this._transformDocumentSelector(selector, extension), typeof provider.resolveInlayHint === 'function', eventHandle, ExtHostLanguageFeatures._extLabel(extension));
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeInlayHints(uri => this._proxy.$emitInlayHintsEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideInlayHints(handle, resource, range, token) {
        return this._withAdapter(handle, InlayHintsAdapter, adapter => adapter.provideInlayHints(URI.revive(resource), range, token), undefined, token);
    }
    $resolveInlayHint(handle, id, token) {
        return this._withAdapter(handle, InlayHintsAdapter, adapter => adapter.resolveInlayHint(id, token), undefined, token);
    }
    $releaseInlayHints(handle, id) {
        this._withAdapter(handle, InlayHintsAdapter, adapter => adapter.releaseHints(id), undefined, undefined);
    }
    // --- links
    registerDocumentLinkProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new LinkProviderAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentLinkProvider(handle, this._transformDocumentSelector(selector, extension), typeof provider.resolveDocumentLink === 'function');
        return this._createDisposable(handle);
    }
    $provideDocumentLinks(handle, resource, token) {
        return this._withAdapter(handle, LinkProviderAdapter, adapter => adapter.provideLinks(URI.revive(resource), token), undefined, token, resource.scheme === 'output');
    }
    $resolveDocumentLink(handle, id, token) {
        return this._withAdapter(handle, LinkProviderAdapter, adapter => adapter.resolveLink(id, token), undefined, undefined, true);
    }
    $releaseDocumentLinks(handle, id) {
        this._withAdapter(handle, LinkProviderAdapter, adapter => adapter.releaseLinks(id), undefined, undefined, true);
    }
    registerColorProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new ColorProviderAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentColorProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDocumentColors(handle, resource, token) {
        return this._withAdapter(handle, ColorProviderAdapter, adapter => adapter.provideColors(URI.revive(resource), token), [], token);
    }
    $provideColorPresentations(handle, resource, colorInfo, token) {
        return this._withAdapter(handle, ColorProviderAdapter, adapter => adapter.provideColorPresentations(URI.revive(resource), colorInfo, token), undefined, token);
    }
    registerFoldingRangeProvider(extension, selector, provider) {
        const handle = this._nextHandle();
        const eventHandle = typeof provider.onDidChangeFoldingRanges === 'function' ? this._nextHandle() : undefined;
        this._adapter.set(handle, new AdapterData(new FoldingProviderAdapter(this._documents, provider), extension));
        this._proxy.$registerFoldingRangeProvider(handle, this._transformDocumentSelector(selector, extension), extension.identifier, eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeFoldingRanges(() => this._proxy.$emitFoldingRangeEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideFoldingRanges(handle, resource, context, token) {
        return this._withAdapter(handle, FoldingProviderAdapter, (adapter) => adapter.provideFoldingRanges(URI.revive(resource), context, token), undefined, token);
    }
    // --- smart select
    registerSelectionRangeProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new SelectionRangeAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerSelectionRangeProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideSelectionRanges(handle, resource, positions, token) {
        return this._withAdapter(handle, SelectionRangeAdapter, adapter => adapter.provideSelectionRanges(URI.revive(resource), positions, token), [], token);
    }
    // --- call hierarchy
    registerCallHierarchyProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new CallHierarchyAdapter(this._documents, provider), extension);
        this._proxy.$registerCallHierarchyProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $prepareCallHierarchy(handle, resource, position, token) {
        return this._withAdapter(handle, CallHierarchyAdapter, adapter => Promise.resolve(adapter.prepareSession(URI.revive(resource), position, token)), undefined, token);
    }
    $provideCallHierarchyIncomingCalls(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, CallHierarchyAdapter, adapter => adapter.provideCallsTo(sessionId, itemId, token), undefined, token);
    }
    $provideCallHierarchyOutgoingCalls(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, CallHierarchyAdapter, adapter => adapter.provideCallsFrom(sessionId, itemId, token), undefined, token);
    }
    $releaseCallHierarchy(handle, sessionId) {
        this._withAdapter(handle, CallHierarchyAdapter, adapter => Promise.resolve(adapter.releaseSession(sessionId)), undefined, undefined);
    }
    // --- type hierarchy
    registerTypeHierarchyProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new TypeHierarchyAdapter(this._documents, provider), extension);
        this._proxy.$registerTypeHierarchyProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $prepareTypeHierarchy(handle, resource, position, token) {
        return this._withAdapter(handle, TypeHierarchyAdapter, adapter => Promise.resolve(adapter.prepareSession(URI.revive(resource), position, token)), undefined, token);
    }
    $provideTypeHierarchySupertypes(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, TypeHierarchyAdapter, adapter => adapter.provideSupertypes(sessionId, itemId, token), undefined, token);
    }
    $provideTypeHierarchySubtypes(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, TypeHierarchyAdapter, adapter => adapter.provideSubtypes(sessionId, itemId, token), undefined, token);
    }
    $releaseTypeHierarchy(handle, sessionId) {
        this._withAdapter(handle, TypeHierarchyAdapter, adapter => Promise.resolve(adapter.releaseSession(sessionId)), undefined, undefined);
    }
    // --- Document on drop
    registerDocumentOnDropEditProvider(extension, selector, provider, metadata) {
        const handle = this._nextHandle();
        this._adapter.set(handle, new AdapterData(new DocumentDropEditAdapter(this._proxy, this._documents, provider, handle, extension), extension));
        this._proxy.$registerDocumentOnDropEditProvider(handle, this._transformDocumentSelector(selector, extension), metadata ? {
            supportsResolve: !!provider.resolveDocumentDropEdit,
            dropMimeTypes: metadata.dropMimeTypes,
            providedDropKinds: metadata.providedDropEditKinds?.map(x => x.value),
        } : undefined);
        return this._createDisposable(handle);
    }
    $provideDocumentOnDropEdits(handle, requestId, resource, position, dataTransferDto, token) {
        return this._withAdapter(handle, DocumentDropEditAdapter, adapter => Promise.resolve(adapter.provideDocumentOnDropEdits(requestId, URI.revive(resource), position, dataTransferDto, token)), undefined, undefined);
    }
    $resolveDropEdit(handle, id, token) {
        return this._withAdapter(handle, DocumentDropEditAdapter, adapter => adapter.resolveDropEdit(id, token), {}, undefined);
    }
    $releaseDocumentOnDropEdits(handle, cacheId) {
        this._withAdapter(handle, DocumentDropEditAdapter, adapter => Promise.resolve(adapter.releaseDropEdits(cacheId)), undefined, undefined);
    }
    // --- copy/paste actions
    registerDocumentPasteEditProvider(extension, selector, provider, metadata) {
        const handle = this._nextHandle();
        this._adapter.set(handle, new AdapterData(new DocumentPasteEditProvider(this._proxy, this._documents, provider, handle, extension), extension));
        this._proxy.$registerPasteEditProvider(handle, this._transformDocumentSelector(selector, extension), {
            supportsCopy: !!provider.prepareDocumentPaste,
            supportsPaste: !!provider.provideDocumentPasteEdits,
            supportsResolve: !!provider.resolveDocumentPasteEdit,
            providedPasteEditKinds: metadata.providedPasteEditKinds?.map(x => x.value),
            copyMimeTypes: metadata.copyMimeTypes,
            pasteMimeTypes: metadata.pasteMimeTypes,
        });
        return this._createDisposable(handle);
    }
    $prepareDocumentPaste(handle, resource, ranges, dataTransfer, token) {
        return this._withAdapter(handle, DocumentPasteEditProvider, adapter => adapter.prepareDocumentPaste(URI.revive(resource), ranges, dataTransfer, token), undefined, token);
    }
    $providePasteEdits(handle, requestId, resource, ranges, dataTransferDto, context, token) {
        return this._withAdapter(handle, DocumentPasteEditProvider, adapter => adapter.providePasteEdits(requestId, URI.revive(resource), ranges, dataTransferDto, context, token), undefined, token);
    }
    $resolvePasteEdit(handle, id, token) {
        return this._withAdapter(handle, DocumentPasteEditProvider, adapter => adapter.resolvePasteEdit(id, token), {}, undefined);
    }
    $releasePasteEdits(handle, cacheId) {
        this._withAdapter(handle, DocumentPasteEditProvider, adapter => Promise.resolve(adapter.releasePasteEdits(cacheId)), undefined, undefined);
    }
    // --- configuration
    static _serializeRegExp(regExp) {
        return {
            pattern: regExp.source,
            flags: regExp.flags,
        };
    }
    static _serializeIndentationRule(indentationRule) {
        return {
            decreaseIndentPattern: ExtHostLanguageFeatures._serializeRegExp(indentationRule.decreaseIndentPattern),
            increaseIndentPattern: ExtHostLanguageFeatures._serializeRegExp(indentationRule.increaseIndentPattern),
            indentNextLinePattern: indentationRule.indentNextLinePattern ? ExtHostLanguageFeatures._serializeRegExp(indentationRule.indentNextLinePattern) : undefined,
            unIndentedLinePattern: indentationRule.unIndentedLinePattern ? ExtHostLanguageFeatures._serializeRegExp(indentationRule.unIndentedLinePattern) : undefined,
        };
    }
    static _serializeOnEnterRule(onEnterRule) {
        return {
            beforeText: ExtHostLanguageFeatures._serializeRegExp(onEnterRule.beforeText),
            afterText: onEnterRule.afterText ? ExtHostLanguageFeatures._serializeRegExp(onEnterRule.afterText) : undefined,
            previousLineText: onEnterRule.previousLineText ? ExtHostLanguageFeatures._serializeRegExp(onEnterRule.previousLineText) : undefined,
            action: onEnterRule.action
        };
    }
    static _serializeOnEnterRules(onEnterRules) {
        return onEnterRules.map(ExtHostLanguageFeatures._serializeOnEnterRule);
    }
    static _serializeAutoClosingPair(autoClosingPair) {
        return {
            open: autoClosingPair.open,
            close: autoClosingPair.close,
            notIn: autoClosingPair.notIn ? autoClosingPair.notIn.map(v => SyntaxTokenType.toString(v)) : undefined,
        };
    }
    static _serializeAutoClosingPairs(autoClosingPairs) {
        return autoClosingPairs.map(ExtHostLanguageFeatures._serializeAutoClosingPair);
    }
    setLanguageConfiguration(extension, languageId, configuration) {
        const { wordPattern } = configuration;
        // check for a valid word pattern
        if (wordPattern && regExpLeadsToEndlessLoop(wordPattern)) {
            throw new Error(`Invalid language configuration: wordPattern '${wordPattern}' is not allowed to match the empty string.`);
        }
        // word definition
        if (wordPattern) {
            this._documents.setWordDefinitionFor(languageId, wordPattern);
        }
        else {
            this._documents.setWordDefinitionFor(languageId, undefined);
        }
        if (configuration.__electricCharacterSupport) {
            this._apiDeprecation.report('LanguageConfiguration.__electricCharacterSupport', extension, `Do not use.`);
        }
        if (configuration.__characterPairSupport) {
            this._apiDeprecation.report('LanguageConfiguration.__characterPairSupport', extension, `Do not use.`);
        }
        const handle = this._nextHandle();
        const serializedConfiguration = {
            comments: configuration.comments,
            brackets: configuration.brackets,
            wordPattern: configuration.wordPattern ? ExtHostLanguageFeatures._serializeRegExp(configuration.wordPattern) : undefined,
            indentationRules: configuration.indentationRules ? ExtHostLanguageFeatures._serializeIndentationRule(configuration.indentationRules) : undefined,
            onEnterRules: configuration.onEnterRules ? ExtHostLanguageFeatures._serializeOnEnterRules(configuration.onEnterRules) : undefined,
            __electricCharacterSupport: configuration.__electricCharacterSupport,
            __characterPairSupport: configuration.__characterPairSupport,
            autoClosingPairs: configuration.autoClosingPairs ? ExtHostLanguageFeatures._serializeAutoClosingPairs(configuration.autoClosingPairs) : undefined,
        };
        this._proxy.$setLanguageConfiguration(handle, languageId, serializedConfiguration);
        return this._createDisposable(handle);
    }
    $setWordDefinitions(wordDefinitions) {
        for (const wordDefinition of wordDefinitions) {
            this._documents.setWordDefinitionFor(wordDefinition.languageId, new RegExp(wordDefinition.regexSource, wordDefinition.regexFlags));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBRWpFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsS0FBSyxJQUFJLFdBQVcsRUFBVSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBYyxTQUFTLEVBQUUsTUFB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R0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLENBQUM7WUFDRCxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBQ0QsSUFBSSxhQUFhLEdBQWtDLFNBQVMsQ0FBQztRQUM3RCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3RCLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLENBQUM7WUFDRCxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBRUQsSUFBSSxZQUFZLEdBQWtDLFNBQVMsQ0FBQztRQUM1RCxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3RCLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLENBQUM7WUFDRCxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQWtDLFNBQVMsQ0FBQztRQUN0RCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3RCLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLENBQUM7WUFDRCxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxD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
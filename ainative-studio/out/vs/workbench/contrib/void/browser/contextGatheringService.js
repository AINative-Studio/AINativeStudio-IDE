var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
export const IContextGatheringService = createDecorator('contextGatheringService');
let ContextGatheringService = class ContextGatheringService extends Disposable {
    constructor(_langFeaturesService, _modelService, _codeEditorService) {
        super();
        this._langFeaturesService = _langFeaturesService;
        this._modelService = _modelService;
        this._codeEditorService = _codeEditorService;
        this._NUM_LINES = 3;
        this._MAX_SNIPPET_LINES = 7; // Reasonable size for context
        // Cache holds the most recent list of snippets.
        this._cache = [];
        this._snippetIntervals = [];
        this._modelService.getModels().forEach(model => this._subscribeToModel(model));
        this._register(this._modelService.onModelAdded(model => this._subscribeToModel(model)));
    }
    _subscribeToModel(model) {
        console.log('Subscribing to model:', model.uri.toString());
        this._register(model.onDidChangeContent(() => {
            const editor = this._codeEditorService.getFocusedCodeEditor();
            if (editor && editor.getModel() === model) {
                const pos = editor.getPosition();
                console.log('updateCache called at position:', pos);
                if (pos) {
                    this.updateCache(model, pos);
                }
            }
        }));
    }
    async updateCache(model, pos) {
        const snippets = new Set();
        this._snippetIntervals = []; // Reset intervals for new cache update
        await this._gatherNearbySnippets(model, pos, this._NUM_LINES, 3, snippets, this._snippetIntervals);
        await this._gatherParentSnippets(model, pos, this._NUM_LINES, 3, snippets, this._snippetIntervals);
        // Convert to array and filter overlapping snippets
        this._cache = Array.from(snippets);
        console.log('Cache updated:', this._cache);
    }
    getCachedSnippets() {
        return this._cache;
    }
    // Basic snippet extraction.
    _getSnippetForRange(model, range, numLines) {
        const startLine = Math.max(range.startLineNumber - numLines, 1);
        const endLine = Math.min(range.endLineNumber + numLines, model.getLineCount());
        // Enforce maximum snippet size
        const totalLines = endLine - startLine + 1;
        const adjustedStartLine = totalLines > this._MAX_SNIPPET_LINES
            ? endLine - this._MAX_SNIPPET_LINES + 1
            : startLine;
        const snippetRange = new Range(adjustedStartLine, 1, endLine, model.getLineMaxColumn(endLine));
        return this._cleanSnippet(model.getValueInRange(snippetRange));
    }
    _cleanSnippet(snippet) {
        return snippet
            .split('\n')
            // Remove empty lines and lines with only comments
            .filter(line => {
            const trimmed = line.trim();
            return trimmed && !/^\/\/+$/.test(trimmed);
        })
            // Rejoin with newlines
            .join('\n')
            // Remove excess whitespace
            .trim();
    }
    _normalizeSnippet(snippet) {
        return snippet
            // Remove multiple newlines
            .replace(/\n{2,}/g, '\n')
            // Remove trailing whitespace
            .trim();
    }
    _addSnippetIfNotOverlapping(model, range, snippets, visited) {
        const startLine = range.startLineNumber;
        const endLine = range.endLineNumber;
        const uri = model.uri.toString();
        if (!this._isRangeVisited(uri, startLine, endLine, visited)) {
            visited.push({ uri, startLine, endLine });
            const snippet = this._normalizeSnippet(this._getSnippetForRange(model, range, this._NUM_LINES));
            if (snippet.length > 0) {
                snippets.add(snippet);
            }
        }
    }
    async _gatherNearbySnippets(model, pos, numLines, depth, snippets, visited) {
        if (depth <= 0)
            return;
        const startLine = Math.max(pos.lineNumber - numLines, 1);
        const endLine = Math.min(pos.lineNumber + numLines, model.getLineCount());
        const range = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        this._addSnippetIfNotOverlapping(model, range, snippets, visited);
        const symbols = await this._getSymbolsNearPosition(model, pos, numLines);
        for (const sym of symbols) {
            const defs = await this._getDefinitionSymbols(model, sym);
            for (const def of defs) {
                const defModel = this._modelService.getModel(def.uri);
                if (defModel) {
                    const defPos = new Position(def.range.startLineNumber, def.range.startColumn);
                    this._addSnippetIfNotOverlapping(defModel, def.range, snippets, visited);
                    await this._gatherNearbySnippets(defModel, defPos, numLines, depth - 1, snippets, visited);
                }
            }
        }
    }
    async _gatherParentSnippets(model, pos, numLines, depth, snippets, visited) {
        if (depth <= 0)
            return;
        const container = await this._findContainerFunction(model, pos);
        if (!container)
            return;
        const containerRange = container.kind === 5 /* SymbolKind.Method */ ? container.selectionRange : container.range;
        this._addSnippetIfNotOverlapping(model, containerRange, snippets, visited);
        const symbols = await this._getSymbolsNearRange(model, containerRange, numLines);
        for (const sym of symbols) {
            const defs = await this._getDefinitionSymbols(model, sym);
            for (const def of defs) {
                const defModel = this._modelService.getModel(def.uri);
                if (defModel) {
                    const defPos = new Position(def.range.startLineNumber, def.range.startColumn);
                    this._addSnippetIfNotOverlapping(defModel, def.range, snippets, visited);
                    await this._gatherNearbySnippets(defModel, defPos, numLines, depth - 1, snippets, visited);
                }
            }
        }
        const containerPos = new Position(containerRange.startLineNumber, containerRange.startColumn);
        await this._gatherParentSnippets(model, containerPos, numLines, depth - 1, snippets, visited);
    }
    _isRangeVisited(uri, startLine, endLine, visited) {
        return visited.some(interval => interval.uri === uri &&
            !(endLine < interval.startLine || startLine > interval.endLine));
    }
    async _getSymbolsNearPosition(model, pos, numLines) {
        const startLine = Math.max(pos.lineNumber - numLines, 1);
        const endLine = Math.min(pos.lineNumber + numLines, model.getLineCount());
        const range = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        return this._getSymbolsInRange(model, range);
    }
    async _getSymbolsNearRange(model, range, numLines) {
        const centerLine = Math.floor((range.startLineNumber + range.endLineNumber) / 2);
        const startLine = Math.max(centerLine - numLines, 1);
        const endLine = Math.min(centerLine + numLines, model.getLineCount());
        const searchRange = new Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));
        return this._getSymbolsInRange(model, searchRange);
    }
    async _getSymbolsInRange(model, range) {
        const symbols = [];
        const providers = this._langFeaturesService.documentSymbolProvider.ordered(model);
        for (const provider of providers) {
            try {
                const result = await provider.provideDocumentSymbols(model, CancellationToken.None);
                if (result) {
                    const flat = this._flattenSymbols(result);
                    const intersecting = flat.filter(sym => this._rangesIntersect(sym.range, range));
                    symbols.push(...intersecting);
                }
            }
            catch (e) {
                console.warn('Symbol provider error:', e);
            }
        }
        // Also check reference providers.
        const refProviders = this._langFeaturesService.referenceProvider.ordered(model);
        for (let line = range.startLineNumber; line <= range.endLineNumber; line++) {
            const content = model.getLineContent(line);
            const words = content.match(/[a-zA-Z_]\w*/g) || [];
            for (const word of words) {
                const startColumn = content.indexOf(word) + 1;
                const pos = new Position(line, startColumn);
                if (!this._positionInRange(pos, range))
                    continue;
                for (const provider of refProviders) {
                    try {
                        const refs = await provider.provideReferences(model, pos, { includeDeclaration: true }, CancellationToken.None);
                        if (refs) {
                            const filtered = refs.filter(ref => this._rangesIntersect(ref.range, range));
                            for (const ref of filtered) {
                                symbols.push({
                                    name: word,
                                    detail: '',
                                    kind: 12 /* SymbolKind.Variable */,
                                    range: ref.range,
                                    selectionRange: ref.range,
                                    children: [],
                                    tags: []
                                });
                            }
                        }
                    }
                    catch (e) {
                        console.warn('Reference provider error:', e);
                    }
                }
            }
        }
        return symbols;
    }
    _flattenSymbols(symbols) {
        const flat = [];
        for (const sym of symbols) {
            flat.push(sym);
            if (sym.children && sym.children.length > 0) {
                flat.push(...this._flattenSymbols(sym.children));
            }
        }
        return flat;
    }
    _rangesIntersect(a, b) {
        return !(a.endLineNumber < b.startLineNumber ||
            a.startLineNumber > b.endLineNumber ||
            (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn) ||
            (a.startLineNumber === b.endLineNumber && a.endColumn > b.endColumn));
    }
    _positionInRange(pos, range) {
        return pos.lineNumber >= range.startLineNumber &&
            pos.lineNumber <= range.endLineNumber &&
            (pos.lineNumber !== range.startLineNumber || pos.column >= range.startColumn) &&
            (pos.lineNumber !== range.endLineNumber || pos.column <= range.endColumn);
    }
    // Get definition symbols for a given symbol.
    async _getDefinitionSymbols(model, symbol) {
        const pos = new Position(symbol.range.startLineNumber, symbol.range.startColumn);
        const providers = this._langFeaturesService.definitionProvider.ordered(model);
        const defs = [];
        for (const provider of providers) {
            try {
                const res = await provider.provideDefinition(model, pos, CancellationToken.None);
                if (res) {
                    const links = Array.isArray(res) ? res : [res];
                    defs.push(...links.map(link => ({
                        name: symbol.name,
                        detail: symbol.detail,
                        kind: symbol.kind,
                        range: link.range,
                        selectionRange: link.range,
                        children: [],
                        tags: symbol.tags || [],
                        uri: link.uri // Now keeping it as URI instead of converting to string
                    })));
                }
            }
            catch (e) {
                console.warn('Definition provider error:', e);
            }
        }
        return defs;
    }
    async _findContainerFunction(model, pos) {
        const searchRange = new Range(Math.max(pos.lineNumber - 1, 1), 1, Math.min(pos.lineNumber + 1, model.getLineCount()), model.getLineMaxColumn(pos.lineNumber));
        const symbols = await this._getSymbolsInRange(model, searchRange);
        const funcs = symbols.filter(s => (s.kind === 11 /* SymbolKind.Function */ || s.kind === 5 /* SymbolKind.Method */) &&
            this._positionInRange(pos, s.range));
        if (!funcs.length)
            return null;
        return funcs.reduce((innermost, current) => {
            if (!innermost)
                return current;
            const moreInner = (current.range.startLineNumber > innermost.range.startLineNumber ||
                (current.range.startLineNumber === innermost.range.startLineNumber &&
                    current.range.startColumn > innermost.range.startColumn)) &&
                (current.range.endLineNumber < innermost.range.endLineNumber ||
                    (current.range.endLineNumber === innermost.range.endLineNumber &&
                        current.range.endColumn < innermost.range.endColumn));
            return moreInner ? current : innermost;
        }, null);
    }
};
ContextGatheringService = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IModelService),
    __param(2, ICodeEditorService)
], ContextGatheringService);
registerSingleton(IContextGatheringService, ContextGatheringService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEdhdGhlcmluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2NvbnRleHRHYXRoZXJpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUd0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLEtBQUssRUFBVSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBcUI5RixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUM7QUFFN0csSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBUS9DLFlBQzJCLG9CQUErRCxFQUMxRSxhQUE2QyxFQUN4QyxrQkFBdUQ7UUFFM0UsS0FBSyxFQUFFLENBQUM7UUFKbUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEwQjtRQUN6RCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUN2Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBVDNE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
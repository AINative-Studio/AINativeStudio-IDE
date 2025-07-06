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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dEdhdGhlcmluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udGV4dEdhdGhlcmluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBR3RFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsS0FBSyxFQUFVLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFxQjlGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FBMkIseUJBQXlCLENBQUMsQ0FBQztBQUU3RyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFRL0MsWUFDMkIsb0JBQStELEVBQzFFLGFBQTZDLEVBQ3hDLGtCQUF1RDtRQUUzRSxLQUFLLEVBQUUsQ0FBQztRQUptQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTBCO1FBQ3pELGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3ZCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFUM0Qs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
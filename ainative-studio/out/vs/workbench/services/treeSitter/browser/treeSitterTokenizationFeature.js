/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { FileAccess } from '../../../../base/common/network.js';
import { LazyTokenizationSupport, TreeSitterTokenizationRegistry } from '../../../../editor/common/languages.js';
import { EDITOR_EXPERIMENTAL_PREFER_TREESITTER, ITreeSitterParserService, ITreeSitterImporter, TREESITTER_ALLOWED_SUPPORT } from '../../../../editor/common/services/treeSitterParserService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { findMetadata } from '../../themes/common/colorThemeData.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ITreeSitterTokenizationStoreService } from '../../../../editor/common/model/treeSitterTokenStoreService.js';
import { TokenQuality } from '../../../../editor/common/model/tokenStore.js';
import { Range } from '../../../../editor/common/core/range.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { findLikelyRelevantLines } from '../../../../editor/common/model/textModelTokens.js';
import { TreeSitterCodeEditors } from './treeSitterCodeEditors.js';
import { IWorkbenchThemeService } from '../../themes/common/workbenchThemeService.js';
import { Position } from '../../../../editor/common/core/position.js';
export const ITreeSitterTokenizationFeature = createDecorator('treeSitterTokenizationFeature');
export const TREESITTER_BASE_SCOPES = {
    'css': 'source.css',
    'typescript': 'source.ts',
    'ini': 'source.ini',
    'regex': 'source.regex',
};
const BRACKETS = /[\{\}\[\]\<\>\(\)]/g;
let TreeSitterTokenizationFeature = class TreeSitterTokenizationFeature extends Disposable {
    constructor(_treeSitterImporter, _languageService, _configurationService, _instantiationService, _fileService) {
        super();
        this._treeSitterImporter = _treeSitterImporter;
        this._languageService = _languageService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._fileService = _fileService;
        this._tokenizersRegistrations = this._register(new DisposableMap());
        this._handleGrammarsExtPoint();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(EDITOR_EXPERIMENTAL_PREFER_TREESITTER)) {
                this._handleGrammarsExtPoint();
            }
        }));
    }
    _getSetting(languageId) {
        return this._configurationService.getValue(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.${languageId}`);
    }
    _handleGrammarsExtPoint() {
        // Eventually, this should actually use an extension point to add tree sitter grammars, but for now they are hard coded in core
        for (const languageId of TREESITTER_ALLOWED_SUPPORT) {
            const setting = this._getSetting(languageId);
            if (setting && !this._tokenizersRegistrations.has(languageId)) {
                const lazyTokenizationSupport = new LazyTokenizationSupport(() => this._createTokenizationSupport(languageId));
                const disposableStore = new DisposableStore();
                disposableStore.add(lazyTokenizationSupport);
                disposableStore.add(TreeSitterTokenizationRegistry.registerFactory(languageId, lazyTokenizationSupport));
                this._tokenizersRegistrations.set(languageId, disposableStore);
                TreeSitterTokenizationRegistry.getOrCreate(languageId);
            }
        }
        const languagesToUnregister = [...this._tokenizersRegistrations.keys()].filter(languageId => !this._getSetting(languageId));
        for (const languageId of languagesToUnregister) {
            this._tokenizersRegistrations.deleteAndDispose(languageId);
        }
    }
    async _fetchQueries(newLanguage) {
        const languageLocation = `vs/editor/common/languages/highlights/${newLanguage}.scm`;
        const query = await this._fileService.readFile(FileAccess.asFileUri(languageLocation));
        return query.value.toString();
    }
    async _createTokenizationSupport(languageId) {
        const queries = await this._fetchQueries(languageId);
        const Query = await this._treeSitterImporter.getQueryClass();
        return this._instantiationService.createInstance(TreeSitterTokenizationSupport, queries, Query, languageId, this._languageService.languageIdCodec);
    }
};
TreeSitterTokenizationFeature = __decorate([
    __param(0, ITreeSitterImporter),
    __param(1, ILanguageService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IFileService)
], TreeSitterTokenizationFeature);
export { TreeSitterTokenizationFeature };
let TreeSitterTokenizationSupport = class TreeSitterTokenizationSupport extends Disposable {
    constructor(_queries, Query, _languageId, _languageIdCodec, _treeSitterService, _themeService, _tokenizationStoreService, _instantiationService) {
        super();
        this._queries = _queries;
        this.Query = Query;
        this._languageId = _languageId;
        this._languageIdCodec = _languageIdCodec;
        this._treeSitterService = _treeSitterService;
        this._themeService = _themeService;
        this._tokenizationStoreService = _tokenizationStoreService;
        this._instantiationService = _instantiationService;
        this._onDidChangeTokens = this._register(new Emitter());
        this.onDidChangeTokens = this._onDidChangeTokens.event;
        this._onDidCompleteBackgroundTokenization = this._register(new Emitter());
        this.onDidChangeBackgroundTokenization = this._onDidCompleteBackgroundTokenization.event;
        this._codeEditors = this._instantiationService.createInstance(TreeSitterCodeEditors, this._languageId);
        this._register(this._codeEditors.onDidChangeViewport(e => {
            this._parseAndTokenizeViewPort(e.model, e.ranges);
        }));
        this._codeEditors.getInitialViewPorts().then(async (viewports) => {
            for (const viewport of viewports) {
                this._parseAndTokenizeViewPort(viewport.model, viewport.ranges);
            }
        });
        this._register(Event.runAndSubscribe(this._themeService.onDidColorThemeChange, (e) => this._updateTheme(e)));
        this._register(this._treeSitterService.onDidUpdateTree((e) => {
            if (e.languageId !== this._languageId) {
                return;
            }
            if (this._tokenizationStoreService.hasTokens(e.textModel)) {
                // Mark the range for refresh immediately
                for (const range of e.ranges) {
                    this._tokenizationStoreService.markForRefresh(e.textModel, range.newRange);
                }
            }
            if (e.versionId !== e.textModel.getVersionId()) {
                return;
            }
            // First time we see a tree we need to build a token store.
            if (!this._tokenizationStoreService.hasTokens(e.textModel)) {
                // This will likely not happen as we first handle all models, which are ready before trees.
                this._firstTreeUpdate(e.textModel, e.versionId, e.tree);
            }
            else {
                this._handleTreeUpdate(e.ranges, e.textModel, e.versionId, e.tree);
            }
        }));
    }
    get _encodedLanguageId() {
        if (!this._encodedLanguage) {
            this._encodedLanguage = this._languageIdCodec.encodeLanguageId(this._languageId);
        }
        return this._encodedLanguage;
    }
    _setInitialTokens(textModel) {
        const tokens = this._createEmptyTokens(textModel);
        this._tokenizationStoreService.setTokens(textModel, tokens, TokenQuality.None);
    }
    _forceParseAndTokenizeContent(model, range, startOffsetOfRangeInDocument, endOffsetOfRangeInDocument, content, asUpdate) {
        const likelyRelevantLines = findLikelyRelevantLines(model, range.startLineNumber).likelyRelevantLines;
        const likelyRelevantPrefix = likelyRelevantLines.join(model.getEOL());
        const tree = this._treeSitterService.getTreeSync(`${likelyRelevantPrefix}${content}`, this._languageId);
        if (!tree) {
            return;
        }
        const treeRange = new Range(1, 1, range.endLineNumber - range.startLineNumber + 1 + likelyRelevantLines.length, range.endColumn);
        const captures = this._captureAtRange(treeRange, tree);
        const tokens = this._tokenizeCapturesWithMetadata(tree, captures, likelyRelevantPrefix.length, endOffsetOfRangeInDocument - startOffsetOfRangeInDocument + likelyRelevantPrefix.length);
        if (!tokens) {
            return;
        }
        if (asUpdate) {
            return this._rangeTokensAsUpdates(startOffsetOfRangeInDocument, tokens.endOffsetsAndMetadata, likelyRelevantPrefix.length);
        }
        else {
            return tokens.endOffsetsAndMetadata;
        }
    }
    async _parseAndTokenizeViewPort(model, viewportRanges) {
        if (!this._tokenizationStoreService.hasTokens(model)) {
            this._setInitialTokens(model);
        }
        for (const range of viewportRanges) {
            const startOffsetOfRangeInDocument = model.getOffsetAt(range.getStartPosition());
            const endOffsetOfRangeInDocument = model.getOffsetAt(range.getEndPosition());
            const version = model.getVersionId();
            if (this._tokenizationStoreService.rangeHasTokens(model, range, TokenQuality.ViewportGuess)) {
                continue;
            }
            const content = model.getValueInRange(range);
            const tokenUpdates = await this._forceParseAndTokenizeContent(model, range, startOffsetOfRangeInDocument, endOffsetOfRangeInDocument, content, true);
            if (!tokenUpdates || this._tokenizationStoreService.rangeHasTokens(model, range, TokenQuality.ViewportGuess)) {
                continue;
            }
            if (tokenUpdates.length === 0) {
                continue;
            }
            const lastToken = tokenUpdates[tokenUpdates.length - 1];
            const oldRangeLength = lastToken.startOffsetInclusive + lastToken.length - tokenUpdates[0].startOffsetInclusive;
            this._tokenizationStoreService.updateTokens(model, version, [{ newTokens: tokenUpdates, oldRangeLength }], TokenQuality.ViewportGuess);
            this._onDidChangeTokens.fire({ textModel: model, changes: { semanticTokensApplied: false, ranges: [{ fromLineNumber: range.startLineNumber, toLineNumber: range.endLineNumber }] } });
        }
    }
    guessTokensForLinesContent(lineNumber, textModel, lines) {
        if (lines.length === 0) {
            return undefined;
        }
        const lineContent = lines.join(textModel.getEOL());
        const range = new Range(1, 1, lineNumber + lines.length, lines[lines.length - 1].length + 1);
        const startOffset = textModel.getOffsetAt({ lineNumber, column: 1 });
        const tokens = this._forceParseAndTokenizeContent(textModel, range, startOffset, startOffset + lineContent.length, lineContent, false);
        if (!tokens) {
            return undefined;
        }
        const tokensByLine = new Array(lines.length);
        let tokensIndex = 0;
        let tokenStartOffset = 0;
        let lineStartOffset = 0;
        for (let i = 0; i < lines.length; i++) {
            const tokensForLine = [];
            let moveToNextLine = false;
            for (let j = tokensIndex; (!moveToNextLine && (j < tokens.length)); j++) {
                const token = tokens[j];
                const lineAdjustedEndOffset = token.endOffset - lineStartOffset;
                const lineAdjustedStartOffset = tokenStartOffset - lineStartOffset;
                if (lineAdjustedEndOffset <= lines[i].length) {
                    tokensForLine.push({ endOffset: lineAdjustedEndOffset, metadata: token.metadata });
                    tokensIndex++;
                }
                else if (lineAdjustedStartOffset < lines[i].length) {
                    const partialToken = { endOffset: lines[i].length, metadata: token.metadata };
                    tokensForLine.push(partialToken);
                    moveToNextLine = true;
                }
                else {
                    moveToNextLine = true;
                }
                tokenStartOffset = token.endOffset;
            }
            tokensByLine[i] = this._endOffsetTokensToUint32Array(tokensForLine);
            lineStartOffset += lines[i].length + textModel.getEOL().length;
        }
        return tokensByLine;
    }
    _emptyTokensForOffsetAndLength(offset, length, emptyToken) {
        return { token: emptyToken, length: offset + length, startOffsetInclusive: 0 };
    }
    _createEmptyTokens(textModel) {
        const emptyToken = this._emptyToken();
        const modelEndOffset = textModel.getValueLength();
        const emptyTokens = [this._emptyTokensForOffsetAndLength(0, modelEndOffset, emptyToken)];
        return emptyTokens;
    }
    _firstTreeUpdate(textModel, versionId, tree) {
        this._setInitialTokens(textModel);
        return this._setViewPortTokens(textModel, versionId, tree);
    }
    _setViewPortTokens(textModel, versionId, tree) {
        const maxLine = textModel.getLineCount();
        let rangeChanges;
        const editor = this._codeEditors.getEditorForModel(textModel);
        if (editor) {
            const viewPort = editor.getVisibleRangesPlusViewportAboveBelow();
            const ranges = new Array(viewPort.length);
            rangeChanges = new Array(viewPort.length);
            for (let i = 0; i < viewPort.length; i++) {
                const range = viewPort[i];
                ranges[i] = { fromLineNumber: range.startLineNumber, toLineNumber: range.endLineNumber < maxLine ? range.endLineNumber : maxLine };
                const newRangeStartOffset = textModel.getOffsetAt(range.getStartPosition());
                const newRangeEndOffset = textModel.getOffsetAt(range.getEndPosition());
                rangeChanges[i] = {
                    newRange: range,
                    newRangeStartOffset,
                    newRangeEndOffset,
                };
            }
        }
        else {
            const valueLength = textModel.getValueLength();
            rangeChanges = [{ newRange: new Range(1, 1, maxLine, textModel.getLineMaxColumn(maxLine)), newRangeStartOffset: 0, newRangeEndOffset: valueLength }];
        }
        return this._handleTreeUpdate(rangeChanges, textModel, versionId, tree);
    }
    /**
     * Do not await in this method, it will cause a race
     */
    _handleTreeUpdate(ranges, textModel, versionId, textModelTreeSitter) {
        const tree = textModelTreeSitter.parseResult?.tree;
        if (!tree) {
            return;
        }
        const rangeChanges = [];
        const chunkSize = 1000;
        for (let i = 0; i < ranges.length; i++) {
            const rangeLinesLength = ranges[i].newRange.endLineNumber - ranges[i].newRange.startLineNumber;
            if (rangeLinesLength > chunkSize) {
                // Split the range into chunks to avoid long operations
                const fullRangeEndLineNumber = ranges[i].newRange.endLineNumber;
                let chunkLineStart = ranges[i].newRange.startLineNumber;
                let chunkColumnStart = ranges[i].newRange.startColumn;
                let chunkLineEnd = chunkLineStart + chunkSize;
                do {
                    const chunkStartingPosition = new Position(chunkLineStart, chunkColumnStart);
                    const chunkEndColumn = ((chunkLineEnd === ranges[i].newRange.endLineNumber) ? ranges[i].newRange.endColumn : textModel.getLineMaxColumn(chunkLineEnd));
                    const chunkEndPosition = new Position(chunkLineEnd, chunkEndColumn);
                    const chunkRange = Range.fromPositions(chunkStartingPosition, chunkEndPosition);
                    rangeChanges.push({
                        range: chunkRange,
                        startOffset: textModel.getOffsetAt(chunkRange.getStartPosition()),
                        endOffset: textModel.getOffsetAt(chunkRange.getEndPosition())
                    });
                    chunkLineStart = chunkLineEnd + 1;
                    chunkColumnStart = 1;
                    if (chunkLineEnd < fullRangeEndLineNumber && chunkLineEnd + chunkSize > fullRangeEndLineNumber) {
                        chunkLineEnd = fullRangeEndLineNumber;
                    }
                    else {
                        chunkLineEnd = chunkLineEnd + chunkSize;
                    }
                } while (chunkLineEnd <= fullRangeEndLineNumber);
            }
            else {
                // Check that the previous range doesn't overlap
                if ((i === 0) || (rangeChanges[i - 1].endOffset < ranges[i].newRangeStartOffset)) {
                    rangeChanges.push({
                        range: ranges[i].newRange,
                        startOffset: ranges[i].newRangeStartOffset,
                        endOffset: ranges[i].newRangeEndOffset
                    });
                }
                else if (rangeChanges[i - 1].endOffset < ranges[i].newRangeEndOffset) {
                    // clip the range to the previous range
                    const startPosition = textModel.getPositionAt(rangeChanges[i - 1].endOffset + 1);
                    const range = new Range(startPosition.lineNumber, startPosition.column, ranges[i].newRange.endLineNumber, ranges[i].newRange.endColumn);
                    rangeChanges.push({
                        range,
                        startOffset: rangeChanges[i - 1].endOffset + 1,
                        endOffset: ranges[i].newRangeEndOffset
                    });
                }
            }
        }
        // Get the captures immediately while the text model is correct
        const captures = rangeChanges.map(range => this._getCaptures(range.range, textModelTreeSitter, tree));
        // Don't block
        return this._updateTreeForRanges(textModel, rangeChanges, versionId, tree, captures).then(() => {
            const tree = this._getTree(textModel);
            if (!textModel.isDisposed() && (tree?.parseResult?.versionId === textModel.getVersionId())) {
                this._refreshNeedsRefresh(textModel, versionId);
            }
        });
    }
    async _updateTreeForRanges(textModel, rangeChanges, versionId, tree, captures) {
        let tokenUpdate;
        for (let i = 0; i < rangeChanges.length; i++) {
            if (!textModel.isDisposed() && versionId !== textModel.getVersionId()) {
                // Our captures have become invalid and we need to re-capture
                break;
            }
            const capture = captures[i];
            const range = rangeChanges[i];
            const updates = this.getTokensInRange(textModel, range.range, range.startOffset, range.endOffset, tree, capture);
            if (updates) {
                tokenUpdate = { newTokens: updates };
            }
            else {
                tokenUpdate = { newTokens: [] };
            }
            this._tokenizationStoreService.updateTokens(textModel, versionId, [tokenUpdate], TokenQuality.Accurate);
            this._onDidChangeTokens.fire({
                textModel: textModel,
                changes: {
                    semanticTokensApplied: false,
                    ranges: [{ fromLineNumber: range.range.getStartPosition().lineNumber, toLineNumber: range.range.getEndPosition().lineNumber }]
                }
            });
            await new Promise(resolve => setTimeout0(resolve));
        }
        this._onDidCompleteBackgroundTokenization.fire({ textModel });
    }
    _refreshNeedsRefresh(textModel, versionId) {
        const rangesToRefresh = this._tokenizationStoreService.getNeedsRefresh(textModel);
        if (rangesToRefresh.length === 0) {
            return;
        }
        const rangeChanges = new Array(rangesToRefresh.length);
        for (let i = 0; i < rangesToRefresh.length; i++) {
            const range = rangesToRefresh[i];
            rangeChanges[i] = {
                newRange: range.range,
                newRangeStartOffset: range.startOffset,
                newRangeEndOffset: range.endOffset
            };
        }
        const tree = this._getTree(textModel);
        if (tree?.parseResult?.tree && tree.parseResult.versionId === versionId) {
            this._handleTreeUpdate(rangeChanges, textModel, versionId, tree);
        }
    }
    _rangeTokensAsUpdates(rangeOffset, endOffsetToken, startingOffsetInArray) {
        const updates = [];
        let lastEnd = 0;
        for (const token of endOffsetToken) {
            if (token.endOffset <= lastEnd || (startingOffsetInArray && (token.endOffset < startingOffsetInArray))) {
                continue;
            }
            let tokenUpdate;
            if (startingOffsetInArray && (lastEnd < startingOffsetInArray)) {
                tokenUpdate = { startOffsetInclusive: rangeOffset + startingOffsetInArray, length: token.endOffset - startingOffsetInArray, token: token.metadata };
            }
            else {
                tokenUpdate = { startOffsetInclusive: rangeOffset + lastEnd, length: token.endOffset - lastEnd, token: token.metadata };
            }
            updates.push(tokenUpdate);
            lastEnd = token.endOffset;
        }
        return updates;
    }
    getTokensInRange(textModel, range, rangeStartOffset, rangeEndOffset, tree, captures) {
        const tokens = captures ? this._tokenizeCapturesWithMetadata(tree, captures, rangeStartOffset, rangeEndOffset) : this._tokenize(range, rangeStartOffset, rangeEndOffset, textModel);
        if (tokens?.endOffsetsAndMetadata) {
            return this._rangeTokensAsUpdates(rangeStartOffset, tokens.endOffsetsAndMetadata);
        }
        return undefined;
    }
    _getTree(textModel) {
        return this._treeSitterService.getParseResult(textModel);
    }
    _ensureQuery() {
        if (!this._query) {
            const language = this._treeSitterService.getOrInitLanguage(this._languageId);
            if (!language) {
                if (!this._languageAddedListener) {
                    this._languageAddedListener = this._register(Event.onceIf(this._treeSitterService.onDidAddLanguage, e => e.id === this._languageId)((e) => {
                        this._query = new this.Query(e.language, this._queries);
                    }));
                }
                return;
            }
            this._query = new this.Query(language, this._queries);
        }
        return this._query;
    }
    _updateTheme(e) {
        this._colorThemeData = this._themeService.getColorTheme();
        for (const model of this._codeEditors.textModels) {
            const modelRange = model.getFullModelRange();
            this._tokenizationStoreService.markForRefresh(model, modelRange);
            const editor = this._codeEditors.getEditorForModel(model);
            if (editor) {
                this._parseAndTokenizeViewPort(model, editor.getVisibleRangesPlusViewportAboveBelow());
            }
        }
    }
    captureAtPosition(lineNumber, column, textModel) {
        const textModelTreeSitter = this._getTree(textModel);
        if (!textModelTreeSitter?.parseResult?.tree) {
            return [];
        }
        const captures = this._captureAtRangeWithInjections(new Range(lineNumber, column, lineNumber, column + 1), textModelTreeSitter, textModelTreeSitter.parseResult.tree);
        return captures;
    }
    captureAtRangeTree(range, tree, textModelTreeSitter) {
        const captures = textModelTreeSitter ? this._captureAtRangeWithInjections(range, textModelTreeSitter, tree) : this._captureAtRange(range, tree);
        return captures;
    }
    _captureAtRange(range, tree) {
        const query = this._ensureQuery();
        if (!tree || !query) {
            return [];
        }
        // Tree sitter row is 0 based, column is 0 based
        return query.captures(tree.rootNode, { startPosition: { row: range.startLineNumber - 1, column: range.startColumn - 1 }, endPosition: { row: range.endLineNumber - 1, column: range.endColumn - 1 } }).map(capture => ({
            name: capture.name,
            text: capture.node.text,
            node: {
                startIndex: capture.node.startIndex,
                endIndex: capture.node.endIndex,
                startPosition: {
                    lineNumber: capture.node.startPosition.row + 1,
                    column: capture.node.startPosition.column + 1
                },
                endPosition: {
                    lineNumber: capture.node.endPosition.row + 1,
                    column: capture.node.endPosition.column + 1
                }
            },
            encodedLanguageId: this._encodedLanguageId
        }));
    }
    _captureAtRangeWithInjections(range, textModelTreeSitter, tree) {
        const query = this._ensureQuery();
        if (!textModelTreeSitter?.parseResult || !query) {
            return [];
        }
        const captures = this._captureAtRange(range, tree);
        for (let i = 0; i < captures.length; i++) {
            const capture = captures[i];
            const capStartLine = capture.node.startPosition.lineNumber;
            const capEndLine = capture.node.endPosition.lineNumber;
            const capStartColumn = capture.node.startPosition.column;
            const capEndColumn = capture.node.endPosition.column;
            const startLine = ((capStartLine > range.startLineNumber) && (capStartLine < range.endLineNumber)) ? capStartLine : range.startLineNumber;
            const endLine = ((capEndLine > range.startLineNumber) && (capEndLine < range.endLineNumber)) ? capEndLine : range.endLineNumber;
            const startColumn = (capStartLine === range.startLineNumber) ? (capStartColumn < range.startColumn ? range.startColumn : capStartColumn) : (capStartLine < range.startLineNumber ? range.startColumn : capStartColumn);
            const endColumn = (capEndLine === range.endLineNumber) ? (capEndColumn > range.endColumn ? range.endColumn : capEndColumn) : (capEndLine > range.endLineNumber ? range.endColumn : capEndColumn);
            const injectionRange = new Range(startLine, startColumn, endLine, endColumn);
            const injection = this._getInjectionCaptures(textModelTreeSitter, capture, injectionRange);
            if (injection && injection.length > 0) {
                captures.splice(i + 1, 0, ...injection);
                i += injection.length;
            }
        }
        return captures;
    }
    /**
     * Gets the tokens for a given line.
     * Each token takes 2 elements in the array. The first element is the offset of the end of the token *in the line, not in the document*, and the second element is the metadata.
     *
     * @param lineNumber
     * @returns
     */
    tokenizeEncoded(lineNumber, textModel) {
        const tokens = this._tokenizeEncoded(lineNumber, textModel);
        if (!tokens) {
            return undefined;
        }
        const updates = this._rangeTokensAsUpdates(textModel.getOffsetAt({ lineNumber, column: 1 }), tokens.result);
        if (tokens.versionId === textModel.getVersionId()) {
            this._tokenizationStoreService.updateTokens(textModel, tokens.versionId, [{ newTokens: updates, oldRangeLength: textModel.getLineLength(lineNumber) }], TokenQuality.Accurate);
        }
    }
    tokenizeEncodedInstrumented(lineNumber, textModel) {
        const tokens = this._tokenizeEncoded(lineNumber, textModel);
        if (!tokens) {
            return undefined;
        }
        return { result: this._endOffsetTokensToUint32Array(tokens.result), captureTime: tokens.captureTime, metadataTime: tokens.metadataTime };
    }
    _getCaptures(range, textModelTreeSitter, tree) {
        const captures = this._captureAtRangeWithInjections(range, textModelTreeSitter, tree);
        return captures;
    }
    _tokenize(range, rangeStartOffset, rangeEndOffset, textModel) {
        const tree = this._getTree(textModel);
        if (!tree?.parseResult?.tree) {
            return undefined;
        }
        const captures = this._getCaptures(range, tree, tree.parseResult.tree);
        const result = this._tokenizeCapturesWithMetadata(tree.parseResult.tree, captures, rangeStartOffset, rangeEndOffset);
        if (!result) {
            return undefined;
        }
        return { ...result, versionId: tree.parseResult.versionId };
    }
    _createTokensFromCaptures(tree, captures, rangeStartOffset, rangeEndOffset) {
        const stopwatch = StopWatch.create();
        const rangeLength = rangeEndOffset - rangeStartOffset;
        const encodedLanguageId = this._languageIdCodec.encodeLanguageId(this._languageId);
        const baseScope = TREESITTER_BASE_SCOPES[this._languageId] || 'source';
        if (captures.length === 0) {
            if (tree) {
                stopwatch.stop();
                const endOffsetsAndMetadata = [{ endOffset: rangeLength, scopes: [], encodedLanguageId }];
                return { endOffsets: endOffsetsAndMetadata, captureTime: stopwatch.elapsed() };
            }
            return undefined;
        }
        const endOffsetsAndScopes = Array(captures.length);
        endOffsetsAndScopes.fill({ endOffset: 0, scopes: [baseScope], encodedLanguageId });
        let tokenIndex = 0;
        const increaseSizeOfTokensByOneToken = () => {
            endOffsetsAndScopes.push({ endOffset: 0, scopes: [baseScope], encodedLanguageId });
        };
        const brackets = (capture, startOffset) => {
            return (capture.name.includes('punctuation') && capture.text) ? Array.from(capture.text.matchAll(BRACKETS)).map(match => startOffset + match.index) : undefined;
        };
        const addCurrentTokenToArray = (capture, startOffset, endOffset, position) => {
            if (position !== undefined) {
                const oldScopes = endOffsetsAndScopes[position].scopes;
                let oldBracket = endOffsetsAndScopes[position].bracket;
                // Check that the previous token ends at the same point that the current token starts
                const prevEndOffset = position > 0 ? endOffsetsAndScopes[position - 1].endOffset : 0;
                if (prevEndOffset !== startOffset) {
                    let preInsertBracket = undefined;
                    if (oldBracket && oldBracket.length > 0) {
                        preInsertBracket = [];
                        const postInsertBracket = [];
                        for (let i = 0; i < oldBracket.length; i++) {
                            const bracket = oldBracket[i];
                            if (bracket < startOffset) {
                                preInsertBracket.push(bracket);
                            }
                            else if (bracket > endOffset) {
                                postInsertBracket.push(bracket);
                            }
                        }
                        if (preInsertBracket.length === 0) {
                            preInsertBracket = undefined;
                        }
                        if (postInsertBracket.length === 0) {
                            oldBracket = undefined;
                        }
                        else {
                            oldBracket = postInsertBracket;
                        }
                    }
                    // We need to add some of the position token to cover the space
                    endOffsetsAndScopes.splice(position, 0, { endOffset: startOffset, scopes: [...oldScopes], bracket: preInsertBracket, encodedLanguageId: capture.encodedLanguageId });
                    position++;
                    increaseSizeOfTokensByOneToken();
                    tokenIndex++;
                }
                endOffsetsAndScopes.splice(position, 0, { endOffset: endOffset, scopes: [...oldScopes, capture.name], bracket: brackets(capture, startOffset), encodedLanguageId: capture.encodedLanguageId });
                endOffsetsAndScopes[tokenIndex].bracket = oldBracket;
            }
            else {
                endOffsetsAndScopes[tokenIndex] = { endOffset: endOffset, scopes: [baseScope, capture.name], bracket: brackets(capture, startOffset), encodedLanguageId: capture.encodedLanguageId };
            }
            tokenIndex++;
        };
        for (let captureIndex = 0; captureIndex < captures.length; captureIndex++) {
            const capture = captures[captureIndex];
            const tokenEndIndex = capture.node.endIndex < rangeEndOffset ? ((capture.node.endIndex < rangeStartOffset) ? rangeStartOffset : capture.node.endIndex) : rangeEndOffset;
            const tokenStartIndex = capture.node.startIndex < rangeStartOffset ? rangeStartOffset : capture.node.startIndex;
            const endOffset = tokenEndIndex - rangeStartOffset;
            // Not every character will get captured, so we need to make sure that our current capture doesn't bleed toward the start of the line and cover characters that it doesn't apply to.
            // We do this by creating a new token in the array if the previous token ends before the current token starts.
            let previousEndOffset;
            const currentTokenLength = tokenEndIndex - tokenStartIndex;
            if (captureIndex > 0) {
                previousEndOffset = endOffsetsAndScopes[(tokenIndex - 1)].endOffset;
            }
            else {
                previousEndOffset = tokenStartIndex - rangeStartOffset - 1;
            }
            const startOffset = endOffset - currentTokenLength;
            if ((previousEndOffset >= 0) && (previousEndOffset < startOffset)) {
                // Add en empty token to cover the space where there were no captures
                endOffsetsAndScopes[tokenIndex] = { endOffset: startOffset, scopes: [baseScope], encodedLanguageId: this._encodedLanguageId };
                tokenIndex++;
                increaseSizeOfTokensByOneToken();
            }
            if (currentTokenLength < 0) {
                // This happens when we have a token "gap" right at the end of the capture range. The last capture isn't used because it's start index isn't included in the range.
                continue;
            }
            if (previousEndOffset >= endOffset) {
                // walk back through the tokens until we find the one that contains the current token
                let withinTokenIndex = tokenIndex - 1;
                let previousTokenEndOffset = endOffsetsAndScopes[withinTokenIndex].endOffset;
                let previousTokenStartOffset = ((withinTokenIndex >= 2) ? endOffsetsAndScopes[withinTokenIndex - 1].endOffset : 0);
                do {
                    // Check that the current token doesn't just replace the last token
                    if ((previousTokenStartOffset + currentTokenLength) === previousTokenEndOffset) {
                        if (previousTokenStartOffset === startOffset) {
                            // Current token and previous token span the exact same characters, add the scopes to the previous token
                            endOffsetsAndScopes[withinTokenIndex].scopes.push(capture.name);
                            const oldBracket = endOffsetsAndScopes[withinTokenIndex].bracket;
                            endOffsetsAndScopes[withinTokenIndex].bracket = ((oldBracket && (oldBracket.length > 0)) ? oldBracket : brackets(capture, startOffset));
                        }
                    }
                    else if (previousTokenStartOffset <= startOffset) {
                        addCurrentTokenToArray(capture, startOffset, endOffset, withinTokenIndex);
                        break;
                    }
                    withinTokenIndex--;
                    previousTokenStartOffset = ((withinTokenIndex >= 1) ? endOffsetsAndScopes[withinTokenIndex - 1].endOffset : 0);
                    previousTokenEndOffset = ((withinTokenIndex >= 0) ? endOffsetsAndScopes[withinTokenIndex].endOffset : 0);
                } while (previousTokenEndOffset > startOffset);
            }
            else {
                // Just add the token to the array
                addCurrentTokenToArray(capture, startOffset, endOffset);
            }
        }
        // Account for uncaptured characters at the end of the line
        if ((endOffsetsAndScopes[tokenIndex - 1].endOffset < rangeLength)) {
            if (rangeLength - endOffsetsAndScopes[tokenIndex - 1].endOffset > 0) {
                increaseSizeOfTokensByOneToken();
                endOffsetsAndScopes[tokenIndex] = { endOffset: rangeLength, scopes: endOffsetsAndScopes[tokenIndex].scopes, encodedLanguageId: this._encodedLanguageId };
                tokenIndex++;
            }
        }
        for (let i = 0; i < endOffsetsAndScopes.length; i++) {
            const token = endOffsetsAndScopes[i];
            if (token.endOffset === 0 && token.scopes.length === 0 && i !== 0) {
                endOffsetsAndScopes.splice(i, endOffsetsAndScopes.length - i);
                break;
            }
        }
        const captureTime = stopwatch.elapsed();
        return { endOffsets: endOffsetsAndScopes, captureTime };
    }
    _getInjectionCaptures(textModelTreeSitter, parentCapture, range) {
        const injection = textModelTreeSitter.getInjection(parentCapture.node.startIndex, this._languageId);
        if (!injection?.tree || injection.versionId !== textModelTreeSitter.parseResult?.versionId) {
            return undefined;
        }
        const feature = TreeSitterTokenizationRegistry.get(injection.languageId);
        if (!feature) {
            return undefined;
        }
        return feature.captureAtRangeTree(range, injection.tree, textModelTreeSitter);
    }
    _tokenizeCapturesWithMetadata(tree, captures, rangeStartOffset, rangeEndOffset) {
        const stopwatch = StopWatch.create();
        const emptyTokens = this._createTokensFromCaptures(tree, captures, rangeStartOffset, rangeEndOffset);
        if (!emptyTokens) {
            return undefined;
        }
        const endOffsetsAndScopes = emptyTokens.endOffsets;
        for (let i = 0; i < endOffsetsAndScopes.length; i++) {
            const token = endOffsetsAndScopes[i];
            token.metadata = findMetadata(this._colorThemeData, token.scopes, token.encodedLanguageId, !!token.bracket && (token.bracket.length > 0));
        }
        const metadataTime = stopwatch.elapsed();
        return { endOffsetsAndMetadata: endOffsetsAndScopes, captureTime: emptyTokens.captureTime, metadataTime };
    }
    _emptyToken() {
        return findMetadata(this._colorThemeData, [], this._encodedLanguageId, false);
    }
    _tokenizeEncoded(lineNumber, textModel) {
        const lineOffset = textModel.getOffsetAt({ lineNumber: lineNumber, column: 1 });
        const maxLine = textModel.getLineCount();
        const lineEndOffset = (lineNumber + 1 <= maxLine) ? textModel.getOffsetAt({ lineNumber: lineNumber + 1, column: 1 }) : textModel.getValueLength();
        const lineLength = lineEndOffset - lineOffset;
        const result = this._tokenize(new Range(lineNumber, 1, lineNumber, lineLength + 1), lineOffset, lineEndOffset, textModel);
        if (!result) {
            return undefined;
        }
        return { result: result.endOffsetsAndMetadata, captureTime: result.captureTime, metadataTime: result.metadataTime, versionId: result.versionId };
    }
    _endOffsetTokensToUint32Array(endOffsetsAndMetadata) {
        const uint32Array = new Uint32Array(endOffsetsAndMetadata.length * 2);
        for (let i = 0; i < endOffsetsAndMetadata.length; i++) {
            uint32Array[i * 2] = endOffsetsAndMetadata[i].endOffset;
            uint32Array[i * 2 + 1] = endOffsetsAndMetadata[i].metadata;
        }
        return uint32Array;
    }
    dispose() {
        super.dispose();
        this._query?.delete();
        this._query = undefined;
    }
};
TreeSitterTokenizationSupport = __decorate([
    __param(4, ITreeSitterParserService),
    __param(5, IWorkbenchThemeService),
    __param(6, ITreeSitterTokenizationStoreService),
    __param(7, IInstantiationService)
], TreeSitterTokenizationSupport);
export { TreeSitterTokenizationSupport };
registerSingleton(ITreeSitterTokenizationFeature, TreeSitterTokenizationFeature, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RyZWVTaXR0ZXIvYnJvd3Nlci90cmVlU2l0dGVyVG9rZW5pemF0aW9uRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9HLE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakYsT0FBTyxFQUFvRCx1QkFBdUIsRUFBZ0IsOEJBQThCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqTCxPQUFPLEVBQUUscUNBQXFDLEVBQUUsd0JBQXdCLEVBQWUsbUJBQW1CLEVBQUUsMEJBQTBCLEVBQTBDLE1BQU0sK0RBQStELENBQUM7QUFFdFAsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUFrQixZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FB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
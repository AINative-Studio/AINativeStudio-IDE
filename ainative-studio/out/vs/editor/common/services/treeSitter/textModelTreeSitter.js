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
import { ITreeSitterImporter } from '../treeSitterParserService.js';
import { Disposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { cancelOnDispose } from '../../../../base/common/cancellation.js';
import { Range } from '../../core/range.js';
import { LimitedQueue } from '../../../../base/common/async.js';
import { TextLength } from '../../core/textLength.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { getClosestPreviousNodes, gotoNthChild, gotoParent, nextSiblingOrParentSibling } from './cursorUtils.js';
var TelemetryParseType;
(function (TelemetryParseType) {
    TelemetryParseType["Full"] = "fullParse";
    TelemetryParseType["Incremental"] = "incrementalParse";
})(TelemetryParseType || (TelemetryParseType = {}));
let TextModelTreeSitter = class TextModelTreeSitter extends Disposable {
    get parseResult() { return this._rootTreeSitterTree; }
    constructor(textModel, _treeSitterLanguages, parseImmediately = true, _treeSitterImporter, _logService, _telemetryService, _fileService) {
        super();
        this.textModel = textModel;
        this._treeSitterLanguages = _treeSitterLanguages;
        this._treeSitterImporter = _treeSitterImporter;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._fileService = _fileService;
        this._onDidChangeParseResult = this._register(new Emitter());
        this.onDidChangeParseResult = this._onDidChangeParseResult.event;
        // TODO: @alexr00 use a better data structure for this
        this._injectionTreeSitterTrees = new Map();
        this._versionId = 0;
        this._parseSessionDisposables = this._register(new DisposableStore());
        if (parseImmediately) {
            this._register(Event.runAndSubscribe(this.textModel.onDidChangeLanguage, (e => this._onDidChangeLanguage(e ? e.newLanguage : this.textModel.getLanguageId()))));
        }
        else {
            this._register(this.textModel.onDidChangeLanguage(e => this._onDidChangeLanguage(e ? e.newLanguage : this.textModel.getLanguageId())));
        }
    }
    async _onDidChangeLanguage(languageId) {
        this.parse(languageId);
    }
    /**
     * Be very careful when making changes to this method as it is easy to introduce race conditions.
     */
    async parse(languageId = this.textModel.getLanguageId()) {
        this._parseSessionDisposables.clear();
        this._rootTreeSitterTree = undefined;
        const token = cancelOnDispose(this._parseSessionDisposables);
        let language;
        try {
            language = await this._getLanguage(languageId, token);
        }
        catch (e) {
            if (isCancellationError(e)) {
                return;
            }
            throw e;
        }
        const Parser = await this._treeSitterImporter.getParserClass();
        if (token.isCancellationRequested) {
            return;
        }
        const treeSitterTree = this._parseSessionDisposables.add(new TreeSitterParseResult(new Parser(), languageId, language, this._logService, this._telemetryService));
        this._rootTreeSitterTree = treeSitterTree;
        this._parseSessionDisposables.add(treeSitterTree.onDidUpdate(e => this._handleTreeUpdate(e)));
        this._parseSessionDisposables.add(this.textModel.onDidChangeContent(e => this._onDidChangeContent(treeSitterTree, [e])));
        this._onDidChangeContent(treeSitterTree, undefined);
        if (token.isCancellationRequested) {
            return;
        }
        return this._rootTreeSitterTree;
    }
    _getLanguage(languageId, token) {
        const language = this._treeSitterLanguages.getOrInitLanguage(languageId);
        if (language) {
            return Promise.resolve(language);
        }
        const disposables = [];
        return new Promise((resolve, reject) => {
            disposables.push(this._treeSitterLanguages.onDidAddLanguage(e => {
                if (e.id === languageId) {
                    dispose(disposables);
                    resolve(e.language);
                }
            }));
            token.onCancellationRequested(() => {
                dispose(disposables);
                reject(new CancellationError());
            }, undefined, disposables);
        });
    }
    async _handleTreeUpdate(e, parentTreeResult, parentLanguage) {
        if (e.ranges && (e.versionId >= this._versionId)) {
            this._versionId = e.versionId;
            const tree = parentTreeResult ?? this._rootTreeSitterTree;
            let injections;
            if (tree.tree) {
                injections = await this._collectInjections(tree.tree);
                // kick off check for injected languages
                if (injections) {
                    this._processInjections(injections, tree, parentLanguage ?? this.textModel.getLanguageId(), e.includedModelChanges);
                }
            }
            this._onDidChangeParseResult.fire({ ranges: e.ranges, versionId: e.versionId, tree: this, languageId: this.textModel.getLanguageId(), hasInjections: !!injections && injections.size > 0 });
        }
    }
    async _ensureInjectionQueries() {
        if (!this._queries) {
            const injectionsQueriesLocation = `vs/editor/common/languages/injections/${this.textModel.getLanguageId()}.scm`;
            const uri = FileAccess.asFileUri(injectionsQueriesLocation);
            if (!(await this._fileService.exists(uri))) {
                this._queries = '';
            }
            else if (this._fileService.hasProvider(uri)) {
                const query = await this._fileService.readFile(uri);
                this._queries = query.value.toString();
            }
            else {
                this._queries = '';
            }
        }
        return this._queries;
    }
    async _getQuery() {
        if (!this._query) {
            const language = await this._treeSitterLanguages.getLanguage(this.textModel.getLanguageId());
            if (!language) {
                return;
            }
            const queries = await this._ensureInjectionQueries();
            if (queries === '') {
                return;
            }
            const Query = await this._treeSitterImporter.getQueryClass();
            this._query = new Query(language, queries);
        }
        return this._query;
    }
    async _collectInjections(tree) {
        const query = await this._getQuery();
        if (!query) {
            return;
        }
        if (!tree?.rootNode) {
            // need to check the root node here as `walk` will throw if not defined.
            return;
        }
        const cursor = tree.walk();
        const injections = new Map();
        let hasNext = true;
        while (hasNext) {
            hasNext = await this._processNode(cursor, query, injections);
            // Yield periodically
            await new Promise(resolve => setTimeout0(resolve));
        }
        return this._mergeAdjacentRanges(injections);
    }
    _processNode(cursor, query, injections) {
        const node = cursor.currentNode;
        const nodeLineCount = node.endPosition.row - node.startPosition.row;
        // We check the node line count to avoid processing large nodes in one go as that can cause performance issues.
        if (nodeLineCount <= 1000) {
            this._processCaptures(query, node, injections);
            // Move to next sibling or up and over
            return cursor.gotoNextSibling() || this.gotoNextSiblingOfAncestor(cursor);
        }
        else {
            // Node is too large, go to first child or next sibling
            return cursor.gotoFirstChild() || cursor.gotoNextSibling() || this.gotoNextSiblingOfAncestor(cursor);
        }
    }
    _processCaptures(query, node, injections) {
        const captures = query.captures(node);
        for (const capture of captures) {
            const injectionLanguage = capture.setProperties?.['injection.language'];
            if (injectionLanguage) {
                const range = this._createRangeFromNode(capture.node);
                if (!injections.has(injectionLanguage)) {
                    injections.set(injectionLanguage, []);
                }
                injections.get(injectionLanguage)?.push(range);
            }
        }
    }
    _createRangeFromNode(node) {
        return {
            startIndex: node.startIndex,
            endIndex: node.endIndex,
            startPosition: { row: node.startPosition.row, column: node.startPosition.column },
            endPosition: { row: node.endPosition.row, column: node.endPosition.column }
        };
    }
    _mergeAdjacentRanges(injections) {
        for (const [languageId, ranges] of injections) {
            if (ranges.length <= 1) {
                continue;
            }
            const mergedRanges = [];
            let current = ranges[0];
            for (let i = 1; i < ranges.length; i++) {
                const next = ranges[i];
                if (next.startIndex <= current.endIndex) {
                    current = this._mergeRanges(current, next);
                }
                else {
                    mergedRanges.push(current);
                    current = next;
                }
            }
            mergedRanges.push(current);
            injections.set(languageId, mergedRanges);
        }
        return injections;
    }
    _mergeRanges(current, next) {
        return {
            startIndex: current.startIndex,
            endIndex: Math.max(current.endIndex, next.endIndex),
            startPosition: current.startPosition,
            endPosition: next.endPosition.row > current.endPosition.row ?
                next.endPosition :
                current.endPosition
        };
    }
    async _processInjections(injections, parentTree, parentLanguage, modelChanges) {
        for (const [languageId, ranges] of injections) {
            const language = await this._treeSitterLanguages.getLanguage(languageId);
            if (!language) {
                continue;
            }
            const treeSitterTree = await this._getOrCreateInjectedTree(languageId, language, parentTree, parentLanguage);
            if (treeSitterTree) {
                this._onDidChangeContent(treeSitterTree, modelChanges, ranges);
            }
        }
    }
    async _getOrCreateInjectedTree(languageId, language, parentTree, parentLanguage) {
        let treeSitterTree = this._injectionTreeSitterTrees.get(languageId);
        if (!treeSitterTree) {
            const Parser = await this._treeSitterImporter.getParserClass();
            treeSitterTree = new TreeSitterParseResult(new Parser(), languageId, language, this._logService, this._telemetryService);
            this._parseSessionDisposables.add(treeSitterTree.onDidUpdate(e => this._handleTreeUpdate(e, parentTree, parentLanguage)));
            this._injectionTreeSitterTrees.set(languageId, treeSitterTree);
        }
        return treeSitterTree;
    }
    gotoNextSiblingOfAncestor(cursor) {
        while (cursor.gotoParent()) {
            if (cursor.gotoNextSibling()) {
                return true;
            }
        }
        return false;
    }
    getInjection(offset, parentLanguage) {
        if (this._injectionTreeSitterTrees.size === 0) {
            return undefined;
        }
        let hasFoundParentLanguage = parentLanguage === this.textModel.getLanguageId();
        for (const [_, treeSitterTree] of this._injectionTreeSitterTrees) {
            if (treeSitterTree.tree) {
                if (hasFoundParentLanguage && treeSitterTree.ranges?.find(r => r.startIndex <= offset && r.endIndex >= offset)) {
                    return treeSitterTree;
                }
                if (!hasFoundParentLanguage && treeSitterTree.languageId === parentLanguage) {
                    hasFoundParentLanguage = true;
                }
            }
        }
        return undefined;
    }
    _onDidChangeContent(treeSitterTree, change, ranges) {
        treeSitterTree.onDidChangeContent(this.textModel, change, ranges);
    }
};
TextModelTreeSitter = __decorate([
    __param(3, ITreeSitterImporter),
    __param(4, ILogService),
    __param(5, ITelemetryService),
    __param(6, IFileService)
], TextModelTreeSitter);
export { TextModelTreeSitter };
export class TreeSitterParseResult {
    get versionId() {
        return this._versionId;
    }
    constructor(parser, languageId, language, _logService, _telemetryService) {
        this.parser = parser;
        this.languageId = languageId;
        this.language = language;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._onDidUpdate = new Emitter();
        this.onDidUpdate = this._onDidUpdate.event;
        this._versionId = 0;
        this._editVersion = 0;
        this._isDisposed = false;
        this._onDidChangeContentQueue = new LimitedQueue();
        this._lastYieldTime = 0;
        this.parser.setLanguage(language);
    }
    dispose() {
        this._isDisposed = true;
        this._onDidUpdate.dispose();
        this._tree?.delete();
        this._lastFullyParsed?.delete();
        this._lastFullyParsedWithEdits?.delete();
        this.parser?.delete();
    }
    get tree() { return this._lastFullyParsed; }
    get isDisposed() { return this._isDisposed; }
    findChangedNodes(newTree, oldTree) {
        const newCursor = newTree.walk();
        const oldCursor = oldTree.walk();
        const nodes = [];
        let next = true;
        do {
            if (newCursor.currentNode.hasChanges) {
                // Check if only one of the children has changes.
                // If it's only one, then we go to that child.
                // If it's more then, we need to go to each child
                // If it's none, then we've found one of our ranges
                const newChildren = newCursor.currentNode.children;
                const indexChangedChildren = [];
                const changedChildren = newChildren.filter((c, index) => {
                    if (c?.hasChanges || (oldCursor.currentNode.children.length <= index)) {
                        indexChangedChildren.push(index);
                        return true;
                    }
                    return false;
                });
                // If we have changes and we *had* an error, the whole node should be refreshed.
                if ((changedChildren.length === 0) || (newCursor.currentNode.hasError !== oldCursor.currentNode.hasError)) {
                    // walk up again until we get to the first one that's named as unnamed nodes can be too granular
                    while (newCursor.currentNode.parent && next && !newCursor.currentNode.isNamed) {
                        next = gotoParent(newCursor, oldCursor);
                    }
                    // Use the end position of the previous node and the start position of the current node
                    const newNode = newCursor.currentNode;
                    const closestPreviousNode = getClosestPreviousNodes(newCursor, newTree) ?? newNode;
                    nodes.push({
                        startIndex: closestPreviousNode.startIndex,
                        endIndex: newNode.endIndex,
                        startPosition: closestPreviousNode.startPosition,
                        endPosition: newNode.endPosition
                    });
                    next = nextSiblingOrParentSibling(newCursor, oldCursor);
                }
                else if (changedChildren.length >= 1) {
                    next = gotoNthChild(newCursor, oldCursor, indexChangedChildren[0]);
                }
            }
            else {
                next = nextSiblingOrParentSibling(newCursor, oldCursor);
            }
        } while (next);
        return nodes;
    }
    findTreeChanges(newTree, changedNodes, newRanges) {
        let newRangeIndex = 0;
        const mergedChanges = [];
        // Find the parent in the new tree of the changed node
        for (let nodeIndex = 0; nodeIndex < changedNodes.length; nodeIndex++) {
            const node = changedNodes[nodeIndex];
            if (mergedChanges.length > 0) {
                if ((node.startIndex >= mergedChanges[mergedChanges.length - 1].newRangeStartOffset) && (node.endIndex <= mergedChanges[mergedChanges.length - 1].newRangeEndOffset)) {
                    // This node is within the previous range, skip it
                    continue;
                }
            }
            const cursor = newTree.walk();
            const cursorContainersNode = () => cursor.startIndex < node.startIndex && cursor.endIndex > node.endIndex;
            while (cursorContainersNode()) {
                // See if we can go to a child
                let child = cursor.gotoFirstChild();
                let foundChild = false;
                while (child) {
                    if (cursorContainersNode() && cursor.currentNode.isNamed) {
                        foundChild = true;
                        break;
                    }
                    else {
                        child = cursor.gotoNextSibling();
                    }
                }
                if (!foundChild) {
                    cursor.gotoParent();
                    break;
                }
                if (cursor.currentNode.childCount === 0) {
                    break;
                }
            }
            let nodesInRange;
            // It's possible we end up with a really large range if the parent node is big
            // Try to avoid this large range by finding several smaller nodes that together encompass the range of the changed node.
            const foundNodeSize = cursor.endIndex - cursor.startIndex;
            if (foundNodeSize > 5000) {
                // Try to find 3 consecutive nodes that together encompass the changed node.
                let child = cursor.gotoFirstChild();
                nodesInRange = [];
                while (child) {
                    if (cursor.endIndex > node.startIndex) {
                        // Found the starting point of our nodes
                        nodesInRange.push(cursor.currentNode);
                        do {
                            child = cursor.gotoNextSibling();
                        } while (child && (cursor.endIndex < node.endIndex));
                        nodesInRange.push(cursor.currentNode);
                        break;
                    }
                    child = cursor.gotoNextSibling();
                }
            }
            else {
                nodesInRange = [cursor.currentNode];
            }
            // Fill in gaps between nodes
            // Reset the cursor to the first node in the range;
            while (cursor.currentNode.id !== nodesInRange[0].id) {
                cursor.gotoPreviousSibling();
            }
            const previousNode = getClosestPreviousNodes(cursor, newTree);
            const startPosition = previousNode ? previousNode.endPosition : nodesInRange[0].startPosition;
            const startIndex = previousNode ? previousNode.endIndex : nodesInRange[0].startIndex;
            const endPosition = nodesInRange[nodesInRange.length - 1].endPosition;
            const endIndex = nodesInRange[nodesInRange.length - 1].endIndex;
            const newChange = { newRange: new Range(startPosition.row + 1, startPosition.column + 1, endPosition.row + 1, endPosition.column + 1), newRangeStartOffset: startIndex, newRangeEndOffset: endIndex };
            if ((newRangeIndex < newRanges.length) && rangesIntersect(newRanges[newRangeIndex], { startIndex, endIndex, startPosition, endPosition })) {
                // combine the new change with the range
                if (newRanges[newRangeIndex].startIndex < newChange.newRangeStartOffset) {
                    newChange.newRange = newChange.newRange.setStartPosition(newRanges[newRangeIndex].startPosition.row + 1, newRanges[newRangeIndex].startPosition.column + 1);
                    newChange.newRangeStartOffset = newRanges[newRangeIndex].startIndex;
                }
                if (newRanges[newRangeIndex].endIndex > newChange.newRangeEndOffset) {
                    newChange.newRange = newChange.newRange.setEndPosition(newRanges[newRangeIndex].endPosition.row + 1, newRanges[newRangeIndex].endPosition.column + 1);
                    newChange.newRangeEndOffset = newRanges[newRangeIndex].endIndex;
                }
                newRangeIndex++;
            }
            else if (newRangeIndex < newRanges.length && newRanges[newRangeIndex].endIndex < newChange.newRangeStartOffset) {
                // add the full range to the merged changes
                mergedChanges.push({
                    newRange: new Range(newRanges[newRangeIndex].startPosition.row + 1, newRanges[newRangeIndex].startPosition.column + 1, newRanges[newRangeIndex].endPosition.row + 1, newRanges[newRangeIndex].endPosition.column + 1),
                    newRangeStartOffset: newRanges[newRangeIndex].startIndex,
                    newRangeEndOffset: newRanges[newRangeIndex].endIndex
                });
            }
            if ((mergedChanges.length > 0) && (mergedChanges[mergedChanges.length - 1].newRangeEndOffset >= newChange.newRangeStartOffset)) {
                // Merge the changes
                mergedChanges[mergedChanges.length - 1].newRange = Range.fromPositions(mergedChanges[mergedChanges.length - 1].newRange.getStartPosition(), newChange.newRange.getEndPosition());
                mergedChanges[mergedChanges.length - 1].newRangeEndOffset = newChange.newRangeEndOffset;
            }
            else {
                mergedChanges.push(newChange);
            }
        }
        return this._constrainRanges(mergedChanges);
    }
    _constrainRanges(changes) {
        if (!this.ranges) {
            return changes;
        }
        const constrainedChanges = [];
        let changesIndex = 0;
        let rangesIndex = 0;
        while (changesIndex < changes.length && rangesIndex < this.ranges.length) {
            const change = changes[changesIndex];
            const range = this.ranges[rangesIndex];
            if (change.newRangeEndOffset < range.startIndex) {
                // Change is before the range, move to the next change
                changesIndex++;
            }
            else if (change.newRangeStartOffset > range.endIndex) {
                // Change is after the range, move to the next range
                rangesIndex++;
            }
            else {
                // Change is within the range, constrain it
                const newRangeStartOffset = Math.max(change.newRangeStartOffset, range.startIndex);
                const newRangeEndOffset = Math.min(change.newRangeEndOffset, range.endIndex);
                const newRange = change.newRange.intersectRanges(new Range(range.startPosition.row + 1, range.startPosition.column + 1, range.endPosition.row + 1, range.endPosition.column + 1));
                constrainedChanges.push({
                    newRange,
                    newRangeEndOffset,
                    newRangeStartOffset
                });
                // Remove the intersected range from the current change
                if (newRangeEndOffset < change.newRangeEndOffset) {
                    change.newRange = Range.fromPositions(newRange.getEndPosition(), change.newRange.getEndPosition());
                    change.newRangeStartOffset = newRangeEndOffset + 1;
                }
                else {
                    // Move to the next change
                    changesIndex++;
                }
            }
        }
        return constrainedChanges;
    }
    onDidChangeContent(model, changes, ranges) {
        const version = model.getVersionId();
        if (version === this._editVersion) {
            return;
        }
        let newRanges = [];
        if (ranges) {
            newRanges = this._setRanges(ranges);
        }
        if (changes && changes.length > 0) {
            if (this._unfiredChanges) {
                this._unfiredChanges.push(...changes);
            }
            else {
                this._unfiredChanges = changes;
            }
            for (const change of changes) {
                this._applyEdits(change.changes, version);
            }
        }
        else {
            this._applyEdits([], version);
        }
        this._onDidChangeContentQueue.queue(async () => {
            if (this.isDisposed) {
                // No need to continue the queue if we are disposed
                return;
            }
            const oldTree = this._lastFullyParsed;
            let changedNodes;
            if (this._lastFullyParsedWithEdits && this._lastFullyParsed) {
                changedNodes = this.findChangedNodes(this._lastFullyParsedWithEdits, this._lastFullyParsed);
            }
            const completed = await this._parseAndUpdateTree(model, version);
            if (completed) {
                let ranges;
                if (!changedNodes) {
                    if (this._ranges) {
                        ranges = this._ranges.map(r => ({ newRange: new Range(r.startPosition.row + 1, r.startPosition.column + 1, r.endPosition.row + 1, r.endPosition.column + 1), oldRangeLength: r.endIndex - r.startIndex, newRangeStartOffset: r.startIndex, newRangeEndOffset: r.endIndex }));
                    }
                    else {
                        ranges = [{ newRange: model.getFullModelRange(), newRangeStartOffset: 0, newRangeEndOffset: model.getValueLength() }];
                    }
                }
                else if (oldTree && changedNodes) {
                    ranges = this.findTreeChanges(completed, changedNodes, newRanges);
                }
                const changes = this._unfiredChanges ?? [];
                this._unfiredChanges = undefined;
                this._onDidUpdate.fire({ language: this.languageId, ranges, versionId: version, tree: completed, includedModelChanges: changes });
            }
        });
    }
    _applyEdits(changes, version) {
        for (const change of changes) {
            const originalTextLength = TextLength.ofRange(Range.lift(change.range));
            const newTextLength = TextLength.ofText(change.text);
            const summedTextLengths = change.text.length === 0 ? newTextLength : originalTextLength.add(newTextLength);
            const edit = {
                startIndex: change.rangeOffset,
                oldEndIndex: change.rangeOffset + change.rangeLength,
                newEndIndex: change.rangeOffset + change.text.length,
                startPosition: { row: change.range.startLineNumber - 1, column: change.range.startColumn - 1 },
                oldEndPosition: { row: change.range.endLineNumber - 1, column: change.range.endColumn - 1 },
                newEndPosition: { row: change.range.startLineNumber + summedTextLengths.lineCount - 1, column: summedTextLengths.lineCount ? summedTextLengths.columnCount : (change.range.endColumn + summedTextLengths.columnCount) }
            };
            this._tree?.edit(edit);
            this._lastFullyParsedWithEdits?.edit(edit);
        }
        this._editVersion = version;
    }
    async _parseAndUpdateTree(model, version) {
        const tree = await this._parse(model);
        if (tree) {
            this._tree?.delete();
            this._tree = tree;
            this._lastFullyParsed?.delete();
            this._lastFullyParsed = tree.copy();
            this._lastFullyParsedWithEdits?.delete();
            this._lastFullyParsedWithEdits = tree.copy();
            this._versionId = version;
            return tree;
        }
        else if (!this._tree) {
            // No tree means this is the initial parse and there were edits
            // parse function doesn't handle this well and we can end up with an incorrect tree, so we reset
            this.parser.reset();
        }
        return undefined;
    }
    _parse(model) {
        let parseType = "fullParse" /* TelemetryParseType.Full */;
        if (this.tree) {
            parseType = "incrementalParse" /* TelemetryParseType.Incremental */;
        }
        return this._parseAndYield(model, parseType);
    }
    async _parseAndYield(model, parseType) {
        let time = 0;
        let passes = 0;
        const inProgressVersion = this._editVersion;
        let newTree;
        this._lastYieldTime = performance.now();
        do {
            const timer = performance.now();
            try {
                newTree = this.parser.parse((index, position) => this._parseCallback(model, index), this._tree, { progressCallback: this._parseProgressCallback.bind(this), includedRanges: this._ranges });
            }
            catch (e) {
                // parsing can fail when the timeout is reached, will resume upon next loop
            }
            finally {
                time += performance.now() - timer;
                passes++;
            }
            // So long as this isn't the initial parse, even if the model changes and edits are applied, the tree parsing will continue correctly after the await.
            await new Promise(resolve => setTimeout0(resolve));
        } while (!model.isDisposed() && !this.isDisposed && !newTree && inProgressVersion === model.getVersionId());
        this.sendParseTimeTelemetry(parseType, time, passes);
        return (newTree && (inProgressVersion === model.getVersionId())) ? newTree : undefined;
    }
    _parseProgressCallback(state) {
        const now = performance.now();
        if (now - this._lastYieldTime > 50) {
            this._lastYieldTime = now;
            return true;
        }
        return false;
    }
    _parseCallback(textModel, index) {
        try {
            return textModel.getTextBuffer().getNearestChunk(index);
        }
        catch (e) {
            this._logService.debug('Error getting chunk for tree-sitter parsing', e);
        }
        return undefined;
    }
    _setRanges(newRanges) {
        const unKnownRanges = [];
        // If we have existing ranges, find the parts of the new ranges that are not included in the existing ones
        if (this._ranges) {
            for (const newRange of newRanges) {
                let isFullyIncluded = false;
                for (let i = 0; i < this._ranges.length; i++) {
                    const existingRange = this._ranges[i];
                    if (rangesEqual(existingRange, newRange) || rangesIntersect(existingRange, newRange)) {
                        isFullyIncluded = true;
                        break;
                    }
                }
                if (!isFullyIncluded) {
                    unKnownRanges.push(newRange);
                }
            }
        }
        else {
            // No existing ranges, all new ranges are unknown
            unKnownRanges.push(...newRanges);
        }
        this._ranges = newRanges;
        return unKnownRanges;
    }
    get ranges() {
        return this._ranges;
    }
    sendParseTimeTelemetry(parseType, time, passes) {
        this._logService.debug(`Tree parsing (${parseType}) took ${time} ms and ${passes} passes.`);
        if (parseType === "fullParse" /* TelemetryParseType.Full */) {
            this._telemetryService.publicLog2(`treeSitter.fullParse`, { languageId: this.languageId, time, passes });
        }
        else {
            this._telemetryService.publicLog2(`treeSitter.incrementalParse`, { languageId: this.languageId, time, passes });
        }
    }
}
function rangesEqual(a, b) {
    return (a.startPosition.row === b.startPosition.row)
        && (a.startPosition.column === b.startPosition.column)
        && (a.endPosition.row === b.endPosition.row)
        && (a.endPosition.column === b.endPosition.column)
        && (a.startIndex === b.startIndex)
        && (a.endIndex === b.endIndex);
}
function rangesIntersect(a, b) {
    return (a.startIndex <= b.startIndex && a.endIndex >= b.startIndex) ||
        (b.startIndex <= a.startIndex && b.endIndex >= a.startIndex);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsVHJlZVNpdHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3RyZWVTaXR0ZXIvdGV4dE1vZGVsVHJlZVNpdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQW1GLG1CQUFtQixFQUF3QixNQUFNLCtCQUErQixDQUFDO0FBQzNLLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBR3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM1QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXRELE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFRakgsSUFBVyxrQkFHVjtBQUhELFdBQVcsa0JBQWtCO0lBQzVCLHdDQUFrQixDQUFBO0lBQ2xCLHNEQUFnQyxDQUFBO0FBQ2pDLENBQUMsRUFIVSxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBRzVCO0FBRU0sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBVWxELElBQUksV0FBVyxLQUF5QyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFFMUYsWUFDVSxTQUFxQixFQUNiLG9CQUF5QyxFQUMxRCxtQkFBNEIsSUFBSSxFQUNYLG1CQUF5RCxFQUNqRSxXQUF5QyxFQUNuQyxpQkFBcUQsRUFDMUQsWUFBMkM7UUFFekQsS0FBSyxFQUFFLENBQUM7UUFSQyxjQUFTLEdBQVQsU0FBUyxDQUFZO1FBQ2IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFxQjtRQUVwQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ2hELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ2xCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDekMsaUJBQVksR0FBWixZQUFZLENBQWM7UUFsQmxELDRCQUF1QixHQUFrQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF3QixDQUFDLENBQUM7UUFDckcsMkJBQXNCLEdBQWdDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUM7UUFJekcsc0RBQXNEO1FBQzlDLDhCQUF5QixHQUF1QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzFFLGVBQVUsR0FBVyxDQUFDLENBQUM7UUFxQmQsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFQakYsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakssQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hJLENBQUM7SUFDRixDQUFDO0lBR08sS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQWtCO1FBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFxQixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtRQUNyRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztRQUVyQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDN0QsSUFBSSxRQUFxQyxDQUFDO1FBQzFDLElBQUksQ0FBQztZQUNKLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM1QixPQUFPO1lBQ1IsQ0FBQztZQUNELE1BQU0sQ0FBQyxDQUFDO1FBQ1QsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQy9ELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUMsSUFBSSxNQUFNLEVBQUUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUNsSyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsY0FBYyxDQUFDO1FBQzFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pILElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEQsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPO1FBQ1IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDO0lBQ2pDLENBQUM7SUFFTyxZQUFZLENBQUMsVUFBa0IsRUFBRSxLQUF3QjtRQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQWtCLEVBQUUsQ0FBQztRQUV0QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3RDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUMvRCxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ3pCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDckIsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO2dCQUNsQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztZQUNqQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUF1QixFQUFFLGdCQUF5QyxFQUFFLGNBQXVCO1FBQzFILElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQzlCLE1BQU0sSUFBSSxHQUFHLGdCQUFnQixJQUFJLElBQUksQ0FBQyxtQkFBb0IsQ0FBQztZQUMzRCxJQUFJLFVBQW1ELENBQUM7WUFDeEQsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2YsVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEQsd0NBQXdDO2dCQUN4QyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxjQUFjLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFDckgsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0wsQ0FBQztJQUNGLENBQUM7SUFHTyxLQUFLLENBQUMsdUJBQXVCO1FBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsTUFBTSx5QkFBeUIsR0FBb0IseUNBQXlDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQztZQUNqSSxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMvQyxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUztRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFDN0YsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU87WUFDUixDQUFDO1lBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNyRCxJQUFJLE9BQU8sS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDcEIsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM3RCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBaUI7UUFDakQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLHdFQUF3RTtZQUN4RSxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMzQixNQUFNLFVBQVUsR0FBZ0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUMxRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFFbkIsT0FBTyxPQUFPLEVBQUUsQ0FBQztZQUNoQixPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDN0QscUJBQXFCO1lBQ3JCLE1BQU0sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVPLFlBQVksQ0FBQyxNQUF5QixFQUFFLEtBQW1CLEVBQUUsVUFBdUM7UUFDM0csTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUNoQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQztRQUVwRSwrR0FBK0c7UUFDL0csSUFBSSxhQUFhLElBQUksSUFBSSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDL0Msc0NBQXNDO1lBQ3RDLE9BQU8sTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzRSxDQUFDO2FBQU0sQ0FBQztZQUNQLHVEQUF1RDtZQUN2RCxPQUFPLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RHLENBQUM7SUFDRixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsS0FBbUIsRUFBRSxJQUFpQixFQUFFLFVBQXVDO1FBQ3ZHLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNoQyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3hFLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO29CQUN4QyxVQUFVLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUN2QyxDQUFDO2dCQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsSUFBaUI7UUFDN0MsT0FBTztZQUNOLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNqRixXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFO1NBQzNFLENBQUM7SUFDSCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsVUFBdUM7UUFDbkUsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQy9DLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBbUIsRUFBRSxDQUFDO1lBQ3hDLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN4QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3pDLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzNCLE9BQU8sR0FBRyxJQUFJLENBQUM7Z0JBQ2hCLENBQUM7WUFDRixDQUFDO1lBQ0QsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUzQixVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVPLFlBQVksQ0FBQyxPQUFxQixFQUFFLElBQWtCO1FBQzdELE9BQU87WUFDTixVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVU7WUFDOUIsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ25ELGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYTtZQUNwQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUNsQixPQUFPLENBQUMsV0FBVztTQUNwQixDQUFDO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQkFBa0IsQ0FDL0IsVUFBdUMsRUFDdkMsVUFBa0MsRUFDbEMsY0FBc0IsRUFDdEIsWUFBcUQ7UUFFckQsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQy9DLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6RSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUM3RyxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNoRSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCLENBQ3JDLFVBQWtCLEVBQ2xCLFFBQXlCLEVBQ3pCLFVBQWtDLEVBQ2xDLGNBQXNCO1FBRXRCLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQy9ELGNBQWMsR0FBRyxJQUFJLHFCQUFxQixDQUFDLElBQUksTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pILElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUM7SUFDdkIsQ0FBQztJQUVPLHlCQUF5QixDQUFDLE1BQXlCO1FBQzFELE9BQU8sTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDNUIsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztnQkFDOUIsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUFjLEVBQUUsY0FBc0I7UUFDbEQsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxJQUFJLHNCQUFzQixHQUFHLGNBQWMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRS9FLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUNsRSxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxzQkFBc0IsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksTUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDaEgsT0FBTyxjQUFjLENBQUM7Z0JBQ3ZCLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLHNCQUFzQixJQUFJLGNBQWMsQ0FBQyxVQUFVLEtBQUssY0FBYyxFQUFFLENBQUM7b0JBQzdFLHNCQUFzQixHQUFHLElBQUksQ0FBQztnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLGNBQXFDLEVBQUUsTUFBK0MsRUFBRSxNQUF1QjtRQUMxSSxjQUFjLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNELENBQUE7QUFqVFksbUJBQW1CO0lBZ0I3QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFlBQVksQ0FBQTtHQW5CRixtQkFBbUIsQ0FpVC9COztBQUVELE1BQU0sT0FBTyxxQkFBcUI7SUFRakMsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxZQUE0QixNQUFxQixFQUNoQyxVQUFrQixFQUNRLFFBQXlCLEVBQ2xELFdBQXdCLEVBQ3hCLGlCQUFvQztRQUoxQixXQUFNLEdBQU4sTUFBTSxDQUFlO1FBQ2hDLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDUSxhQUFRLEdBQVIsUUFBUSxDQUFpQjtRQUNsRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUN4QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBWnJDLGlCQUFZLEdBQWtDLElBQUksT0FBTyxFQUF3QixDQUFDO1FBQ25GLGdCQUFXLEdBQWdDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBQzNFLGVBQVUsR0FBVyxDQUFDLENBQUM7UUFDdkIsaUJBQVksR0FBVyxDQUFDLENBQUM7UUFJekIsZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUF5TjdCLDZCQUF3QixHQUFpQixJQUFJLFlBQVksRUFBRSxDQUFDO1FBZ0k1RCxtQkFBYyxHQUFXLENBQUMsQ0FBQztRQW5WbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUNELE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDckIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFDNUMsSUFBSSxVQUFVLEtBQUssT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUVyQyxnQkFBZ0IsQ0FBQyxPQUFvQixFQUFFLE9BQW9CO1FBQ2xFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFakMsTUFBTSxLQUFLLEdBQW1CLEVBQUUsQ0FBQztRQUNqQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFFaEIsR0FBRyxDQUFDO1lBQ0gsSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN0QyxpREFBaUQ7Z0JBQ2pELDhDQUE4QztnQkFDOUMsaURBQWlEO2dCQUNqRCxtREFBbUQ7Z0JBQ25ELE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO2dCQUNuRCxNQUFNLG9CQUFvQixHQUFhLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDdkQsSUFBSSxDQUFDLEVBQUUsVUFBVSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ3ZFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDakMsT0FBTyxJQUFJLENBQUM7b0JBQ2IsQ0FBQztvQkFDRCxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDLENBQUMsQ0FBQztnQkFDSCxnRkFBZ0Y7Z0JBQ2hGLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUMzRyxnR0FBZ0c7b0JBQ2hHLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDL0UsSUFBSSxHQUFHLFVBQVUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3pDLENBQUM7b0JBQ0QsdUZBQXVGO29CQUN2RixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDO29CQUN0QyxNQUFNLG1CQUFtQixHQUFHLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsSUFBSSxPQUFPLENBQUM7b0JBQ25GLEtBQUssQ0FBQyxJQUFJLENBQUM7d0JBQ1YsVUFBVSxFQUFFLG1CQUFtQixDQUFDLFVBQVU7d0JBQzFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTt3QkFDMUIsYUFBYSxFQUFFLG1CQUFtQixDQUFDLGFBQWE7d0JBQ2hELFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztxQkFDaEMsQ0FBQyxDQUFDO29CQUNILElBQUksR0FBRywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3pELENBQUM7cUJBQU0sSUFBSSxlQUFlLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4QyxJQUFJLEdBQUcsWUFBWSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEUsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLEdBQUcsMEJBQTBCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3pELENBQUM7UUFDRixDQUFDLFFBQVEsSUFBSSxFQUFFO1FBRWYsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sZUFBZSxDQUFDLE9BQW9CLEVBQUUsWUFBNEIsRUFBRSxTQUF5QjtRQUNwRyxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdEIsTUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQztRQUV4QyxzREFBc0Q7UUFDdEQsS0FBSyxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsU0FBUyxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN0RSxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFckMsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7b0JBQ3RLLGtEQUFrRDtvQkFDbEQsU0FBUztnQkFDVixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QixNQUFNLG9CQUFvQixHQUFHLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFFMUcsT0FBTyxvQkFBb0IsRUFBRSxFQUFFLENBQUM7Z0JBQy9CLDhCQUE4QjtnQkFDOUIsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBQ2QsSUFBSSxvQkFBb0IsRUFBRSxJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQzFELFVBQVUsR0FBRyxJQUFJLENBQUM7d0JBQ2xCLE1BQU07b0JBQ1AsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLEtBQUssR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ2xDLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDcEIsTUFBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3pDLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLFlBQTJCLENBQUM7WUFDaEMsOEVBQThFO1lBQzlFLHdIQUF3SDtZQUN4SCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUM7WUFDMUQsSUFBSSxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUM7Z0JBQzFCLDRFQUE0RTtnQkFDNUUsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNwQyxZQUFZLEdBQUcsRUFBRSxDQUFDO2dCQUNsQixPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNkLElBQUksTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ3ZDLHdDQUF3Qzt3QkFDeEMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7d0JBQ3RDLEdBQUcsQ0FBQzs0QkFDSCxLQUFLLEdBQUcsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO3dCQUNsQyxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBRXJELFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO3dCQUN0QyxNQUFNO29CQUNQLENBQUM7b0JBQ0QsS0FBSyxHQUFHLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDbEMsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDckMsQ0FBQztZQUVELDZCQUE2QjtZQUM3QixtREFBbUQ7WUFDbkQsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLENBQUM7WUFDRCxNQUFNLFlBQVksR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDOUQsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBQzlGLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztZQUNyRixNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7WUFDdEUsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBRWhFLE1BQU0sU0FBUyxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3RNLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLGVBQWUsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzNJLHdDQUF3QztnQkFDeEMsSUFBSSxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUN6RSxTQUFTLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM1SixTQUFTLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFDckUsQ0FBQztnQkFDRCxJQUFJLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3JFLFNBQVMsQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUN0SixTQUFTLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDakUsQ0FBQztnQkFDRCxhQUFhLEVBQUUsQ0FBQztZQUNqQixDQUFDO2lCQUFNLElBQUksYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDbEgsMkNBQTJDO2dCQUMzQyxhQUFhLENBQUMsSUFBSSxDQUFDO29CQUNsQixRQUFRLEVBQUUsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUNyTixtQkFBbUIsRUFBRSxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsVUFBVTtvQkFDeEQsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVE7aUJBQ3BELENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixJQUFJLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hJLG9CQUFvQjtnQkFDcEIsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2dCQUNqTCxhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUM7WUFDekYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDL0IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsT0FBc0I7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixPQUFPLE9BQU8sQ0FBQztRQUNoQixDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBa0IsRUFBRSxDQUFDO1FBQzdDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztRQUNyQixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDcEIsT0FBTyxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN2QyxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pELHNEQUFzRDtnQkFDdEQsWUFBWSxFQUFFLENBQUM7WUFDaEIsQ0FBQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hELG9EQUFvRDtnQkFDcEQsV0FBVyxFQUFFLENBQUM7WUFDZixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsMkNBQTJDO2dCQUMzQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDbkYsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzdFLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFFLENBQUM7Z0JBQ25MLGtCQUFrQixDQUFDLElBQUksQ0FBQztvQkFDdkIsUUFBUTtvQkFDUixpQkFBaUI7b0JBQ2pCLG1CQUFtQjtpQkFDbkIsQ0FBQyxDQUFDO2dCQUNILHVEQUF1RDtnQkFDdkQsSUFBSSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDbEQsTUFBTSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7b0JBQ25HLE1BQU0sQ0FBQyxtQkFBbUIsR0FBRyxpQkFBaUIsR0FBRyxDQUFDLENBQUM7Z0JBQ3BELENBQUM7cUJBQU0sQ0FBQztvQkFDUCwwQkFBMEI7b0JBQzFCLFlBQVksRUFBRSxDQUFDO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGtCQUFrQixDQUFDO0lBQzNCLENBQUM7SUFJTSxrQkFBa0IsQ0FBQyxLQUFpQixFQUFFLE9BQWdELEVBQUUsTUFBdUI7UUFDckgsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3JDLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksU0FBUyxHQUFtQixFQUFFLENBQUM7UUFDbkMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQztZQUNoQyxDQUFDO1lBQ0QsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFFRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzlDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNyQixtREFBbUQ7Z0JBQ25ELE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQ3RDLElBQUksWUFBd0MsQ0FBQztZQUM3QyxJQUFJLElBQUksQ0FBQyx5QkFBeUIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDN0QsWUFBWSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDN0YsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNqRSxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksTUFBaUMsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNuQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDbEIsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDOVEsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE1BQU0sR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLG1CQUFtQixFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUN2SCxDQUFDO2dCQUNGLENBQUM7cUJBQU0sSUFBSSxPQUFPLElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ3BDLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ25FLENBQUM7Z0JBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNuSSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sV0FBVyxDQUFDLE9BQThCLEVBQUUsT0FBZTtRQUNsRSxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3hFLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUMzRyxNQUFNLElBQUksR0FBRztnQkFDWixVQUFVLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQzlCLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxXQUFXO2dCQUNwRCxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU07Z0JBQ3BELGFBQWEsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRTtnQkFDOUYsY0FBYyxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFO2dCQUMzRixjQUFjLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsaUJBQWlCLENBQUMsV0FBVyxDQUFDLEVBQUU7YUFDdk4sQ0FBQztZQUNGLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDO0lBQzdCLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CLENBQUMsS0FBaUIsRUFBRSxPQUFlO1FBQ25FLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0QyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztZQUNsQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7YUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3hCLCtEQUErRDtZQUMvRCxnR0FBZ0c7WUFDaEcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLE1BQU0sQ0FBQyxLQUFpQjtRQUMvQixJQUFJLFNBQVMsNENBQThDLENBQUM7UUFDNUQsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixTQUFTLDBEQUFpQyxDQUFDO1FBQzVDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQWlCLEVBQUUsU0FBNkI7UUFDNUUsSUFBSSxJQUFJLEdBQVcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksTUFBTSxHQUFXLENBQUMsQ0FBQztRQUN2QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDNUMsSUFBSSxPQUF1QyxDQUFDO1FBQzVDLElBQUksQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRXhDLEdBQUcsQ0FBQztZQUNILE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUM7Z0JBQ0osT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBYSxFQUFFLFFBQXVCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNwTixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWiwyRUFBMkU7WUFDNUUsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO2dCQUNsQyxNQUFNLEVBQUUsQ0FBQztZQUNWLENBQUM7WUFFRCxzSkFBc0o7WUFDdEosTUFBTSxJQUFJLE9BQU8sQ0FBTyxPQUFPLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRTFELENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxPQUFPLElBQUksaUJBQWlCLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFO1FBQzVHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUN4RixDQUFDO0lBR08sc0JBQXNCLENBQUMsS0FBd0I7UUFDdEQsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzlCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUM7WUFDMUIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sY0FBYyxDQUFDLFNBQXFCLEVBQUUsS0FBYTtRQUMxRCxJQUFJLENBQUM7WUFDSixPQUFPLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUdPLFVBQVUsQ0FBQyxTQUF5QjtRQUMzQyxNQUFNLGFBQWEsR0FBbUIsRUFBRSxDQUFDO1FBQ3pDLDBHQUEwRztRQUMxRyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUM7Z0JBRTVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM5QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUV0QyxJQUFJLFdBQVcsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLElBQUksZUFBZSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO3dCQUN0RixlQUFlLEdBQUcsSUFBSSxDQUFDO3dCQUN2QixNQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3RCLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxpREFBaUQ7WUFDakQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN6QixPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxTQUE2QixFQUFFLElBQVksRUFBRSxNQUFjO1FBQ3pGLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGlCQUFpQixTQUFTLFVBQVUsSUFBSSxXQUFXLE1BQU0sVUFBVSxDQUFDLENBQUM7UUFRNUYsSUFBSSxTQUFTLDhDQUE0QixFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBZ0Ysc0JBQXNCLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN6TCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQWdGLDZCQUE2QixFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDaE0sQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELFNBQVMsV0FBVyxDQUFDLENBQWUsRUFBRSxDQUFlO0lBQ3BELE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQztXQUNoRCxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1dBQ25ELENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7V0FDekMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztXQUMvQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQztXQUMvQixDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxDQUFlLEVBQUUsQ0FBZTtJQUN4RCxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNsRSxDQUFDLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMvRCxDQUFDIn0=
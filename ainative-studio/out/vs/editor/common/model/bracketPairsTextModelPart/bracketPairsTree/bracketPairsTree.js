/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { BracketInfo, BracketPairWithMinIndentationInfo } from '../../../textModelBracketPairs.js';
import { TextEditInfo } from './beforeEditPositionMapper.js';
import { LanguageAgnosticBracketTokens } from './brackets.js';
import { lengthAdd, lengthGreaterThanEqual, lengthLessThan, lengthLessThanEqual, lengthsToRange, lengthZero, positionToLength, toLength } from './length.js';
import { parseDocument } from './parser.js';
import { DenseKeyProvider } from './smallImmutableSet.js';
import { FastTokenizer, TextBufferTokenizer } from './tokenizer.js';
import { CallbackIterable } from '../../../../../base/common/arrays.js';
import { combineTextEditInfos } from './combineTextEditInfos.js';
export class BracketPairsTree extends Disposable {
    didLanguageChange(languageId) {
        return this.brackets.didLanguageChange(languageId);
    }
    constructor(textModel, getLanguageConfiguration) {
        super();
        this.textModel = textModel;
        this.getLanguageConfiguration = getLanguageConfiguration;
        this.didChangeEmitter = new Emitter();
        this.denseKeyProvider = new DenseKeyProvider();
        this.brackets = new LanguageAgnosticBracketTokens(this.denseKeyProvider, this.getLanguageConfiguration);
        this.onDidChange = this.didChangeEmitter.event;
        this.queuedTextEditsForInitialAstWithoutTokens = [];
        this.queuedTextEdits = [];
        if (!textModel.tokenization.hasTokens) {
            const brackets = this.brackets.getSingleLanguageBracketTokens(this.textModel.getLanguageId());
            const tokenizer = new FastTokenizer(this.textModel.getValue(), brackets);
            this.initialAstWithoutTokens = parseDocument(tokenizer, [], undefined, true);
            this.astWithTokens = this.initialAstWithoutTokens;
        }
        else if (textModel.tokenization.backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) {
            // Skip the initial ast, as there is no flickering.
            // Directly create the tree with token information.
            this.initialAstWithoutTokens = undefined;
            this.astWithTokens = this.parseDocumentFromTextBuffer([], undefined, false);
        }
        else {
            // We missed some token changes already, so we cannot use the fast tokenizer + delta increments
            this.initialAstWithoutTokens = this.parseDocumentFromTextBuffer([], undefined, true);
            this.astWithTokens = this.initialAstWithoutTokens;
        }
    }
    //#region TextModel events
    handleDidChangeBackgroundTokenizationState() {
        if (this.textModel.tokenization.backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) {
            const wasUndefined = this.initialAstWithoutTokens === undefined;
            // Clear the initial tree as we can use the tree with token information now.
            this.initialAstWithoutTokens = undefined;
            if (!wasUndefined) {
                this.didChangeEmitter.fire();
            }
        }
    }
    handleDidChangeTokens({ ranges }) {
        const edits = ranges.map(r => new TextEditInfo(toLength(r.fromLineNumber - 1, 0), toLength(r.toLineNumber, 0), toLength(r.toLineNumber - r.fromLineNumber + 1, 0)));
        this.handleEdits(edits, true);
        if (!this.initialAstWithoutTokens) {
            this.didChangeEmitter.fire();
        }
    }
    handleContentChanged(change) {
        const edits = TextEditInfo.fromModelContentChanges(change.changes);
        this.handleEdits(edits, false);
    }
    handleEdits(edits, tokenChange) {
        // Lazily queue the edits and only apply them when the tree is accessed.
        const result = combineTextEditInfos(this.queuedTextEdits, edits);
        this.queuedTextEdits = result;
        if (this.initialAstWithoutTokens && !tokenChange) {
            this.queuedTextEditsForInitialAstWithoutTokens = combineTextEditInfos(this.queuedTextEditsForInitialAstWithoutTokens, edits);
        }
    }
    //#endregion
    flushQueue() {
        if (this.queuedTextEdits.length > 0) {
            this.astWithTokens = this.parseDocumentFromTextBuffer(this.queuedTextEdits, this.astWithTokens, false);
            this.queuedTextEdits = [];
        }
        if (this.queuedTextEditsForInitialAstWithoutTokens.length > 0) {
            if (this.initialAstWithoutTokens) {
                this.initialAstWithoutTokens = this.parseDocumentFromTextBuffer(this.queuedTextEditsForInitialAstWithoutTokens, this.initialAstWithoutTokens, false);
            }
            this.queuedTextEditsForInitialAstWithoutTokens = [];
        }
    }
    /**
     * @pure (only if isPure = true)
    */
    parseDocumentFromTextBuffer(edits, previousAst, immutable) {
        // Is much faster if `isPure = false`.
        const isPure = false;
        const previousAstClone = isPure ? previousAst?.deepClone() : previousAst;
        const tokenizer = new TextBufferTokenizer(this.textModel, this.brackets);
        const result = parseDocument(tokenizer, edits, previousAstClone, immutable);
        return result;
    }
    getBracketsInRange(range, onlyColorizedBrackets) {
        this.flushQueue();
        const startOffset = toLength(range.startLineNumber - 1, range.startColumn - 1);
        const endOffset = toLength(range.endLineNumber - 1, range.endColumn - 1);
        return new CallbackIterable(cb => {
            const node = this.initialAstWithoutTokens || this.astWithTokens;
            collectBrackets(node, lengthZero, node.length, startOffset, endOffset, cb, 0, 0, new Map(), onlyColorizedBrackets);
        });
    }
    getBracketPairsInRange(range, includeMinIndentation) {
        this.flushQueue();
        const startLength = positionToLength(range.getStartPosition());
        const endLength = positionToLength(range.getEndPosition());
        return new CallbackIterable(cb => {
            const node = this.initialAstWithoutTokens || this.astWithTokens;
            const context = new CollectBracketPairsContext(cb, includeMinIndentation, this.textModel);
            collectBracketPairs(node, lengthZero, node.length, startLength, endLength, context, 0, new Map());
        });
    }
    getFirstBracketAfter(position) {
        this.flushQueue();
        const node = this.initialAstWithoutTokens || this.astWithTokens;
        return getFirstBracketAfter(node, lengthZero, node.length, positionToLength(position));
    }
    getFirstBracketBefore(position) {
        this.flushQueue();
        const node = this.initialAstWithoutTokens || this.astWithTokens;
        return getFirstBracketBefore(node, lengthZero, node.length, positionToLength(position));
    }
}
function getFirstBracketBefore(node, nodeOffsetStart, nodeOffsetEnd, position) {
    if (node.kind === 4 /* AstNodeKind.List */ || node.kind === 2 /* AstNodeKind.Pair */) {
        const lengths = [];
        for (const child of node.children) {
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            lengths.push({ nodeOffsetStart, nodeOffsetEnd });
            nodeOffsetStart = nodeOffsetEnd;
        }
        for (let i = lengths.length - 1; i >= 0; i--) {
            const { nodeOffsetStart, nodeOffsetEnd } = lengths[i];
            if (lengthLessThan(nodeOffsetStart, position)) {
                const result = getFirstBracketBefore(node.children[i], nodeOffsetStart, nodeOffsetEnd, position);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }
    else if (node.kind === 3 /* AstNodeKind.UnexpectedClosingBracket */) {
        return null;
    }
    else if (node.kind === 1 /* AstNodeKind.Bracket */) {
        const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
        return {
            bracketInfo: node.bracketInfo,
            range
        };
    }
    return null;
}
function getFirstBracketAfter(node, nodeOffsetStart, nodeOffsetEnd, position) {
    if (node.kind === 4 /* AstNodeKind.List */ || node.kind === 2 /* AstNodeKind.Pair */) {
        for (const child of node.children) {
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThan(position, nodeOffsetEnd)) {
                const result = getFirstBracketAfter(child, nodeOffsetStart, nodeOffsetEnd, position);
                if (result) {
                    return result;
                }
            }
            nodeOffsetStart = nodeOffsetEnd;
        }
        return null;
    }
    else if (node.kind === 3 /* AstNodeKind.UnexpectedClosingBracket */) {
        return null;
    }
    else if (node.kind === 1 /* AstNodeKind.Bracket */) {
        const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
        return {
            bracketInfo: node.bracketInfo,
            range
        };
    }
    return null;
}
function collectBrackets(node, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, push, level, nestingLevelOfEqualBracketType, levelPerBracketType, onlyColorizedBrackets, parentPairIsIncomplete = false) {
    if (level > 200) {
        return true;
    }
    whileLoop: while (true) {
        switch (node.kind) {
            case 4 /* AstNodeKind.List */: {
                const childCount = node.childrenLength;
                for (let i = 0; i < childCount; i++) {
                    const child = node.getChild(i);
                    if (!child) {
                        continue;
                    }
                    nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
                    if (lengthLessThanEqual(nodeOffsetStart, endOffset) &&
                        lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                        const childEndsAfterEnd = lengthGreaterThanEqual(nodeOffsetEnd, endOffset);
                        if (childEndsAfterEnd) {
                            // No child after this child in the requested window, don't recurse
                            node = child;
                            continue whileLoop;
                        }
                        const shouldContinue = collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, push, level, 0, levelPerBracketType, onlyColorizedBrackets);
                        if (!shouldContinue) {
                            return false;
                        }
                    }
                    nodeOffsetStart = nodeOffsetEnd;
                }
                return true;
            }
            case 2 /* AstNodeKind.Pair */: {
                const colorize = !onlyColorizedBrackets || !node.closingBracket || node.closingBracket.bracketInfo.closesColorized(node.openingBracket.bracketInfo);
                let levelPerBracket = 0;
                if (levelPerBracketType) {
                    let existing = levelPerBracketType.get(node.openingBracket.text);
                    if (existing === undefined) {
                        existing = 0;
                    }
                    levelPerBracket = existing;
                    if (colorize) {
                        existing++;
                        levelPerBracketType.set(node.openingBracket.text, existing);
                    }
                }
                const childCount = node.childrenLength;
                for (let i = 0; i < childCount; i++) {
                    const child = node.getChild(i);
                    if (!child) {
                        continue;
                    }
                    nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
                    if (lengthLessThanEqual(nodeOffsetStart, endOffset) &&
                        lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                        const childEndsAfterEnd = lengthGreaterThanEqual(nodeOffsetEnd, endOffset);
                        if (childEndsAfterEnd && child.kind !== 1 /* AstNodeKind.Bracket */) {
                            // No child after this child in the requested window, don't recurse
                            // Don't do this for brackets because of unclosed/unopened brackets
                            node = child;
                            if (colorize) {
                                level++;
                                nestingLevelOfEqualBracketType = levelPerBracket + 1;
                            }
                            else {
                                nestingLevelOfEqualBracketType = levelPerBracket;
                            }
                            continue whileLoop;
                        }
                        if (colorize || child.kind !== 1 /* AstNodeKind.Bracket */ || !node.closingBracket) {
                            const shouldContinue = collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, push, colorize ? level + 1 : level, colorize ? levelPerBracket + 1 : levelPerBracket, levelPerBracketType, onlyColorizedBrackets, !node.closingBracket);
                            if (!shouldContinue) {
                                return false;
                            }
                        }
                    }
                    nodeOffsetStart = nodeOffsetEnd;
                }
                levelPerBracketType?.set(node.openingBracket.text, levelPerBracket);
                return true;
            }
            case 3 /* AstNodeKind.UnexpectedClosingBracket */: {
                const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
                return push(new BracketInfo(range, level - 1, 0, true));
            }
            case 1 /* AstNodeKind.Bracket */: {
                const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
                return push(new BracketInfo(range, level - 1, nestingLevelOfEqualBracketType - 1, parentPairIsIncomplete));
            }
            case 0 /* AstNodeKind.Text */:
                return true;
        }
    }
}
class CollectBracketPairsContext {
    constructor(push, includeMinIndentation, textModel) {
        this.push = push;
        this.includeMinIndentation = includeMinIndentation;
        this.textModel = textModel;
    }
}
function collectBracketPairs(node, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, context, level, levelPerBracketType) {
    if (level > 200) {
        return true;
    }
    let shouldContinue = true;
    if (node.kind === 2 /* AstNodeKind.Pair */) {
        let levelPerBracket = 0;
        if (levelPerBracketType) {
            let existing = levelPerBracketType.get(node.openingBracket.text);
            if (existing === undefined) {
                existing = 0;
            }
            levelPerBracket = existing;
            existing++;
            levelPerBracketType.set(node.openingBracket.text, existing);
        }
        const openingBracketEnd = lengthAdd(nodeOffsetStart, node.openingBracket.length);
        let minIndentation = -1;
        if (context.includeMinIndentation) {
            minIndentation = node.computeMinIndentation(nodeOffsetStart, context.textModel);
        }
        shouldContinue = context.push(new BracketPairWithMinIndentationInfo(lengthsToRange(nodeOffsetStart, nodeOffsetEnd), lengthsToRange(nodeOffsetStart, openingBracketEnd), node.closingBracket
            ? lengthsToRange(lengthAdd(openingBracketEnd, node.child?.length || lengthZero), nodeOffsetEnd)
            : undefined, level, levelPerBracket, node, minIndentation));
        nodeOffsetStart = openingBracketEnd;
        if (shouldContinue && node.child) {
            const child = node.child;
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThanEqual(nodeOffsetStart, endOffset) &&
                lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                shouldContinue = collectBracketPairs(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, context, level + 1, levelPerBracketType);
                if (!shouldContinue) {
                    return false;
                }
            }
        }
        levelPerBracketType?.set(node.openingBracket.text, levelPerBracket);
    }
    else {
        let curOffset = nodeOffsetStart;
        for (const child of node.children) {
            const childOffset = curOffset;
            curOffset = lengthAdd(curOffset, child.length);
            if (lengthLessThanEqual(childOffset, endOffset) &&
                lengthLessThanEqual(startOffset, curOffset)) {
                shouldContinue = collectBracketPairs(child, childOffset, curOffset, startOffset, endOffset, context, level, levelPerBracketType);
                if (!shouldContinue) {
                    return false;
                }
            }
        }
    }
    return shouldContinue;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJzVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9icmFja2V0UGFpcnNUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQztBQUtsSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDN0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzlELE9BQU8sRUFBVSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3JLLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDNUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBR3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR2pFLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBa0J4QyxpQkFBaUIsQ0FBQyxVQUFrQjtRQUMxQyxP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
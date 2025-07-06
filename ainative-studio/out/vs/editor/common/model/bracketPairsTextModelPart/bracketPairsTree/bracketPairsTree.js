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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJzVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL2JyYWNrZXRQYWlyc1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGlDQUFpQyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBS2xILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUQsT0FBTyxFQUFVLFNBQVMsRUFBRSxzQkFBc0IsRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDckssT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM1QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFHcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHakUsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUFrQnhDLGlCQUFpQixDQUFDLFVBQWtCO1FBQzFDLE9B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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NotSupportedError } from '../../../../../base/common/errors.js';
import { TokenMetadata } from '../../../encodedTokenAttributes.js';
import { TextAstNode } from './ast.js';
import { lengthAdd, lengthDiff, lengthGetColumnCountIfZeroLineCount, lengthToObj, lengthZero, toLength } from './length.js';
import { SmallImmutableSet } from './smallImmutableSet.js';
export var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["Text"] = 0] = "Text";
    TokenKind[TokenKind["OpeningBracket"] = 1] = "OpeningBracket";
    TokenKind[TokenKind["ClosingBracket"] = 2] = "ClosingBracket";
})(TokenKind || (TokenKind = {}));
export class Token {
    constructor(length, kind, 
    /**
     * If this token is an opening bracket, this is the id of the opening bracket.
     * If this token is a closing bracket, this is the id of the first opening bracket that is closed by this bracket.
     * Otherwise, it is -1.
     */
    bracketId, 
    /**
     * If this token is an opening bracket, this just contains `bracketId`.
     * If this token is a closing bracket, this lists all opening bracket ids, that it closes.
     * Otherwise, it is empty.
     */
    bracketIds, astNode) {
        this.length = length;
        this.kind = kind;
        this.bracketId = bracketId;
        this.bracketIds = bracketIds;
        this.astNode = astNode;
    }
}
export class TextBufferTokenizer {
    constructor(textModel, bracketTokens) {
        this.textModel = textModel;
        this.bracketTokens = bracketTokens;
        this.reader = new NonPeekableTextBufferTokenizer(this.textModel, this.bracketTokens);
        this._offset = lengthZero;
        this.didPeek = false;
        this.peeked = null;
        this.textBufferLineCount = textModel.getLineCount();
        this.textBufferLastLineLength = textModel.getLineLength(this.textBufferLineCount);
    }
    get offset() {
        return this._offset;
    }
    get length() {
        return toLength(this.textBufferLineCount - 1, this.textBufferLastLineLength);
    }
    getText() {
        return this.textModel.getValue();
    }
    skip(length) {
        this.didPeek = false;
        this._offset = lengthAdd(this._offset, length);
        const obj = lengthToObj(this._offset);
        this.reader.setPosition(obj.lineCount, obj.columnCount);
    }
    read() {
        let token;
        if (this.peeked) {
            this.didPeek = false;
            token = this.peeked;
        }
        else {
            token = this.reader.read();
        }
        if (token) {
            this._offset = lengthAdd(this._offset, token.length);
        }
        return token;
    }
    peek() {
        if (!this.didPeek) {
            this.peeked = this.reader.read();
            this.didPeek = true;
        }
        return this.peeked;
    }
}
/**
 * Does not support peek.
*/
class NonPeekableTextBufferTokenizer {
    constructor(textModel, bracketTokens) {
        this.textModel = textModel;
        this.bracketTokens = bracketTokens;
        this.lineIdx = 0;
        this.line = null;
        this.lineCharOffset = 0;
        this.lineTokens = null;
        this.lineTokenOffset = 0;
        /** Must be a zero line token. The end of the document cannot be peeked. */
        this.peekedToken = null;
        this.textBufferLineCount = textModel.getLineCount();
        this.textBufferLastLineLength = textModel.getLineLength(this.textBufferLineCount);
    }
    setPosition(lineIdx, column) {
        // We must not jump into a token!
        if (lineIdx === this.lineIdx) {
            this.lineCharOffset = column;
            if (this.line !== null) {
                this.lineTokenOffset = this.lineCharOffset === 0 ? 0 : this.lineTokens.findTokenIndexAtOffset(this.lineCharOffset);
            }
        }
        else {
            this.lineIdx = lineIdx;
            this.lineCharOffset = column;
            this.line = null;
        }
        this.peekedToken = null;
    }
    read() {
        if (this.peekedToken) {
            const token = this.peekedToken;
            this.peekedToken = null;
            this.lineCharOffset += lengthGetColumnCountIfZeroLineCount(token.length);
            return token;
        }
        if (this.lineIdx > this.textBufferLineCount - 1 || (this.lineIdx === this.textBufferLineCount - 1 && this.lineCharOffset >= this.textBufferLastLineLength)) {
            // We are after the end
            return null;
        }
        if (this.line === null) {
            this.lineTokens = this.textModel.tokenization.getLineTokens(this.lineIdx + 1);
            this.line = this.lineTokens.getLineContent();
            this.lineTokenOffset = this.lineCharOffset === 0 ? 0 : this.lineTokens.findTokenIndexAtOffset(this.lineCharOffset);
        }
        const startLineIdx = this.lineIdx;
        const startLineCharOffset = this.lineCharOffset;
        // limits the length of text tokens.
        // If text tokens get too long, incremental updates will be slow
        let lengthHeuristic = 0;
        while (true) {
            const lineTokens = this.lineTokens;
            const tokenCount = lineTokens.getCount();
            let peekedBracketToken = null;
            if (this.lineTokenOffset < tokenCount) {
                const tokenMetadata = lineTokens.getMetadata(this.lineTokenOffset);
                while (this.lineTokenOffset + 1 < tokenCount && tokenMetadata === lineTokens.getMetadata(this.lineTokenOffset + 1)) {
                    // Skip tokens that are identical.
                    // Sometimes, (bracket) identifiers are split up into multiple tokens.
                    this.lineTokenOffset++;
                }
                const isOther = TokenMetadata.getTokenType(tokenMetadata) === 0 /* StandardTokenType.Other */;
                const containsBracketType = TokenMetadata.containsBalancedBrackets(tokenMetadata);
                const endOffset = lineTokens.getEndOffset(this.lineTokenOffset);
                // Is there a bracket token next? Only consume text.
                if (containsBracketType && isOther && this.lineCharOffset < endOffset) {
                    const languageId = lineTokens.getLanguageId(this.lineTokenOffset);
                    const text = this.line.substring(this.lineCharOffset, endOffset);
                    const brackets = this.bracketTokens.getSingleLanguageBracketTokens(languageId);
                    const regexp = brackets.regExpGlobal;
                    if (regexp) {
                        regexp.lastIndex = 0;
                        const match = regexp.exec(text);
                        if (match) {
                            peekedBracketToken = brackets.getToken(match[0]);
                            if (peekedBracketToken) {
                                // Consume leading text of the token
                                this.lineCharOffset += match.index;
                            }
                        }
                    }
                }
                lengthHeuristic += endOffset - this.lineCharOffset;
                if (peekedBracketToken) {
                    // Don't skip the entire token, as a single token could contain multiple brackets.
                    if (startLineIdx !== this.lineIdx || startLineCharOffset !== this.lineCharOffset) {
                        // There is text before the bracket
                        this.peekedToken = peekedBracketToken;
                        break;
                    }
                    else {
                        // Consume the peeked token
                        this.lineCharOffset += lengthGetColumnCountIfZeroLineCount(peekedBracketToken.length);
                        return peekedBracketToken;
                    }
                }
                else {
                    // Skip the entire token, as the token contains no brackets at all.
                    this.lineTokenOffset++;
                    this.lineCharOffset = endOffset;
                }
            }
            else {
                if (this.lineIdx === this.textBufferLineCount - 1) {
                    break;
                }
                this.lineIdx++;
                this.lineTokens = this.textModel.tokenization.getLineTokens(this.lineIdx + 1);
                this.lineTokenOffset = 0;
                this.line = this.lineTokens.getLineContent();
                this.lineCharOffset = 0;
                lengthHeuristic += 33; // max 1000/33 = 30 lines
                // This limits the amount of work to recompute min-indentation
                if (lengthHeuristic > 1000) {
                    // only break (automatically) at the end of line.
                    break;
                }
            }
            if (lengthHeuristic > 1500) {
                // Eventually break regardless of the line length so that
                // very long lines do not cause bad performance.
                // This effective limits max indentation to 500, as
                // indentation is not computed across multiple text nodes.
                break;
            }
        }
        // If a token contains some proper indentation, it also contains \n{INDENTATION+}(?!{INDENTATION}),
        // unless the line is too long.
        // Thus, the min indentation of the document is the minimum min indentation of every text node.
        const length = lengthDiff(startLineIdx, startLineCharOffset, this.lineIdx, this.lineCharOffset);
        return new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length));
    }
}
export class FastTokenizer {
    constructor(text, brackets) {
        this.text = text;
        this._offset = lengthZero;
        this.idx = 0;
        const regExpStr = brackets.getRegExpStr();
        const regexp = regExpStr ? new RegExp(regExpStr + '|\n', 'gi') : null;
        const tokens = [];
        let match;
        let curLineCount = 0;
        let lastLineBreakOffset = 0;
        let lastTokenEndOffset = 0;
        let lastTokenEndLine = 0;
        const smallTextTokens0Line = [];
        for (let i = 0; i < 60; i++) {
            smallTextTokens0Line.push(new Token(toLength(0, i), 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(toLength(0, i))));
        }
        const smallTextTokens1Line = [];
        for (let i = 0; i < 60; i++) {
            smallTextTokens1Line.push(new Token(toLength(1, i), 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(toLength(1, i))));
        }
        if (regexp) {
            regexp.lastIndex = 0;
            // If a token contains indentation, it also contains \n{INDENTATION+}(?!{INDENTATION})
            while ((match = regexp.exec(text)) !== null) {
                const curOffset = match.index;
                const value = match[0];
                if (value === '\n') {
                    curLineCount++;
                    lastLineBreakOffset = curOffset + 1;
                }
                else {
                    if (lastTokenEndOffset !== curOffset) {
                        let token;
                        if (lastTokenEndLine === curLineCount) {
                            const colCount = curOffset - lastTokenEndOffset;
                            if (colCount < smallTextTokens0Line.length) {
                                token = smallTextTokens0Line[colCount];
                            }
                            else {
                                const length = toLength(0, colCount);
                                token = new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length));
                            }
                        }
                        else {
                            const lineCount = curLineCount - lastTokenEndLine;
                            const colCount = curOffset - lastLineBreakOffset;
                            if (lineCount === 1 && colCount < smallTextTokens1Line.length) {
                                token = smallTextTokens1Line[colCount];
                            }
                            else {
                                const length = toLength(lineCount, colCount);
                                token = new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length));
                            }
                        }
                        tokens.push(token);
                    }
                    // value is matched by regexp, so the token must exist
                    tokens.push(brackets.getToken(value));
                    lastTokenEndOffset = curOffset + value.length;
                    lastTokenEndLine = curLineCount;
                }
            }
        }
        const offset = text.length;
        if (lastTokenEndOffset !== offset) {
            const length = (lastTokenEndLine === curLineCount)
                ? toLength(0, offset - lastTokenEndOffset)
                : toLength(curLineCount - lastTokenEndLine, offset - lastLineBreakOffset);
            tokens.push(new Token(length, 0 /* TokenKind.Text */, -1, SmallImmutableSet.getEmpty(), new TextAstNode(length)));
        }
        this.length = toLength(curLineCount, offset - lastLineBreakOffset);
        this.tokens = tokens;
    }
    get offset() {
        return this._offset;
    }
    read() {
        return this.tokens[this.idx++] || null;
    }
    peek() {
        return this.tokens[this.idx] || null;
    }
    skip(length) {
        throw new NotSupportedError();
    }
    getText() {
        return this.text;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvdG9rZW5pemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBcUIsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFdEYsT0FBTyxFQUFrQixXQUFXLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFdkQsT0FBTyxFQUFVLFNBQVMsRUFBRSxVQUFVLEVBQUUsbUNBQW1DLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDcEksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFhM0QsTUFBTSxDQUFOLElBQWtCLFNBSWpCO0FBSkQsV0FBa0IsU0FBUztJQUMxQix5Q0FBUSxDQUFBO0lBQ1IsNkRBQWtCLENBQUE7SUFDbEIsNkRBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQUppQixTQUFTLEtBQVQsU0FBUyxRQUkxQjtBQUlELE1BQU0sT0FBTyxLQUFLO0lBQ2pCLFlBQ1UsTUFBYyxFQUNkLElBQWU7SUFDeEI7Ozs7T0FJRztJQUNNLFNBQTJCO0lBQ3BDOzs7O09BSUc7SUFDTSxVQUErQyxFQUMvQyxPQUFpRDtRQWRqRCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsU0FBSSxHQUFKLElBQUksQ0FBVztRQU1mLGNBQVMsR0FBVCxTQUFTLENBQWtCO1FBTTNCLGVBQVUsR0FBVixVQUFVLENBQXFDO1FBQy9DLFlBQU8sR0FBUCxPQUFPLENBQTBDO0lBQ3ZELENBQUM7Q0FDTDtBQVlELE1BQU0sT0FBTyxtQkFBbUI7SUFNL0IsWUFDa0IsU0FBMkIsRUFDM0IsYUFBNEM7UUFENUMsY0FBUyxHQUFULFNBQVMsQ0FBa0I7UUFDM0Isa0JBQWEsR0FBYixhQUFhLENBQStCO1FBSjdDLFdBQU0sR0FBRyxJQUFJLDhCQUE4QixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBVXpGLFlBQU8sR0FBVyxVQUFVLENBQUM7UUFxQjdCLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFDaEIsV0FBTSxHQUFpQixJQUFJLENBQUM7UUExQm5DLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEQsSUFBSSxDQUFDLHdCQUF3QixHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUlELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQWM7UUFDbEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvQyxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFLRCxJQUFJO1FBQ0gsSUFBSSxLQUFtQixDQUFDO1FBQ3hCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUIsQ0FBQztRQUNELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztDQUNEO0FBRUQ7O0VBRUU7QUFDRixNQUFNLDhCQUE4QjtJQUluQyxZQUE2QixTQUEyQixFQUFtQixhQUE0QztRQUExRixjQUFTLEdBQVQsU0FBUyxDQUFrQjtRQUFtQixrQkFBYSxHQUFiLGFBQWEsQ0FBK0I7UUFLL0csWUFBTyxHQUFHLENBQUMsQ0FBQztRQUNaLFNBQUksR0FBa0IsSUFBSSxDQUFDO1FBQzNCLG1CQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLGVBQVUsR0FBMkIsSUFBSSxDQUFDO1FBQzFDLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBaUI1QiwyRUFBMkU7UUFDbkUsZ0JBQVcsR0FBaUIsSUFBSSxDQUFDO1FBMUJ4QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3BELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFRTSxXQUFXLENBQUMsT0FBZSxFQUFFLE1BQWM7UUFDakQsaUNBQWlDO1FBQ2pDLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGNBQWMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDckgsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFDdkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLENBQUM7SUFLTSxJQUFJO1FBQ1YsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztZQUN4QixJQUFJLENBQUMsY0FBYyxJQUFJLG1DQUFtQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RSxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUM7WUFDNUosdUJBQXVCO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BILENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ2xDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUVoRCxvQ0FBb0M7UUFDcEMsZ0VBQWdFO1FBQ2hFLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztRQUN4QixPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVcsQ0FBQztZQUNwQyxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7WUFFekMsSUFBSSxrQkFBa0IsR0FBaUIsSUFBSSxDQUFDO1lBRTVDLElBQUksSUFBSSxDQUFDLGVBQWUsR0FBRyxVQUFVLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ25FLE9BQU8sSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLEdBQUcsVUFBVSxJQUFJLGFBQWEsS0FBSyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDcEgsa0NBQWtDO29CQUNsQyxzRUFBc0U7b0JBQ3RFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQztnQkFFRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxvQ0FBNEIsQ0FBQztnQkFDdEYsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBRWxGLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNoRSxvREFBb0Q7Z0JBQ3BELElBQUksbUJBQW1CLElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxFQUFFLENBQUM7b0JBQ3ZFLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUNsRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUVqRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLDhCQUE4QixDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMvRSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDO29CQUNyQyxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUNaLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO3dCQUNyQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNoQyxJQUFJLEtBQUssRUFBRSxDQUFDOzRCQUNYLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7NEJBQ2xELElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQ0FDeEIsb0NBQW9DO2dDQUNwQyxJQUFJLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7NEJBQ3BDLENBQUM7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsZUFBZSxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO2dCQUVuRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7b0JBQ3hCLGtGQUFrRjtvQkFFbEYsSUFBSSxZQUFZLEtBQUssSUFBSSxDQUFDLE9BQU8sSUFBSSxtQkFBbUIsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7d0JBQ2xGLG1DQUFtQzt3QkFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQzt3QkFDdEMsTUFBTTtvQkFDUCxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsMkJBQTJCO3dCQUMzQixJQUFJLENBQUMsY0FBYyxJQUFJLG1DQUFtQyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUN0RixPQUFPLGtCQUFrQixDQUFDO29CQUMzQixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxtRUFBbUU7b0JBQ25FLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDdkIsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsTUFBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM5RSxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztnQkFDekIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztnQkFFeEIsZUFBZSxJQUFJLEVBQUUsQ0FBQyxDQUFDLHlCQUF5QjtnQkFDaEQsOERBQThEO2dCQUU5RCxJQUFJLGVBQWUsR0FBRyxJQUFJLEVBQUUsQ0FBQztvQkFDNUIsaURBQWlEO29CQUNqRCxNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxlQUFlLEdBQUcsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLHlEQUF5RDtnQkFDekQsZ0RBQWdEO2dCQUNoRCxtREFBbUQ7Z0JBQ25ELDBEQUEwRDtnQkFDMUQsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsbUdBQW1HO1FBQ25HLCtCQUErQjtRQUMvQiwrRkFBK0Y7UUFDL0YsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNoRyxPQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sMEJBQWtCLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDckcsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGFBQWE7SUFLekIsWUFBNkIsSUFBWSxFQUFFLFFBQXVCO1FBQXJDLFNBQUksR0FBSixJQUFJLENBQVE7UUFKakMsWUFBTyxHQUFXLFVBQVUsQ0FBQztRQUU3QixRQUFHLEdBQUcsQ0FBQyxDQUFDO1FBR2YsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzFDLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxHQUFHLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRXRFLE1BQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQztRQUUzQixJQUFJLEtBQTZCLENBQUM7UUFDbEMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO1FBRTVCLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO1FBRXpCLE1BQU0sb0JBQW9CLEdBQVksRUFBRSxDQUFDO1FBQ3pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3QixvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLElBQUksS0FBSyxDQUNSLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLDBCQUFrQixDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsRUFDaEUsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUMvQixDQUNELENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxvQkFBb0IsR0FBWSxFQUFFLENBQUM7UUFDekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdCLG9CQUFvQixDQUFDLElBQUksQ0FDeEIsSUFBSSxLQUFLLENBQ1IsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsMEJBQWtCLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUNoRSxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQy9CLENBQ0QsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7WUFDckIsc0ZBQXNGO1lBQ3RGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM3QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO2dCQUM5QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUNwQixZQUFZLEVBQUUsQ0FBQztvQkFDZixtQkFBbUIsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxrQkFBa0IsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDdEMsSUFBSSxLQUFZLENBQUM7d0JBQ2pCLElBQUksZ0JBQWdCLEtBQUssWUFBWSxFQUFFLENBQUM7NEJBQ3ZDLE1BQU0sUUFBUSxHQUFHLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQzs0QkFDaEQsSUFBSSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7Z0NBQzVDLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQzs0QkFDeEMsQ0FBQztpQ0FBTSxDQUFDO2dDQUNQLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0NBQ3JDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLDBCQUFrQixDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDOzRCQUN0RyxDQUFDO3dCQUNGLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxNQUFNLFNBQVMsR0FBRyxZQUFZLEdBQUcsZ0JBQWdCLENBQUM7NEJBQ2xELE1BQU0sUUFBUSxHQUFHLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQzs0QkFDakQsSUFBSSxTQUFTLEtBQUssQ0FBQyxJQUFJLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQ0FDL0QsS0FBSyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUN4QyxDQUFDO2lDQUFNLENBQUM7Z0NBQ1AsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztnQ0FDN0MsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sMEJBQWtCLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7NEJBQ3RHLENBQUM7d0JBQ0YsQ0FBQzt3QkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNwQixDQUFDO29CQUVELHNEQUFzRDtvQkFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBRSxDQUFDLENBQUM7b0JBRXZDLGtCQUFrQixHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO29CQUM5QyxnQkFBZ0IsR0FBRyxZQUFZLENBQUM7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFM0IsSUFBSSxrQkFBa0IsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxNQUFNLE1BQU0sR0FBRyxDQUFDLGdCQUFnQixLQUFLLFlBQVksQ0FBQztnQkFDakQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLGtCQUFrQixDQUFDO2dCQUMxQyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksR0FBRyxnQkFBZ0IsRUFBRSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztZQUMzRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sMEJBQWtCLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsWUFBWSxFQUFFLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUlELElBQUk7UUFDSCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ3hDLENBQUM7SUFFRCxJQUFJO1FBQ0gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDdEMsQ0FBQztJQUVELElBQUksQ0FBQyxNQUFjO1FBQ2xCLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7Q0FDRCJ9
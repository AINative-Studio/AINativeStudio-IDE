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
import { Range } from '../../../core/range.js';
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { pick } from '../../../../../base/common/arrays.js';
import { assert } from '../../../../../base/common/assert.js';
import { MarkdownComment } from '../tokens/markdownComment.js';
import { ExclamationMark } from '../../simpleCodec/tokens/exclamationMark.js';
import { LeftAngleBracket, RightAngleBracket } from '../../simpleCodec/tokens/angleBrackets.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * The parser responsible for parsing the `<!--` sequence - the start of a `markdown comment`.
 */
export class PartialMarkdownCommentStart extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // if received `!` after `<`, continue the parsing process
        if (token instanceof ExclamationMark && lastToken instanceof LeftAngleBracket) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if received `-` after, check that previous token either `!` or `-`,
        // which allows to continue the parsing process, otherwise fail
        if (token instanceof Dash) {
            this.currentTokens.push(token);
            if (lastToken instanceof ExclamationMark) {
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
            if (lastToken instanceof Dash) {
                const token1 = this.currentTokens[0];
                const token2 = this.currentTokens[1];
                const token3 = this.currentTokens[2];
                const token4 = this.currentTokens[3];
                // sanity checks
                assert(token1 instanceof LeftAngleBracket, `The first token must be a '<', got '${token1}'.`);
                assert(token2 instanceof ExclamationMark, `The second token must be a '!', got '${token2}'.`);
                assert(token3 instanceof Dash, `The third token must be a '-', got '${token3}'.`);
                assert(token4 instanceof Dash, `The fourth token must be a '-', got '${token4}'.`);
                this.isConsumed = true;
                return {
                    result: 'success',
                    nextParser: new MarkdownCommentStart([token1, token2, token3, token4]),
                    wasTokenConsumed: true,
                };
            }
        }
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialMarkdownCommentStart.prototype, "accept", null);
/**
 * The parser responsible for a `markdown comment` sequence of tokens.
 * E.g. `<!-- some comment` which may or may not end with `-->`. If it does,
 * then the parser transitions to the {@link MarkdownComment} token.
 */
export class MarkdownCommentStart extends ParserBase {
    constructor(tokens) {
        super(tokens);
    }
    accept(token) {
        // if received `>` while current token sequence ends with `--`,
        // then this is the end of the comment sequence
        if (token instanceof RightAngleBracket && this.endsWithDashes) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this.asMarkdownComment(),
                wasTokenConsumed: true,
            };
        }
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Convert the current token sequence into a {@link MarkdownComment} token.
     *
     * Note! that this method marks the current parser object as "consumend"
     *       hence it should not be used after this method is called.
     */
    asMarkdownComment() {
        this.isConsumed = true;
        const text = this.currentTokens
            .map(pick('text'))
            .join('');
        return new MarkdownComment(this.range, text);
    }
    /**
     * Get range of current token sequence.
     */
    get range() {
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        const range = new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
        return range;
    }
    /**
     * Whether the current token sequence ends with two dashes.
     */
    get endsWithDashes() {
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        if (!(lastToken instanceof Dash)) {
            return false;
        }
        const secondLastToken = this.currentTokens[this.currentTokens.length - 2];
        if (!(secondLastToken instanceof Dash)) {
            return false;
        }
        return true;
    }
}
__decorate([
    assertNotConsumed
], MarkdownCommentStart.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Db21tZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL21hcmtkb3duQ29kZWMvcGFyc2Vycy9tYXJrZG93bkNvbW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBc0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUVwRzs7R0FFRztBQUNILE1BQU0sT0FBTywyQkFBNEIsU0FBUSxVQUE0RTtJQUM1SCxZQUFZLEtBQXVCO1FBQ2xDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUdNLE1BQU0sQ0FBQyxLQUFtQjtRQUNoQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRXBFLDBEQUEwRDtRQUMxRCxJQUFJLEtBQUssWUFBWSxlQUFlLElBQUksU0FBUyxZQUFZLGdCQUFnQixFQUFF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
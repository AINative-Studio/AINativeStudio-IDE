/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownLink } from '../tokens/markdownLink.js';
import { NewLine } from '../../linesCodec/tokens/newLine.js';
import { assert } from '../../../../../base/common/assert.js';
import { FormFeed } from '../../simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../../simpleCodec/tokens/verticalTab.js';
import { CarriageReturn } from '../../linesCodec/tokens/carriageReturn.js';
import { RightBracket } from '../../simpleCodec/tokens/brackets.js';
import { ParserBase } from '../../simpleCodec/parserBase.js';
import { LeftParenthesis, RightParenthesis } from '../../simpleCodec/tokens/parentheses.js';
/**
 * List of characters that are not allowed in links so stop a markdown link sequence abruptly.
 */
const MARKDOWN_LINK_STOP_CHARACTERS = [CarriageReturn, NewLine, VerticalTab, FormFeed]
    .map((token) => { return token.symbol; });
/**
 * The parser responsible for parsing a `markdown link caption` part of a markdown
 * link (e.g., the `[caption text]` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with single `[` token and collects all tokens until
 * the first `]` token is encountered. In this successful case, the parser transitions
 * into the {@linkcode MarkdownLinkCaption} parser type which continues the general
 * parsing process of the markdown link.
 *
 * Otherwise, if one of the stop characters defined in the {@linkcode MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the `]` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 */
export class PartialMarkdownLinkCaption extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // any of stop characters is are breaking a markdown link caption sequence
        if (MARKDOWN_LINK_STOP_CHARACTERS.includes(token.text)) {
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // the `]` character ends the caption of a markdown link
        if (token instanceof RightBracket) {
            return {
                result: 'success',
                nextParser: new MarkdownLinkCaption([...this.tokens, token]),
                wasTokenConsumed: true,
            };
        }
        // otherwise, include the token in the sequence
        // and keep the current parser object instance
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
}
/**
 * The parser responsible for transitioning from a {@linkcode PartialMarkdownLinkCaption}
 * parser to the {@link PartialMarkdownLink} one, therefore serves a parser glue between
 * the `[caption]` and the `(./some/path)` parts of the `[caption](./some/path)` link.
 *
 * The only successful case of this parser is the `(` token that initiated the process
 * of parsing the `reference` part of a markdown link and in this case the parser
 * transitions into the `PartialMarkdownLink` parser type.
 *
 * Any other character is considered a failure result. In this case, the caller is assumed
 * to be responsible for re-emitting the {@link tokens} accumulated so far as standalone
 * entities since they are no longer represent a coherent token entity of a larger size.
 */
export class MarkdownLinkCaption extends ParserBase {
    accept(token) {
        // the `(` character starts the link part of a markdown link
        // that is the only character that can follow the caption
        if (token instanceof LeftParenthesis) {
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: new PartialMarkdownLink([...this.tokens], token),
            };
        }
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
/**
 * The parser responsible for parsing a `link reference` part of a markdown link
 * (e.g., the `(./some/path)` part of the `[caption text](./some/path)` link).
 *
 * The parsing process starts with tokens that represent the `[caption]` part of a markdown
 * link, followed by the `(` token. The parser collects all subsequent tokens until final closing
 * parenthesis (`)`) is encountered (*\*see [1] below*). In this successful case, the parser object
 * transitions into the {@linkcode MarkdownLink} token type which signifies the end of the entire
 * parsing process of the link text.
 *
 * Otherwise, if one of the stop characters defined in the {@linkcode MARKDOWN_LINK_STOP_CHARACTERS}
 * is encountered before the final `)` token, the parsing process is aborted which is communicated to
 * the caller by returning a `failure` result. In this case, the caller is assumed to be responsible
 * for re-emitting the {@link tokens} accumulated so far as standalone entities since they are no
 * longer represent a coherent token entity of a larger size.
 *
 * `[1]` The `reference` part of the markdown link can contain any number of nested parenthesis, e.g.,
 * 	  `[caption](/some/p(th/file.md)` is a valid markdown link and a valid folder name, hence number
 *     of open parenthesis must match the number of closing ones and the path sequence is considered
 *     to be complete as soon as this requirement is met. Therefore the `final` word is used in
 *     the description comments above to highlight this important detail.
 */
export class PartialMarkdownLink extends ParserBase {
    constructor(captionTokens, token) {
        super([token]);
        this.captionTokens = captionTokens;
        /**
         * Number of open parenthesis in the sequence.
         * See comment in the {@linkcode accept} method for more details.
         */
        this.openParensCount = 1;
    }
    get tokens() {
        return [...this.captionTokens, ...this.currentTokens];
    }
    accept(token) {
        // markdown links allow for nested parenthesis inside the link reference part, but
        // the number of open parenthesis must match the number of closing parenthesis, e.g.:
        // 	- `[caption](/some/p()th/file.md)` is a valid markdown link
        // 	- `[caption](/some/p(th/file.md)` is an invalid markdown link
        // hence we use the `openParensCount` variable to keep track of the number of open
        // parenthesis encountered so far; then upon encountering a closing parenthesis we
        // decrement the `openParensCount` and if it reaches 0 - we consider the link reference
        // to be complete
        if (token instanceof LeftParenthesis) {
            this.openParensCount += 1;
        }
        if (token instanceof RightParenthesis) {
            this.openParensCount -= 1;
            // sanity check! this must alway hold true because we return a complete markdown
            // link as soon as we encounter matching number of closing parenthesis, hence
            // we must never have `openParensCount` that is less than 0
            assert(this.openParensCount >= 0, `Unexpected right parenthesis token encountered: '${token}'.`);
            // the markdown link is complete as soon as we get the same number of closing parenthesis
            if (this.openParensCount === 0) {
                const { startLineNumber, startColumn } = this.captionTokens[0].range;
                // create link caption string
                const caption = this.captionTokens
                    .map((token) => { return token.text; })
                    .join('');
                // create link reference string
                this.currentTokens.push(token);
                const reference = this.currentTokens
                    .map((token) => { return token.text; }).join('');
                // return complete markdown link object
                return {
                    result: 'success',
                    wasTokenConsumed: true,
                    nextParser: new MarkdownLink(startLineNumber, startColumn, caption, reference),
                };
            }
        }
        // any of stop characters is are breaking a markdown link reference sequence
        if (MARKDOWN_LINK_STOP_CHARACTERS.includes(token.text)) {
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // the rest of the tokens can be included in the sequence
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbWFya2Rvd25Db2RlYy9wYXJzZXJzL21hcmtkb3duTGluay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBc0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFNUY7O0dBRUc7QUFDSCxNQUFNLDZCQUE2QixHQUFzQixDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQztLQUN2RyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTNDOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBQTBFO0lBQ3pILFlBQVksS0FBa0I7UUFDN0IsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFD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
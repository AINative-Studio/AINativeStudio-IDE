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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25MaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9tYXJrZG93bkNvZGVjL3BhcnNlcnMvbWFya2Rvd25MaW5rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlDQUFpQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1Rjs7R0FFRztBQUNILE1BQU0sNkJBQTZCLEdBQXNCLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDO0tBQ3ZHLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFM0M7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFBMEU7SUFDekgsWUFBWSxLQUFrQjtRQUM3QixLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBbUI7UUFDaEMsMEVBQTBFO1FBQzFFLElBQUksNkJBQTZCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3hELE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLGdCQUFnQixFQUFFLEtBQUs7YUFDdkIsQ0FBQztRQUNILENBQUM7UUFFRCx3REFBd0Q7UUFDeEQsSUFBSSxLQUFLLFlBQVksWUFBWSxFQUFFLENBQUM7WUFDbkMsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUksbUJBQW1CLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzVELGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCwrQ0FBK0M7UUFDL0MsOENBQThDO1FBQzlDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTixNQUFNLEVBQUUsU0FBUztZQUNqQixVQUFVLEVBQUUsSUFBSTtZQUNoQixnQkFBZ0IsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsVUFBbUU7SUFDcEcsTUFBTSxDQUFDLEtBQW1CO1FBQ2hDLDREQUE0RDtRQUM1RCx5REFBeUQ7UUFDekQsSUFBSSxLQUFLLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDdEMsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsVUFBVSxFQUFFLElBQUksbUJBQW1CLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUM7YUFDNUQsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPO1lBQ04sTUFBTSxFQUFFLFNBQVM7WUFDakIsZ0JBQWdCLEVBQUUsS0FBSztTQUN2QixDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUE0RDtJQU9wRyxZQUNvQixhQUE2QixFQUNoRCxLQUFzQjtRQUV0QixLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBSEksa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBUGpEOzs7V0FHRztRQUNLLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO0lBT3BDLENBQUM7SUFFRCxJQUFvQixNQUFNO1FBQ3pCLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFtQjtRQUNoQyxrRkFBa0Y7UUFDbEYscUZBQXFGO1FBQ3JGLCtEQUErRDtRQUMvRCxpRUFBaUU7UUFDakUsa0ZBQWtGO1FBQ2xGLGtGQUFrRjtRQUNsRix1RkFBdUY7UUFDdkYsaUJBQWlCO1FBRWpCLElBQUksS0FBSyxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFRCxJQUFJLEtBQUssWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDO1lBRTFCLGdGQUFnRjtZQUNoRiw2RUFBNkU7WUFDN0UsMkRBQTJEO1lBQzNELE1BQU0sQ0FDTCxJQUFJLENBQUMsZUFBZSxJQUFJLENBQUMsRUFDekIsb0RBQW9ELEtBQUssSUFBSSxDQUM3RCxDQUFDO1lBRUYseUZBQXlGO1lBQ3pGLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFFckUsNkJBQTZCO2dCQUM3QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYTtxQkFDaEMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ3RDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFFWCwrQkFBK0I7Z0JBQy9CLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYTtxQkFDbEMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRWxELHVDQUF1QztnQkFDdkMsT0FBTztvQkFDTixNQUFNLEVBQUUsU0FBUztvQkFDakIsZ0JBQWdCLEVBQUUsSUFBSTtvQkFDdEIsVUFBVSxFQUFFLElBQUksWUFBWSxDQUMzQixlQUFlLEVBQ2YsV0FBVyxFQUNYLE9BQU8sRUFDUCxTQUFTLENBQ1Q7aUJBQ0QsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsNEVBQTRFO1FBQzVFLElBQUksNkJBQTZCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3hELE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLGdCQUFnQixFQUFFLEtBQUs7YUFDdkIsQ0FBQztRQUNILENBQUM7UUFFRCx5REFBeUQ7UUFDekQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsT0FBTztZQUNOLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGdCQUFnQixFQUFFLElBQUk7U0FDdEIsQ0FBQztJQUNILENBQUM7Q0FDRCJ9
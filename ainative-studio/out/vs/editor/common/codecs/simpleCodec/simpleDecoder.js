/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Hash } from './tokens/hash.js';
import { Dash } from './tokens/dash.js';
import { Colon } from './tokens/colon.js';
import { FormFeed } from './tokens/formFeed.js';
import { Tab } from '../simpleCodec/tokens/tab.js';
import { Word } from '../simpleCodec/tokens/word.js';
import { VerticalTab } from './tokens/verticalTab.js';
import { Space } from '../simpleCodec/tokens/space.js';
import { NewLine } from '../linesCodec/tokens/newLine.js';
import { ExclamationMark } from './tokens/exclamationMark.js';
import { CarriageReturn } from '../linesCodec/tokens/carriageReturn.js';
import { LinesDecoder } from '../linesCodec/linesDecoder.js';
import { LeftBracket, RightBracket } from './tokens/brackets.js';
import { BaseDecoder } from '../../../../base/common/codecs/baseDecoder.js';
import { LeftParenthesis, RightParenthesis } from './tokens/parentheses.js';
import { LeftAngleBracket, RightAngleBracket } from './tokens/angleBrackets.js';
/**
 * List of well-known distinct tokens that this decoder emits (excluding
 * the word stop characters defined below). Everything else is considered
 * an arbitrary "text" sequence and is emitted as a single `Word` token.
 */
const WELL_KNOWN_TOKENS = Object.freeze([
    Space, Tab, VerticalTab, FormFeed,
    LeftBracket, RightBracket, LeftAngleBracket, RightAngleBracket,
    LeftParenthesis, RightParenthesis, Colon, Hash, Dash, ExclamationMark,
]);
/**
 * Characters that stop a "word" sequence.
 * Note! the `\r` and `\n` are excluded from the list because this decoder based on `LinesDecoder` which
 * 	     already handles the `carriagereturn`/`newline` cases and emits lines that don't contain them.
 */
const WORD_STOP_CHARACTERS = Object.freeze([
    Space.symbol, Tab.symbol, VerticalTab.symbol, FormFeed.symbol,
    LeftBracket.symbol, RightBracket.symbol, LeftAngleBracket.symbol, RightAngleBracket.symbol,
    LeftParenthesis.symbol, RightParenthesis.symbol,
    Colon.symbol, Hash.symbol, Dash.symbol, ExclamationMark.symbol,
]);
/**
 * A decoder that can decode a stream of `Line`s into a stream
 * of simple token, - `Word`, `Space`, `Tab`, `NewLine`, etc.
 */
export class SimpleDecoder extends BaseDecoder {
    constructor(stream) {
        super(new LinesDecoder(stream));
    }
    onStreamData(token) {
        // re-emit new line tokens immediately
        if (token instanceof CarriageReturn || token instanceof NewLine) {
            this._onData.fire(token);
            return;
        }
        // loop through the text separating it into `Word` and `Space` tokens
        let i = 0;
        while (i < token.text.length) {
            // index is 0-based, but column numbers are 1-based
            const columnNumber = i + 1;
            // check if the current character is a well-known token
            const tokenConstructor = WELL_KNOWN_TOKENS
                .find((wellKnownToken) => {
                return wellKnownToken.symbol === token.text[i];
            });
            // if it is a well-known token, emit it and continue to the next one
            if (tokenConstructor) {
                this._onData.fire(tokenConstructor.newOnLine(token, columnNumber));
                i++;
                continue;
            }
            // otherwise, it is an arbitrary "text" sequence of characters,
            // that needs to be collected into a single `Word` token, hence
            // read all the characters until a stop character is encountered
            let word = '';
            while (i < token.text.length && !(WORD_STOP_CHARACTERS.includes(token.text[i]))) {
                word += token.text[i];
                i++;
            }
            // emit a "text" sequence of characters as a single `Word` token
            this._onData.fire(Word.newOnLine(word, token, columnNumber));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL3NpbXBsZUNvZGVjL3NpbXBsZURlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3hDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsWUFBWSxFQUFjLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQVksTUFBTSxzQkFBc0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBZ0IsTUFBTSx5QkFBeUIsQ0FBQztBQUMxRixPQUFP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
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9zaW1wbGVDb2RlYy9zaW1wbGVEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDeEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUU5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBYyxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFZLE1BQU0sc0JBQXNCLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQWdCLE1BQU0seUJBQXlCLENBQUM7QUFDMUYsT0FB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
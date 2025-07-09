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
import { pick } from '../../../../../../../base/common/arrays.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { PromptVariable, PromptVariableWithData } from '../tokens/promptVariable.js';
import { Tab } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/tab.js';
import { Hash } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/hash.js';
import { Space } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/space.js';
import { Colon } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/colon.js';
import { NewLine } from '../../../../../../../editor/common/codecs/linesCodec/tokens/newLine.js';
import { FormFeed } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/formFeed.js';
import { VerticalTab } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/verticalTab.js';
import { CarriageReturn } from '../../../../../../../editor/common/codecs/linesCodec/tokens/carriageReturn.js';
import { ExclamationMark } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/exclamationMark.js';
import { LeftBracket, RightBracket } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/brackets.js';
import { LeftAngleBracket, RightAngleBracket } from '../../../../../../../editor/common/codecs/simpleCodec/tokens/angleBrackets.js';
import { assertNotConsumed, ParserBase } from '../../../../../../../editor/common/codecs/simpleCodec/parserBase.js';
/**
 * List of characters that terminate the prompt variable sequence.
 */
export const STOP_CHARACTERS = [Space, Tab, NewLine, CarriageReturn, VerticalTab, FormFeed]
    .map((token) => { return token.symbol; });
/**
 * List of characters that cannot be in a variable name (excluding the {@link STOP_CHARACTERS}).
 */
export const INVALID_NAME_CHARACTERS = [Hash, Colon, ExclamationMark, LeftAngleBracket, RightAngleBracket, LeftBracket, RightBracket]
    .map((token) => { return token.symbol; });
/**
 * The parser responsible for parsing a `prompt variable name`.
 * E.g., `#selection` or `#workspace` variable. If the `:` character follows
 * the variable name, the parser transitions to {@link PartialPromptVariableWithData}
 * that is also able to parse the `data` part of the variable. E.g., the `#file` part
 * of the `#file:/path/to/something.md` sequence.
 */
export class PartialPromptVariableName extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            try {
                // if it is possible to convert current parser to `PromptVariable`, return success result
                return {
                    result: 'success',
                    nextParser: this.asPromptVariable(),
                    wasTokenConsumed: false,
                };
            }
            catch (error) {
                // otherwise fail
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            finally {
                // in any case this is an end of the parsing process
                this.isConsumed = true;
            }
        }
        // if a `:` character is encountered, we might transition to {@link PartialPromptVariableWithData}
        if (token instanceof Colon) {
            this.isConsumed = true;
            // if there is only one token before the `:` character, it must be the starting
            // `#` symbol, therefore fail because there is no variable name present
            if (this.currentTokens.length <= 1) {
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            // otherwise, if there are more characters after `#` available,
            // we have a variable name, so we can transition to {@link PromptVariableWithData}
            return {
                result: 'success',
                nextParser: new PartialPromptVariableWithData([...this.currentTokens, token]),
                wasTokenConsumed: true,
            };
        }
        // variables cannot have {@link INVALID_NAME_CHARACTERS} in their names
        if (INVALID_NAME_CHARACTERS.includes(token.text)) {
            this.isConsumed = true;
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // otherwise, a valid name character, so add it to the list of
        // the current tokens and continue the parsing process
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Try to convert current parser instance into a fully-parsed {@link PromptVariable} token.
     *
     * @throws if sequence of tokens received so far do not constitute a valid prompt variable,
     *        for instance, if there is only `1` starting `#` token is available.
     */
    asPromptVariable() {
        // if there is only one token before the stop character
        // must be the starting `#` one), then fail
        assert(this.currentTokens.length > 1, 'Cannot create a prompt variable out of incomplete token sequence.');
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // render the characters above into strings, excluding the starting `#` character
        const variableNameTokens = this.currentTokens.slice(1);
        const variableName = variableNameTokens.map(pick('text')).join('');
        return new PromptVariable(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), variableName);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptVariableName.prototype, "accept", null);
/**
 * The parser responsible for parsing a `prompt variable name` with `data`.
 * E.g., the `/path/to/something.md` part of the `#file:/path/to/something.md` sequence.
 */
export class PartialPromptVariableWithData extends ParserBase {
    constructor(tokens) {
        const firstToken = tokens[0];
        const lastToken = tokens[tokens.length - 1];
        // sanity checks of our expectations about the tokens list
        assert(tokens.length > 2, `Tokens list must contain at least 3 items, got '${tokens.length}'.`);
        assert(firstToken instanceof Hash, `The first token must be a '#', got '${firstToken} '.`);
        assert(lastToken instanceof Colon, `The last token must be a ':', got '${lastToken} '.`);
        super([...tokens]);
    }
    accept(token) {
        // if a `stop` character is encountered, finish the parsing process
        if (STOP_CHARACTERS.includes(token.text)) {
            // in any case, success of failure below, this is an end of the parsing process
            this.isConsumed = true;
            const firstToken = this.currentTokens[0];
            const lastToken = this.currentTokens[this.currentTokens.length - 1];
            // tokens representing variable name without the `#` character at the start and
            // the `:` data separator character at the end
            const variableNameTokens = this.currentTokens.slice(1, this.startTokensCount - 1);
            // tokens representing variable data without the `:` separator character at the start
            const variableDataTokens = this.currentTokens.slice(this.startTokensCount);
            // compute the full range of the variable token
            const fullRange = new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
            // render the characters above into strings
            const variableName = variableNameTokens.map(pick('text')).join('');
            const variableData = variableDataTokens.map(pick('text')).join('');
            return {
                result: 'success',
                nextParser: new PromptVariableWithData(fullRange, variableName, variableData),
                wasTokenConsumed: false,
            };
        }
        // otherwise, token is a valid data character - the data can contain almost any character,
        // including `:` and `#`, hence add it to the list of the current tokens and continue
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Try to convert current parser instance into a fully-parsed {@link asPromptVariableWithData} token.
     */
    asPromptVariableWithData() {
        // tokens representing variable name without the `#` character at the start and
        // the `:` data separator character at the end
        const variableNameTokens = this.currentTokens.slice(1, this.startTokensCount - 1);
        // tokens representing variable data without the `:` separator character at the start
        const variableDataTokens = this.currentTokens.slice(this.startTokensCount);
        // render the characters above into strings
        const variableName = variableNameTokens.map(pick('text')).join('');
        const variableData = variableDataTokens.map(pick('text')).join('');
        const firstToken = this.currentTokens[0];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        return new PromptVariableWithData(new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn), variableName, variableData);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptVariableWithData.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFyaWFibGVQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9wYXJzZXJzL3Byb21wdFZhcmlhYmxlUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDMUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUM5RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUVwRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDMUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQztBQUNsSCxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3JILE9B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
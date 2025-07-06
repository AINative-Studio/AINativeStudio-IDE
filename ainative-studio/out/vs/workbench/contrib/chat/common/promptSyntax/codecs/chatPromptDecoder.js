/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './tokens/promptToken.js';
import { assertNever } from '../../../../../../base/common/assert.js';
import { BaseDecoder } from '../../../../../../base/common/codecs/baseDecoder.js';
import { Hash } from '../../../../../../editor/common/codecs/simpleCodec/tokens/hash.js';
import { MarkdownLink } from '../../../../../../editor/common/codecs/markdownCodec/tokens/markdownLink.js';
import { PartialPromptVariableName, PartialPromptVariableWithData } from './parsers/promptVariableParser.js';
import { MarkdownDecoder } from '../../../../../../editor/common/codecs/markdownCodec/markdownDecoder.js';
/**
 * Decoder for the common chatbot prompt message syntax.
 * For instance, the file references `#file:./path/file.md` are handled by this decoder.
 */
export class ChatPromptDecoder extends BaseDecoder {
    constructor(stream) {
        super(new MarkdownDecoder(stream));
    }
    onStreamData(token) {
        // prompt variables always start with the `#` character, hence
        // initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if (token instanceof Hash && !this.current) {
            this.current = new PartialPromptVariableName(token);
            return;
        }
        // if current parser was not yet initiated, - we are in the general
        // "text" parsing mode, therefore re-emit the token immediately and return
        if (!this.current) {
            // at the moment, the decoder outputs only specific markdown tokens, like
            // the `markdown link` one, so re-emit only these tokens ignoring the rest
            //
            // note! to make the decoder consistent with others we would need to:
            // 	- re-emit all tokens here
            //  - collect all "text" sequences of tokens and emit them as a single
            // 	  "text" sequence token
            if (token instanceof MarkdownLink) {
                this._onData.fire(token);
            }
            return;
        }
        // if there is a current parser object, submit the token to it
        // so it can progress with parsing the tokens sequence
        const parseResult = this.current.accept(token);
        // process the parse result next
        switch (parseResult.result) {
            // in the case of success there might be 2 cases:
            //   1) parsing fully completed and an instance of `PromptToken` is returned back,
            //      in this case, emit the parsed token (e.g., a `link`) and reset the current
            //      parser object reference so a new parsing process can be initiated next
            //   2) parsing is still in progress and the next parser object is returned, hence
            //      we need to replace the current parser object with a new one and continue
            case 'success': {
                const { nextParser } = parseResult;
                if (nextParser instanceof PromptToken) {
                    this._onData.fire(nextParser);
                    delete this.current;
                }
                else {
                    this.current = nextParser;
                }
                break;
            }
            // in the case of failure, reset the current parser object
            case 'failure': {
                delete this.current;
                // note! when this decoder becomes consistent with other ones and hence starts emitting
                // 		 all token types, not just links, we would need to re-emit all the tokens that
                //       the parser object has accumulated so far
                break;
            }
        }
        // if token was not consumed by the parser, call `onStreamData` again
        // so the token is properly handled by the decoder in the case when a
        // new sequence starts with this token
        if (!parseResult.wasTokenConsumed) {
            this.onStreamData(token);
        }
    }
    onStreamEnd() {
        try {
            // if there is no currently active parser object present, nothing to do
            if (!this.current) {
                return;
            }
            // otherwise try to convert incomplete parser object to a token
            if (this.current instanceof PartialPromptVariableName) {
                return this._onData.fire(this.current.asPromptVariable());
            }
            if (this.current instanceof PartialPromptVariableWithData) {
                return this._onData.fire(this.current.asPromptVariableWithData());
            }
            assertNever(this.current, `Unknown parser object '${this.current}'`);
        }
        catch (error) {
            // note! when this decoder becomes consistent with other ones and hence starts emitting
            // 		 all token types, not just links, we would need to re-emit all the tokens that
            //       the parser object has accumulated so far
        }
        finally {
            delete this.current;
            super.onStreamEnd();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2NoYXRQcm9tcHREZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRWxGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDM0csT0FBTyxFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBa0IsTUFBTSx5RUFBeUUsQ0FBQztBQU8xSDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsV0FBNkM7SUFRbkYsWUFDQyxNQUFnQztRQUVoQyxLQUFLLENBQUMsSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRWtCLFlBQVksQ0FBQyxLQUFxQjtRQUNwRCw4REFBOEQ7UUFDOUQsZ0VBQWdFO1FBQ2hFLHlEQUF5RDtRQUN6RCxJQUFJLEtBQUssWUFBWSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXBELE9BQU87UUFDUixDQUFDO1FBRUQsbUVBQW1F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
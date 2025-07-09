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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9jaGF0UHJvbXB0RGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQzNHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdHLE9BQU8sRUFBRSxlQUFlLEVBQWtCLE1BQU0seUVBQXlFLENBQUM7QUFPMUg7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFdBQTZDO0lBUW5GLFlBQ0MsTUFBZ0M7UUFFaEMsS0FBSyxDQUFDLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVrQixZQUFZLENBQUMsS0FBcUI7UUFDcEQsOERBQThEO1FBQzlELGdFQUFnRTtRQUNoRSx5REFBeUQ7UUFDekQsSUFBSSxLQUFLLFlBQVksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVwRCxPQUFPO1FBQ1IsQ0FBQztRQUVELG1FQUFt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
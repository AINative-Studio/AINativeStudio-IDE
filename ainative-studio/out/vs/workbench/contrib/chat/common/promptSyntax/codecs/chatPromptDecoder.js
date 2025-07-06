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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvY2hhdFByb21wdERlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXRELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFbEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUMzRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFrQixNQUFNLHlFQUF5RSxDQUFDO0FBTzFIOzs7R0FHRztBQUNILE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxXQUE2QztJQVFuRixZQUNDLE1BQWdDO1FBRWhDLEtBQUssQ0FBQyxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFa0IsWUFBWSxDQUFDLEtBQXFCO1FBQ3BELDhEQUE4RDtRQUM5RCxnRUFBZ0U7UUFDaEUseURBQXlEO1FBQ3pELElBQUksS0FBSyxZQUFZLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUkseUJBQXlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFcEQsT0FBTztRQUNSLENBQUM7UUFFRCxtRUFBbUU7UUFDbkUsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIseUVBQXlFO1lBQ3pFLDBFQUEwRTtZQUMxRSxFQUFFO1lBQ0YscUVBQXFFO1lBQ3JFLDZCQUE2QjtZQUM3QixzRUFBc0U7WUFDdEUsMkJBQTJCO1lBQzNCLElBQUksS0FBSyxZQUFZLFlBQVksRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMxQixDQUFDO1lBRUQsT0FBTztRQUNSLENBQUM7UUFFRCw4REFBOEQ7UUFDOUQsc0RBQXNEO1FBQ3RELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRS9DLGdDQUFnQztRQUNoQyxRQUFRLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1QixpREFBaUQ7WUFDakQsa0ZBQWtGO1lBQ2xGLGtGQUFrRjtZQUNsRiw4RUFBOEU7WUFDOUUsa0ZBQWtGO1lBQ2xGLGdGQUFnRjtZQUNoRixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hCLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxXQUFXLENBQUM7Z0JBRW5DLElBQUksVUFBVSxZQUFZLFdBQVcsRUFBRSxDQUFDO29CQUN2QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUNyQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7Z0JBQzNCLENBQUM7Z0JBRUQsTUFBTTtZQUNQLENBQUM7WUFDRCwwREFBMEQ7WUFDMUQsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBRXBCLHVGQUF1RjtnQkFDdkYsbUZBQW1GO2dCQUNuRixpREFBaUQ7Z0JBQ2pELE1BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELHFFQUFxRTtRQUNyRSxxRUFBcUU7UUFDckUsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRWtCLFdBQVc7UUFDN0IsSUFBSSxDQUFDO1lBQ0osdUVBQXVFO1lBQ3ZFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLE9BQU87WUFDUixDQUFDO1lBRUQsK0RBQStEO1lBQy9ELElBQUksSUFBSSxDQUFDLE9BQU8sWUFBWSx5QkFBeUIsRUFBRSxDQUFDO2dCQUN2RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1lBQzNELENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLFlBQVksNkJBQTZCLEVBQUUsQ0FBQztnQkFDM0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQztZQUNuRSxDQUFDO1lBRUQsV0FBVyxDQUNWLElBQUksQ0FBQyxPQUFPLEVBQ1osMEJBQTBCLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FDekMsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLHVGQUF1RjtZQUN2RixtRkFBbUY7WUFDbkYsaURBQWlEO1FBQ2xELENBQUM7Z0JBQVMsQ0FBQztZQUNWLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNwQixLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9
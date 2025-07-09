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
import { MarkdownLink } from '../tokens/markdownLink.js';
import { MarkdownImage } from '../tokens/markdownImage.js';
import { LeftBracket } from '../../simpleCodec/tokens/brackets.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
import { PartialMarkdownLinkCaption } from './markdownLink.js';
/**
 * The parser responsible for parsing the `markdown image` sequence of characters.
 * E.g., `![alt text](./path/to/image.jpeg)` syntax.
 */
export class PartialMarkdownImage extends ParserBase {
    constructor(token) {
        super([token]);
    }
    /**
     * Get all currently available tokens of the `markdown link` sequence.
     */
    get tokens() {
        const linkTokens = this.markdownLinkParser?.tokens ?? [];
        return [
            ...this.currentTokens,
            ...linkTokens,
        ];
    }
    accept(token) {
        // on the first call we expect a character that begins `markdown link` sequence
        // hence we initiate the markdown link parsing process, otherwise we fail
        if (!this.markdownLinkParser) {
            if (token instanceof LeftBracket) {
                this.markdownLinkParser = new PartialMarkdownLinkCaption(token);
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
            return {
                result: 'failure',
                wasTokenConsumed: false,
            };
        }
        // handle subsequent tokens next
        const acceptResult = this.markdownLinkParser.accept(token);
        const { result, wasTokenConsumed } = acceptResult;
        if (result === 'success') {
            const { nextParser } = acceptResult;
            // if full markdown link was parsed out, the process completes
            if (nextParser instanceof MarkdownLink) {
                this.isConsumed = true;
                const firstToken = this.currentTokens[0];
                return {
                    result,
                    wasTokenConsumed,
                    nextParser: new MarkdownImage(firstToken.range.startLineNumber, firstToken.range.startColumn, `${firstToken.text}${nextParser.caption}`, nextParser.reference),
                };
            }
            // otherwise save new link parser reference and continue
            this.markdownLinkParser = nextParser;
            return {
                result,
                wasTokenConsumed,
                nextParser: this,
            };
        }
        // return the failure result
        this.isConsumed = true;
        return acceptResult;
    }
}
__decorate([
    assertNotConsumed
], PartialMarkdownImage.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25JbWFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvZGVjcy9tYXJrZG93bkNvZGVjL3BhcnNlcnMvbWFya2Rvd25JbWFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlDQUFpQyxDQUFDO0FBQ3BHLE9BQU8sRUFBNEMsMEJBQTBCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUV6Rzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsVUFBOEQ7SUFNdkcsWUFBWSxLQUFzQjtRQUNqQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQW9CLE1BQU07UUFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sSUFBSSxFQUFFLENBQUM7UUFFekQsT0FBTztZQUNOLEdBQUcsSUFBSSxDQUFDLGFBQWE7WUFDckIsR0FBRyxVQUFVO1NBQ2IsQ0FBQztJQUNILENBQUM7SUFHTSxNQUFNLENBQUMsS0FBbUI7UUFDaEMsK0VBQStFO1FBQy9FLHlFQUF5RTtRQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsSUFBSSxLQUFLLFlBQVksV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUVoRSxPQUFPO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtpQkFDdEIsQ0FBQztZQUNILENBQUM7WUFFRCxPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixnQkFBZ0IsRUFBRSxLQUFLO2FBQ3ZCLENBQUM7UUFDSCxDQUFDO1FBRUQsZ0NBQWdDO1FBRWhDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLFlBQVksQ0FBQztRQUVsRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsWUFBWSxDQUFDO1lBRXBDLDhEQUE4RDtZQUM5RCxJQUFJLFVBQVUsWUFBWSxZQUFZLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7Z0JBRXZCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pDLE9BQU87b0JBQ04sTUFBTTtvQkFDTixnQkFBZ0I7b0JBQ2hCLFVBQVUsRUFBRSxJQUFJLGFBQWEsQ0FDNUIsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ2hDLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUM1QixHQUFHLFVBQVUsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUN6QyxVQUFVLENBQUMsU0FBUyxDQUNwQjtpQkFDRCxDQUFDO1lBQ0gsQ0FBQztZQUVELHdEQUF3RDtZQUN4RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsVUFBVSxDQUFDO1lBQ3JDLE9BQU87Z0JBQ04sTUFBTTtnQkFDTixnQkFBZ0I7Z0JBQ2hCLFVBQVUsRUFBRSxJQUFJO2FBQ2hCLENBQUM7UUFDSCxDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7Q0FDRDtBQTFETztJQUROLGlCQUFpQjtrREEwRGpCIn0=
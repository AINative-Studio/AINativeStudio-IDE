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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25JbWFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29kZWNzL21hcmtkb3duQ29kZWMvcGFyc2Vycy9tYXJrZG93bkltYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQXNCLE1BQU0saUNBQWlDLENBQUM7QUFDcEcsT0FBTyxFQUE0QywwQkFBMEIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXpHOzs7R0FHRztBQUNILE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUE4RDtJQU12RyxZQUFZLEtBQXNCO1FBQ2pDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBb0IsTUFBTTtRQUN6QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUV6RCxPQUFPO1lBQ04sR0FBRyxJQUFJLENBQUMsYUFBYTtZQUNyQixHQUFHLFVBQVU7U0FDYixDQUFDO0lBQ0gsQ0FBQztJQUdNLE1BQU0sQ0FBQyxLQUFtQjtRQUNoQywrRUFBK0U7UUFDL0UseUVBQXlFO1FBQ3pFLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM5QixJQUFJLEtBQUssWUFBWSxXQUFXLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksMEJBQTBCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRWhFLE9BQU87b0JBQ04sTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLFVBQVUsRUFBRSxJQUFJO29CQUNoQixnQkFBZ0IsRUFBRSxJQUFJO2lCQUN0QixDQUFDO1lBQ0gsQ0FBQztZQUVELE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLGdCQUFnQixFQUFFLEtBQUs7YUFDdkIsQ0FBQztRQUNILENBQUM7UUFFRCxnQ0FBZ0M7UUFFaEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxNQUFNLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsWUFBWSxDQUFDO1FBRWxELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxZQUFZLENBQUM7WUFFcEMsOERBQThEO1lBQzlELElBQUksVUFBVSxZQUFZLFlBQVksRUFBRSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztnQkFFdkIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekMsT0FBTztvQkFDTixNQUFNO29CQUNOLGdCQUFnQjtvQkFDaEIsVUFBVSxFQUFFLElBQUksYUFBYSxDQUM1QixVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDaEMsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQzVCLEdBQUcsVUFBVSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQ3pDLFVBQVUsQ0FBQyxTQUFTLENBQ3BCO2lCQUNELENBQUM7WUFDSCxDQUFDO1lBRUQsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUM7WUFDckMsT0FBTztnQkFDTixNQUFNO2dCQUNOLGdCQUFnQjtnQkFDaEIsVUFBVSxFQUFFLElBQUk7YUFDaEIsQ0FBQztRQUNILENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztDQUNEO0FBMURPO0lBRE4saUJBQWlCO2tEQTBEakIifQ==
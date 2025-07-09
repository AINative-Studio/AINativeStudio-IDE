/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LanguageAgnosticBracketTokens } from './bracketPairsTree/brackets.js';
import { lengthAdd, lengthGetColumnCountIfZeroLineCount, lengthZero } from './bracketPairsTree/length.js';
import { parseDocument } from './bracketPairsTree/parser.js';
import { DenseKeyProvider } from './bracketPairsTree/smallImmutableSet.js';
import { TextBufferTokenizer } from './bracketPairsTree/tokenizer.js';
export function fixBracketsInLine(tokens, languageConfigurationService) {
    const denseKeyProvider = new DenseKeyProvider();
    const bracketTokens = new LanguageAgnosticBracketTokens(denseKeyProvider, (languageId) => languageConfigurationService.getLanguageConfiguration(languageId));
    const tokenizer = new TextBufferTokenizer(new StaticTokenizerSource([tokens]), bracketTokens);
    const node = parseDocument(tokenizer, [], undefined, true);
    let str = '';
    const line = tokens.getLineContent();
    function processNode(node, offset) {
        if (node.kind === 2 /* AstNodeKind.Pair */) {
            processNode(node.openingBracket, offset);
            offset = lengthAdd(offset, node.openingBracket.length);
            if (node.child) {
                processNode(node.child, offset);
                offset = lengthAdd(offset, node.child.length);
            }
            if (node.closingBracket) {
                processNode(node.closingBracket, offset);
                offset = lengthAdd(offset, node.closingBracket.length);
            }
            else {
                const singleLangBracketTokens = bracketTokens.getSingleLanguageBracketTokens(node.openingBracket.languageId);
                const closingTokenText = singleLangBracketTokens.findClosingTokenText(node.openingBracket.bracketIds);
                str += closingTokenText;
            }
        }
        else if (node.kind === 3 /* AstNodeKind.UnexpectedClosingBracket */) {
            // remove the bracket
        }
        else if (node.kind === 0 /* AstNodeKind.Text */ || node.kind === 1 /* AstNodeKind.Bracket */) {
            str += line.substring(lengthGetColumnCountIfZeroLineCount(offset), lengthGetColumnCountIfZeroLineCount(lengthAdd(offset, node.length)));
        }
        else if (node.kind === 4 /* AstNodeKind.List */) {
            for (const child of node.children) {
                processNode(child, offset);
                offset = lengthAdd(offset, child.length);
            }
        }
    }
    processNode(node, lengthZero);
    return str;
}
class StaticTokenizerSource {
    constructor(lines) {
        this.lines = lines;
        this.tokenization = {
            getLineTokens: (lineNumber) => {
                return this.lines[lineNumber - 1];
            }
        };
    }
    getValue() {
        return this.lines.map(l => l.getLineContent()).join('\n');
    }
    getLineCount() {
        return this.lines.length;
    }
    getLineLength(lineNumber) {
        return this.lines[lineNumber - 1].getLineContent().length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4QnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2ZpeEJyYWNrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9FLE9BQU8sRUFBVSxTQUFTLEVBQUUsbUNBQW1DLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzNFLE9BQU8sRUFBb0IsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUd4RixNQUFNLFVBQVUsaUJBQWlCLENBQUMsTUFBdUIsRUFBRSw0QkFBMkQ7SUFDckgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixFQUFVLENBQUM7SUFDeEQsTUFBTSxhQUFhLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQ3hGLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUNqRSxDQUFDO0lBQ0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxtQkFBbUIsQ0FDeEMsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQ25DLGFBQWEsQ0FDYixDQUFDO0lBQ0YsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRTNELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNiLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUVyQyxTQUFTLFdBQVcsQ0FBQyxJQUFhLEVBQUUsTUFBYztRQUNqRCxJQUFJLElBQUksQ0FBQyxJQUFJLDZCQUFxQixFQUFFLENBQUM7WUFDcEMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDekMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV2RCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2hDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDL0MsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN6QixXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDekMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFN0csTUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN0RyxHQUFHLElBQUksZ0JBQWdCLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLGlEQUF5QyxFQUFFLENBQUM7WUFDL0QscUJBQXFCO1FBQ3RCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLDZCQUFxQixJQUFJLElBQUksQ0FBQyxJQUFJLGdDQUF3QixFQUFFLENBQUM7WUFDaEYsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQ3BCLG1DQUFtQyxDQUFDLE1BQU0sQ0FBQyxFQUMzQyxtQ0FBbUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUNuRSxDQUFDO1FBQ0gsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksNkJBQXFCLEVBQUUsQ0FBQztZQUMzQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0IsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFOUIsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBRUQsTUFBTSxxQkFBcUI7SUFDMUIsWUFBNkIsS0FBd0I7UUFBeEIsVUFBSyxHQUFMLEtBQUssQ0FBbUI7UUFZckQsaUJBQVksR0FBRztZQUNkLGFBQWEsRUFBRSxDQUFDLFVBQWtCLEVBQW1CLEVBQUU7Z0JBQ3RELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkMsQ0FBQztTQUNELENBQUM7SUFoQnVELENBQUM7SUFFMUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUNELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQzFCLENBQUM7SUFDRCxhQUFhLENBQUMsVUFBa0I7UUFDL0IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUM7SUFDM0QsQ0FBQztDQU9EIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IndentAction } from './languageConfiguration.js';
import { getIndentationAtPosition } from './languageConfigurationRegistry.js';
import { IndentationContextProcessor } from './supports/indentationLineProcessor.js';
export function getEnterAction(autoIndent, model, range, languageConfigurationService) {
    model.tokenization.forceTokenization(range.startLineNumber);
    const languageId = model.getLanguageIdAtPosition(range.startLineNumber, range.startColumn);
    const richEditSupport = languageConfigurationService.getLanguageConfiguration(languageId);
    if (!richEditSupport) {
        return null;
    }
    const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
    const processedContextTokens = indentationContextProcessor.getProcessedTokenContextAroundRange(range);
    const previousLineText = processedContextTokens.previousLineProcessedTokens.getLineContent();
    const beforeEnterText = processedContextTokens.beforeRangeProcessedTokens.getLineContent();
    const afterEnterText = processedContextTokens.afterRangeProcessedTokens.getLineContent();
    const enterResult = richEditSupport.onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText);
    if (!enterResult) {
        return null;
    }
    const indentAction = enterResult.indentAction;
    let appendText = enterResult.appendText;
    const removeText = enterResult.removeText || 0;
    // Here we add `\t` to appendText first because enterAction is leveraging appendText and removeText to change indentation.
    if (!appendText) {
        if ((indentAction === IndentAction.Indent) ||
            (indentAction === IndentAction.IndentOutdent)) {
            appendText = '\t';
        }
        else {
            appendText = '';
        }
    }
    else if (indentAction === IndentAction.Indent) {
        appendText = '\t' + appendText;
    }
    let indentation = getIndentationAtPosition(model, range.startLineNumber, range.startColumn);
    if (removeText) {
        indentation = indentation.substring(0, indentation.length - removeText);
    }
    return {
        indentAction: indentAction,
        appendText: appendText,
        removeText: removeText,
        indentation: indentation
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50ZXJBY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvZW50ZXJBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLFlBQVksRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUUvRSxPQUFPLEVBQUUsd0JBQXdCLEVBQWlDLE1BQU0sb0NBQW9DLENBQUM7QUFDN0csT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckYsTUFBTSxVQUFVLGNBQWMsQ0FDN0IsVUFBb0MsRUFDcEMsS0FBaUIsRUFDakIsS0FBWSxFQUNaLDRCQUEyRDtJQUUzRCxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUM1RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0YsTUFBTSxlQUFlLEdBQUcsNEJBQTRCLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUYsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3RCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUN6RyxNQUFNLHNCQUFzQixHQUFHLDJCQUEyQixDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RHLE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUMsMkJBQTJCLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDN0YsTUFBTSxlQUFlLEdBQUcsc0JBQXNCLENBQUMsMEJBQTBCLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDM0YsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUMseUJBQXlCLENBQUMsY0FBYyxFQUFFLENBQUM7SUFFekYsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzNHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDO0lBQzlDLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxVQUFVLENBQUM7SUFDeEMsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUM7SUFFL0MsMEhBQTBIO0lBQzFILElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixJQUNDLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxNQUFNLENBQUM7WUFDdEMsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLGFBQWEsQ0FBQyxFQUM1QyxDQUFDO1lBQ0YsVUFBVSxHQUFHLElBQUksQ0FBQztRQUNuQixDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDakIsQ0FBQztJQUNGLENBQUM7U0FBTSxJQUFJLFlBQVksS0FBSyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDakQsVUFBVSxHQUFHLElBQUksR0FBRyxVQUFVLENBQUM7SUFDaEMsQ0FBQztJQUVELElBQUksV0FBVyxHQUFHLHdCQUF3QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM1RixJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLFdBQVcsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxPQUFPO1FBQ04sWUFBWSxFQUFFLFlBQVk7UUFDMUIsVUFBVSxFQUFFLFVBQVU7UUFDdEIsVUFBVSxFQUFFLFVBQVU7UUFDdEIsV0FBVyxFQUFFLFdBQVc7S0FDeEIsQ0FBQztBQUNILENBQUMifQ==
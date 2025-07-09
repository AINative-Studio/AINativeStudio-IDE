/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { normalizeIndentation } from '../../../common/core/indentation.js';
import { Selection } from '../../../common/core/selection.js';
import { ProcessedIndentRulesSupport } from '../../../common/languages/supports/indentationLineProcessor.js';
export function getReindentEditOperations(model, languageConfigurationService, startLineNumber, endLineNumber) {
    if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
        // Model is empty
        return [];
    }
    const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).indentRulesSupport;
    if (!indentationRulesSupport) {
        return [];
    }
    const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
    endLineNumber = Math.min(endLineNumber, model.getLineCount());
    // Skip `unIndentedLinePattern` lines
    while (startLineNumber <= endLineNumber) {
        if (!processedIndentRulesSupport.shouldIgnore(startLineNumber)) {
            break;
        }
        startLineNumber++;
    }
    if (startLineNumber > endLineNumber - 1) {
        return [];
    }
    const { tabSize, indentSize, insertSpaces } = model.getOptions();
    const shiftIndent = (indentation, count) => {
        count = count || 1;
        return ShiftCommand.shiftIndent(indentation, indentation.length + count, tabSize, indentSize, insertSpaces);
    };
    const unshiftIndent = (indentation, count) => {
        count = count || 1;
        return ShiftCommand.unshiftIndent(indentation, indentation.length + count, tabSize, indentSize, insertSpaces);
    };
    const indentEdits = [];
    // indentation being passed to lines below
    // Calculate indentation for the first line
    // If there is no passed-in indentation, we use the indentation of the first line as base.
    const currentLineText = model.getLineContent(startLineNumber);
    let globalIndent = strings.getLeadingWhitespace(currentLineText);
    // idealIndentForNextLine doesn't equal globalIndent when there is a line matching `indentNextLinePattern`.
    let idealIndentForNextLine = globalIndent;
    if (processedIndentRulesSupport.shouldIncrease(startLineNumber)) {
        idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
        globalIndent = shiftIndent(globalIndent);
    }
    else if (processedIndentRulesSupport.shouldIndentNextLine(startLineNumber)) {
        idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
    }
    startLineNumber++;
    // Calculate indentation adjustment for all following lines
    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        if (doesLineStartWithString(model, lineNumber)) {
            continue;
        }
        const text = model.getLineContent(lineNumber);
        const oldIndentation = strings.getLeadingWhitespace(text);
        const currentIdealIndent = idealIndentForNextLine;
        if (processedIndentRulesSupport.shouldDecrease(lineNumber, currentIdealIndent)) {
            idealIndentForNextLine = unshiftIndent(idealIndentForNextLine);
            globalIndent = unshiftIndent(globalIndent);
        }
        if (oldIndentation !== idealIndentForNextLine) {
            indentEdits.push(EditOperation.replaceMove(new Selection(lineNumber, 1, lineNumber, oldIndentation.length + 1), normalizeIndentation(idealIndentForNextLine, indentSize, insertSpaces)));
        }
        // calculate idealIndentForNextLine
        if (processedIndentRulesSupport.shouldIgnore(lineNumber)) {
            // In reindent phase, if the line matches `unIndentedLinePattern` we inherit indentation from above lines
            // but don't change globalIndent and idealIndentForNextLine.
            continue;
        }
        else if (processedIndentRulesSupport.shouldIncrease(lineNumber, currentIdealIndent)) {
            globalIndent = shiftIndent(globalIndent);
            idealIndentForNextLine = globalIndent;
        }
        else if (processedIndentRulesSupport.shouldIndentNextLine(lineNumber, currentIdealIndent)) {
            idealIndentForNextLine = shiftIndent(idealIndentForNextLine);
        }
        else {
            idealIndentForNextLine = globalIndent;
        }
    }
    return indentEdits;
}
function doesLineStartWithString(model, lineNumber) {
    if (!model.tokenization.isCheapToTokenize(lineNumber)) {
        return false;
    }
    const lineTokens = model.tokenization.getLineTokens(lineNumber);
    return lineTokens.getStandardTokenType(0) === 2 /* StandardTokenType.String */;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5kZW50YXRpb24vY29tbW9uL2luZGVudGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sdUNBQXVDLENBQUM7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRzlELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRzdHLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxLQUFpQixFQUFFLDRCQUEyRCxFQUFFLGVBQXVCLEVBQUUsYUFBcUI7SUFDdkssSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNuRSxpQkFBaUI7UUFDakIsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsTUFBTSx1QkFBdUIsR0FBRyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQztJQUNoSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM5QixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxNQUFNLDJCQUEyQixHQUFHLElBQUksMkJBQTJCLENBQUMsS0FBSyxFQUFFLHVCQUF1QixFQUFF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
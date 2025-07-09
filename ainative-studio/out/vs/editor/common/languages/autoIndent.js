/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { IndentAction } from './languageConfiguration.js';
import { IndentationContextProcessor, isLanguageDifferentFromLineStart, ProcessedIndentRulesSupport } from './supports/indentationLineProcessor.js';
/**
 * Get nearest preceding line which doesn't match unIndentPattern or contains all whitespace.
 * Result:
 * -1: run into the boundary of embedded languages
 * 0: every line above are invalid
 * else: nearest preceding line of the same language
 */
function getPrecedingValidLine(model, lineNumber, processedIndentRulesSupport) {
    const languageId = model.tokenization.getLanguageIdAtPosition(lineNumber, 0);
    if (lineNumber > 1) {
        let lastLineNumber;
        let resultLineNumber = -1;
        for (lastLineNumber = lineNumber - 1; lastLineNumber >= 1; lastLineNumber--) {
            if (model.tokenization.getLanguageIdAtPosition(lastLineNumber, 0) !== languageId) {
                return resultLineNumber;
            }
            const text = model.getLineContent(lastLineNumber);
            if (processedIndentRulesSupport.shouldIgnore(lastLineNumber) || /^\s+$/.test(text) || text === '') {
                resultLineNumber = lastLineNumber;
                continue;
            }
            return lastLineNumber;
        }
    }
    return -1;
}
/**
 * Get inherited indentation from above lines.
 * 1. Find the nearest preceding line which doesn't match unIndentedLinePattern.
 * 2. If this line matches indentNextLinePattern or increaseIndentPattern, it means that the indent level of `lineNumber` should be 1 greater than this line.
 * 3. If this line doesn't match any indent rules
 *   a. check whether the line above it matches indentNextLinePattern
 *   b. If not, the indent level of this line is the result
 *   c. If so, it means the indent of this line is *temporary*, go upward utill we find a line whose indent is not temporary (the same workflow a -> b -> c).
 * 4. Otherwise, we fail to get an inherited indent from aboves. Return null and we should not touch the indent of `lineNumber`
 *
 * This function only return the inherited indent based on above lines, it doesn't check whether current line should decrease or not.
 */
export function getInheritIndentForLine(autoIndent, model, lineNumber, honorIntentialIndent = true, languageConfigurationService) {
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(model.tokenization.getLanguageId()).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentRulesSupport, languageConfigurationService);
    if (lineNumber <= 1) {
        return {
            indentation: '',
            action: null
        };
    }
    // Use no indent if this is the first non-blank line
    for (let priorLineNumber = lineNumber - 1; priorLineNumber > 0; priorLineNumber--) {
        if (model.getLineContent(priorLineNumber) !== '') {
            break;
        }
        if (priorLineNumber === 1) {
            return {
                indentation: '',
                action: null
            };
        }
    }
    const precedingUnIgnoredLine = getPrecedingValidLine(model, lineNumber, processedIndentRulesSupport);
    if (precedingUnIgnoredLine < 0) {
        return null;
    }
    else if (precedingUnIgnoredLine < 1) {
        return {
            indentation: '',
            action: null
        };
    }
    if (processedIndentRulesSupport.shouldIncrease(precedingUnIgnoredLine) || processedIndentRulesSupport.shouldIndentNextLine(precedingUnIgnoredLine)) {
        const precedingUnIgnoredLineContent = model.getLineContent(precedingUnIgnoredLine);
        return {
            indentation: strings.getLeadingWhitespace(precedingUnIgnoredLineContent),
            action: IndentAction.Indent,
            line: precedingUnIgnoredLine
        };
    }
    else if (processedIndentRulesSupport.shouldDecrease(precedingUnIgnoredLine)) {
        const precedingUnIgnoredLineContent = model.getLineContent(precedingUnIgnoredLine);
        return {
            indentation: strings.getLeadingWhitespace(precedingUnIgnoredLineContent),
            action: null,
            line: precedingUnIgnoredLine
        };
    }
    else {
        // precedingUnIgnoredLine can not be ignored.
        // it doesn't increase indent of following lines
        // it doesn't increase just next line
        // so current line is not affect by precedingUnIgnoredLine
        // and then we should get a correct inheritted indentation from above lines
        if (precedingUnIgnoredLine === 1) {
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(precedingUnIgnoredLine)),
                action: null,
                line: precedingUnIgnoredLine
            };
        }
        const previousLine = precedingUnIgnoredLine - 1;
        const previousLineIndentMetadata = indentRulesSupport.getIndentMetadata(model.getLineContent(previousLine));
        if (!(previousLineIndentMetadata & (1 /* IndentConsts.INCREASE_MASK */ | 2 /* IndentConsts.DECREASE_MASK */)) &&
            (previousLineIndentMetadata & 4 /* IndentConsts.INDENT_NEXTLINE_MASK */)) {
            let stopLine = 0;
            for (let i = previousLine - 1; i > 0; i--) {
                if (processedIndentRulesSupport.shouldIndentNextLine(i)) {
                    continue;
                }
                stopLine = i;
                break;
            }
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(stopLine + 1)),
                action: null,
                line: stopLine + 1
            };
        }
        if (honorIntentialIndent) {
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(precedingUnIgnoredLine)),
                action: null,
                line: precedingUnIgnoredLine
            };
        }
        else {
            // search from precedingUnIgnoredLine until we find one whose indent is not temporary
            for (let i = precedingUnIgnoredLine; i > 0; i--) {
                if (processedIndentRulesSupport.shouldIncrease(i)) {
                    return {
                        indentation: strings.getLeadingWhitespace(model.getLineContent(i)),
                        action: IndentAction.Indent,
                        line: i
                    };
                }
                else if (processedIndentRulesSupport.shouldIndentNextLine(i)) {
                    let stopLine = 0;
                    for (let j = i - 1; j > 0; j--) {
                        if (processedIndentRulesSupport.shouldIndentNextLine(i)) {
                            continue;
                        }
                        stopLine = j;
                        break;
                    }
                    return {
                        indentation: strings.getLeadingWhitespace(model.getLineContent(stopLine + 1)),
                        action: null,
                        line: stopLine + 1
                    };
                }
                else if (processedIndentRulesSupport.shouldDecrease(i)) {
                    return {
                        indentation: strings.getLeadingWhitespace(model.getLineContent(i)),
                        action: null,
                        line: i
                    };
                }
            }
            return {
                indentation: strings.getLeadingWhitespace(model.getLineContent(1)),
                action: null,
                line: 1
            };
        }
    }
}
export function getGoodIndentForLine(autoIndent, virtualModel, languageId, lineNumber, indentConverter, languageConfigurationService) {
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const richEditSupport = languageConfigurationService.getLanguageConfiguration(languageId);
    if (!richEditSupport) {
        return null;
    }
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    const processedIndentRulesSupport = new ProcessedIndentRulesSupport(virtualModel, indentRulesSupport, languageConfigurationService);
    const indent = getInheritIndentForLine(autoIndent, virtualModel, lineNumber, undefined, languageConfigurationService);
    if (indent) {
        const inheritLine = indent.line;
        if (inheritLine !== undefined) {
            // Apply enter action as long as there are only whitespace lines between inherited line and this line.
            let shouldApplyEnterRules = true;
            for (let inBetweenLine = inheritLine; inBetweenLine < lineNumber - 1; inBetweenLine++) {
                if (!/^\s*$/.test(virtualModel.getLineContent(inBetweenLine))) {
                    shouldApplyEnterRules = false;
                    break;
                }
            }
            if (shouldApplyEnterRules) {
                const enterResult = richEditSupport.onEnter(autoIndent, '', virtualModel.getLineContent(inheritLine), '');
                if (enterResult) {
                    let indentation = strings.getLeadingWhitespace(virtualModel.getLineContent(inheritLine));
                    if (enterResult.removeText) {
                        indentation = indentation.substring(0, indentation.length - enterResult.removeText);
                    }
                    if ((enterResult.indentAction === IndentAction.Indent) ||
                        (enterResult.indentAction === IndentAction.IndentOutdent)) {
                        indentation = indentConverter.shiftIndent(indentation);
                    }
                    else if (enterResult.indentAction === IndentAction.Outdent) {
                        indentation = indentConverter.unshiftIndent(indentation);
                    }
                    if (processedIndentRulesSupport.shouldDecrease(lineNumber)) {
                        indentation = indentConverter.unshiftIndent(indentation);
                    }
                    if (enterResult.appendText) {
                        indentation += enterResult.appendText;
                    }
                    return strings.getLeadingWhitespace(indentation);
                }
            }
        }
        if (processedIndentRulesSupport.shouldDecrease(lineNumber)) {
            if (indent.action === IndentAction.Indent) {
                return indent.indentation;
            }
            else {
                return indentConverter.unshiftIndent(indent.indentation);
            }
        }
        else {
            if (indent.action === IndentAction.Indent) {
                return indentConverter.shiftIndent(indent.indentation);
            }
            else {
                return indent.indentation;
            }
        }
    }
    return null;
}
export function getIndentForEnter(autoIndent, model, range, indentConverter, languageConfigurationService) {
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const languageId = model.getLanguageIdAtPosition(range.startLineNumber, range.startColumn);
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    model.tokenization.forceTokenization(range.startLineNumber);
    const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
    const processedContextTokens = indentationContextProcessor.getProcessedTokenContextAroundRange(range);
    const afterEnterProcessedTokens = processedContextTokens.afterRangeProcessedTokens;
    const beforeEnterProcessedTokens = processedContextTokens.beforeRangeProcessedTokens;
    const beforeEnterIndent = strings.getLeadingWhitespace(beforeEnterProcessedTokens.getLineContent());
    const virtualModel = createVirtualModelWithModifiedTokensAtLine(model, range.startLineNumber, beforeEnterProcessedTokens);
    const languageIsDifferentFromLineStart = isLanguageDifferentFromLineStart(model, range.getStartPosition());
    const currentLine = model.getLineContent(range.startLineNumber);
    const currentLineIndent = strings.getLeadingWhitespace(currentLine);
    const afterEnterAction = getInheritIndentForLine(autoIndent, virtualModel, range.startLineNumber + 1, undefined, languageConfigurationService);
    if (!afterEnterAction) {
        const beforeEnter = languageIsDifferentFromLineStart ? currentLineIndent : beforeEnterIndent;
        return {
            beforeEnter: beforeEnter,
            afterEnter: beforeEnter
        };
    }
    let afterEnterIndent = languageIsDifferentFromLineStart ? currentLineIndent : afterEnterAction.indentation;
    if (afterEnterAction.action === IndentAction.Indent) {
        afterEnterIndent = indentConverter.shiftIndent(afterEnterIndent);
    }
    if (indentRulesSupport.shouldDecrease(afterEnterProcessedTokens.getLineContent())) {
        afterEnterIndent = indentConverter.unshiftIndent(afterEnterIndent);
    }
    return {
        beforeEnter: languageIsDifferentFromLineStart ? currentLineIndent : beforeEnterIndent,
        afterEnter: afterEnterIndent
    };
}
/**
 * We should always allow intentional indentation. It means, if users change the indentation of `lineNumber` and the content of
 * this line doesn't match decreaseIndentPattern, we should not adjust the indentation.
 */
export function getIndentActionForType(cursorConfig, model, range, ch, indentConverter, languageConfigurationService) {
    const autoIndent = cursorConfig.autoIndent;
    if (autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
        return null;
    }
    const languageIsDifferentFromLineStart = isLanguageDifferentFromLineStart(model, range.getStartPosition());
    if (languageIsDifferentFromLineStart) {
        // this line has mixed languages and indentation rules will not work
        return null;
    }
    const languageId = model.getLanguageIdAtPosition(range.startLineNumber, range.startColumn);
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
    const processedContextTokens = indentationContextProcessor.getProcessedTokenContextAroundRange(range);
    const beforeRangeText = processedContextTokens.beforeRangeProcessedTokens.getLineContent();
    const afterRangeText = processedContextTokens.afterRangeProcessedTokens.getLineContent();
    const textAroundRange = beforeRangeText + afterRangeText;
    const textAroundRangeWithCharacter = beforeRangeText + ch + afterRangeText;
    // If previous content already matches decreaseIndentPattern, it means indentation of this line should already be adjusted
    // Users might change the indentation by purpose and we should honor that instead of readjusting.
    if (!indentRulesSupport.shouldDecrease(textAroundRange) && indentRulesSupport.shouldDecrease(textAroundRangeWithCharacter)) {
        // after typing `ch`, the content matches decreaseIndentPattern, we should adjust the indent to a good manner.
        // 1. Get inherited indent action
        const r = getInheritIndentForLine(autoIndent, model, range.startLineNumber, false, languageConfigurationService);
        if (!r) {
            return null;
        }
        let indentation = r.indentation;
        if (r.action !== IndentAction.Indent) {
            indentation = indentConverter.unshiftIndent(indentation);
        }
        return indentation;
    }
    const previousLineNumber = range.startLineNumber - 1;
    if (previousLineNumber > 0) {
        const previousLine = model.getLineContent(previousLineNumber);
        if (indentRulesSupport.shouldIndentNextLine(previousLine) && indentRulesSupport.shouldIncrease(textAroundRangeWithCharacter)) {
            const inheritedIndentationData = getInheritIndentForLine(autoIndent, model, range.startLineNumber, false, languageConfigurationService);
            const inheritedIndentation = inheritedIndentationData?.indentation;
            if (inheritedIndentation !== undefined) {
                const currentLine = model.getLineContent(range.startLineNumber);
                const actualCurrentIndentation = strings.getLeadingWhitespace(currentLine);
                const inferredCurrentIndentation = indentConverter.shiftIndent(inheritedIndentation);
                // If the inferred current indentation is not equal to the actual current indentation, then the indentation has been intentionally changed, in that case keep it
                const inferredIndentationEqualsActual = inferredCurrentIndentation === actualCurrentIndentation;
                const textAroundRangeContainsOnlyWhitespace = /^\s*$/.test(textAroundRange);
                const autoClosingPairs = cursorConfig.autoClosingPairs.autoClosingPairsOpenByEnd.get(ch);
                const autoClosingPairExists = autoClosingPairs && autoClosingPairs.length > 0;
                const isChFirstNonWhitespaceCharacterAndInAutoClosingPair = autoClosingPairExists && textAroundRangeContainsOnlyWhitespace;
                if (inferredIndentationEqualsActual && isChFirstNonWhitespaceCharacterAndInAutoClosingPair) {
                    return inheritedIndentation;
                }
            }
        }
    }
    return null;
}
export function getIndentMetadata(model, lineNumber, languageConfigurationService) {
    const indentRulesSupport = languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).indentRulesSupport;
    if (!indentRulesSupport) {
        return null;
    }
    if (lineNumber < 1 || lineNumber > model.getLineCount()) {
        return null;
    }
    return indentRulesSupport.getIndentMetadata(model.getLineContent(lineNumber));
}
function createVirtualModelWithModifiedTokensAtLine(model, modifiedLineNumber, modifiedTokens) {
    const virtualModel = {
        tokenization: {
            getLineTokens: (lineNumber) => {
                if (lineNumber === modifiedLineNumber) {
                    return modifiedTokens;
                }
                else {
                    return model.tokenization.getLineTokens(lineNumber);
                }
            },
            getLanguageId: () => {
                return model.getLanguageId();
            },
            getLanguageIdAtPosition: (lineNumber, column) => {
                return model.getLanguageIdAtPosition(lineNumber, column);
            },
        },
        getLineContent: (lineNumber) => {
            if (lineNumber === modifiedLineNumber) {
                return modifiedTokens.getLineContent();
            }
            else {
                return model.getLineContent(lineNumber);
            }
        }
    };
    return virtualModel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0luZGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9hdXRvSW5kZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFHM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBSzFELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxnQ0FBZ0MsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBbUJwSjs7Ozs7O0dBTUc7QUFDSCxTQUFTLHFCQUFxQixDQUFDLEtBQW9CLEVBQUUsVUFBa0IsRUFBRSwyQkFBd0Q7SUFDaEksTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0UsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDcEIsSUFBSSxjQUFzQixDQUFDO1FBQzNCLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFMUIsS0FBSyxjQUFjLEdBQUcsVUFBVSxHQUFHLENBQUMsRUFBRSxjQUFjLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxFQUFFLENBQUM7WUFDN0UsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDbEYsT0FBTyxnQkFBZ0IsQ0FBQztZQUN6QixDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNsRCxJQUFJLDJCQUEyQixDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDbkcsZ0JBQWdCLEdBQUcsY0FBYyxDQUFDO2dCQUNsQyxTQUFTO1lBQ1YsQ0FBQztZQUVELE9BQU8sY0FBYyxDQUFDO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsVUFBb0MsRUFDcEMsS0FBb0IsRUFDcEIsVUFBa0IsRUFDbEIsdUJBQWdDLElBQUksRUFDcEMsNEJBQTJEO0lBRTNELElBQUksVUFBVSx3Q0FBZ0MsRUFBRSxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sa0JBQWtCLEdBQUcsNEJBQTRCLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0lBQ3hJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUU3SCxJQUFJLFVBQVUsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNyQixPQUFPO1lBQ04sV0FBVyxFQUFFLEVBQUU7WUFDZixNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUM7SUFDSCxDQUFDO0lBRUQsb0RBQW9EO0lBQ3BELEtBQUssSUFBSSxlQUFlLEdBQUcsVUFBVSxHQUFHLENBQUMsRUFBRSxlQUFlLEdBQUcsQ0FBQyxFQUFFLGVBQWUsRUFBRSxFQUFFLENBQUM7UUFDbkYsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ2xELE1BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTztnQkFDTixXQUFXLEVBQUUsRUFBRTtnQkFDZixNQUFNLEVBQUUsSUFBSTthQUNaLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sc0JBQXNCLEdBQUcscUJBQXFCLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0lBQ3JHLElBQUksc0JBQXNCLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDaEMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO1NBQU0sSUFBSSxzQkFBc0IsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxPQUFPO1lBQ04sV0FBVyxFQUFFLEVBQUU7WUFDZixNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSwyQkFBMkIsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7UUFDcEosTUFBTSw2QkFBNkIsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbkYsT0FBTztZQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsNkJBQTZCLENBQUM7WUFDeEUsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO1lBQzNCLElBQUksRUFBRSxzQkFBc0I7U0FDNUIsQ0FBQztJQUNILENBQUM7U0FBTSxJQUFJLDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7UUFDL0UsTUFBTSw2QkFBNkIsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbkYsT0FBTztZQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsNkJBQTZCLENBQUM7WUFDeEUsTUFBTSxFQUFFLElBQUk7WUFDWixJQUFJLEVBQUUsc0JBQXNCO1NBQzVCLENBQUM7SUFDSCxDQUFDO1NBQU0sQ0FBQztRQUNQLDZDQUE2QztRQUM3QyxnREFBZ0Q7UUFDaEQscUNBQXFDO1FBQ3JDLDBEQUEwRDtRQUMxRCwyRUFBMkU7UUFDM0UsSUFBSSxzQkFBc0IsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPO2dCQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUN2RixNQUFNLEVBQUUsSUFBSTtnQkFDWixJQUFJLEVBQUUsc0JBQXNCO2FBQzVCLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDO1FBRWhELE1BQU0sMEJBQTBCLEdBQUcsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzVHLElBQUksQ0FBQyxDQUFDLDBCQUEwQixHQUFHLENBQUMsdUVBQXVELENBQUMsQ0FBQztZQUM1RixDQUFDLDBCQUEwQiw0Q0FBb0MsQ0FBQyxFQUFFLENBQUM7WUFDbkUsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNDLElBQUksMkJBQTJCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDekQsU0FBUztnQkFDVixDQUFDO2dCQUNELFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBQ2IsTUFBTTtZQUNQLENBQUM7WUFFRCxPQUFPO2dCQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzdFLE1BQU0sRUFBRSxJQUFJO2dCQUNaLElBQUksRUFBRSxRQUFRLEdBQUcsQ0FBQzthQUNsQixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixPQUFPO2dCQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUN2RixNQUFNLEVBQUUsSUFBSTtnQkFDWixJQUFJLEVBQUUsc0JBQXNCO2FBQzVCLENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLHFGQUFxRjtZQUNyRixLQUFLLElBQUksQ0FBQyxHQUFHLHNCQUFzQixFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakQsSUFBSSwyQkFBMkIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbkQsT0FBTzt3QkFDTixXQUFXLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xFLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTTt3QkFDM0IsSUFBSSxFQUFFLENBQUM7cUJBQ1AsQ0FBQztnQkFDSCxDQUFDO3FCQUFNLElBQUksMkJBQTJCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDaEUsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO29CQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUNoQyxJQUFJLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7NEJBQ3pELFNBQVM7d0JBQ1YsQ0FBQzt3QkFDRCxRQUFRLEdBQUcsQ0FBQyxDQUFDO3dCQUNiLE1BQU07b0JBQ1AsQ0FBQztvQkFFRCxPQUFPO3dCQUNOLFdBQVcsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQzdFLE1BQU0sRUFBRSxJQUFJO3dCQUNaLElBQUksRUFBRSxRQUFRLEdBQUcsQ0FBQztxQkFDbEIsQ0FBQztnQkFDSCxDQUFDO3FCQUFNLElBQUksMkJBQTJCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzFELE9BQU87d0JBQ04sV0FBVyxFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNsRSxNQUFNLEVBQUUsSUFBSTt3QkFDWixJQUFJLEVBQUUsQ0FBQztxQkFDUCxDQUFDO2dCQUNILENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTztnQkFDTixXQUFXLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xFLE1BQU0sRUFBRSxJQUFJO2dCQUNaLElBQUksRUFBRSxDQUFDO2FBQ1AsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsVUFBb0MsRUFDcEMsWUFBMkIsRUFDM0IsVUFBa0IsRUFDbEIsVUFBa0IsRUFDbEIsZUFBaUMsRUFDakMsNEJBQTJEO0lBRTNELElBQUksVUFBVSx3Q0FBZ0MsRUFBRSxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sZUFBZSxHQUFHLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN0QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxNQUFNLGtCQUFrQixHQUFHLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0lBQ2hILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUNwSSxNQUFNLE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUV0SCxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1osTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNoQyxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMvQixzR0FBc0c7WUFDdEcsSUFBSSxxQkFBcUIsR0FBRyxJQUFJLENBQUM7WUFDakMsS0FBSyxJQUFJLGFBQWEsR0FBRyxXQUFXLEVBQUUsYUFBYSxHQUFHLFVBQVUsR0FBRyxDQUFDLEVBQUUsYUFBYSxFQUFFLEVBQUUsQ0FBQztnQkFDdkYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQy9ELHFCQUFxQixHQUFHLEtBQUssQ0FBQztvQkFDOUIsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUkscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBRTFHLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBRXpGLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUM1QixXQUFXLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3JGLENBQUM7b0JBRUQsSUFDQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLE1BQU0sQ0FBQzt3QkFDbEQsQ0FBQyxXQUFXLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxhQUFhLENBQUMsRUFDeEQsQ0FBQzt3QkFDRixXQUFXLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDeEQsQ0FBQzt5QkFBTSxJQUFJLFdBQVcsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUM5RCxXQUFXLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDMUQsQ0FBQztvQkFFRCxJQUFJLDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO3dCQUM1RCxXQUFXLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDMUQsQ0FBQztvQkFFRCxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDNUIsV0FBVyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUM7b0JBQ3ZDLENBQUM7b0JBRUQsT0FBTyxPQUFPLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ2xELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksMkJBQTJCLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDM0MsT0FBTyxNQUFNLENBQUMsV0FBVyxDQUFDO1lBQzNCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLGVBQWUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNDLE9BQU8sZUFBZSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDeEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQztZQUMzQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLFVBQW9DLEVBQ3BDLEtBQWlCLEVBQ2pCLEtBQVksRUFDWixlQUFpQyxFQUNqQyw0QkFBMkQ7SUFFM0QsSUFBSSxVQUFVLHdDQUFnQyxFQUFFLENBQUM7UUFDaEQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzNGLE1BQU0sa0JBQWtCLEdBQUcsNEJBQTRCLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQUM7SUFDaEgsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDNUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLDJCQUEyQixDQUFDLEtBQUssRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO0lBQ3pHLE1BQU0sc0JBQXNCLEdBQUcsMkJBQTJCLENBQUMsbUNBQW1DLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEcsTUFBTSx5QkFBeUIsR0FBRyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQztJQUNuRixNQUFNLDBCQUEwQixHQUFHLHNCQUFzQixDQUFDLDBCQUEwQixDQUFDO0lBQ3JGLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFFcEcsTUFBTSxZQUFZLEdBQUcsMENBQTBDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztJQUMxSCxNQUFNLGdDQUFnQyxHQUFHLGdDQUFnQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQzNHLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2hFLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sZ0JBQWdCLEdBQUcsdUJBQXVCLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxTQUFTLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUMvSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN2QixNQUFNLFdBQVcsR0FBRyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1FBQzdGLE9BQU87WUFDTixXQUFXLEVBQUUsV0FBVztZQUN4QixVQUFVLEVBQUUsV0FBVztTQUN2QixDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksZ0JBQWdCLEdBQUcsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUM7SUFFM0csSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JELGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ25GLGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsT0FBTztRQUNOLFdBQVcsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtRQUNyRixVQUFVLEVBQUUsZ0JBQWdCO0tBQzVCLENBQUM7QUFDSCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxZQUFpQyxFQUNqQyxLQUFpQixFQUNqQixLQUFZLEVBQ1osRUFBVSxFQUNWLGVBQWlDLEVBQ2pDLDRCQUEyRDtJQUUzRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDO0lBQzNDLElBQUksVUFBVSx3Q0FBZ0MsRUFBRSxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELE1BQU0sZ0NBQWdDLEdBQUcsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7SUFDM0csSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDO1FBQ3RDLG9FQUFvRTtRQUNwRSxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0YsTUFBTSxrQkFBa0IsR0FBRyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQztJQUNoSCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUN6QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxNQUFNLDJCQUEyQixHQUFHLElBQUksMkJBQTJCLENBQUMsS0FBSyxFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFDekcsTUFBTSxzQkFBc0IsR0FBRywyQkFBMkIsQ0FBQyxtQ0FBbUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0RyxNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUMzRixNQUFNLGNBQWMsR0FBRyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN6RixNQUFNLGVBQWUsR0FBRyxlQUFlLEdBQUcsY0FBYyxDQUFDO0lBQ3pELE1BQU0sNEJBQTRCLEdBQUcsZUFBZSxHQUFHLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFFM0UsMEhBQTBIO0lBQzFILGlHQUFpRztJQUNqRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLENBQUM7UUFDNUgsOEdBQThHO1FBQzlHLGlDQUFpQztRQUNqQyxNQUFNLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDakgsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztRQUNoQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RDLFdBQVcsR0FBRyxlQUFlLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRUQsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztJQUNyRCxJQUFJLGtCQUFrQixHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzVCLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUM5RCxJQUFJLGtCQUFrQixDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLENBQUM7WUFDOUgsTUFBTSx3QkFBd0IsR0FBRyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLDRCQUE0QixDQUFDLENBQUM7WUFDeEksTUFBTSxvQkFBb0IsR0FBRyx3QkFBd0IsRUFBRSxXQUFXLENBQUM7WUFDbkUsSUFBSSxvQkFBb0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ2hFLE1BQU0sd0JBQXdCLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUMzRSxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQztnQkFDckYsZ0tBQWdLO2dCQUNoSyxNQUFNLCtCQUErQixHQUFHLDBCQUEwQixLQUFLLHdCQUF3QixDQUFDO2dCQUNoRyxNQUFNLHFDQUFxQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzVFLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekYsTUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUM5RSxNQUFNLG1EQUFtRCxHQUFHLHFCQUFxQixJQUFJLHFDQUFxQyxDQUFDO2dCQUMzSCxJQUFJLCtCQUErQixJQUFJLG1EQUFtRCxFQUFFLENBQUM7b0JBQzVGLE9BQU8sb0JBQW9CLENBQUM7Z0JBQzdCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLEtBQWlCLEVBQ2pCLFVBQWtCLEVBQ2xCLDRCQUEyRDtJQUUzRCxNQUFNLGtCQUFrQixHQUFHLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0lBQzNILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7UUFDekQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsT0FBTyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUVELFNBQVMsMENBQTBDLENBQUMsS0FBaUIsRUFBRSxrQkFBMEIsRUFBRSxjQUErQjtJQUNqSSxNQUFNLFlBQVksR0FBa0I7UUFDbkMsWUFBWSxFQUFFO1lBQ2IsYUFBYSxFQUFFLENBQUMsVUFBa0IsRUFBbUIsRUFBRTtnQkFDdEQsSUFBSSxVQUFVLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztvQkFDdkMsT0FBTyxjQUFjLENBQUM7Z0JBQ3ZCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLEtBQUssQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNyRCxDQUFDO1lBQ0YsQ0FBQztZQUNELGFBQWEsRUFBRSxHQUFXLEVBQUU7Z0JBQzNCLE9BQU8sS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzlCLENBQUM7WUFDRCx1QkFBdUIsRUFBRSxDQUFDLFVBQWtCLEVBQUUsTUFBYyxFQUFVLEVBQUU7Z0JBQ3ZFLE9BQU8sS0FBSyxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxRCxDQUFDO1NBQ0Q7UUFDRCxjQUFjLEVBQUUsQ0FBQyxVQUFrQixFQUFVLEVBQUU7WUFDOUMsSUFBSSxVQUFVLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN6QyxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQUM7SUFDRixPQUFPLFlBQVksQ0FBQztBQUNyQixDQUFDIn0=
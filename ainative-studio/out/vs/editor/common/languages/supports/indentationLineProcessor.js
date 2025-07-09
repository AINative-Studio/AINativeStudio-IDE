/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { createScopedLineTokens } from '../supports.js';
import { LineTokens } from '../../tokens/lineTokens.js';
/**
 * This class is a wrapper class around {@link IndentRulesSupport}.
 * It processes the lines by removing the language configuration brackets from the regex, string and comment tokens.
 * It then calls into the {@link IndentRulesSupport} to validate the indentation conditions.
 */
export class ProcessedIndentRulesSupport {
    constructor(model, indentRulesSupport, languageConfigurationService) {
        this._indentRulesSupport = indentRulesSupport;
        this._indentationLineProcessor = new IndentationLineProcessor(model, languageConfigurationService);
    }
    /**
     * Apply the new indentation and return whether the indentation level should be increased after the given line number
     */
    shouldIncrease(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldIncrease(processedLine);
    }
    /**
     * Apply the new indentation and return whether the indentation level should be decreased after the given line number
     */
    shouldDecrease(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldDecrease(processedLine);
    }
    /**
     * Apply the new indentation and return whether the indentation level should remain unchanged at the given line number
     */
    shouldIgnore(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldIgnore(processedLine);
    }
    /**
     * Apply the new indentation and return whether the indentation level should increase on the line after the given line number
     */
    shouldIndentNextLine(lineNumber, newIndentation) {
        const processedLine = this._indentationLineProcessor.getProcessedLine(lineNumber, newIndentation);
        return this._indentRulesSupport.shouldIndentNextLine(processedLine);
    }
}
/**
 * This class fetches the processed text around a range which can be used for indentation evaluation.
 * It returns:
 * - The processed text before the given range and on the same start line
 * - The processed text after the given range and on the same end line
 * - The processed text on the previous line
 */
export class IndentationContextProcessor {
    constructor(model, languageConfigurationService) {
        this.model = model;
        this.indentationLineProcessor = new IndentationLineProcessor(model, languageConfigurationService);
    }
    /**
     * Returns the processed text, stripped from the language configuration brackets within the string, comment and regex tokens, around the given range
     */
    getProcessedTokenContextAroundRange(range) {
        const beforeRangeProcessedTokens = this._getProcessedTokensBeforeRange(range);
        const afterRangeProcessedTokens = this._getProcessedTokensAfterRange(range);
        const previousLineProcessedTokens = this._getProcessedPreviousLineTokens(range);
        return { beforeRangeProcessedTokens, afterRangeProcessedTokens, previousLineProcessedTokens };
    }
    _getProcessedTokensBeforeRange(range) {
        this.model.tokenization.forceTokenization(range.startLineNumber);
        const lineTokens = this.model.tokenization.getLineTokens(range.startLineNumber);
        const scopedLineTokens = createScopedLineTokens(lineTokens, range.startColumn - 1);
        let slicedTokens;
        if (isLanguageDifferentFromLineStart(this.model, range.getStartPosition())) {
            const columnIndexWithinScope = (range.startColumn - 1) - scopedLineTokens.firstCharOffset;
            const firstCharacterOffset = scopedLineTokens.firstCharOffset;
            const lastCharacterOffset = firstCharacterOffset + columnIndexWithinScope;
            slicedTokens = lineTokens.sliceAndInflate(firstCharacterOffset, lastCharacterOffset, 0);
        }
        else {
            const columnWithinLine = range.startColumn - 1;
            slicedTokens = lineTokens.sliceAndInflate(0, columnWithinLine, 0);
        }
        const processedTokens = this.indentationLineProcessor.getProcessedTokens(slicedTokens);
        return processedTokens;
    }
    _getProcessedTokensAfterRange(range) {
        const position = range.isEmpty() ? range.getStartPosition() : range.getEndPosition();
        this.model.tokenization.forceTokenization(position.lineNumber);
        const lineTokens = this.model.tokenization.getLineTokens(position.lineNumber);
        const scopedLineTokens = createScopedLineTokens(lineTokens, position.column - 1);
        const columnIndexWithinScope = position.column - 1 - scopedLineTokens.firstCharOffset;
        const firstCharacterOffset = scopedLineTokens.firstCharOffset + columnIndexWithinScope;
        const lastCharacterOffset = scopedLineTokens.firstCharOffset + scopedLineTokens.getLineLength();
        const slicedTokens = lineTokens.sliceAndInflate(firstCharacterOffset, lastCharacterOffset, 0);
        const processedTokens = this.indentationLineProcessor.getProcessedTokens(slicedTokens);
        return processedTokens;
    }
    _getProcessedPreviousLineTokens(range) {
        const getScopedLineTokensAtEndColumnOfLine = (lineNumber) => {
            this.model.tokenization.forceTokenization(lineNumber);
            const lineTokens = this.model.tokenization.getLineTokens(lineNumber);
            const endColumnOfLine = this.model.getLineMaxColumn(lineNumber) - 1;
            const scopedLineTokensAtEndColumn = createScopedLineTokens(lineTokens, endColumnOfLine);
            return scopedLineTokensAtEndColumn;
        };
        this.model.tokenization.forceTokenization(range.startLineNumber);
        const lineTokens = this.model.tokenization.getLineTokens(range.startLineNumber);
        const scopedLineTokens = createScopedLineTokens(lineTokens, range.startColumn - 1);
        const emptyTokens = LineTokens.createEmpty('', scopedLineTokens.languageIdCodec);
        const previousLineNumber = range.startLineNumber - 1;
        const isFirstLine = previousLineNumber === 0;
        if (isFirstLine) {
            return emptyTokens;
        }
        const canScopeExtendOnPreviousLine = scopedLineTokens.firstCharOffset === 0;
        if (!canScopeExtendOnPreviousLine) {
            return emptyTokens;
        }
        const scopedLineTokensAtEndColumnOfPreviousLine = getScopedLineTokensAtEndColumnOfLine(previousLineNumber);
        const doesLanguageContinueOnPreviousLine = scopedLineTokens.languageId === scopedLineTokensAtEndColumnOfPreviousLine.languageId;
        if (!doesLanguageContinueOnPreviousLine) {
            return emptyTokens;
        }
        const previousSlicedLineTokens = scopedLineTokensAtEndColumnOfPreviousLine.toIViewLineTokens();
        const processedTokens = this.indentationLineProcessor.getProcessedTokens(previousSlicedLineTokens);
        return processedTokens;
    }
}
/**
 * This class performs the actual processing of the indentation lines.
 * The brackets of the language configuration are removed from the regex, string and comment tokens.
 */
class IndentationLineProcessor {
    constructor(model, languageConfigurationService) {
        this.model = model;
        this.languageConfigurationService = languageConfigurationService;
    }
    /**
     * Get the processed line for the given line number and potentially adjust the indentation level.
     * Remove the language configuration brackets from the regex, string and comment tokens.
     */
    getProcessedLine(lineNumber, newIndentation) {
        const replaceIndentation = (line, newIndentation) => {
            const currentIndentation = strings.getLeadingWhitespace(line);
            const adjustedLine = newIndentation + line.substring(currentIndentation.length);
            return adjustedLine;
        };
        this.model.tokenization.forceTokenization?.(lineNumber);
        const tokens = this.model.tokenization.getLineTokens(lineNumber);
        let processedLine = this.getProcessedTokens(tokens).getLineContent();
        if (newIndentation !== undefined) {
            processedLine = replaceIndentation(processedLine, newIndentation);
        }
        return processedLine;
    }
    /**
     * Process the line with the given tokens, remove the language configuration brackets from the regex, string and comment tokens.
     */
    getProcessedTokens(tokens) {
        const shouldRemoveBracketsFromTokenType = (tokenType) => {
            return tokenType === 2 /* StandardTokenType.String */
                || tokenType === 3 /* StandardTokenType.RegEx */
                || tokenType === 1 /* StandardTokenType.Comment */;
        };
        const languageId = tokens.getLanguageId(0);
        const bracketsConfiguration = this.languageConfigurationService.getLanguageConfiguration(languageId).bracketsNew;
        const bracketsRegExp = bracketsConfiguration.getBracketRegExp({ global: true });
        const textAndMetadata = [];
        tokens.forEach((tokenIndex) => {
            const tokenType = tokens.getStandardTokenType(tokenIndex);
            let text = tokens.getTokenText(tokenIndex);
            if (shouldRemoveBracketsFromTokenType(tokenType)) {
                text = text.replace(bracketsRegExp, '');
            }
            const metadata = tokens.getMetadata(tokenIndex);
            textAndMetadata.push({ text, metadata });
        });
        const processedLineTokens = LineTokens.createFromTextAndMetadata(textAndMetadata, tokens.languageIdCodec);
        return processedLineTokens;
    }
}
export function isLanguageDifferentFromLineStart(model, position) {
    model.tokenization.forceTokenization(position.lineNumber);
    const lineTokens = model.tokenization.getLineTokens(position.lineNumber);
    const scopedLineTokens = createScopedLineTokens(lineTokens, position.column - 1);
    const doesScopeStartAtOffsetZero = scopedLineTokens.firstCharOffset === 0;
    const isScopedLanguageEqualToFirstLanguageOnLine = lineTokens.getLanguageId(0) === scopedLineTokens.languageId;
    const languageIsDifferentFromLineStart = !doesScopeStartAtOffsetZero && !isScopedLanguageEqualToFirstLanguageOnLine;
    return languageIsDifferentFromLineStart;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25MaW5lUHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL3N1cHBvcnRzL2luZGVudGF0aW9uTGluZVByb2Nlc3Nvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBSTlELE9BQU8sRUFBRSxzQkFBc0IsRUFBb0IsTUFBTSxnQkFBZ0IsQ0FBQztBQUUxRSxPQUFPLEVBQW1CLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBS3pFOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sMkJBQTJCO0lBS3ZDLFlBQ0MsS0FBb0IsRUFDcEIsa0JBQXNDLEVBQ3RDLDRCQUEyRDtRQUUzRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUM7UUFDOUMsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksd0JBQXdCLENBQUMsS0FBSyxFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFDcEcsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLFVBQWtCLEVBQUUsY0FBdUI7UUFDaEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNsRyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLFVBQWtCLEVBQUUsY0FBdUI7UUFDaEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNsRyxPQUFP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
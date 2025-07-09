/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import * as strings from '../../../base/common/strings.js';
import { ReplaceCommand, ReplaceCommandWithOffsetCursorState, ReplaceCommandWithoutChangingPosition, ReplaceCommandThatPreservesSelection, ReplaceOvertypeCommand, ReplaceOvertypeCommandOnCompositionEnd } from '../commands/replaceCommand.js';
import { ShiftCommand } from '../commands/shiftCommand.js';
import { SurroundSelectionCommand } from '../commands/surroundSelectionCommand.js';
import { EditOperationResult, isQuote } from '../cursorCommon.js';
import { getMapForWordSeparators } from '../core/wordCharacterClassifier.js';
import { Range } from '../core/range.js';
import { Position } from '../core/position.js';
import { IndentAction } from '../languages/languageConfiguration.js';
import { getIndentationAtPosition } from '../languages/languageConfigurationRegistry.js';
import { createScopedLineTokens } from '../languages/supports.js';
import { getIndentActionForType, getIndentForEnter, getInheritIndentForLine } from '../languages/autoIndent.js';
import { getEnterAction } from '../languages/enterAction.js';
export class AutoIndentOperation {
    static getEdits(config, model, selections, ch, isDoingComposition) {
        if (!isDoingComposition && this._isAutoIndentType(config, model, selections)) {
            const indentationForSelections = [];
            for (const selection of selections) {
                const indentation = this._findActualIndentationForSelection(config, model, selection, ch);
                if (indentation === null) {
                    // Auto indentation failed
                    return;
                }
                indentationForSelections.push({ selection, indentation });
            }
            const autoClosingPairClose = AutoClosingOpenCharTypeOperation.getAutoClosingPairClose(config, model, selections, ch, false);
            return this._getIndentationAndAutoClosingPairEdits(config, model, indentationForSelections, ch, autoClosingPairClose);
        }
        return;
    }
    static _isAutoIndentType(config, model, selections) {
        if (config.autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
            return false;
        }
        for (let i = 0, len = selections.length; i < len; i++) {
            if (!model.tokenization.isCheapToTokenize(selections[i].getEndPosition().lineNumber)) {
                return false;
            }
        }
        return true;
    }
    static _findActualIndentationForSelection(config, model, selection, ch) {
        const actualIndentation = getIndentActionForType(config, model, selection, ch, {
            shiftIndent: (indentation) => {
                return shiftIndent(config, indentation);
            },
            unshiftIndent: (indentation) => {
                return unshiftIndent(config, indentation);
            },
        }, config.languageConfigurationService);
        if (actualIndentation === null) {
            return null;
        }
        const currentIndentation = getIndentationAtPosition(model, selection.startLineNumber, selection.startColumn);
        if (actualIndentation === config.normalizeIndentation(currentIndentation)) {
            return null;
        }
        return actualIndentation;
    }
    static _getIndentationAndAutoClosingPairEdits(config, model, indentationForSelections, ch, autoClosingPairClose) {
        const commands = indentationForSelections.map(({ selection, indentation }) => {
            if (autoClosingPairClose !== null) {
                // Apply both auto closing pair edits and auto indentation edits
                const indentationEdit = this._getEditFromIndentationAndSelection(config, model, indentation, selection, ch, false);
                return new TypeWithIndentationAndAutoClosingCommand(indentationEdit, selection, ch, autoClosingPairClose);
            }
            else {
                // Apply only auto indentation edits
                const indentationEdit = this._getEditFromIndentationAndSelection(config, model, indentation, selection, ch, true);
                return typeCommand(indentationEdit.range, indentationEdit.text, false);
            }
        });
        const editOptions = { shouldPushStackElementBefore: true, shouldPushStackElementAfter: false };
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, editOptions);
    }
    static _getEditFromIndentationAndSelection(config, model, indentation, selection, ch, includeChInEdit = true) {
        const startLineNumber = selection.startLineNumber;
        const firstNonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(startLineNumber);
        let text = config.normalizeIndentation(indentation);
        if (firstNonWhitespaceColumn !== 0) {
            const startLine = model.getLineContent(startLineNumber);
            text += startLine.substring(firstNonWhitespaceColumn - 1, selection.startColumn - 1);
        }
        text += includeChInEdit ? ch : '';
        const range = new Range(startLineNumber, 1, selection.endLineNumber, selection.endColumn);
        return { range, text };
    }
}
export class AutoClosingOvertypeOperation {
    static getEdits(prevEditOperationType, config, model, selections, autoClosedCharacters, ch) {
        if (isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch)) {
            return this._runAutoClosingOvertype(prevEditOperationType, selections, ch);
        }
        return;
    }
    static _runAutoClosingOvertype(prevEditOperationType, selections, ch) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const position = selection.getPosition();
            const typeSelection = new Range(position.lineNumber, position.column, position.lineNumber, position.column + 1);
            commands[i] = new ReplaceCommand(typeSelection, ch);
        }
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, 4 /* EditOperationType.TypingOther */),
            shouldPushStackElementAfter: false
        });
    }
}
export class AutoClosingOvertypeWithInterceptorsOperation {
    static getEdits(config, model, selections, autoClosedCharacters, ch) {
        if (isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch)) {
            // Unfortunately, the close character is at this point "doubled", so we need to delete it...
            const commands = selections.map(s => new ReplaceCommand(new Range(s.positionLineNumber, s.positionColumn, s.positionLineNumber, s.positionColumn + 1), '', false));
            return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
                shouldPushStackElementBefore: true,
                shouldPushStackElementAfter: false
            });
        }
        return;
    }
}
export class AutoClosingOpenCharTypeOperation {
    static getEdits(config, model, selections, ch, chIsAlreadyTyped, isDoingComposition) {
        if (!isDoingComposition) {
            const autoClosingPairClose = this.getAutoClosingPairClose(config, model, selections, ch, chIsAlreadyTyped);
            if (autoClosingPairClose !== null) {
                return this._runAutoClosingOpenCharType(selections, ch, chIsAlreadyTyped, autoClosingPairClose);
            }
        }
        return;
    }
    static _runAutoClosingOpenCharType(selections, ch, chIsAlreadyTyped, autoClosingPairClose) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            commands[i] = new TypeWithAutoClosingCommand(selection, ch, !chIsAlreadyTyped, autoClosingPairClose);
        }
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: false
        });
    }
    static getAutoClosingPairClose(config, model, selections, ch, chIsAlreadyTyped) {
        for (const selection of selections) {
            if (!selection.isEmpty()) {
                return null;
            }
        }
        // This method is called both when typing (regularly) and when composition ends
        // This means that we need to work with a text buffer where sometimes `ch` is not
        // there (it is being typed right now) or with a text buffer where `ch` has already been typed
        //
        // In order to avoid adding checks for `chIsAlreadyTyped` in all places, we will work
        // with two conceptual positions, the position before `ch` and the position after `ch`
        //
        const positions = selections.map((s) => {
            const position = s.getPosition();
            if (chIsAlreadyTyped) {
                return { lineNumber: position.lineNumber, beforeColumn: position.column - ch.length, afterColumn: position.column };
            }
            else {
                return { lineNumber: position.lineNumber, beforeColumn: position.column, afterColumn: position.column };
            }
        });
        // Find the longest auto-closing open pair in case of multiple ending in `ch`
        // e.g. when having [f","] and [","], it picks [f","] if the character before is f
        const pair = this._findAutoClosingPairOpen(config, model, positions.map(p => new Position(p.lineNumber, p.beforeColumn)), ch);
        if (!pair) {
            return null;
        }
        let autoCloseConfig;
        let shouldAutoCloseBefore;
        const chIsQuote = isQuote(ch);
        if (chIsQuote) {
            autoCloseConfig = config.autoClosingQuotes;
            shouldAutoCloseBefore = config.shouldAutoCloseBefore.quote;
        }
        else {
            const pairIsForComments = config.blockCommentStartToken ? pair.open.includes(config.blockCommentStartToken) : false;
            if (pairIsForComments) {
                autoCloseConfig = config.autoClosingComments;
                shouldAutoCloseBefore = config.shouldAutoCloseBefore.comment;
            }
            else {
                autoCloseConfig = config.autoClosingBrackets;
                shouldAutoCloseBefore = config.shouldAutoCloseBefore.bracket;
            }
        }
        if (autoCloseConfig === 'never') {
            return null;
        }
        // Sometimes, it is possible to have two auto-closing pairs that have a containment relationship
        // e.g. when having [(,)] and [(*,*)]
        // - when typing (, the resulting state is (|)
        // - when typing *, the desired resulting state is (*|*), not (*|*))
        const containedPair = this._findContainedAutoClosingPair(config, pair);
        const containedPairClose = containedPair ? containedPair.close : '';
        let isContainedPairPresent = true;
        for (const position of positions) {
            const { lineNumber, beforeColumn, afterColumn } = position;
            const lineText = model.getLineContent(lineNumber);
            const lineBefore = lineText.substring(0, beforeColumn - 1);
            const lineAfter = lineText.substring(afterColumn - 1);
            if (!lineAfter.startsWith(containedPairClose)) {
                isContainedPairPresent = false;
            }
            // Only consider auto closing the pair if an allowed character follows or if another autoclosed pair closing brace follows
            if (lineAfter.length > 0) {
                const characterAfter = lineAfter.charAt(0);
                const isBeforeCloseBrace = this._isBeforeClosingBrace(config, lineAfter);
                if (!isBeforeCloseBrace && !shouldAutoCloseBefore(characterAfter)) {
                    return null;
                }
            }
            // Do not auto-close ' or " after a word character
            if (pair.open.length === 1 && (ch === '\'' || ch === '"') && autoCloseConfig !== 'always') {
                const wordSeparators = getMapForWordSeparators(config.wordSeparators, []);
                if (lineBefore.length > 0) {
                    const characterBefore = lineBefore.charCodeAt(lineBefore.length - 1);
                    if (wordSeparators.get(characterBefore) === 0 /* WordCharacterClass.Regular */) {
                        return null;
                    }
                }
            }
            if (!model.tokenization.isCheapToTokenize(lineNumber)) {
                // Do not force tokenization
                return null;
            }
            model.tokenization.forceTokenization(lineNumber);
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const scopedLineTokens = createScopedLineTokens(lineTokens, beforeColumn - 1);
            if (!pair.shouldAutoClose(scopedLineTokens, beforeColumn - scopedLineTokens.firstCharOffset)) {
                return null;
            }
            // Typing for example a quote could either start a new string, in which case auto-closing is desirable
            // or it could end a previously started string, in which case auto-closing is not desirable
            //
            // In certain cases, it is really not possible to look at the previous token to determine
            // what would happen. That's why we do something really unusual, we pretend to type a different
            // character and ask the tokenizer what the outcome of doing that is: after typing a neutral
            // character, are we in a string (i.e. the quote would most likely end a string) or not?
            //
            const neutralCharacter = pair.findNeutralCharacter();
            if (neutralCharacter) {
                const tokenType = model.tokenization.getTokenTypeIfInsertingCharacter(lineNumber, beforeColumn, neutralCharacter);
                if (!pair.isOK(tokenType)) {
                    return null;
                }
            }
        }
        if (isContainedPairPresent) {
            return pair.close.substring(0, pair.close.length - containedPairClose.length);
        }
        else {
            return pair.close;
        }
    }
    /**
     * Find another auto-closing pair that is contained by the one passed in.
     *
     * e.g. when having [(,)] and [(*,*)] as auto-closing pairs
     * this method will find [(,)] as a containment pair for [(*,*)]
     */
    static _findContainedAutoClosingPair(config, pair) {
        if (pair.open.length <= 1) {
            return null;
        }
        const lastChar = pair.close.charAt(pair.close.length - 1);
        // get candidates with the same last character as close
        const candidates = config.autoClosingPairs.autoClosingPairsCloseByEnd.get(lastChar) || [];
        let result = null;
        for (const candidate of candidates) {
            if (candidate.open !== pair.open && pair.open.includes(candidate.open) && pair.close.endsWith(candidate.close)) {
                if (!result || candidate.open.length > result.open.length) {
                    result = candidate;
                }
            }
        }
        return result;
    }
    /**
     * Determine if typing `ch` at all `positions` in the `model` results in an
     * auto closing open sequence being typed.
     *
     * Auto closing open sequences can consist of multiple characters, which
     * can lead to ambiguities. In such a case, the longest auto-closing open
     * sequence is returned.
     */
    static _findAutoClosingPairOpen(config, model, positions, ch) {
        const candidates = config.autoClosingPairs.autoClosingPairsOpenByEnd.get(ch);
        if (!candidates) {
            return null;
        }
        // Determine which auto-closing pair it is
        let result = null;
        for (const candidate of candidates) {
            if (result === null || candidate.open.length > result.open.length) {
                let candidateIsMatch = true;
                for (const position of positions) {
                    const relevantText = model.getValueInRange(new Range(position.lineNumber, position.column - candidate.open.length + 1, position.lineNumber, position.column));
                    if (relevantText + ch !== candidate.open) {
                        candidateIsMatch = false;
                        break;
                    }
                }
                if (candidateIsMatch) {
                    result = candidate;
                }
            }
        }
        return result;
    }
    static _isBeforeClosingBrace(config, lineAfter) {
        // If the start of lineAfter can be interpretted as both a starting or ending brace, default to returning false
        const nextChar = lineAfter.charAt(0);
        const potentialStartingBraces = config.autoClosingPairs.autoClosingPairsOpenByStart.get(nextChar) || [];
        const potentialClosingBraces = config.autoClosingPairs.autoClosingPairsCloseByStart.get(nextChar) || [];
        const isBeforeStartingBrace = potentialStartingBraces.some(x => lineAfter.startsWith(x.open));
        const isBeforeClosingBrace = potentialClosingBraces.some(x => lineAfter.startsWith(x.close));
        return !isBeforeStartingBrace && isBeforeClosingBrace;
    }
}
export class CompositionEndOvertypeOperation {
    static getEdits(config, compositions) {
        const isOvertypeMode = config.inputMode === 'overtype';
        if (!isOvertypeMode) {
            return null;
        }
        const commands = compositions.map(composition => new ReplaceOvertypeCommandOnCompositionEnd(composition.insertedTextRange));
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: false
        });
    }
}
export class SurroundSelectionOperation {
    static getEdits(config, model, selections, ch, isDoingComposition) {
        if (!isDoingComposition && this._isSurroundSelectionType(config, model, selections, ch)) {
            return this._runSurroundSelectionType(config, selections, ch);
        }
        return;
    }
    static _runSurroundSelectionType(config, selections, ch) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const closeCharacter = config.surroundingPairs[ch];
            commands[i] = new SurroundSelectionCommand(selection, ch, closeCharacter);
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true
        });
    }
    static _isSurroundSelectionType(config, model, selections, ch) {
        if (!shouldSurroundChar(config, ch) || !config.surroundingPairs.hasOwnProperty(ch)) {
            return false;
        }
        const isTypingAQuoteCharacter = isQuote(ch);
        for (const selection of selections) {
            if (selection.isEmpty()) {
                return false;
            }
            let selectionContainsOnlyWhitespace = true;
            for (let lineNumber = selection.startLineNumber; lineNumber <= selection.endLineNumber; lineNumber++) {
                const lineText = model.getLineContent(lineNumber);
                const startIndex = (lineNumber === selection.startLineNumber ? selection.startColumn - 1 : 0);
                const endIndex = (lineNumber === selection.endLineNumber ? selection.endColumn - 1 : lineText.length);
                const selectedText = lineText.substring(startIndex, endIndex);
                if (/[^ \t]/.test(selectedText)) {
                    // this selected text contains something other than whitespace
                    selectionContainsOnlyWhitespace = false;
                    break;
                }
            }
            if (selectionContainsOnlyWhitespace) {
                return false;
            }
            if (isTypingAQuoteCharacter && selection.startLineNumber === selection.endLineNumber && selection.startColumn + 1 === selection.endColumn) {
                const selectionText = model.getValueInRange(selection);
                if (isQuote(selectionText)) {
                    // Typing a quote character on top of another quote character
                    // => disable surround selection type
                    return false;
                }
            }
        }
        return true;
    }
}
export class InterceptorElectricCharOperation {
    static getEdits(prevEditOperationType, config, model, selections, ch, isDoingComposition) {
        // Electric characters make sense only when dealing with a single cursor,
        // as multiple cursors typing brackets for example would interfer with bracket matching
        if (!isDoingComposition && this._isTypeInterceptorElectricChar(config, model, selections)) {
            const r = this._typeInterceptorElectricChar(prevEditOperationType, config, model, selections[0], ch);
            if (r) {
                return r;
            }
        }
        return;
    }
    static _isTypeInterceptorElectricChar(config, model, selections) {
        if (selections.length === 1 && model.tokenization.isCheapToTokenize(selections[0].getEndPosition().lineNumber)) {
            return true;
        }
        return false;
    }
    static _typeInterceptorElectricChar(prevEditOperationType, config, model, selection, ch) {
        if (!config.electricChars.hasOwnProperty(ch) || !selection.isEmpty()) {
            return null;
        }
        const position = selection.getPosition();
        model.tokenization.forceTokenization(position.lineNumber);
        const lineTokens = model.tokenization.getLineTokens(position.lineNumber);
        let electricAction;
        try {
            electricAction = config.onElectricCharacter(ch, lineTokens, position.column);
        }
        catch (e) {
            onUnexpectedError(e);
            return null;
        }
        if (!electricAction) {
            return null;
        }
        if (electricAction.matchOpenBracket) {
            const endColumn = (lineTokens.getLineContent() + ch).lastIndexOf(electricAction.matchOpenBracket) + 1;
            const match = model.bracketPairs.findMatchingBracketUp(electricAction.matchOpenBracket, {
                lineNumber: position.lineNumber,
                column: endColumn
            }, 500 /* give at most 500ms to compute */);
            if (match) {
                if (match.startLineNumber === position.lineNumber) {
                    // matched something on the same line => no change in indentation
                    return null;
                }
                const matchLine = model.getLineContent(match.startLineNumber);
                const matchLineIndentation = strings.getLeadingWhitespace(matchLine);
                const newIndentation = config.normalizeIndentation(matchLineIndentation);
                const lineText = model.getLineContent(position.lineNumber);
                const lineFirstNonBlankColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumber) || position.column;
                const prefix = lineText.substring(lineFirstNonBlankColumn - 1, position.column - 1);
                const typeText = newIndentation + prefix + ch;
                const typeSelection = new Range(position.lineNumber, 1, position.lineNumber, position.column);
                const command = new ReplaceCommand(typeSelection, typeText);
                return new EditOperationResult(getTypingOperation(typeText, prevEditOperationType), [command], {
                    shouldPushStackElementBefore: false,
                    shouldPushStackElementAfter: true
                });
            }
        }
        return null;
    }
}
export class SimpleCharacterTypeOperation {
    static getEdits(config, prevEditOperationType, selections, ch, isDoingComposition) {
        // A simple character type
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const ChosenReplaceCommand = config.inputMode === 'overtype' && !isDoingComposition ? ReplaceOvertypeCommand : ReplaceCommand;
            commands[i] = new ChosenReplaceCommand(selections[i], ch);
        }
        const opType = getTypingOperation(ch, prevEditOperationType);
        return new EditOperationResult(opType, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, opType),
            shouldPushStackElementAfter: false
        });
    }
}
export class EnterOperation {
    static getEdits(config, model, selections, ch, isDoingComposition) {
        if (!isDoingComposition && ch === '\n') {
            const commands = [];
            for (let i = 0, len = selections.length; i < len; i++) {
                commands[i] = this._enter(config, model, false, selections[i]);
            }
            return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
                shouldPushStackElementBefore: true,
                shouldPushStackElementAfter: false,
            });
        }
        return;
    }
    static _enter(config, model, keepPosition, range) {
        if (config.autoIndent === 0 /* EditorAutoIndentStrategy.None */) {
            return typeCommand(range, '\n', keepPosition);
        }
        if (!model.tokenization.isCheapToTokenize(range.getStartPosition().lineNumber) || config.autoIndent === 1 /* EditorAutoIndentStrategy.Keep */) {
            const lineText = model.getLineContent(range.startLineNumber);
            const indentation = strings.getLeadingWhitespace(lineText).substring(0, range.startColumn - 1);
            return typeCommand(range, '\n' + config.normalizeIndentation(indentation), keepPosition);
        }
        const r = getEnterAction(config.autoIndent, model, range, config.languageConfigurationService);
        if (r) {
            if (r.indentAction === IndentAction.None) {
                // Nothing special
                return typeCommand(range, '\n' + config.normalizeIndentation(r.indentation + r.appendText), keepPosition);
            }
            else if (r.indentAction === IndentAction.Indent) {
                // Indent once
                return typeCommand(range, '\n' + config.normalizeIndentation(r.indentation + r.appendText), keepPosition);
            }
            else if (r.indentAction === IndentAction.IndentOutdent) {
                // Ultra special
                const normalIndent = config.normalizeIndentation(r.indentation);
                const increasedIndent = config.normalizeIndentation(r.indentation + r.appendText);
                const typeText = '\n' + increasedIndent + '\n' + normalIndent;
                if (keepPosition) {
                    return new ReplaceCommandWithoutChangingPosition(range, typeText, true);
                }
                else {
                    return new ReplaceCommandWithOffsetCursorState(range, typeText, -1, increasedIndent.length - normalIndent.length, true);
                }
            }
            else if (r.indentAction === IndentAction.Outdent) {
                const actualIndentation = unshiftIndent(config, r.indentation);
                return typeCommand(range, '\n' + config.normalizeIndentation(actualIndentation + r.appendText), keepPosition);
            }
        }
        const lineText = model.getLineContent(range.startLineNumber);
        const indentation = strings.getLeadingWhitespace(lineText).substring(0, range.startColumn - 1);
        if (config.autoIndent >= 4 /* EditorAutoIndentStrategy.Full */) {
            const ir = getIndentForEnter(config.autoIndent, model, range, {
                unshiftIndent: (indent) => {
                    return unshiftIndent(config, indent);
                },
                shiftIndent: (indent) => {
                    return shiftIndent(config, indent);
                },
                normalizeIndentation: (indent) => {
                    return config.normalizeIndentation(indent);
                }
            }, config.languageConfigurationService);
            if (ir) {
                let oldEndViewColumn = config.visibleColumnFromColumn(model, range.getEndPosition());
                const oldEndColumn = range.endColumn;
                const newLineContent = model.getLineContent(range.endLineNumber);
                const firstNonWhitespace = strings.firstNonWhitespaceIndex(newLineContent);
                if (firstNonWhitespace >= 0) {
                    range = range.setEndPosition(range.endLineNumber, Math.max(range.endColumn, firstNonWhitespace + 1));
                }
                else {
                    range = range.setEndPosition(range.endLineNumber, model.getLineMaxColumn(range.endLineNumber));
                }
                if (keepPosition) {
                    return new ReplaceCommandWithoutChangingPosition(range, '\n' + config.normalizeIndentation(ir.afterEnter), true);
                }
                else {
                    let offset = 0;
                    if (oldEndColumn <= firstNonWhitespace + 1) {
                        if (!config.insertSpaces) {
                            oldEndViewColumn = Math.ceil(oldEndViewColumn / config.indentSize);
                        }
                        offset = Math.min(oldEndViewColumn + 1 - config.normalizeIndentation(ir.afterEnter).length - 1, 0);
                    }
                    return new ReplaceCommandWithOffsetCursorState(range, '\n' + config.normalizeIndentation(ir.afterEnter), 0, offset, true);
                }
            }
        }
        return typeCommand(range, '\n' + config.normalizeIndentation(indentation), keepPosition);
    }
    static lineInsertBefore(config, model, selections) {
        if (model === null || selections === null) {
            return [];
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            let lineNumber = selections[i].positionLineNumber;
            if (lineNumber === 1) {
                commands[i] = new ReplaceCommandWithoutChangingPosition(new Range(1, 1, 1, 1), '\n');
            }
            else {
                lineNumber--;
                const column = model.getLineMaxColumn(lineNumber);
                commands[i] = this._enter(config, model, false, new Range(lineNumber, column, lineNumber, column));
            }
        }
        return commands;
    }
    static lineInsertAfter(config, model, selections) {
        if (model === null || selections === null) {
            return [];
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const lineNumber = selections[i].positionLineNumber;
            const column = model.getLineMaxColumn(lineNumber);
            commands[i] = this._enter(config, model, false, new Range(lineNumber, column, lineNumber, column));
        }
        return commands;
    }
    static lineBreakInsert(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = this._enter(config, model, true, selections[i]);
        }
        return commands;
    }
}
export class PasteOperation {
    static getEdits(config, model, selections, text, pasteOnNewLine, multicursorText) {
        const distributedPaste = this._distributePasteToCursors(config, selections, text, pasteOnNewLine, multicursorText);
        if (distributedPaste) {
            selections = selections.sort(Range.compareRangesUsingStarts);
            return this._distributedPaste(config, model, selections, distributedPaste);
        }
        else {
            return this._simplePaste(config, model, selections, text, pasteOnNewLine);
        }
    }
    static _distributePasteToCursors(config, selections, text, pasteOnNewLine, multicursorText) {
        if (pasteOnNewLine) {
            return null;
        }
        if (selections.length === 1) {
            return null;
        }
        if (multicursorText && multicursorText.length === selections.length) {
            return multicursorText;
        }
        if (config.multiCursorPaste === 'spread') {
            // Try to spread the pasted text in case the line count matches the cursor count
            // Remove trailing \n if present
            if (text.charCodeAt(text.length - 1) === 10 /* CharCode.LineFeed */) {
                text = text.substring(0, text.length - 1);
            }
            // Remove trailing \r if present
            if (text.charCodeAt(text.length - 1) === 13 /* CharCode.CarriageReturn */) {
                text = text.substring(0, text.length - 1);
            }
            const lines = strings.splitLines(text);
            if (lines.length === selections.length) {
                return lines;
            }
        }
        return null;
    }
    static _distributedPaste(config, model, selections, text) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const shouldOvertypeOnPaste = config.overtypeOnPaste && config.inputMode === 'overtype';
            const ChosenReplaceCommand = shouldOvertypeOnPaste ? ReplaceOvertypeCommand : ReplaceCommand;
            commands[i] = new ChosenReplaceCommand(selections[i], text[i]);
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true
        });
    }
    static _simplePaste(config, model, selections, text, pasteOnNewLine) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const position = selection.getPosition();
            if (pasteOnNewLine && !selection.isEmpty()) {
                pasteOnNewLine = false;
            }
            if (pasteOnNewLine && text.indexOf('\n') !== text.length - 1) {
                pasteOnNewLine = false;
            }
            if (pasteOnNewLine) {
                // Paste entire line at the beginning of line
                const typeSelection = new Range(position.lineNumber, 1, position.lineNumber, 1);
                commands[i] = new ReplaceCommandThatPreservesSelection(typeSelection, text, selection, true);
            }
            else {
                const shouldOvertypeOnPaste = config.overtypeOnPaste && config.inputMode === 'overtype';
                const ChosenReplaceCommand = shouldOvertypeOnPaste ? ReplaceOvertypeCommand : ReplaceCommand;
                commands[i] = new ChosenReplaceCommand(selection, text);
            }
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true
        });
    }
}
export class CompositionOperation {
    static getEdits(prevEditOperationType, config, model, selections, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        const commands = selections.map(selection => this._compositionType(model, selection, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta));
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, 4 /* EditOperationType.TypingOther */),
            shouldPushStackElementAfter: false
        });
    }
    static _compositionType(model, selection, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        if (!selection.isEmpty()) {
            // looks like https://github.com/microsoft/vscode/issues/2773
            // where a cursor operation occurred before a canceled composition
            // => ignore composition
            return null;
        }
        const pos = selection.getPosition();
        const startColumn = Math.max(1, pos.column - replacePrevCharCnt);
        const endColumn = Math.min(model.getLineMaxColumn(pos.lineNumber), pos.column + replaceNextCharCnt);
        const range = new Range(pos.lineNumber, startColumn, pos.lineNumber, endColumn);
        return new ReplaceCommandWithOffsetCursorState(range, text, 0, positionDelta);
    }
}
export class TypeWithoutInterceptorsOperation {
    static getEdits(prevEditOperationType, selections, str) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = new ReplaceCommand(selections[i], str);
        }
        const opType = getTypingOperation(str, prevEditOperationType);
        return new EditOperationResult(opType, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, opType),
            shouldPushStackElementAfter: false
        });
    }
}
export class TabOperation {
    static getCommands(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            if (selection.isEmpty()) {
                const lineText = model.getLineContent(selection.startLineNumber);
                if (/^\s*$/.test(lineText) && model.tokenization.isCheapToTokenize(selection.startLineNumber)) {
                    let goodIndent = this._goodIndentForLine(config, model, selection.startLineNumber);
                    goodIndent = goodIndent || '\t';
                    const possibleTypeText = config.normalizeIndentation(goodIndent);
                    if (!lineText.startsWith(possibleTypeText)) {
                        commands[i] = new ReplaceCommand(new Range(selection.startLineNumber, 1, selection.startLineNumber, lineText.length + 1), possibleTypeText, true);
                        continue;
                    }
                }
                commands[i] = this._replaceJumpToNextIndent(config, model, selection, true);
            }
            else {
                if (selection.startLineNumber === selection.endLineNumber) {
                    const lineMaxColumn = model.getLineMaxColumn(selection.startLineNumber);
                    if (selection.startColumn !== 1 || selection.endColumn !== lineMaxColumn) {
                        // This is a single line selection that is not the entire line
                        commands[i] = this._replaceJumpToNextIndent(config, model, selection, false);
                        continue;
                    }
                }
                commands[i] = new ShiftCommand(selection, {
                    isUnshift: false,
                    tabSize: config.tabSize,
                    indentSize: config.indentSize,
                    insertSpaces: config.insertSpaces,
                    useTabStops: config.useTabStops,
                    autoIndent: config.autoIndent
                }, config.languageConfigurationService);
            }
        }
        return commands;
    }
    static _goodIndentForLine(config, model, lineNumber) {
        let action = null;
        let indentation = '';
        const expectedIndentAction = getInheritIndentForLine(config.autoIndent, model, lineNumber, false, config.languageConfigurationService);
        if (expectedIndentAction) {
            action = expectedIndentAction.action;
            indentation = expectedIndentAction.indentation;
        }
        else if (lineNumber > 1) {
            let lastLineNumber;
            for (lastLineNumber = lineNumber - 1; lastLineNumber >= 1; lastLineNumber--) {
                const lineText = model.getLineContent(lastLineNumber);
                const nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineText);
                if (nonWhitespaceIdx >= 0) {
                    break;
                }
            }
            if (lastLineNumber < 1) {
                // No previous line with content found
                return null;
            }
            const maxColumn = model.getLineMaxColumn(lastLineNumber);
            const expectedEnterAction = getEnterAction(config.autoIndent, model, new Range(lastLineNumber, maxColumn, lastLineNumber, maxColumn), config.languageConfigurationService);
            if (expectedEnterAction) {
                indentation = expectedEnterAction.indentation + expectedEnterAction.appendText;
            }
        }
        if (action) {
            if (action === IndentAction.Indent) {
                indentation = shiftIndent(config, indentation);
            }
            if (action === IndentAction.Outdent) {
                indentation = unshiftIndent(config, indentation);
            }
            indentation = config.normalizeIndentation(indentation);
        }
        if (!indentation) {
            return null;
        }
        return indentation;
    }
    static _replaceJumpToNextIndent(config, model, selection, insertsAutoWhitespace) {
        let typeText = '';
        const position = selection.getStartPosition();
        if (config.insertSpaces) {
            const visibleColumnFromColumn = config.visibleColumnFromColumn(model, position);
            const indentSize = config.indentSize;
            const spacesCnt = indentSize - (visibleColumnFromColumn % indentSize);
            for (let i = 0; i < spacesCnt; i++) {
                typeText += ' ';
            }
        }
        else {
            typeText = '\t';
        }
        return new ReplaceCommand(selection, typeText, insertsAutoWhitespace);
    }
}
export class BaseTypeWithAutoClosingCommand extends ReplaceCommandWithOffsetCursorState {
    constructor(selection, text, lineNumberDeltaOffset, columnDeltaOffset, openCharacter, closeCharacter) {
        super(selection, text, lineNumberDeltaOffset, columnDeltaOffset);
        this._openCharacter = openCharacter;
        this._closeCharacter = closeCharacter;
        this.closeCharacterRange = null;
        this.enclosingRange = null;
    }
    _computeCursorStateWithRange(model, range, helper) {
        this.closeCharacterRange = new Range(range.startLineNumber, range.endColumn - this._closeCharacter.length, range.endLineNumber, range.endColumn);
        this.enclosingRange = new Range(range.startLineNumber, range.endColumn - this._openCharacter.length - this._closeCharacter.length, range.endLineNumber, range.endColumn);
        return super.computeCursorState(model, helper);
    }
}
class TypeWithAutoClosingCommand extends BaseTypeWithAutoClosingCommand {
    constructor(selection, openCharacter, insertOpenCharacter, closeCharacter) {
        const text = (insertOpenCharacter ? openCharacter : '') + closeCharacter;
        const lineNumberDeltaOffset = 0;
        const columnDeltaOffset = -closeCharacter.length;
        super(selection, text, lineNumberDeltaOffset, columnDeltaOffset, openCharacter, closeCharacter);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const range = inverseEditOperations[0].range;
        return this._computeCursorStateWithRange(model, range, helper);
    }
}
class TypeWithIndentationAndAutoClosingCommand extends BaseTypeWithAutoClosingCommand {
    constructor(autoIndentationEdit, selection, openCharacter, closeCharacter) {
        const text = openCharacter + closeCharacter;
        const lineNumberDeltaOffset = 0;
        const columnDeltaOffset = openCharacter.length;
        super(selection, text, lineNumberDeltaOffset, columnDeltaOffset, openCharacter, closeCharacter);
        this._autoIndentationEdit = autoIndentationEdit;
        this._autoClosingEdit = { range: selection, text };
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._autoIndentationEdit.range, this._autoIndentationEdit.text);
        builder.addTrackedEditOperation(this._autoClosingEdit.range, this._autoClosingEdit.text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        if (inverseEditOperations.length !== 2) {
            throw new Error('There should be two inverse edit operations!');
        }
        const range1 = inverseEditOperations[0].range;
        const range2 = inverseEditOperations[1].range;
        const range = range1.plusRange(range2);
        return this._computeCursorStateWithRange(model, range, helper);
    }
}
function getTypingOperation(typedText, previousTypingOperation) {
    if (typedText === ' ') {
        return previousTypingOperation === 5 /* EditOperationType.TypingFirstSpace */
            || previousTypingOperation === 6 /* EditOperationType.TypingConsecutiveSpace */
            ? 6 /* EditOperationType.TypingConsecutiveSpace */
            : 5 /* EditOperationType.TypingFirstSpace */;
    }
    return 4 /* EditOperationType.TypingOther */;
}
function shouldPushStackElementBetween(previousTypingOperation, typingOperation) {
    if (isTypingOperation(previousTypingOperation) && !isTypingOperation(typingOperation)) {
        // Always set an undo stop before non-type operations
        return true;
    }
    if (previousTypingOperation === 5 /* EditOperationType.TypingFirstSpace */) {
        // `abc |d`: No undo stop
        // `abc  |d`: Undo stop
        return false;
    }
    // Insert undo stop between different operation types
    return normalizeOperationType(previousTypingOperation) !== normalizeOperationType(typingOperation);
}
function normalizeOperationType(type) {
    return (type === 6 /* EditOperationType.TypingConsecutiveSpace */ || type === 5 /* EditOperationType.TypingFirstSpace */)
        ? 'space'
        : type;
}
function isTypingOperation(type) {
    return type === 4 /* EditOperationType.TypingOther */
        || type === 5 /* EditOperationType.TypingFirstSpace */
        || type === 6 /* EditOperationType.TypingConsecutiveSpace */;
}
function isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch) {
    if (config.autoClosingOvertype === 'never') {
        return false;
    }
    if (!config.autoClosingPairs.autoClosingPairsCloseSingleChar.has(ch)) {
        return false;
    }
    for (let i = 0, len = selections.length; i < len; i++) {
        const selection = selections[i];
        if (!selection.isEmpty()) {
            return false;
        }
        const position = selection.getPosition();
        const lineText = model.getLineContent(position.lineNumber);
        const afterCharacter = lineText.charAt(position.column - 1);
        if (afterCharacter !== ch) {
            return false;
        }
        // Do not over-type quotes after a backslash
        const chIsQuote = isQuote(ch);
        const beforeCharacter = position.column > 2 ? lineText.charCodeAt(position.column - 2) : 0 /* CharCode.Null */;
        if (beforeCharacter === 92 /* CharCode.Backslash */ && chIsQuote) {
            return false;
        }
        // Must over-type a closing character typed by the editor
        if (config.autoClosingOvertype === 'auto') {
            let found = false;
            for (let j = 0, lenJ = autoClosedCharacters.length; j < lenJ; j++) {
                const autoClosedCharacter = autoClosedCharacters[j];
                if (position.lineNumber === autoClosedCharacter.startLineNumber && position.column === autoClosedCharacter.startColumn) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
    }
    return true;
}
function typeCommand(range, text, keepPosition) {
    if (keepPosition) {
        return new ReplaceCommandWithoutChangingPosition(range, text, true);
    }
    else {
        return new ReplaceCommand(range, text, true);
    }
}
export function shiftIndent(config, indentation, count) {
    count = count || 1;
    return ShiftCommand.shiftIndent(indentation, indentation.length + count, config.tabSize, config.indentSize, config.insertSpaces);
}
export function unshiftIndent(config, indentation, count) {
    count = count || 1;
    return ShiftCommand.unshiftIndent(indentation, indentation.length + count, config.tabSize, config.indentSize, config.insertSpaces);
}
export function shouldSurroundChar(config, ch) {
    if (isQuote(ch)) {
        return (config.autoSurround === 'quotes' || config.autoSurround === 'languageDefined');
    }
    else {
        // Character is a bracket
        return (config.autoSurround === 'brackets' || config.autoSurround === 'languageDefined');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVHlwZUVkaXRPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvclR5cGVFZGl0T3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsbUNBQW1DLEVBQUUscUNBQXFDLEVBQUUsb0NBQW9DLEVBQUUsc0JBQXNCLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqUCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkYsT0FBTyxFQUF1QixtQkFBbUIsRUFBeUMsT0FBTyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUgsT0FBTyxFQUFzQix1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHL0MsT0FBTyxFQUFlLFlBQVksRUFBc0MsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUd6RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztB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
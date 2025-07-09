/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { ReplaceCommand } from '../commands/replaceCommand.js';
import { EditOperationResult, isQuote } from '../cursorCommon.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { MoveOperations } from './cursorMoveOperations.js';
import { Range } from '../core/range.js';
import { Position } from '../core/position.js';
export class DeleteOperations {
    static deleteRight(prevEditOperationType, config, model, selections) {
        const commands = [];
        let shouldPushStackElementBefore = (prevEditOperationType !== 3 /* EditOperationType.DeletingRight */);
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            let deleteSelection = selection;
            if (deleteSelection.isEmpty()) {
                const position = selection.getPosition();
                const rightOfPosition = MoveOperations.right(config, model, position);
                deleteSelection = new Range(rightOfPosition.lineNumber, rightOfPosition.column, position.lineNumber, position.column);
            }
            if (deleteSelection.isEmpty()) {
                // Probably at end of file => ignore
                commands[i] = null;
                continue;
            }
            if (deleteSelection.startLineNumber !== deleteSelection.endLineNumber) {
                shouldPushStackElementBefore = true;
            }
            commands[i] = new ReplaceCommand(deleteSelection, '');
        }
        return [shouldPushStackElementBefore, commands];
    }
    static isAutoClosingPairDelete(autoClosingDelete, autoClosingBrackets, autoClosingQuotes, autoClosingPairsOpen, model, selections, autoClosedCharacters) {
        if (autoClosingBrackets === 'never' && autoClosingQuotes === 'never') {
            return false;
        }
        if (autoClosingDelete === 'never') {
            return false;
        }
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const position = selection.getPosition();
            if (!selection.isEmpty()) {
                return false;
            }
            const lineText = model.getLineContent(position.lineNumber);
            if (position.column < 2 || position.column >= lineText.length + 1) {
                return false;
            }
            const character = lineText.charAt(position.column - 2);
            const autoClosingPairCandidates = autoClosingPairsOpen.get(character);
            if (!autoClosingPairCandidates) {
                return false;
            }
            if (isQuote(character)) {
                if (autoClosingQuotes === 'never') {
                    return false;
                }
            }
            else {
                if (autoClosingBrackets === 'never') {
                    return false;
                }
            }
            const afterCharacter = lineText.charAt(position.column - 1);
            let foundAutoClosingPair = false;
            for (const autoClosingPairCandidate of autoClosingPairCandidates) {
                if (autoClosingPairCandidate.open === character && autoClosingPairCandidate.close === afterCharacter) {
                    foundAutoClosingPair = true;
                }
            }
            if (!foundAutoClosingPair) {
                return false;
            }
            // Must delete the pair only if it was automatically inserted by the editor
            if (autoClosingDelete === 'auto') {
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
    static _runAutoClosingPairDelete(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const position = selections[i].getPosition();
            const deleteSelection = new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column + 1);
            commands[i] = new ReplaceCommand(deleteSelection, '');
        }
        return [true, commands];
    }
    static deleteLeft(prevEditOperationType, config, model, selections, autoClosedCharacters) {
        if (this.isAutoClosingPairDelete(config.autoClosingDelete, config.autoClosingBrackets, config.autoClosingQuotes, config.autoClosingPairs.autoClosingPairsOpenByEnd, model, selections, autoClosedCharacters)) {
            return this._runAutoClosingPairDelete(config, model, selections);
        }
        const commands = [];
        let shouldPushStackElementBefore = (prevEditOperationType !== 2 /* EditOperationType.DeletingLeft */);
        for (let i = 0, len = selections.length; i < len; i++) {
            const deleteRange = DeleteOperations.getDeleteRange(selections[i], model, config);
            // Ignore empty delete ranges, as they have no effect
            // They happen if the cursor is at the beginning of the file.
            if (deleteRange.isEmpty()) {
                commands[i] = null;
                continue;
            }
            if (deleteRange.startLineNumber !== deleteRange.endLineNumber) {
                shouldPushStackElementBefore = true;
            }
            commands[i] = new ReplaceCommand(deleteRange, '');
        }
        return [shouldPushStackElementBefore, commands];
    }
    static getDeleteRange(selection, model, config) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = selection.getPosition();
        // Unintend when using tab stops and cursor is within indentation
        if (config.useTabStops && position.column > 1) {
            const lineContent = model.getLineContent(position.lineNumber);
            const firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
            const lastIndentationColumn = (firstNonWhitespaceIndex === -1
                ? /* entire string is whitespace */ lineContent.length + 1
                : firstNonWhitespaceIndex + 1);
            if (position.column <= lastIndentationColumn) {
                const fromVisibleColumn = config.visibleColumnFromColumn(model, position);
                const toVisibleColumn = CursorColumns.prevIndentTabStop(fromVisibleColumn, config.indentSize);
                const toColumn = config.columnFromVisibleColumn(model, position.lineNumber, toVisibleColumn);
                return new Range(position.lineNumber, toColumn, position.lineNumber, position.column);
            }
        }
        return Range.fromPositions(DeleteOperations.getPositionAfterDeleteLeft(position, model), position);
    }
    static getPositionAfterDeleteLeft(position, model) {
        if (position.column > 1) {
            // Convert 1-based columns to 0-based offsets and back.
            const idx = strings.getLeftDeleteOffset(position.column - 1, model.getLineContent(position.lineNumber));
            return position.with(undefined, idx + 1);
        }
        else if (position.lineNumber > 1) {
            const newLine = position.lineNumber - 1;
            return new Position(newLine, model.getLineMaxColumn(newLine));
        }
        else {
            return position;
        }
    }
    static cut(config, model, selections) {
        const commands = [];
        let lastCutRange = null;
        selections.sort((a, b) => Position.compare(a.getStartPosition(), b.getEndPosition()));
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            if (selection.isEmpty()) {
                if (config.emptySelectionClipboard) {
                    // This is a full line cut
                    const position = selection.getPosition();
                    let startLineNumber, startColumn, endLineNumber, endColumn;
                    if (position.lineNumber < model.getLineCount()) {
                        // Cutting a line in the middle of the model
                        startLineNumber = position.lineNumber;
                        startColumn = 1;
                        endLineNumber = position.lineNumber + 1;
                        endColumn = 1;
                    }
                    else if (position.lineNumber > 1 && lastCutRange?.endLineNumber !== position.lineNumber) {
                        // Cutting the last line & there are more than 1 lines in the model & a previous cut operation does not touch the current cut operation
                        startLineNumber = position.lineNumber - 1;
                        startColumn = model.getLineMaxColumn(position.lineNumber - 1);
                        endLineNumber = position.lineNumber;
                        endColumn = model.getLineMaxColumn(position.lineNumber);
                    }
                    else {
                        // Cutting the single line that the model contains
                        startLineNumber = position.lineNumber;
                        startColumn = 1;
                        endLineNumber = position.lineNumber;
                        endColumn = model.getLineMaxColumn(position.lineNumber);
                    }
                    const deleteSelection = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
                    lastCutRange = deleteSelection;
                    if (!deleteSelection.isEmpty()) {
                        commands[i] = new ReplaceCommand(deleteSelection, '');
                    }
                    else {
                        commands[i] = null;
                    }
                }
                else {
                    // Cannot cut empty selection
                    commands[i] = null;
                }
            }
            else {
                commands[i] = new ReplaceCommand(selection, '');
            }
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRGVsZXRlT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JEZWxldGVPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sRUFBdUIsbUJBQW1CLEVBQXlDLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSXpDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUvQyxNQUFNLE9BQU8sZ0JBQWdCO0lBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXdDLEVBQUUsTUFBMkIsRUFBRSxLQUF5QixFQUFFLFVBQXVCO1FBQ2xKLE1BQU0sUUFBUSxHQUEyQixFQUFFLENBQUM7UUFDNUMsSUFBSSw0QkFBNEIsR0FBRyxDQUFDLHFCQUFxQiw0Q0FBb0MsQ0FBQyxDQUFDO1FBQy9GLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFaEMsSUFBSSxlQUFlLEdBQVUsU0FBUyxDQUFDO1lBRXZD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ShiftCommand } from '../commands/shiftCommand.js';
import { CompositionSurroundSelectionCommand } from '../commands/surroundSelectionCommand.js';
import { EditOperationResult, isQuote } from '../cursorCommon.js';
import { AutoClosingOpenCharTypeOperation, AutoClosingOvertypeOperation, AutoClosingOvertypeWithInterceptorsOperation, AutoIndentOperation, CompositionOperation, CompositionEndOvertypeOperation, EnterOperation, InterceptorElectricCharOperation, PasteOperation, shiftIndent, shouldSurroundChar, SimpleCharacterTypeOperation, SurroundSelectionOperation, TabOperation, TypeWithoutInterceptorsOperation, unshiftIndent } from './cursorTypeEditOperations.js';
export class TypeOperations {
    static indent(config, model, selections) {
        if (model === null || selections === null) {
            return [];
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = new ShiftCommand(selections[i], {
                isUnshift: false,
                tabSize: config.tabSize,
                indentSize: config.indentSize,
                insertSpaces: config.insertSpaces,
                useTabStops: config.useTabStops,
                autoIndent: config.autoIndent
            }, config.languageConfigurationService);
        }
        return commands;
    }
    static outdent(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = new ShiftCommand(selections[i], {
                isUnshift: true,
                tabSize: config.tabSize,
                indentSize: config.indentSize,
                insertSpaces: config.insertSpaces,
                useTabStops: config.useTabStops,
                autoIndent: config.autoIndent
            }, config.languageConfigurationService);
        }
        return commands;
    }
    static shiftIndent(config, indentation, count) {
        return shiftIndent(config, indentation, count);
    }
    static unshiftIndent(config, indentation, count) {
        return unshiftIndent(config, indentation, count);
    }
    static paste(config, model, selections, text, pasteOnNewLine, multicursorText) {
        return PasteOperation.getEdits(config, model, selections, text, pasteOnNewLine, multicursorText);
    }
    static tab(config, model, selections) {
        return TabOperation.getCommands(config, model, selections);
    }
    static compositionType(prevEditOperationType, config, model, selections, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        return CompositionOperation.getEdits(prevEditOperationType, config, model, selections, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
    }
    /**
     * This is very similar with typing, but the character is already in the text buffer!
     */
    static compositionEndWithInterceptors(prevEditOperationType, config, model, compositions, selections, autoClosedCharacters) {
        if (!compositions) {
            // could not deduce what the composition did
            return null;
        }
        let insertedText = null;
        for (const composition of compositions) {
            if (insertedText === null) {
                insertedText = composition.insertedText;
            }
            else if (insertedText !== composition.insertedText) {
                // not all selections agree on what was typed
                return null;
            }
        }
        if (!insertedText || insertedText.length !== 1) {
            // we're only interested in the case where a single character was inserted
            return CompositionEndOvertypeOperation.getEdits(config, compositions);
        }
        const ch = insertedText;
        let hasDeletion = false;
        for (const composition of compositions) {
            if (composition.deletedText.length !== 0) {
                hasDeletion = true;
                break;
            }
        }
        if (hasDeletion) {
            // Check if this could have been a surround selection
            if (!shouldSurroundChar(config, ch) || !config.surroundingPairs.hasOwnProperty(ch)) {
                return null;
            }
            const isTypingAQuoteCharacter = isQuote(ch);
            for (const composition of compositions) {
                if (composition.deletedSelectionStart !== 0 || composition.deletedSelectionEnd !== composition.deletedText.length) {
                    // more text was deleted than was selected, so this could not have been a surround selection
                    return null;
                }
                if (/^[ \t]+$/.test(composition.deletedText)) {
                    // deleted text was only whitespace
                    return null;
                }
                if (isTypingAQuoteCharacter && isQuote(composition.deletedText)) {
                    // deleted text was a quote
                    return null;
                }
            }
            const positions = [];
            for (const selection of selections) {
                if (!selection.isEmpty()) {
                    return null;
                }
                positions.push(selection.getPosition());
            }
            if (positions.length !== compositions.length) {
                return null;
            }
            const commands = [];
            for (let i = 0, len = positions.length; i < len; i++) {
                commands.push(new CompositionSurroundSelectionCommand(positions[i], compositions[i].deletedText, config.surroundingPairs[ch]));
            }
            return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
                shouldPushStackElementBefore: true,
                shouldPushStackElementAfter: false
            });
        }
        const autoClosingOvertypeEdits = AutoClosingOvertypeWithInterceptorsOperation.getEdits(config, model, selections, autoClosedCharacters, ch);
        if (autoClosingOvertypeEdits !== undefined) {
            return autoClosingOvertypeEdits;
        }
        const autoClosingOpenCharEdits = AutoClosingOpenCharTypeOperation.getEdits(config, model, selections, ch, true, false);
        if (autoClosingOpenCharEdits !== undefined) {
            return autoClosingOpenCharEdits;
        }
        return CompositionEndOvertypeOperation.getEdits(config, compositions);
    }
    static typeWithInterceptors(isDoingComposition, prevEditOperationType, config, model, selections, autoClosedCharacters, ch) {
        const enterEdits = EnterOperation.getEdits(config, model, selections, ch, isDoingComposition);
        if (enterEdits !== undefined) {
            return enterEdits;
        }
        const autoIndentEdits = AutoIndentOperation.getEdits(config, model, selections, ch, isDoingComposition);
        if (autoIndentEdits !== undefined) {
            return autoIndentEdits;
        }
        const autoClosingOverTypeEdits = AutoClosingOvertypeOperation.getEdits(prevEditOperationType, config, model, selections, autoClosedCharacters, ch);
        if (autoClosingOverTypeEdits !== undefined) {
            return autoClosingOverTypeEdits;
        }
        const autoClosingOpenCharEdits = AutoClosingOpenCharTypeOperation.getEdits(config, model, selections, ch, false, isDoingComposition);
        if (autoClosingOpenCharEdits !== undefined) {
            return autoClosingOpenCharEdits;
        }
        const surroundSelectionEdits = SurroundSelectionOperation.getEdits(config, model, selections, ch, isDoingComposition);
        if (surroundSelectionEdits !== undefined) {
            return surroundSelectionEdits;
        }
        const interceptorElectricCharOperation = InterceptorElectricCharOperation.getEdits(prevEditOperationType, config, model, selections, ch, isDoingComposition);
        if (interceptorElectricCharOperation !== undefined) {
            return interceptorElectricCharOperation;
        }
        return SimpleCharacterTypeOperation.getEdits(config, prevEditOperationType, selections, ch, isDoingComposition);
    }
    static typeWithoutInterceptors(prevEditOperationType, config, model, selections, str) {
        return TypeWithoutInterceptorsOperation.getEdits(prevEditOperationType, selections, str);
    }
}
export class CompositionOutcome {
    constructor(deletedText, deletedSelectionStart, deletedSelectionEnd, insertedText, insertedSelectionStart, insertedSelectionEnd, insertedTextRange) {
        this.deletedText = deletedText;
        this.deletedSelectionStart = deletedSelectionStart;
        this.deletedSelectionEnd = deletedSelectionEnd;
        this.insertedText = insertedText;
        this.insertedSelectionStart = insertedSelectionStart;
        this.insertedSelectionEnd = insertedSelectionEnd;
        this.insertedTextRange = insertedTextRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVHlwZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yVHlwZU9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlGLE9BQU8sRUFBdUIsbUJBQW1CLEVBQXlDLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBTTlILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSw0QkFBNEIsRUFBRSw0Q0FBNEMsRUFBRSxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSwrQkFBK0IsRUFBRSxjQUFjLEVBQUUsZ0NBQWdDLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSw0QkFBNEIsRUFBRSwwQkFBMEIsRUFBRSxZQUFZLEVBQUUsZ0NBQWdDLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFcmMsTUFBTSxPQUFPLGNBQWM7SUFFbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUEyQixFQUFFLEtBQWdDLEVBQUUsVUFBOEI7UUFDakgsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUM7UUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzdDLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87Z0JBQ3ZCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtnQkFDN0IsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZO2dCQUNqQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQy9CLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTthQUM3QixFQUFFLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUEyQixFQUFFLEtBQXlCLEVBQUUsVUFBdUI7UUFDcEcsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFDO1FBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUM3QyxTQUFTLEVBQUUsSUFBSTtnQkFDZixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87Z0JBQ3ZCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtnQkFDN0IsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZO2dCQUNqQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7Z0JBQy9CLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTthQUM3QixFQUFFLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUEyQixFQUFFLFdBQW1CLEVBQUUsS0FBYztRQUN6RixPQUFPLFdBQVcsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQTJCLEVBQUUsV0FBbUIsRUFBRSxLQUFjO1FBQzNGLE9BQU8sYUFBYSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBMkIsRUFBRSxLQUF5QixFQUFFLFVBQXVCLEVBQUUsSUFBWSxFQUFFLGNBQXVCLEVBQUUsZUFBeUI7UUFDcEssT0FBTyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBMkIsRUFBRSxLQUFpQixFQUFFLFVBQXVCO1FBQ3hGLE9BQU8sWUFBWSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFTSxNQUFNLENBQUMsZUFBZSxDQUFDLHFCQUF3QyxFQUFFLE1BQTJCLEVBQUUsS0FBaUIsRUFBRSxVQUF1QixFQUFFLElBQVksRUFBRSxrQkFBMEIsRUFBRSxrQkFBMEIsRUFBRSxhQUFxQjtRQUMzTyxPQUFPLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDckosQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLDhCQUE4QixDQUFDLHFCQUF3QyxFQUFFLE1BQTJCLEVBQUUsS0FBaUIsRUFBRSxZQUF5QyxFQUFFLFVBQXVCLEVBQUUsb0JBQTZCO1FBQ3ZPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQiw0Q0FBNEM7WUFDNUMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxZQUFZLEdBQWtCLElBQUksQ0FBQztRQUN2QyxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ3hDLElBQUksWUFBWSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMzQixZQUFZLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQztZQUN6QyxDQUFDO2lCQUFNLElBQUksWUFBWSxLQUFLLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdEQsNkNBQTZDO2dCQUM3QyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hELDBFQUEwRTtZQUMxRSxPQUFPLCtCQUErQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQztRQUV4QixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDeEIsS0FBSyxNQUFNLFdBQVcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUN4QyxJQUFJLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUNuQixNQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLHFEQUFxRDtZQUVyRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNwRixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCxNQUFNLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUU1QyxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUN4QyxJQUFJLFdBQVcsQ0FBQyxxQkFBcUIsS0FBSyxDQUFDLElBQUksV0FBVyxDQUFDLG1CQUFtQixLQUFLLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ25ILDRGQUE0RjtvQkFDNUYsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztnQkFDRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQzlDLG1DQUFtQztvQkFDbkMsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztnQkFDRCxJQUFJLHVCQUF1QixJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDakUsMkJBQTJCO29CQUMzQixPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFlLEVBQUUsQ0FBQztZQUNqQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQzFCLE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUM7Z0JBQ0QsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBRUQsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDOUMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFDO1lBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEQsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLG1DQUFtQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEksQ0FBQztZQUNELE9BQU8sSUFBSSxtQkFBbUIsd0NBQWdDLFFBQVEsRUFBRTtnQkFDdkUsNEJBQTRCLEVBQUUsSUFBSTtnQkFDbEMsMkJBQTJCLEVBQUUsS0FBSzthQUNsQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSx3QkFBd0IsR0FBRyw0Q0FBNEMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDNUksSUFBSSx3QkFBd0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QyxPQUFPLHdCQUF3QixDQUFDO1FBQ2pDLENBQUM7UUFFRCxNQUFNLHdCQUF3QixHQUFHLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZILElBQUksd0JBQXdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsT0FBTyx3QkFBd0IsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFTSxNQUFNLENBQUMsb0JBQW9CLENBQUMsa0JBQTJCLEVBQUUscUJBQXdDLEVBQUUsTUFBMkIsRUFBRSxLQUFpQixFQUFFLFVBQXVCLEVBQUUsb0JBQTZCLEVBQUUsRUFBVTtRQUUzTixNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzlGLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzlCLE9BQU8sVUFBVSxDQUFDO1FBQ25CLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDeEcsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTyxlQUFlLENBQUM7UUFDeEIsQ0FBQztRQUVELE1BQU0sd0JBQXdCLEdBQUcsNEJBQTRCLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25KLElBQUksd0JBQXdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsT0FBTyx3QkFBd0IsQ0FBQztRQUNqQyxDQUFDO1FBRUQsTUFBTSx3QkFBd0IsR0FBRyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JJLElBQUksd0JBQXdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsT0FBTyx3QkFBd0IsQ0FBQztRQUNqQyxDQUFDO1FBRUQsTUFBTSxzQkFBc0IsR0FBRywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDdEgsSUFBSSxzQkFBc0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQyxPQUFPLHNCQUFzQixDQUFDO1FBQy9CLENBQUM7UUFFRCxNQUFNLGdDQUFnQyxHQUFHLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM3SixJQUFJLGdDQUFnQyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BELE9BQU8sZ0NBQWdDLENBQUM7UUFDekMsQ0FBQztRQUVELE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDakgsQ0FBQztJQUVNLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxxQkFBd0MsRUFBRSxNQUEyQixFQUFFLEtBQWlCLEVBQUUsVUFBdUIsRUFBRSxHQUFXO1FBQ25LLE9BQU8sZ0NBQWdDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLFlBQ2lCLFdBQW1CLEVBQ25CLHFCQUE2QixFQUM3QixtQkFBMkIsRUFDM0IsWUFBb0IsRUFDcEIsc0JBQThCLEVBQzlCLG9CQUE0QixFQUM1QixpQkFBd0I7UUFOeEIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFRO1FBQzdCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQUMzQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQVE7UUFDOUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFRO1FBQzVCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBTztJQUNyQyxDQUFDO0NBQ0wifQ==
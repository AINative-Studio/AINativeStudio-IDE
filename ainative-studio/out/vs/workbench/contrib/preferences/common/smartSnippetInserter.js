/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createScanner as createJSONScanner } from '../../../../base/common/json.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
export class SmartSnippetInserter {
    static hasOpenBrace(scanner) {
        while (scanner.scan() !== 17 /* JSONSyntaxKind.EOF */) {
            const kind = scanner.getToken();
            if (kind === 1 /* JSONSyntaxKind.OpenBraceToken */) {
                return true;
            }
        }
        return false;
    }
    static offsetToPosition(model, offset) {
        let offsetBeforeLine = 0;
        const eolLength = model.getEOL().length;
        const lineCount = model.getLineCount();
        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            const lineTotalLength = model.getLineLength(lineNumber) + eolLength;
            const offsetAfterLine = offsetBeforeLine + lineTotalLength;
            if (offsetAfterLine > offset) {
                return new Position(lineNumber, offset - offsetBeforeLine + 1);
            }
            offsetBeforeLine = offsetAfterLine;
        }
        return new Position(lineCount, model.getLineMaxColumn(lineCount));
    }
    static insertSnippet(model, _position) {
        const desiredPosition = model.getValueLengthInRange(new Range(1, 1, _position.lineNumber, _position.column));
        // <INVALID> [ <BEFORE_OBJECT> { <INVALID> } <AFTER_OBJECT>, <BEFORE_OBJECT> { <INVALID> } <AFTER_OBJECT> ] <INVALID>
        let State;
        (function (State) {
            State[State["INVALID"] = 0] = "INVALID";
            State[State["AFTER_OBJECT"] = 1] = "AFTER_OBJECT";
            State[State["BEFORE_OBJECT"] = 2] = "BEFORE_OBJECT";
        })(State || (State = {}));
        let currentState = State.INVALID;
        let lastValidPos = -1;
        let lastValidState = State.INVALID;
        const scanner = createJSONScanner(model.getValue());
        let arrayLevel = 0;
        let objLevel = 0;
        const checkRangeStatus = (pos, state) => {
            if (state !== State.INVALID && arrayLevel === 1 && objLevel === 0) {
                currentState = state;
                lastValidPos = pos;
                lastValidState = state;
            }
            else {
                if (currentState !== State.INVALID) {
                    currentState = State.INVALID;
                    lastValidPos = scanner.getTokenOffset();
                }
            }
        };
        while (scanner.scan() !== 17 /* JSONSyntaxKind.EOF */) {
            const currentPos = scanner.getPosition();
            const kind = scanner.getToken();
            let goodKind = false;
            switch (kind) {
                case 3 /* JSONSyntaxKind.OpenBracketToken */:
                    goodKind = true;
                    arrayLevel++;
                    checkRangeStatus(currentPos, State.BEFORE_OBJECT);
                    break;
                case 4 /* JSONSyntaxKind.CloseBracketToken */:
                    goodKind = true;
                    arrayLevel--;
                    checkRangeStatus(currentPos, State.INVALID);
                    break;
                case 5 /* JSONSyntaxKind.CommaToken */:
                    goodKind = true;
                    checkRangeStatus(currentPos, State.BEFORE_OBJECT);
                    break;
                case 1 /* JSONSyntaxKind.OpenBraceToken */:
                    goodKind = true;
                    objLevel++;
                    checkRangeStatus(currentPos, State.INVALID);
                    break;
                case 2 /* JSONSyntaxKind.CloseBraceToken */:
                    goodKind = true;
                    objLevel--;
                    checkRangeStatus(currentPos, State.AFTER_OBJECT);
                    break;
                case 15 /* JSONSyntaxKind.Trivia */:
                case 14 /* JSONSyntaxKind.LineBreakTrivia */:
                    goodKind = true;
            }
            if (currentPos >= desiredPosition && (currentState !== State.INVALID || lastValidPos !== -1)) {
                let acceptPosition;
                let acceptState;
                if (currentState !== State.INVALID) {
                    acceptPosition = (goodKind ? currentPos : scanner.getTokenOffset());
                    acceptState = currentState;
                }
                else {
                    acceptPosition = lastValidPos;
                    acceptState = lastValidState;
                }
                if (acceptState === State.AFTER_OBJECT) {
                    return {
                        position: this.offsetToPosition(model, acceptPosition),
                        prepend: ',',
                        append: ''
                    };
                }
                else {
                    scanner.setPosition(acceptPosition);
                    return {
                        position: this.offsetToPosition(model, acceptPosition),
                        prepend: '',
                        append: this.hasOpenBrace(scanner) ? ',' : ''
                    };
                }
            }
        }
        // no valid position found!
        const modelLineCount = model.getLineCount();
        return {
            position: new Position(modelLineCount, model.getLineMaxColumn(modelLineCount)),
            prepend: '\n[',
            append: ']'
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hcnRTbmlwcGV0SW5zZXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvY29tbW9uL3NtYXJ0U25pcHBldEluc2VydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxhQUFhLElBQUksaUJBQWlCLEVBQWdDLE1BQU0saUNBQWlDLENBQUM7QUFDaEksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQVNoRSxNQUFNLE9BQU8sb0JBQW9CO0lBRXhCLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBb0I7UUFFL0MsT0FBTyxPQUFPLENBQUMsSUFBSSxFQUFFLGdDQUF1QixFQUFFLENBQUM7WUFDOUMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBRWhDLElBQUksSUFBSSwwQ0FBa0MsRUFBRSxDQUFDO2dCQUM1QyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQWlCLEVBQUUsTUFBYztRQUNoRSxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUN6QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ3hDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN2QyxLQUFLLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxVQUFVLElBQUksU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDaEUsTUFB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
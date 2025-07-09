/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../../../common/core/position.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
export function deserializePipePositions(text) {
    let resultText = '';
    let lineNumber = 1;
    let charIndex = 0;
    const positions = [];
    for (let i = 0, len = text.length; i < len; i++) {
        const chr = text.charAt(i);
        if (chr === '\n') {
            resultText += chr;
            lineNumber++;
            charIndex = 0;
            continue;
        }
        if (chr === '|') {
            positions.push(new Position(lineNumber, charIndex + 1));
        }
        else {
            resultText += chr;
            charIndex++;
        }
    }
    return [resultText, positions];
}
export function serializePipePositions(text, positions) {
    positions.sort(Position.compare);
    let resultText = '';
    let lineNumber = 1;
    let charIndex = 0;
    for (let i = 0, len = text.length; i < len; i++) {
        const chr = text.charAt(i);
        if (positions.length > 0 && positions[0].lineNumber === lineNumber && positions[0].column === charIndex + 1) {
            resultText += '|';
            positions.shift();
        }
        resultText += chr;
        if (chr === '\n') {
            lineNumber++;
            charIndex = 0;
        }
        else {
            charIndex++;
        }
    }
    if (positions.length > 0 && positions[0].lineNumber === lineNumber && positions[0].column === charIndex + 1) {
        resultText += '|';
        positions.shift();
    }
    if (positions.length > 0) {
        throw new Error(`Unexpected left over positions!!!`);
    }
    return resultText;
}
export function testRepeatedActionAndExtractPositions(text, initialPosition, action, record, stopCondition, options = {}) {
    const actualStops = [];
    withTestCodeEditor(text, options, (editor) => {
        editor.setPosition(initialPosition);
        while (true) {
            action(editor);
            actualStops.push(record(editor));
            if (stopCondition(editor)) {
                break;
            }
            if (actualStops.length > 1000) {
                throw new Error(`Endless loop detected involving position ${editor.getPosition()}!`);
            }
        }
    });
    return actualStops;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFRlc3RVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi93b3JkT3BlcmF0aW9ucy90ZXN0L2Jyb3dzZXIvd29yZFRlc3RVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUF1RCxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXJJLE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxJQUFZO0lBQ3BELElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUNwQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFDbkIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLE1BQU0sU0FBUyxHQUFlLEVBQUUsQ0FBQztJQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNsQixVQUFVLElBQUksR0FBRyxDQUFDO1lBQ2xCLFVBQVUsRUFBRSxDQUFDO1lBQ2IsU0FBUyxHQUFHLENBQUMsQ0FBQztZQUNkLFNBQVM7UUFDVixDQUFDO1FBQ0QsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDakIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQzthQUFN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
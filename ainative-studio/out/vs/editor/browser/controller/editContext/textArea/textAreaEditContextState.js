/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commonPrefixLength, commonSuffixLength } from '../../../../../base/common/strings.js';
export const _debugComposition = false;
export class TextAreaState {
    static { this.EMPTY = new TextAreaState('', 0, 0, null, undefined); }
    constructor(value, 
    /** the offset where selection starts inside `value` */
    selectionStart, 
    /** the offset where selection ends inside `value` */
    selectionEnd, 
    /** the editor range in the view coordinate system that matches the selection inside `value` */
    selection, 
    /** the visible line count (wrapped, not necessarily matching \n characters) for the text in `value` before `selectionStart` */
    newlineCountBeforeSelection) {
        this.value = value;
        this.selectionStart = selectionStart;
        this.selectionEnd = selectionEnd;
        this.selection = selection;
        this.newlineCountBeforeSelection = newlineCountBeforeSelection;
    }
    toString() {
        return `[ <${this.value}>, selectionStart: ${this.selectionStart}, selectionEnd: ${this.selectionEnd}]`;
    }
    static readFromTextArea(textArea, previousState) {
        const value = textArea.getValue();
        const selectionStart = textArea.getSelectionStart();
        const selectionEnd = textArea.getSelectionEnd();
        let newlineCountBeforeSelection = undefined;
        if (previousState) {
            const valueBeforeSelectionStart = value.substring(0, selectionStart);
            const previousValueBeforeSelectionStart = previousState.value.substring(0, previousState.selectionStart);
            if (valueBeforeSelectionStart === previousValueBeforeSelectionStart) {
                newlineCountBeforeSelection = previousState.newlineCountBeforeSelection;
            }
        }
        return new TextAreaState(value, selectionStart, selectionEnd, null, newlineCountBeforeSelection);
    }
    collapseSelection() {
        if (this.selectionStart === this.value.length) {
            return this;
        }
        return new TextAreaState(this.value, this.value.length, this.value.length, null, undefined);
    }
    isWrittenToTextArea(textArea, select) {
        const valuesEqual = this.value === textArea.getValue();
        if (!select) {
            return valuesEqual;
        }
        const selectionsEqual = this.selectionStart === textArea.getSelectionStart() && this.selectionEnd === textArea.getSelectionEnd();
        return selectionsEqual && valuesEqual;
    }
    writeToTextArea(reason, textArea, select) {
        if (_debugComposition) {
            console.log(`writeToTextArea ${reason}: ${this.toString()}`);
        }
        textArea.setValue(reason, this.value);
        if (select) {
            textArea.setSelectionRange(reason, this.selectionStart, this.selectionEnd);
        }
    }
    deduceEditorPosition(offset) {
        if (offset <= this.selectionStart) {
            const str = this.value.substring(offset, this.selectionStart);
            return this._finishDeduceEditorPosition(this.selection?.getStartPosition() ?? null, str, -1);
        }
        if (offset >= this.selectionEnd) {
            const str = this.value.substring(this.selectionEnd, offset);
            return this._finishDeduceEditorPosition(this.selection?.getEndPosition() ?? null, str, 1);
        }
        const str1 = this.value.substring(this.selectionStart, offset);
        if (str1.indexOf(String.fromCharCode(8230)) === -1) {
            return this._finishDeduceEditorPosition(this.selection?.getStartPosition() ?? null, str1, 1);
        }
        const str2 = this.value.substring(offset, this.selectionEnd);
        return this._finishDeduceEditorPosition(this.selection?.getEndPosition() ?? null, str2, -1);
    }
    _finishDeduceEditorPosition(anchor, deltaText, signum) {
        let lineFeedCnt = 0;
        let lastLineFeedIndex = -1;
        while ((lastLineFeedIndex = deltaText.indexOf('\n', lastLineFeedIndex + 1)) !== -1) {
            lineFeedCnt++;
        }
        return [anchor, signum * deltaText.length, lineFeedCnt];
    }
    static deduceInput(previousState, currentState, couldBeEmojiInput) {
        if (!previousState) {
            // This is the EMPTY state
            return {
                text: '',
                replacePrevCharCnt: 0,
                replaceNextCharCnt: 0,
                positionDelta: 0
            };
        }
        if (_debugComposition) {
            console.log('------------------------deduceInput');
            console.log(`PREVIOUS STATE: ${previousState.toString()}`);
            console.log(`CURRENT STATE: ${currentState.toString()}`);
        }
        const prefixLength = Math.min(commonPrefixLength(previousState.value, currentState.value), previousState.selectionStart, currentState.selectionStart);
        const suffixLength = Math.min(commonSuffixLength(previousState.value, currentState.value), previousState.value.length - previousState.selectionEnd, currentState.value.length - currentState.selectionEnd);
        const previousValue = previousState.value.substring(prefixLength, previousState.value.length - suffixLength);
        const currentValue = currentState.value.substring(prefixLength, currentState.value.length - suffixLength);
        const previousSelectionStart = previousState.selectionStart - prefixLength;
        const previousSelectionEnd = previousState.selectionEnd - prefixLength;
        const currentSelectionStart = currentState.selectionStart - prefixLength;
        const currentSelectionEnd = currentState.selectionEnd - prefixLength;
        if (_debugComposition) {
            console.log(`AFTER DIFFING PREVIOUS STATE: <${previousValue}>, selectionStart: ${previousSelectionStart}, selectionEnd: ${previousSelectionEnd}`);
            console.log(`AFTER DIFFING CURRENT STATE: <${currentValue}>, selectionStart: ${currentSelectionStart}, selectionEnd: ${currentSelectionEnd}`);
        }
        if (currentSelectionStart === currentSelectionEnd) {
            // no current selection
            const replacePreviousCharacters = (previousState.selectionStart - prefixLength);
            if (_debugComposition) {
                console.log(`REMOVE PREVIOUS: ${replacePreviousCharacters} chars`);
            }
            return {
                text: currentValue,
                replacePrevCharCnt: replacePreviousCharacters,
                replaceNextCharCnt: 0,
                positionDelta: 0
            };
        }
        // there is a current selection => composition case
        const replacePreviousCharacters = previousSelectionEnd - previousSelectionStart;
        return {
            text: currentValue,
            replacePrevCharCnt: replacePreviousCharacters,
            replaceNextCharCnt: 0,
            positionDelta: 0
        };
    }
    static deduceAndroidCompositionInput(previousState, currentState) {
        if (!previousState) {
            // This is the EMPTY state
            return {
                text: '',
                replacePrevCharCnt: 0,
                replaceNextCharCnt: 0,
                positionDelta: 0
            };
        }
        if (_debugComposition) {
            console.log('------------------------deduceAndroidCompositionInput');
            console.log(`PREVIOUS STATE: ${previousState.toString()}`);
            console.log(`CURRENT STATE: ${currentState.toString()}`);
        }
        if (previousState.value === currentState.value) {
            return {
                text: '',
                replacePrevCharCnt: 0,
                replaceNextCharCnt: 0,
                positionDelta: currentState.selectionEnd - previousState.selectionEnd
            };
        }
        const prefixLength = Math.min(commonPrefixLength(previousState.value, currentState.value), previousState.selectionEnd);
        const suffixLength = Math.min(commonSuffixLength(previousState.value, currentState.value), previousState.value.length - previousState.selectionEnd);
        const previousValue = previousState.value.substring(prefixLength, previousState.value.length - suffixLength);
        const currentValue = currentState.value.substring(prefixLength, currentState.value.length - suffixLength);
        const previousSelectionStart = previousState.selectionStart - prefixLength;
        const previousSelectionEnd = previousState.selectionEnd - prefixLength;
        const currentSelectionStart = currentState.selectionStart - prefixLength;
        const currentSelectionEnd = currentState.selectionEnd - prefixLength;
        if (_debugComposition) {
            console.log(`AFTER DIFFING PREVIOUS STATE: <${previousValue}>, selectionStart: ${previousSelectionStart}, selectionEnd: ${previousSelectionEnd}`);
            console.log(`AFTER DIFFING CURRENT STATE: <${currentValue}>, selectionStart: ${currentSelectionStart}, selectionEnd: ${currentSelectionEnd}`);
        }
        return {
            text: currentValue,
            replacePrevCharCnt: previousSelectionEnd,
            replaceNextCharCnt: previousValue.length - previousSelectionEnd,
            positionDelta: currentSelectionEnd - currentValue.length
        };
    }
    static fromScreenReaderContentState(screenReaderContentState) {
        return new TextAreaState(screenReaderContentState.value, screenReaderContentState.selectionStart, screenReaderContentState.selectionEnd, screenReaderContentState.selection, screenReaderContentState.newlineCountBeforeSelection);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFFZGl0Q29udGV4dFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvdGV4dEFyZWEvdGV4dEFyZWFFZGl0Q29udGV4dFN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBSy9GLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQztBQWtCdkMsTUFBTSxPQUFPLGFBQWE7YUFFRixVQUFLLEdBQUcsSUFBSSxhQUFhLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRTVFLFlBQ2lCLEtBQWE7SUFDN0IsdURBQXVEO0lBQ3ZDLGNBQXNCO0lBQ3RDLHFEQUFxRDtJQUNyQyxZQUFvQjtJQUNwQywrRkFBK0Y7SUFDL0UsU0FBdUI7SUFDdkMsK0hBQStIO0lBQy9HLDJCQUErQztRQVIvQyxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBRWIsbUJBQWMsR0FBZCxjQUFjLENBQVE7UUFFdEIsaUJBQVksR0FBWixZQUFZLENBQVE7UUFFcEIsY0FBUyxHQUFULFNBQVMsQ0FBYztRQUV2QixnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQW9CO0lBQzVELENBQUM7SUFFRSxRQUFRO1FBQ2QsT0FBTyxNQUFNLElBQUksQ0FBQyxLQUFLLHNCQUFzQixJQUFJLENBQUMsY0FBYyxtQkFBbUIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDO0lBQ3pHLENBQUM7SUFFTSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBMEIsRUFBRSxhQUFtQztRQUM3RixNQUFNLEtBQUssR0FB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
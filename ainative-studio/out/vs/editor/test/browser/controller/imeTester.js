/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import * as dom from '../../../../base/browser/dom.js';
import * as browser from '../../../../base/browser/browser.js';
import * as platform from '../../../../base/common/platform.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { TestAccessibilityService } from '../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { PagedScreenReaderStrategy } from '../../../browser/controller/editContext/screenReaderUtils.js';
import { TextAreaState } from '../../../browser/controller/editContext/textArea/textAreaEditContextState.js';
import { TextAreaInput, TextAreaWrapper } from '../../../browser/controller/editContext/textArea/textAreaEditContextInput.js';
// To run this test, open imeTester.html
class SingleLineTestModel {
    constructor(line) {
        this._line = line;
    }
    _setText(text) {
        this._line = text;
    }
    getLineMaxColumn(lineNumber) {
        return this._line.length + 1;
    }
    getValueInRange(range, eol) {
        return this._line.substring(range.startColumn - 1, range.endColumn - 1);
    }
    getValueLengthInRange(range, eol) {
        return this.getValueInRange(range, eol).length;
    }
    modifyPosition(position, offset) {
        const column = Math.min(this.getLineMaxColumn(position.lineNumber), Math.max(1, position.column + offset));
        return new Position(position.lineNumber, column);
    }
    getModelLineContent(lineNumber) {
        return this._line;
    }
    getLineCount() {
        return 1;
    }
}
class TestView {
    constructor(model) {
        this._model = model;
    }
    paint(output) {
        dom.clearNode(output);
        for (let i = 1; i <= this._model.getLineCount(); i++) {
            const textNode = document.createTextNode(this._model.getModelLineContent(i));
            output.appendChild(textNode);
            const br = document.createElement('br');
            output.appendChild(br);
        }
    }
}
function doCreateTest(description, inputStr, expectedStr) {
    let cursorOffset = 0;
    let cursorLength = 0;
    const container = document.createElement('div');
    container.className = 'container';
    const title = document.createElement('div');
    title.className = 'title';
    const inputStrStrong = document.createElement('strong');
    inputStrStrong.innerText = inputStr;
    title.innerText = description + '. Type ';
    title.appendChild(inputStrStrong);
    container.appendChild(title);
    const startBtn = document.createElement('button');
    startBtn.innerText = 'Start';
    container.appendChild(startBtn);
    const input = document.createElement('textarea');
    input.setAttribute('rows', '10');
    input.setAttribute('cols', '40');
    container.appendChild(input);
    const model = new SingleLineTestModel('some  text');
    const textAreaInputHost = {
        getDataToCopy: () => {
            return {
                isFromEmptySelection: false,
                multicursorText: null,
                text: '',
                html: undefined,
                mode: null
            };
        },
        getScreenReaderContent: () => {
            const selection = new Range(1, 1 + cursorOffset, 1, 1 + cursorOffset + cursorLength);
            const screenReaderContentState = PagedScreenReaderStrategy.fromEditorSelection(model, selection, 10, true);
            return TextAreaState.fromScreenReaderContentState(screenReaderContentState);
        },
        deduceModelPosition: (viewAnchorPosition, deltaOffset, lineFeedCnt) => {
            return null;
        }
    };
    const handler = new TextAreaInput(textAreaInputHost, new TextAreaWrapper(input), platform.OS, {
        isAndroid: browser.isAndroid,
        isFirefox: browser.isFirefox,
        isChrome: browser.isChrome,
        isSafari: browser.isSafari,
    }, new TestAccessibilityService(), new NullLogService());
    const output = document.createElement('pre');
    output.className = 'output';
    container.appendChild(output);
    const check = document.createElement('pre');
    check.className = 'check';
    container.appendChild(check);
    const br = document.createElement('br');
    br.style.clear = 'both';
    container.appendChild(br);
    const view = new TestView(model);
    const updatePosition = (off, len) => {
        cursorOffset = off;
        cursorLength = len;
        handler.writeNativeTextAreaContent('selection changed');
        handler.focusTextArea();
    };
    const updateModelAndPosition = (text, off, len) => {
        model._setText(text);
        updatePosition(off, len);
        view.paint(output);
        const expected = 'some ' + expectedStr + ' text';
        if (text === expected) {
            check.innerText = '[GOOD]';
            check.className = 'check good';
        }
        else {
            check.innerText = '[BAD]';
            check.className = 'check bad';
        }
        check.appendChild(document.createTextNode(expected));
    };
    handler.onType((e) => {
        console.log('type text: ' + e.text + ', replaceCharCnt: ' + e.replacePrevCharCnt);
        const text = model.getModelLineContent(1);
        const preText = text.substring(0, cursorOffset - e.replacePrevCharCnt);
        const postText = text.substring(cursorOffset + cursorLength);
        const midText = e.text;
        updateModelAndPosition(preText + midText + postText, (preText + midText).length, 0);
    });
    view.paint(output);
    startBtn.onclick = function () {
        updateModelAndPosition('some  text', 5, 0);
        input.focus();
    };
    return container;
}
const TESTS = [
    { description: 'Japanese IME 1', in: 'sennsei [Enter]', out: 'せんせい' },
    { description: 'Japanese IME 2', in: 'konnichiha [Enter]', out: 'こんいちは' },
    { description: 'Japanese IME 3', in: 'mikann [Enter]', out: 'みかん' },
    { description: 'Korean IME 1', in: 'gksrmf [Space]', out: '한글 ' },
    { description: 'Chinese IME 1', in: '.,', out: '。，' },
    { description: 'Chinese IME 2', in: 'ni [Space] hao [Space]', out: '你好' },
    { description: 'Chinese IME 3', in: 'hazni [Space]', out: '哈祝你' },
    { description: 'Mac dead key 1', in: '`.', out: '`.' },
    { description: 'Mac hold key 1', in: 'e long press and 1', out: 'é' }
];
TESTS.forEach((t) => {
    mainWindow.document.body.appendChild(doCreateTest(t.description, t.in, t.out));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lVGVzdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb250cm9sbGVyL2ltZVRlc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTlELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLE9BQU8sTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFnQix5QkFBeUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUM3RyxPQUFPLEVBQXNCLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUVsSix3Q0FBd0M7QUFFeEMsTUFBTSxtQkFBbUI7SUFJeEIsWUFBWSxJQUFZO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBWTtRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsVUFBa0I7UUFDbEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFD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
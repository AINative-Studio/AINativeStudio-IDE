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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lVGVzdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29udHJvbGxlci9pbWVUZXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU5RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxPQUFPLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDdEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBZ0IseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN2SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEVBQThFLENBQUM7QUFDN0csT0FBTyxFQUFzQixhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEVBQThFLENBQUM7QUFFbEosd0NBQXdDO0FBRXhDLE1BQU0sbUJBQW1CO0lBSXhCLFlBQVksSUFBWTtRQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsUUFBUSxDQUFDLElBQVk7UUFDcEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVELGdCQUFnQixDQUFDLFVBQWtCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FB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
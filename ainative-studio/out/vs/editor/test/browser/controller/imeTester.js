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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lVGVzdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbnRyb2xsZXIvaW1lVGVzdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssT0FBTyxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQWdCLHlCQUF5QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdkgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhFQUE4RSxDQUFDO0FBQzdHLE9BQU8sRUFBc0IsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLDhFQUE4RSxDQUFDO0FBRWxKLHdDQUF3QztBQUV4QyxNQUFNLG1CQUFtQjtJQUl4QixZQUFZLElBQVk7UUFDdkIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFZO1FBQ3BCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxVQUFrQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxLQUFL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
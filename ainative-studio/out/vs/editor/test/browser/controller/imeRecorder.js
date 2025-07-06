/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import * as browser from '../../../../base/browser/browser.js';
import * as platform from '../../../../base/common/platform.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { TextAreaWrapper } from '../../../browser/controller/editContext/textArea/textAreaEditContextInput.js';
(() => {
    const startButton = mainWindow.document.getElementById('startRecording');
    const endButton = mainWindow.document.getElementById('endRecording');
    let inputarea;
    const disposables = new DisposableStore();
    let originTimeStamp = 0;
    let recorded = {
        env: null,
        initial: null,
        events: [],
        final: null
    };
    const readTextareaState = () => {
        return {
            selectionDirection: inputarea.selectionDirection,
            selectionEnd: inputarea.selectionEnd,
            selectionStart: inputarea.selectionStart,
            value: inputarea.value,
        };
    };
    startButton.onclick = () => {
        disposables.clear();
        startTest();
        originTimeStamp = 0;
        recorded = {
            env: {
                OS: platform.OS,
                browser: {
                    isAndroid: browser.isAndroid,
                    isFirefox: browser.isFirefox,
                    isChrome: browser.isChrome,
                    isSafari: browser.isSafari
                }
            },
            initial: readTextareaState(),
            events: [],
            final: null
        };
    };
    endButton.onclick = () => {
        recorded.final = readTextareaState();
        console.log(printRecordedData());
    };
    function printRecordedData() {
        const lines = [];
        lines.push(`const recorded: IRecorded = {`);
        lines.push(`\tenv: ${JSON.stringify(recorded.env)}, `);
        lines.push(`\tinitial: ${printState(recorded.initial)}, `);
        lines.push(`\tevents: [\n\t\t${recorded.events.map(ev => printEvent(ev)).join(',\n\t\t')}\n\t],`);
        lines.push(`\tfinal: ${printState(recorded.final)},`);
        lines.push(`}`);
        return lines.join('\n');
        function printString(str) {
            return str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
        }
        function printState(state) {
            return `{ value: '${printString(state.value)}', selectionStart: ${state.selectionStart}, selectionEnd: ${state.selectionEnd}, selectionDirection: '${state.selectionDirection}' }`;
        }
        function printEvent(ev) {
            if (ev.type === 'keydown' || ev.type === 'keypress' || ev.type === 'keyup') {
                return `{ timeStamp: ${ev.timeStamp.toFixed(2)}, state: ${printState(ev.state)}, type: '${ev.type}', altKey: ${ev.altKey}, charCode: ${ev.charCode}, code: '${ev.code}', ctrlKey: ${ev.ctrlKey}, isComposing: ${ev.isComposing}, key: '${ev.key}', keyCode: ${ev.keyCode}, location: ${ev.location}, metaKey: ${ev.metaKey}, repeat: ${ev.repeat}, shiftKey: ${ev.shiftKey} }`;
            }
            if (ev.type === 'compositionstart' || ev.type === 'compositionupdate' || ev.type === 'compositionend') {
                return `{ timeStamp: ${ev.timeStamp.toFixed(2)}, state: ${printState(ev.state)}, type: '${ev.type}', data: '${printString(ev.data)}' }`;
            }
            if (ev.type === 'beforeinput' || ev.type === 'input') {
                return `{ timeStamp: ${ev.timeStamp.toFixed(2)}, state: ${printState(ev.state)}, type: '${ev.type}', data: ${ev.data === null ? 'null' : `'${printString(ev.data)}'`}, inputType: '${ev.inputType}', isComposing: ${ev.isComposing} }`;
            }
            return JSON.stringify(ev);
        }
    }
    function startTest() {
        inputarea = document.createElement('textarea');
        mainWindow.document.body.appendChild(inputarea);
        inputarea.focus();
        disposables.add(toDisposable(() => {
            inputarea.remove();
        }));
        const wrapper = disposables.add(new TextAreaWrapper(inputarea));
        wrapper.setValue('', `aaaa`);
        wrapper.setSelectionRange('', 2, 2);
        const recordEvent = (e) => {
            recorded.events.push(e);
        };
        const recordKeyboardEvent = (e) => {
            if (e.type !== 'keydown' && e.type !== 'keypress' && e.type !== 'keyup') {
                throw new Error(`Not supported!`);
            }
            if (originTimeStamp === 0) {
                originTimeStamp = e.timeStamp;
            }
            const ev = {
                timeStamp: e.timeStamp - originTimeStamp,
                state: readTextareaState(),
                type: e.type,
                altKey: e.altKey,
                charCode: e.charCode,
                code: e.code,
                ctrlKey: e.ctrlKey,
                isComposing: e.isComposing,
                key: e.key,
                keyCode: e.keyCode,
                location: e.location,
                metaKey: e.metaKey,
                repeat: e.repeat,
                shiftKey: e.shiftKey
            };
            recordEvent(ev);
        };
        const recordCompositionEvent = (e) => {
            if (e.type !== 'compositionstart' && e.type !== 'compositionupdate' && e.type !== 'compositionend') {
                throw new Error(`Not supported!`);
            }
            if (originTimeStamp === 0) {
                originTimeStamp = e.timeStamp;
            }
            const ev = {
                timeStamp: e.timeStamp - originTimeStamp,
                state: readTextareaState(),
                type: e.type,
                data: e.data,
            };
            recordEvent(ev);
        };
        const recordInputEvent = (e) => {
            if (e.type !== 'beforeinput' && e.type !== 'input') {
                throw new Error(`Not supported!`);
            }
            if (originTimeStamp === 0) {
                originTimeStamp = e.timeStamp;
            }
            const ev = {
                timeStamp: e.timeStamp - originTimeStamp,
                state: readTextareaState(),
                type: e.type,
                data: e.data,
                inputType: e.inputType,
                isComposing: e.isComposing,
            };
            recordEvent(ev);
        };
        wrapper.onKeyDown(recordKeyboardEvent);
        wrapper.onKeyPress(recordKeyboardEvent);
        wrapper.onKeyUp(recordKeyboardEvent);
        wrapper.onCompositionStart(recordCompositionEvent);
        wrapper.onCompositionUpdate(recordCompositionEvent);
        wrapper.onCompositionEnd(recordCompositionEvent);
        wrapper.onBeforeInput(recordInputEvent);
        wrapper.onInput(recordInputEvent);
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29udHJvbGxlci9pbWVSZWNvcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXJGLE9BQU8sS0FBSyxPQUFPLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhFQUE4RSxDQUFDO0FBRS9HLENBQUMsR0FBRyxFQUFFO0lBRUwsTUFBTSxXQUFXLEdBQXNCLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFFLENBQUM7SUFDN0YsTUFBTSxTQUFTLEdBQXNCLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBRSxDQUFDO0lBRXpGLElBQUksU0FBOEIsQ0FBQztJQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztJQUN4QixJQUFJLFFBQVEsR0FBYztRQUN6QixHQUFHLEVBQUUsSUFBSztRQUNWLE9BQU8sRUFBRSxJQUFLO1FBQ2QsTUFBTSxFQUFFLEVBQUU7UUFDVixLQUFLLEVBQUUsSUFBSztLQUNaLENBQUM7SUFFRixNQUFNLGlCQUFpQixHQUFHLEdBQTJCLEVBQUU7UUFDdEQsT0FBTztZQUNOLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxrQkFBa0I7WUFDaEQsWUFBWSxFQUFFLFNBQVMsQ0FB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
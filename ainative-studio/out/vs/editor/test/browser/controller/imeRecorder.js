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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbnRyb2xsZXIvaW1lUmVjb3JkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVyRixPQUFPLEtBQUssT0FBTyxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUUvRyxDQUFDLEdBQUcsRUFBRTtJQUVMLE1BQU0sV0FBVyxHQUFzQixVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFDO0lBQzdGLE1BQU0sU0FBUyxHQUFzQixVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUUsQ0FBQztJQUV6RixJQUFJLFNBQThCLENBQUM7SUFDbkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7SUFDeEIsSUFBSSxRQUFRLEdBQWM7UUFDekIsR0FBRyxFQUFFLElBQUs7UUFDVixPQUFPLEVBQUUsSUFBSztRQUNkLE1BQU0sRUFBRSxFQUFFO1FBQ1YsS0FBSyxFQUFFLElBQUs7S0FDWixDQUFDO0lBRUYsTUFBTSxpQkFBaUIsR0FBRyxHQUEyQixFQUFFO1FBQ3RELE9BQU87WUFDTixrQkFBa0IsRUFBRSxTQUFTLENBQUMsa0JBQWtCO1lBQ2hELFlBQVksRUFBRSxTQUFTLENBQUMsWUFB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
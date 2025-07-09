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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1lUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb250cm9sbGVyL2ltZVJlY29yZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFckYsT0FBTyxLQUFLLE9BQU8sTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEVBQThFLENBQUM7QUFFL0csQ0FBQyxHQUFHLEVBQUU7SUFFTCxNQUFNLFdBQVcsR0FBc0IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUUsQ0FBQztJQUM3RixNQUFNLFNBQVMsR0FBc0IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFFLENBQUM7SUFFekYsSUFBSSxTQUE4QixDQUFDO0lBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLElBQUksUUFBUSxHQUFjO1FBQ3pCLEdBQUcsRUFBRSxJQUFLO1FBQ1YsT0FBTyxFQUFFLElBQUs7UUFDZCxNQUFNLEVBQUUsRUFBRTtRQUNWLEtBQUssRUFBRSxJQUFLO0tBQ1osQ0FBQztJQUVGLE1BQU0saUJBQWlCLEdBQUcsR0FBMkIsRUFBRTtRQUN0RCxPQUFPO1lBQ04sa0JBQWtCLEVBQUUsU0FBUyxDQUFDLGtCQUFrQjtZQUNoRCxZQUFZLEVBQUUsU0FBUyxDQUFDLFlBQVk7WUFDcEMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO1lBQ3hDLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSztTQUN0QixDQUFDO0lBQ0gsQ0FBQyxDQUFDO0lBRUYsV0FBVyxDQUFDLE9BQU8sR0FBRyxHQUFHLEVBQUU7UUFDMUIsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BCLFNBQVMsRUFBRSxDQUFDO1FBQ1osZUFBZSxHQUFHLENBQUMsQ0FBQztRQUNwQixRQUFRLEdBQUc7WUFDVixHQUFHLEVBQUU7Z0JBQ0osRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO2dCQUNmLE9BQU8sRUFBRTtvQkFDUixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7b0JBQzVCLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztvQkFDNUIsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO29CQUMxQixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7aUJBQzFCO2FBQ0Q7WUFDRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUU7WUFDNUIsTUFBTSxFQUFFLEVBQUU7WUFDVixLQUFLLEVBQUUsSUFBSztTQUNaLENBQUM7SUFDSCxDQUFDLENBQUM7SUFDRixTQUFTLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRTtRQUN4QixRQUFRLENBQUMsS0FBSyxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDO0lBRUYsU0FBUyxpQkFBaUI7UUFDekIsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLEtBQUssQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUM1QyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZELEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRCxLQUFLLENBQUMsSUFBSSxDQUFDLG9CQUFvQixRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFaEIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXhCLFNBQVMsV0FBVyxDQUFDLEdBQVc7WUFDL0IsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFDRCxTQUFTLFVBQVUsQ0FBQyxLQUE2QjtZQUNoRCxPQUFPLGFBQWEsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEtBQUssQ0FBQyxjQUFjLG1CQUFtQixLQUFLLENBQUMsWUFBWSwwQkFBMEIsS0FBSyxDQUFDLGtCQUFrQixLQUFLLENBQUM7UUFDcEwsQ0FBQztRQUNELFNBQVMsVUFBVSxDQUFDLEVBQWtCO1lBQ3JDLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxVQUFVLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDNUUsT0FBTyxnQkFBZ0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxNQUFNLGVBQWUsRUFBRSxDQUFDLFFBQVEsWUFBWSxFQUFFLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxPQUFPLGtCQUFrQixFQUFFLENBQUMsV0FBVyxXQUFXLEVBQUUsQ0FBQyxHQUFHLGVBQWUsRUFBRSxDQUFDLE9BQU8sZUFBZSxFQUFFLENBQUMsUUFBUSxjQUFjLEVBQUUsQ0FBQyxPQUFPLGFBQWEsRUFBRSxDQUFDLE1BQU0sZUFBZSxFQUFFLENBQUMsUUFBUSxJQUFJLENBQUM7WUFDaFgsQ0FBQztZQUNELElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxrQkFBa0IsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLG1CQUFtQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdkcsT0FBTyxnQkFBZ0IsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxhQUFhLFdBQVcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUN6SSxDQUFDO1lBQ0QsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLGFBQWEsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUN0RCxPQUFPLGdCQUFnQixFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxXQUFXLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLGlCQUFpQixFQUFFLENBQUMsU0FBUyxtQkFBbUIsRUFBRSxDQUFDLFdBQVcsSUFBSSxDQUFDO1lBQ3hPLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLFNBQVM7UUFDakIsU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQixXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDakMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFaEUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0IsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFpQixFQUFFLEVBQUU7WUFDekMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekIsQ0FBQyxDQUFDO1FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQWdCLEVBQVEsRUFBRTtZQUN0RCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ3pFLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBQ0QsSUFBSSxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLGVBQWUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQy9CLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBMkI7Z0JBQ2xDLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLGVBQWU7Z0JBQ3hDLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtnQkFDMUIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTTtnQkFDaEIsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRO2dCQUNwQixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7Z0JBQ1osT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO2dCQUNsQixXQUFXLEVBQUUsQ0FBQyxDQUFDLFdBQVc7Z0JBQzFCLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRztnQkFDVixPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU87Z0JBQ2xCLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUTtnQkFDcEIsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO2dCQUNsQixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU07Z0JBQ2hCLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUTthQUNwQixDQUFDO1lBQ0YsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQztRQUVGLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFtQixFQUFRLEVBQUU7WUFDNUQsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssbUJBQW1CLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNwRyxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDbkMsQ0FBQztZQUNELElBQUksZUFBZSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzQixlQUFlLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUMvQixDQUFDO1lBQ0QsTUFBTSxFQUFFLEdBQThCO2dCQUNyQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxlQUFlO2dCQUN4QyxLQUFLLEVBQUUsaUJBQWlCLEVBQUU7Z0JBQzFCLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDWixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7YUFDWixDQUFDO1lBQ0YsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQztRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFhLEVBQVEsRUFBRTtZQUNoRCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBQ0QsSUFBSSxlQUFlLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLGVBQWUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQy9CLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBd0I7Z0JBQy9CLFNBQVMsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLGVBQWU7Z0JBQ3hDLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtnQkFDMUIsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDWixTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVM7Z0JBQ3RCLFdBQVcsRUFBRSxDQUFDLENBQUMsV0FBVzthQUMxQixDQUFDO1lBQ0YsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQztRQUVGLE9BQU8sQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN2QyxPQUFPLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ25ELE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN4QyxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbkMsQ0FBQztBQUVGLENBQUMsQ0FBQyxFQUFFLENBQUMifQ==
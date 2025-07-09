/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { AsyncIterableSource } from '../../../../base/common/async.js';
import { getNWords } from '../../chat/common/chatWordCounter.js';
export async function performAsyncTextEdit(model, edit, progress, obs) {
    const [id] = model.deltaDecorations([], [{
            range: edit.range,
            options: {
                description: 'asyncTextEdit',
                stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */
            }
        }]);
    let first = true;
    for await (const part of edit.newText) {
        if (model.isDisposed()) {
            break;
        }
        const range = model.getDecorationRange(id);
        if (!range) {
            throw new Error('FAILED to perform async replace edit because the anchor decoration was removed');
        }
        const edit = first
            ? EditOperation.replace(range, part) // first edit needs to override the "anchor"
            : EditOperation.insert(range.getEndPosition(), part);
        obs?.start();
        model.pushEditOperations(null, [edit], (undoEdits) => {
            progress?.report(undoEdits);
            return null;
        });
        obs?.stop();
        first = false;
    }
}
export function asProgressiveEdit(interval, edit, wordsPerSec, token) {
    wordsPerSec = Math.max(30, wordsPerSec);
    const stream = new AsyncIterableSource();
    let newText = edit.text ?? '';
    interval.cancelAndSet(() => {
        if (token.isCancellationRequested) {
            return;
        }
        const r = getNWords(newText, 1);
        stream.emitOne(r.value);
        newText = newText.substring(r.value.length);
        if (r.isFullString) {
            interval.cancel();
            stream.resolve();
            d.dispose();
        }
    }, 1000 / wordsPerSec);
    // cancel ASAP
    const d = token.onCancellationRequested(() => {
        interval.cancel();
        stream.resolve();
        d.dispose();
    });
    return {
        range: edit.range,
        newText: stream.asyncIterable
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUtoRixPQUFPLEVBQWlCLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBV2pFLE1BQU0sQ0FBQyxLQUFLLFVBQVUsb0JBQW9CLENBQUMsS0FBaUIsRUFBRSxJQUFtQixFQUFFLFFBQTJDLEVBQUUsR0FBbUI7SUFFbEosTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsT0FBTyxFQUFFO2dCQUNSLFdBQVcsRUFBRSxlQUFlO2dCQUM1QixVQUFVLDZEQUFxRDthQUMvRDtTQUNELENBQUMsQ0FBQyxDQUFDO0lBRUosSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV2QyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE1BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0ZBQWdGLENBQUMsQ0FBQztRQUNuRyxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsS0FBSztZQUNqQixDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsNENBQTRDO1lBQ2pGLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0RCxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDYixLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNwRCxRQUFRLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDWixLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ2YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsUUFBdUIsRUFBRSxJQUFvQyxFQUFFLFdBQW1CLEVBQUUsS0FBd0I7SUFFN0ksV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRXhDLE1BQU0sTUFBTSxHQUFHLElBQUksbUJBQW1CLEVBQVUsQ0FBQztJQUNqRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUU5QixRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtRQUMxQixJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3BCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2IsQ0FBQztJQUVGLENBQUMsRUFBRSxJQUFJLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFFdkIsY0FBYztJQUNkLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7UUFDNUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU87UUFDTixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7UUFDakIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxhQUFhO0tBQzdCLENBQUM7QUFDSCxDQUFDIn0=
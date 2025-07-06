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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBS2hGLE9BQU8sRUFBaUIsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV0RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFXakUsTUFBTSxDQUFDLEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxLQUFpQixFQUFFLElBQW1CLEVBQUUsUUFBMkMsRUFBRSxHQUFtQjtJQUVsSixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixPQUFPLEVBQUU7Z0JBQ1IsV0FBVyxFQUFFLGVBQWU7Z0JBQzVCLFVBQVUsNkRBQXFEO2FBQy9EO1NBQ0QsQ0FBQyxDQUFDLENBQUM7SUFFSixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDakIsSUFBSSxLQUFLLEVBQUUsTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXZDLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDeEIsTUFBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxnRkFBZ0YsQ0FBQyxDQUFDO1FBQ25HLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxLQUFLO1lBQ2pCLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyw0Q0FBNEM7WUFDakYsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUNiLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQ3BELFFBQVEsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDNUIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztRQUNILEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUNaLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDZixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxRQUF1QixFQUFFLElBQW9DLEVBQUUsV0FBbUIsRUFBRSxLQUF3QjtJQUU3SSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFeEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsRUFBVSxDQUFDO0lBQ2pELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0lBRTlCLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1FBQzFCLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEIsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNqQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDYixDQUFDO0lBRUYsQ0FBQyxFQUFFLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQztJQUV2QixjQUFjO0lBQ2QsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtRQUM1QyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbEIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTztRQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztRQUNqQixPQUFPLEVBQUUsTUFBTSxDQUFDLGFBQWE7S0FDN0IsQ0FBQztBQUNILENBQUMifQ==
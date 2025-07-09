/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken, CancellationTokenSource } from '../../common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('CancellationToken', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('None', () => {
        assert.strictEqual(CancellationToken.None.isCancellationRequested, false);
        assert.strictEqual(typeof CancellationToken.None.onCancellationRequested, 'function');
    });
    test('cancel before token', function () {
        const source = new CancellationTokenSource();
        assert.strictEqual(source.token.isCancellationRequested, false);
        source.cancel();
        assert.strictEqual(source.token.isCancellationRequested, true);
        return new Promise(resolve => {
            source.token.onCancellationRequested(() => resolve());
        });
    });
    test('cancel happens only once', function () {
        const source = new CancellationTokenSource();
        assert.strictEqual(source.token.isCancellationRequested, false);
        let cancelCount = 0;
        function onCancel() {
            cancelCount += 1;
        }
        store.add(source.token.onCancellationRequested(onCancel));
        source.cancel();
        source.cancel();
        assert.strictEqual(cancelCount, 1);
    });
    test('cancel calls all listeners', function () {
        let count = 0;
        const source = new CancellationTokenSource();
        store.add(source.token.onCancellationRequested(() => count++));
        store.add(source.token.onCancellationRequested(() => count++));
        store.add(source.token.onCancellationRequested(() => count++));
        source.cancel();
        assert.strictEqual(count, 3);
    });
    test('token stays the same', function () {
        let source = new CancellationTokenSource();
        let token = source.token;
        assert.ok(token === source.token); // doesn't change on get
        source.cancel();
        assert.ok(token === source.token); // doesn't change after cancel
        source.cancel();
        assert.ok(token === source.token); // doesn't change after 2nd cancel
        source = new CancellationTokenSource();
        source.cancel();
        token = source.token;
        assert.ok(token === source.token); // doesn't change on get
    });
    test('dispose calls no listeners', function () {
        let count = 0;
        const source = new CancellationTokenSource();
        store.add(source.token.onCancellationRequested(() => count++));
        source.dispose();
        source.cancel();
        assert.strictEqual(count, 0);
    });
    test('dispose calls no listeners (unless told to cancel)', function () {
        let count = 0;
        const source = new CancellationTokenSource();
        store.add(source.token.onCancellationRequested(() => count++));
        source.dispose(true);
        // source.cancel();
        assert.strictEqual(count, 1);
    });
    test('dispose does not cancel', function () {
        const source = new CancellationTokenSource();
        source.dispose();
        assert.strictEqual(source.token.isCancellationRequested, false);
    });
    test('parent cancels child', function () {
        const parent = new CancellationTokenSource();
        const child = new CancellationTokenSource(parent.token);
        let count = 0;
        store.add(child.token.onCancellationRequested(() => count++));
        parent.cancel();
        assert.strictEqual(count, 1);
        assert.strictEqual(child.token.isCancellationRequested, true);
        assert.strictEqual(parent.token.isCancellationRequested, true);
        child.dispose();
        parent.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsbGF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9jYW5jZWxsYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDMUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxtQkFBbUIsRUFBRTtJQUUxQixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdkYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFFM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFaEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRS9ELE9BQU8sSUFBSSxPQUFPLENBQU8sT0FB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
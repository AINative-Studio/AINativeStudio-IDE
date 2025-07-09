/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ThreadStatusScheduler } from '../../browser/debugSession.js';
suite('DebugSession - ThreadStatusScheduler', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('cancel base case', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        await scheduler.run(Promise.resolve([1]), async (threadId, token) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token.isCancellationRequested, false);
            scheduler.cancel([1]);
            assert.strictEqual(token.isCancellationRequested, true);
        });
    });
    test('cancel global', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        await scheduler.run(Promise.resolve([1]), async (threadId, token) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token.isCancellationRequested, false);
            scheduler.cancel(undefined);
            assert.strictEqual(token.isCancellationRequested, true);
        });
    });
    test('cancels when new work comes in', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve([1]), async (threadId, token1) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token1.isCancellationRequested, false);
            await scheduler.run(Promise.resolve([1]), async (_threadId, token2) => {
                innerCalled = true;
                assert.strictEqual(token1.isCancellationRequested, true);
                assert.strictEqual(token2.isCancellationRequested, false);
            });
        });
        assert.strictEqual(innerCalled, true);
    });
    test('cancels slower lookups when new lookup is made', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        const innerCalled1 = [];
        const innerCalled2 = [];
        await Promise.all([
            scheduler.run(Promise.resolve().then(() => { }).then(() => [1, 3]), async (threadId) => {
                innerCalled1.push(threadId);
            }),
            scheduler.run(Promise.resolve([1, 2]), async (threadId) => {
                innerCalled2.push(threadId);
            })
        ]);
        assert.deepEqual(innerCalled1, [3]);
        assert.deepEqual(innerCalled2, [1, 2]);
    });
    test('allows work with other IDs', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve([1]), async (threadId, token1) => {
            assert.strictEqual(threadId, 1);
            assert.strictEqual(token1.isCancellationRequested, false);
            await scheduler.run(Promise.resolve([2]), async (_threadId, token2) => {
                innerCalled = true;
                assert.strictEqual(token1.isCancellationRequested, false);
                assert.strictEqual(token2.isCancellationRequested, false);
            });
        });
        assert.strictEqual(innerCalled, true);
    });
    test('cancels when called during reslution', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve().then(() => scheduler.cancel([1])).then(() => [1]), async () => {
            innerCalled = true;
        });
        assert.strictEqual(innerCalled, false);
    });
    test('global cancels when called during reslution', async () => {
        const scheduler = ds.add(new ThreadStatusScheduler());
        let innerCalled = false;
        await scheduler.run(Promise.resolve().then(() => scheduler.cancel(undefined)).then(() => [1]), async () => {
            innerCalled = true;
        });
        assert.strictEqual(innerCalled, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTZXNzaW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnU2Vzc2lvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUd0RSxLQUFLLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO0lBQ2xELE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFckQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25DLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFFdEQsTUFBTSxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekQsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEMsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUV0RCxNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN6RCxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakQsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFeEIsTUFBTSxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUQsTUFBTSxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ3JFLFdBQVcsR0FBRyxJQUFJLENBQUM7Z0JBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakUsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUN0RCxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7UUFDbEMsTUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFDO1FBRWxDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFDLFFBQVEsRUFBQyxFQUFFO2dCQUNwRixZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FBQztZQUNGLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBQyxRQUFRLEVBQUMsRUFBRTtnQkFDdkQsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztRQUV4QixNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRCxNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDckUsV0FBVyxHQUFHLElBQUksQ0FBQztnQkFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RCxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztRQUV4QixNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbkcsV0FBVyxHQUFHLElBQUksQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFDdEQsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pHLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=
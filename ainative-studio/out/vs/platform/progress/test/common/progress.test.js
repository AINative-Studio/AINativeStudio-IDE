/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { AsyncProgress } from '../../common/progress.js';
suite('Progress', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('multiple report calls are processed in sequence', async () => {
        await runWithFakedTimers({ useFakeTimers: true, maxTaskCount: 100 }, async () => {
            const executionOrder = [];
            const timeout = (time) => {
                return new Promise(resolve => setTimeout(resolve, time));
            };
            const executor = async (value) => {
                executionOrder.push(`start ${value}`);
                if (value === 1) {
                    // 1 is slowest
                    await timeout(100);
                }
                else if (value === 2) {
                    // 2 is also slow
                    await timeout(50);
                }
                else {
                    // 3 is fast
                    await timeout(10);
                }
                executionOrder.push(`end ${value}`);
            };
            const progress = new AsyncProgress(executor);
            progress.report(1);
            progress.report(2);
            progress.report(3);
            await timeout(1000);
            assert.deepStrictEqual(executionOrder, [
                'start 1',
                'end 1',
                'start 2',
                'end 2',
                'start 3',
                'end 3',
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9ncmVzcy90ZXN0L2NvbW1vbi9wcm9ncmVzcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFekQsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFFdEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsaURBQWlELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEUsTUFBTSxrQkFBa0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9FLE1BQU0sY0FBYyxHQUFhLEVBQUUsQ0FBQztZQUNwQyxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO2dCQUNoQyxPQUFPLElBQUksT0FBTyxDQUFPLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLENBQUMsQ0FBQztZQUNGLE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRSxLQUFhLEVBQUUsRUFBRTtnQkFDeEMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQ3RDLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNqQixlQUFlO29CQUNmLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQixDQUFDO3FCQUFNLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN4QixpQkFBaUI7b0JBQ2pCLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsWUFBWTtvQkFDWixNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkIsQ0FBQztnQkFDRCxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUM7WUFDRixNQUFNLFFBQVEsR0FBRyxJQUFJLGFBQWEsQ0FBUyxRQUFRLENBQUMsQ0FBQztZQUVyRCxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25CLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuQixNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVwQixNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRTtnQkFDdEMsU0FBUztnQkFDVCxPQUFPO2dCQUNQLFNBQVM7Z0JBQ1QsT0FBTztnQkFDUCxTQUFTO2dCQUNULE9BQU87YUFDUCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==
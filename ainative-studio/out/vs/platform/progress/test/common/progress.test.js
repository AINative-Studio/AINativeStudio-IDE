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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2dyZXNzL3Rlc3QvY29tbW9uL3Byb2dyZXNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUV6RCxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUV0Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRSxNQUFNLGtCQUFrQixDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0UsTUFBTSxjQUFjLEdBQWEsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7Z0JBQ2hDLE9BQU8sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEUsQ0FBQyxDQUFDO1lBQ0YsTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFLEtBQWEsRUFBRSxFQUFFO2dCQUN4QyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2pCLGVBQWU7b0JBQ2YsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BCLENBQUM7cUJBQU0sSUFBSSxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3hCLGlCQUFpQjtvQkFDakIsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ25CLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxZQUFZO29CQUNaLE1BQU0sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQixDQUFDO2dCQUNELGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3JDLENBQUMsQ0FBQztZQUNGLE1BQU0sUUFBUSxHQUFHLElBQUksYUFBYSxDQUFTLFFBQVEsQ0FBQyxDQUFDO1lBRXJELFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5CLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXBCLE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFO2dCQUN0QyxTQUFTO2dCQUNULE9BQU87Z0JBQ1AsU0FBUztnQkFDVCxPQUFPO2dCQUNQLFNBQVM7Z0JBQ1QsT0FBTzthQUNQLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9
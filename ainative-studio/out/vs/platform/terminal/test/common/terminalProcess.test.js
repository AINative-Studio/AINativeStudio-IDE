/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { chunkInput } from '../../common/terminalProcess.js';
suite('platform - terminalProcess', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('chunkInput', () => {
        test('single chunk', () => {
            deepStrictEqual(chunkInput('foo bar'), ['foo bar']);
        });
        test('multi chunk', () => {
            deepStrictEqual(chunkInput('foo'.repeat(50)), [
                'foofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofo',
                'ofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoof',
                'oofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoofoo'
            ]);
        });
        test('small data with escapes', () => {
            deepStrictEqual(chunkInput('foo \x1b[30mbar'), [
                'foo ',
                '\x1b[30mbar'
            ]);
        });
        test('large data with escapes', () => {
            deepStrictEqual(chunkInput('foofoofoofoo\x1b[30mbarbarbarbarbar\x1b[0m'.repeat(3)), [
                'foofoofoofoo',
                '\x1B[30mbarbarbarbarbar',
                '\x1B[0mfoofoofoofoo',
                '\x1B[30mbarbarbarbarbar',
                '\x1B[0mfoofoofoofoo',
                '\x1B[30mbarbarbarbarbar',
                '\x1B[0m'
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L2NvbW1vbi90ZXJtaW5hbFByb2Nlc3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RCxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLHVDQUF1QyxFQUFFLENBQUM7SUFDMUMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDeEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7WUFDekIsZUFBZSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtZQUN4QixlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDN0Msb0RBQW9EO2dCQUNwRCxvREFBb0Q7Z0JBQ3BELG9EQUFvRDthQUNwRCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7WUFDcEMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO2dCQUM5QyxNQUFNO2dCQUNOLGFBQWE7YUFDYixDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7WUFDcEMsZUFBZSxDQUFDLFVBQVUsQ0FBQyw0Q0FBNEMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDbkYsY0FBYztnQkFDZCx5QkFBeUI7Z0JBQ3pCLHFCQUFxQjtnQkFDckIseUJBQXlCO2dCQUN6QixxQkFBcUI7Z0JBQ3JCLHlCQUF5QjtnQkFDekIsU0FBUzthQUNULENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock, mockObject } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { RawDebugSession } from '../../browser/rawDebugSession.js';
import { MockDebugAdapter } from '../common/mockDebug.js';
suite('RawDebugSession', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    function createTestObjects() {
        const debugAdapter = new MockDebugAdapter();
        const dbgr = mockObject()({
            type: 'mock-debug'
        });
        const session = new RawDebugSession(debugAdapter, dbgr, 'sessionId', 'name', new (mock()), new (mock()), new (mock()), new (mock()));
        disposables.add(session);
        disposables.add(debugAdapter);
        return { debugAdapter, dbgr };
    }
    test('handles startDebugging request success', async () => {
        const { debugAdapter, dbgr } = createTestObjects();
        dbgr.startDebugging.returns(Promise.resolve(true));
        debugAdapter.sendRequestBody('startDebugging', {
            request: 'launch',
            configuration: {
                type: 'some-other-type'
            }
        });
        const response = await debugAdapter.waitForResponseFromClient('startDebugging');
        assert.strictEqual(response.command, 'startDebugging');
        assert.strictEqual(response.success, true);
    });
    test('handles startDebugging request failure', async () => {
        const { debugAdapter, dbgr } = createTestObjects();
        dbgr.startDebugging.returns(Promise.resolve(false));
        debugAdapter.sendRequestBody('startDebugging', {
            request: 'launch',
            configuration: {
                type: 'some-other-type'
            }
        });
        const response = await debugAdapter.waitForResponseFromClient('startDebugging');
        assert.strictEqual(response.command, 'startDebugging');
        assert.strictEqual(response.success, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3RGVidWdTZXNzaW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL3Jhd0RlYnVnU2Vzc2lvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBS25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUUxRCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsU0FBUyxpQkFBaUI7UUFDekIsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLFVBQVUsRUFBYSxDQUFDO1lBQ3BDLElBQUksRUFBRSxZQUFZO1NBQ2xCLENBQUMsQ0FBQztRQUVILE1BQU0sT0FBTyxHQUFHLElBQUksZUFBZSxDQUNsQyxZQUFZLEVBQ1osSUFBd0IsRUFDeEIsV0FBVyxFQUNYLE1BQU0sRUFDTixJQUFJLENBQUMsSUFBSSxFQUE4QixDQUFDLEVBQ3hDLElBQUksQ0FBQyxJQUFJLEVBQWtCLENBQUMsRUFDNUIsSUFBSSxDQUFDLElBQUksRUFBd0IsQ0FBQyxFQUNsQyxJQUFJLENBQUMsSUFBSSxFQUFrQixDQUFDLENBQUMsQ0FBQztRQUMvQixXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pCLFdBQVcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFOUIsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRUQsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pELE1BQU0sRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztRQUNuRCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFbkQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUM5QyxPQUFPLEVBQUUsUUFBUTtZQUNqQixhQUFhLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLGlCQUFpQjthQUN2QjtTQUMrQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxRQUFRLEdBQUcsTUFBTSxZQUFZLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO1FBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVwRCxZQUFZLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFO1lBQzlDLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLGFBQWEsRUFBRTtnQkFDZCxJQUFJLEVBQUUsaUJBQWlCO2FBQ3ZCO1NBQytDLENBQUMsQ0FBQztRQUNuRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=
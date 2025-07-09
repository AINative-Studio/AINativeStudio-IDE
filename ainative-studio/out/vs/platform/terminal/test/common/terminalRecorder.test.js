/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TerminalRecorder } from '../../common/terminalRecorder.js';
async function eventsEqual(recorder, expected) {
    const actual = (await recorder.generateReplayEvent()).events;
    for (let i = 0; i < expected.length; i++) {
        assert.deepStrictEqual(actual[i], expected[i]);
    }
}
suite('TerminalRecorder', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should record dimensions', async () => {
        const recorder = new TerminalRecorder(1, 2);
        await eventsEqual(recorder, [
            { cols: 1, rows: 2, data: '' }
        ]);
        recorder.handleData('a');
        recorder.handleResize(3, 4);
        await eventsEqual(recorder, [
            { cols: 1, rows: 2, data: 'a' },
            { cols: 3, rows: 4, data: '' }
        ]);
    });
    test('should ignore resize events without data', async () => {
        const recorder = new TerminalRecorder(1, 2);
        await eventsEqual(recorder, [
            { cols: 1, rows: 2, data: '' }
        ]);
        recorder.handleResize(3, 4);
        await eventsEqual(recorder, [
            { cols: 3, rows: 4, data: '' }
        ]);
    });
    test('should record data and combine it into the previous resize event', async () => {
        const recorder = new TerminalRecorder(1, 2);
        recorder.handleData('a');
        recorder.handleData('b');
        recorder.handleResize(3, 4);
        recorder.handleData('c');
        recorder.handleData('d');
        await eventsEqual(recorder, [
            { cols: 1, rows: 2, data: 'ab' },
            { cols: 3, rows: 4, data: 'cd' }
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZWNvcmRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL3Rlc3QvY29tbW9uL3Rlcm1pbmFsUmVjb3JkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEUsS0FBSyxVQUFVLFdBQVcsQ0FBQyxRQUEwQixFQUFFLFFBQXVCO0lBQzdFLE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUM3RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7QUFDRixDQUFDO0FBRUQsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtTQUM5QixDQUFDLENBQUM7UUFDSCxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUMzQixFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO1lBQy9CLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxXQUFXLENBQUMsUUFBUSxFQUFFO1lBQzNCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7U0FDOUIsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxXQUFXLENBQUMsUUFBUSxFQUFFO1lBQzNCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsa0VBQWtFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkYsTUFBTSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QixRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QixNQUFNLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDM0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtZQUNoQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO1NBQ2hDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==
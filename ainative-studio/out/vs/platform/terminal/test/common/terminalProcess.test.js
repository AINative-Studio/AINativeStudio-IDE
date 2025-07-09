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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9jb21tb24vdGVybWluYWxQcm9jZXNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0QsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUN4Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBQzFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1lBQ3pCLGVBQWUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7WUFDeEIsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzdDLG9EQUFvRDtnQkFDcEQsb0RBQW9EO2dCQUNwRCxvREFBb0Q7YUFDcEQsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1lBQ3BDLGVBQWUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDOUMsTUFBTTtnQkFDTixhQUFhO2FBQ2IsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1lBQ3BDLGVBQWUsQ0FBQyxVQUFVLENBQUMsNENBQTRDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25GLGNBQWM7Z0JBQ2QseUJBQXlCO2dCQUN6QixxQkFBcUI7Z0JBQ3JCLHlCQUF5QjtnQkFDekIscUJBQXFCO2dCQUNyQix5QkFBeUI7Z0JBQ3pCLFNBQVM7YUFDVCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==
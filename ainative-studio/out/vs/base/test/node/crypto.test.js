/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { join } from '../../common/path.js';
import { checksum } from '../../node/crypto.js';
import { Promises } from '../../node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { flakySuite, getRandomTestPath } from './testUtils.js';
flakySuite('Crypto', () => {
    let testDir;
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'crypto');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(function () {
        return Promises.rm(testDir);
    });
    test('checksum', async () => {
        const testFile = join(testDir, 'checksum.txt');
        await Promises.writeFile(testFile, 'Hello World');
        await checksum(testFile, 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3J5cHRvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvY3J5cHRvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFL0QsVUFBVSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFFekIsSUFBSSxPQUFlLENBQUM7SUFFcEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUM7UUFDTCxPQUFPLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTVELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUM7UUFDUixPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDL0MsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVsRCxNQUFNLFFBQVEsQ0FBQyxRQUFRLEVBQUUsa0VBQWtFLENBQUMsQ0FBQztJQUM5RixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=
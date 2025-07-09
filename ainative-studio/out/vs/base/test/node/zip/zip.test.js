/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import assert from 'assert';
import { tmpdir } from 'os';
import { createCancelablePromise } from '../../../common/async.js';
import { FileAccess } from '../../../common/network.js';
import * as path from '../../../common/path.js';
import { Promises } from '../../../node/pfs.js';
import { extract } from '../../../node/zip.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../common/utils.js';
import { getRandomTestPath } from '../testUtils.js';
suite('Zip', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('extract should handle directories', async () => {
        const testDir = getRandomTestPath(tmpdir(), 'vsctests', 'zip');
        await fs.promises.mkdir(testDir, { recursive: true });
        const fixtures = FileAccess.asFileUri('vs/base/test/node/zip/fixtures').fsPath;
        const fixture = path.join(fixtures, 'extract.zip');
        await createCancelablePromise(token => extract(fixture, testDir, {}, token));
        const doesExist = await Promises.exists(path.join(testDir, 'extension'));
        assert(doesExist);
        await Promises.rm(testDir);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemlwLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvemlwL3ppcC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN4RCxPQUFPLEtBQUssSUFBSSxNQUFNLHlCQUF5QixDQUFDO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFcEQsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFFakIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEQsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9ELE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFdEQsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUMvRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVuRCxNQUFNLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSxTQUFTLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDekUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRWxCLE1BQU0sUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1QixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { readFileSync } from 'fs';
import { FileAccess } from '../../common/network.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
suite('URI - perf', function () {
    // COMMENT THIS OUT TO RUN TEST
    if (1) {
        return;
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    let manyFileUris;
    setup(function () {
        manyFileUris = [];
        const data = readFileSync(FileAccess.asFileUri('vs/base/test/node/uri.perf.data.txt').fsPath).toString();
        const lines = data.split('\n');
        for (const line of lines) {
            manyFileUris.push(URI.file(line));
        }
    });
    function perfTest(name, callback) {
        test(name, _done => {
            const t1 = Date.now();
            callback();
            const d = Date.now() - t1;
            console.log(`${name} took ${d}ms (${(d / manyFileUris.length).toPrecision(3)} ms/uri) (${manyFileUris.length} uris)`);
            _done();
        });
    }
    perfTest('toString', function () {
        for (const uri of manyFileUris) {
            const data = uri.toString();
            assert.ok(data);
        }
    });
    perfTest('toString(skipEncoding)', function () {
        for (const uri of manyFileUris) {
            const data = uri.toString(true);
            assert.ok(data);
        }
    });
    perfTest('fsPath', function () {
        for (const uri of manyFileUris) {
            const data = uri.fsPath;
            assert.ok(data);
        }
    });
    perfTest('toJSON', function () {
        for (const uri of manyFileUris) {
            const data = uri.toJSON();
            assert.ok(data);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLnBlcmYudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS91cmkucGVyZi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFN0UsS0FBSyxDQUFDLFlBQVksRUFBRTtJQUVuQiwrQkFBK0I7SUFDL0IsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNQLE9BQU87SUFDUixDQUFDO0lBRUQsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLFlBQW1CLENBQUM7SUFDeEIsS0FBSyxDQUFDO1FBQ0wsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUNsQixNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pHLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLFFBQVEsQ0FBQyxJQUFZLEVBQUUsUUFBa0I7UUFDakQsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtZQUNsQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdEIsUUFBUSxFQUFFLENBQUM7WUFDWCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGFBQWEsWUFBWSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7WUFDdEgsS0FBSyxFQUFFLENBQUM7UUFDVCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxRQUFRLENBQUMsVUFBVSxFQUFFO1FBQ3BCLEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLHdCQUF3QixFQUFFO1FBQ2xDLEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxRQUFRLEVBQUU7UUFDbEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLFFBQVEsRUFBRTtRQUNsQixLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztBQUVKLENBQUMsQ0FBQyxDQUFDIn0=
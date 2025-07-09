/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { BoundModelReferenceCollection } from '../../browser/mainThreadDocuments.js';
import { timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { extUri } from '../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('BoundModelReferenceCollection', function () {
    let col;
    setup(function () {
        col = new BoundModelReferenceCollection(extUri, 15, 75);
    });
    teardown(function () {
        col.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('max age', async function () {
        let didDispose = false;
        col.add(URI.parse('test://farboo'), {
            object: {},
            dispose() {
                didDispose = true;
            }
        });
        await timeout(30);
        assert.strictEqual(didDispose, true);
    });
    test('max size', function () {
        const disposed = [];
        col.add(URI.parse('test://farboo'), {
            object: {},
            dispose() {
                disposed.push(0);
            }
        }, 6);
        col.add(URI.parse('test://boofar'), {
            object: {},
            dispose() {
                disposed.push(1);
            }
        }, 6);
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(2);
            }
        }, 70);
        assert.deepStrictEqual(disposed, [0, 1]);
    });
    test('max count', function () {
        col.dispose();
        col = new BoundModelReferenceCollection(extUri, 10000, 10000, 2);
        const disposed = [];
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(0);
            }
        });
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(1);
            }
        });
        col.add(URI.parse('test://xxxxxxx'), {
            object: {},
            dispose() {
                disposed.push(2);
            }
        });
        assert.deepStrictEqual(disposed, [0]);
    });
    test('dispose uri', function () {
        let disposed = [];
        col.add(URI.parse('test:///farboo'), {
            object: {},
            dispose() {
                disposed.push(0);
            }
        });
        col.add(URI.parse('test:///boofar'), {
            object: {},
            dispose() {
                disposed.push(1);
            }
        });
        col.add(URI.parse('test:///boo/far1'), {
            object: {},
            dispose() {
                disposed.push(2);
            }
        });
        col.add(URI.parse('test:///boo/far2'), {
            object: {},
            dispose() {
                disposed.push(3);
            }
        });
        col.add(URI.parse('test:///boo1/far'), {
            object: {},
            dispose() {
                disposed.push(4);
            }
        });
        col.remove(URI.parse('test:///unknown'));
        assert.strictEqual(disposed.length, 0);
        col.remove(URI.parse('test:///farboo'));
        assert.deepStrictEqual(disposed, [0]);
        disposed = [];
        col.remove(URI.parse('test:///boo'));
        assert.deepStrictEqual(disposed, [2, 3]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWREb2N1bWVudHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLCtCQUErQixFQUFFO0lBRXRDLElBQUksR0FBa0MsQ0FBQztJQUV2QyxLQUFLLENBQUM7UUFDTCxHQUFHLEdBQUcsSUFBSSw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDO1FBQ1IsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2YsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSztRQUVwQixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFFdkIsR0FBRyxDQUFDLEdBQUcsQ0FDTixHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUMxQjtZQUNDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsT0FBTztnQkFDTixVQUFVLEdBQUcs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
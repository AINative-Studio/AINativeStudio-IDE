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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkRG9jdW1lbnRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQywrQkFBK0IsRUFBRTtJQUV0QyxJQUFJLEdBQWtDLENBQUM7SUFFdkMsS0FBSyxDQUFDO1FBQ0wsR0FBRyxHQUFHLElBQUksNkJBQTZCLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQztRQUNSLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUs7UUFFcEIsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBRXZCLEdBQUcsQ0FBQyxHQUFHLENBQ04sR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFDMUI7WUFDQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE9BQU87Z0JBQ04sVUFBVSxH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
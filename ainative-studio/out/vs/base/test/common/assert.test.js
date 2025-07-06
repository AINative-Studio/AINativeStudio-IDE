/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ok, assert as commonAssert } from '../../common/assert.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { CancellationError, ReadonlyError } from '../../common/errors.js';
suite('Assert', () => {
    test('ok', () => {
        assert.throws(function () {
            ok(false);
        });
        assert.throws(function () {
            ok(null);
        });
        assert.throws(function () {
            ok();
        });
        assert.throws(function () {
            ok(null, 'Foo Bar');
        }, function (e) {
            return e.message.indexOf('Foo Bar') >= 0;
        });
        ok(true);
        ok('foo');
        ok({});
        ok(5);
    });
    suite('throws a provided error object', () => {
        test('generic error', () => {
            const originalError = new Error('Oh no!');
            try {
                commonAssert(false, originalError);
            }
            catch (thrownError) {
                assert.strictEqual(thrownError, originalError, 'Must throw the provided error instance.');
                assert.strictEqual(thrownError.message, 'Oh no!', 'Must throw the provided error instance.');
            }
        });
        test('cancellation error', () => {
            const originalError = new CancellationError();
            try {
                commonAssert(false, originalError);
            }
            catch (thrownError) {
                assert.strictEqual(thrownError, originalError, 'Must throw the provided error instance.');
            }
        });
        test('readonly error', () => {
            const originalError = new ReadonlyError('World');
            try {
                commonAssert(false, originalError);
            }
            catch (thrownError) {
                assert.strictEqual(thrownError, originalError, 'Must throw the provided error instance.');
                assert.strictEqual(thrownError.message, 'World is read-only and cannot be changed', 'Must throw the provided error instance.');
            }
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vYXNzZXJ0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFMUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDZixNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2IsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2IsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2IsRUFBRSxFQUFFLENBQUM7UUFDTixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDYixFQUFFLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JCLENBQUMsRUFBRSxVQUFVLENBQVE7WUFDcEIsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDVCxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDVixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDUCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDNUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7WUFDMUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFMUMsSUFBSSxDQUFDO2dCQUNKLFlBQVksQ0FDWCxLQUFLLEVBQ0wsYUFBYSxDQUNiLENBQUM7WUFDSCxDQUFDO1lBQUMsT0FBTyxXQUFXLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsV0FBVyxFQUNYLGFBQWEsRUFDYix5Q0FBeUMsQ0FDekMsQ0FBQztnQkFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixXQUFXLENBQUMsT0FBTyxFQUNuQixRQUFRLEVBQ1IseUNBQXlDLENBQ3pDLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1lBQy9CLE1BQU0sYUFBYSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUU5QyxJQUFJLENBQUM7Z0JBQ0osWUFBWSxDQUNYLEtBQUssRUFDTCxhQUFhLENBQ2IsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUNqQixXQUFXLEVBQ1gsYUFBYSxFQUNiLHlDQUF5QyxDQUN6QyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtZQUMzQixNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVqRCxJQUFJLENBQUM7Z0JBQ0osWUFBWSxDQUNYLEtBQUssRUFDTCxhQUFhLENBQ2IsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUNqQixXQUFXLEVBQ1gsYUFBYSxFQUNiLHlDQUF5QyxDQUN6QyxDQUFDO2dCQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFdBQVcsQ0FBQyxPQUFPLEVBQ25CLDBDQUEwQyxFQUMxQyx5Q0FBeUMsQ0FDekMsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyJ9
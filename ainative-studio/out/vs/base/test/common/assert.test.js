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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9hc3NlcnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLElBQUksWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUUxRSxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUNwQixJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUNmLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDYixFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDYixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDVixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDYixFQUFFLEVBQUUsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNiLEVBQUUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckIsQ0FBQyxFQUFFLFVBQVUsQ0FBUTtZQUNwQixPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNULEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNWLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNQLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtZQUMxQixNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUxQyxJQUFJLENBQUM7Z0JBQ0osWUFBWSxDQUNYLEtBQUssRUFDTCxhQUFhLENBQ2IsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixNQUFNLENBQUMsV0FBVyxDQUNqQixXQUFXLEVBQ1gsYUFBYSxFQUNiLHlDQUF5QyxDQUN6QyxDQUFDO2dCQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFdBQVcsQ0FBQyxPQUFPLEVBQ25CLFFBQVEsRUFDUix5Q0FBeUMsQ0FDekMsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7WUFDL0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBRTlDLElBQUksQ0FBQztnQkFDSixZQUFZLENBQ1gsS0FBSyxFQUNMLGFBQWEsQ0FDYixDQUFDO1lBQ0gsQ0FBQztZQUFDLE9BQU8sV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFdBQVcsRUFDWCxhQUFhLEVBQ2IseUNBQXlDLENBQ3pDLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1lBQzNCLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWpELElBQUksQ0FBQztnQkFDSixZQUFZLENBQ1gsS0FBSyxFQUNMLGFBQWEsQ0FDYixDQUFDO1lBQ0gsQ0FBQztZQUFDLE9BQU8sV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFdBQVcsRUFDWCxhQUFhLEVBQ2IseUNBQXlDLENBQ3pDLENBQUM7Z0JBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsV0FBVyxDQUFDLE9BQU8sRUFDbkIsMENBQTBDLEVBQzFDLHlDQUF5QyxDQUN6QyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=
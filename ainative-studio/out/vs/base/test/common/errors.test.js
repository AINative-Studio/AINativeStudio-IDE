/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { toErrorMessage } from '../../common/errorMessage.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { transformErrorForSerialization, transformErrorFromSerialization } from '../../common/errors.js';
import { assertType } from '../../common/types.js';
suite('Errors', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Get Error Message', function () {
        assert.strictEqual(toErrorMessage('Foo Bar'), 'Foo Bar');
        assert.strictEqual(toErrorMessage(new Error('Foo Bar')), 'Foo Bar');
        let error = new Error();
        error = new Error();
        error.detail = {};
        error.detail.exception = {};
        error.detail.exception.message = 'Foo Bar';
        assert.strictEqual(toErrorMessage(error), 'Foo Bar');
        assert.strictEqual(toErrorMessage(error, true), 'Foo Bar');
        assert(toErrorMessage());
        assert(toErrorMessage(null));
        assert(toErrorMessage({}));
        try {
            throw new Error();
        }
        catch (error) {
            assert.strictEqual(toErrorMessage(error), 'An unknown error occurred. Please consult the log for more details.');
            assert.ok(toErrorMessage(error, true).length > 'An unknown error occurred. Please consult the log for more details.'.length);
        }
    });
    test('Transform Error for Serialization', function () {
        const error = new Error('Test error');
        const serializedError = transformErrorForSerialization(error);
        assert.strictEqual(serializedError.name, 'Error');
        assert.strictEqual(serializedError.message, 'Test error');
        assert.strictEqual(serializedError.stack, error.stack);
        assert.strictEqual(serializedError.noTelemetry, false);
        assert.strictEqual(serializedError.cause, undefined);
    });
    test('Transform Error with Cause for Serialization', function () {
        const cause = new Error('Cause error');
        const error = new Error('Test error', { cause });
        const serializedError = transformErrorForSerialization(error);
        assert.strictEqual(serializedError.name, 'Error');
        assert.strictEqual(serializedError.message, 'Test error');
        assert.strictEqual(serializedError.stack, error.stack);
        assert.strictEqual(serializedError.noTelemetry, false);
        assert.ok(serializedError.cause);
        assert.strictEqual(serializedError.cause?.name, 'Error');
        assert.strictEqual(serializedError.cause?.message, 'Cause error');
        assert.strictEqual(serializedError.cause?.stack, cause.stack);
    });
    test('Transform Error from Serialization', function () {
        const serializedError = transformErrorForSerialization(new Error('Test error'));
        const error = transformErrorFromSerialization(serializedError);
        assert.strictEqual(error.name, 'Error');
        assert.strictEqual(error.message, 'Test error');
        assert.strictEqual(error.stack, serializedError.stack);
        assert.strictEqual(error.cause, undefined);
    });
    test('Transform Error with Cause from Serialization', function () {
        const cause = new Error('Cause error');
        const serializedCause = transformErrorForSerialization(cause);
        const error = new Error('Test error', { cause });
        const serializedError = transformErrorForSerialization(error);
        const deserializedError = transformErrorFromSerialization(serializedError);
        assert.strictEqual(deserializedError.name, 'Error');
        assert.strictEqual(deserializedError.message, 'Test error');
        assert.strictEqual(deserializedError.stack, serializedError.stack);
        assert.ok(deserializedError.cause);
        assertType(deserializedError.cause instanceof Error);
        assert.strictEqual(deserializedError.cause?.name, 'Error');
        assert.strictEqual(deserializedError.cause?.message, 'Cause error');
        assert.strictEqual(deserializedError.cause?.stack, serializedCause.stack);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9lcnJvcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNyRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN6RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFbkQsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVwRSxJQUFJLEtBQUssR0FBUSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzdCLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3BCLEtBQUssQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUM1QixLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUUzRCxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN6QixNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNCLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNuQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxxRUFBcUUsQ0FBQyxDQUFDO1lBQ2pILE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcscUVBQXFFLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUgsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sZUFBZSxHQUFHLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3RELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhDQUE4QyxFQUFFO1FBQ3BELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDakQsTUFBTSxlQUFlLEdBQUcsOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0NBQW9DLEVBQUU7UUFDMUMsTUFBTSxlQUFlLEdBQUcsOEJBQThCLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNoRixNQUFNLEtBQUssR0FBRywrQkFBK0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtDQUErQyxFQUFFO1FBQ3JELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sZUFBZSxHQUFHLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDakQsTUFBTSxlQUFlLEdBQUcsOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUQsTUFBTSxpQkFBaUIsR0FBRywrQkFBK0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzRSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=
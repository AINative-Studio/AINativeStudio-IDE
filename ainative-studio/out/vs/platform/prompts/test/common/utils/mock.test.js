/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mockObject } from './mock.js';
import { typeCheck } from '../../../../../base/common/types.js';
import { randomInt } from '../../../../../base/common/numbers.js';
import { randomBoolean } from '../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('mock', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('• mockObject', () => {
        test('• overrides properties and functions', () => {
            const mock = mockObject({
                bar: 'oh hi!',
                baz: 42,
                anotherMethod(arg) {
                    return isNaN(arg);
                },
            });
            typeCheck(mock);
            assert.strictEqual(mock.bar, 'oh hi!', 'bar should be overriden');
            assert.strictEqual(mock.baz, 42, 'baz should be overriden');
            assert(!(mock.anotherMethod(randomInt(100))), 'Must execute overriden method correctly 1.');
            assert(mock.anotherMethod(NaN), 'Must execute overriden method correctly 2.');
            assert.throws(() => {
                // property is not overriden so must throw
                // eslint-disable-next-line local/code-no-unused-expressions
                mock.foo;
            });
            assert.throws(() => {
                // function is not overriden so must throw
                mock.someMethod(randomBoolean());
            });
        });
        test('• immutability of the overrides object', () => {
            const overrides = {
                baz: 4,
            };
            const mock = mockObject(overrides);
            typeCheck(mock);
            assert.strictEqual(mock.baz, 4, 'baz should be overriden');
            // overrides object must be immutable
            assert.throws(() => {
                overrides.foo = 'test';
            });
            assert.throws(() => {
                overrides.someMethod = (arg) => {
                    return `${arg}__${arg}`;
                };
            });
        });
    });
    suite('• mockService', () => {
        test('• overrides properties and functions', () => {
            const mock = mockObject({
                id: 'ciao!',
                counter: 74,
                testMethod2(arg) {
                    return !isNaN(arg);
                },
            });
            typeCheck(mock);
            assert.strictEqual(mock.id, 'ciao!', 'id should be overriden');
            assert.strictEqual(mock.counter, 74, 'counter should be overriden');
            assert(mock.testMethod2(randomInt(100)), 'Must execute overriden method correctly 1.');
            assert(!(mock.testMethod2(NaN)), 'Must execute overriden method correctly 2.');
            assert.throws(() => {
                // property is not overriden so must throw
                // eslint-disable-next-line local/code-no-unused-expressions
                mock.prop1;
            });
            assert.throws(() => {
                // function is not overriden so must throw
                mock.method1(randomBoolean());
            });
        });
        test('• immutability of the overrides object', () => {
            const overrides = {
                baz: false,
            };
            const mock = mockObject(overrides);
            typeCheck(mock);
            assert.strictEqual(mock.baz, false, 'baz should be overriden');
            // overrides object must be immutable
            assert.throws(() => {
                overrides.foo = 'test';
            });
            assert.throws(() => {
                overrides.someMethod = (arg) => {
                    return `${arg}__${arg}`;
                };
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL3Rlc3QvY29tbW9uL3V0aWxzL21vY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUN2QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUNsQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQzFCLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7WUFTakQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFjO2dCQUNwQyxHQUFHLEVBQUUsUUFBUTtnQkFDYixHQUFHLEVBQUUsRUFBRTtnQkFDUCxhQUFhLENBQUMsR0FBVztvQkFDeEIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLENBQUM7YUFDRCxDQUFDLENBQUM7WUFFSCxTQUFTLENBQWMsSUFBSSxDQUFDLENBQUM7WUFFN0IsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEdBQUcsRUFDUixRQUFRLEVBQ1IseUJBQXlCLENBQ3pCLENBQUM7WUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLENBQUMs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
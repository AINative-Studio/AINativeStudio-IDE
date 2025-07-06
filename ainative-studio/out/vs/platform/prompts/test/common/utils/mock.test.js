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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvbXB0cy90ZXN0L2NvbW1vbi91dGlscy9tb2NrLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDdkMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7SUFDbEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUMxQixJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1lBU2pELE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBYztnQkFDcEMsR0FBRyxFQUFFLFFBQVE7Z0JBQ2IsR0FBRyxFQUFFLEVBQUU7Z0JBQ1AsYUFBYSxDQUFDLEdBQVc7b0JBQ3hCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixDQUFDO2FBQ0QsQ0FBQyxDQUFDO1lBRUgsU0FBUyxDQUFjLElBQUksQ0FBQyxDQUFDO1lBRTdCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxHQUFHLEVBQ1IsUUFBUSxFQUNSLHlCQUF5QixDQUN6QixDQUFDO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEdBQUcs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
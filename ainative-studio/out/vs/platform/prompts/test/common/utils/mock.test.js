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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb21wdHMvdGVzdC9jb21tb24vdXRpbHMvbW9jay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO0lBQ2xCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDMUIsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQVNqRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQWM7Z0JBQ3BDLEdBQUcsRUFBRSxRQUFRO2dCQUNiLEdBQUcsRUFBRSxFQUFFO2dCQUNQLGFBQWEsQ0FBQyxHQUFXO29CQUN4QixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbkIsQ0FBQzthQUNELENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBYyxJQUFJLENBQUMsQ0FBQztZQUU3QixNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLENBQUMsR0FBRyxFQUNSLFFBQVEsRUFDUix5QkFBeUIsQ0FDekIsQ0FBQztZQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxHQUFH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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as types from '../../common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { assertDefined, assertOneOf, typeCheck } from '../../common/types.js';
suite('Types', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('isFunction', () => {
        assert(!types.isFunction(undefined));
        assert(!types.isFunction(null));
        assert(!types.isFunction('foo'));
        assert(!types.isFunction(5));
        assert(!types.isFunction(true));
        assert(!types.isFunction([]));
        assert(!types.isFunction([1, 2, '3']));
        assert(!types.isFunction({}));
        assert(!types.isFunction({ foo: 'bar' }));
        assert(!types.isFunction(/test/));
        assert(!types.isFunction(new RegExp('')));
        assert(!types.isFunction(new Date()));
        assert(types.isFunction(assert));
        assert(types.isFunction(function foo() { }));
    });
    test('areFunctions', () => {
        assert(!types.areFunctions());
        assert(!types.areFunctions(null));
        assert(!types.areFunctions('foo'));
        assert(!types.areFunctions(5));
        assert(!types.areFunctions(true));
        assert(!types.areFunctions([]));
        assert(!types.areFunctions([1, 2, '3']));
        assert(!types.areFunctions({}));
        assert(!types.areFunctions({ foo: 'bar' }));
        assert(!types.areFunctions(/test/));
        assert(!types.areFunctions(new RegExp('')));
        assert(!types.areFunctions(new Date()));
        assert(!types.areFunctions(assert, ''));
        assert(types.areFunctions(assert));
        assert(types.areFunctions(assert, assert));
        assert(types.areFunctions(function foo() { }));
    });
    test('isObject', () => {
        assert(!types.isObject(undefined));
        assert(!types.isObject(null));
        assert(!types.isObject('foo'));
        assert(!types.isObject(5));
        assert(!types.isObject(true));
        assert(!types.isObject([]));
        assert(!types.isObject([1, 2, '3']));
        assert(!types.isObject(/test/));
        assert(!types.isObject(new RegExp('')));
        assert(!types.isFunction(new Date()));
        assert.strictEqual(types.isObject(assert), false);
        assert(!types.isObject(function foo() { }));
        assert(types.isObject({}));
        assert(types.isObject({ foo: 'bar' }));
    });
    test('isEmptyObject', () => {
        assert(!types.isEmptyObject(undefined));
        assert(!types.isEmptyObject(null));
        assert(!types.isEmptyObject('foo'));
        assert(!types.isEmptyObject(5));
        assert(!types.isEmptyObject(true));
        assert(!types.isEmptyObject([]));
        assert(!types.isEmptyObject([1, 2, '3']));
        assert(!types.isEmptyObject(/test/));
        assert(!types.isEmptyObject(new RegExp('')));
        assert(!types.isEmptyObject(new Date()));
        assert.strictEqual(types.isEmptyObject(assert), false);
        assert(!types.isEmptyObject(function foo() { }));
        assert(!types.isEmptyObject({ foo: 'bar' }));
        assert(types.isEmptyObject({}));
    });
    test('isString', () => {
        assert(!types.isString(undefined));
        assert(!types.isString(null));
        assert(!types.isString(5));
        assert(!types.isString([]));
        assert(!types.isString([1, 2, '3']));
        assert(!types.isString(true));
        assert(!types.isString({}));
        assert(!types.isString(/test/));
        assert(!types.isString(new RegExp('')));
        assert(!types.isString(new Date()));
        assert(!types.isString(assert));
        assert(!types.isString(function foo() { }));
        assert(!types.isString({ foo: 'bar' }));
        assert(types.isString('foo'));
    });
    test('isNumber', () => {
        assert(!types.isNumber(undefined));
        assert(!types.isNumber(null));
        assert(!types.isNumber('foo'));
        assert(!types.isNumber([]));
        assert(!types.isNumber([1, 2, '3']));
        assert(!types.isNumber(true));
        assert(!types.isNumber({}));
        assert(!types.isNumber(/test/));
        assert(!types.isNumber(new RegExp('')));
        assert(!types.isNumber(new Date()));
        assert(!types.isNumber(assert));
        assert(!types.isNumber(function foo() { }));
        assert(!types.isNumber({ foo: 'bar' }));
        assert(!types.isNumber(parseInt('A', 10)));
        assert(types.isNumber(5));
    });
    test('isUndefined', () => {
        assert(!types.isUndefined(null));
        assert(!types.isUndefined('foo'));
        assert(!types.isUndefined([]));
        assert(!types.isUndefined([1, 2, '3']));
        assert(!types.isUndefined(true));
        assert(!types.isUndefined({}));
        assert(!types.isUndefined(/test/));
        assert(!types.isUndefined(new RegExp('')));
        assert(!types.isUndefined(new Date()));
        assert(!types.isUndefined(assert));
        assert(!types.isUndefined(function foo() { }));
        assert(!types.isUndefined({ foo: 'bar' }));
        assert(types.isUndefined(undefined));
    });
    test('isUndefinedOrNull', () => {
        assert(!types.isUndefinedOrNull('foo'));
        assert(!types.isUndefinedOrNull([]));
        assert(!types.isUndefinedOrNull([1, 2, '3']));
        assert(!types.isUndefinedOrNull(true));
        assert(!types.isUndefinedOrNull({}));
        assert(!types.isUndefinedOrNull(/test/));
        assert(!types.isUndefinedOrNull(new RegExp('')));
        assert(!types.isUndefinedOrNull(new Date()));
        assert(!types.isUndefinedOrNull(assert));
        assert(!types.isUndefinedOrNull(function foo() { }));
        assert(!types.isUndefinedOrNull({ foo: 'bar' }));
        assert(types.isUndefinedOrNull(undefined));
        assert(types.isUndefinedOrNull(null));
    });
    test('assertIsDefined / assertAreDefined', () => {
        assert.throws(() => types.assertIsDefined(undefined));
        assert.throws(() => types.assertIsDefined(null));
        assert.throws(() => types.assertAllDefined(null, undefined));
        assert.throws(() => types.assertAllDefined(true, undefined));
        assert.throws(() => types.assertAllDefined(undefined, false));
        assert.strictEqual(types.assertIsDefined(true), true);
        assert.strictEqual(types.assertIsDefined(false), false);
        assert.strictEqual(types.assertIsDefined('Hello'), 'Hello');
        assert.strictEqual(types.assertIsDefined(''), '');
        const res = types.assertAllDefined(1, true, 'Hello');
        assert.strictEqual(res[0], 1);
        assert.strictEqual(res[1], true);
        assert.strictEqual(res[2], 'Hello');
    });
    suite('assertDefined', () => {
        test('should not throw if `value` is defined (bool)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(true, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (number)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(5, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (zero)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(0, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (string)', async () => {
            assert.doesNotThrow(function () {
                assertDefined('some string', 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (empty string)', async () => {
            assert.doesNotThrow(function () {
                assertDefined('', 'Oops something happened.');
            });
        });
        /**
         * Note! API of `assert.throws()` is different in the browser
         * and in Node.js, and it is not possible to use the same code
         * here. Therefore we had to resort to the manual try/catch.
         */
        const assertThrows = (testFunction, errorMessage) => {
            let thrownError;
            try {
                testFunction();
            }
            catch (e) {
                thrownError = e;
            }
            assertDefined(thrownError, 'Must throw an error.');
            assert(thrownError instanceof Error, 'Error must be an instance of `Error`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        };
        test('should throw if `value` is `null`', async () => {
            const errorMessage = 'Uggh ohh!';
            assertThrows(() => {
                assertDefined(null, errorMessage);
            }, errorMessage);
        });
        test('should throw if `value` is `undefined`', async () => {
            const errorMessage = 'Oh no!';
            assertThrows(() => {
                assertDefined(undefined, new Error(errorMessage));
            }, errorMessage);
        });
        test('should throw assertion error by default', async () => {
            const errorMessage = 'Uggh ohh!';
            let thrownError;
            try {
                assertDefined(null, errorMessage);
            }
            catch (e) {
                thrownError = e;
            }
            assertDefined(thrownError, 'Must throw an error.');
            assert(thrownError instanceof Error, 'Error must be an instance of `Error`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        });
        test('should throw provided error instance', async () => {
            class TestError extends Error {
                constructor(...args) {
                    super(...args);
                    this.name = 'TestError';
                }
            }
            const errorMessage = 'Oops something hapenned.';
            const error = new TestError(errorMessage);
            let thrownError;
            try {
                assertDefined(null, error);
            }
            catch (e) {
                thrownError = e;
            }
            assert(thrownError instanceof TestError, 'Error must be an instance of `TestError`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        });
    });
    suite('assertOneOf', () => {
        suite('success', () => {
            suite('string', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf('foo', ['foo', 'bar'], 'Foo must be one of: foo, bar');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = 'hi';
                        const list = ['hi', 'ciao'];
                        assertOneOf(item, list, 'Hi must be one of: hi, ciao');
                        typeCheck(item);
                    });
                });
            });
            suite('number', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(10, [10, 100], '10 must be one of: 10, 100');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = 20;
                        const list = [20, 2000];
                        assertOneOf(item, list, '20 must be one of: 20, 2000');
                        typeCheck(item);
                    });
                });
            });
            suite('boolean', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(true, [true, false], 'true must be one of: true, false');
                    });
                    assert.doesNotThrow(() => {
                        assertOneOf(false, [true, false], 'false must be one of: true, false');
                    });
                });
                test('subtype (true)', () => {
                    assert.doesNotThrow(() => {
                        const item = true;
                        const list = [true, true];
                        assertOneOf(item, list, 'true must be one of: true, true');
                        typeCheck(item);
                    });
                });
                test('subtype (false)', () => {
                    assert.doesNotThrow(() => {
                        const item = false;
                        const list = [false, true];
                        assertOneOf(item, list, 'false must be one of: false, true');
                        typeCheck(item);
                    });
                });
            });
            suite('undefined', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(undefined, [undefined], 'undefined must be one of: undefined');
                    });
                    assert.doesNotThrow(() => {
                        assertOneOf(undefined, [void 0], 'undefined must be one of: void 0');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        let item;
                        const list = [undefined];
                        assertOneOf(item, list, 'undefined | null must be one of: undefined');
                        typeCheck(item);
                    });
                });
            });
            suite('null', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assertOneOf(null, [null], 'null must be one of: null');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = null;
                        const list = [null];
                        assertOneOf(item, list, 'null must be one of: null');
                        typeCheck(item);
                    });
                });
            });
            suite('any', () => {
                test('item', () => {
                    assert.doesNotThrow(() => {
                        const item = '1';
                        const list = ['2', '1'];
                        assertOneOf(item, list, '1 must be one of: 2, 1');
                        typeCheck(item);
                    });
                });
                test('list', () => {
                    assert.doesNotThrow(() => {
                        const item = '5';
                        const list = ['3', '5', '2.5'];
                        assertOneOf(item, list, '5 must be one of: 3, 5, 2.5');
                        typeCheck(item);
                    });
                });
                test('both', () => {
                    assert.doesNotThrow(() => {
                        const item = '12';
                        const list = ['14.25', '7', '12'];
                        assertOneOf(item, list, '12 must be one of: 14.25, 7, 12');
                        typeCheck(item);
                    });
                });
            });
            suite('unknown', () => {
                test('item', () => {
                    assert.doesNotThrow(() => {
                        const item = '1';
                        const list = ['2', '1'];
                        assertOneOf(item, list, '1 must be one of: 2, 1');
                        typeCheck(item);
                    });
                });
                test('both', () => {
                    assert.doesNotThrow(() => {
                        const item = '12';
                        const list = ['14.25', '7', '12'];
                        assertOneOf(item, list, '12 must be one of: 14.25, 7, 12');
                        typeCheck(item);
                    });
                });
            });
        });
        suite('failure', () => {
            suite('string', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf('baz', ['foo', 'bar'], 'Baz must not be one of: foo, bar');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = 'vitannia';
                        const list = ['hi', 'ciao'];
                        assertOneOf(item, list, 'vitannia must be one of: hi, ciao');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = 'vitannia';
                        const list = [];
                        assertOneOf(item, list, 'vitannia must be one of: empty');
                    });
                });
            });
            suite('number', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(19, [10, 100], '19 must not be one of: 10, 100');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = 24;
                        const list = [20, 2000];
                        assertOneOf(item, list, '24 must not be one of: 20, 2000');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = 20;
                        const list = [];
                        assertOneOf(item, list, '20 must not be one of: empty');
                    });
                });
            });
            suite('boolean', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(true, [false], 'true must not be one of: false');
                    });
                    assert.throws(() => {
                        assertOneOf(false, [true], 'false must not be one of: true');
                    });
                });
                test('subtype (true)', () => {
                    assert.throws(() => {
                        const item = true;
                        const list = [false];
                        assertOneOf(item, list, 'true must not be one of: false');
                    });
                });
                test('subtype (false)', () => {
                    assert.throws(() => {
                        const item = false;
                        const list = [true, true, true];
                        assertOneOf(item, list, 'false must be one of: true, true, true');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = true;
                        const list = [];
                        assertOneOf(item, list, 'true must be one of: empty');
                    });
                });
            });
            suite('undefined', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(undefined, [], 'undefined must not be one of: empty');
                    });
                    assert.throws(() => {
                        assertOneOf(void 0, [], 'void 0 must not be one of: empty');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        let item;
                        const list = [null];
                        assertOneOf(item, list, 'undefined must be one of: null');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        let item;
                        const list = [];
                        assertOneOf(item, list, 'undefined must be one of: empty');
                    });
                });
            });
            suite('null', () => {
                test('type', () => {
                    assert.throws(() => {
                        assertOneOf(null, [], 'null must be one of: empty');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = null;
                        const list = [];
                        assertOneOf(item, list, 'null must be one of: empty');
                    });
                });
            });
            suite('any', () => {
                test('item', () => {
                    assert.throws(() => {
                        const item = '1';
                        const list = ['3', '4'];
                        assertOneOf(item, list, '1 must not be one of: 3, 4');
                    });
                });
                test('list', () => {
                    assert.throws(() => {
                        const item = '5';
                        const list = ['3', '6', '2.5'];
                        assertOneOf(item, list, '5 must not be one of: 3, 6, 2.5');
                    });
                });
                test('both', () => {
                    assert.throws(() => {
                        const item = '12';
                        const list = ['14.25', '7', '15'];
                        assertOneOf(item, list, '12 must not be one of: 14.25, 7, 15');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = '25';
                        const list = [];
                        assertOneOf(item, list, '25 must not be one of: empty');
                    });
                });
            });
            suite('unknown', () => {
                test('item', () => {
                    assert.throws(() => {
                        const item = '100';
                        const list = ['12', '11'];
                        assertOneOf(item, list, '100 must not be one of: 12, 11');
                    });
                    test('both', () => {
                        assert.throws(() => {
                            const item = '21';
                            const list = ['14.25', '7', '12'];
                            assertOneOf(item, list, '21 must not be one of: 14.25, 7, 12');
                        });
                    });
                });
            });
        });
    });
    test('validateConstraints', () => {
        types.validateConstraints([1, 'test', true], [Number, String, Boolean]);
        types.validateConstraints([1, 'test', true], ['number', 'string', 'boolean']);
        types.validateConstraints([console.log], [Function]);
        types.validateConstraints([undefined], [types.isUndefined]);
        types.validateConstraints([1], [types.isNumber]);
        class Foo {
        }
        types.validateConstraints([new Foo()], [Foo]);
        function isFoo(f) { }
        assert.throws(() => types.validateConstraints([new Foo()], [isFoo]));
        function isFoo2(f) { return true; }
        types.validateConstraints([new Foo()], [isFoo2]);
        assert.throws(() => types.validateConstraints([1, true], [types.isNumber, types.isString]));
        assert.throws(() => types.validateConstraints(['2'], [types.isNumber]));
        assert.throws(() => types.validateConstraints([1, 'test', true], [Number, String, Number]));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3R5cGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxLQUFLLE1BQU0sdUJBQXVCLENBQUM7QUFDL0MsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTlFLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO0lBRW5CLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0QyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxLQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4QyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVMsR0FBRyxLQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU1QyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsS0FBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLEtBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4QyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDckIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxD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
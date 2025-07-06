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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdHlwZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSx1QkFBdUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFOUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7SUFFbkIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxHQUFHLEtBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFD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MUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxLQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsS0FBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLEtBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsS0FBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLE1BQU0s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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import assert from 'assert';
import * as sinon from 'sinon';
import { memoize, throttle } from '../../common/decorators.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Decorators', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('memoize should memoize methods', () => {
        class Foo {
            constructor(_answer) {
                this._answer = _answer;
                this.count = 0;
            }
            answer() {
                this.count++;
                return this._answer;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo(42);
        assert.strictEqual(foo.count, 0);
        assert.strictEqual(foo.answer(), 42);
        assert.strictEqual(foo.count, 1);
        assert.strictEqual(foo.answer(), 42);
        assert.strictEqual(foo.count, 1);
        const foo2 = new Foo(1337);
        assert.strictEqual(foo2.count, 0);
        assert.strictEqual(foo2.answer(), 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo2.answer(), 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo.answer(), 42);
        assert.strictEqual(foo.count, 1);
        const foo3 = new Foo(null);
        assert.strictEqual(foo3.count, 0);
        assert.strictEqual(foo3.answer(), null);
        assert.strictEqual(foo3.count, 1);
        assert.strictEqual(foo3.answer(), null);
        assert.strictEqual(foo3.count, 1);
        const foo4 = new Foo(undefined);
        assert.strictEqual(foo4.count, 0);
        assert.strictEqual(foo4.answer(), undefined);
        assert.strictEqual(foo4.count, 1);
        assert.strictEqual(foo4.answer(), undefined);
        assert.strictEqual(foo4.count, 1);
    });
    test('memoize should memoize getters', () => {
        class Foo {
            constructor(_answer) {
                this._answer = _answer;
                this.count = 0;
            }
            get answer() {
                this.count++;
                return this._answer;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo(42);
        assert.strictEqual(foo.count, 0);
        assert.strictEqual(foo.answer, 42);
        assert.strictEqual(foo.count, 1);
        assert.strictEqual(foo.answer, 42);
        assert.strictEqual(foo.count, 1);
        const foo2 = new Foo(1337);
        assert.strictEqual(foo2.count, 0);
        assert.strictEqual(foo2.answer, 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo2.answer, 1337);
        assert.strictEqual(foo2.count, 1);
        assert.strictEqual(foo.answer, 42);
        assert.strictEqual(foo.count, 1);
        const foo3 = new Foo(null);
        assert.strictEqual(foo3.count, 0);
        assert.strictEqual(foo3.answer, null);
        assert.strictEqual(foo3.count, 1);
        assert.strictEqual(foo3.answer, null);
        assert.strictEqual(foo3.count, 1);
        const foo4 = new Foo(undefined);
        assert.strictEqual(foo4.count, 0);
        assert.strictEqual(foo4.answer, undefined);
        assert.strictEqual(foo4.count, 1);
        assert.strictEqual(foo4.answer, undefined);
        assert.strictEqual(foo4.count, 1);
    });
    test('memoized property should not be enumerable', () => {
        class Foo {
            get answer() {
                return 42;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo();
        assert.strictEqual(foo.answer, 42);
        assert(!Object.keys(foo).some(k => /\$memoize\$/.test(k)));
    });
    test('memoized property should not be writable', () => {
        class Foo {
            get answer() {
                return 42;
            }
        }
        __decorate([
            memoize
        ], Foo.prototype, "answer", null);
        const foo = new Foo();
        assert.strictEqual(foo.answer, 42);
        try {
            foo['$memoize$answer'] = 1337;
            assert(false);
        }
        catch (e) {
            assert.strictEqual(foo.answer, 42);
        }
    });
    test('throttle', () => {
        const spy = sinon.spy();
        const clock = sinon.useFakeTimers();
        try {
            class ThrottleTest {
                constructor(fn) {
                    this._handle = fn;
                }
                report(p) {
                    this._handle(p);
                }
            }
            __decorate([
                throttle(100, (a, b) => a + b, () => 0)
            ], ThrottleTest.prototype, "report", null);
            const t = new ThrottleTest(spy);
            t.report(1);
            t.report(2);
            t.report(3);
            assert.deepStrictEqual(spy.args, [[1]]);
            clock.tick(200);
            assert.deepStrictEqual(spy.args, [[1], [5]]);
            spy.resetHistory();
            t.report(4);
            t.report(5);
            clock.tick(50);
            t.report(6);
            assert.deepStrictEqual(spy.args, [[4]]);
            clock.tick(60);
            assert.deepStrictEqual(spy.args, [[4], [11]]);
        }
        finally {
            clock.restore();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9ycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZGVjb3JhdG9ycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsTUFBTSxHQUFHO1lBR1IsWUFBb0IsT0FBa0M7Z0JBQWxDLFlBQU8sR0FBUCxPQUFPLENBQTJCO2dCQUZ0RCxVQUFLLEdBQUcsQ0FBQyxDQUFDO1lBRWdELENBQUM7WUFHM0QsTUFBTTtnQkFDTCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3JCLENBQUM7U0FDRDtRQUpBO1lBREMsT0FBTzt5Q0FJUDtRQUdGLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxL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RUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVqQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWxDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUs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
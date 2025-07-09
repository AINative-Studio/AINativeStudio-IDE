/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { createValidator, getInvalidTypeError } from '../../common/preferencesValidation.js';
suite('Preferences Validation', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class Tester {
        constructor(settings) {
            this.settings = settings;
            this.validator = createValidator(settings);
        }
        accepts(input) {
            assert.strictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to accept \`${JSON.stringify(input)}\`. Got ${this.validator(input)}.`);
        }
        rejects(input) {
            assert.notStrictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to reject \`${JSON.stringify(input)}\`.`);
            return {
                withMessage: (message) => {
                    const actual = this.validator(input);
                    assert.ok(actual);
                    assert(actual.indexOf(message) > -1, `Expected error of ${JSON.stringify(this.settings)} on \`${input}\` to contain ${message}. Got ${this.validator(input)}.`);
                }
            };
        }
        validatesNumeric() {
            this.accepts('3');
            this.accepts('3.');
            this.accepts('.0');
            this.accepts('3.0');
            this.accepts(' 3.0');
            this.accepts(' 3.0  ');
            this.rejects('3f');
            this.accepts(3);
            this.rejects('test');
        }
        validatesNullableNumeric() {
            this.validatesNumeric();
            this.accepts(0);
            this.accepts('');
            this.accepts(null);
            this.accepts(undefined);
        }
        validatesNonNullableNumeric() {
            this.validatesNumeric();
            this.accepts(0);
            this.rejects('');
            this.rejects(null);
            this.rejects(undefined);
        }
        validatesString() {
            this.accepts('3');
            this.accepts('3.');
            this.accepts('.0');
            this.accepts('3.0');
            this.accepts(' 3.0');
            this.accepts(' 3.0  ');
            this.accepts('');
            this.accepts('3f');
            this.accepts('hello');
            this.rejects(6);
        }
    }
    test('exclusive max and max work together properly', () => {
        {
            const justMax = new Tester({ maximum: 5, type: 'number' });
            justMax.validatesNonNullableNumeric();
            justMax.rejects('5.1');
            justMax.accepts('5.0');
        }
        {
            const justEMax = new Tester({ exclusiveMaximum: 5, type: 'number' });
            justEMax.validatesNonNullableNumeric();
            justEMax.rejects('5.1');
            justEMax.rejects('5.0');
            justEMax.accepts('4.999');
        }
        {
            const bothNumeric = new Tester({ exclusiveMaximum: 5, maximum: 4, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('5.1');
            bothNumeric.rejects('5.0');
            bothNumeric.rejects('4.999');
            bothNumeric.accepts('4');
        }
        {
            const bothNumeric = new Tester({ exclusiveMaximum: 5, maximum: 6, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('5.1');
            bothNumeric.rejects('5.0');
            bothNumeric.accepts('4.999');
        }
    });
    test('exclusive min and min work together properly', () => {
        {
            const justMin = new Tester({ minimum: -5, type: 'number' });
            justMin.validatesNonNullableNumeric();
            justMin.rejects('-5.1');
            justMin.accepts('-5.0');
        }
        {
            const justEMin = new Tester({ exclusiveMinimum: -5, type: 'number' });
            justEMin.validatesNonNullableNumeric();
            justEMin.rejects('-5.1');
            justEMin.rejects('-5.0');
            justEMin.accepts('-4.999');
        }
        {
            const bothNumeric = new Tester({ exclusiveMinimum: -5, minimum: -4, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('-5.1');
            bothNumeric.rejects('-5.0');
            bothNumeric.rejects('-4.999');
            bothNumeric.accepts('-4');
        }
        {
            const bothNumeric = new Tester({ exclusiveMinimum: -5, minimum: -6, type: 'number' });
            bothNumeric.validatesNonNullableNumeric();
            bothNumeric.rejects('-5.1');
            bothNumeric.rejects('-5.0');
            bothNumeric.accepts('-4.999');
        }
    });
    test('multiple of works for both integers and fractions', () => {
        {
            const onlyEvens = new Tester({ multipleOf: 2, type: 'number' });
            onlyEvens.accepts('2.0');
            onlyEvens.accepts('2');
            onlyEvens.accepts('-4');
            onlyEvens.accepts('0');
            onlyEvens.accepts('100');
            onlyEvens.rejects('100.1');
            onlyEvens.rejects('');
            onlyEvens.rejects('we');
        }
        {
            const hackyIntegers = new Tester({ multipleOf: 1, type: 'number' });
            hackyIntegers.accepts('2.0');
            hackyIntegers.rejects('.5');
        }
        {
            const halfIntegers = new Tester({ multipleOf: 0.5, type: 'number' });
            halfIntegers.accepts('0.5');
            halfIntegers.accepts('1.5');
            halfIntegers.rejects('1.51');
        }
    });
    test('integer type correctly adds a validation', () => {
        {
            const integers = new Tester({ multipleOf: 1, type: 'integer' });
            integers.accepts('02');
            integers.accepts('2');
            integers.accepts('20');
            integers.rejects('.5');
            integers.rejects('2j');
            integers.rejects('');
        }
    });
    test('null is allowed only when expected', () => {
        {
            const nullableIntegers = new Tester({ type: ['integer', 'null'] });
            nullableIntegers.accepts('2');
            nullableIntegers.rejects('.5');
            nullableIntegers.accepts('2.0');
            nullableIntegers.rejects('2j');
            nullableIntegers.accepts('');
        }
        {
            const nonnullableIntegers = new Tester({ type: ['integer'] });
            nonnullableIntegers.accepts('2');
            nonnullableIntegers.rejects('.5');
            nonnullableIntegers.accepts('2.0');
            nonnullableIntegers.rejects('2j');
            nonnullableIntegers.rejects('');
        }
        {
            const nullableNumbers = new Tester({ type: ['number', 'null'] });
            nullableNumbers.accepts('2');
            nullableNumbers.accepts('.5');
            nullableNumbers.accepts('2.0');
            nullableNumbers.rejects('2j');
            nullableNumbers.accepts('');
        }
        {
            const nonnullableNumbers = new Tester({ type: ['number'] });
            nonnullableNumbers.accepts('2');
            nonnullableNumbers.accepts('.5');
            nonnullableNumbers.accepts('2.0');
            nonnullableNumbers.rejects('2j');
            nonnullableNumbers.rejects('');
        }
    });
    test('string max min length work', () => {
        {
            const min = new Tester({ minLength: 4, type: 'string' });
            min.rejects('123');
            min.accepts('1234');
            min.accepts('12345');
        }
        {
            const max = new Tester({ maxLength: 6, type: 'string' });
            max.accepts('12345');
            max.accepts('123456');
            max.rejects('1234567');
        }
        {
            const minMax = new Tester({ minLength: 4, maxLength: 6, type: 'string' });
            minMax.rejects('123');
            minMax.accepts('1234');
            minMax.accepts('12345');
            minMax.accepts('123456');
            minMax.rejects('1234567');
        }
    });
    test('objects work', () => {
        {
            const obj = new Tester({ type: 'object', properties: { 'a': { type: 'string', maxLength: 2 } }, additionalProperties: false });
            obj.rejects({ 'a': 'string' });
            obj.accepts({ 'a': 'st' });
            obj.rejects({ 'a': null });
            obj.rejects({ 'a': 7 });
            obj.accepts({});
            obj.rejects('test');
            obj.rejects(7);
            obj.rejects([1, 2, 3]);
        }
        {
            const pattern = new Tester({ type: 'object', patternProperties: { '^a[a-z]$': { type: 'string', minLength: 2 } }, additionalProperties: false });
            pattern.accepts({ 'ab': 'string' });
            pattern.accepts({ 'ab': 'string', 'ac': 'hmm' });
            pattern.rejects({ 'ab': 'string', 'ac': 'h' });
            pattern.rejects({ 'ab': 'string', 'ac': 99999 });
            pattern.rejects({ 'abc': 'string' });
            pattern.rejects({ 'a0': 'string' });
            pattern.rejects({ 'ab': 'string', 'bc': 'hmm' });
            pattern.rejects({ 'be': 'string' });
            pattern.rejects({ 'be': 'a' });
            pattern.accepts({});
        }
        {
            const pattern = new Tester({ type: 'object', patternProperties: { '^#': { type: 'string', minLength: 3 } }, additionalProperties: { type: 'string', maxLength: 3 } });
            pattern.accepts({ '#ab': 'string' });
            pattern.accepts({ 'ab': 'str' });
            pattern.rejects({ '#ab': 's' });
            pattern.rejects({ 'ab': 99999 });
            pattern.rejects({ '#ab': 99999 });
            pattern.accepts({});
        }
        {
            const pattern = new Tester({ type: 'object', properties: { 'hello': { type: 'string' } }, additionalProperties: { type: 'boolean' } });
            pattern.accepts({ 'hello': 'world' });
            pattern.accepts({ 'hello': 'world', 'bye': false });
            pattern.rejects({ 'hello': 'world', 'bye': 'false' });
            pattern.rejects({ 'hello': 'world', 'bye': 1 });
            pattern.rejects({ 'hello': 'world', 'bye': 'world' });
            pattern.accepts({ 'hello': 'test' });
            pattern.accepts({});
        }
    });
    test('numerical objects work', () => {
        {
            const obj = new Tester({ type: 'object', properties: { 'b': { type: 'number' } } });
            obj.accepts({ 'b': 2.5 });
            obj.accepts({ 'b': -2.5 });
            obj.accepts({ 'b': 0 });
            obj.accepts({ 'b': '0.12' });
            obj.rejects({ 'b': 'abc' });
            obj.rejects({ 'b': [] });
            obj.rejects({ 'b': false });
            obj.rejects({ 'b': null });
            obj.rejects({ 'b': undefined });
        }
        {
            const obj = new Tester({ type: 'object', properties: { 'b': { type: 'integer', minimum: 2, maximum: 5.5 } } });
            obj.accepts({ 'b': 2 });
            obj.accepts({ 'b': 3 });
            obj.accepts({ 'b': '3.0' });
            obj.accepts({ 'b': 5 });
            obj.rejects({ 'b': 1 });
            obj.rejects({ 'b': 6 });
            obj.rejects({ 'b': 5.5 });
        }
    });
    test('patterns work', () => {
        {
            const urls = new Tester({ pattern: '^(hello)*$', type: 'string' });
            urls.accepts('');
            urls.rejects('hel');
            urls.accepts('hello');
            urls.rejects('hellohel');
            urls.accepts('hellohello');
        }
        {
            const urls = new Tester({ pattern: '^(hello)*$', type: 'string', patternErrorMessage: 'err: must be friendly' });
            urls.accepts('');
            urls.rejects('hel').withMessage('err: must be friendly');
            urls.accepts('hello');
            urls.rejects('hellohel').withMessage('err: must be friendly');
            urls.accepts('hellohello');
        }
        {
            const unicodePattern = new Tester({ type: 'string', pattern: '^[\\p{L}\\d_. -]*$', minLength: 3 });
            unicodePattern.accepts('_autoload');
            unicodePattern.rejects('#hash');
            unicodePattern.rejects('');
        }
    });
    test('custom error messages are shown', () => {
        const withMessage = new Tester({ minLength: 1, maxLength: 0, type: 'string', errorMessage: 'always error!' });
        withMessage.rejects('').withMessage('always error!');
        withMessage.rejects(' ').withMessage('always error!');
        withMessage.rejects('1').withMessage('always error!');
    });
    class ArrayTester {
        constructor(settings) {
            this.settings = settings;
            this.validator = createValidator(settings);
        }
        accepts(input) {
            assert.strictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to accept \`${JSON.stringify(input)}\`. Got ${this.validator(input)}.`);
        }
        rejects(input) {
            assert.notStrictEqual(this.validator(input), '', `Expected ${JSON.stringify(this.settings)} to reject \`${JSON.stringify(input)}\`.`);
            return {
                withMessage: (message) => {
                    const actual = this.validator(input);
                    assert.ok(actual);
                    assert(actual.indexOf(message) > -1, `Expected error of ${JSON.stringify(this.settings)} on \`${input}\` to contain ${message}. Got ${this.validator(input)}.`);
                }
            };
        }
    }
    test('simple array', () => {
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'string' } });
            arr.accepts([]);
            arr.accepts(['foo']);
            arr.accepts(['foo', 'bar']);
            arr.rejects(76);
            arr.rejects([6, '3', 7]);
        }
    });
    test('min-max items array', () => {
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 2 });
            arr.rejects([]).withMessage('Array must have at least 1 items');
            arr.accepts(['a']);
            arr.accepts(['a', 'a']);
            arr.rejects(['a', 'a', 'a']).withMessage('Array must have at most 2 items');
        }
    });
    test('array of enums', () => {
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'string', enum: ['a', 'b'] } });
            arr.accepts(['a']);
            arr.accepts(['a', 'b']);
            arr.rejects(['c']).withMessage(`Value 'c' is not one of`);
            arr.rejects(['a', 'c']).withMessage(`Value 'c' is not one of`);
            arr.rejects(['c', 'd']).withMessage(`Value 'c' is not one of`);
            arr.rejects(['c', 'd']).withMessage(`Value 'd' is not one of`);
        }
    });
    test('array of numbers', () => {
        // We accept parseable strings since the view handles strings
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'number' } });
            arr.accepts([]);
            arr.accepts([2]);
            arr.accepts([2, 3]);
            arr.accepts(['2', '3']);
            arr.accepts([6.6, '3', 7]);
            arr.rejects(76);
            arr.rejects(7.6);
            arr.rejects([6, 'a', 7]);
        }
        {
            const arr = new ArrayTester({ type: 'array', items: { type: 'integer', minimum: -2, maximum: 3 }, maxItems: 4 });
            arr.accepts([]);
            arr.accepts([-2, 3]);
            arr.accepts([2, 3]);
            arr.accepts(['2', '3']);
            arr.accepts(['-2', '0', '3']);
            arr.accepts(['-2', 0.0, '3']);
            arr.rejects(2);
            arr.rejects(76);
            arr.rejects([6, '3', 7]);
            arr.rejects([2, 'a', 3]);
            arr.rejects([-2, 4]);
            arr.rejects([-1.2, 2.1]);
            arr.rejects([-3, 3]);
            arr.rejects([-3, 4]);
            arr.rejects([2, 2, 2, 2, 2]);
        }
    });
    test('min-max and enum', () => {
        const arr = new ArrayTester({ type: 'array', items: { type: 'string', enum: ['a', 'b'] }, minItems: 1, maxItems: 2 });
        arr.rejects(['a', 'b', 'c']).withMessage('Array must have at most 2 items');
        arr.rejects(['a', 'b', 'c']).withMessage(`Value 'c' is not one of`);
    });
    test('pattern', () => {
        const arr = new ArrayTester({ type: 'array', items: { type: 'string', pattern: '^(hello)*$' } });
        arr.accepts(['hello']);
        arr.rejects(['a']).withMessage(`Value 'a' must match regex`);
    });
    test('Unicode pattern', () => {
        const arr = new ArrayTester({ type: 'array', items: { type: 'string', pattern: '^[\\p{L}\\d_. -]*$' } });
        arr.accepts(['hello', 'world']);
        arr.rejects(['hello', '#world']).withMessage(`Value '#world' must match regex`);
    });
    test('pattern with error message', () => {
        const arr = new ArrayTester({ type: 'array', items: { type: 'string', pattern: '^(hello)*$', patternErrorMessage: 'err: must be friendly' } });
        arr.rejects(['a']).withMessage(`err: must be friendly`);
    });
    test('uniqueItems', () => {
        const arr = new ArrayTester({ type: 'array', items: { type: 'string' }, uniqueItems: true });
        arr.rejects(['a', 'a']).withMessage(`Array has duplicate items`);
    });
    test('getInvalidTypeError', () => {
        function testInvalidTypeError(value, type, shouldValidate) {
            const message = `value: ${value}, type: ${JSON.stringify(type)}, expected: ${shouldValidate ? 'valid' : 'invalid'}`;
            if (shouldValidate) {
                assert.ok(!getInvalidTypeError(value, type), message);
            }
            else {
                assert.ok(getInvalidTypeError(value, type), message);
            }
        }
        testInvalidTypeError(1, 'number', true);
        testInvalidTypeError(1.5, 'number', true);
        testInvalidTypeError([1], 'number', false);
        testInvalidTypeError('1', 'number', false);
        testInvalidTypeError({ a: 1 }, 'number', false);
        testInvalidTypeError(null, 'number', false);
        testInvalidTypeError('a', 'string', true);
        testInvalidTypeError('1', 'string', true);
        testInvalidTypeError([], 'string', false);
        testInvalidTypeError({}, 'string', false);
        testInvalidTypeError([1], 'array', true);
        testInvalidTypeError([], 'array', true);
        testInvalidTypeError([{}, [[]]], 'array', true);
        testInvalidTypeError({ a: ['a'] }, 'array', false);
        testInvalidTypeError('hello', 'array', false);
        testInvalidTypeError(true, 'boolean', true);
        testInvalidTypeError('hello', 'boolean', false);
        testInvalidTypeError(null, 'boolean', false);
        testInvalidTypeError([true], 'boolean', false);
        testInvalidTypeError(null, 'null', true);
        testInvalidTypeError(false, 'null', false);
        testInvalidTypeError([null], 'null', false);
        testInvalidTypeError('null', 'null', false);
    });
    test('uri checks work', () => {
        const tester = new Tester({ type: 'string', format: 'uri' });
        tester.rejects('example.com');
        tester.rejects('example.com/example');
        tester.rejects('example/example.html');
        tester.rejects('www.example.com');
        tester.rejects('');
        tester.rejects(' ');
        tester.rejects('example');
        tester.accepts('https:');
        tester.accepts('https://');
        tester.accepts('https://example.com');
        tester.accepts('https://www.example.com');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNWYWxpZGF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL3Rlc3QvY29tbW9uL3ByZWZlcmVuY2VzVmFsaWRhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHN0YsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sTUFBTTtRQUdYLFlBQW9CLFFBQXNDO1lBQXRDLGFBQVEsR0FBUixRQUFRLENBQThCO1lBQ3pELElBQUksQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBRSxDQUFDO1FBQzdDLENBQUM7UUFFTSxPQUFPLENBQUMsS0FBVTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xLLENBQUM7UUFFTSxPQUFPLENBQUMsS0FBVTtZQUN4QixNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLFlB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
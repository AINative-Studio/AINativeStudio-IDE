/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { formatPII, getExactExpressionStartAndEnd, getVisibleAndSorted } from '../../common/debugUtils.js';
suite('Debug - Utils', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('formatPII', () => {
        assert.strictEqual(formatPII('Foo Bar', false, {}), 'Foo Bar');
        assert.strictEqual(formatPII('Foo {key} Bar', false, {}), 'Foo {key} Bar');
        assert.strictEqual(formatPII('Foo {key} Bar', false, { 'key': 'yes' }), 'Foo yes Bar');
        assert.strictEqual(formatPII('Foo {_0} Bar {_0}', true, { '_0': 'yes' }), 'Foo yes Bar yes');
        assert.strictEqual(formatPII('Foo {0} Bar {1}{2}', false, { '0': 'yes' }), 'Foo yes Bar {1}{2}');
        assert.strictEqual(formatPII('Foo {0} Bar {1}{2}', false, { '0': 'yes', '1': 'undefined' }), 'Foo yes Bar undefined{2}');
        assert.strictEqual(formatPII('Foo {_key0} Bar {key1}{key2}', true, { '_key0': 'yes', 'key1': '5', 'key2': 'false' }), 'Foo yes Bar {key1}{key2}');
        assert.strictEqual(formatPII('Foo {_key0} Bar {key1}{key2}', false, { '_key0': 'yes', 'key1': '5', 'key2': 'false' }), 'Foo yes Bar 5false');
        assert.strictEqual(formatPII('Unable to display threads:"{e}"', false, { 'e': 'detached from process' }), 'Unable to display threads:"detached from process"');
    });
    test('getExactExpressionStartAndEnd', () => {
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 2), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 3), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('foo', 1, 4), { start: 1, end: 3 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this.name = "John"', 1, 10), { start: 1, end: 9 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this.name = "John"', 6, 10), { start: 1, end: 9 });
        // Hovers over "address" should pick up this->address
        assert.deepStrictEqual(getExactExpressionStartAndEnd('this->address = "Main street"', 6, 10), { start: 1, end: 13 });
        // Hovers over "name" should pick up a.b.c.d.name
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c.d.name', 16, 20), { start: 9, end: 20 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('MyClass::StaticProp', 10, 20), { start: 1, end: 19 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('largeNumber = myVar?.prop', 21, 25), { start: 15, end: 25 });
        // For example in expression 'a.b.c.d', hover was under 'b', 'a.b' should be the exact range
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c.d.name', 11, 12), { start: 9, end: 11 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b;c.d.name', 16, 20), { start: 13, end: 20 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var t = a.b.c-d.name', 16, 20), { start: 15, end: 20 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('var aøñéå文 = a.b.c-d.name', 5, 5), { start: 5, end: 10 });
        assert.deepStrictEqual(getExactExpressionStartAndEnd('aøñéå文.aøñéå文.aøñéå文', 9, 9), { start: 1, end: 13 });
    });
    test('config presentation', () => {
        const configs = [];
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'p'
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'a'
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'b',
            presentation: {
                hidden: false
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'c',
            presentation: {
                hidden: true
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'd',
            presentation: {
                group: '2_group',
                order: 5
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'e',
            presentation: {
                group: '2_group',
                order: 52
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'f',
            presentation: {
                group: '1_group',
                order: 500
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'g',
            presentation: {
                group: '5_group',
                order: 500
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'h',
            presentation: {
                order: 700
            }
        });
        configs.push({
            type: 'node',
            request: 'launch',
            name: 'i',
            presentation: {
                order: 1000
            }
        });
        const sorted = getVisibleAndSorted(configs);
        assert.strictEqual(sorted.length, 9);
        assert.strictEqual(sorted[0].name, 'f');
        assert.strictEqual(sorted[1].name, 'd');
        assert.strictEqual(sorted[2].name, 'e');
        assert.strictEqual(sorted[3].name, 'g');
        assert.strictEqual(sorted[4].name, 'h');
        assert.strictEqual(sorted[5].name, 'i');
        assert.strictEqual(sorted[6].name, 'b');
        assert.strictEqual(sorted[7].name, 'p');
        assert.strictEqual(sorted[8].name, 'a');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdVdGlscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9kZWJ1Z1V0aWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxTQUFTLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUUzRyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0Is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QUMsSUFBSSxDQUFDO1lBQ1osSUFBSSxFQUFFLE1BQU07WUFDWixPQUFPLEVBQUUsUUFBUTtZQUNqQixJQUFJLEVBQUUsR0FBRztZQUNULFlBQVksRUFBRTtnQkFDYixLQUFLLEVBQUUsU0FBUztnQkFDaEIsS0FBSyxFQUFFLEdBQUc7YUFDVjtTQUNELENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDWixJQUFJLEVBQUUsTUFBTTtZQUNaLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLElBQUksRUFBRSxHQUFHO1lBQ1QsWUFBWSxFQUFFO2dCQUNiLEtBQUssRUFBRSxHQUFHO2FBQ1Y7U0FDRCxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ1osSUFBSSxFQUFFLE1BQU07WUFDWixPQUFPLEVBQUUsUUFBUTtZQUNqQixJQUFJLEVBQUUsR0FBRztZQUNULFlBQVksRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTthQUNYO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRXpDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==
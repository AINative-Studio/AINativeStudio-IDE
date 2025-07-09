/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { removeProperty, setProperty } from '../../common/jsonEdit.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON - edits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertEdit(content, edits, expected) {
        assert(edits);
        let lastEditOffset = content.length;
        for (let i = edits.length - 1; i >= 0; i--) {
            const edit = edits[i];
            assert(edit.offset >= 0 && edit.length >= 0 && edit.offset + edit.length <= content.length);
            assert(typeof edit.content === 'string');
            assert(lastEditOffset >= edit.offset + edit.length); // make sure all edits are ordered
            lastEditOffset = edit.offset;
            content = content.substring(0, edit.offset) + edit.content + content.substring(edit.offset + edit.length);
        }
        assert.strictEqual(content, expected);
    }
    const formatterOptions = {
        insertSpaces: true,
        tabSize: 2,
        eol: '\n'
    };
    test('set property', () => {
        let content = '{\n  "x": "y"\n}';
        let edits = setProperty(content, ['x'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "bar"\n}');
        content = 'true';
        edits = setProperty(content, [], 'bar', formatterOptions);
        assertEdit(content, edits, '"bar"');
        content = '{\n  "x": "y"\n}';
        edits = setProperty(content, ['x'], { key: true }, formatterOptions);
        assertEdit(content, edits, '{\n  "x": {\n    "key": true\n  }\n}');
        content = '{\n  "a": "b",  "x": "y"\n}';
        edits = setProperty(content, ['a'], null, formatterOptions);
        assertEdit(content, edits, '{\n  "a": null,  "x": "y"\n}');
    });
    test('insert property', () => {
        let content = '{}';
        let edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": "bar"\n}');
        edits = setProperty(content, ['foo', 'foo2'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": {\n    "foo2": "bar"\n  }\n}');
        content = '{\n}';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": "bar"\n}');
        content = '  {\n  }';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '  {\n    "foo": "bar"\n  }');
        content = '{\n  "x": "y"\n}';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "y",\n  "foo": "bar"\n}');
        content = '{\n  "x": "y"\n}';
        edits = setProperty(content, ['e'], 'null', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "y",\n  "e": "null"\n}');
        edits = setProperty(content, ['x'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "bar"\n}');
        content = '{\n  "x": {\n    "a": 1,\n    "b": true\n  }\n}\n';
        edits = setProperty(content, ['x'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": "bar"\n}\n');
        edits = setProperty(content, ['x', 'b'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "b": "bar"\n  }\n}\n');
        edits = setProperty(content, ['x', 'c'], 'bar', formatterOptions, () => 0);
        assertEdit(content, edits, '{\n  "x": {\n    "c": "bar",\n    "a": 1,\n    "b": true\n  }\n}\n');
        edits = setProperty(content, ['x', 'c'], 'bar', formatterOptions, () => 1);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "c": "bar",\n    "b": true\n  }\n}\n');
        edits = setProperty(content, ['x', 'c'], 'bar', formatterOptions, () => 2);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "b": true,\n    "c": "bar"\n  }\n}\n');
        edits = setProperty(content, ['c'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "x": {\n    "a": 1,\n    "b": true\n  },\n  "c": "bar"\n}\n');
        content = '{\n  "a": [\n    {\n    } \n  ]  \n}';
        edits = setProperty(content, ['foo'], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "a": [\n    {\n    } \n  ],\n  "foo": "bar"\n}');
        content = '';
        edits = setProperty(content, ['foo', 0], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": [\n    "bar"\n  ]\n}');
        content = '//comment';
        edits = setProperty(content, ['foo', 0], 'bar', formatterOptions);
        assertEdit(content, edits, '{\n  "foo": [\n    "bar"\n  ]\n} //comment');
    });
    test('remove property', () => {
        let content = '{\n  "x": "y"\n}';
        let edits = removeProperty(content, ['x'], formatterOptions);
        assertEdit(content, edits, '{\n}');
        content = '{\n  "x": "y", "a": []\n}';
        edits = removeProperty(content, ['x'], formatterOptions);
        assertEdit(content, edits, '{\n  "a": []\n}');
        content = '{\n  "x": "y", "a": []\n}';
        edits = removeProperty(content, ['a'], formatterOptions);
        assertEdit(content, edits, '{\n  "x": "y"\n}');
    });
    test('insert item at 0', () => {
        const content = '[\n  2,\n  3\n]';
        const edits = setProperty(content, [0], 1, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
    });
    test('insert item at 0 in empty array', () => {
        const content = '[\n]';
        const edits = setProperty(content, [0], 1, formatterOptions);
        assertEdit(content, edits, '[\n  1\n]');
    });
    test('insert item at an index', () => {
        const content = '[\n  1,\n  3\n]';
        const edits = setProperty(content, [1], 2, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
    });
    test('insert item at an index im empty array', () => {
        const content = '[\n]';
        const edits = setProperty(content, [1], 1, formatterOptions);
        assertEdit(content, edits, '[\n  1\n]');
    });
    test('insert item at end index', () => {
        const content = '[\n  1,\n  2\n]';
        const edits = setProperty(content, [2], 3, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  3\n]');
    });
    test('insert item at end to empty array', () => {
        const content = '[\n]';
        const edits = setProperty(content, [-1], 'bar', formatterOptions);
        assertEdit(content, edits, '[\n  "bar"\n]');
    });
    test('insert item at end', () => {
        const content = '[\n  1,\n  2\n]';
        const edits = setProperty(content, [-1], 'bar', formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2,\n  "bar"\n]');
    });
    test('remove item in array with one item', () => {
        const content = '[\n  1\n]';
        const edits = setProperty(content, [0], undefined, formatterOptions);
        assertEdit(content, edits, '[]');
    });
    test('remove item in the middle of the array', () => {
        const content = '[\n  1,\n  2,\n  3\n]';
        const edits = setProperty(content, [1], undefined, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  3\n]');
    });
    test('remove last item in the array', () => {
        const content = '[\n  1,\n  2,\n  "bar"\n]';
        const edits = setProperty(content, [2], undefined, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  2\n]');
    });
    test('remove last item in the array if ends with comma', () => {
        const content = '[\n  1,\n  "foo",\n  "bar",\n]';
        const edits = setProperty(content, [2], undefined, formatterOptions);
        assertEdit(content, edits, '[\n  1,\n  "foo"\n]');
    });
    test('remove last item in the array if there is a comment in the beginning', () => {
        const content = '// This is a comment\n[\n  1,\n  "foo",\n  "bar"\n]';
        const edits = setProperty(content, [2], undefined, formatterOptions);
        assertEdit(content, edits, '// This is a comment\n[\n  1,\n  "foo"\n]');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2pzb25FZGl0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBRTFCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxVQUFVLENBQUMsT0FBZSxFQUFFLEtBQWEsRUFBRSxRQUFnQjtRQUNuRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDZCxJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1RixNQUFNLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJ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